// ─── SI-02 Phase 4 Unit Tests: Spatial Duplicate Detection & Clustering ─────
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  haversineDistanceMeters,
  areHazardCategoriesCompatible,
  isHazardEligibleForMatching,
  findSpatialDuplicate,
  linkReportToCluster,
} = require("../duplicateHazardService");

describe("SI-02 Phase 4: Spatial Duplicate Detection & Clustering", () => {
  // ── 1. Haversine Distance Calculation ──────────────────────────────────────
  it("1. Accurately calculates Haversine distance within 50m and beyond", () => {
    // Exact location: Hazratganj Lucknow (approx 26.8467, 80.9462)
    const lat1 = 26.84670;
    const lon1 = 80.94620;

    // Point ~22 metres north
    const lat2 = 26.84690;
    const lon2 = 80.94620;
    const distNear = haversineDistanceMeters(lat1, lon1, lat2, lon2);
    assert.ok(distNear !== null, "Distance should be non-null");
    assert.ok(distNear > 15 && distNear < 30, `Distance ${distNear}m should be ~22m`);

    // Point ~120 metres away
    const latFar = 26.84780;
    const lonFar = 80.94620;
    const distFar = haversineDistanceMeters(lat1, lon1, latFar, lonFar);
    assert.ok(distFar > 100, `Distance ${distFar}m should be > 100m`);
  });

  it("2. Returns null for invalid, NaN, or out-of-range coordinates", () => {
    assert.equal(haversineDistanceMeters(NaN, 80.9, 26.8, 80.9), null);
    assert.equal(haversineDistanceMeters(26.8, undefined, 26.8, 80.9), null);
    assert.equal(haversineDistanceMeters(100.0, 80.9, 26.8, 80.9), null); // Lat > 90
    assert.equal(haversineDistanceMeters(26.8, 80.9, 26.8, 200.0), null); // Lon > 180
  });

  // ── 2. Category Compatibility Matching ─────────────────────────────────────
  it("3. Matches compatible hazard categories and rejects incompatible types", () => {
    // Compatible matches
    assert.ok(areHazardCategoriesCompatible("pothole_or_damaged_road", "pothole_or_damaged_road"));
    assert.ok(areHazardCategoriesCompatible("Pothole / Damaged Road", "pothole_or_damaged_road"));
    assert.ok(areHazardCategoriesCompatible("open_manhole", "open_manhole"));
    assert.ok(areHazardCategoriesCompatible("broken_streetlight", "broken_streetlight"));

    // Incompatible matches (open manhole != streetlight, fallen tree != stray cattle)
    assert.equal(areHazardCategoriesCompatible("open_manhole", "broken_streetlight"), false);
    assert.equal(areHazardCategoriesCompatible("pothole_or_damaged_road", "open_manhole"), false);
    assert.equal(areHazardCategoriesCompatible("fallen_tree_or_obstruction", "stray_cattle"), false);

    // Unclassified / uncertain hazards never auto-cluster with specific categories
    assert.equal(areHazardCategoriesCompatible("unrelated_or_uncertain", "pothole_or_damaged_road"), false);
    assert.equal(areHazardCategoriesCompatible("unclassified", "open_manhole"), false);
  });

  // ── 3. Eligibility Policy ──────────────────────────────────────────────────
  it("4. Excludes resolved and cancelled hazards from duplicate matching", () => {
    assert.equal(isHazardEligibleForMatching({ status: "resolved", lat: 26.8, lng: 80.9 }), false);
    assert.equal(isHazardEligibleForMatching({ status: "cancelled", lat: 26.8, lng: 80.9 }), false);

    // Active hazards are eligible
    assert.equal(isHazardEligibleForMatching({ status: "reported", lat: 26.8, lng: 80.9 }), true);
    assert.equal(isHazardEligibleForMatching({ status: "acknowledged", lat: 26.8, lng: 80.9 }), true);
    assert.equal(isHazardEligibleForMatching({ status: "dispatched", lat: 26.8, lng: 80.9 }), true);
    assert.equal(isHazardEligibleForMatching({ status: "in_repair", lat: 26.8, lng: 80.9 }), true);

    // Invalid coordinates make hazard ineligible
    assert.equal(isHazardEligibleForMatching({ status: "reported", lat: null, lng: 80.9 }), false);
    assert.equal(isHazardEligibleForMatching({ status: "reported", lat: 26.8, lng: NaN }), false);
  });

  // ── 4. Spatial Duplicate Search (Within 50m) ────────────────────────────────
  it("5. Finds duplicate hazard within 50m of same category, ignores > 50m", () => {
    const existingHazards = [
      {
        id: "haz_1",
        ticket_id: "HAZ-2026-0001",
        lat: 26.84670,
        lng: 80.94620,
        hazard_type: "pothole_or_damaged_road",
        status: "reported",
        report_count: 1,
      },
      {
        id: "haz_2",
        ticket_id: "HAZ-2026-0002",
        lat: 26.84670,
        lng: 80.94620,
        hazard_type: "open_manhole", // Different category at same spot
        status: "reported",
        report_count: 1,
      },
      {
        id: "haz_3",
        ticket_id: "HAZ-2026-0003",
        lat: 26.85000, // ~360m away
        lng: 80.94620,
        hazard_type: "pothole_or_damaged_road",
        status: "reported",
        report_count: 1,
      },
    ];

    // New report: pothole 20m from haz_1
    const newReport = {
      ticket_id: "HAZ-2026-0004",
      lat: 26.84685,
      lng: 80.94620,
      hazard_type: "pothole_or_damaged_road",
    };

    const match = findSpatialDuplicate(newReport, existingHazards, { maxDistance: 50 });
    assert.ok(match !== null, "Should detect duplicate within 50m");
    assert.equal(match.canonicalHazard.ticket_id, "HAZ-2026-0001");
    assert.ok(match.distanceMeters <= 50, `Distance ${match.distanceMeters}m must be <= 50m`);

    // New report: streetlight 20m from haz_1 (no matching category)
    const streetlightReport = {
      ticket_id: "HAZ-2026-0005",
      lat: 26.84685,
      lng: 80.94620,
      hazard_type: "broken_streetlight",
    };
    const noMatch = findSpatialDuplicate(streetlightReport, existingHazards, { maxDistance: 50 });
    assert.equal(noMatch, null, "Different category should not match");
  });

  // ── 5. Atomic Cluster Linking & Independent Citizen Report Preservation ─────
  it("6. Atomically links report to cluster, updates count and risk, and preserves citizen ticket", async () => {
    // In-memory mock database for transaction verification
    const store = new Map();

    store.set("hazards/canonical_1", {
      ticket_id: "HAZ-2026-0010",
      cluster_id: null,
      lat: 26.84670,
      lng: 80.94620,
      hazard_type: "pothole_or_damaged_road",
      visual_severity: "moderate",
      classification_confidence: 0.90,
      status: "reported",
      report_count: 1,
      linked_ticket_ids: [],
    });

    store.set("hazards/new_report_1", {
      ticket_id: "HAZ-2026-0011",
      telegram_user_id: "user_citizen_99",
      lat: 26.84680,
      lng: 80.94620,
      photo_url: "https://example.com/photo2.jpg",
      hazard_type: "pothole_or_damaged_road",
      status: "reported",
      report_count: 1,
    });

    const mockDb = {
      runTransaction: async (txFn) => {
        const tx = {
          get: async (ref) => ({
            exists: store.has(ref.path),
            data: () => store.get(ref.path),
          }),
          update: (ref, updateObj) => {
            const current = store.get(ref.path);
            store.set(ref.path, { ...current, ...updateObj });
          },
        };
        return await txFn(tx);
      },
    };

    const canonicalRef = { path: "hazards/canonical_1", id: "canonical_1" };
    const newReportRef = { path: "hazards/new_report_1", id: "new_report_1" };

    const result = await linkReportToCluster(
      mockDb,
      newReportRef,
      canonicalRef,
      { ticket_id: "HAZ-2026-0011" },
      11.1
    );

    assert.equal(result.linked, true);
    assert.equal(result.report_count, 2);
    assert.equal(result.canonical_ticket_id, "HAZ-2026-0010");

    // Check canonical hazard state
    const canonicalUpdated = store.get("hazards/canonical_1");
    assert.equal(canonicalUpdated.report_count, 2);
    assert.deepEqual(canonicalUpdated.linked_ticket_ids, ["HAZ-2026-0011"]);
    assert.equal(canonicalUpdated.is_canonical, true);
    // Cluster boost applied to risk score: report_count=2 gives +5 pts cluster boost
    assert.ok(canonicalUpdated.risk_score > 0);

    // Check new report state (coordinates, photo, and user ID MUST remain intact)
    const newReportUpdated = store.get("hazards/new_report_1");
    assert.equal(newReportUpdated.ticket_id, "HAZ-2026-0011");
    assert.equal(newReportUpdated.telegram_user_id, "user_citizen_99");
    assert.equal(newReportUpdated.lat, 26.84680); // Coordinates NOT overwritten
    assert.equal(newReportUpdated.photo_url, "https://example.com/photo2.jpg");
    assert.equal(newReportUpdated.canonical_ticket_id, "HAZ-2026-0010");
    assert.equal(newReportUpdated.distance_to_canonical_meters, 11.1);
  });

  // ── 6. Concurrency & Retry Idempotency ──────────────────────────────────────
  it("7. Handles duplicate webhook retries without double-incrementing cluster count", async () => {
    const store = new Map();
    store.set("hazards/canonical_1", {
      ticket_id: "HAZ-2026-0010",
      cluster_id: "HAZ-2026-0010",
      lat: 26.84670,
      lng: 80.94620,
      hazard_type: "pothole_or_damaged_road",
      status: "reported",
      report_count: 2,
      linked_ticket_ids: ["HAZ-2026-0011"], // Already linked
    });

    const mockDb = {
      runTransaction: async (txFn) => {
        const tx = {
          get: async (ref) => ({
            exists: store.has(ref.path),
            data: () => store.get(ref.path),
          }),
          update: (ref, updateObj) => {
            const current = store.get(ref.path);
            store.set(ref.path, { ...current, ...updateObj });
          },
        };
        return await txFn(tx);
      },
    };

    const canonicalRef = { path: "hazards/canonical_1", id: "canonical_1" };
    const retryRef = { path: "hazards/new_report_1", id: "new_report_1" };

    // Retry submission of HAZ-2026-0011
    const retryResult = await linkReportToCluster(
      mockDb,
      retryRef,
      canonicalRef,
      { ticket_id: "HAZ-2026-0011" },
      11.1
    );

    assert.equal(retryResult.alreadyLinked, true);
    // report_count remains 2, not incremented to 3
    const canonicalState = store.get("hazards/canonical_1");
    assert.equal(canonicalState.report_count, 2);
  });

  // ── 7. Strict 50-Metre Radius Boundary Condition ───────────────────────────
  it("8. Strict boundary condition: matches reports at <= 50m and rejects reports > 50m", () => {
    const latBase = 26.84670;
    const lonBase = 80.94620;

    // 0.00043 deg lat ≈ 47.8 metres (within 50m)
    // 0.00047 deg lat ≈ 52.2 metres (exceeds 50m)
    const within50 = {
      id: "haz_near",
      ticket_id: "HAZ-2026-0091",
      lat: latBase + 0.00043,
      lng: lonBase,
      hazard_type: "open_manhole",
      status: "reported",
    };

    const beyond50 = {
      id: "haz_far",
      ticket_id: "HAZ-2026-0092",
      lat: latBase + 0.00047,
      lng: lonBase,
      hazard_type: "open_manhole",
      status: "reported",
    };

    const targetReport = {
      lat: latBase,
      lng: lonBase,
      hazard_type: "open_manhole",
    };

    const matchNear = findSpatialDuplicate(targetReport, [within50], { maxDistance: 50 });
    assert.ok(matchNear !== null, "48m should be accepted as duplicate");
    assert.ok(matchNear.distanceMeters <= 50);

    const matchFar = findSpatialDuplicate(targetReport, [beyond50], { maxDistance: 50 });
    assert.equal(matchFar, null, "52m should be rejected as outside duplicate radius");
  });
});
