const { test, describe, beforeEach } = require("node:test");
const assert = require("node:assert");

// Import the module under test
const {
  processTelegramMessage,
  generateHazardTicketId,
  isDuplicateUpdate,
  handleTelegramWebhook,
} = require("../telegramHazardBot");

// ── In-Memory Firestore Mock for Unit Testing ────────────────────────────────
function createMockFirestore() {
  const store = {
    telegram_sessions: new Map(),
    hazards: new Map(),
    hazard_reports: new Map(),
    meta: new Map(),
  };

  let idCounter = 1;

  const mockDb = {
    collection(colName) {
      if (!store[colName]) store[colName] = new Map();
      const colMap = store[colName];

      return {
        doc(docId) {
          return {
            async get() {
              const data = colMap.get(docId);
              return {
                exists: Boolean(data),
                id: docId,
                data: () => (data ? { ...data } : undefined),
              };
            },
            async set(data, opts = {}) {
              if (opts.merge && colMap.has(docId)) {
                colMap.set(docId, { ...colMap.get(docId), ...data });
              } else {
                colMap.set(docId, { ...data });
              }
            },
            async update(data) {
              const current = colMap.get(docId) || {};
              colMap.set(docId, { ...current, ...data });
            },
            async delete() {
              colMap.delete(docId);
            },
          };
        },
        async add(data) {
          const docId = `auto_${idCounter++}`;
          colMap.set(docId, { id: docId, ...data });
          return { id: docId };
        },
        where(field, op, val) {
          return {
            limit(n) {
              return {
                async get() {
                  const results = [];
                  for (const [id, item] of colMap.entries()) {
                    if (op === "==" && item[field] === val) {
                      results.push({ id, data: () => ({ ...item }) });
                    }
                  }
                  return {
                    empty: results.length === 0,
                    docs: results.slice(0, n),
                  };
                },
              };
            },
          };
        },
      };
    },
    async runTransaction(updateFn) {
      const transaction = {
        async get(docRef) {
          return docRef.get();
        },
        set(docRef, data, opts) {
          return docRef.set(data, opts);
        },
      };
      return updateFn(transaction);
    },
    _store: store,
  };

  return mockDb;
}

