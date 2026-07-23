import { Router } from "express";
import Retailer from "../models/Retailer.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const retailers = await Retailer.find().sort({ order: 1 });
    res.json(retailers);
  }),
);

export default router;
