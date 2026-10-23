const admin = require("firebase-admin");
const {
  classifyRoadHazard,
  calculateExplainableRiskScore,
  formatHazardCategoryLabel
} = require("./aiHazardService");
const {
  findSpatialDuplicate,
  linkReportToCluster,
} = require("./duplicateHazardService");
const {
  computeSlaDeadlines,
  evaluateHazardSla,
} = require("./slaService");

// ── In-Memory Deduplication Cache for Telegram Updates ───────────────────────
// Stores recent update_id values with timestamps to prevent re-processing retries.
const processedUpdateIds = new Map();
const UPDATE_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function isDuplicateUpdate(updateId) {
  if (!updateId) return false;
  const now = Date.now();
  // Clean up expired entries periodically
  if (processedUpdateIds.size > 2000) {
    for (const [id, time] of processedUpdateIds.entries()) {
      if (now - time > UPDATE_CACHE_TTL_MS) {
        processedUpdateIds.delete(id);
      }
    }
  }

  if (processedUpdateIds.has(updateId)) {
    return true;
  }
  processedUpdateIds.set(updateId, now);
  return false;
}

/**
 * Escapes special Markdown characters in user-provided or dynamic text
 * to prevent Telegram entity parsing errors.
 * Special characters in Telegram legacy Markdown: _, *, `, [
 */
function escapeMarkdown(text) {
  if (text === null || text === undefined) return "";
  return String(text).replace(/([_*`\[\\])/g, "\\$1");
}

// ── Telegram Bot API Network Helpers ─────────────────────────────────────────
async function sendTelegramMessage(chatId, text, options = {}) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim().replace(/^["']|["']$/g, "").replace(/^bot/, "");
  if (!token) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN not configured; cannot send message.");
    return { success: false, error: "TELEGRAM_BOT_TOKEN not configured" };
  }

  const parseMode = options.parse_mode !== undefined ? options.parse_mode : "Markdown";
  const url = `https://api.telegram.org/bot${token}/sendMessage`;

  const buildBody = (mode) => {
    const payload = {
      chat_id: chatId,
      text: String(text),
    };
    if (mode) {
      payload.parse_mode = mode;
    }
    if (options.reply_markup) {
      payload.reply_markup = options.reply_markup;
    }
    return payload;
  };

  try {
    let response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildBody(parseMode)),
    });

    let data = await response.json().catch(() => ({}));

    // Resilient fallback: If Telegram rejects due to entity parsing error (HTTP 400 Bad Request: can't parse entities),
    // retry once immediately in plain text mode (omitting parse_mode) so the message is guaranteed to reach the user.
    if (!response.ok && data.description && data.description.includes("can't parse entities") && parseMode) {
      console.warn(`[Telegram] Entity parsing failed (${data.description}). Retrying message delivery in plain text.`);
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildBody(null)),
      });
      data = await response.json().catch(() => ({}));
    }

    if (!response.ok || !data.ok) {
      console.error("[Telegram] API error:", {
        status: response.status,
        description: data.description || "Unknown Telegram error",
        chatId,
      });
      return { success: false, error: data.description || "Telegram API error" };
    }

    return { success: true, message_id: data.result?.message_id };
  } catch (err) {
    console.error("[Telegram] Network error sending message:", {
      message: err.message || "Network error",
      chatId,
    });
    return { success: false, error: err.message };
  }
}

async function getTelegramFileUrl(fileId) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!token || !fileId) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const data = await res.json().catch(() => ({}));
    if (data.ok && data.result?.file_path) {
      return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
    }
  } catch (err) {
    console.error("[Telegram] Error fetching file path:", err.message);
  }
  return null;
}

