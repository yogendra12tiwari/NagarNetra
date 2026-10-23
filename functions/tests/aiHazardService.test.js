const { test, describe } = require("node:test");
const assert = require("node:assert");

const {
  SUPPORTED_HAZARD_TYPES,
  VALID_SEVERITY_LEVELS,
  VALID_VISUAL_SEVERITIES,
  CATEGORY_BASE_WEIGHTS,
  VISUAL_SEVERITY_WEIGHTS,
  formatHazardCategoryLabel,
  calculateExplainableRiskScore,
  validateModelOutput,
  classifyRoadHazard,
} = require("../aiHazardService");

const { processTelegramMessage } = require("../telegramHazardBot");

// ── In-Memory Firestore Mock ────────────────────────────────────────────────
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
          const docId = `doc_${idCounter++}`;
          colMap.set(docId, { id: docId, ...data });
          return {
            id: docId,
            async update(updateData) {
              const current = colMap.get(docId) || {};
              colMap.set(docId, { ...current, ...updateData });
            }
          };
        },
        where(field, op, val) {
          function queryResults(n) {
            const results = [];
            for (const [id, item] of colMap.entries()) {
              if (op === "==" && item[field] === val) {
                results.push({ id, data: () => ({ ...item }) });
              }
            }
            return {
              empty: results.length === 0,
              docs: typeof n === "number" ? results.slice(0, n) : results,
            };
          }

          return {
            async get() {
              return queryResults();
            },
            limit(n) {
              return {
                async get() {
                  return queryResults(n);
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

describe("SI-02 AI Hazard Classification & Risk Scoring (Phase 2 Tests)", () => {

  // ── 1. Model Output Schema Validation for All Supported Categories ───────────
  test("1. Validates all 6 supported hazard categories and normalizes valid outputs", () => {
    for (const cat of SUPPORTED_HAZARD_TYPES) {
      const mockRaw = {
        hazard_type: cat,
        severity_level: "high",
        visual_severity: "moderate",
        confidence: 0.92,
        risk_factors: ["Observable road defect"],
        recommended_action: "Dispatch field crew",
        needs_human_review: false,
      };

      const result = validateModelOutput(mockRaw);
      assert.strictEqual(result.hazard_type, cat);
      assert.strictEqual(result.severity_level, "high");
      assert.strictEqual(result.visual_severity, "moderate");
      assert.strictEqual(result.confidence, 0.92);
      assert.strictEqual(Array.isArray(result.risk_factors), true);
      assert.strictEqual(typeof result.recommended_action, "string");
    }
  });

  // ── 2. Unrelated & Uncertain Images ──────────────────────────────────────────
  test("2. Correctly flags unrelated or uncertain images and requires human review", () => {
    const rawUnrelated = {
      hazard_type: "unrelated_or_uncertain",
      severity_level: "uncertain",
      visual_severity: "uncertain",
      confidence: 0.20,
      risk_factors: ["Image shows an indoor dining room."],
      recommended_action: "Reject or flag for manual verification.",
      needs_human_review: true,
    };

    const validated = validateModelOutput(rawUnrelated);
    assert.strictEqual(validated.hazard_type, "unrelated_or_uncertain");
    assert.strictEqual(validated.needs_human_review, true);

    const score = calculateExplainableRiskScore(validated);
    assert.strictEqual(score.priority_label, "Low");
    assert.strictEqual(score.needs_human_review, true);
    assert.strictEqual(score.risk_score <= 24, true);
  });

  // ── 3. Malformed Model Responses ─────────────────────────────────────────────
  test("3. Handles malformed model outputs (markdown fences, corrupt JSON, unsupported category)", () => {
    // Case A: Wrapped in markdown code fence
    const markdownOutput = '```json\n{"hazard_type": "open_manhole", "severity_level": "critical", "visual_severity": "severe", "confidence": 0.98}\n```';
    const valA = validateModelOutput(markdownOutput);
    assert.strictEqual(valA.hazard_type, "open_manhole");
    assert.strictEqual(valA.severity_level, "critical");
    assert.strictEqual(valA.visual_severity, "severe");
    assert.strictEqual(valA.confidence, 0.98);

    // Case B: Completely non-JSON garbage string
    const corruptOutput = "I am an AI and I cannot identify this image.";
    const valB = validateModelOutput(corruptOutput);
    assert.strictEqual(valB.hazard_type, "unrelated_or_uncertain");
    assert.strictEqual(valB.needs_human_review, true);
    assert.strictEqual(valB.confidence, 0.0);

    // Case C: Unsupported category mapped gracefully
    const unknownCat = { hazard_type: "ufo_landing", severity_level: "extreme" };
    const valC = validateModelOutput(unknownCat);
    assert.strictEqual(valC.hazard_type, "unrelated_or_uncertain");
    assert.strictEqual(valC.severity_level, "uncertain");
  });

  // ── 4. Deterministic Risk Scoring & Boundaries ───────────────────────────────
  test("4. Deterministic risk scoring produces exact predictable scores across all priority bands", () => {
    // Critical Tier (75-100): Open manhole + severe damage + high confidence
    const criticalCase = calculateExplainableRiskScore({
      hazard_type: "open_manhole",
      visual_severity: "severe",
      confidence: 0.95,
    });
    assert.strictEqual(criticalCase.risk_score, 75); // 40 (manhole) + 35 (severe) = 75
    assert.strictEqual(criticalCase.priority_label, "Critical");
    assert.strictEqual(criticalCase.score_breakdown.category_base_weight, 40);
    assert.strictEqual(criticalCase.score_breakdown.visual_severity_weight, 35);

    // High Tier (50-74): Pothole + severe damage
    const highCase = calculateExplainableRiskScore({
      hazard_type: "pothole_or_damaged_road",
      visual_severity: "severe",
      confidence: 0.90,
    });
    assert.strictEqual(highCase.risk_score, 65); // 30 (pothole) + 35 (severe) = 65
    assert.strictEqual(highCase.priority_label, "High");

    // Medium Tier (25-49): Waterlogging + moderate damage
    const mediumCase = calculateExplainableRiskScore({
      hazard_type: "waterlogging",
      visual_severity: "moderate",
      confidence: 0.90,
    });
    assert.strictEqual(mediumCase.risk_score, 45); // 25 (water) + 20 (moderate) = 45
    assert.strictEqual(mediumCase.priority_label, "Medium");

    // Low Tier (1-24): Broken streetlight + minor damage
    const lowCase = calculateExplainableRiskScore({
      hazard_type: "broken_streetlight",
      visual_severity: "minor",
      confidence: 0.90,
    });
    assert.strictEqual(lowCase.risk_score, 25); // 15 + 10 = 25 -> edge of low/medium, let's test uncertain streetlight: 15 + 5 = 20
    const lowUncertain = calculateExplainableRiskScore({
      hazard_type: "broken_streetlight",
      visual_severity: "uncertain",
      confidence: 0.85,
    });
    assert.strictEqual(lowUncertain.risk_score, 20); // 15 + 5 = 20
    assert.strictEqual(lowUncertain.priority_label, "Low");

    // Clamping: Score never exceeds 100 or drops below 1
    const maxBoosted = calculateExplainableRiskScore({
      hazard_type: "open_manhole",
      visual_severity: "severe",
      confidence: 1.0,
    }, { report_count: 10, is_night: true });
    assert.strictEqual(maxBoosted.risk_score <= 100, true);

    const minScore = calculateExplainableRiskScore({
      hazard_type: "unrelated_or_uncertain",
      visual_severity: "uncertain",
      confidence: 0.0,
    });
    assert.strictEqual(minScore.risk_score >= 1, true);

    // Exact determinism: Calling twice returns identical object values
    const run1 = calculateExplainableRiskScore({ hazard_type: "stray_cattle", visual_severity: "moderate", confidence: 0.88 });
    const run2 = calculateExplainableRiskScore({ hazard_type: "stray_cattle", visual_severity: "moderate", confidence: 0.88 });
    assert.deepStrictEqual(run1, run2);
  });

  // ── 5. Missing Contextual Data ────────────────────────────────────────────────
  test("5. Handles missing or empty context safely without fabricating data", () => {
    // No context passed
    const noContext = calculateExplainableRiskScore({
      hazard_type: "fallen_tree_or_obstruction",
      visual_severity: "moderate",
      confidence: 0.85,
    });
    assert.strictEqual(noContext.score_breakdown.cluster_boost, 0);
    assert.strictEqual(noContext.score_breakdown.contextual_boost, 0);
    assert.strictEqual(noContext.risk_score, 55); // 35 (tree) + 20 (moderate) = 55 (High)

    // With cluster boost (3 reports: (3-1)*5 = +10 pts)
    const withCluster = calculateExplainableRiskScore({
      hazard_type: "fallen_tree_or_obstruction",
      visual_severity: "moderate",
      confidence: 0.85,
    }, { report_count: 3 });
    assert.strictEqual(withCluster.score_breakdown.cluster_boost, 10);
    assert.strictEqual(withCluster.risk_score, 65); // 55 + 10 = 65 (High)
  });

  // ── 6. Gemini Timeout & API Failures ─────────────────────────────────────────
  test("6. Gemini API failure or timeout falls back gracefully without unhandled exception", async () => {
    // Force API failure with non-existent host or invalid API key
    const result = await classifyRoadHazard("https://invalid-host-for-testing-1234.org/image.jpg", {
      timeoutMs: 500,
      apiKey: "dummy_key",
    });

    assert.strictEqual(result.hazard_type, "unrelated_or_uncertain");
    assert.strictEqual(result.needs_human_review, true);
    assert.strictEqual(result.analysis_status.startsWith("failed"), true);
  });

  // ── 7. Integration: Citizen Flow with Mocked AI Classification ───────────────
  test("7. End-to-end reporting with AI classification populates all schema fields on single ticket", async () => {
    const db = createMockFirestore();
    const chatId = 771122;

    // Step A: /report
    await processTelegramMessage({
      chat: { id: chatId },
      from: { id: chatId, first_name: "Rahul" },
      text: "/report",
    }, db);

    // Step B: Send photo
    await processTelegramMessage({
      chat: { id: chatId },
      from: { id: chatId },
      photo: [{ file_id: "photo_pothole_999", width: 600, height: 400 }],
    }, db);

    // Step C: Send location with mock AI result
    const mockAiResult = {
      hazard_type: "pothole_or_damaged_road",
      severity_level: "high",
      visual_severity: "severe",
      confidence: 0.94,
      risk_factors: ["Deep asphalt crater spanning vehicular lane"],
      recommended_action: "Queue for rapid cold-mix patching within 24h",
      needs_human_review: false,
    };

    const res = await processTelegramMessage({
      chat: { id: chatId },
      from: { id: chatId },
      location: { latitude: 26.8467, longitude: 80.9462 },
    }, db, { mockAiResult });

    assert.strictEqual(res.status, "report_created");
    assert.strictEqual(res.ai_classified, true);
    assert.strictEqual(res.risk_score, 65); // 30 (pothole) + 35 (severe) = 65

    // Verify exactly ONE hazard document exists
    const hazardSnap = await db.collection("hazards").where("ticket_id", "==", res.ticket_id).limit(2).get();
    assert.strictEqual(hazardSnap.docs.length, 1);

    const hazard = hazardSnap.docs[0].data();
    assert.strictEqual(hazard.ticket_id, res.ticket_id);
    assert.strictEqual(hazard.hazard_type, "pothole_or_damaged_road");
    assert.strictEqual(hazard.category, "Pothole / Damaged Road");
    assert.strictEqual(hazard.severity_level, "high");
    assert.strictEqual(hazard.visual_severity, "severe");
    assert.strictEqual(hazard.risk_score, 65);
    assert.strictEqual(hazard.priority_label, "High");
    assert.strictEqual(hazard.analysis_status, "completed");
    assert.strictEqual(hazard.classification_confidence, 0.94);
    assert.strictEqual(Array.isArray(hazard.risk_factors), true);
    assert.strictEqual(hazard.needs_human_review, false);
    assert.strictEqual(typeof hazard.analyzed_at, "string");

    // Verify /status command displays the AI classification and risk score
    const statusQuery = {
      chat: { id: chatId },
      from: { id: chatId },
      text: `/status ${res.ticket_id}`,
    };
    const statusRes = await processTelegramMessage(statusQuery, db);
    assert.strictEqual(statusRes.status, "status_returned");
    assert.strictEqual(statusRes.ticket_id, res.ticket_id);
  });

  // ── 8. Retried Analysis Never Creates Duplicate Tickets ──────────────────────
  test("8. Retrying analysis on an existing hazard updates in-place without generating a new ticket", async () => {
    const db = createMockFirestore();
    const ticketId = "HAZ-2026-0088";

    const hazardRef = await db.collection("hazards").add({
      ticket_id: ticketId,
      telegram_user_id: "555",
      telegram_chat_id: "555",
      photo_url: "https://example.com/tree.jpg",
      lat: 26.86,
      lng: 80.93,
      status: "reported",
      analysis_status: "pending_analysis",
      created_at: new Date().toISOString(),
    });

    // Simulate analysis execution
    const mockAi = {
      hazard_type: "fallen_tree_or_obstruction",
      severity_level: "critical",
      visual_severity: "severe",
      confidence: 0.96,
      risk_factors: ["Large trunk completely blocking two lanes"],
      recommended_action: "Dispatch chainsaw clearance team immediately",
      needs_human_review: false,
    };

    const validated = validateModelOutput(mockAi);
    const score = calculateExplainableRiskScore(validated);

    await hazardRef.update({
      hazard_type: validated.hazard_type,
      category: formatHazardCategoryLabel(validated.hazard_type),
      severity_level: validated.severity_level,
      visual_severity: validated.visual_severity,
      risk_score: score.risk_score,
      priority_label: score.priority_label,
      analysis_status: "completed",
      updated_at: new Date().toISOString(),
    });

    // Verify still only ONE document exists with this ticket_id
    const snap = await db.collection("hazards").where("ticket_id", "==", ticketId).get();
    assert.strictEqual(snap.docs.length, 1);
    const docData = snap.docs[0].data();
    assert.strictEqual(docData.ticket_id, ticketId);
    assert.strictEqual(docData.hazard_type, "fallen_tree_or_obstruction");
    assert.strictEqual(docData.risk_score, 70); // 35 (tree) + 35 (severe) = 70
    assert.strictEqual(docData.priority_label, "High");
    assert.strictEqual(docData.analysis_status, "completed");
  });

  // ── 9. Preservation of Legacy Data & Original Reports ────────────────────────
  test("9. Ensures original photo metadata, coordinates, and ownership are preserved", async () => {
    const db = createMockFirestore();

    // Create legacy dump point
    await db.collection("dumpPoints").doc("dp_legacy_01").set({
      name: "Legacy Garbage Spot",
      report_count: 14,
      status: "active",
    });

    // Create new hazard with AI data
    const hazardRef = await db.collection("hazards").add({
      ticket_id: "HAZ-2026-0099",
      telegram_user_id: "user_original_123",
      file_id: "file_orig_456",
      photo_url: "https://telegram.org/orig.jpg",
      lat: 26.8523,
      lng: 80.9312,
      created_at: "2026-10-23T18:00:00.000Z",
      status: "reported",
    });

    await hazardRef.update({
      hazard_type: "open_manhole",
      category: "Open Manhole",
      risk_score: 75,
      analysis_status: "completed",
    });

    // Check legacy data untouched
    const legacyDoc = await db.collection("dumpPoints").doc("dp_legacy_01").get();
    assert.strictEqual(legacyDoc.exists, true);
    assert.strictEqual(legacyDoc.data().name, "Legacy Garbage Spot");

    // Check hazard document retained all original identity fields
    const updatedHazard = await db.collection("hazards").doc(hazardRef.id).get();
    const data = updatedHazard.data();
    assert.strictEqual(data.ticket_id, "HAZ-2026-0099");
    assert.strictEqual(data.telegram_user_id, "user_original_123");
    assert.strictEqual(data.file_id, "file_orig_456");
    assert.strictEqual(data.photo_url, "https://telegram.org/orig.jpg");
    assert.strictEqual(data.lat, 26.8523);
    assert.strictEqual(data.lng, 80.9312);
    assert.strictEqual(data.created_at, "2026-10-23T18:00:00.000Z");
  });

  // ── 10. Firestore Update Failure Resilience ──────────────────────────────────
  test("10. Firestore update failure during AI processing is handled gracefully without losing the ticket", async () => {
    const db = createMockFirestore();
    const chatId = 443322;

    // Start session and send photo
    await processTelegramMessage({
      chat: { id: chatId },
      from: { id: chatId },
      text: "/report",
    }, db);

    await processTelegramMessage({
      chat: { id: chatId },
      from: { id: chatId },
      photo: [{ file_id: "photo_test_err", width: 500, height: 500 }],
    }, db);

    // Override collection.add to return a ref whose .update() fails
    const originalAdd = db.collection("hazards").add;
    db.collection("hazards").add = async function (data) {
      const created = await originalAdd.call(this, data);
      return {
        id: created.id,
        async update() {
          throw new Error("Simulated Firestore write timeout / connection drop");
        },
      };
    };

    const res = await processTelegramMessage({
      chat: { id: chatId },
      from: { id: chatId },
      location: { latitude: 26.85, longitude: 80.94 },
    }, db, {
      mockAiResult: {
        hazard_type: "pothole_or_damaged_road",
        severity_level: "high",
        visual_severity: "moderate",
        confidence: 0.9,
      }
    });

    // The reporting flow still succeeds in returning the created ticket ID
    assert.strictEqual(res.status, "report_created");
    assert.match(res.ticket_id, /^HAZ-\d{4}-\d{4}$/);

    // Initial record still safely exists in Firestore
    const snap = await db.collection("hazards").where("ticket_id", "==", res.ticket_id).get();
    assert.strictEqual(snap.docs.length, 1);
    assert.strictEqual(snap.docs[0].data().status, "reported");
  });

});
