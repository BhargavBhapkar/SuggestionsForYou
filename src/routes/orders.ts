import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

const createOrderSchema = z.object({
  addressId: z.string().min(1),
});

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const address = user.addresses.find((a) => String(a._id) === parsed.data.addressId);
    if (!address) return res.status(404).json({ error: "Address not found" });

    const cart = await Cart.findOne({ user: req.userId }).populate("items.product");
    if (!cart || cart.items.length === 0) return res.status(400).json({ error: "Your cart is empty" });

    const items = cart.items.map((it) => {
      const product = it.product as unknown as { _id: string; name: string; image: string };
      return {
        product: product._id,
        name: product.name,
        image: product.image,
        storeName: it.storeName,
        qty: it.qty,
        price: it.priceSnapshot,
      };
    });
    const subtotal = items.reduce((sum, it) => sum + it.price * it.qty, 0);
    const shippingFee = 0;
    const discount = 0;
    const total = subtotal - discount + shippingFee;

    const order = await Order.create({
      user: req.userId,
      items,
      shippingAddress: {
        label: address.label,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        phone: address.phone,
      },
      subtotal,
      discount,
      shippingFee,
      total,
      paymentMethod: "cod",
      paymentStatus: "pending",
      orderStatus: "placed",
    });

    cart.items.splice(0, cart.items.length);
    await cart.save();

    res.status(201).json(order);
  }),
);

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const orders = await Order.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(orders);
  }),
);

router.get(
  "/:id",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Order not found" });
    const order = await Order.findOne({ _id: req.params.id, user: req.userId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  }),
);

router.post(
  "/:id/cancel",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Order not found" });
    const order = await Order.findOne({ _id: req.params.id, user: req.userId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (!["placed", "confirmed"].includes(order.orderStatus)) {
      return res.status(400).json({ error: `Order can't be cancelled once it's ${order.orderStatus}` });
    }
    order.orderStatus = "cancelled";
    await order.save();
    res.json(order);
  }),
);

export default router;
