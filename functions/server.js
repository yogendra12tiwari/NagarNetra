const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const twilio = require("twilio");
const admin = require("firebase-admin");
const { GoogleGenAI } = require("@google/genai");
const translations = require("./translations");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://nagarnetra-4a55d.web.app",
  "https://nagarnetra-4a55d.firebaseapp.com",
  "https://swachhos101.web.app",
  "https://swachhos101.firebaseapp.com",
  "https://swachhos-admin.web.app",
  "https://swachhos-public.web.app"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

app.options("*", cors());

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Initialize Firebase Admin SDK for Render
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const sa = JSON.parse(
        process.env.FIREBASE_SERVICE_ACCOUNT_KEY.startsWith("{")
          ? process.env.FIREBASE_SERVICE_ACCOUNT_KEY
          : Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_KEY, "base64").toString("utf-8")
      );
      admin.initializeApp({
        credential: admin.credential.cert(sa),
        projectId: process.env.FIREBASE_PROJECT_ID || "nagarnetra-4a55d"
      });
    } catch (e) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY, using default admin init:", e.message);
      admin.initializeApp({
        projectId: process.env.FIREBASE_PROJECT_ID || "nagarnetra-4a55d"
      });
    }
  } else {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || "nagarnetra-4a55d"
    });
  }
}

const db = admin.firestore();
const MessagingResponse = twilio.twiml.MessagingResponse;

// Helpers
function getTwilioClient() {
  const sid = (process.env.TWILIO_ACCOUNT_SID || "").trim();
  const token = (process.env.TWILIO_AUTH_TOKEN || "").trim();
  return twilio(sid, token);
}

function getFromNumber() {
  let fromNum = (process.env.TWILIO_WHATSAPP_FROM || "whatsapp:+14155238886").trim();
  if (!fromNum.startsWith("whatsapp:")) fromNum = "whatsapp:" + fromNum;
  return fromNum;
}

async function generateReportId() {
  const counterRef = db.collection("meta").doc("reportCounter");
  const result = await db.runTransaction(async (t) => {
    const doc = await t.get(counterRef);
    let current = doc.exists ? doc.data().count : 0;
    
    // Ensure counter starts above mock data limit
    if (current < 35) {
      current = 35;
    }
    
    const next = current + 1;
    t.set(counterRef, { count: next }, { merge: true });
    return next;
  });
  return `SWC-${String(result).padStart(4, "0")}`;
}

async function generateCommunityId() {
  const counterRef = db.collection("meta").doc("communityCounter");
  const result = await db.runTransaction(async (t) => {
    const doc = await t.get(counterRef);
    let current = doc.exists ? doc.data().count : 0;
    
    if (current < 100) {
      current = 100;
    }
    
    const next = current + 1;
    t.set(counterRef, { count: next }, { merge: true });
    return next;
  });
  return `COM-${String(result).padStart(4, "0")}`;
}

async function sendWhatsApp(to, body, options = {}) {
  const params = {
    from: getFromNumber(),
    to,
  };

  if (options.contentSid) {
    params.contentSid = options.contentSid;
    if (options.contentVariables) {
      params.contentVariables = typeof options.contentVariables === "string"
        ? options.contentVariables
        : JSON.stringify(options.contentVariables);
    }
  } else {
    params.body = body;
  }

  return getTwilioClient().messages.create(params);
}

// Telegram Helper: Send Message via Telegram Bot API
async function sendTelegramMessage(chatId, text, options = {}) {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!token) {
    console.warn("[Telegram] TELEGRAM_BOT_TOKEN not configured; cannot send message.");
    return { success: false, error: "TELEGRAM_BOT_TOKEN not configured" };
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body = {
    chat_id: chatId,
    text: String(text),
  };

  if (options.reply_markup) {
    body.reply_markup = options.reply_markup;
  }

  console.log(`[Telegram] Sending reply to Chat ID: ${chatId}`);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) {
      console.error("[Telegram] API error:", {
        status: response.status,
        description: data.description || "Unknown Telegram error",
        chatId,
      });
      return { success: false, error: data.description || "Telegram API error" };
    }

    console.log(`[Telegram] Reply sent to Chat ID: ${chatId} | HTTP: ${response.status} | message_id: ${data.result?.message_id}`);
    return { success: true, message_id: data.result?.message_id };
  } catch (err) {
    console.error("[Telegram] Network error sending message:", {
      message: err.message || "Network error",
      chatId,
    });
    return { success: false, error: err.message };
  }
}