// ── Collision-Safe Ticket ID Generator ───────────────────────────────────────
// Uses a Firestore transaction on collection("meta").doc("hazardCounter")
async function generateHazardTicketId(db) {
  const counterRef = db.collection("meta").doc("hazardCounter");
  const year = new Date().getFullYear();

  const nextCount = await db.runTransaction(async (t) => {
    const doc = await t.get(counterRef);
    let current = 0;
    if (doc.exists) {
      const data = doc.data();
      if (typeof data.count === "number") {
        current = data.count;
      }
    }
    const next = current + 1;
    t.set(counterRef, {
      count: next,
      prefix: "HAZ",
      year: year,
      updated_at: new Date().toISOString(),
    }, { merge: true });
    return next;
  });

  return `HAZ-${year}-${String(nextCount).padStart(4, "0")}`;
}

// ── Supported Road Hazard Categories ─────────────────────────────────────────
const SUPPORTED_CATEGORIES = [
  "Pothole / damaged road",
  "Open manhole",
  "Waterlogging",
  "Fallen tree / road obstruction",
  "Broken streetlight",
  "Stray cattle",
  "Unclassified hazard pending review"
];

// Helper to format ISO dates cleanly
function formatDate(isoStr) {
  if (!isoStr) return "N/A";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch (_err) {
    return String(isoStr);
  }
}

