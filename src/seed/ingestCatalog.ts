import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB, disconnectDB } from "../config/db.js";
import Product from "../models/Product.js";
import { buildStores, buildPriceHistory, CATEGORIES } from "./seedData.js";
import { readRows } from "./csv.js";

// Usage:
//   npm run sync:catalog                 ingest Datasets/electronics_catalog_india.csv
//   npm run sync:catalog -- --dry-run    parse + schema-validate only, no DB access
//
// Additive: upserts by name with source "catalog-india" and never touches
// products from any other source (mock / amazon-api / kaggle). Only a
// previously-ingested "catalog-india" product that is no longer in the CSV is
// pruned. Rows whose name already belongs to another source are skipped.
//
// The CSV has no images, ratings or reviews. Images come from
// Datasets/product-image-urls.json when `npm run fetch:images` found a photo of
// that exact model; every other product gets a text-free category-icon
// placeholder. Rating and reviews are 0 = unrated.
// Unreleased rows (status upcoming/rumored) have no real price, so they are
// skipped. The 5-retailer comparison is the same synthetic buildStores() used
// for every other product.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CSV_PATH = path.resolve(__dirname, "../../../Datasets/electronics_catalog_india.csv");
const SOURCE = "catalog-india";
const SELLABLE = new Set(["available", "out_of_stock"]);
const MAX_PLAUSIBLE_DISCOUNT = 50;

type Spec = { label: string; value: string };

// ─── Specs ──────────────────────────────────────────────────────────────────

const KV_LABELS: Record<string, { label: string; fmt?: (v: string) => string }> = {
  processor: { label: "Processor" },
  ram_gb: { label: "RAM", fmt: (v) => `${v} GB` },
  ram_type: { label: "RAM type" },
  storage_gb: { label: "Storage", fmt: (v) => `${v} GB` },
  ssd_gb: { label: "Storage", fmt: (v) => `${v} GB SSD` },
  gpu: { label: "Graphics" },
  display_in: { label: "Display size", fmt: (v) => `${v}"` },
  screen_in: { label: "Screen size", fmt: (v) => `${v}"` },
  resolution: { label: "Resolution" },
  panel: { label: "Panel" },
  refresh_hz: { label: "Refresh rate", fmt: (v) => `${v} Hz` },
  battery_mah: { label: "Battery", fmt: (v) => `${v} mAh` },
  fast_charging_w: { label: "Fast charging", fmt: (v) => `${v} W` },
  rear_camera: { label: "Rear camera" },
  front_camera_mp: { label: "Front camera", fmt: (v) => `${v} MP` },
  os: { label: "Operating system" },
  speaker_w: { label: "Speaker output", fmt: (v) => `${v} W` },
  hdmi_ports: { label: "HDMI ports" },
  usb_ports: { label: "USB ports" },
  ports: { label: "Ports" },
  extras: { label: "Features" },
};

function keyValueSpecs(keySpecs: string): Spec[] {
  const specs: Spec[] = [];
  for (const part of keySpecs.split(";")) {
    const idx = part.indexOf(":");
    if (idx < 0) continue;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (!key || !value) continue;
    const known = KV_LABELS[key];
    if (known) specs.push({ label: known.label, value: known.fmt ? known.fmt(value) : value });
    else specs.push({ label: key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " "), value });
  }
  return specs;
}

