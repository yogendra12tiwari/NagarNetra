const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const twilio = require("twilio");
const translations = require("./translations");

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://nagarnetra-road-safety.web.app",
  "https://nagarnetra-road-safety.firebaseapp.com",
  "https://nagarnetra-4a55d.web.app",
  "https://nagarnetra-4a55d.firebaseapp.com",
  "https://swachhos101.web.app",
  "https://swachhos101.firebaseapp.com",
  "https://swachhos-admin.web.app",
  "https://swachhos-public.web.app"
];

const cors = require("cors")({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  }
});

// Declare secrets
const TWILIO_SID   = defineSecret("TWILIO_ACCOUNT_SID");
const TWILIO_TOKEN = defineSecret("TWILIO_AUTH_TOKEN");
const TWILIO_FROM  = defineSecret("TWILIO_WHATSAPP_FROM");
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const MessagingResponse = twilio.twiml.MessagingResponse;

// Helpers
function getTwilioClient() {
  return twilio(TWILIO_SID.value().trim(), TWILIO_TOKEN.value().trim());
}

function getFromNumber() {
  let fromNum = (TWILIO_FROM.value() || "whatsapp:+14155238886").trim();
  if (!fromNum.startsWith("whatsapp:")) fromNum = "whatsapp:" + fromNum;
  return fromNum;
}

