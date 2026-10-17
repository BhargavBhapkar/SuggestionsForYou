import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import Order from "../models/Order.js";
import Cart from "../models/Cart.js";
import User from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";
import {
  PaymentError, createRazorpayOrder, isRazorpayConfigured, toPaise, verifyPaymentSignature, type PaymentParams,
} from "../services/razorpay.js";
import { markOrderPaid } from "../services/orderPayments.js";

const router = Router();
router.use(requireAuth);

const SUPPORT_EMAIL = "hello@suggestionsforyou.com";

const createOrderSchema = z.object({
  addressId: z.string().min(1),
  paymentMethod: z.enum(["cod", "razorpay"]).default("cod"),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1).max(100),
  razorpay_payment_id: z.string().min(1).max(100),
  razorpay_signature: z.string().min(1).max(200),
});

const MIN_ONLINE_PAISE = 100;
const PAYMENTS_UNAVAILABLE = "Online payment isn't available right now. Please choose cash on delivery.";

type OrderDoc = InstanceType<typeof Order>;

// Opens (or reuses) the Razorpay order for an unpaid online order. The amount always
// comes from the total stored on our order, never from the client.
async function ensureRazorpayOrder(order: OrderDoc): Promise<PaymentParams> {
  const amount = toPaise(order.total);
  if (!order.razorpayOrderId) {
    const rp = await createRazorpayOrder({ amountPaise: amount, receipt: String(order._id) });
    order.razorpayOrderId = rp.id;
    await order.save();
  }
  return { keyId: process.env.RAZORPAY_KEY_ID!, razorpayOrderId: order.razorpayOrderId, amount, currency: "INR" };
}

router.post(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = createOrderSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    const { addressId, paymentMethod } = parsed.data;
    if (paymentMethod === "razorpay" && !isRazorpayConfigured()) return res.status(503).json({ error: PAYMENTS_UNAVAILABLE });

    const user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });
    const address = user.addresses.find((a) => String(a._id) === addressId);
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

    // Razorpay's minimum is 100 paise (₹1).
    if (paymentMethod === "razorpay" && toPaise(total) < MIN_ONLINE_PAISE) {
      return res.status(400).json({ error: "Online payment needs an order total of at least ₹1. Please choose cash on delivery." });
    }

    const shippingAddress = {
      label: address.label,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      pincode: address.pincode,
      phone: address.phone,
    };

    // Trying to pay again for the same cart (after closing the payment window, a declined
    // card, a reload) reuses the unpaid order instead of piling up duplicates.
    if (paymentMethod === "razorpay") {
      const unpaid = await Order.find({ user: req.userId, paymentMethod: "razorpay", paymentStatus: "pending", orderStatus: "placed" })
        .sort({ createdAt: -1 })
        .limit(5);
      const sameCart = unpaid.find(
        (o) =>
          o.total === total &&
          o.items.length === items.length &&
          items.every((it) =>
            o.items.some((x) => String(x.product) === String(it.product) && x.storeName === it.storeName && x.qty === it.qty && x.price === it.price),
          ),
      );
      if (sameCart) {
        sameCart.shippingAddress = shippingAddress as never;
        await sameCart.save();
        try {
          return res.status(200).json({ order: sameCart, payment: await ensureRazorpayOrder(sameCart) });
        } catch (err) {
          if (err instanceof PaymentError) return res.status(502).json({ error: err.message });
          throw err;
        }
      }
    }

    const order = await Order.create({
      user: req.userId,
      items,
      shippingAddress,
      subtotal,
      discount,
      shippingFee,
      total,
      paymentMethod,
      paymentStatus: "pending",
      orderStatus: "placed",
    });

    if (paymentMethod === "cod") {
      cart.items.splice(0, cart.items.length);
      await cart.save();
      return res.status(201).json({ order, payment: null });
    }

    // Online: the cart is only cleared once the payment is verified.
    try {
      const payment = await ensureRazorpayOrder(order);
      return res.status(201).json({ order, payment });
    } catch (err) {
      await Order.deleteOne({ _id: order._id });
      if (err instanceof PaymentError) return res.status(502).json({ error: err.message });
      throw err;
    }
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

// Retry/continue payment for an online order that is still unpaid.
router.post(
  "/:id/pay",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Order not found" });
    const order = await Order.findOne({ _id: req.params.id, user: req.userId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.paymentMethod !== "razorpay") return res.status(400).json({ error: "This order is not an online-payment order" });
    if (order.paymentStatus === "paid") return res.status(400).json({ error: "This order is already paid" });
    if (order.orderStatus === "cancelled") return res.status(400).json({ error: "This order was cancelled" });
    if (!isRazorpayConfigured()) return res.status(503).json({ error: PAYMENTS_UNAVAILABLE });

    try {
      res.json({ order, payment: await ensureRazorpayOrder(order) });
    } catch (err) {
      if (err instanceof PaymentError) return res.status(502).json({ error: err.message });
      throw err;
    }
  }),
);

// Called after Razorpay Checkout succeeds. Nothing is marked paid unless the signature,
// computed with our secret over (razorpay_order_id|razorpay_payment_id), matches.
router.post(
  "/:id/verify-payment",
  asyncHandler(async (req: AuthedRequest, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: "Order not found" });
    const parsed = verifyPaymentSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Missing payment details" });
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

    const order = await Order.findOne({ _id: req.params.id, user: req.userId });
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (order.paymentMethod !== "razorpay") return res.status(400).json({ error: "This order is not an online-payment order" });
    if (!order.razorpayOrderId || order.razorpayOrderId !== razorpay_order_id) {
      return res.status(400).json({ error: "Payment does not match this order" });
    }
    if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
      return res.status(400).json({ error: "Payment verification failed. If money was deducted, it will be refunded by your bank." });
    }

    await markOrderPaid(order, razorpay_payment_id);
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
    if (order.paymentMethod === "razorpay" && order.paymentStatus === "paid") {
      return res.status(400).json({ error: `Paid online orders can't be cancelled here yet. Email ${SUPPORT_EMAIL} and we'll arrange a refund.` });
    }
    order.orderStatus = "cancelled";
    await order.save();
    res.json(order);
  }),
);

export default router;
