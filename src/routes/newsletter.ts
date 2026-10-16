import { Router } from "express";
import { z } from "zod";
import Subscriber from "../models/Subscriber.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { newsletterLimiter } from "../middleware/rateLimit.js";

const router = Router();

const subscribeSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
});

// Idempotent: re-subscribing an existing address succeeds too, so the endpoint
// can't be used to find out who is on the list.
router.post(
  "/",
  newsletterLimiter,
  asyncHandler(async (req, res) => {
    const parsed = subscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    await Subscriber.updateOne({ email: parsed.data.email }, { $setOnInsert: { email: parsed.data.email } }, { upsert: true });
    res.status(201).json({ ok: true });
  }),
);

export default router;
