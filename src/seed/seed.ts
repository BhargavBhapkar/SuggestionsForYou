import "dotenv/config";
import { connectDB, disconnectDB } from "../config/db.js";
import { runSeed } from "./runSeed.js";

async function main() {
  await connectDB();
  await runSeed();
  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error("[seed] Failed:", err);
  process.exit(1);
});
