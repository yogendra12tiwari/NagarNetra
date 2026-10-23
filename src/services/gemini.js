// ─── Gemini AI Service (SI-02 Road Hazard System) ──────────────────────────
// AI hazard classification and risk scoring are precomputed by the secure backend
// (functions/aiHazardService.js and functions/telegramHazardBot.js).
// Client-side code does NOT expose GEMINI_API_KEY.
// ──────────────────────────────────────────────────────────────────────────────

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "https://nagarnetra-74tc.onrender.com";

/**
 * Prioritizes hazards using the precomputed risk scores.
 * Kept for backward-compatibility with existing tab callers.
 */
export async function analyzeDumpPoints(hazards = []) {
  if (!Array.isArray(hazards) || hazards.length === 0) return [];

  // Sort by precomputed risk_score descending (or fallback to report_count)
  const ranked = [...hazards]
    .map(h => {
      const score = typeof h.risk_score === "number" ? h.risk_score : Math.min(99, (h.report_count || 1) * 15);
      const categoryName = h.category || h.hazard_type || "Road Hazard";
      const reason = h.recommended_action || (h.risk_factors && h.risk_factors[0]) || `High priority ${categoryName} requiring immediate repair.`;
      return {
        id: h.id,
        aiScore: score,
        aiReason: reason,
        ...h
      };
    })
    .sort((a, b) => b.aiScore - a.aiScore)
    .slice(0, 15);

  return ranked;
}

/**
 * Public RAG / Civic Assistant Chat
 * Proxies securely to the backend AI endpoint without client-side API keys.
 */
export async function askRagAgent(query, chatHistory = [], hazards = []) {
  console.log("[AI Assistant] Query received:", query);

  const safeHazards = (Array.isArray(hazards) ? hazards : []).slice(0, 30).map(h => ({
    id: h.ticket_id || h.id || "N/A",
    category: h.category || h.hazard_type || "Road Hazard",
    priority: h.priority_label || "Medium",
    risk_score: h.risk_score || 50,
    status: h.status || "reported",
    location: (h.lat && h.lng) ? `${h.lat.toFixed(4)}, ${h.lng.toFixed(4)}` : "Lucknow"
  }));

  try {
    const backendEndpoint = `${BACKEND_URL}/api/ai/chat`;
    const response = await fetch(backendEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        chatHistory: Array.isArray(chatHistory) ? chatHistory : [],
        hazards: safeHazards,
        domain: "road_safety"
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.ok && data.text) {
        return data.text;
      }
    }
  } catch (proxyErr) {
    console.warn("[AI Assistant] Backend proxy unavailable, using local civic responder:", proxyErr.message);
  }

  // Graceful local civic fallback
  const qLower = query.toLowerCase();
  if (qLower.includes("pothole") || qLower.includes("road")) {
    return "To report a pothole or damaged road, send a photo and your GPS location to our official Telegram bot (@NagarNetraBot) using /report. Road crews are dispatched based on AI risk scoring.";
  }
  if (qLower.includes("manhole")) {
    return "Open manholes are treated as Critical Priority (P0). They receive immediate barricading within 4 hours. You can track progress with /status <ticket_id> on Telegram.";
  }
  if (qLower.includes("waterlog") || qLower.includes("drain")) {
    return "Waterlogging hazards are routed to Jal Sansthan drainage crews. Reports during rainfall receive priority weighting.";
  }
  if (qLower.includes("helpline") || qLower.includes("contact") || qLower.includes("phone")) {
    return "Official Lucknow Road Safety & Civic Helplines:\n- LMC Toll-Free Helpline: 1533\n- PWD Road Complaints: 1800-180-0088\n- Traffic Police Control Room: 1090\n- NagarNetra Telegram Bot: @NagarNetraBot";
  }

  return `I am the SI-02 Road Hazard Assistant for Lucknow. You can ask me about road safety guidelines, pothole reporting via Telegram (/report), ticket status (/status), or municipal department responsibilities.`;
}
