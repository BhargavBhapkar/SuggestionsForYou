import "dotenv/config";
import express from "express";
import compression from "compression";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./config/db.js";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler.js";
import { apiLimiter } from "./middleware/rateLimit.js";
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
import ordersRouter from "./routes/orders.js";
import chatRouter from "./routes/chat.js";
import newsletterRouter from "./routes/newsletter.js";
import paymentsRouter, { razorpayWebhook } from "./routes/payments.js";
import { asyncHandler } from "./utils/asyncHandler.js";

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
  app.set("trust proxy", 1);
  app.use(helmet());
  app.use(compression());
  app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") ?? "*" }));
  // Razorpay signs the raw body, so this route must be registered before the JSON parser.
  app.post("/api/payments/webhook", express.raw({ type: "application/json", limit: "100kb" }), asyncHandler(razorpayWebhook));
  app.use(express.json({ limit: "100kb" }));
  app.use("/api", apiLimiter);

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
  app.use("/api/orders", ordersRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/newsletter", newsletterRouter);
  app.use("/api/payments", paymentsRouter);

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
