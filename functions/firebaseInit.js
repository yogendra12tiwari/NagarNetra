/**
 * Firebase Admin SDK Credential Parsing & Initialization Module
 *
 * Implements robust, secure credential parsing for external cloud environments (e.g. Render).
 * Supports direct JSON and Base64-encoded JSON, trims whitespace and wrapping quotes,
 * verifies essential service account fields and project ID alignment, and fails
 * startup explicitly on invalid credentials rather than falling back silently.
 */

const admin = require("firebase-admin");

/**
 * Safely parses and validates a service account credential from an environment variable string.
 * Supports direct JSON string and Base64-encoded JSON.
 *
 * @param {string} rawKey - Raw environment variable value
 * @param {string} [expectedProjectId] - Expected Firebase Project ID
 * @returns {{ ok: boolean, credential?: object, format?: string, projectId?: string, error?: string }}
 */
function parseServiceAccountKey(rawKey, expectedProjectId) {
  if (!rawKey || typeof rawKey !== "string") {
    return { ok: false, error: "Missing or non-string service account key input." };
  }

  // 1. Trim leading/trailing whitespace, newlines, and surrounding quotes
  let cleaned = rawKey.trim();
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  if (!cleaned) {
    return { ok: false, error: "Empty service account key string after trimming." };
  }

  // 2. Format detection: Direct JSON vs Base64
  let jsonString;
  let format;

  if (cleaned.startsWith("{")) {
    format = "direct_json";
    jsonString = cleaned;
  } else {
    format = "base64";
    try {
      jsonString = Buffer.from(cleaned, "base64").toString("utf-8");
      // Basic sanity check on decoded base64 string
      if (!jsonString.trim().startsWith("{")) {
        return {
          ok: false,
          format,
          error: "Base64 payload did not decode to a valid JSON object structure."
        };
      }
    } catch (b64Err) {
      return {
        ok: false,
        format,
        error: `Base64 decode failed: ${b64Err.message}`
      };
    }
  }

  // 3. Parse JSON
  let sa;
  try {
    sa = JSON.parse(jsonString);
  } catch (jsonErr) {
    return {
      ok: false,
      format,
      error: `JSON parse failed: ${jsonErr.message}`
    };
  }

  // 4. Validate essential service account fields
  if (!sa || typeof sa !== "object" || Array.isArray(sa)) {
    return { ok: false, format, error: "Parsed credential is not a JSON object." };
  }

  if (sa.type !== "service_account") {
    return {
      ok: false,
      format,
      error: `Invalid credential type: expected 'service_account', got '${sa.type || "undefined"}'`
    };
  }

  if (!sa.project_id || typeof sa.project_id !== "string" || !sa.project_id.trim()) {
    return {
      ok: false,
      format,
      error: "Missing or invalid 'project_id' in service account credential."
    };
  }

  if (!sa.private_key || typeof sa.private_key !== "string" || !sa.private_key.includes("BEGIN PRIVATE KEY")) {
    return {
      ok: false,
      format,
      error: "Missing or invalid RSA 'private_key' in service account credential."
    };
  }

  if (!sa.client_email || typeof sa.client_email !== "string" || !sa.client_email.includes("@")) {
    return {
      ok: false,
      format,
      error: "Missing or invalid 'client_email' in service account credential."
    };
  }

  const credentialProjectId = sa.project_id.trim();

  // 5. Compare credential project_id with expected project_id
  if (expectedProjectId && credentialProjectId !== expectedProjectId.trim()) {
    return {
      ok: false,
      format,
      projectId: credentialProjectId,
      error: `Project ID mismatch: credential belongs to '${credentialProjectId}', but configured project is '${expectedProjectId.trim()}'.`
    };
  }

  return {
    ok: true,
    credential: sa,
    format,
    projectId: credentialProjectId
  };
}

/**
 * Initializes the Firebase Admin SDK singleton with robust parsing and safe diagnostic logging.
 *
 * @param {object} [options]
 * @param {string} [options.rawKey] - Raw service account key override (defaults to process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
 * @param {string} [options.projectId] - Configured project ID (defaults to process.env.FIREBASE_PROJECT_ID)
 * @param {string} [options.storageBucket] - Configured storage bucket
 * @param {boolean} [options.throwOnInvalid=true] - Whether to throw on invalid explicitly provided credentials
 * @returns {{ admin: object, diagnostics: object }}
 */
