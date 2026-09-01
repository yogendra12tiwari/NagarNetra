// Run this script using Node.js to populate your Firestore database.
// E.g., `node migrate.js` (Ensure you set up your Firebase Admin SDK or adapt this to run in the browser)

import { db } from './src/services/firebase.js';
import { collection, writeBatch, doc } from 'firebase/firestore';
import { DUMP_POINTS, RAW_REPORTS } from './src/data/mockData.js';

export async function migrateToFirestore() {
  if (!db) {
    console.error("Firebase not initialized. Add credentials to .env.local");
    return;
  }
  
  console.log("Starting migration to Firestore...");
  
  try {
    const batch = writeBatch(db);
    
    // 1. Upload Dump Points
    DUMP_POINTS.forEach(pt => {
      const ref = doc(collection(db, "dumpPoints"), pt.id);
      batch.set(ref, pt);
    });
    
    // 2. Upload Reports
    RAW_REPORTS.forEach(report => {
      const ref = doc(collection(db, "reports"), report.id);
      batch.set(ref, report);
    });
    
    await batch.commit();
    console.log(`Successfully migrated ${DUMP_POINTS.length} points and ${RAW_REPORTS.length} reports!`);
    
  } catch (error) {
    console.error("Error during migration: ", error);
  }
}
