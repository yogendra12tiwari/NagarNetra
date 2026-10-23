const test = require("node:test");
const assert = require("node:assert");
const { parseServiceAccountKey } = require("../firebaseInit");

// Mock RSA private key header for testing validation logic
const MOCK_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC5\n-----END PRIVATE KEY-----\n";

function createValidMockServiceAccount(overrides = {}) {
  return {
    type: "service_account",
    project_id: "nagarnetra-road-safety",
    private_key_id: "mock_key_id_12345",
    private_key: MOCK_PRIVATE_KEY,
    client_email: "firebase-adminsdk-test@nagarnetra-road-safety.iam.gserviceaccount.com",
    client_id: "1234567890",
    ...overrides
  };
}

test("SI-02 Firebase Credential Parsing & Validation Tests", async (t) => {

  await t.test("1. Parses valid direct JSON string successfully", () => {
    const mock = createValidMockServiceAccount();
    const rawJson = JSON.stringify(mock);
    const result = parseServiceAccountKey(rawJson, "nagarnetra-road-safety");

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.format, "direct_json");
    assert.strictEqual(result.projectId, "nagarnetra-road-safety");
    assert.strictEqual(result.credential.type, "service_account");
  });

  await t.test("2. Parses valid Base64-encoded JSON successfully", () => {
    const mock = createValidMockServiceAccount();
    const b64 = Buffer.from(JSON.stringify(mock)).toString("base64");
    const result = parseServiceAccountKey(b64, "nagarnetra-road-safety");

    assert.strictEqual(result.ok, true);
    assert.strictEqual(result.format, "base64");
    assert.strictEqual(result.projectId, "nagarnetra-road-safety");
    assert.strictEqual(result.credential.client_email, mock.client_email);
  });

  await t.test("3. Handles leading and trailing whitespace, newlines, and surrounding double quotes", () => {
    const mock = createValidMockServiceAccount();
    const rawJsonWithWhitespace = ` \n\t  ${JSON.stringify(mock)}  \n `;
    const resultJson = parseServiceAccountKey(rawJsonWithWhitespace, "nagarnetra-road-safety");

    assert.strictEqual(resultJson.ok, true);
    assert.strictEqual(resultJson.format, "direct_json");
    assert.strictEqual(resultJson.projectId, "nagarnetra-road-safety");

    // Base64 wrapped in quotes (frequent in cloud dashboards)
    const b64 = Buffer.from(JSON.stringify(mock)).toString("base64");
    const b64WithQuotes = `"${b64}"\n`;
    const resultB64 = parseServiceAccountKey(b64WithQuotes, "nagarnetra-road-safety");

    assert.strictEqual(resultB64.ok, true);
    assert.strictEqual(resultB64.format, "base64");
    assert.strictEqual(resultB64.projectId, "nagarnetra-road-safety");
  });

  await t.test("4. Rejects corrupt or invalid JSON syntax", () => {
    const malformedJson = "{ type: service_account, invalid_json }";
    const result = parseServiceAccountKey(malformedJson, "nagarnetra-road-safety");

    assert.strictEqual(result.ok, false);
    assert.match(result.error, /JSON parse failed/i);
  });

  await t.test("5. Rejects malformed Base64 that does not decode to valid JSON", () => {
    const corruptB64 = "ThisIsNotBase64EncodedJson12345!@#$%";
    const result = parseServiceAccountKey(corruptB64, "nagarnetra-road-safety");

    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.format, "base64");
  });

  await t.test("6. Validates required fields: rejects missing or non-service_account type", () => {
    const mockNoType = createValidMockServiceAccount({ type: "authorized_user" });
    const result = parseServiceAccountKey(JSON.stringify(mockNoType), "nagarnetra-road-safety");

    assert.strictEqual(result.ok, false);
    assert.match(result.error, /Invalid credential type/i);
  });

  await t.test("7. Validates required fields: rejects missing or invalid project_id", () => {
    const mockNoProject = createValidMockServiceAccount({ project_id: "" });
    const result = parseServiceAccountKey(JSON.stringify(mockNoProject), "nagarnetra-road-safety");

    assert.strictEqual(result.ok, false);
    assert.match(result.error, /Missing or invalid 'project_id'/i);
  });

  await t.test("8. Validates required fields: rejects missing or invalid private_key", () => {
    const mockNoKey = createValidMockServiceAccount({ private_key: "not-a-pem-key" });
    const result = parseServiceAccountKey(JSON.stringify(mockNoKey), "nagarnetra-road-safety");

    assert.strictEqual(result.ok, false);
    assert.match(result.error, /Missing or invalid RSA 'private_key'/i);
  });

  await t.test("9. Validates required fields: rejects missing or invalid client_email", () => {
    const mockNoEmail = createValidMockServiceAccount({ client_email: "not-an-email" });
    const result = parseServiceAccountKey(JSON.stringify(mockNoEmail), "nagarnetra-road-safety");

    assert.strictEqual(result.ok, false);
    assert.match(result.error, /Missing or invalid 'client_email'/i);
  });

  await t.test("10. Detects and rejects project_id mismatch", () => {
    const mockOtherProject = createValidMockServiceAccount({ project_id: "nagarnetra-4a55d" });
    const result = parseServiceAccountKey(JSON.stringify(mockOtherProject), "nagarnetra-road-safety");

    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.projectId, "nagarnetra-4a55d");
    assert.match(result.error, /Project ID mismatch/i);
    assert.match(result.error, /nagarnetra-4a55d/);
    assert.match(result.error, /nagarnetra-road-safety/);
  });

  await t.test("11. Rejects empty, null, or non-string inputs", () => {
    assert.strictEqual(parseServiceAccountKey(null).ok, false);
    assert.strictEqual(parseServiceAccountKey("").ok, false);
    assert.strictEqual(parseServiceAccountKey("   \n  ").ok, false);
    assert.strictEqual(parseServiceAccountKey(12345).ok, false);
  });

});