function positionalSpecs(category: string, keySpecs: string): Spec[] {
  const tokens = keySpecs.split(";").map((t) => t.trim()).filter(Boolean);
  const specs: Spec[] = [];
  const features: string[] = [];
  const water: string[] = [];

  tokens.forEach((tok, idx) => {
    if (category === "Headphones") {
      if (idx === 0) specs.push({ label: "Type", value: tok });
      else if (/^(in|over|on|open)-ear$/i.test(tok)) specs.push({ label: "Fit", value: tok });
      else if (/^(wireless|wired)/i.test(tok)) specs.push({ label: "Connectivity", value: tok });
      else if (/^(bt|bluetooth)\b/i.test(tok)) specs.push({ label: "Bluetooth", value: tok.replace(/^BT\s*/i, "") || tok });
      else if (/^(no\s+)?anc$/i.test(tok)) specs.push({ label: "Noise cancellation", value: /^no/i.test(tok) ? "No" : "Yes" });
      else if (/driver|woofer/i.test(tok)) specs.push({ label: "Driver", value: tok });
      else features.push(tok);
      return;
    }

    if (category === "Smart Watches") {
      if (/^[\d.]+"$/.test(tok)) specs.push({ label: "Display", value: tok });
      else if (/battery/i.test(tok)) specs.push({ label: "Battery", value: tok });
      else if (/\bIPX?\d+|\d+\s?ATM|^\d+\s?m(\/|$)/i.test(tok)) water.push(tok);
      else features.push(tok);
      return;
    }

    // Mobiles, Tablets
    if (/^\d+\s?(GB|MB)\s*\/\s*\d+\s?(GB|MB|TB)$/i.test(tok)) {
      specs.push({ label: "RAM / Storage", value: tok.replace(/\s*\/\s*/, " / ") });
    } else if (/^\d+\s?(GB|TB)$/i.test(tok)) {
      specs.push({ label: "Storage", value: tok });
    } else if (/mAh/i.test(tok)) {
      const [battery, charging] = tok.split("+");
      specs.push({ label: "Battery", value: battery.replace(/(\d)mAh/i, "$1 mAh") });
      if (charging) specs.push({ label: "Charging", value: charging });
    } else if (/^[\d.]+"/.test(tok)) {
      specs.push({ label: "Display", value: tok.replace("+", ", ") });
    } else if (/no camera/i.test(tok)) {
      specs.push({ label: "Camera", value: "None" });
    } else if (/\d\s?MP/i.test(tok)) {
      specs.push({ label: tok.includes("/") ? "Camera (rear / front)" : "Camera", value: tok.replace(/\s*\/\s*/, " / ") });
    } else if (/^(android|ios|harmonyos|kaios|hyperos|s30\+)/i.test(tok)) {
      specs.push({ label: "Operating system", value: tok });
    } else if (/^feature phone$/i.test(tok)) {
      // already implied by the product type
    } else if (idx === 0) {
      if (!/^(none|n\/a|-)$/i.test(tok)) specs.push({ label: "Processor", value: tok });
    } else {
      features.push(tok);
    }
  });

  if (water.length) specs.push({ label: "Water resistance", value: water.join(", ") });
  if (features.length) specs.push({ label: "Features", value: features.join(", ") });
  return specs;
}

function buildSpecs(row: Record<string, string>): Spec[] {
  const specs = row.key_specs.includes(": ")
    ? keyValueSpecs(row.key_specs)
    : positionalSpecs(row.category, row.key_specs);
  if (row.launched) specs.push({ label: "Launched", value: row.launched });
  if (row.spec_score) specs.push({ label: "Spec score", value: `${row.spec_score}/100` });
  specs.push({ label: "Price as of", value: row.price_as_of });
  return specs;
}

// ─── Placeholder image (no product photos exist in the source data) ─────────

// Lucide-style 24x24 outlines, one per category. No text: the tile only says
// "a photo of this kind of product goes here".
const ICON_PATHS: Record<string, string> = {
  Mobiles: `<rect width="14" height="20" x="5" y="2" rx="2" ry="2"/><path d="M12 18h.01"/>`,
  Laptops: `<path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55a1 1 0 0 1-.9 1.45H3.62a1 1 0 0 1-.9-1.45L4 16"/>`,
  Headphones: `<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3"/>`,
  "Smart Watches": `<circle cx="12" cy="12" r="6"/><polyline points="12 10 12 12 13 13"/><path d="m16.13 7.66-.81-4.05a2 2 0 0 0-2-1.61h-2.68a2 2 0 0 0-2 1.61l-.78 4.05"/><path d="m7.88 16.36.8 4a2 2 0 0 0 2 1.61h2.72a2 2 0 0 0 2-1.61l.81-4.05"/>`,
  Tablets: `<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><line x1="12" x2="12.01" y1="18" y2="18"/>`,
  Monitors: `<rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/>`,
  Televisions: `<rect width="20" height="15" x="2" y="7" rx="2" ry="2"/><polyline points="17 2 12 7 7 2"/>`,
  Cameras: `<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/>`,
  Gaming: `<line x1="6" x2="10" y1="11" y2="11"/><line x1="8" x2="8" y1="9" y2="13"/><line x1="15" x2="15.01" y1="12" y2="12"/><line x1="18" x2="18.01" y1="10" y2="10"/><path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z"/>`,
  "Home Appliances": `<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>`,
};
const FALLBACK_ICON = `<rect width="18" height="18" x="3" y="3" rx="2"/>`;

function placeholderImage(category: string): string {
  const meta = CATEGORIES.find((c) => c.name === category);
  const color = meta?.color ?? "#6B7280";
  const bg = meta?.bg ?? "#F3F4F6";
  const icon = ICON_PATHS[category] ?? FALLBACK_ICON;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg}"/><stop offset="1" stop-color="#FFFFFF"/></linearGradient></defs>` +
    `<rect width="500" height="500" fill="url(#g)"/>` +
    `<g transform="translate(150 150) scale(8.333)" fill="none" stroke="${color}" stroke-opacity=".8" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${icon}</g>` +
    `</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf-8").toString("base64")}`;
}

