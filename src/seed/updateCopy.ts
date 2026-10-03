import "dotenv/config";
import { connectDB, disconnectDB } from "../config/db.js";
import Category from "../models/Category.js";
import Faq from "../models/Faq.js";
import { CATEGORIES, FAQS } from "./seedData.js";

// Pushes the current CATEGORIES/FAQS copy from seedData.ts into the database
// without touching Products — unlike runSeed(), which wipes every collection
// including Products. Use this whenever only marketing copy (category counts,
// FAQ text) changes, not the product catalog.

async function main() {
  await connectDB();

  for (const c of CATEGORIES) {
    await Category.updateOne({ name: c.name }, { $set: c }, { upsert: true });
  }
  console.log(`[update-copy] Updated ${CATEGORIES.length} categories.`);

  for (const f of FAQS) {
    await Faq.updateOne({ q: f.q }, { $set: f }, { upsert: true });
  }
  console.log(`[update-copy] Updated ${FAQS.length} FAQs.`);

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error("[update-copy] Failed:", err);
  process.exit(1);
});
