// ─── SI-02 Phase 4 Unit Tests: SLA Deadlines & Escalation Service ──────────
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  computeSlaDeadlines,
  evaluateHazardSla,
  summarizeSlaMetrics,
} = require("../slaService");

describe("SI-02 Phase 4: SLA Deadlines & Escalation Service", () => {
  // ── 1. Priority Band SLA Mapping ───────────────────────────────────────────
  it("1. Maps each canonical priority band to its configured response and resolution SLA", () => {
    const baseTime = "2026-10-23T12:00:00.000Z";

    const crit = computeSlaDeadlines("Critical", baseTime);
    assert.equal(crit.response_hours, 2);
    assert.equal(crit.resolution_hours, 24);
    assert.equal(crit.response_deadline, "2026-10-23T14:00:00.000Z");
    assert.equal(crit.resolution_deadline, "2026-10-24T12:00:00.000Z");

    const high = computeSlaDeadlines("High", baseTime);
    assert.equal(high.response_hours, 6);
    assert.equal(high.resolution_hours, 48);

    const med = computeSlaDeadlines("Medium", baseTime);
    assert.equal(med.response_hours, 24);
    assert.equal(med.resolution_hours, 168); // 7 days

    const low = computeSlaDeadlines("Low", baseTime);
    assert.equal(low.response_hours, 48);
    assert.equal(low.resolution_hours, 336); // 14 days
  });

  // ── 2. Timezone & Timestamp Handling ───────────────────────────────────────
  it("2. Handles missing, invalid, or epoch creation timestamps safely", () => {
    const nullCreated = computeSlaDeadlines("High", null);
    assert.ok(nullCreated.response_deadline !== null);
    assert.ok(!isNaN(new Date(nullCreated.response_deadline).getTime()));

    const invalidCreated = computeSlaDeadlines("Critical", "invalid-date-string");
    assert.ok(invalidCreated.response_deadline !== null);
  });

  // ── 3. SLA Evaluation: On-Track, Approaching, Breached ─────────────────────
  it("3. Correctly detects on-track, approaching, and breached deadlines", () => {
    const createdAt = "2026-10-23T10:00:00.000Z";
    // Critical: Response deadline = 12:00:00.000Z (2h), approaching threshold = 30 min (11:30)

    const hazard = {
      created_at: createdAt,
      priority_label: "Critical",
      status: "reported",
      response_deadline: "2026-10-23T12:00:00.000Z",
      resolution_deadline: "2026-10-24T10:00:00.000Z",
    };

    // Case A: At 10:30 (1.5h remaining -> on_track)
    const evalOnTrack = evaluateHazardSla(hazard, new Date("2026-10-23T10:30:00.000Z").getTime());
    assert.equal(evalOnTrack.response_sla_status, "on_track");
    assert.equal(evalOnTrack.is_active_overdue, false);

    // Case B: At 11:45 (15 min remaining <= 30 min -> approaching)
    const evalApproaching = evaluateHazardSla(hazard, new Date("2026-10-23T11:45:00.000Z").getTime());
    assert.equal(evalApproaching.response_sla_status, "approaching");
    assert.equal(evalApproaching.is_approaching, true);
    assert.ok(evalApproaching.escalation_events.some(e => e.event_type === "response_approaching"));

    // Case C: At 12:05 (5 min past deadline -> breached)
    const evalBreached = evaluateHazardSla(hazard, new Date("2026-10-23T12:05:00.000Z").getTime());
    assert.equal(evalBreached.response_sla_status, "breached");
    assert.equal(evalBreached.is_active_overdue, true);
    assert.ok(evalBreached.escalation_events.some(e => e.event_type === "response_breached"));
  });

  // ── 4. Response SLA vs Resolution SLA Distinction ─────────────────────────
  it("4. Distinguishes response SLA completion from resolution SLA", () => {
    const hazard = {
      created_at: "2026-10-23T10:00:00.000Z",
      priority_label: "Critical",
      status: "dispatched", // Operator has responded by dispatching
      response_deadline: "2026-10-23T12:00:00.000Z",
      resolution_deadline: "2026-10-24T10:00:00.000Z",
    };

    // Current time: 13:00 (past response deadline)
    const evalResult = evaluateHazardSla(hazard, new Date("2026-10-23T13:00:00.000Z").getTime());
    // Since status is 'dispatched', response SLA was fulfilled/completed
    assert.equal(evalResult.response_sla_status, "completed");
    // Resolution SLA is still on track for tomorrow
    assert.equal(evalResult.resolution_sla_status, "on_track");
    assert.equal(evalResult.is_active_overdue, false);
  });

  // ── 5. Exclusion of Resolved Hazards from Active Overdue ───────────────────
  it("5. Excludes resolved hazards from active overdue calculations", () => {
    const resolvedHazard = {
      created_at: "2026-10-20T10:00:00.000Z",
      priority_label: "Critical",
      status: "resolved",
      resolved_at: "2026-10-21T08:00:00.000Z",
      response_deadline: "2026-10-20T12:00:00.000Z",
      resolution_deadline: "2026-10-21T10:00:00.000Z",
    };

    // Evaluation 3 days later
    const evalResult = evaluateHazardSla(resolvedHazard, new Date("2026-10-24T12:00:00.000Z").getTime());
    assert.equal(evalResult.is_active_overdue, false);
    assert.equal(evalResult.response_sla_status, "completed");
    assert.equal(evalResult.resolution_sla_status, "completed");
    assert.equal(evalResult.escalation_events.length, 0);
  });

  // ── 6. Idempotency of Escalation Events ────────────────────────────────────
  it("6. Does not append duplicate escalation events on repeated evaluations", () => {
    const existingEscalation = {
      event_type: "response_breached",
      triggered_at: "2026-10-23T12:01:00.000Z",
      reason: "Response SLA exceeded",
      priority: "Critical",
    };

    const hazardWithHistory = {
      created_at: "2026-10-23T10:00:00.000Z",
      priority_label: "Critical",
      status: "reported",
      response_deadline: "2026-10-23T12:00:00.000Z",
      resolution_deadline: "2026-10-24T10:00:00.000Z",
      escalation_history: [existingEscalation],
    };

    // First evaluation: 13:00
    const eval1 = evaluateHazardSla(hazardWithHistory, new Date("2026-10-23T13:00:00.000Z").getTime());
    assert.equal(eval1.escalation_events.length, 0, "Should not duplicate already triggered response_breached");
    assert.equal(eval1.all_escalations.length, 1);

    // Second evaluation: 14:00
    const eval2 = evaluateHazardSla(hazardWithHistory, new Date("2026-10-23T14:00:00.000Z").getTime());
    assert.equal(eval2.escalation_events.length, 0);
    assert.equal(eval2.all_escalations.length, 1);
  });

  // ── 7. Summary Metrics Aggregation ─────────────────────────────────────────
  it("7. Aggregates SLA summary metrics across active and resolved hazards", () => {
    const hazards = [
      {
        id: "1",
        status: "resolved",
        priority_label: "Critical",
        response_deadline: "2026-10-23T12:00:00.000Z",
        resolution_deadline: "2026-10-24T10:00:00.000Z",
      },
      {
        id: "2",
        status: "reported",
        priority_label: "Critical",
        response_deadline: "2026-10-23T12:00:00.000Z",
        resolution_deadline: "2026-10-24T10:00:00.000Z",
      },
      {
        id: "3",
        status: "in_repair",
        priority_label: "High",
        response_deadline: "2026-10-23T16:00:00.000Z",
        resolution_deadline: "2026-10-25T10:00:00.000Z",
      },
    ];

    // Reference time: 13:00
    // Hazard 1: resolved -> not active overdue
    // Hazard 2: reported, deadline 12:00 -> response breached! active overdue
    // Hazard 3: in_repair -> response completed, resolution on track
    const summary = summarizeSlaMetrics(hazards, new Date("2026-10-23T13:00:00.000Z").getTime());

    assert.equal(summary.total, 3);
    assert.equal(summary.active, 2);
    assert.equal(summary.resolved, 1);
    assert.equal(summary.response.breached, 1); // Hazard 2
    assert.equal(summary.response.completed, 2); // Hazard 1 + 3
    assert.equal(summary.active_overdue_total, 1); // Hazard 2
  });
});