// Telegram Helper: Retrieve downloadable URL for a photo file_id
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

async function sendNagarNetraReply(to, text, options = {}) {
  if (to.startsWith("telegram:")) {
    const chatId = to.replace("telegram:", "");
    return sendTelegramMessage(chatId, text, options);
  }

  const mode = (process.env.WHATSAPP_MODE || "trial").toLowerCase().trim();

  if (mode === "trial") {
    // In trial mode: DO NOT send arbitrary dynamic text through Appointment Reminders ContentSid.
    // Log dynamic reply clearly to Render application logs for evaluation and testing.
    console.log(`[NagarNetra Reply][TRIAL MODE]\nTo: ${to}\nMessage: ${text}`);

    if (options.useTrialContentSid && options.trialContentSid) {
      try {
        await sendWhatsApp(to, null, {
          contentSid: options.trialContentSid,
          contentVariables: options.contentVariables || {}
        });
      } catch (err) {
        console.error("[Twilio] Outbound trial template error:", {
          code: err.code || "N/A",
          message: err.message || "Unknown error",
          to
        });
      }
    }
    return { success: true, mode: "trial" };
  }

  // Production mode:
  try {
    const contentSid = options.contentSid || (process.env.TWILIO_CONTENT_SID || "").trim();
    if (contentSid) {
      const contentVariables = options.contentVariables || { "1": text };
      const msg = await sendWhatsApp(to, null, {
        contentSid,
        contentVariables
      });
      return { success: true, sid: msg.sid };
    } else {
      const msg = await sendWhatsApp(to, text);
      return { success: true, sid: msg.sid };
    }
  } catch (err) {
    console.error("[Twilio] Outbound reply error:", {
      code: err.code || "N/A",
      message: err.message || "Unknown error",
      to
    });
    return { success: false, error: err.message };
  }
}

// Geo-Fencing
const LUCKNOW_BOUNDS = { minLat: 26.70, maxLat: 27.00, minLng: 80.80, maxLng: 81.10 };
function isWithinLucknow(lat, lng) {
  return lat >= LUCKNOW_BOUNDS.minLat && lat <= LUCKNOW_BOUNDS.maxLat &&
         lng >= LUCKNOW_BOUNDS.minLng && lng <= LUCKNOW_BOUNDS.maxLng;
}

