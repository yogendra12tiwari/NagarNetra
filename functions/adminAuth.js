// ─── SI-02 Administrator Authorization Service ──────────────────────────────
// Enforces server-side authentication, role verification, and state transition integrity
// for Road Hazard Command Center management operations.
// ────────────────────────────────────────────────────────────────────────────

const ALLOWED_ADMIN_UPDATE_FIELDS = ["status", "notes", "assigned_team"];

const ALLOWED_STATUSES = ["reported", "acknowledged", "dispatched", "in_repair", "resolved"];

const VALID_STATUS_TRANSITIONS = {
  reported: ["acknowledged", "dispatched", "in_repair", "resolved"],
  acknowledged: ["dispatched", "in_repair", "resolved"],
  dispatched: ["in_repair", "resolved", "acknowledged"],
  in_repair: ["resolved", "dispatched", "acknowledged"],
  resolved: ["acknowledged", "in_repair"], // reopening permitted
};

/**
 * Verifies whether an incoming request possesses administrative privileges.
 *
 * Authorization vectors supported:
 * 1. Firebase ID Token (Bearer <token>) with verified claim `admin === true`, `role === 'admin'`,
 *    or verified administrative email domain (@nagarnetra.gov.in).
 * 2. Administrative Secret Header (x-admin-secret) matching environment secret.
 *
 * Never trusts client-supplied body roles or query parameters.
 */
async function verifyAdminRequest(req, adminAuthInstance) {
  if (!req) {
    return { authorized: false, status: 401, error: "Missing request context" };
  }

  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  const adminSecretHeader = req.headers?.["x-admin-secret"];
  const configuredSecret = (process.env.ADMIN_SECRET || process.env.TELEGRAM_WEBHOOK_ADMIN_SECRET || "").trim();

  // Vector 1: Check admin secret header if configured
  if (configuredSecret && adminSecretHeader) {
    if (adminSecretHeader.trim() === configuredSecret) {
      return { authorized: true, user: { uid: "admin_secret_user", role: "admin", method: "secret" } };
    } else {
      return { authorized: false, status: 403, error: "Forbidden: Invalid administrative secret" };
    }
  }

  // Vector 2: Check Firebase Auth ID Token
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const idToken = authHeader.substring(7).trim();
    if (!idToken) {
      return { authorized: false, status: 401, error: "Unauthorized: Empty bearer token" };
    }

    if (!adminAuthInstance || typeof adminAuthInstance.verifyIdToken !== "function") {
      return { authorized: false, status: 500, error: "Server authentication service unavailable" };
    }

    try {
      const decoded = await adminAuthInstance.verifyIdToken(idToken);
      const hasAdminClaim = Boolean(
        decoded.admin === true ||
        decoded.role === "admin" ||
        (decoded.email && decoded.email.toLowerCase().endsWith("@nagarnetra.gov.in"))
      );

      if (hasAdminClaim) {
        return { authorized: true, user: decoded };
      } else {
        return {
          authorized: false,
          status: 403,
          error: "Forbidden: Authenticated user does not possess administrator role",
        };
      }
    } catch (tokenErr) {
      return {
        authorized: false,
        status: 401,
        error: `Unauthorized: Token verification failed (${tokenErr.message})`,
      };
    }
  }

  return {
    authorized: false,
    status: 401,
    error: "Unauthorized: Missing administrative credentials (Bearer ID token or X-Admin-Secret required)",
  };
}

/**
 * Validates that an administrative hazard update request contains only permitted fields
 * and adheres to valid status transitions.
 */
function validateHazardUpdatePayload(body, currentHazard = null) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a JSON object" };
  }

  const keys = Object.keys(body);
  if (keys.length === 0) {
    return { valid: false, error: "Update body cannot be empty" };
  }

  // Reject unexpected or immutable fields
  for (const key of keys) {
    if (!ALLOWED_ADMIN_UPDATE_FIELDS.includes(key)) {
      return {
        valid: false,
        error: `Cannot modify immutable or unauthorized field: '${key}'. Only [${ALLOWED_ADMIN_UPDATE_FIELDS.join(", ")}] are permitted.`,
      };
    }
  }

  const { status, notes, assigned_team } = body;

  // Validate status if provided
  if (status !== undefined) {
    if (typeof status !== "string" || !ALLOWED_STATUSES.includes(status)) {
      return {
        valid: false,
        error: `Invalid status '${status}'. Must be one of: [${ALLOWED_STATUSES.join(", ")}]`,
      };
    }

    // Validate state machine transition if existing record has status
    if (currentHazard && currentHazard.status && currentHazard.status !== status) {
      const allowedNext = VALID_STATUS_TRANSITIONS[currentHazard.status] || [];
      if (!allowedNext.includes(status)) {
        return {
          valid: false,
          error: `Illegal status transition from '${currentHazard.status}' to '${status}'. Allowed transitions: [${allowedNext.join(", ")}]`,
        };
      }
    }
  }

  // Validate notes
  if (notes !== undefined && typeof notes !== "string") {
    return { valid: false, error: "Notes must be a string" };
  }

  // Construct sanitized update payload
  const sanitized = {
    updated_at: new Date().toISOString(),
  };

  if (status !== undefined) {
    sanitized.status = status;
    if (status === "resolved") {
      sanitized.resolved_at = new Date().toISOString();
    }
  }

  if (notes !== undefined) {
    sanitized.notes = notes.trim();
  }

  if (assigned_team !== undefined) {
    sanitized.assigned_team = assigned_team;
  }

  return { valid: true, sanitized };
}

module.exports = {
  ALLOWED_ADMIN_UPDATE_FIELDS,
  ALLOWED_STATUSES,
  VALID_STATUS_TRANSITIONS,
  verifyAdminRequest,
  validateHazardUpdatePayload,
};
