import { Router } from "express";
import Testimonial from "../models/Testimonial.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const testimonials = await Testimonial.find().sort({ order: 1 });
    res.json(testimonials);
  }),
);

export default router;
