const { GoogleGenAI } = require("@google/genai");

// ── Supported Categories ─────────────────────────────────────────────────────
const SUPPORTED_HAZARD_TYPES = [
  "pothole_or_damaged_road",
  "open_manhole",
  "waterlogging",
  "fallen_tree_or_obstruction",
  "broken_streetlight",
  "stray_cattle",
  "unrelated_or_uncertain"
];

const VALID_SEVERITY_LEVELS = ["low", "medium", "high", "critical", "uncertain"];
const VALID_VISUAL_SEVERITIES = ["minor", "moderate", "severe", "uncertain"];

// ── Documented Scoring Weights ───────────────────────────────────────────────
// Hazard category baseline weights (out of 40 max base)
const CATEGORY_BASE_WEIGHTS = {
  open_manhole: 40,               // Acute risk of fatal fall for pedestrians, two-wheelers
  fallen_tree_or_obstruction: 35, // High-speed impact / sudden complete roadway blockage
  pothole_or_damaged_road: 30,    // Vehicle loss-of-control, two-wheeler skids, rim damage
  waterlogging: 25,               // Hydroplaning, concealed open drains/holes
  stray_cattle: 25,               // Unpredictable movement into moving traffic
  broken_streetlight: 15,         // Reduced night visibility, secondary hazard exacerbator
  unrelated_or_uncertain: 5       // Minimal baseline, requires human review
};

// Visual severity weights (out of 35 max visual)
const VISUAL_SEVERITY_WEIGHTS = {
  severe: 35,    // Deep crater, completely open pit, massive trunk across lanes, deep flooding
  moderate: 20,  // Noticeable pothole, displaced cover, partial shoulder block, ankle water
  minor: 10,     // Surface cracking, shallow depression, small puddle, leaning pole
  uncertain: 5   // Unclear visual cues, blurry or occluded angle
};

// ── Human-Readable Category Titles ───────────────────────────────────────────
function formatHazardCategoryLabel(hazardType) {
  switch (hazardType) {
    case "pothole_or_damaged_road":
      return "Pothole / Damaged Road";
    case "open_manhole":
      return "Open Manhole";
    case "waterlogging":
      return "Waterlogging / Flooding";
    case "fallen_tree_or_obstruction":
      return "Fallen Tree / Road Obstruction";
    case "broken_streetlight":
      return "Broken Streetlight";
    case "stray_cattle":
      return "Stray Cattle on Road";
    case "unrelated_or_uncertain":
    default:
      return "Unclassified Hazard (Pending Review)";
  }
}

// ── Deterministic Explainable Risk Scoring Engine ────────────────────────────
/**
 * Calculates a deterministic triage risk-priority score between 1 and 100.
 *
 * NOTE: This is an explainable triage score for dispatch and prioritization,
 * not a scientifically calibrated accident probability.
 *
 * @param {Object} classification - Validated classification from AI or fallback
 * @param {Object} context - Optional context: { report_count, is_night, is_rain }
 * @returns {Object} Score result with breakdown and explainable risk factors
 */
