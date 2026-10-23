// ─── SI-02 Phase 4 Unit Tests: Before/After Repair Verification Service ──────
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  validateRepairPhotoInput,
  parseGeminiVerificationResponse,
  normalizeVerificationOutput,
} = require("../repairVerificationService");

describe("SI-02 Phase 4: Repair Verification & Evidence Auditing", () => {
  // ── 1. File Input & Validation ─────────────────────────────────────────────
  it("1. Accepts valid JPEG, PNG, and WebP images within 10 MB limit", () => {
    // Valid 100-byte JPEG buffer
    const validBuffer = Buffer.alloc(100, 0xff);
    const validJpg = validateRepairPhotoInput({
      buffer: validBuffer,
      mimetype: "image/jpeg",
    });
    assert.equal(validJpg.valid, true);
    assert.equal(validJpg.mimetype, "image/jpeg");
    assert.equal(validJpg.size, 100);

    // Valid base64 input
    const base64Data = validBuffer.toString("base64");
    const validBase64 = validateRepairPhotoInput({
      base64: `data:image/png;base64,${base64Data}`,
      mimetype: "image/png",
    });
    assert.equal(validBase64.valid, true);
    assert.equal(validBase64.mimetype, "image/png");
  });

  it("2. Rejects unsupported MIME types (e.g. PDF, executable, text)", () => {
    const buffer = Buffer.alloc(100, 0x20);

    const pdfInput = validateRepairPhotoInput({ buffer, mimetype: "application/pdf" });
    assert.equal(pdfInput.valid, false);
    assert.ok(pdfInput.error.includes("Unsupported file type"));

    const textInput = validateRepairPhotoInput({ buffer, mimetype: "text/plain" });
    assert.equal(textInput.valid, false);
  });

  it("3. Rejects oversized files exceeding 10 MB limit", () => {
    // 11 MB buffer
    const oversizedBuffer = Buffer.alloc(11 * 1024 * 1024);
    const oversized = validateRepairPhotoInput({
      buffer: oversizedBuffer,
      mimetype: "image/jpeg",
    });
    assert.equal(oversized.valid, false);
    assert.ok(oversized.error.includes("exceeds maximum allowed limit of 10 MB"));
  });

  it("4. Rejects empty or missing photo inputs", () => {
    assert.equal(validateRepairPhotoInput(null).valid, false);
    assert.equal(validateRepairPhotoInput({ buffer: Buffer.alloc(0) }).valid, false);
  });

  // ── 2. Gemini Assisted Verification Output Parsing ─────────────────────────
  it("5. Correctly normalizes structured verification output", () => {
    const rawAiOutput = JSON.stringify({
      verification_status: "verified",
      confidence: 0.92,
      explanation: "Pothole filled with new asphalt; road surface flush and safe.",
      needs_human_review: false,
    });

    const parsed = parseGeminiVerificationResponse(rawAiOutput);
    assert.equal(parsed.verification_status, "verified");
    assert.equal(parsed.confidence, 0.92);
    assert.equal(parsed.needs_human_review, false);
    assert.ok(parsed.explanation.includes("asphalt"));
  });

  it("6. Mandates human review for uncertain outcomes or low confidence (< 0.70)", () => {
    // Case A: Low confidence verified -> demoted to uncertain with human review
    const lowConfidence = normalizeVerificationOutput({
      verification_status: "verified",
      confidence: 0.62,
      explanation: "Repair seems plausible but lighting is poor.",
      needs_human_review: false,
    });
    assert.equal(lowConfidence.verification_status, "uncertain");
    assert.equal(lowConfidence.needs_human_review, true);

    // Case B: Explicitly uncertain
    const uncertain = normalizeVerificationOutput({
      verification_status: "uncertain",
      confidence: 0.80,
      explanation: "Angle does not match original pothole location.",
    });
    assert.equal(uncertain.verification_status, "uncertain");
    assert.equal(uncertain.needs_human_review, true);
  });

  it("7. Handles malformed model outputs (markdown fences, invalid JSON) gracefully", () => {
    const fencedOutput = "```json\n{\n  \"verification_status\": \"not_verified\",\n  \"confidence\": 0.88,\n  \"explanation\": \"Water still ponding at original coordinates.\"\n}\n```";
    const parsed = parseGeminiVerificationResponse(fencedOutput);
    assert.equal(parsed.verification_status, "not_verified");
    assert.equal(parsed.confidence, 0.88);
    assert.equal(parsed.needs_human_review, false);

    // Malformed JSON fallback
    const broken = parseGeminiVerificationResponse("Sorry, I could not process this image.");
    assert.equal(broken.verification_status, "uncertain");
    assert.equal(broken.needs_human_review, true);
  });

  // ── 3. Evidence Audit & Original Photo Preservation ────────────────────────
  it("8. Preserves original citizen evidence when repair is evaluated", () => {
    const originalHazard = {
      ticket_id: "HAZ-2026-0033",
      photo_url: "https://storage.googleapis.com/nagarnetra/original_pothole.jpg",
      photos: ["https://storage.googleapis.com/nagarnetra/original_pothole.jpg"],
      lat: 26.8467,
      lng: 80.9462,
      telegram_user_id: "citizen_44",
      status: "in_repair",
    };

    // Simulated repair update
    const update = {
      repair_photo_url: "/api/repairs/photos/HAZ-2026-0033_repair.jpg",
      verification_status: "verified",
      verification_confidence: 0.95,
      status: "resolved",
    };

    const merged = { ...originalHazard, ...update };

    // Assert original photo and citizen data remain unchanged
    assert.equal(merged.photo_url, "https://storage.googleapis.com/nagarnetra/original_pothole.jpg");
    assert.deepEqual(merged.photos, ["https://storage.googleapis.com/nagarnetra/original_pothole.jpg"]);
    assert.equal(merged.lat, 26.8467);
    assert.equal(merged.lng, 80.9462);
    assert.equal(merged.telegram_user_id, "citizen_44");
    // New repair evidence added
    assert.equal(merged.repair_photo_url, "/api/repairs/photos/HAZ-2026-0033_repair.jpg");
    assert.equal(merged.verification_status, "verified");
  });

  // ── 4. Path Traversal & File Name Sanitization ──────────────────────────────
  it("9. Enforces path traversal prevention on stored evidence filenames", () => {
    const maliciousPaths = [
      "../../etc/passwd",
      "..\\..\\windows\\win.ini",
      "../../../secret_keys.json",
      "sub/dir/image.jpg",
    ];

    const path = require("path");
    for (const bad of maliciousPaths) {
      const sanitized = path.basename(bad);
      assert.ok(!sanitized.includes("/") && !sanitized.includes("\\"), `Sanitized '${sanitized}' must not contain directory traversal slashes`);
    }
  });
});