function initializeFirebaseAdmin(options = {}) {
  const configuredProjectId = (
    options.projectId ||
    process.env.FIREBASE_PROJECT_ID ||
    "nagarnetra-road-safety"
  ).trim();

  const storageBucket = (
    options.storageBucket ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    `${configuredProjectId}.firebasestorage.app`
  ).trim();

  const rawKey = options.rawKey !== undefined
    ? options.rawKey
    : process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  const throwOnInvalid = options.throwOnInvalid !== false;

  const diagnostics = {
    initialized: false,
    hasServiceAccountEnv: Boolean(rawKey && String(rawKey).trim()),
    explicitCredentials: false,
    format: "none",
    parseSuccess: false,
    parseErrorMessage: null,
    configuredProjectId,
    credentialProjectId: null,
    projectIdMatch: false
  };

  // If already initialized in this process, return existing instance
  if (admin.apps.length > 0) {
    diagnostics.initialized = true;
    return { admin, diagnostics };
  }

  if (diagnostics.hasServiceAccountEnv) {
    const parseResult = parseServiceAccountKey(rawKey, configuredProjectId);

    if (!parseResult.ok) {
      diagnostics.format = parseResult.format || "unknown";
      diagnostics.parseSuccess = false;
      diagnostics.parseErrorMessage = parseResult.error;
      diagnostics.credentialProjectId = parseResult.projectId || null;

      // Sanitized startup log (Never logs private key, client email, or raw env string)
      console.error("================================================================================");
      console.error("[Firebase Admin] CRITICAL STARTUP ERROR: Invalid FIREBASE_SERVICE_ACCOUNT_KEY");
      console.error(`[Firebase Admin] Format detected: ${diagnostics.format}`);
      console.error(`[Firebase Admin] Reason: ${parseResult.error}`);
      if (parseResult.projectId) {
        console.error(`[Firebase Admin] Credential Project ID: ${parseResult.projectId}`);
        console.error(`[Firebase Admin] Configured Project ID: ${configuredProjectId}`);
      }
      console.error("[Firebase Admin] Startup aborted to prevent unauthenticated PERMISSION_DENIED failures.");
      console.error("================================================================================");

      if (throwOnInvalid) {
        throw new Error(`[Firebase Admin] Initialization failed: ${parseResult.error}`);
      }
      return { admin, diagnostics };
    }

    try {
      admin.initializeApp({
        credential: admin.credential.cert(parseResult.credential),
        projectId: parseResult.projectId,
        storageBucket
      });

      diagnostics.initialized = true;
      diagnostics.explicitCredentials = true;
      diagnostics.format = parseResult.format;
      diagnostics.parseSuccess = true;
      diagnostics.credentialProjectId = parseResult.projectId;
      diagnostics.projectIdMatch = true;

      // Sanitized success log
      console.log("[Firebase Admin] Initialization SUCCESS: Authenticated service account attached.");
      console.log(`[Firebase Admin] Format: ${parseResult.format} | Project: ${parseResult.projectId}`);
    } catch (certErr) {
      diagnostics.parseSuccess = false;
      diagnostics.parseErrorMessage = certErr.message;
      console.error("[Firebase Admin] CRITICAL: admin.credential.cert() failed:", certErr.message);
      if (throwOnInvalid) {
        throw new Error(`[Firebase Admin] Credential certification error: ${certErr.message}`);
      }
    }
  } else {
    // Mode: Intentionally omitted credentials
    // Documented behavior: Falls back to Application Default Credentials (ADC) for local emulator or GCP
    console.warn("[Firebase Admin] Notice: FIREBASE_SERVICE_ACCOUNT_KEY is not configured.");
    console.warn("[Firebase Admin] Using default Application Default Credentials (ADC) / environment project.");
    console.warn(`[Firebase Admin] Target Project: ${configuredProjectId}`);

    admin.initializeApp({
      projectId: configuredProjectId,
      storageBucket
    });

    diagnostics.initialized = true;
    diagnostics.explicitCredentials = false;
    diagnostics.parseSuccess = true;
    diagnostics.format = "adc_default";
    diagnostics.credentialProjectId = configuredProjectId;
    diagnostics.projectIdMatch = true;
  }

  return { admin, diagnostics };
}

module.exports = {
  parseServiceAccountKey,
  initializeFirebaseAdmin
};
