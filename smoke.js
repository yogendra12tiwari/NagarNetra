import { analyzeDumpPoints } from './src/services/gemini.js';
import { DUMP_POINTS } from './src/data/mockData.js';

async function runSmokeTest() {
  console.log("=== SwachhOS Smoke Test: Gemini ML Prioritization ===");
  try {
    const ranked = await analyzeDumpPoints(DUMP_POINTS);
    console.log("\n✅ AI Response Received! Priority Zones:");
    console.log(ranked);
  } catch (error) {
    console.error("❌ Smoke test failed:", error);
  }
}

runSmokeTest();