// Haversine Distance
function getDistanceFromLatLonInM(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const dLat = (lat2-lat1) * (Math.PI/180);
  const dLon = (lon2-lon1) * (Math.PI/180);
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// AI RAG Assistant over WhatsApp & Web
async function askNagarNetra_AI(query, activePoints = [], chatHistory = []) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return "AI service is currently unavailable.";
  
  const ai = new GoogleGenAI({ apiKey });
  
  const safePoints = (Array.isArray(activePoints) ? activePoints : []).map(p => ({ 
    id: p.report_id || p.community_id || p.id || "N/A", 
    name: p.name || "Dump Point", 
    reports: p.report_count || 1, 
    status: p.status || "active", 
    severity: (p.report_count || 1) >= 7 ? 'High' : 'Normal' 
  }));

  const staticContext = `
    You are the NagarNetra Public Information AI, answering citizens about Lucknow sanitation and civic cleanliness.
    
    STRICT GUARDRAILS:
    1. You must ONLY answer questions related to:
       - Lucknow Municipal Corporation (LMC) or Nagar Nigam.
       - Waste management, sanitation, cleanliness, and garbage collection.
       - Ward details, corporators (ward members), and departmental jurisdictions in Lucknow district (including nearby villages/areas like Anora Kala).
       - The live active hotspots / reports provided in the context below.
    2. Use your internal geographic knowledge to recognize local areas, villages, and neighborhoods in and around Lucknow. If a user asks about an area, ASSUME it is in Lucknow. Do NOT claim an area is outside Lucknow unless it is obviously a major different city.
    3. If a user asks about ANY other topic, you MUST politely decline and state that you can only assist with Lucknow cleanliness and civic issues.

    Lucknow Municipal Corporation (LMC) Official Knowledge Base:
    - Total Wards: 110 Wards.
    - Official Toll-Free Control Room for sanitation complaints: 1533
    - WhatsApp complaint numbers: 9219902911, 9219902912, 9219902913, 9219902914
    - Mayor's Helpline: 6389200005

    Ward Corporator Details (Mock Data):
    - Gomti Nagar Ward: Corporator - Mrs. Sunita Singh, Phone - 9876543210
    - Anora Kala Ward: Corporator - Mr. Ramesh Yadav, Phone - 9876543211
    - Hazratganj Ward: Corporator - Mr. Anil Sharma, Phone - 9876543212
    - Aminabad Ward: Corporator - Mrs. Poonam Gupta, Phone - 9876543213
    - Chowk Ward: Corporator - Mr. Tariq Ansari, Phone - 9876543214

    Current Live Active Points (Hotspots) Context:
    ${JSON.stringify(safePoints)}

    Instructions:
    - Provide helpful, well-explained responses with clear formatting and bullet points where helpful.
    - If the user provides a complaint number (e.g., SWC-0001, NGN-0001), look it up in the context provided.
    - If the user asks about an area not in the "Current Live Active Points" list, politely inform them that there are no active reported hotspots there.
  `;

  try {
    const contents = [
      { role: 'user', parts: [{ text: staticContext }] },
      { role: 'model', parts: [{ text: "Understood. I am ready to assist citizens." }] }
    ];

    if (Array.isArray(chatHistory)) {
      for (const msg of chatHistory) {
        if (msg && msg.text) {
          contents.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: String(msg.text) }]
          });
        }
      }
    }

    console.log("[AI] Invoking Gemini model: gemini-3.6-flash");
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents
    });
    return response.text;
  } catch (error) {
    console.error("AI Error:", error.message || error);
    console.error(error?.stack);
    return "Sorry, I am having trouble understanding right now. Please try again later.";
  }
}

// AI Spam Filter & Duplicate Image Detector
async function checkIsGarbage(mediaUrl) {
  let isGarbage = true;
  let hash = null;
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey });
      const twilioSid = (process.env.TWILIO_ACCOUNT_SID || "").trim();
      const twilioToken = (process.env.TWILIO_AUTH_TOKEN || "").trim();
      const twilioAuth = Buffer.from(twilioSid + ":" + twilioToken).toString("base64");
      const imgRes = await fetch(mediaUrl, { headers: { Authorization: `Basic ${twilioAuth}` } });
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Hash image binary to detect exact duplicates
        hash = crypto.createHash("sha256").update(buffer).digest("hex");
        const hashDoc = await db.collection("photo_hashes").doc(hash).get();
        
        if (hashDoc.exists) {
          return { isGarbage: false, isDuplicate: true };
        }

        const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [
            "Does this image clearly contain a garbage dump, litter, or scattered waste? Answer only YES or NO.",
            { inlineData: { data: buffer.toString("base64"), mimeType } }
          ]
        });
        
        const answer = response.text.trim().toUpperCase();
        if (answer.includes("NO") && !answer.includes("YES")) {
          isGarbage = false;
        } else {
          // Valid garbage photo: save hash to prevent future duplicates
          await db.collection("photo_hashes").doc(hash).set({
            timestamp: new Date().toISOString()
          });
        }
      }
    }
  } catch (aiError) {
    console.error("AI Filtering error:", aiError);
  }
  return { isGarbage, isDuplicate: false };
}

// GET /health Probe Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "NagarNetra Backend"
  });
});