// Real photo URLs found by `npm run fetch:images` (product id -> url). Optional:
// products without an entry keep the category-icon placeholder.
const URLS_PATH = path.resolve(__dirname, "../../../Datasets/product-image-urls.json");

function loadPhotoUrls(): Map<string, string> {
  const byId = new Map<string, string>();
  if (!fs.existsSync(URLS_PATH)) return byId;
  const cache = JSON.parse(fs.readFileSync(URLS_PATH, "utf-8")) as Record<string, { url?: string; productIds: string[] }>;
  for (const entry of Object.values(cache)) {
    if (entry.url) for (const id of entry.productIds) byId.set(id, entry.url);
  }
  return byId;
}

// ─── Normalisation ──────────────────────────────────────────────────────────

type CatalogDoc = {
  name: string; brand: string; category: string; image: string;
  rating: number; reviews: number;
  lowestPrice: number; originalPrice: number; discount: number;
  tags: string[]; inStock: boolean;
  stores: ReturnType<typeof buildStores>;
  source: string; specs: Spec[];
  priceHistory: ReturnType<typeof buildPriceHistory>;
};

function normalize(rows: Record<string, string>[], photos: Map<string, string>) {
  const knownCategories = new Set(CATEGORIES.map((c) => c.name));
  const stats = { rows: rows.length, skippedByStatus: {} as Record<string, number>, badPrice: 0, unknownCategory: {} as Record<string, number>, cappedMrp: 0, renamed: [] as string[] };
  const docs: CatalogDoc[] = [];
  const usedNames = new Set<string>();

  for (const row of rows) {
    if (!SELLABLE.has(row.status)) {
      stats.skippedByStatus[row.status] = (stats.skippedByStatus[row.status] ?? 0) + 1;
      continue;
    }
    if (!knownCategories.has(row.category)) {
      stats.unknownCategory[row.category] = (stats.unknownCategory[row.category] ?? 0) + 1;
      continue;
    }
    const price = Number(row.price_inr);
    if (!Number.isFinite(price) || price <= 0) { stats.badPrice++; continue; }

    let originalPrice = price;
    const mrp = Number(row.mrp_inr_est);
    if (Number.isFinite(mrp) && mrp > price) {
      if (((mrp - price) / mrp) * 100 <= MAX_PLAUSIBLE_DISCOUNT) originalPrice = mrp;
      else stats.cappedMrp++;
    }
    const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

    let name = row.name;
    if (usedNames.has(name.toLowerCase())) {
      name = `${row.name} (${row.launched || row.id})`;
      if (usedNames.has(name.toLowerCase())) name = `${row.name} (${row.id})`;
      stats.renamed.push(`${row.id}: ${name}`);
    }
    usedNames.add(name.toLowerCase());

    const inStock = row.status !== "out_of_stock";
    // The dataset has one price per product, so keep the cheapest synthetic
    // store at exactly that price and never let a store's MRP fall below its price.
    const stores = buildStores(price, originalPrice, 0, 0);
    for (const s of stores) {
      s.price = Math.max(s.price, price);
      s.rating = 0;
      s.reviews = 0;
      if (!inStock) s.inStock = false;
    }
    const cheapest = stores.reduce((a, b) => (b.price < a.price ? b : a));
    cheapest.price = price;
    for (const s of stores) s.originalPrice = Math.max(originalPrice, s.price);

    docs.push({
      name, brand: row.brand, category: row.category,
      image: photos.get(row.id) ?? placeholderImage(row.category),
      rating: 0, reviews: 0,
      lowestPrice: price, originalPrice, discount,
      tags: ["search"], inStock, stores,
      source: SOURCE, specs: buildSpecs(row),
      priceHistory: buildPriceHistory(price),
    });
  }
  return { docs, stats };
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const rows = readRows(CSV_PATH);
  const photos = loadPhotoUrls();
  const { docs, stats } = normalize(rows, photos);

  console.log(`[catalog] ${stats.rows} CSV rows -> ${docs.length} sellable products`);
  console.log(`[catalog] Real photos: ${docs.filter((d) => !d.image.startsWith("data:")).length}, icon placeholders: ${docs.filter((d) => d.image.startsWith("data:")).length}`);
  console.log("[catalog] Skipped (not sellable):", stats.skippedByStatus);
  if (Object.keys(stats.unknownCategory).length) console.log("[catalog] Skipped (unknown category):", stats.unknownCategory);
  if (stats.badPrice) console.log(`[catalog] Skipped (bad price): ${stats.badPrice}`);
  if (stats.cappedMrp) console.log(`[catalog] MRP estimate ignored (>${MAX_PLAUSIBLE_DISCOUNT}% off): ${stats.cappedMrp}`);
  if (stats.renamed.length) console.log("[catalog] Renamed duplicate names:", stats.renamed);

  let invalid = 0;
  for (const d of docs) {
    const err = new Product(d).validateSync();
    if (err) {
      invalid++;
      if (invalid <= 5) console.error(`[catalog] Invalid "${d.name}":`, err.message);
    }
  }
  if (invalid) throw new Error(`${invalid} products failed schema validation`);

  const perCategory: Record<string, number> = {};
  for (const d of docs) perCategory[d.category] = (perCategory[d.category] ?? 0) + 1;
  console.log("[catalog] By category:", perCategory);

  if (dryRun) {
    console.log("[catalog] Dry run — sample products:");
    const seenKinds = new Set<string>();
    const shownPerCategory: Record<string, number> = {};
    for (const d of docs) {
      const kind = `${d.category}|${d.specs.map((s) => s.label).join(",")}`;
      if (seenKinds.has(kind) || (shownPerCategory[d.category] ?? 0) >= 3) continue;
      seenKinds.add(kind);
      shownPerCategory[d.category] = (shownPerCategory[d.category] ?? 0) + 1;
      console.log(`- [${d.category}] ${d.name} — ₹${d.lowestPrice} (orig ₹${d.originalPrice}, -${d.discount}%, inStock=${d.inStock}, image ${d.image.length} chars)`);
      console.log("   ", d.specs.map((s) => `${s.label}: ${s.value}`).join(" | "));
    }
    return;
  }

  await connectDB();

  const foreign = await Product.find({ source: { $ne: SOURCE } }, { name: 1 }).lean();
  const taken = new Set(foreign.map((p) => p.name.toLowerCase()));
  const toWrite = docs.filter((d) => !taken.has(d.name.toLowerCase()));
  const collisions = docs.length - toWrite.length;
  if (collisions) console.log(`[catalog] Skipped ${collisions} products whose name already exists from another source`);

  const CHUNK = 200;
  let upserted = 0;
  for (let i = 0; i < toWrite.length; i += CHUNK) {
    const chunk = toWrite.slice(i, i + CHUNK);
    await Promise.all(chunk.map((d) => Product.updateOne({ name: d.name }, { $set: d }, { upsert: true })));
    upserted += chunk.length;
  }

  const stale = await Product.deleteMany({ source: SOURCE, name: { $nin: toWrite.map((d) => d.name) } });

  const totals = await Product.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$category", n: { $sum: 1 } } }]);
  const total = totals.reduce((a, t) => a + t.n, 0);
  console.log(`\n[catalog] Done. Written: ${upserted}, pruned stale catalog-india: ${stale.deletedCount ?? 0}`);
  console.log("[catalog] Catalog totals by category (all sources):", Object.fromEntries(totals.sort((a, b) => b.n - a.n).map((t) => [t._id, t.n])));
  console.log(`[catalog] Catalog total (all sources): ${total}`);

  await disconnectDB();
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[catalog] Failed:", err);
    process.exit(1);
  });
