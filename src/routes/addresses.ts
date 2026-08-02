import { Router } from "express";
import { z } from "zod";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const addressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  line1: z.string().trim().min(1).max(200),
  line2: z.string().trim().max(200).optional(),
  city: z.string().trim().min(1).max(100),
  state: z.string().trim().min(1).max(100),
  pincode: z.string().trim().min(4).max(10),
  phone: z.string().trim().min(7).max(15),
  isDefault: z.boolean().optional(),
});

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user.addresses);
  }),
);

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = addressSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (parsed.data.isDefault || user.addresses.length === 0) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }
    user.addresses.push({ ...parsed.data, isDefault: parsed.data.isDefault || user.addresses.length === 0 } as never);
    await user.save();
    res.status(201).json(user.addresses);
  }),
);

router.patch(
  "/:addressId",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = addressSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const address = user.addresses.find((a) => String(a._id) === req.params.addressId);
    if (!address) return res.status(404).json({ error: "Address not found" });

    if (parsed.data.isDefault) user.addresses.forEach((a) => (a.isDefault = false));
    Object.assign(address, parsed.data);
    await user.save();
    res.json(user.addresses);
  }),
);

router.delete(
  "/:addressId",
  asyncHandler(async (req: AuthedRequest, res) => {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const index = user.addresses.findIndex((a) => String(a._id) === req.params.addressId);
    if (index === -1) return res.status(404).json({ error: "Address not found" });
    const wasDefault = user.addresses[index].isDefault;
    user.addresses.splice(index, 1);
    if (wasDefault && user.addresses.length > 0) user.addresses[0].isDefault = true;
    await user.save();
    res.json(user.addresses);
  }),
);

export default router;