// Twilio Signature Verification & Inbound Webhook Handler
async function handleTwilioWebhook(req, res) {
  console.log("[Twilio] Incoming webhook received", {
    method: req.method,
    path: req.originalUrl || req.path,
    from: req.body?.From || "N/A",
    to: req.body?.To || "N/A",
    body: req.body?.Body !== undefined ? req.body.Body : "N/A",
    messageSid: req.body?.MessageSid || "N/A"
  });

  const twilioAuthToken = (process.env.TWILIO_AUTH_TOKEN || "").trim();
  const twilioSignature = req.headers["x-twilio-signature"];
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const url = process.env.TWILIO_WEBHOOK_URL || `${protocol}://${req.headers.host}${req.originalUrl}`;
  
  console.log("[Twilio] Validating signature");
  if (twilioSignature && twilioAuthToken) {
    let isValid = twilio.validateRequest(twilioAuthToken, twilioSignature, url, req.body);
    if (!isValid) {
      const altUrl = url.endsWith('/') ? url.slice(0, -1) : url + '/';
      isValid = twilio.validateRequest(twilioAuthToken, twilioSignature, altUrl, req.body);
    }
    if (!isValid) {
      console.warn("[Twilio] Signature validation failed");
      console.warn("Invalid Twilio signature received.");
    } else {
      console.log("[Twilio] Signature validation passed");
    }
  } else {
    console.warn("[Twilio] Signature validation failed (missing token or signature header)");
  }

  console.log("[Twilio] Calling webhook handler");

  await executeNagarNetraConversation(req.body || {});

  console.log("[Twilio] Webhook handler completed");
  res.set("Content-Type", "text/xml");
  res.status(200).send("<Response></Response>");
}