function calculateExplainableRiskScore(classification = {}, context = {}) {
  const hazardType = SUPPORTED_HAZARD_TYPES.includes(classification.hazard_type)
    ? classification.hazard_type
    : "unrelated_or_uncertain";

  const visualSeverity = VALID_VISUAL_SEVERITIES.includes(classification.visual_severity)
    ? classification.visual_severity
    : "uncertain";

  const confidence = typeof classification.confidence === "number" && !isNaN(classification.confidence)
    ? Math.max(0, Math.min(1, classification.confidence))
    : 0.0;

  // 1. Baseline Hazard Weight (5 - 40 pts)
  const baseWeight = CATEGORY_BASE_WEIGHTS[hazardType] || 5;

  // 2. Visual Severity Weight (5 - 35 pts)
  const visualWeight = VISUAL_SEVERITY_WEIGHTS[visualSeverity] || 5;

  // 3. Cluster Repeat Reports Boost (0 - 15 pts)
  // Repeat citizen reports indicate severe public exposure or failure to resolve
  const reportCount = typeof context.report_count === "number" && context.report_count > 0
    ? context.report_count
    : 1;
  const clusterBoost = Math.min(15, Math.max(0, (reportCount - 1) * 5));

  // 4. Verified Contextual Modifiers (0 - 10 pts)
  // Only applied when verified information is present; never fabricated
  let contextBoost = 0;
  if (context.is_night === true && hazardType === "broken_streetlight") {
    contextBoost += 10;
  }
  if (context.is_rain === true && (hazardType === "waterlogging" || hazardType === "pothole_or_damaged_road")) {
    contextBoost += 10;
  }

  // 5. Confidence Adjustment Multiplier
  let confidenceMultiplier = 1.0;
  if (confidence >= 0.85) {
    confidenceMultiplier = 1.0;
  } else if (confidence >= 0.60) {
    confidenceMultiplier = 0.90;
  } else {
    confidenceMultiplier = 0.75;
  }

  // Raw Score Computation
  const rawSum = baseWeight + visualWeight + clusterBoost + contextBoost;
  const weightedScore = rawSum * confidenceMultiplier;

  // Clamped between 1 and 100
  const clampedScore = Math.max(1, Math.min(100, Math.round(weightedScore)));

  // Priority Label (1–24: Low, 25–49: Medium, 50–74: High, 75–100: Critical)
  let priorityLabel = "Low";
  if (clampedScore >= 75) {
    priorityLabel = "Critical";
  } else if (clampedScore >= 50) {
    priorityLabel = "High";
  } else if (clampedScore >= 25) {
    priorityLabel = "Medium";
  }

  // Human Review Flag: required if confidence is low, category is uncertain, or visual severity uncertain
  const needsHumanReview = Boolean(
    classification.needs_human_review ||
    confidence < 0.65 ||
    hazardType === "unrelated_or_uncertain" ||
    visualSeverity === "uncertain"
  );

  // Explainable Risk Factors
  const riskFactors = [];
  if (hazardType === "open_manhole") {
    riskFactors.push("High fall hazard: Uncovered manhole poses acute trauma risk to pedestrians and cyclists.");
  } else if (hazardType === "fallen_tree_or_obstruction") {
    riskFactors.push("Physical blockage: Roadway obstruction directly restricts vehicular movement.");
  } else if (hazardType === "pothole_or_damaged_road") {
    riskFactors.push("Structural surface defect: May trigger vehicle wheel impact or loss of two-wheeler control.");
  } else if (hazardType === "waterlogging") {
    riskFactors.push("Water accumulation: Decreases braking traction and may conceal submerged potholes.");
  } else if (hazardType === "stray_cattle") {
    riskFactors.push("Animal hazard: Unpredictable roadside livestock movement into vehicle travel lane.");
  } else if (hazardType === "broken_streetlight") {
    riskFactors.push("Reduced night illumination: Impairs driver sight distance and pedestrian safety.");
  } else {
    riskFactors.push("Uncertain hazard characteristics: Inspection required to confirm road condition.");
  }

  if (visualSeverity === "severe") {
    riskFactors.push("Severe visual damage: Defect spans active carriageway or presents significant dimensions.");
  } else if (visualSeverity === "moderate") {
    riskFactors.push("Moderate visual damage: Noticeable defect requiring prompt municipal attention.");
  }

  if (clusterBoost > 0) {
    riskFactors.push(`Multiple reports confirmed: ${reportCount} citizens reported this spot, boosting urgency.`);
  }

  if (contextBoost > 0) {
    riskFactors.push("Adverse environmental conditions amplify potential safety impact.");
  }

  if (needsHumanReview) {
    riskFactors.push("Triage notice: Low model confidence or ambiguous image features require human review.");
  }

  return {
    risk_score: clampedScore,
    priority_label: priorityLabel,
    score_breakdown: {
      category_base_weight: baseWeight,
      visual_severity_weight: visualWeight,
      cluster_boost: clusterBoost,
      contextual_boost: contextBoost,
      confidence_multiplier: confidenceMultiplier,
      raw_score: Math.round(rawSum),
      clamped_score: clampedScore,
    },
    risk_factors: riskFactors,
    needs_human_review: needsHumanReview,
  };
}