async function generateReportId() {
  const counterRef = db.collection("meta").doc("reportCounter");
  const result = await db.runTransaction(async (t) => {
    const doc = await t.get(counterRef);
    let current = doc.exists ? doc.data().count : 0;
    
    // Ensure we start above the mock data (which goes up to SWC-0035)
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

async function sendWhatsApp(to, body) {
  return getTwilioClient().messages.create({
    from: getFromNumber(),
    to,
    body,
  });
}

// Geo-Fencing
const LUCKNOW_BOUNDS = { minLat: 26.70, maxLat: 27.00, minLng: 80.80, maxLng: 81.10 };
function isWithinLucknow(lat, lng) {
  return lat >= LUCKNOW_BOUNDS.minLat && lat <= LUCKNOW_BOUNDS.maxLat &&
         lng >= LUCKNOW_BOUNDS.minLng && lng <= LUCKNOW_BOUNDS.maxLng;
}

// Haversine
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

const crypto = require("crypto");
const { GoogleGenAI } = require("@google/genai");

async function askNagarNetra_AI(query, activePoints) {
  const apiKey = GEMINI_API_KEY.value();
  if (!apiKey) return "AI service is currently unavailable.";
  
  const ai = new GoogleGenAI({ apiKey });
  
  const staticContext = `
    You are the NagarNetra Public Information AI, answering users over WhatsApp.
    
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
    \${JSON.stringify(activePoints.map(p => ({ 
      id: p.report_id, 
      name: p.name, 
      reports: p.report_count, 
      status: p.status, 
      severity: p.report_count >= 7 ? 'High' : 'Normal' 
    })))}

    Instructions:
    - Provide detailed, well-explained responses.
    - Use WhatsApp formatting: *bold* for emphasis, _italics_. Use bullet points (-) for readability. Do NOT use ** for bold.
    - If the user provides a complaint number (e.g., SWC-0001), look it up in the context provided.
    - If the user asks about an area not in the "Current Live Active Points" list, politely inform them that there are no active reported hotspots there.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: staticContext }] },
        { role: 'model', parts: [{ text: "Understood. I am ready to assist citizens." }] },
        { role: 'user', parts: [{ text: query }] }
      ]
    });
    return response.text;
  } catch (error) {
    console.error("AI Error:", error);
    return "Sorry, I am having trouble understanding right now. Please try again later.";
  }
}


// AI Spam Filter reusable function
async function checkIsGarbage(mediaUrl) {
  let isGarbage = true;
  let hash = null;
  try {
    const { GoogleGenAI } = require("@google/genai");
    const apiKey = GEMINI_API_KEY.value();
    if (apiKey && mediaUrl) {
      const ai = new GoogleGenAI({ apiKey });
      const twilioAuth = Buffer.from(TWILIO_SID.value().trim() + ":" + TWILIO_TOKEN.value().trim()).toString("base64");
      const headers = mediaUrl.includes("api.twilio.com")
        ? { Authorization: `Basic ${twilioAuth}` }
        : {};

      console.log(`[AI Spam Filter] Downloading image from: ${mediaUrl.slice(0, 80)}...`);
      const imgRes = await fetch(mediaUrl, { headers });
      if (imgRes.ok) {
        const arrayBuffer = await imgRes.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Hash the image to check for exact duplicates
        hash = crypto.createHash("sha256").update(buffer).digest("hex");
        const hashDoc = await db.collection("photo_hashes").doc(hash).get();
        
        if (hashDoc.exists) {
          console.log(`[AI Spam Filter] Duplicate photo hash detected: ${hash}`);
          return { isGarbage: false, isDuplicate: true };
        }

        const mimeType = imgRes.headers.get("content-type") || "image/jpeg";
        const prompt = `You are the AI verification system for NagarNetra, a municipal waste and cleanliness reporting system.
Your task is to determine whether an image is a legitimate civic report related to garbage, waste, debris, or cleanliness, OR if it is unrelated spam.

ACCEPT as VALID (is_valid: true) if it shows ANY of the following:
- Piles of garbage, trash heaps, scattered litter, plastic bags, discarded packaging, food waste, bottles, or refuse.
- Overflowing dustbins, garbage bins, dumpsters, or open waste collection sites.
- Sanitation workers, waste pickers, sweepers, or people handling, sorting, or cleaning waste.
- Construction or demolition debris, rubble, discarded building materials, scrap piles.
- Clogged dirty drains, contaminated ditches, or unsanitary street/civic conditions.

REJECT as SPAM (is_valid: false) ONLY if the photo is completely unrelated (e.g., personal selfies, portraits without waste, clean cars on clean roads, clean indoor rooms, food on dining plates, screenshots, memes).

Respond strictly in JSON format:
{
  "is_valid": true,
  "reason": "short explanation"
}`;

        const response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [
            prompt,
            { inlineData: { data: buffer.toString("base64"), mimeType } }
          ],
          config: { responseMimeType: 'application/json' }
        });
        
        const rawText = response.text ? response.text.trim() : "";
        console.log(`[AI Spam Filter] Gemini response: ${rawText}`);

        try {
          const parsed = JSON.parse(rawText);
          if (parsed && typeof parsed.is_valid === "boolean") {
            isGarbage = parsed.is_valid;
          } else {
            isGarbage = true;
          }
        } catch (jsonErr) {
          const upper = rawText.toUpperCase();
          if (upper.includes('"IS_VALID": FALSE') || (upper.includes("SPAM") && !upper.includes("VALID"))) {
            isGarbage = false;
          } else {
            isGarbage = true;
          }
        }

        if (isGarbage && hash) {
          // It is garbage and not a duplicate, save hash to prevent future reuse
          await db.collection("photo_hashes").doc(hash).set({
            timestamp: new Date().toISOString()
          });
          console.log(`[AI Spam Filter] Saved valid photo hash: ${hash}`);
        }
      } else {
        console.warn(`[AI Spam Filter] Image fetch failed with HTTP ${imgRes.status} ${imgRes.statusText}`);
      }
    }
  } catch (aiError) {
    console.error("[AI Spam Filter] Error during verification:", aiError);
    isGarbage = true;
  }

  console.log(`[AI Spam Filter] Final classification: isGarbage=${isGarbage}`);
  return { isGarbage, isDuplicate: false };
}

// ── Main inbound webhook ─────────────────────────────────────────────────────
exports.twilioWebhook = onRequest(
  { secrets: [TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM, GEMINI_API_KEY] },
  async (req, res) => {
    const twilioSignature = req.headers["x-twilio-signature"];
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const url = `${protocol}://${req.headers.host}${req.originalUrl}`;
    
    if (twilioSignature) {
      let isValid = twilio.validateRequest(TWILIO_TOKEN.value().trim(), twilioSignature, url, req.body);
      if (!isValid) {
        const altUrl = url.endsWith('/') ? url.slice(0, -1) : url + '/';
        isValid = twilio.validateRequest(TWILIO_TOKEN.value().trim(), twilioSignature, altUrl, req.body);
      }
    }

    const fromNumber = req.body.From || "";
    const incomingMsg = req.body.Body ? req.body.Body.toLowerCase().trim() : "";
    const mediaUrl = req.body.MediaUrl0;
    const lat = req.body.Latitude ? parseFloat(req.body.Latitude) : null;
    const lng = req.body.Longitude ? parseFloat(req.body.Longitude) : null;

    const twiml = new MessagingResponse();
    const sessionRef = db.collection("whatsapp_sessions").doc(fromNumber);

    try {
      const sessionDoc = await sessionRef.get();
      let sessionData = sessionDoc.exists ? sessionDoc.data() : { step: "start" };

      // Helper for translation
      const lang = sessionData.language || "en";
      const t = translations[lang];

      if (incomingMsg === "reset" || incomingMsg === "cancel") {
        await sessionRef.delete();
        twiml.message("Session reset. Send 'hey' to start again.");
        res.set("Content-Type", "text/xml");
        return res.status(200).send(twiml.toString());
      }

      if (sessionData.step === "start") {
        if (["hey", "hi", "hello", "start", "namaste"].includes(incomingMsg)) {
          await sessionRef.set({ step: "awaiting_language", phone: fromNumber });
          twiml.message("Please choose your language / कृपया अपनी भाषा चुनें:\n1️⃣ English\n2️⃣ हिंदी (Hindi)");
        } else {
          twiml.message("Welcome to SwachhOS! Reply with 'hey' to get started.");
        }
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
          
          const reply = await askNagarNetra_AI(req.body.Body, activePoints);
          twiml.message(reply);
        }
      }

      else if (sessionData.step === "awaiting_tracking_code") {
        const code = req.body.Body ? req.body.Body.toUpperCase().trim() : "";
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
            res.set("Content-Type", "text/xml");
            return res.status(200).send(twiml.toString());
          }

          const timestamp = new Date().toISOString();
          const today = timestamp.split("T")[0];
          
          // Spatial Clustering
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
            // Merge
            const updatedPhotos = sessionData.photoUrl ? [...(matchedPoint.photos || []), sessionData.photoUrl] : matchedPoint.photos;
            await db.collection("dumpPoints").doc(matchedPoint.id).update({
              report_count: (matchedPoint.report_count || 1) + 1,
              last_reported: timestamp,
              photos: updatedPhotos
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
            // Create New
            const communityId = await generateCommunityId();
            const newPointRef = await db.collection("dumpPoints").add({
              community_id: communityId,
              name: "User Reported Dump Point",
              lat,
              lng,
              report_count: 1,
              first_reported: timestamp,
              last_reported: timestamp,
              photos: sessionData.photoUrl ? [sessionData.photoUrl] : [],
              status: "active",
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
          // If they skip proof, just record feedback without making it unmanaged
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
      console.error("Error processing WhatsApp message:", error);
      twiml.message("Sorry, something went wrong on our end. Please try again later.");
    }

    res.set("Content-Type", "text/xml");
    res.status(200).send(twiml.toString());
  }
);

exports.sendFeedbackSurvey = onRequest(
  { secrets: [TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM] },
  (req, res) => {
    cors(req, res, async () => {
      try {
        const { pointId, reportId, pointName, phoneNumbers } = req.body;
        if (!pointId || !phoneNumbers?.length) return res.status(400).json({ error: "pointId and phoneNumbers required" });

        const results = await Promise.allSettled(
          phoneNumbers.map(async (phone) => {
            const to = phone.startsWith("whatsapp:") ? phone : `whatsapp:${phone}`;
            // fetch user language if possible, else default to 'en'
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
    });
  }
);