// Shared Core Conversation Engine for WhatsApp & Telegram
async function executeNagarNetraConversation(payload) {
  const fromNumber = payload.From || "";
  const rawBody = payload.Body || "";
  const incomingMsg = rawBody.toLowerCase().trim();
  const mediaUrl = payload.MediaUrl0;
  const lat = payload.Latitude ? parseFloat(payload.Latitude) : null;
  const lng = payload.Longitude ? parseFloat(payload.Longitude) : null;

  const isTelegram = fromNumber.startsWith("telegram:");
  const sessionCollection = isTelegram ? "telegram_sessions" : "whatsapp_sessions";
  const sessionDocId = isTelegram ? fromNumber.replace("telegram:", "") : fromNumber;
  const sessionRef = db.collection(sessionCollection).doc(sessionDocId);

  console.log(`[Conversation] Destination: ${fromNumber} | Channel: ${isTelegram ? "Telegram" : "WhatsApp"}`);
  console.log(`[Conversation] Session document path: ${sessionCollection}/${sessionDocId}`);
  console.log(`[Conversation] Normalized message text: "${incomingMsg}"`);

  const twiml = new MessagingResponse();
  // Reply collector: intercepts all existing twiml.message() calls without modifying conversation branches
  const outboundReplies = [];
  twiml.message = function (text) {
    if (text) {
      outboundReplies.push(String(text));
    }
  };

  async function flushOutboundReplies() {
    for (const reply of outboundReplies) {
      console.log(`[Conversation] Final response text (${reply.length} chars): "${reply.slice(0, 100).replace(/\n/g, ' ')}..."`);
      await sendNagarNetraReply(fromNumber, reply);
    }
    outboundReplies.length = 0; // Prevent duplicate sending
  }

  try {
    // 1. DETERMINISTIC GREETING HANDLING (Bypasses AI/RAG and any previous stuck state)
    const isGreeting = ["hey", "hi", "hello", "start", "/start", "namaste", "restart"].includes(incomingMsg);
    if (isGreeting) {
      console.log(`[Conversation] Detected intent: GREETING ("${rawBody}"). Deterministic welcome flow triggered. AI bypassed.`);
      await sessionRef.set({ step: "awaiting_language", phone: fromNumber });
      twiml.message("Please choose your language / कृपया अपनी भाषा चुनें:\n1️⃣ English\n2️⃣ हिंदी (Hindi)");
      await flushOutboundReplies();
      return;
    }

    // 2. DETERMINISTIC RESET HANDLING
    if (incomingMsg === "reset" || incomingMsg === "cancel") {
      console.log(`[Conversation] Detected intent: RESET ("${rawBody}"). Session document cleared.`);
      await sessionRef.delete();
      twiml.message("Session reset. Send 'hey' to start again.");
      await flushOutboundReplies();
      return;
    }

    // 3. FIRESTORE SESSION LOOKUP
    let sessionDoc;
    try {
      sessionDoc = await sessionRef.get();
      console.log(`[Conversation] Firestore read succeeded. Session exists: ${sessionDoc.exists}`);
    } catch (readErr) {
      console.error("[Conversation] Firestore session read failed:", readErr.message);
      throw readErr;
    }

    let sessionData = sessionDoc.exists ? sessionDoc.data() : { step: "start" };
    console.log(`[Conversation] Current session state: "${sessionData.step}"`);

    const lang = sessionData.language || "en";
    const t = translations[lang] || translations.en;

    if (sessionData.step === "start") {
      console.log("[Conversation] Step is start. Prompting user to send 'hey'.");
      twiml.message("Welcome to NagarNetra! Reply with 'hey' to get started.");
    }
    
    else if (sessionData.step === "awaiting_language") {
      let chosenLang = "en";
      if (incomingMsg === "2") chosenLang = "hi";
      
      await sessionRef.update({ step: "awaiting_choice", language: chosenLang });
      twiml.message(translations[chosenLang].welcome_msg);
    }

    else if (sessionData.step === "awaiting_choice") {
      if (incomingMsg === "1") {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const recentReportsSnap = await db.collection("reports").where("phone_number", "==", fromNumber.replace("whatsapp:", "")).get();
        
        let recentCount = 0;
        recentReportsSnap.forEach(doc => {
          if (doc.data().timestamp && doc.data().timestamp >= oneDayAgo) recentCount++;
        });

        if (recentCount >= 1000) {
          twiml.message(t.rate_limit);
        } else {
          await sessionRef.update({ step: "awaiting_photo" });
          twiml.message(t.request_photo);
        }
      } else if (incomingMsg === "2") {
        await sessionRef.update({ step: "awaiting_tracking_code" });
        twiml.message(t.request_tracking_id);
      } else if (incomingMsg === "3") {
        await sessionRef.update({ step: "awaiting_ai_query" });
        twiml.message(t.ai_welcome);
      } else {
        twiml.message(t.invalid_choice);
      }
    }

    else if (sessionData.step === "awaiting_ai_query") {
      if (["menu", "exit", "quit", "back"].includes(incomingMsg)) {
        await sessionRef.delete();
        twiml.message(t.ai_menu_returned);
      } else {
        const activePointsSnap = await db.collection("dumpPoints").where("status", "==", "active").get();
        const activePoints = [];
        activePointsSnap.forEach(doc => activePoints.push(doc.data()));
        
        const reply = await askNagarNetra_AI(rawBody, activePoints);
        twiml.message(reply);
      }
    }

    else if (sessionData.step === "awaiting_tracking_code") {
      const code = rawBody ? rawBody.toUpperCase().trim() : "";
      if (/^(NGN|SWC)-\d{4}$/.test(code)) {
        const snapshot = await db.collection("dumpPoints").where("report_id", "==", code).limit(1).get();
        if (snapshot.empty) {
          twiml.message(t.report_not_found.replace("{code}", code));
        } else {
          const point = snapshot.docs[0].data();
          let statusMsg = "";
          switch (point.status) {
            case "active":
              statusMsg = t.status_active.replace("{code}", code).replace("{name}", point.name).replace("{count}", point.report_count).replace("{date}", point.last_reported);
              break;
            case "resolved":
              statusMsg = t.status_resolved.replace("{code}", code).replace("{name}", point.name).replace("{date}", point.resolved_at || "Recently");
              break;
            case "unmanaged":
              statusMsg = t.status_unmanaged.replace("{code}", code).replace("{name}", point.name).replace("{reason}", point.unmanaged_reason || "Low satisfaction score");
              break;
            default:
              statusMsg = t.status_unknown.replace("{code}", code).replace("{status}", point.status);
          }
          twiml.message(statusMsg);
        }
        await sessionRef.delete();
      } else {
        twiml.message(t.invalid_tracking_id);
      }
    }

    else if (sessionData.step === "awaiting_photo") {
      if (mediaUrl) {
        const result = await checkIsGarbage(mediaUrl);
        if (result.isDuplicate) {
          twiml.message(t.duplicate_photo);
        } else if (result.isGarbage) {
          await sessionRef.update({ step: "awaiting_location", photoUrl: mediaUrl });
          twiml.message(t.photo_received);
        } else {
          twiml.message(t.ai_spam_alert);
        }
      } else if (incomingMsg === "skip") {
        await sessionRef.update({ step: "awaiting_location" });
        twiml.message(t.photo_skipped);
      } else {
        twiml.message(t.no_photo);
      }
    }

    else if (sessionData.step === "awaiting_location") {
      if (lat && lng) {
        if (!isWithinLucknow(lat, lng)) {
          twiml.message(t.location_outside_bounds);
          await flushOutboundReplies();
          return;
        }

        const timestamp = new Date().toISOString();
        
        // 50m Spatial Clustering
        const activePointsSnap = await db.collection("dumpPoints").where("status", "==", "active").get();
        let matchedPoint = null;
        let minDistance = Infinity;
        
        activePointsSnap.forEach(doc => {
          const data = doc.data();
          if (data.lat && data.lng) {
            const d = getDistanceFromLatLonInM(lat, lng, data.lat, data.lng);
            if (d <= 50 && d < minDistance) {
              minDistance = d;
              matchedPoint = { id: doc.id, ...data };
            }
          }
        });

        const reportId = await generateReportId();

        if (matchedPoint) {
          // Merge with existing dumpPoint
          const updatedPhotos = sessionData.photoUrl ? [...(matchedPoint.photos || []), sessionData.photoUrl] : matchedPoint.photos;
          const phoneClean = fromNumber.replace("whatsapp:", "").replace("telegram:", "TG-");
          await db.collection("dumpPoints").doc(matchedPoint.id).update({
            report_count: (matchedPoint.report_count || 1) + 1,
            last_reported: timestamp,
            photos: updatedPhotos,
            latest_report_id: reportId,
            latest_phone: phoneClean,
            latest_photo: sessionData.photoUrl || null,
            recent_reports: admin.firestore.FieldValue.arrayUnion({
              report_id: reportId,
              timestamp,
              photo_url: sessionData.photoUrl || null,
              phone_number: phoneClean,
              classification: "merged_point",
            })
          });
          await db.collection("reports").add({
            phone_number: fromNumber.replace("whatsapp:", ""),
            timestamp,
            matched_point_id: matchedPoint.id,
            classification: "merged_point",
            photo_url: sessionData.photoUrl || null,
            matched_point_name: matchedPoint.name,
            report_id: reportId,
          });
          const communityId = matchedPoint.community_id || matchedPoint.report_id || "COM-0000";
          const msg = t.report_merged.replace(/{reportId}/g, reportId).replace(/{communityId}/g, communityId);
          twiml.message(msg);
        } else {
          // Create New dumpPoint
          const communityId = await generateCommunityId();
          const phoneClean = fromNumber.replace("whatsapp:", "").replace("telegram:", "TG-");
          const newPointRef = await db.collection("dumpPoints").add({
            community_id: communityId,
            report_id: reportId,
            latest_report_id: reportId,
            latest_phone: phoneClean,
            latest_photo: sessionData.photoUrl || null,
            name: "User Reported Dump Point",
            lat,
            lng,
            report_count: 1,
            first_reported: timestamp,
            last_reported: timestamp,
            photos: sessionData.photoUrl ? [sessionData.photoUrl] : [],
            status: "active",
            recent_reports: [{
              report_id: reportId,
              timestamp,
              photo_url: sessionData.photoUrl || null,
              phone_number: phoneClean,
              classification: "new_point",
            }]
          });
          await db.collection("reports").add({
            phone_number: fromNumber.replace("whatsapp:", ""),
            timestamp,
            matched_point_id: newPointRef.id,
            classification: "new_point",
            photo_url: sessionData.photoUrl || null,
            matched_point_name: "User Reported Dump Point",
            report_id: reportId,
          });
          const msg = t.report_success.replace(/{reportId}/g, reportId).replace(/{communityId}/g, communityId);
          twiml.message(msg);
        }
        await sessionRef.delete();
      } else {
        twiml.message(t.request_location_pin);
      }
    }

    else if (sessionData.step === "awaiting_rating") {
      const rating = parseInt(incomingMsg, 10);
      if (rating >= 1 && rating <= 5) {
        if (rating <= 2) {
          await sessionRef.update({ step: "awaiting_rating_proof", rating });
          twiml.message(t.feedback_proof_request.replace("{rating}", rating));
        } else {
          await db.collection("feedback").add({
            phone_number: fromNumber.replace("whatsapp:", ""),
            report_id: sessionData.reportId,
            point_id: sessionData.pointId,
            rating,
            timestamp: new Date().toISOString(),
          });
          await sessionRef.delete();
          twiml.message(t.feedback_success.replace("{rating}", rating));
        }
      } else {
        twiml.message(t.feedback_invalid);
      }
    }
    
    else if (sessionData.step === "awaiting_rating_proof") {
      if (mediaUrl) {
        const result = await checkIsGarbage(mediaUrl);
        if (result.isDuplicate) {
          twiml.message(t.duplicate_photo);
        } else if (result.isGarbage) {
          await db.collection("feedback").add({
            phone_number: fromNumber.replace("whatsapp:", ""),
            report_id: sessionData.reportId,
            point_id: sessionData.pointId,
            rating: sessionData.rating,
            proofUrl: mediaUrl,
            timestamp: new Date().toISOString(),
          });
          await db.collection("dumpPoints").doc(sessionData.pointId).update({
            status: "unmanaged",
            unmanaged_reason: "User provided proof that cleanup failed.",
            photos: admin.firestore.FieldValue.arrayUnion(mediaUrl)
          });
          await sessionRef.delete();
          twiml.message(t.feedback_proof_received);
        } else {
          twiml.message(t.ai_spam_alert);
        }
      } else if (incomingMsg === "skip") {
        await db.collection("feedback").add({
          phone_number: fromNumber.replace("whatsapp:", ""),
          report_id: sessionData.reportId,
          point_id: sessionData.pointId,
          rating: sessionData.rating,
          timestamp: new Date().toISOString(),
        });
        await sessionRef.delete();
        twiml.message("Feedback recorded without proof. We will keep an eye on it. Thank you.");
      } else {
        twiml.message("Please send a photo of the remaining garbage, or reply *skip*.");
      }
    }

  } catch (error) {
    console.error("[Conversation] Error processing message:", error?.message || error);
    console.error("[Conversation] Error stack:", error?.stack);
    twiml.message("Sorry, something went wrong on our end. Please try again later.");
  }

  await flushOutboundReplies();
}

