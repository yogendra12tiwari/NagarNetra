// ─── SI-02 Before / After Repair Verification Service ─────────────────────────
// Handles submission, validation, storage, and Gemini-assisted visual verification
// of road hazard repairs for authorized municipal dispatch officers.
// ─────────────────────────────────────────────────────────────────────────────

const fs = require("fs");
const path = require("path");
const { GoogleGenAI } = require("@google/genai");

// File validation constants
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

const VALID_VERIFICATION_STATUSES = ["verified", "not_verified", "uncertain", "pending"];

/**
 * Validates repair image input (MIME type, size, data integrity).
 *
 * @param {Object} fileInput - { buffer, mimetype, size, filename } or { base64, mimetype }
 * @returns {Object} { valid: boolean, error?: string, buffer?: Buffer, mimetype?: string }
 */
function validateRepairPhotoInput(fileInput) {
  if (!fileInput) {
    return { valid: false, error: "Missing repair photo input" };
  }

  let buffer = null;
  let mimetype = fileInput.mimetype || fileInput.mimeType;

  if (Buffer.isBuffer(fileInput.buffer)) {
    buffer = fileInput.buffer;
  } else if (typeof fileInput.base64 === "string") {
    try {
      const cleanBase64 = fileInput.base64.replace(/^data:image\/\w+;base64,/, "");
      buffer = Buffer.from(cleanBase64, "base64");
    } catch (_err) {
      return { valid: false, error: "Invalid base64 encoded image data" };
    }
  } else if (typeof fileInput === "string" && fileInput.startsWith("data:")) {
    // Data URI format
    const matches = fileInput.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return { valid: false, error: "Malformed data URI string" };
    }
    mimetype = matches[1];
    buffer = Buffer.from(matches[2], "base64");
  }

  if (!buffer || buffer.length === 0) {
    return { valid: false, error: "Photo file buffer is empty" };
  }

  // Check file size
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds maximum allowed limit of 10 MB`,
    };
  }

  // Normalize and check MIME type
  const normalizedMime = (mimetype || "image/jpeg").toLowerCase().trim();
  if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
    return {
      valid: false,
      error: `Unsupported file type '${normalizedMime}'. Allowed types: [${ALLOWED_MIME_TYPES.join(", ")}]`,
    };
  }

  return {
    valid: true,
    buffer,
    mimetype: normalizedMime,
    size: buffer.length,
  };
}

/**
 * Stores the repair photo safely in the backend-controlled storage.
 * If Firebase Storage bucket is configured, uploads to gs://bucket/repairs/{ticketId}_{timestamp}.ext.
 * Otherwise, stores locally in functions/uploads/repairs/ with controlled permissions.
 *
 * @param {Buffer} buffer
 * @param {string} mimetype
 * @param {string} ticketId
 * @param {Object} adminInstance - Firebase Admin instance
 * @returns {Promise<string>} Stored photo access URL or local route
 */
async function storeRepairPhoto(buffer, mimetype, ticketId, adminInstance = null) {
  const timestamp = Date.now();
  const ext = mimetype.includes("png") ? "png" : mimetype.includes("webp") ? "webp" : "jpg";
  const filename = `${ticketId || "HAZ"}_repair_${timestamp}.${ext}`;

  // 1. Try Firebase Cloud Storage if configured
  if (adminInstance && typeof adminInstance.storage === "function") {
    try {
      const bucketName = (process.env.FIREBASE_STORAGE_BUCKET || "").trim();
      const bucket = bucketName ? adminInstance.storage().bucket(bucketName) : adminInstance.storage().bucket();
      if (bucket && bucket.name) {
        const file = bucket.file(`repairs/${filename}`);
        await file.save(buffer, {
          metadata: { contentType: mimetype },
          resumable: false,
        });
        // Generate signed URL valid for 7 days or use internal storage reference
        const [signedUrl] = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
        });
        return signedUrl;
      }
    } catch (storageErr) {
      console.warn("[Repair Verification] Firebase Storage bucket unavailable, using local backend storage:", storageErr.message);
    }
  }

  // 2. Local Backend File Storage
  const uploadsDir = path.join(__dirname, "uploads", "repairs");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const filePath = path.join(uploadsDir, filename);
  fs.writeFileSync(filePath, buffer);

  // Return protected API route for photo retrieval
  return `/api/repairs/photos/${filename}`;
}

/**
 * Fetches an image buffer from a URL or local file path.
 *
 * @param {string} imageSource
 * @returns {Promise<{ buffer: Buffer, mimeType: string }|null>}
 */
async function fetchImageBuffer(imageSource) {
  if (!imageSource || typeof imageSource !== "string") return null;

  // Local uploads file
  if (imageSource.startsWith("/api/repairs/photos/")) {
    const filename = path.basename(imageSource);
    const localPath = path.join(__dirname, "uploads", "repairs", filename);
    if (fs.existsSync(localPath)) {
      const buffer = fs.readFileSync(localPath);
      const ext = path.extname(filename).toLowerCase();
      const mime = ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";
      return { buffer, mimeType: mime };
    }
  }

  // HTTP / HTTPS URL
  if (imageSource.startsWith("http://") || imageSource.startsWith("https://")) {
    try {
      const res = await fetch(imageSource, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return null;
      const arrayBuffer = await res.arrayBuffer();
      const contentType = res.headers.get("content-type") || "image/jpeg";
      return { buffer: Buffer.from(arrayBuffer), mimeType: contentType.split(";")[0] };
    } catch (err) {
      console.warn("[Repair Verification] Failed to fetch image buffer:", err.message);
      return null;
    }
  }

  return null;
}

/**
 * Compares the original citizen hazard photo with the submitted repair photo
 * using Google Gemini Multimodal SDK.
 *
 * Evaluates whether the specific road defect (e.g. pothole filled, manhole covered, obstruction cleared)
 * has been resolved in the after-repair photo.
 *
 * @param {string} originalPhotoUrl - Before photo URL
 * @param {string|Buffer} repairPhoto - After photo URL or Buffer
 * @param {string} category - Hazard category (e.g. "pothole_or_damaged_road")
 * @param {Object} options - { apiKey, timeoutMs, mockResult }
 * @returns {Promise<Object>} Verification evaluation
 */
async function verifyRepairWithGemini(originalPhotoUrl, repairPhoto, category = "pothole_or_damaged_road", options = {}) {
  // If mock result provided (for unit testing)
  if (options.mockResult) {
    return normalizeVerificationOutput(options.mockResult);
  }

  const apiKey = (options.apiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    return {
      verification_status: "uncertain",
      confidence: 0.0,
      explanation: "Gemini API key not configured. Queued for manual officer review.",
      needs_human_review: true,
      model: "offline-fallback",
    };
  }

  try {
    // 1. Fetch Before Image
    const beforeImg = await fetchImageBuffer(originalPhotoUrl);
    if (!beforeImg) {
      return {
        verification_status: "uncertain",
        confidence: 0.0,
        explanation: "Original citizen photo could not be retrieved for visual comparison.",
        needs_human_review: true,
        model: "offline-fallback",
      };
    }

    // 2. Fetch After Image
    let afterImg = null;
    if (Buffer.isBuffer(repairPhoto)) {
      afterImg = { buffer: repairPhoto, mimeType: options.repairMimeType || "image/jpeg" };
    } else {
      afterImg = await fetchImageBuffer(repairPhoto);
    }

    if (!afterImg) {
      return {
        verification_status: "uncertain",
        confidence: 0.0,
        explanation: "Repair photo could not be loaded for visual comparison.",
        needs_human_review: true,
        model: "offline-fallback",
      };
    }

    // 3. Prepare Gemini Prompt
    const ai = new GoogleGenAI({ apiKey });
    const modelName = options.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";

    const prompt = `
