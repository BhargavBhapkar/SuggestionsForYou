import { Router } from "express";
import Product from "../models/Product.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

// GET /api/products?tag=trending&category=Mobiles&q=galaxy&limit=8
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { tag, category, q, brand, limit } = req.query;
    const filter: Record<string, unknown> = {};

    if (tag) filter.tags = tag;
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (q) filter.$text = { $search: String(q) };

    let query = Product.find(filter).sort({ createdAt: -1 });
    if (limit) query = query.limit(Number(limit));

    const products = await query.exec();
    res.json(products);
  }),
);

// GET /api/products/:name — exact match, case-insensitive, used by the
// compare page (which links to /compare/:productName).
router.get(
  "/:name",
  asyncHandler(async (req, res) => {
    const name = decodeURIComponent(req.params.name);
    const product = await Product.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, "i") });
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  }),
);

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default router;
