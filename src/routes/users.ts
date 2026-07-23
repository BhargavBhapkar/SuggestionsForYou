import { Router } from "express";
import { z } from "zod";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const productIdSchema = z.object({ productId: z.string().min(1) });

router.get(
  "/wishlist",
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await User.findById(req.userId).populate("wishlist");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.wishlist);
  }),
);

router.post(
  "/wishlist",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = productIdSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "productId is required" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const already = user.wishlist.some((id) => String(id) === parsed.data.productId);
    if (!already) user.wishlist.push(parsed.data.productId as never);
    await user.save();
    res.status(201).json(user.wishlist);
  }),
);

router.delete(
  "/wishlist/:productId",
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    user.wishlist = user.wishlist.filter((id) => String(id) !== req.params.productId) as typeof user.wishlist;
    await user.save();
    res.json(user.wishlist);
  }),
);

export default router;