You are an expert civil engineer and municipal road inspector verifying whether road hazard repair work was successfully completed.

Original Reported Hazard Category: "${category}"

Analyze both provided images:
- Image 1 is the "BEFORE" photo showing the originally reported road hazard.
- Image 2 is the "AFTER" photo submitted by the road repair crew.

Your task:
1. Determine if Image 2 shows the same physical location or road section as Image 1.
2. Determine if the reported hazard (e.g., pothole filled with fresh asphalt, manhole safely capped, fallen tree removed, water drained, cattle cleared, streetlight fixed) has been genuinely resolved.
3. If the repair appears complete and sound, set verification_status to "verified".
4. If the hazard is still clearly present, unrepaired, or improperly patched, set verification_status to "not_verified".
5. If the angle is too different to verify, the photo is blurry, or you cannot be confident, set verification_status to "uncertain" and set needs_human_review to true.

Output ONLY a single raw JSON object matching this schema without any markdown formatting or commentary:
{
  "verification_status": "verified" | "not_verified" | "uncertain",
  "confidence": 0.0 to 1.0,
  "explanation": "concise explanation of visual observations comparing before and after",
  "needs_human_review": true | false
}
`;

    const parts = [
      { text: prompt },
      {
        inlineData: {
          mimeType: beforeImg.mimeType,
          data: beforeImg.buffer.toString("base64"),
        },
      },
      {
        inlineData: {
          mimeType: afterImg.mimeType,
          data: afterImg.buffer.toString("base64"),
        },
      },
    ];

    const timeoutMs = options.timeoutMs || 15000;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Gemini verification API timeout")), timeoutMs)
    );

    const apiPromise = ai.models.generateContent({
      model: modelName,
      contents: parts,
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);
    const rawText = (response?.text || "").trim();

    return parseGeminiVerificationResponse(rawText, modelName);
  } catch (err) {
    console.error("[Repair Verification] Gemini inspection error:", err.message);
    return {
      verification_status: "uncertain",
      confidence: 0.0,
      explanation: `Automated visual comparison unavailable (${err.message}). Operator review required.`,
      needs_human_review: true,
      model: "fallback-error",
    };
  }
}

/**
 * Safely parses and normalizes Gemini verification output JSON.
 */
function parseGeminiVerificationResponse(rawText, modelName = "gemini-2.5-flash") {
  if (!rawText) {
    return {
      verification_status: "uncertain",
      confidence: 0.0,
      explanation: "Empty response received from verification model.",
      needs_human_review: true,
      model: modelName,
    };
  }

  let clean = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();

  let parsed = null;
  try {
    parsed = JSON.parse(clean);
  } catch (_e) {
    // Attempt regex extraction
    const match = clean.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        parsed = JSON.parse(match[0]);
      } catch (_e2) {
        parsed = null;
      }
    }
  }

  if (!parsed) {
    return {
      verification_status: "uncertain",
      confidence: 0.0,
      explanation: "Model response format could not be parsed as structured JSON.",
      needs_human_review: true,
      model: modelName,
    };
  }

  return normalizeVerificationOutput(parsed, modelName);
}

/**
 * Normalizes and validates verification output object.
 */
function normalizeVerificationOutput(data = {}, modelName = "gemini-2.5-flash") {
  let status = String(data.verification_status || "uncertain").toLowerCase().trim();
  if (!VALID_VERIFICATION_STATUSES.includes(status)) {
    status = "uncertain";
  }

  let confidence = typeof data.confidence === "number" && !isNaN(data.confidence)
    ? Math.max(0, Math.min(1, data.confidence))
    : 0.5;

  let needsReview = Boolean(data.needs_human_review);

  // Enforce human review rules:
  // 1. Uncertain status always requires human review
  // 2. Confidence below 0.70 always requires human review
  if (status === "uncertain" || confidence < 0.70) {
    needsReview = true;
  }

  // Never automatically verify with low confidence
  if (status === "verified" && confidence < 0.70) {
    status = "uncertain";
    needsReview = true;
  }

  return {
    verification_status: status,
    confidence: Math.round(confidence * 100) / 100,
    explanation: String(data.explanation || "Visual comparison completed.").trim(),
    needs_human_review: needsReview,
    model: modelName,
  };
}

module.exports = {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  VALID_VERIFICATION_STATUSES,
  validateRepairPhotoInput,
  storeRepairPhoto,
  verifyRepairWithGemini,
  parseGeminiVerificationResponse,
  normalizeVerificationOutput,
};
