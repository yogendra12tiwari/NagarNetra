const test = require("node:test");
const assert = require("node:assert");

const {
  verifyAdminRequest,
  validateHazardUpdatePayload,
  ALLOWED_ADMIN_UPDATE_FIELDS,
  ALLOWED_STATUSES,
  VALID_STATUS_TRANSITIONS
} = require("../adminAuth");

// ── Mock Auth Factory for Testing ───────────────────────────────────────────
function createMockAdminAuth(users = {}) {
  return {
    verifyIdToken: async (token) => {
      if (!token || token === "invalid_token") {
        throw new Error("Decoding Firebase ID token failed");
      }
      if (users[token]) {
        return users[token];
      }
      // Default: regular non-admin user
      return {
        uid: "user_regular_123",
        email: "citizen@example.com",
        admin: false,
        role: "citizen"
      };
    }
  };
}

test("SI-02 Phase 3.1: Admin Authorization & State Machine Hardening", async (t) => {

  const mockUsers = {
    "admin_claim_token": { uid: "admin_uid_1", email: "chief@nagarnetra.gov.in", admin: true },
    "admin_role_token": { uid: "admin_uid_2", email: "inspector@gmail.com", role: "admin" },
    "official_email_token": { uid: "admin_uid_3", email: "ward10@nagarnetra.gov.in" },
    "citizen_token": { uid: "citizen_uid_4", email: "citizen@gmail.com", admin: false, role: "citizen" },
  };
  const mockAuth = createMockAdminAuth(mockUsers);

  // ── 1. Unauthenticated Requests Rejected ──────────────────────────────────
  await t.test("1. Unauthenticated requests without credentials are rejected (401)", async () => {
    const emptyReq = { headers: {} };
    const result = await verifyAdminRequest(emptyReq, mockAuth);
    assert.strictEqual(result.authorized, false);
    assert.strictEqual(result.status, 401);
    assert.match(result.error, /Missing administrative credentials/i);
  });

  await t.test("2. Malformed or invalid Bearer tokens are rejected (401)", async () => {
    const invalidReq = {
      headers: { authorization: "Bearer invalid_token" }
    };
    const result = await verifyAdminRequest(invalidReq, mockAuth);
    assert.strictEqual(result.authorized, false);
    assert.strictEqual(result.status, 401);
  });

  // ── 2. Authenticated Non-Admin Users Rejected ─────────────────────────────
  await t.test("3. Authenticated citizen/non-admin users are rejected (403)", async () => {
    const citizenReq = {
      headers: { authorization: "Bearer citizen_token" }
    };
    const result = await verifyAdminRequest(citizenReq, mockAuth);
    assert.strictEqual(result.authorized, false);
    assert.strictEqual(result.status, 403);
    assert.match(result.error, /does not possess administrator role/i);
  });

  // ── 3. Authorized Admins Permitted ────────────────────────────────────────
  await t.test("4. Authorized admins with admin claim or role are approved (200)", async () => {
    // Via admin claim
    const adminClaimReq = { headers: { authorization: "Bearer admin_claim_token" } };
    const res1 = await verifyAdminRequest(adminClaimReq, mockAuth);
    assert.strictEqual(res1.authorized, true);
    assert.strictEqual(res1.user.uid, "admin_uid_1");

    // Via role === 'admin'
    const adminRoleReq = { headers: { authorization: "Bearer admin_role_token" } };
    const res2 = await verifyAdminRequest(adminRoleReq, mockAuth);
    assert.strictEqual(res2.authorized, true);
    assert.strictEqual(res2.user.uid, "admin_uid_2");

    // Via official government email domain
    const govEmailReq = { headers: { authorization: "Bearer official_email_token" } };
    const res3 = await verifyAdminRequest(govEmailReq, mockAuth);
    assert.strictEqual(res3.authorized, true);
    assert.strictEqual(res3.user.uid, "admin_uid_3");
  });

  await t.test("5. Valid X-Admin-Secret header authenticates server operations", async () => {
    const originalSecret = process.env.ADMIN_SECRET;
    process.env.ADMIN_SECRET = "super_secret_admin_token_2026";

    try {
      const validSecretReq = {
        headers: { "x-admin-secret": "super_secret_admin_token_2026" }
      };
      const result = await verifyAdminRequest(validSecretReq, mockAuth);
      assert.strictEqual(result.authorized, true);
      assert.strictEqual(result.user.method, "secret");

      const invalidSecretReq = {
        headers: { "x-admin-secret": "wrong_secret" }
      };
      const failResult = await verifyAdminRequest(invalidSecretReq, mockAuth);
      assert.strictEqual(failResult.authorized, false);
      assert.strictEqual(failResult.status, 403);
    } finally {
      process.env.ADMIN_SECRET = originalSecret;
    }
  });

  // ── 4. Reject Tampering with Immutable Fields ─────────────────────────────
  await t.test("6. Attempts to overwrite immutable fields are rejected (ticket_id, coordinates, photos, etc.)", () => {
    const dangerousPayloads = [
      { ticket_id: "HAZ-FORGED-0001", status: "resolved" },
      { lat: 28.5355, lng: 77.3910, status: "in_repair" },
      { photo_url: "https://evil.com/fake.jpg", status: "acknowledged" },
      { telegram_user_id: 9999999, status: "dispatched" },
      { risk_score: 10, status: "acknowledged" },
      { created_at: "2020-01-01T00:00:00.000Z" }
    ];

    for (const payload of dangerousPayloads) {
      const res = validateHazardUpdatePayload(payload, { status: "reported" });
      assert.strictEqual(res.valid, false);
      assert.match(res.error, /Cannot modify immutable or unauthorized field/i);
    }
  });

  // ── 5. Reject Invalid Statuses & Illegal State Transitions ────────────────
  await t.test("7. Invalid statuses are rejected", () => {
    const invalidStatuses = ["deleted", "pending", "unknown", "open", 123, null];
    for (const st of invalidStatuses) {
      const res = validateHazardUpdatePayload({ status: st }, { status: "reported" });
      assert.strictEqual(res.valid, false);
      assert.match(res.error, /Invalid status/i);
    }
  });

  await t.test("8. Illegal state transitions are rejected by the state machine", () => {
    // E.g. Cannot jump from resolved directly back to reported
    const illegalTransition = validateHazardUpdatePayload(
      { status: "reported" },
      { status: "resolved" }
    );
    assert.strictEqual(illegalTransition.valid, false);
    assert.match(illegalTransition.error, /Illegal status transition/i);

    // E.g. Valid transition from reported to dispatched
    const validTransition = validateHazardUpdatePayload(
      { status: "dispatched", notes: "Crew moving to site" },
      { status: "reported" }
    );
    assert.strictEqual(validTransition.valid, true);
    assert.strictEqual(validTransition.sanitized.status, "dispatched");
    assert.strictEqual(validTransition.sanitized.notes, "Crew moving to site");
    assert.strictEqual(typeof validTransition.sanitized.updated_at, "string");
  });

  await t.test("9. Resolving a hazard sets resolved_at and updated_at timestamps", () => {
    const res = validateHazardUpdatePayload(
      { status: "resolved", notes: "Asphalt patch completed" },
      { status: "in_repair" }
    );
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.sanitized.status, "resolved");
    assert.strictEqual(typeof res.sanitized.resolved_at, "string");
    assert.strictEqual(typeof res.sanitized.updated_at, "string");
  });

  await t.test("10. Sanitized update retains only allowed admin fields", () => {
    const valid = validateHazardUpdatePayload({
      status: "acknowledged",
      notes: "Triage approved",
      assigned_team: { id: "pwd_asphalt", name: "PWD Asphalt" }
    }, { status: "reported" });

    assert.strictEqual(valid.valid, true);
    const keys = Object.keys(valid.sanitized);
    assert.strictEqual(keys.includes("status"), true);
    assert.strictEqual(keys.includes("notes"), true);
    assert.strictEqual(keys.includes("assigned_team"), true);
    assert.strictEqual(keys.includes("updated_at"), true);
    assert.strictEqual(keys.length, 4);
  });
});
