// ─── SI-02 Spatial Duplicate Detection & Hazard Clustering Service ─────────────
// Detects whether an incoming citizen hazard report is a duplicate of an existing
// incident within 50 metres, links them safely under a canonical cluster, and
// recalculates risk scores deterministically without mutating original reports.
// ─────────────────────────────────────────────────────────────────────────────

const { calculateExplainableRiskScore } = require("./aiHazardService");

// Maximum distance in metres for duplicate hazard consideration
const DUPLICATE_RADIUS_METRES = 50.0;

// Category compatibility matrix
// Potholes and damaged roads match each other. Open manholes must match open manholes.
// Streetlights match streetlights. Unclassified or uncertain reports do not auto-cluster.
const COMPATIBLE_CATEGORY_MAP = {
  pothole_or_damaged_road: ["pothole_or_damaged_road"],
  open_manhole: ["open_manhole"],
  waterlogging: ["waterlogging"],
  fallen_tree_or_obstruction: ["fallen_tree_or_obstruction"],
  broken_streetlight: ["broken_streetlight"],
  stray_cattle: ["stray_cattle"],
};

/**
 * Calculates the great-circle distance between two GPS coordinates in metres
 * using the Haversine formula.
 *
 * @param {number} lat1
 * @param {number} lon1
 * @param {number} lat2
 * @param {number} lon2
 * @returns {number|null} Distance in metres, or null if coordinates are invalid.
 */
function haversineDistanceMeters(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== "number" || isNaN(lat1) ||
    typeof lon1 !== "number" || isNaN(lon1) ||
    typeof lat2 !== "number" || isNaN(lat2) ||
    typeof lon2 !== "number" || isNaN(lon2)
  ) {
    return null;
  }

  // Coordinate boundary checks
  if (lat1 < -90 || lat1 > 90 || lat2 < -90 || lat2 > 90) return null;
  if (lon1 < -180 || lon1 > 180 || lon2 < -180 || lon2 > 180) return null;

  const R = 6371000; // Earth radius in metres
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Checks whether two hazard categories are compatible for spatial duplicate matching.
 *
 * @param {string} catA - Category/hazard_type of first report
 * @param {string} catB - Category/hazard_type of second report
 * @returns {boolean} True if categories are compatible
 */
function areHazardCategoriesCompatible(catA, catB) {
  if (!catA || !catB) return false;

  const clean = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, "");
  const cleanA = clean(catA);
  const cleanB = clean(catB);

  // Unrelated or unclassified hazards never auto-cluster with specific hazards
  if (cleanA.includes("uncertain") || cleanA.includes("unrelated") || cleanA.includes("unclassified") ||
      cleanB.includes("uncertain") || cleanB.includes("unrelated") || cleanB.includes("unclassified")) {
    return false;
  }

  // Exact alphanumeric match
  if (cleanA === cleanB) return true;

  // Domain keyword groups
  const groups = [
    ["pothole", "damagedroad"],
    ["openmanhole", "manhole"],
    ["waterlog", "flood"],
    ["fallentree", "obstruction", "tree"],
    ["brokenstreetlight", "streetlight"],
    ["straycattle", "cattle"],
  ];

  for (const group of groups) {
    const matchA = group.some(w => cleanA.includes(w));
    const matchB = group.some(w => cleanB.includes(w));
    if (matchA && matchB) return true;
  }

  return false;
}

/**
 * Evaluates whether an existing hazard record is eligible for duplicate matching.
 * Policy:
 * 1. Resolved or cancelled hazards are excluded (a new report at the same location is a recurrence or new defect).
 * 2. Hazards must have valid coordinates.
 * 3. Hazards must be in active status: 'reported', 'acknowledged', 'dispatched', 'in_repair'.
 *
 * @param {Object} hazard
 * @returns {boolean}
 */
function isHazardEligibleForMatching(hazard) {
  if (!hazard || typeof hazard !== "object") return false;
  if (hazard.status === "resolved" || hazard.status === "cancelled") return false;
  if (typeof hazard.lat !== "number" || isNaN(hazard.lat)) return false;
  if (typeof hazard.lng !== "number" || isNaN(hazard.lng)) return false;
  return true;
}

/**
 * Finds the closest eligible existing hazard within 50 metres that has a compatible category.
 *
 * @param {Object} newReport - { lat, lng, hazard_type, category, ticket_id }
 * @param {Array<Object>} existingHazards - List of existing hazard documents
 * @param {Object} options - { maxDistance: 50 }
 * @returns {Object|null} { canonicalHazard, distanceMeters } or null if no match found
 */
