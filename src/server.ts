import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import Product from "./models/Product.js";
import { runSeed } from "./seed/runSeed.js";

import productsRouter from "./routes/products.js";
import categoriesRouter from "./routes/categories.js";
import retailersRouter from "./routes/retailers.js";
import testimonialsRouter from "./routes/testimonials.js";
import faqsRouter from "./routes/faqs.js";
import authRouter from "./routes/auth.js";
import cartRouter from "./routes/cart.js";
import addressesRouter from "./routes/addresses.js";
import usersRouter from "./routes/users.js";

async function main() {
  await connectDB();

  if (process.env.USE_MEMORY_DB === "true") {
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log("[server] In-memory DB is empty — auto-seeding for local development...");
      await runSeed();
    }
  }

  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*" }));
  app.use(express.json());

  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/products", productsRouter);
  app.use("/api/categories", categoriesRouter);
  app.use("/api/retailers", retailersRouter);
  app.use("/api/testimonials", testimonialsRouter);
  app.use("/api/faqs", faqsRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/cart", cartRouter);
  app.use("/api/addresses", addressesRouter);
  app.use("/api/users", usersRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  const port = Number(process.env.PORT) || 4000;
  app.listen(port, () => {
    console.log(`[server] SuggestionsForYou API listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error("[server] Failed to start:", err);
  process.exit(1);
});