// Telegram Inbound Webhook Handler
async function handleTelegramWebhook(req, res) {
  const update = req.body;
  if (!update) {
    return res.status(200).json({ ok: true });
  }

  const message = update.message || update.edited_message;
  if (!message) {
    return res.status(200).json({ ok: true });
  }

  const chatId = message.chat?.id;
  if (!chatId) {
    return res.status(200).json({ ok: true });
  }

  console.log("[Telegram] Incoming message received");
  console.log(`[Telegram] Chat ID: ${chatId}`);

  let mediaUrl = null;
  if (message.photo && message.photo.length > 0) {
    const largestPhoto = message.photo[message.photo.length - 1];
    mediaUrl = await getTelegramFileUrl(largestPhoto.file_id);
  }

  const normalizedPayload = {
    From: `telegram:${chatId}`,
    Body: message.text || message.caption || "",
    NumMedia: mediaUrl ? "1" : "0",
    MediaUrl0: mediaUrl,
    Latitude: message.location ? message.location.latitude : null,
    Longitude: message.location ? message.location.longitude : null,
  };

  console.log(`[Telegram] Body: "${normalizedPayload.Body}"`);
  console.log("[Telegram] Processing started");

  try {
    await executeNagarNetraConversation(normalizedPayload);
    console.log("[Telegram] Processing completed");
  } catch (err) {
    console.error("[Telegram] Conversation error:", err?.message || err);
    console.error("[Telegram] Conversation stack:", err?.stack);
  }

  return res.status(200).json({ ok: true });
}