// ── Model Output Schema Validator ────────────────────────────────────────────
function validateModelOutput(rawOutput) {
  let parsed = null;

  if (typeof rawOutput === "object" && rawOutput !== null) {
    parsed = rawOutput;
  } else if (typeof rawOutput === "string") {
    try {
      // Strip markdown code fences if model enclosed in ```json ... ```
      const cleaned = rawOutput
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch (_) {
      // Fallback: search for first { and last }
      const start = rawOutput.indexOf("{");
      const end = rawOutput.lastIndexOf("}");
      if (start !== -1 && end > start) {
        try {
          parsed = JSON.parse(rawOutput.substring(start, end + 1));
        } catch (jsonErr) {
          console.warn("[aiHazardService] Malformed JSON from model:", jsonErr.message);
        }
      }
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return {
      hazard_type: "unrelated_or_uncertain",
      severity_level: "uncertain",
      visual_severity: "uncertain",
      confidence: 0.0,
      risk_factors: ["Model response was non-JSON or malformed."],
      recommended_action: "Requires manual inspection by road safety officer.",
      needs_human_review: true,
      validation_fallback: true,
    };
  }

  // Validate hazard_type
  let hazardType = "unrelated_or_uncertain";
  if (typeof parsed.hazard_type === "string") {
    const norm = parsed.hazard_type.toLowerCase().trim();
    if (SUPPORTED_HAZARD_TYPES.includes(norm)) {
      hazardType = norm;
    } else {
      // Common synonyms mapping
      if (norm.includes("pothole") || norm.includes("damaged")) hazardType = "pothole_or_damaged_road";
      else if (norm.includes("manhole") || norm.includes("drain")) hazardType = "open_manhole";
      else if (norm.includes("water") || norm.includes("flood")) hazardType = "waterlogging";
      else if (norm.includes("tree") || norm.includes("branch") || norm.includes("obstruction")) hazardType = "fallen_tree_or_obstruction";
      else if (norm.includes("light") || norm.includes("lamp") || norm.includes("pole")) hazardType = "broken_streetlight";
      else if (norm.includes("cattle") || norm.includes("cow") || norm.includes("animal")) hazardType = "stray_cattle";
    }
  }

  // Validate severity_level
  let severityLevel = "uncertain";
  if (typeof parsed.severity_level === "string") {
    const norm = parsed.severity_level.toLowerCase().trim();
    if (VALID_SEVERITY_LEVELS.includes(norm)) severityLevel = norm;
  }

  // Validate visual_severity
  let visualSeverity = "uncertain";
  if (typeof parsed.visual_severity === "string") {
    const norm = parsed.visual_severity.toLowerCase().trim();
    if (VALID_VISUAL_SEVERITIES.includes(norm)) visualSeverity = norm;
  }

  // Validate confidence (0.0 to 1.0)
  let confidence = 0.0;
  if (typeof parsed.confidence === "number" && !isNaN(parsed.confidence)) {
    confidence = Math.max(0.0, Math.min(1.0, parsed.confidence));
  }

  // Validate risk_factors
  const riskFactors = Array.isArray(parsed.risk_factors)
    ? parsed.risk_factors.filter(f => typeof f === "string" && f.trim().length > 0).map(f => f.trim())
    : [];

  const recommendedAction = typeof parsed.recommended_action === "string" && parsed.recommended_action.trim().length > 0
    ? parsed.recommended_action.trim()
    : "Queue for standard municipal road safety triage.";

  const needsHumanReview = typeof parsed.needs_human_review === "boolean"
    ? parsed.needs_human_review
    : (confidence < 0.65 || hazardType === "unrelated_or_uncertain" || severityLevel === "uncertain");

  return {
    hazard_type: hazardType,
    severity_level: severityLevel,
    visual_severity: visualSeverity,
    confidence: Number(confidence.toFixed(2)),
    risk_factors: riskFactors,
    recommended_action: recommendedAction,
    needs_human_review: needsHumanReview,
  };
}

// ── Gemini Multimodal Classification Service ─────────────────────────────────
/**
 * Classifies a road hazard photo using Google Gemini on the backend.
 *
 * @param {string|Buffer} imageSource - Public image URL or image Buffer
 * @param {Object} options - { timeoutMs, apiKey, model, mockResult }
 * @returns {Promise<Object>} Validated hazard classification result
 */
async function classifyRoadHazard(imageSource, options = {}) {
  // Mock support for fast unit testing & offline CI
  if (options.mockResult) {
    const validated = validateModelOutput(options.mockResult);
    validated.analysis_status = options.mockResult.analysis_status || "completed";
    validated.model = options.model || "gemini-2.5-flash-mock";
    return validated;
  }

  const apiKey = (options.apiKey || process.env.GEMINI_API_KEY || "").trim();
  if (!apiKey) {
    console.warn("[aiHazardService] GEMINI_API_KEY not configured. Falling back to pending review.");
    return {
      hazard_type: "unrelated_or_uncertain",
      severity_level: "uncertain",
      visual_severity: "uncertain",
      confidence: 0.0,
      risk_factors: ["Gemini AI key not configured on backend."],
      recommended_action: "Manual inspection required by municipal operator.",
      needs_human_review: true,
      analysis_status: "skipped_no_api_key",
    };
  }

  const timeoutMs = options.timeoutMs || 10000; // 10s bounded timeout
  const modelName = options.model || process.env.GEMINI_MODEL || "gemini-2.5-flash";

  let imageBuffer = null;
  let mimeType = "image/jpeg";

  // Handle Buffer or URL
  if (Buffer.isBuffer(imageSource)) {
    imageBuffer = imageSource;
    mimeType = options.mimeType || "image/jpeg";
  } else if (typeof imageSource === "string" && (imageSource.startsWith("http://") || imageSource.startsWith("https://"))) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch(imageSource, { signal: controller.signal });
      clearTimeout(timer);

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status} fetching image`);
      }

      mimeType = res.headers.get("content-type") || "image/jpeg";
      // Limit to 10MB to prevent memory exhaustion
      const arrayBuf = await res.arrayBuffer();
      if (arrayBuf.byteLength > 10 * 1024 * 1024) {
        throw new Error("Image exceeds maximum 10MB size limit");
      }
      imageBuffer = Buffer.from(arrayBuf);
    } catch (fetchErr) {
      console.error("[aiHazardService] Image download failed:", fetchErr.message);
      return {
        hazard_type: "unrelated_or_uncertain",
        severity_level: "uncertain",
        visual_severity: "uncertain",
        confidence: 0.0,
        risk_factors: [`Failed to download hazard photo: ${fetchErr.message}`],
        recommended_action: "Queue for manual operator inspection.",
        needs_human_review: true,
        analysis_status: "failed_image_download",
      };
    }
  } else {
    return {
      hazard_type: "unrelated_or_uncertain",
      severity_level: "uncertain",
      visual_severity: "uncertain",
      confidence: 0.0,
      risk_factors: ["No valid image source provided."],
      recommended_action: "Request citizen to upload a valid photo.",
      needs_human_review: true,
      analysis_status: "invalid_input",
    };
  }

  const prompt = `You are an expert AI Road Hazard Inspector for municipal road safety operations.
Your job is to analyze this citizen-submitted photograph and classify the visible road hazard.

SUPPORTED HAZARD CATEGORIES:
1. "pothole_or_damaged_road" (Potholes, broken tarmac, road surface collapse)
2. "open_manhole" (Missing, broken, or open manhole/drain cover on road or footpath)
3. "waterlogging" (Deep standing water, flooded street, submerged road surface)
4. "fallen_tree_or_obstruction" (Fallen trees, large branches, boulders, construction debris blocking road)
5. "broken_streetlight" (Damaged, tilted, unlit street lamp post, hanging electric cables)
6. "stray_cattle" (Cows, bulls, buffaloes, or horses standing/sitting in active traffic carriageway)
7. "unrelated_or_uncertain" (Not a road hazard: personal selfie, clean indoor room, random object, meme, or image is too blurry/dark to discern)

STRICT GUARDRAILS:
- Do NOT invent or claim exact pothole depth in centimeters, traffic density numbers, or statistical accident probabilities.
- Assess visual severity strictly based on what is visible in the frame (minor | moderate | severe | uncertain).
- If the image does not clearly depict one of the 6 road hazard categories, output "unrelated_or_uncertain".

Respond ONLY with a valid JSON object matching this schema:
{
  "hazard_type": "pothole_or_damaged_road | open_manhole | waterlogging | fallen_tree_or_obstruction | broken_streetlight | stray_cattle | unrelated_or_uncertain",
  "severity_level": "low | medium | high | critical | uncertain",
  "visual_severity": "minor | moderate | severe | uncertain",
  "confidence": 0.95,
  "risk_factors": ["Short bullet point 1", "Short bullet point 2"],
  "recommended_action": "Concise recommended triage action",
  "needs_human_review": false
}`;

  try {
    const ai = new GoogleGenAI({ apiKey });

    // Call Gemini with bounded timeout promise race
    const generatePromise = ai.models.generateContent({
      model: modelName,
      contents: [
        prompt,
        {
          inlineData: {
            data: imageBuffer.toString("base64"),
            mimeType: mimeType.split(";")[0],
          }
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Gemini API call timed out after ${timeoutMs}ms`)), timeoutMs);
    });

    const response = await Promise.race([generatePromise, timeoutPromise]);
    const rawText = response.text ? response.text.trim() : "";

    const validated = validateModelOutput(rawText);
    validated.analysis_status = "completed";
    validated.model = modelName;
    return validated;
  } catch (apiError) {
    console.error("[aiHazardService] Gemini classification failed:", apiError.message);
    return {
      hazard_type: "unrelated_or_uncertain",
      severity_level: "uncertain",
      visual_severity: "uncertain",
      confidence: 0.0,
      risk_factors: [`AI service error: ${apiError.message}`],
      recommended_action: "Preserved report; queued for manual administrative review.",
      needs_human_review: true,
      analysis_status: "failed_api_error",
      model: modelName,
    };
  }
}

module.exports = {
  SUPPORTED_HAZARD_TYPES,
  VALID_SEVERITY_LEVELS,
  VALID_VISUAL_SEVERITIES,
  CATEGORY_BASE_WEIGHTS,
  VISUAL_SEVERITY_WEIGHTS,
  formatHazardCategoryLabel,
  calculateExplainableRiskScore,
  validateModelOutput,
  classifyRoadHazard,
};
