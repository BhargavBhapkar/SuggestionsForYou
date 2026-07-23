import { Router } from "express";
import { z } from "zod";
import Cart from "../models/Cart.js";
import Product from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { requireAuth, type AuthedRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

async function getOrCreateCart(userId: string) {
  let cart = await Cart.findOne({ user: userId });
  if (!cart) cart = await Cart.create({ user: userId, items: [] });
  return cart;
}

async function respondWithCart(userId: string, res: import("express").Response) {
  const cart = await Cart.findOne({ user: userId }).populate("items.product");
  const items = cart?.items ?? [];
  const subtotal = items.reduce((sum, it) => sum + it.priceSnapshot * it.qty, 0);
  res.json({ items, subtotal });
}

const addItemSchema = z.object({
  productId: z.string().min(1),
  storeName: z.string().min(1),
  qty: z.number().int().min(1).max(20).default(1),
});

const updateItemSchema = z.object({
  storeName: z.string().min(1),
  qty: z.number().int().min(1).max(20),
});

const removeItemSchema = z.object({
  storeName: z.string().min(1),
});

router.get(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    await getOrCreateCart(req.userId!);
    await respondWithCart(req.userId!, res);
  }),
);

router.post(
  "/items",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = addItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    const { productId, storeName, qty } = parsed.data;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ error: "Product not found" });
    const store = product.stores.find((s) => s.name === storeName);
    const priceSnapshot = store?.price ?? product.lowestPrice;

    const cart = await getOrCreateCart(req.userId!);
    const existing = cart.items.find((it) => String(it.product) === productId && it.storeName === storeName);
    if (existing) {
      existing.qty = Math.min(20, existing.qty + qty);
    } else {
      cart.items.push({ product: product._id, storeName, qty, priceSnapshot } as never);
    }
    await cart.save();
    await respondWithCart(req.userId!, res);
  }),
);

router.patch(
  "/items/:productId",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = updateItemSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    const { storeName, qty } = parsed.data;

    const cart = await getOrCreateCart(req.userId!);
    const item = cart.items.find((it) => String(it.product) === req.params.productId && it.storeName === storeName);
    if (!item) return res.status(404).json({ error: "Item not in cart" });
    item.qty = qty;
    await cart.save();
    await respondWithCart(req.userId!, res);
  }),
);

router.delete(
  "/items/:productId",
  asyncHandler(async (req: AuthedRequest, res) => {
    const parsed = removeItemSchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: "storeName is required" });
    const { storeName } = parsed.data;

    const cart = await getOrCreateCart(req.userId!);
    const index = cart.items.findIndex(
      (it) => String(it.product) === req.params.productId && it.storeName === storeName,
    );
    if (index !== -1) cart.items.splice(index, 1);
    await cart.save();
    await respondWithCart(req.userId!, res);
  }),
);

router.delete(
  "/",
  asyncHandler(async (req: AuthedRequest, res) => {
    const cart = await getOrCreateCart(req.userId!);
    cart.items.splice(0, cart.items.length);
    await cart.save();
    await respondWithCart(req.userId!, res);
  }),
);

export default router;