app.post("/webhook/twilio", handleTwilioWebhook);
app.post("/twilioWebhook", handleTwilioWebhook);
app.post("/webhook/telegram", handleTelegramWebhook);

// Telegram Health Probe Endpoint
app.get("/telegram/health", (req, res) => {
  const isConfigured = Boolean((process.env.TELEGRAM_BOT_TOKEN || "").trim());
  res.status(200).json({
    ok: true,
    service: "NagarNetra Telegram Integration",
    telegramConfigured: isConfigured,
  });
});

// Telegram Webhook Registration Helper
app.all("/api/telegram/set-webhook", async (req, res) => {
  const token = (process.env.TELEGRAM_BOT_TOKEN || "").trim();
  if (!token) {
    return res.status(400).json({ ok: false, error: "TELEGRAM_BOT_TOKEN is not configured" });
  }

  const webhookUrl = "https://nagarnetra-74tc.onrender.com/webhook/telegram";
  try {
    const tgRes = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const tgData = await tgRes.json().catch(() => ({}));
    return res.status(tgRes.status).json({
      ok: tgData.ok || false,
      telegramResponse: tgData,
      registeredUrl: webhookUrl,
    });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// AI RAG Chat Endpoint for Web Dashboard
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { query, chatHistory, points } = req.body || {};
    if (!query || typeof query !== "string" || !query.trim()) {
      return res.status(400).json({ ok: false, error: "Query is required" });
    }

    let activePoints = Array.isArray(points) && points.length > 0 ? points : [];
    if (activePoints.length === 0) {
      try {
        const snap = await db.collection("dumpPoints").where("status", "==", "active").limit(50).get();
        snap.forEach(doc => activePoints.push({ id: doc.id, ...doc.data() }));
      } catch (dbErr) {
        console.warn("[AI Chat] Could not fetch live dumpPoints from Firestore:", dbErr.message);
      }
    }

    const text = await askNagarNetra_AI(query.trim(), activePoints, chatHistory);
    return res.status(200).json({ ok: true, text });
  } catch (err) {
    console.error("[AI Chat] Error processing chat request:", err.message);
    return res.status(500).json({
      ok: false,
      error: "Internal Server Error",
      text: "I'm sorry, I encountered an error while processing your request. Please try again later."
    });
  }
});

