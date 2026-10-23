// ─── SI-02 SLA Deadlines & Automated Escalation Service ────────────────────────
// Implements deterministic response and resolution SLA timers mapped to the canonical
// priority bands (Critical, High, Medium, Low), idempotent escalation event tracking,
// and overdue state evaluation.
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_SLA_POLICY = {
  version: "v1.0",
  tiers: {
    Critical: {
      responseHours: 2,
      resolutionHours: 24,
      approachingHours: 0.5, // 30 min before deadline
    },
    High: {
      responseHours: 6,
      resolutionHours: 48,
      approachingHours: 2, // 2 hours before deadline
    },
    Medium: {
      responseHours: 24,
      resolutionHours: 168, // 7 days
      approachingHours: 6,
    },
    Low: {
      responseHours: 48,
      resolutionHours: 336, // 14 days
      approachingHours: 12,
    },
  },
};

/**
 * Computes deterministic SLA deadlines based on hazard priority label and creation time.
 *
 * @param {string} priorityLabel - "Critical" | "High" | "Medium" | "Low"
 * @param {string|Date} createdAt - ISO string or Date object
 * @param {Object} policy - Optional custom SLA policy
 * @returns {Object} { sla_policy, response_deadline, resolution_deadline, response_hours, resolution_hours }
 */
function computeSlaDeadlines(priorityLabel = "Medium", createdAt = null, policy = DEFAULT_SLA_POLICY) {
  const normPriority = policy.tiers[priorityLabel] ? priorityLabel : "Medium";
  const tier = policy.tiers[normPriority];

  const createdTime = createdAt ? new Date(createdAt).getTime() : Date.now();
  const validCreatedTime = isNaN(createdTime) ? Date.now() : createdTime;

  const responseMs = tier.responseHours * 60 * 60 * 1000;
  const resolutionMs = tier.resolutionHours * 60 * 60 * 1000;

  const responseDeadline = new Date(validCreatedTime + responseMs).toISOString();
  const resolutionDeadline = new Date(validCreatedTime + resolutionMs).toISOString();

  return {
    sla_policy: policy.version,
    priority_tier: normPriority,
    response_deadline: responseDeadline,
    resolution_deadline: resolutionDeadline,
    response_hours: tier.responseHours,
    resolution_hours: tier.resolutionHours,
    response_sla_status: "on_track",
    resolution_sla_status: "on_track",
  };
}

/**
 * Evaluates the SLA status for a single hazard record against a reference timestamp.
 *
 * Distinguishes response SLA from resolution SLA:
 * - Response SLA is fulfilled when status moves from 'reported' to 'acknowledged', 'dispatched', 'in_repair', or 'resolved'.
 * - Resolution SLA is fulfilled when status is 'resolved'.
 * - Resolved or cancelled records are excluded from active overdue/breached calculations.
 *
 * @param {Object} hazard
 * @param {Date|string|number} nowRef - Current time reference
 * @param {Object} policy - SLA policy
 * @returns {Object} Evaluation result with updated statuses, remaining ms, and any new escalation events
 */
