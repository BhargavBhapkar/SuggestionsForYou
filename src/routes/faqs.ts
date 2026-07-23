import { Router } from "express";
import Faq from "../models/Faq.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const faqs = await Faq.find().sort({ order: 1 });
    res.json(faqs);
  }),
);

export default router;