// Live Reports Endpoint for Dashboard (Bypasses browser auth restrictions via Admin SDK)
app.get("/api/reports", async (req, res) => {
  try {
    const snapshot = await db.collection("reports").orderBy("timestamp", "desc").limit(100).get();
    const reports = [];
    snapshot.forEach(doc => {
      reports.push({ id: doc.id, ...doc.data() });
    });
    return res.status(200).json({ ok: true, count: reports.length, reports });
  } catch (err) {
    console.error("[API Reports] Error fetching reports:", err.message);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// Feedback Survey Dispatcher Endpoint
async function handleSendFeedbackSurvey(req, res) {
  try {
    const { pointId, reportId, pointName, phoneNumbers } = req.body;
    if (!pointId || !phoneNumbers?.length) return res.status(400).json({ error: "pointId and phoneNumbers required" });

    const results = await Promise.allSettled(
      phoneNumbers.map(async (phone) => {
        const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
        const sessionSnap = await db.collection("whatsapp_sessions").doc(to).get();
        const lang = sessionSnap.exists ? (sessionSnap.data().language || "en") : "en";
        
        await db.collection("whatsapp_sessions").doc(to).set({
          step: "awaiting_rating",
          phone: to,
          pointId,
          reportId,
          pointName,
          language: lang
        });

        try {
          const msg = await sendWhatsApp(
            to,
            translations[lang].feedback_request.replace("{reportId}", reportId).replace("{name}", pointName)
          );
          return { success: true, sid: msg.sid };
        } catch (twilioErr) {
          return Promise.reject(twilioErr.message || twilioErr);
        }
      })
    );

    res.status(200).json({
      sent: results.filter((r) => r.status === "fulfilled").length,
      total: phoneNumbers.length,
      errors: results.filter((r) => r.status === "rejected").map((r) => r.reason),
    });
  } catch (err) {
    console.error("sendFeedbackSurvey error:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
}

app.post("/sendFeedbackSurvey", handleSendFeedbackSurvey);
app.post("/api/survey/send", handleSendFeedbackSurvey);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Not Found" });
});

// Global Error Handler
app.use((err, req, res, _next) => {
  console.error("Server Error:", err.message);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NagarNetra Express Backend running on port ${PORT}`);
  console.log("[Server] NagarNetra Express backend ready");
  
  // Safe Environment Variable Check (Names only, never values)
  const requiredEnv = [
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_WHATSAPP_FROM",
    "GEMINI_API_KEY"
  ];
  const missing = requiredEnv.filter(key => !process.env[key]);
  if (missing.length > 0) {
    console.warn(`[Config Warning] Missing production environment variables: ${missing.join(", ")}`);
  }
  if (process.env.TELEGRAM_BOT_TOKEN) {
    console.log("[Server] Telegram Bot channel: ENABLED");
  } else {
    console.log("[Server] Telegram Bot channel: NOT CONFIGURED (TELEGRAM_BOT_TOKEN missing)");
  }
});

module.exports = app;