// ── Core Conversational Processor ───────────────────────────────────────────
async function processTelegramMessage(message, db, options = {}) {
  const chatId = message.chat?.id;
  const userId = message.from?.id ? String(message.from.id) : String(chatId);
  const username = message.from?.username || null;
  const firstName = message.from?.first_name || "Citizen";
  const rawText = (message.text || message.caption || "").trim();
  const lowerText = rawText.toLowerCase();

  const sessionRef = db.collection("telegram_sessions").doc(String(chatId));

  // 1. COMMAND: /cancel (Always handled regardless of state)
  if (lowerText === "/cancel" || lowerText === "cancel") {
    const sessionSnap = await sessionRef.get();
    if (sessionSnap.exists) {
      await sessionRef.delete();
      await sendTelegramMessage(chatId, "🚫 *Reporting session cancelled.*\n\nSend /report whenever you wish to report a road hazard.", {
        reply_markup: { remove_keyboard: true }
      });
    } else {
      await sendTelegramMessage(chatId, "No active reporting session was found. Send /report to report a road hazard.", {
        reply_markup: { remove_keyboard: true }
      });
    }
    return { status: "cancelled" };
  }

  // 2. COMMAND: /start or /help
  if (lowerText === "/start" || lowerText === "start" || lowerText === "/help") {
    const welcome =
      `👋 *Welcome to SI-02 Road Hazard Intelligence System*\n\n` +
      `I am your civic assistant for reporting and tracking road hazards.\n\n` +
      `*Available Commands:*\n` +
      `• /report — Report a new road hazard\n` +
      `• \`/status <ticket_id>\` — Track your report (e.g. \`/status HAZ-2026-0001\`)\n` +
      `• /cancel — Cancel an ongoing report\n\n` +
      `*Supported Hazard Types:*\n` +
      `🕳️ Potholes & damaged roads\n` +
      `🕳️ Open manholes\n` +
      `🌊 Waterlogging\n` +
      `🌳 Fallen trees & obstructions\n` +
      `💡 Broken streetlights\n` +
      `🐄 Stray cattle`;

    await sendTelegramMessage(chatId, welcome, {
      reply_markup: { remove_keyboard: true }
    });
    return { status: "welcome" };
  }

  // 3. COMMAND: /status <ticket_id>
  if (lowerText.startsWith("/status")) {
    const parts = rawText.split(/\s+/);
    const requestedCode = parts[1] ? parts[1].toUpperCase().trim() : "";

    if (!requestedCode) {
      await sendTelegramMessage(chatId,
        `ℹ️ *Track Your Road Hazard Report*\n\n` +
        `Please specify your Ticket ID with the command.\n` +
        `Example:\n\`/status HAZ-2026-0001\``
      );
      return { status: "missing_ticket_id" };
    }

    // Query Firestore hazards collection by ticket_id
    const snapshot = await db.collection("hazards").where("ticket_id", "==", requestedCode).limit(1).get();

    if (snapshot.empty) {
      await sendTelegramMessage(chatId,
        `❌ *Ticket Not Found*\n\n` +
        `No road hazard report found with Ticket ID: \`${escapeMarkdown(requestedCode)}\`.\n` +
        `Please check the ID and try again, or send /report to file a new report.`
      );
      return { status: "ticket_not_found" };
    }

    const hazardDoc = snapshot.docs[0];
    const hazard = hazardDoc.data();

    // OWNERSHIP VERIFICATION:
    // Ensure citizen cannot access another citizen's private report
    const ownerUserId = hazard.telegram_user_id ? String(hazard.telegram_user_id) : "";
    const ownerChatId = hazard.telegram_chat_id ? String(hazard.telegram_chat_id) : "";

    if (ownerUserId && ownerUserId !== userId && ownerChatId !== String(chatId)) {
      console.warn(`[Ownership Security] User ${userId} attempted unauthorized access to ticket ${requestedCode} owned by ${ownerUserId}`);
      await sendTelegramMessage(chatId,
        `🔒 *Access Restricted*\n\n` +
        `This ticket was submitted by another citizen. For privacy and data protection, status tracking via Telegram is restricted to the original reporter.\n\n` +
        `If you are an administrator, please log in through the Civic Command Center dashboard.`
      );
      return { status: "unauthorized" };
    }

    const statusBadge = (hazard.status || "reported").toUpperCase();
    const riskBadge = hazard.priority_label && hazard.risk_score
      ? `${hazard.priority_label} (${hazard.risk_score}/100)`
      : "Pending Triage";

    // Evaluate SLA status
    const slaEval = evaluateHazardSla(hazard);

    const clusterLine = hazard.cluster_id
      ? (hazard.canonical_ticket_id
          ? `👥 *Incident Cluster:* Linked to \`${escapeMarkdown(hazard.canonical_ticket_id)}\` (${hazard.distance_to_canonical_meters || "approx. 50"}m away)\n`
          : `👥 *Incident Cluster:* Lead cluster with ${hazard.report_count || 1} report(s)\n`)
      : (hazard.report_count > 1 ? `👥 *Citizen Reports:* ${hazard.report_count} linked reports\n` : "");

    const slaLines = hazard.response_deadline
      ? `⏱️ *Response SLA:* ${slaEval.response_sla_status.toUpperCase()} (Target: ${formatDate(hazard.response_deadline)})\n` +
        `🛠️ *Resolution Target:* ${formatDate(hazard.resolution_deadline)} (${slaEval.resolution_sla_status.toUpperCase()})\n`
      : "";

    const verificationLine = hazard.verification_status
      ? `🔍 *Repair Verification:* *${hazard.verification_status.toUpperCase()}*${hazard.verification_status === "verified" ? " ✅" : ""}\n`
      : "";

    const statusMsg =
      `📋 *Road Hazard Status Report*\n\n` +
      `🎫 *Ticket ID:* \`${escapeMarkdown(hazard.ticket_id)}\`\n` +
      `📂 *Category:* ${escapeMarkdown(hazard.category || "Unclassified hazard pending review")}\n` +
      `📊 *Status:* *${statusBadge}*\n` +
      `⚠️ *Severity:* ${escapeMarkdown(hazard.severity || "Pending review")}\n` +
      `🎯 *Risk Priority:* ${escapeMarkdown(riskBadge)}\n` +
      clusterLine +
      slaLines +
      verificationLine +
      `📍 *Location:* ${hazard.lat ? hazard.lat.toFixed(5) : "N/A"}, ${hazard.lng ? hazard.lng.toFixed(5) : "N/A"}\n` +
      `📅 *Reported:* ${formatDate(hazard.created_at || hazard.first_reported)}\n` +
      `🔄 *Last Update:* ${formatDate(hazard.updated_at || hazard.last_reported)}\n` +
      (hazard.assigned_team ? `👷 *Assigned Team:* ${escapeMarkdown(hazard.assigned_team.name || hazard.assigned_team)}\n` : "") +
      (hazard.recommended_action ? `🛠️ *Recommended Action:* ${escapeMarkdown(hazard.recommended_action)}\n` : "") +
      (hazard.needs_human_review ? `🔍 *Triage Notice:* Flagged for operator review\n` : "") +
      (hazard.verification_notes ? `📝 *Notes:* ${escapeMarkdown(hazard.verification_notes)}\n` : "");

    await sendTelegramMessage(chatId, statusMsg);
    return { status: "status_returned", ticket_id: requestedCode };
  }

  // 4. COMMAND: /report (Initiate new reporting session)
  if (lowerText === "/report" || lowerText === "report") {
    // Overwrite or start new session
    await sessionRef.set({
      step: "awaiting_photo",
      chat_id: String(chatId),
      user_id: userId,
      username: username,
      first_name: firstName,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const promptPhotoMsg =
      `📸 *Road Hazard Reporting (Step 1 of 2)*\n\n` +
      `Please upload or take a clear *photo* of the road hazard.\n\n` +
      `*Accepted Hazards:*\n` +
      `• Potholes & damaged roads\n` +
      `• Open manholes\n` +
      `• Waterlogging\n` +
      `• Fallen trees & road obstructions\n` +
      `• Broken streetlights\n` +
      `• Stray cattle\n\n` +
      `Send /cancel at any point to stop.`;

    await sendTelegramMessage(chatId, promptPhotoMsg, {
      reply_markup: { remove_keyboard: true }
    });
    return { status: "awaiting_photo" };
  }

  // 5. SESSION STATE CHECK
  const sessionSnap = await sessionRef.get();
  if (!sessionSnap.exists) {
    // No active session and no recognized command
    await sendTelegramMessage(chatId,
      `👋 Hello ${escapeMarkdown(firstName)}!\n\n` +
      `To report a road hazard, please send /report.\n` +
      `To track an existing report, send \`/status <ticket_id>\`.\n` +
      `Send /help to see all options.`
    );
    return { status: "no_active_session" };
  }

  const session = sessionSnap.data();

  // Check if session has expired (e.g. > 24 hours inactive)
  const sessionAge = Date.now() - new Date(session.updated_at || session.created_at || Date.now()).getTime();
  if (sessionAge > 24 * 60 * 60 * 1000) {
    await sessionRef.delete();
    await sendTelegramMessage(chatId,
      `⏳ *Session Expired*\n\n` +
      `Your previous reporting session timed out due to inactivity.\n` +
      `Please send /report to start fresh.`,
      { reply_markup: { remove_keyboard: true } }
    );
    return { status: "session_expired" };
  }

  // ── STEP: awaiting_photo ───────────────────────────────────────────────────
  if (session.step === "awaiting_photo") {
    if (message.photo && Array.isArray(message.photo) && message.photo.length > 0) {
      const largestPhoto = message.photo[message.photo.length - 1];
      const fileId = largestPhoto.file_id;
      const fileUrl = await getTelegramFileUrl(fileId);

      // Save file_id and temporary photo URL to session
      await sessionRef.update({
        step: "awaiting_location",
        file_id: fileId,
        photo_url: fileUrl || null,
        updated_at: new Date().toISOString(),
      });

      // Prompt for GPS location with native Telegram ReplyKeyboardMarkup button
      const promptLocationMsg =
        `✅ *Photo Received!*\n\n` +
        `📍 *Step 2 of 2: Share Hazard GPS Location*\n\n` +
        `Please tap the button below to share your exact location, or send your location via the attachment clip (📎 → Location).`;

      const locationKeyboard = {
        keyboard: [
          [{ text: "📍 Share Current Location Pin", request_location: true }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      };

      await sendTelegramMessage(chatId, promptLocationMsg, {
        reply_markup: locationKeyboard
      });
      return { status: "photo_saved_awaiting_location" };
    }

    // Citizen sent text or non-photo media while in awaiting_photo
    await sendTelegramMessage(chatId,
      `📸 Please upload a *photo* of the road hazard to proceed.\n\n` +
      `If you don't have a photo or wish to exit, send /cancel.`
    );
    return { status: "invalid_photo_input" };
  }

  // ── STEP: awaiting_location ────────────────────────────────────────────────
  if (session.step === "awaiting_location") {
    if (message.location && typeof message.location.latitude === "number") {
      const lat = message.location.latitude;
      const lng = message.location.longitude;

      // Coordinate boundary validation
      if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        await sendTelegramMessage(chatId,
          `⚠️ Invalid GPS coordinates received. Please share a valid location pin via 📎 → Location, or send /cancel.`
        );
        return { status: "invalid_coordinates" };
      }

      // Generate collision-safe ticket ID
      const ticketId = await generateHazardTicketId(db);
      const timestamp = new Date().toISOString();

      // 1. Create immediate hazard record in Firestore collection: "hazards"
      const newHazard = {
        ticket_id: ticketId,
        telegram_user_id: userId,
        telegram_chat_id: String(chatId),
        telegram_username: session.username || null,
        file_id: session.file_id || null,
        photo_url: session.photo_url || null,
        photos: session.photo_url ? [session.photo_url] : [],
        lat: lat,
        lng: lng,
        category: "Unclassified hazard pending review",
        hazard_type: "unrelated_or_uncertain",
        severity: "pending_review",
        severity_level: "uncertain",
        visual_severity: "uncertain",
        risk_score: null,
        priority_label: "Pending Review",
        status: "reported",
        analysis_status: "pending_analysis",
        needs_human_review: true,
        report_count: 1,
        source: "telegram",
        created_at: timestamp,
        first_reported: timestamp,
        last_reported: timestamp,
        updated_at: timestamp,
        notes: "Reported via Telegram bot. Pending AI hazard classification.",
      };

      const hazardDocRef = await db.collection("hazards").add(newHazard);

      // 2. Save report entry in "hazard_reports" for citizen submission audit trail
      await db.collection("hazard_reports").add({
        ticket_id: ticketId,
        hazard_id: hazardDocRef.id,
        telegram_user_id: userId,
        telegram_chat_id: String(chatId),
        file_id: session.file_id || null,
        photo_url: session.photo_url || null,
        lat: lat,
        lng: lng,
        channel: "telegram",
        status: "reported",
        timestamp: timestamp,
      });

      // 3. Clear session so user returns to idle
      await sessionRef.delete();

      // 4. Run AI Classification & Explainable Risk Scoring with bounded timeout
      let aiResult = null;
      let riskResult = null;
      const photoSource = session.photo_url || (options.mockAiResult ? "mock://image" : null);

      if (photoSource) {
        try {
          aiResult = await classifyRoadHazard(photoSource, {
            timeoutMs: options.aiTimeoutMs || 8000,
            mockResult: options.mockAiResult || null,
            apiKey: options.apiKey || process.env.GEMINI_API_KEY,
          });

          riskResult = calculateExplainableRiskScore(aiResult, {
            report_count: 1,
          });

          const categoryTitle = formatHazardCategoryLabel(aiResult.hazard_type);

          await hazardDocRef.update({
            hazard_type: aiResult.hazard_type,
            category: categoryTitle,
            severity: aiResult.severity_level,
            severity_level: aiResult.severity_level,
            visual_severity: aiResult.visual_severity,
            risk_score: riskResult.risk_score,
            priority_label: riskResult.priority_label,
            score_breakdown: riskResult.score_breakdown,
            risk_factors: riskResult.risk_factors,
            classification_confidence: aiResult.confidence,
            recommended_action: aiResult.recommended_action,
            needs_human_review: Boolean(aiResult.needs_human_review || riskResult.needs_human_review),
            analysis_status: aiResult.analysis_status || "completed",
            ai_model: aiResult.model || "gemini-2.5-flash",
            analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            notes: aiResult.recommended_action || "AI hazard inspection completed.",
          });
        } catch (aiErr) {
          console.warn("[Telegram Bot] AI hazard classification deferred:", aiErr.message);
          await hazardDocRef.update({
            analysis_status: "pending_review",
            needs_human_review: true,
            updated_at: new Date().toISOString(),
            notes: `AI classification deferred: ${aiErr.message}`,
          }).catch(console.error);
        }
      }

      // 5. Spatial Duplicate Detection & Incident Clustering (Within 50m)
      let linkResult = null;
      let dupMatch = null;
      try {
        if (db && typeof db.collection === "function") {
          const hazardsCol = db.collection("hazards");
          let activeSnap = null;
          if (typeof hazardsCol.where === "function") {
            const query = hazardsCol.where("status", "in", ["reported", "acknowledged", "dispatched", "in_repair"]);
            if (query && typeof query.limit === "function") {
              const limited = query.limit(50);
              if (limited && typeof limited.get === "function") {
                activeSnap = await limited.get();
              }
            } else if (query && typeof query.get === "function") {
              activeSnap = await query.get();
            }
          }

          if (activeSnap && Array.isArray(activeSnap.docs) && activeSnap.docs.length > 0) {
            const activeHazards = activeSnap.docs
              .map(d => ({ id: d.id, ...(typeof d.data === "function" ? d.data() : d) }))
              .filter(h => h.id !== hazardDocRef.id && h.ticket_id !== ticketId);

            dupMatch = findSpatialDuplicate({
              id: hazardDocRef.id,
              ticket_id: ticketId,
              lat,
              lng,
              hazard_type: aiResult?.hazard_type || "unrelated_or_uncertain",
              category: aiResult?.hazard_type ? formatHazardCategoryLabel(aiResult.hazard_type) : "Unclassified hazard",
            }, activeHazards);

            if (dupMatch && dupMatch.canonicalHazard) {
              const canonicalRef = db.collection("hazards").doc(dupMatch.canonicalHazard.id);
              linkResult = await linkReportToCluster(
                db,
                hazardDocRef,
                canonicalRef,
                { ticket_id: ticketId },
                dupMatch.distanceMeters
              );
            }
          }
        }
      } catch (dupErr) {
        console.warn("[Telegram Bot] Duplicate detection notice:", dupErr.message);
      }

      // 6. SLA Deadlines Computation
      const finalPriority = linkResult?.updated_priority || riskResult?.priority_label || "Medium";
      const slaDeadlines = computeSlaDeadlines(finalPriority, timestamp);
      if (hazardDocRef && typeof hazardDocRef.update === "function") {
        await hazardDocRef.update({
          ...slaDeadlines,
          updated_at: new Date().toISOString(),
        }).catch(console.error);
      } else if (db && typeof db.collection === "function" && hazardDocRef?.id) {
        const docRef = db.collection("hazards").doc(hazardDocRef.id);
        if (docRef && typeof docRef.update === "function") {
          await docRef.update({
            ...slaDeadlines,
            updated_at: new Date().toISOString(),
          }).catch(console.error);
        }
      }

      // 7. Deliver tailored confirmation to citizen and remove keyboard
      let clusterNotice = "";
      if (linkResult && linkResult.linked && !linkResult.alreadyLinked && dupMatch) {
        clusterNotice =
          `\n\n🔗 *Incident Cluster Notice:*\n` +
          `Your report was matched to an active hazard cluster (\`${dupMatch.canonicalHazard.ticket_id}\`) ${dupMatch.distanceMeters}m away.\n` +
          `Total reports linked: *${linkResult.report_count}*. Priority reinforced to *${linkResult.updated_priority}*!`;
      }

      let confirmationMsg = "";
      if (aiResult && aiResult.hazard_type !== "unrelated_or_uncertain") {
        const catTitle = formatHazardCategoryLabel(aiResult.hazard_type);
        confirmationMsg =
          `✅ *Road Hazard Reported & Classified!*\n\n` +
          `🎫 *Ticket ID:* \`${ticketId}\`\n` +
          `📂 *Detected Hazard:* ${catTitle}\n` +
          `⚠️ *Severity:* *${aiResult.severity_level.toUpperCase()}* (Visual: ${aiResult.visual_severity})\n` +
          `🎯 *Triage Priority:* *${finalPriority}* (${linkResult?.updated_risk_score ?? riskResult.risk_score}/100)\n` +
          `📍 *Location:* ${lat.toFixed(5)}, ${lng.toFixed(5)}\n` +
          `📊 *Status:* *REPORTED* (Queued for inspection)\n` +
          `⏱️ *Response SLA:* Within ${slaDeadlines.response_hours}h` +
          clusterNotice +
          `\n\nYou can track the progress of this report at any time by sending:\n` +
          `\`/status ${ticketId}\`\n\n` +
          `Thank you for contributing to safer roads! 🛣️`;
      } else if (aiResult && aiResult.hazard_type === "unrelated_or_uncertain") {
        confirmationMsg =
          `⚠️ *Report Logged (Manual Review Required)*\n\n` +
          `🎫 *Ticket ID:* \`${ticketId}\`\n` +
          `📍 *Location:* ${lat.toFixed(5)}, ${lng.toFixed(5)}\n` +
          `📂 *Assessment:* Image features unclear or unrelated\n` +
          `📊 *Status:* *PENDING MANUAL REVIEW*\n` +
          clusterNotice +
          `\n\nOur automated check could not confirm a standard road hazard from this photo. Your report has been preserved and queued for manual inspection by our road safety officer.\n\n` +
          `Track progress anytime by sending:\n` +
          `\`/status ${ticketId}\``;
      } else {
        confirmationMsg =
          `✅ *Road Hazard Reported Successfully!*\n\n` +
          `🎫 *Ticket ID:* \`${ticketId}\`\n` +
          `📍 *Location:* ${lat.toFixed(5)}, ${lng.toFixed(5)}\n` +
          `📂 *Category:* Unclassified hazard pending review\n` +
          `📊 *Status:* *REPORTED* (Queued for inspection)\n` +
          clusterNotice +
          `\n\nYou can track the progress of this report at any time by sending:\n` +
          `\`/status ${ticketId}\`\n\n` +
          `Thank you for contributing to safer roads! 🛣️`;
      }

      await sendTelegramMessage(chatId, confirmationMsg, {
        reply_markup: { remove_keyboard: true }
      });

      return {
        status: "report_created",
        ticket_id: ticketId,
        hazard_id: hazardDocRef.id,
        ai_classified: Boolean(aiResult && aiResult.analysis_status === "completed"),
        risk_score: linkResult?.updated_risk_score ?? (riskResult?.risk_score ?? null),
        cluster_id: linkResult?.cluster_id || null,
        is_duplicate: Boolean(linkResult?.linked && !linkResult.alreadyLinked),
      };
    }

    // If citizen sends another photo while awaiting location, update the photo
    if (message.photo && Array.isArray(message.photo) && message.photo.length > 0) {
      const largestPhoto = message.photo[message.photo.length - 1];
      const fileId = largestPhoto.file_id;
      const fileUrl = await getTelegramFileUrl(fileId);

      await sessionRef.update({
        file_id: fileId,
        photo_url: fileUrl || session.photo_url || null,
        updated_at: new Date().toISOString(),
      });

      await sendTelegramMessage(chatId,
        `🔄 *Photo updated!* Now please share your GPS location using the button below or via 📎 → Location.\n` +
        `Send /cancel to abort.`,
        {
          reply_markup: {
            keyboard: [[{ text: "📍 Share Current Location Pin", request_location: true }]],
            resize_keyboard: true,
            one_time_keyboard: true
          }
        }
      );
      return { status: "photo_updated_awaiting_location" };
    }

    // Citizen sent text or other data instead of location
    await sendTelegramMessage(chatId,
      `📍 Please tap the *Share Location* button below or use Telegram's attachment clip (📎 → Location).\n\n` +
      `To abort this report, send /cancel.`,
      {
        reply_markup: {
          keyboard: [[{ text: "📍 Share Current Location Pin", request_location: true }]],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      }
    );
    return { status: "awaiting_location_retry" };
  }

  return { status: "unhandled" };
}

// ── Webhook Handler Middleware ───────────────────────────────────────────────
async function handleTelegramWebhook(req, res, dbOverride) {
  const db = dbOverride || admin.firestore();

  // 1. Webhook Secret Token Verification (X-Telegram-Bot-Api-Secret-Token)
  const webhookSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim().replace(/^["']|["']$/g, "");
  if (webhookSecret) {
    const incomingSecret = (req.headers["x-telegram-bot-api-secret-token"] || "").trim().replace(/^["']|["']$/g, "");
    if (incomingSecret !== webhookSecret) {
      console.warn("[Telegram Webhook] Unauthorized request rejected: secret token mismatch.");
      return res.status(403).json({ ok: false, error: "Unauthorized" });
    }
  }

  const update = req.body;
  if (!update || typeof update !== "object") {
    return res.status(200).json({ ok: true, ignored: "empty_body" });
  }

  // 2. Idempotency Check (Deduplicate repeated updates)
  if (update.update_id && isDuplicateUpdate(update.update_id)) {
    console.log(`[Telegram Webhook] Duplicate update_id ${update.update_id} ignored.`);
    return res.status(200).json({ ok: true, duplicate: true });
  }

  const message = update.message || update.edited_message;
  if (!message || !message.chat?.id) {
    return res.status(200).json({ ok: true, ignored: "non_message_update" });
  }

  try {
    const result = await processTelegramMessage(message, db);
    return res.status(200).json({ ok: true, result });
  } catch (err) {
    console.error("[Telegram Webhook] Processing error:", err.message);
    console.error(err.stack);
    // Return 200 to Telegram to prevent repeated retries on unrecoverable runtime errors
    return res.status(200).json({ ok: false, error: "Internal processing error" });
  }
}

// ── Protected Webhook Registration Endpoint ──────────────────────────────────
async function setTelegramWebhookHandler(req, res) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim().replace(/^["']|["']$/g, "").replace(/^bot/, "");
  if (!token) {
    return res.status(400).json({ ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" });
  }

  // Admin secret protection for webhook setup (supports ADMIN_SECRET or legacy TELEGRAM_WEBHOOK_ADMIN_SECRET)
  const adminSecret = (process.env.ADMIN_SECRET || process.env.TELEGRAM_WEBHOOK_ADMIN_SECRET || "").trim().replace(/^["']|["']$/g, "");
  if (adminSecret) {
    const provided = (req.headers["x-admin-secret"] || req.query.admin_secret || "").trim().replace(/^["']|["']$/g, "");
    if (provided !== adminSecret) {
      return res.status(403).json({ ok: false, error: "Unauthorized: admin secret required" });
    }
  }

  const webhookBaseUrl = req.body?.url || req.query?.url || process.env.TELEGRAM_WEBHOOK_BASE_URL || "https://nagarnetra-74tc.onrender.com";
  const webhookUrl = `${webhookBaseUrl.replace(/\/$/, "")}/webhook/telegram`;

  const webhookParams = {
    url: webhookUrl,
  };

  const webhookSecret = (process.env.TELEGRAM_WEBHOOK_SECRET || "").trim().replace(/^["']|["']$/g, "");
  if (webhookSecret) {
    webhookParams.secret_token = webhookSecret;
  }

  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(webhookParams),
    });
    const tgData = await tgRes.json().catch(() => ({}));
    return res.status(tgRes.status).json({
      ok: tgData.ok || false,
      telegramResponse: tgData,
      registeredUrl: webhookUrl,
      secretConfigured: Boolean(webhookSecret),
    });
  } catch (err) {
    console.error("[Telegram Set-Webhook] Network error:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
}

module.exports = {
  handleTelegramWebhook,
  setTelegramWebhookHandler,
  processTelegramMessage,
  generateHazardTicketId,
  sendTelegramMessage,
  escapeMarkdown,
  getTelegramFileUrl,
  isDuplicateUpdate,
  SUPPORTED_CATEGORIES,
};