function evaluateHazardSla(hazard = {}, nowRef = Date.now(), policy = DEFAULT_SLA_POLICY) {
  const now = typeof nowRef === "number" ? nowRef : new Date(nowRef).getTime();
  const safeNow = isNaN(now) ? Date.now() : now;

  const status = hazard.status || "reported";
  const priority = hazard.priority_label || "Medium";
  const tier = policy.tiers[priority] || policy.tiers.Medium;

  // If already resolved or cancelled, hazard is not actively overdue
  if (status === "resolved") {
    return {
      status,
      response_sla_status: "completed",
      resolution_sla_status: "completed",
      is_active_overdue: false,
      is_approaching: false,
      escalation_events: [],
    };
  }

  if (status === "cancelled") {
    return {
      status,
      response_sla_status: "cancelled",
      resolution_sla_status: "cancelled",
      is_active_overdue: false,
      is_approaching: false,
      escalation_events: [],
    };
  }

  // Determine deadlines (calculate if missing)
  let responseDeadline = hazard.response_deadline;
  let resolutionDeadline = hazard.resolution_deadline;

  if (!responseDeadline || !resolutionDeadline) {
    const computed = computeSlaDeadlines(priority, hazard.created_at, policy);
    responseDeadline = computed.response_deadline;
    resolutionDeadline = computed.resolution_deadline;
  }

  const responseDeadlineTime = new Date(responseDeadline).getTime();
  const resolutionDeadlineTime = new Date(resolutionDeadline).getTime();

  // Evaluate Response SLA
  let responseSlaStatus = "on_track";
  const hasResponded = status !== "reported" || Boolean(hazard.responded_at);

  if (hasResponded) {
    responseSlaStatus = "completed";
  } else if (!isNaN(responseDeadlineTime)) {
    const remainingResponseMs = responseDeadlineTime - safeNow;
    const approachingMs = tier.approachingHours * 60 * 60 * 1000;

    if (remainingResponseMs <= 0) {
      responseSlaStatus = "breached";
    } else if (remainingResponseMs <= approachingMs) {
      responseSlaStatus = "approaching";
    }
  }

  // Evaluate Resolution SLA
  let resolutionSlaStatus = "on_track";
  if (!isNaN(resolutionDeadlineTime)) {
    const remainingResolutionMs = resolutionDeadlineTime - safeNow;
    const approachingMs = tier.approachingHours * 60 * 60 * 1000;

    if (remainingResolutionMs <= 0) {
      resolutionSlaStatus = "breached";
    } else if (remainingResolutionMs <= approachingMs) {
      resolutionSlaStatus = "approaching";
    }
  }

  const isActiveOverdue = responseSlaStatus === "breached" || resolutionSlaStatus === "breached";
  const isApproaching = responseSlaStatus === "approaching" || resolutionSlaStatus === "approaching";

  // Compute any new escalation events (avoiding duplicates)
  const existingEscalations = Array.isArray(hazard.escalation_history) ? hazard.escalation_history : [];
  const existingEventTypes = new Set(existingEscalations.map(e => e.event_type));
  const newEvents = [];

  const nowIso = new Date(safeNow).toISOString();

  if (responseSlaStatus === "breached" && !existingEventTypes.has("response_breached")) {
    newEvents.push({
      event_type: "response_breached",
      triggered_at: nowIso,
      reason: `Response SLA of ${tier.responseHours}h exceeded for ${priority} priority ticket without acknowledgment.`,
      priority: priority,
      deadline: responseDeadline,
    });
  } else if (responseSlaStatus === "approaching" && !existingEventTypes.has("response_approaching")) {
    newEvents.push({
      event_type: "response_approaching",
      triggered_at: nowIso,
      reason: `Response deadline approaching within ${tier.approachingHours}h. Immediate operator assignment advised.`,
      priority: priority,
      deadline: responseDeadline,
    });
  }

  if (resolutionSlaStatus === "breached" && !existingEventTypes.has("resolution_breached")) {
    newEvents.push({
      event_type: "resolution_breached",
      triggered_at: nowIso,
      reason: `Resolution SLA of ${tier.resolutionHours}h breached for ${priority} priority hazard without complete repair.`,
      priority: priority,
      deadline: resolutionDeadline,
    });
  } else if (resolutionSlaStatus === "approaching" && !existingEventTypes.has("resolution_approaching")) {
    newEvents.push({
      event_type: "resolution_approaching",
      triggered_at: nowIso,
      reason: `Resolution deadline approaching within ${tier.approachingHours}h. Repair crew progress verification needed.`,
      priority: priority,
      deadline: resolutionDeadline,
    });
  }

  return {
    response_deadline: responseDeadline,
    resolution_deadline: resolutionDeadline,
    response_sla_status: responseSlaStatus,
    resolution_sla_status: resolutionSlaStatus,
    is_active_overdue: isActiveOverdue,
    is_approaching: isApproaching,
    escalation_events: newEvents,
    all_escalations: [...existingEscalations, ...newEvents],
  };
}

/**
 * Summarizes SLA metrics across a list of hazards for administrative dashboards.
 *
 * @param {Array<Object>} hazards
 * @param {Date|number} nowRef
 * @returns {Object} SLA Summary statistics
 */
function summarizeSlaMetrics(hazards = [], nowRef = Date.now()) {
  const summary = {
    total: hazards.length,
    active: 0,
    resolved: 0,
    response: {
      on_track: 0,
      approaching: 0,
      breached: 0,
      completed: 0,
    },
    resolution: {
      on_track: 0,
      approaching: 0,
      breached: 0,
      completed: 0,
    },
    active_overdue_total: 0,
  };

  for (const h of hazards) {
    const evalResult = evaluateHazardSla(h, nowRef);

    if (h.status === "resolved") {
      summary.resolved++;
      summary.response.completed++;
      summary.resolution.completed++;
      continue;
    }

    summary.active++;
    summary.response[evalResult.response_sla_status] = (summary.response[evalResult.response_sla_status] || 0) + 1;
    summary.resolution[evalResult.resolution_sla_status] = (summary.resolution[evalResult.resolution_sla_status] || 0) + 1;

    if (evalResult.is_active_overdue) {
      summary.active_overdue_total++;
    }
  }

  return summary;
}

module.exports = {
  DEFAULT_SLA_POLICY,
  computeSlaDeadlines,
  evaluateHazardSla,
  summarizeSlaMetrics,
};