function findSpatialDuplicate(newReport, existingHazards = [], options = {}) {
  const maxDistance = options.maxDistance || DUPLICATE_RADIUS_METRES;

  if (!newReport || typeof newReport.lat !== "number" || typeof newReport.lng !== "number") {
    return null;
  }

  const newType = newReport.hazard_type || newReport.category;
  if (!newType) return null;

  let bestMatch = null;
  let minDistance = Infinity;

  for (const existing of existingHazards) {
    // Skip self if already in the list
    if (existing.ticket_id && existing.ticket_id === newReport.ticket_id) continue;
    if (existing.id && existing.id === newReport.id) continue;

    if (!isHazardEligibleForMatching(existing)) continue;

    const existingType = existing.hazard_type || existing.category;
    if (!areHazardCategoriesCompatible(newType, existingType)) continue;

    const distance = haversineDistanceMeters(newReport.lat, newReport.lng, existing.lat, existing.lng);
    if (distance !== null && distance <= maxDistance && distance < minDistance) {
      minDistance = distance;
      bestMatch = existing;
    }
  }

  if (bestMatch) {
    return {
      canonicalHazard: bestMatch,
      distanceMeters: Math.round(minDistance * 10) / 10,
    };
  }

  return null;
}

/**
 * Atomically links a new report to a canonical hazard in Firestore.
 *
 * Guarantees:
 * - Preserves the new report's ticket ID, reporter identity, original coordinates, and photo.
 * - Establishes cluster_id on both canonical hazard and linked report.
 * - Increments report_count and appends linked_ticket_ids on canonical hazard atomically.
 * - Recalculates canonical hazard's explainable risk score using deterministic scoring.
 * - Does NOT overwrite either record's GPS coordinates.
 *
 * @param {Object} db - Firestore database instance
 * @param {Object} newHazardDocRef - Document reference of the newly created hazard
 * @param {Object} canonicalHazardDocRef - Document reference of the existing canonical hazard
 * @param {Object} newHazardData - Data of the new report
 * @param {number} distanceMeters - Calculated Haversine distance
 * @returns {Promise<Object>} Linking summary
 */
async function linkReportToCluster(db, newHazardDocRef, canonicalHazardDocRef, newHazardData, distanceMeters) {
  if (!db || !newHazardDocRef || !canonicalHazardDocRef) {
    throw new Error("Missing database or document references for cluster linking");
  }

  return await db.runTransaction(async (transaction) => {
    const canonicalSnap = await transaction.get(canonicalHazardDocRef);
    if (!canonicalSnap.exists) {
      throw new Error("Canonical hazard document no longer exists");
    }

    const canonicalData = canonicalSnap.data();

    // Check if canonical hazard is still eligible (e.g. wasn't resolved concurrently)
    if (!isHazardEligibleForMatching(canonicalData)) {
      return { linked: false, reason: "Canonical hazard was resolved or is no longer eligible" };
    }

    // Determine canonical cluster ID
    const clusterId = canonicalData.cluster_id || canonicalData.ticket_id || canonicalHazardDocRef.id;

    // Check if new report was already linked to avoid double-incrementing on retries
    const existingLinked = Array.isArray(canonicalData.linked_ticket_ids) ? canonicalData.linked_ticket_ids : [];
    if (existingLinked.includes(newHazardData.ticket_id)) {
      return { linked: true, alreadyLinked: true, cluster_id: clusterId };
    }

    const updatedLinked = [...existingLinked, newHazardData.ticket_id];
    const newReportCount = (canonicalData.report_count || 1) + 1;

    // Recalculate explainable risk score for canonical hazard with updated cluster boost
    const classificationForScoring = {
      hazard_type: canonicalData.hazard_type || "unrelated_or_uncertain",
      visual_severity: canonicalData.visual_severity || "moderate",
      confidence: canonicalData.classification_confidence ?? 0.85,
      needs_human_review: canonicalData.needs_human_review,
    };

    const newRiskResult = calculateExplainableRiskScore(classificationForScoring, {
      report_count: newReportCount,
    });

    const now = new Date().toISOString();

    // 1. Update Canonical Hazard
    transaction.update(canonicalHazardDocRef, {
      cluster_id: clusterId,
      is_canonical: true,
      report_count: newReportCount,
      linked_ticket_ids: updatedLinked,
      risk_score: newRiskResult.risk_score,
      priority_label: newRiskResult.priority_label,
      score_breakdown: newRiskResult.score_breakdown,
      last_reported: now,
      updated_at: now,
    });

    // 2. Update New Report (preserves own ticket_id, photo, lat, lng, and ownership)
    transaction.update(newHazardDocRef, {
      cluster_id: clusterId,
      is_canonical: false,
      canonical_ticket_id: canonicalData.ticket_id,
      distance_to_canonical_meters: distanceMeters,
      updated_at: now,
      notes: `Linked to active hazard cluster ${canonicalData.ticket_id} (${distanceMeters}m away). Total reports: ${newReportCount}.`,
    });

    return {
      linked: true,
      cluster_id: clusterId,
      canonical_ticket_id: canonicalData.ticket_id,
      report_count: newReportCount,
      updated_risk_score: newRiskResult.risk_score,
      updated_priority: newRiskResult.priority_label,
      distance_meters: distanceMeters,
    };
  });
}

module.exports = {
  DUPLICATE_RADIUS_METRES,
  COMPATIBLE_CATEGORY_MAP,
  haversineDistanceMeters,
  areHazardCategoriesCompatible,
  isHazardEligibleForMatching,
  findSpatialDuplicate,
  linkReportToCluster,
};
