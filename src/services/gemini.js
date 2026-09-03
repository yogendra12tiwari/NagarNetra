import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

console.log("[Gemini] Frontend initialized:", Boolean(apiKey));

// Initialize the Gemini client (client-side fallback)
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

// Primary and Fallback models
const primaryModel = genAI ? genAI.getGenerativeModel({ model: "gemma-4-26b-a4b-it" }) : null;
const fallbackModel = genAI ? genAI.getGenerativeModel({ model: "gemini-3.6-flash" }) : null;
const BACKEND_URL = "https://nagarnetra-74tc.onrender.com";

export async function analyzeDumpPoints(dumpPoints) {
  if (!primaryModel || !fallbackModel) {
    console.warn("Gemini API key is missing. Ensure VITE_GEMINI_API_KEY is set.");
    return [];
  }

  try {
    // We only send the top active ones to save tokens and latency
    const activePoints = dumpPoints
      .map(p => {
        const days = Math.round((new Date(p.last_reported) - new Date(p.first_reported)) / (1000 * 60 * 60 * 24));
        return {
          id: p.id,
          name: p.name,
          report_count: p.report_count,
          days_active: days,
        };
      })
      .filter(p => p.report_count > 0 || p.days_active > 0)
      .sort((a, b) => b.report_count - a.report_count)
      .slice(0, 25); // Send top 25 candidates to the model

    if (activePoints.length === 0) return [];

    const prompt = `
      You are an expert Urban Waste Management AI.
      I will provide you with a JSON list of active dump points in the city.
      Your task is to analyze this data and return the top 10 most critical "Priority Zones" that need immediate attention.
      
      For each of the top 10, calculate an "aiScore" (0-100) based on severity, and write a single short, punchy sentence "aiReason" explaining why it is critical and explicitly justifying its ranking spot compared to others (e.g. "Ranked #1 because it has the highest volume of continuous dumping over 30 days without resolution.").
      
      Respond strictly in the following JSON format, with no markdown formatting or extra text:
      [
        {
          "id": "dp_001",
          "aiScore": 95,
          "aiReason": "Ranked #1 because it presents an immediate biohazard with 24 reports."
        }
      ]

      Data:
      ${JSON.stringify(activePoints)}
    `;

    let responseText = "";
    
    try {
      const result = await primaryModel.generateContent(prompt);
      responseText = result.response.text();
    } catch (modelError) {
      console.warn("Primary model failed (possibly 503 Overloaded). Falling back to gemini-2.5-flash. Error:", modelError.message);
      const fallbackResult = await fallbackModel.generateContent(prompt);
      responseText = fallbackResult.response.text();
    }
    
    // Clean up potential markdown and safely extract array
    const cleanedText = responseText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const startIndex = cleanedText.indexOf('[');
    const endIndex = cleanedText.lastIndexOf(']');
    
    if (startIndex === -1 || endIndex === -1) {
      console.warn("Gemini did not return a valid JSON array.", responseText);
      return [];
    }

    const arrayStr = cleanedText.substring(startIndex, endIndex + 1);
    const rankedData = JSON.parse(arrayStr);

    return rankedData;
  } catch (error) {
    console.error("Error analyzing dump points with Gemini:", error);
    // Fallback or empty array
    return [];
  }
}

export async function askRagAgent(query, chatHistory = [], points = []) {
  console.log("[Gemini] Model request started");

  const safePoints = (Array.isArray(points) ? points : []).map(p => ({ 
    id: p.report_id || p.community_id || p.id || "N/A", 
    name: p.name || "Hotspot", 
    reports: p.report_count || 1, 
    status: p.status || "active", 
    severity: (p.report_count || 1) >= 7 ? 'High' : 'Normal' 
  }));

  // 1. Primary: Use Render Backend AI Proxy (Secure & production reliable)
  try {
    const backendEndpoint = `${BACKEND_URL}/api/ai/chat`;
    const response = await fetch(backendEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query,
        chatHistory: Array.isArray(chatHistory) ? chatHistory : [],
        points: safePoints
      })
    });

    if (response.ok) {
      const data = await response.json();
      if (data.ok && data.text) {
        console.log("[Gemini] Model request succeeded (via backend proxy)");
        return data.text;
      }
    }
    console.warn("[Gemini] Backend proxy returned non-200 status:", response.status);
  } catch (proxyErr) {
    console.warn("[Gemini] Backend proxy error, trying client SDK fallback:", proxyErr.message);
  }

  // 2. Fallback: Direct Client SDK if frontend API key is configured
  if (primaryModel || fallbackModel) {
    try {
      const staticContext = `
        You are the NagarNetra Public Information AI, serving the citizens of Lucknow.
        
        STRICT GUARDRAILS:
        1. You must ONLY answer questions related to:
           - Lucknow Municipal Corporation (LMC) or Nagar Nigam.
           - Waste management, sanitation, cleanliness, and garbage collection.
           - Ward details, corporators (ward members), and departmental jurisdictions in Lucknow district (including nearby villages/areas like Anora Kala).
           - The live active hotspots / reports provided in the context below.
        2. Use your internal geographic knowledge to recognize local areas, villages, and neighborhoods in and around Lucknow. If a user asks about an area (e.g., Anora Kala, Gomti Nagar, etc.), ASSUME it is in Lucknow. Do NOT claim an area is outside Lucknow unless it is obviously a major different city (like Delhi or Mumbai).
        3. If a user asks about ANY other topic (e.g., general knowledge, politics, coding, weather in other cities, etc.), you MUST politely decline and state that you can only assist with Lucknow cleanliness and civic issues.

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
        - Official Head Office: Lucknow Nagar Nigam, Trilokinath Road, Lalbagh, Lucknow-226001, Uttar Pradesh.

        Current Live Active Points (Hotspots) Context:
        ${JSON.stringify(safePoints)}

        Instructions:
        - Provide detailed, well-explained responses. Use structured bullet points to make information easy to read and understand.
        - If the user provides a complaint number (e.g., SWC-0001), look it up in the context provided. If found, tell them its exact location, status, and severity. If not found, tell them the complaint ID is invalid or resolved.
        - If the user asks about an area (like Anora Kala) that is not in the "Current Live Active Points" list, politely inform them that there are currently no active reported hotspots in that area, but they can submit a new report or call 1533 if they need immediate assistance.
      `;

      const history = [
        { role: "user", parts: [{ text: staticContext }] },
        { role: "model", parts: [{ text: "Understood. I am ready to assist citizens." }] },
        ...(Array.isArray(chatHistory) ? chatHistory : []).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.text || "" }]
        }))
      ];

      try {
        const chat = primaryModel.startChat({ history });
        const result = await chat.sendMessage(query);
        console.log("[Gemini] Model request succeeded (via direct primary model)");
        return result.response.text();
      } catch (primaryErr) {
        console.warn("[Gemini] Primary model failed, trying fallback model:", primaryErr.message);
        const fallbackChat = fallbackModel.startChat({ history });
        const fallbackResult = await fallbackChat.sendMessage(query);
        console.log("[Gemini] Model request succeeded (via direct fallback model)");
        return fallbackResult.response.text();
      }
    } catch (clientErr) {
      console.error("[Gemini] Direct SDK error:", clientErr.message);
    }
  }

  console.error("[Gemini] Model request failed: All AI channels unavailable");
  return "I'm sorry, I am having trouble fetching official details right now. Please try again later or call LMC Helpline at 1533.";
}