describe("SI-02 Road Hazard Telegram Bot (Phase 1 Unit Tests)", () => {
  let db;

  beforeEach(() => {
    db = createMockFirestore();
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_WEBHOOK_SECRET;
  });

  test("1. /start or /help returns welcome message with supported hazard types", async () => {
    const msg = {
      chat: { id: 12345 },
      from: { id: 12345, first_name: "Alice" },
      text: "/start",
    };

    const res = await processTelegramMessage(msg, db);
    assert.strictEqual(res.status, "welcome");
  });

  test("2. /report initializes session in awaiting_photo state", async () => {
    const msg = {
      chat: { id: 12345 },
      from: { id: 12345, first_name: "Alice", username: "alice_hazard" },
      text: "/report",
    };

    const res = await processTelegramMessage(msg, db);
    assert.strictEqual(res.status, "awaiting_photo");

    const sessionDoc = await db.collection("telegram_sessions").doc("12345").get();
    assert.strictEqual(sessionDoc.exists, true);
    assert.strictEqual(sessionDoc.data().step, "awaiting_photo");
    assert.strictEqual(sessionDoc.data().username, "alice_hazard");
  });

  test("3. Photo then GPS flow completes a road hazard report", async () => {
    const chatId = 54321;
    const userId = 54321;

    // Step A: /report
    await processTelegramMessage({
      chat: { id: chatId },
      from: { id: userId, first_name: "Bob" },
      text: "/report",
    }, db);

    // Step B: Send valid photo
    const photoMsg = {
      chat: { id: chatId },
      from: { id: userId, first_name: "Bob" },
      photo: [
        { file_id: "thumb_123", width: 100, height: 100 },
        { file_id: "large_pothole_456", width: 800, height: 600 },
      ],
    };
    const photoRes = await processTelegramMessage(photoMsg, db);
    assert.strictEqual(photoRes.status, "photo_saved_awaiting_location");

    const sessionAfterPhoto = await db.collection("telegram_sessions").doc(String(chatId)).get();
    assert.strictEqual(sessionAfterPhoto.data().step, "awaiting_location");
    assert.strictEqual(sessionAfterPhoto.data().file_id, "large_pothole_456");

    // Step C: Send GPS location
    const locationMsg = {
      chat: { id: chatId },
      from: { id: userId, first_name: "Bob" },
      location: { latitude: 26.8500, longitude: 80.9400 },
    };
    const locationRes = await processTelegramMessage(locationMsg, db);
    assert.strictEqual(locationRes.status, "report_created");
    assert.match(locationRes.ticket_id, /^HAZ-\d{4}-\d{4}$/);

    // Verify session was cleared
    const sessionAfterReport = await db.collection("telegram_sessions").doc(String(chatId)).get();
    assert.strictEqual(sessionAfterReport.exists, false);

    // Verify record in "hazards" collection
    const hazardSnap = await db.collection("hazards").where("ticket_id", "==", locationRes.ticket_id).limit(1).get();
    assert.strictEqual(hazardSnap.empty, false);
    const hazard = hazardSnap.docs[0].data();
    assert.strictEqual(hazard.category, "Unclassified hazard pending review");
    assert.strictEqual(hazard.status, "reported");
    assert.strictEqual(hazard.file_id, "large_pothole_456");
    assert.strictEqual(hazard.lat, 26.8500);
    assert.strictEqual(hazard.lng, 80.9400);
    assert.strictEqual(hazard.telegram_user_id, String(userId));

    // Verify record in "hazard_reports" audit trail
    const reportSnap = await db.collection("hazard_reports").where("ticket_id", "==", locationRes.ticket_id).limit(1).get();
    assert.strictEqual(reportSnap.empty, false);
  });

  test("4. Missing or invalid input: text when photo is expected", async () => {
    const chatId = 999;
    await processTelegramMessage({
      chat: { id: chatId },
      from: { id: 999 },
      text: "/report",
    }, db);

    // Send random text instead of a photo
    const textMsg = {
      chat: { id: chatId },
      from: { id: 999 },
      text: "There is a huge pothole here please fix",
    };
    const res = await processTelegramMessage(textMsg, db);
    assert.strictEqual(res.status, "invalid_photo_input");

    // Session remains in awaiting_photo
    const sessionDoc = await db.collection("telegram_sessions").doc(String(chatId)).get();
    assert.strictEqual(sessionDoc.data().step, "awaiting_photo");
  });

  test("5. /cancel safely aborts an ongoing session", async () => {
    const chatId = 888;
    await processTelegramMessage({
      chat: { id: chatId },
      from: { id: 888 },
      text: "/report",
    }, db);

    const cancelMsg = {
      chat: { id: chatId },
      from: { id: 888 },
      text: "/cancel",
    };
    const res = await processTelegramMessage(cancelMsg, db);
    assert.strictEqual(res.status, "cancelled");

    const sessionDoc = await db.collection("telegram_sessions").doc(String(chatId)).get();
    assert.strictEqual(sessionDoc.exists, false);
  });

  test("6. Unique collision-safe ticket creation increments sequentially", async () => {
    const ticket1 = await generateHazardTicketId(db);
    const ticket2 = await generateHazardTicketId(db);
    const ticket3 = await generateHazardTicketId(db);

    const year = new Date().getFullYear();
    assert.strictEqual(ticket1, `HAZ-${year}-0001`);
    assert.strictEqual(ticket2, `HAZ-${year}-0002`);
    assert.strictEqual(ticket3, `HAZ-${year}-0003`);
  });

  test("7. /status lookup and ownership enforcement", async () => {
    const reporterUserId = "11111";
    const strangerUserId = "99999";
    const ticketId = "HAZ-2026-0042";

    // Seed an existing hazard
    await db.collection("hazards").add({
      ticket_id: ticketId,
      telegram_user_id: reporterUserId,
      telegram_chat_id: reporterUserId,
      category: "Pothole / damaged road",
      severity: "high",
      status: "reported",
      lat: 26.85,
      lng: 80.92,
      created_at: new Date().toISOString(),
    });

    // Case A: Owner checks status -> returns status
    const ownerQuery = {
      chat: { id: Number(reporterUserId) },
      from: { id: Number(reporterUserId) },
      text: `/status ${ticketId}`,
    };
    const ownerRes = await processTelegramMessage(ownerQuery, db);
    assert.strictEqual(ownerRes.status, "status_returned");
    assert.strictEqual(ownerRes.ticket_id, ticketId);

    // Case B: Stranger attempts to check owner's ticket -> access restricted
    const strangerQuery = {
      chat: { id: Number(strangerUserId) },
      from: { id: Number(strangerUserId) },
      text: `/status ${ticketId}`,
    };
    const strangerRes = await processTelegramMessage(strangerQuery, db);
    assert.strictEqual(strangerRes.status, "unauthorized");

    // Case C: Non-existent ticket ID
    const notFoundQuery = {
      chat: { id: Number(reporterUserId) },
      from: { id: Number(reporterUserId) },
      text: "/status HAZ-2026-9999",
    };
    const notFoundRes = await processTelegramMessage(notFoundQuery, db);
    assert.strictEqual(notFoundRes.status, "ticket_not_found");
  });

  test("8. Unauthorized webhook request rejected when secret is configured", async () => {
    process.env.TELEGRAM_WEBHOOK_SECRET = "super_secret_token_123";

    let statusCode = null;
    let responseBody = null;

    const mockRes = {
      status(code) {
        statusCode = code;
        return {
          json(body) {
            responseBody = body;
            return body;
          },
        };
      },
    };

    // Request with missing / invalid header
    const mockReqBad = {
      headers: { "x-telegram-bot-api-secret-token": "wrong_token" },
      body: { update_id: 1, message: { text: "/start" } },
    };

    await handleTelegramWebhook(mockReqBad, mockRes, db);
    assert.strictEqual(statusCode, 403);
    assert.strictEqual(responseBody.error, "Unauthorized");

    // Request with valid header
    const mockReqGood = {
      headers: { "x-telegram-bot-api-secret-token": "super_secret_token_123" },
      body: { update_id: 2, message: { chat: { id: 777 }, text: "/start" } },
    };

    await handleTelegramWebhook(mockReqGood, mockRes, db);
    assert.strictEqual(statusCode, 200);
    assert.strictEqual(responseBody.ok, true);
  });

  test("9. Duplicate Telegram update handling via update_id deduplication", () => {
    const updateId = 888777;
    assert.strictEqual(isDuplicateUpdate(updateId), false); // first time: not duplicate
    assert.strictEqual(isDuplicateUpdate(updateId), true);  // second time: duplicate
    assert.strictEqual(isDuplicateUpdate(updateId), true);  // third time: duplicate
  });

  test("10. Expired session (> 24h) is safely cleared", async () => {
    const chatId = 666;
    // Seed an expired session (36 hours ago)
    const thirtySixHoursAgo = new Date(Date.now() - 36 * 60 * 60 * 1000).toISOString();
    await db.collection("telegram_sessions").doc(String(chatId)).set({
      step: "awaiting_photo",
      created_at: thirtySixHoursAgo,
      updated_at: thirtySixHoursAgo,
    });

    const msg = {
      chat: { id: chatId },
      from: { id: chatId },
      text: "hello?",
    };

    const res = await processTelegramMessage(msg, db);
    assert.strictEqual(res.status, "session_expired");

    const sessionDoc = await db.collection("telegram_sessions").doc(String(chatId)).get();
    assert.strictEqual(sessionDoc.exists, false);
  });
});
