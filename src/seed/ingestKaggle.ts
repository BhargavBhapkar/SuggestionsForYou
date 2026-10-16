import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB, disconnectDB } from "../config/db.js";
import Product from "../models/Product.js";
import { buildStores, buildPriceHistory } from "./seedData.js";
import { readRows } from "./csv.js";

// Usage:
//   npm run sync:kaggle                 (reads from ../Datasets relative to this package)
//   npm run sync:kaggle -- --remove-mock
//
// Ingests three real Kaggle CSV exports into the existing multi-retailer
// Product schema (source: "kaggle"), reusing the same buildStores/
// buildPriceHistory synthetic-comparison approach as ingestAmazon.ts. Safe to
// re-run: products are upserted by name, and any previously-synced "kaggle"
// product no longer present in the current CSVs is removed automatically.
//
// --remove-mock additionally deletes every product still tagged
// source:"mock" (the original 25 hand-written placeholder products) once
// this run succeeds. Left off by default so a first run never deletes
// anything.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASETS_DIR = path.resolve(__dirname, "../../../Datasets");

const FALLBACK_IMAGES: Record<string, string> = {
  Mobiles: "https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=500&h=500&fit=crop&auto=format",
  "Smart Watches": "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&h=500&fit=crop&auto=format",
};

// ─── Shared helpers ─────────────────────────────────────────────────────────

function parseIndianPrice(raw: string | undefined): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[₹,\s]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseCount(raw: string | undefined): number {
  if (!raw) return 0;
  const n = Number.parseInt(raw.replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : 0;
}

function parseRating(raw: string | undefined): number {
  const n = Number.parseFloat(raw ?? "");
  return Number.isFinite(n) && n > 0 && n <= 5 ? Math.round(n * 10) / 10 : 4.0;
}

function titleCase(s: string): string {
  return s
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}

function truncateName(name: string, max = 100): string {
  const flat = name.replace(/\s+/g, " ").trim();
  if (flat.length <= max) return flat;
  const cut = flat.slice(0, max);
  return cut.slice(0, cut.lastIndexOf(" ")) + "…";
}

function specs(pairs: [string, string | undefined, string?][]) {
  return pairs
    .filter(([, value]) => value && value.trim())
    .map(([label, value, suffix]) => ({ label, value: `${value!.trim()}${suffix ?? ""}` }));
}

const KNOWN_BRANDS = [
  "Samsung", "Apple", "Sony", "OnePlus", "boAt", "Xiaomi", "Redmi", "Realme", "Vivo", "Oppo",
  "Nothing", "Google", "Motorola", "Nokia", "Asus", "Dell", "HP", "Lenovo", "Acer", "MSI",
  "LG", "Panasonic", "Philips", "Canon", "Nikon", "GoPro", "Fujifilm", "Garmin", "Fitbit",
  "JBL", "Bose", "Sennheiser", "Skullcandy", "Noise", "Fire-Boltt", "Amazfit", "Whirlpool",
  "Bosch", "IFB", "Haier", "Godrej", "Voltas", "Blue Star", "Daikin", "Hitachi", "Microsoft",
  "Nintendo", "Logitech", "Razer", "Corsair", "HyperX", "SanDisk", "WD", "Seagate", "Kingston",
  "TP-Link", "Netgear", "Mi", "Vu", "TCL", "Hisense", "Infinix", "Tecno", "iQOO", "Poco",
];

function detectBrand(title: string): string {
  const lower = title.toLowerCase();
  const hit = KNOWN_BRANDS.find((b) => lower.startsWith(b.toLowerCase() + " "));
  if (hit) return hit;
  const firstWord = title.split(/\s+/)[0]?.replace(/[^\w-]/g, "");
  return firstWord || "Unknown";
}

// ─── Category classifier for the noisy Amazon Electronics dump ────────────
// The dataset's own main_category/sub_category columns are useless (every
// row shares the same two values), so category is inferred from the product
// name. Accessories are vetoed first so "Laptop Charger Adapter" doesn't
// land in Laptops. Unmatched rows are skipped rather than guessed at.

const ACCESSORY_WORDS =
  /\b(charger|adapter|cable|case|cover|skin|sticker|tempered glass|screen protector|strap|backpack|\bbag\b|sleeve|stand|mount|holder|pen\b|roller ball|keyboard|mouse|combo|powerbank|power bank|cleaning kit|remote control|batteries|battery pack|tripod|selfie stick|memory card|pendrive|pen drive|hub\b|dock\b|ram module|memory module|ddr\d|sodimm|laptop ram|laptop memory|cooling pad|graphics card|motherboard|cpu cooler|hard disk|hard drive|\bssd\b|\bhdd\b|fire ?tv stick|firestick|streaming stick|streaming device|chromecast|roku|tv box|screen guard|antenna|wall plate|gimbal|stabilizer|\bcooler\b|writing pad|screwdriver|repair tool|tool kit|lens protector|lens kit|charging pad|wireless charging|\bpouch\b|armband|\bglue\b|magnifier|card reader|screen cleaner|sanitizer|ring light|selfie ring|thermal paste|\bsd card\b|sdhc|sdxc|\bmicrophone\b|air blower|blower pump|lens guard|rechargeable battery|camera battery|laptop battery|capture card|extended warranty|warranty plan|protection plan|\bspeaker\b|\bremote\b|set top box|setup box|\bdth\b|soundbar|strip light|\bdongle\b|screen mirroring|extractor|transmitter|audio connector|tv stick|writing tablet|lcd writing|doodle board|doodle pad|drawing tablet|graphic tablet|graphics tablet|e-?note ?pad|magic slate|scribble board|laptop table|\bglove\b|cleaning cloth|cleaning wipes|replacement tip|flash drive|\botg\b|audio interface|briefcase|messenger bag|overnighter|\bdesk\b|lap ?desk|study table|bed table|screw set|screw kit|night ?light|socket plug|timer socket|splitter|learner laptop|\btable\b|\bcontroller\b|cleaner kit)/i;

const CATEGORY_RULES: { category: string; pattern: RegExp }[] = [
  { category: "Smart Watches", pattern: /\b(smart ?watch|smart band|fitness band|\bwatch\b|fitbit|garmin)\b/i },
  { category: "Headphones", pattern: /\b(headphone|earphone|earbud|neckband|airpods|tws\b|in[- ]ear|on[- ]ear|over[- ]ear|headset)\b/i },
  { category: "Tablets", pattern: /\b(tablet|\bipad\b|galaxy tab)\b/i },
  { category: "Cameras", pattern: /\b(dslr|mirrorless|camcorder|gopro|webcam|action camera)\b/i },
  { category: "Gaming", pattern: /\b(playstation|\bps5\b|\bps4\b|xbox|nintendo switch|gaming console|game controller|gamepad|joystick)\b/i },
  { category: "Laptops", pattern: /\b(laptop|notebook pc|macbook|ideapad|chromebook|ultrabook|thinkpad)\b/i },
  { category: "Televisions", pattern: /\b(smart tv|led tv|oled tv|qled|\btv\b|television)\b/i },
  { category: "Mobiles", pattern: /\b(smartphone|iphone|galaxy [samfz]\d|redmi|poco|realme|oneplus \d|\bvivo \w|\boppo \w|nokia \d|iqoo|mobile phone|5g phone)\b/i },
  { category: "Home Appliances", pattern: /\b(washing machine|refrigerator|\bfridge\b|microwave|air conditioner|split ac\b|window ac\b|inverter ac\b|\d(\.\d)? ?ton\b|geyser|water heater|air purifier|vacuum cleaner|electric iron|steam iron|iron box|mixer grinder|induction cooktop|induction stove)\b/i },
];

function classifyAmazonName(name: string): string | null {
  if (ACCESSORY_WORDS.test(name)) return null;
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(name)) return rule.category;
  }
  return null;
}

// ─── Per-source normalizers ─────────────────────────────────────────────────

interface NormalizedProduct {
  name: string;
  brand: string;
  category: string;
  image: string;
  rating: number;
  reviews: number;
  lowestPrice: number;
  originalPrice: number;
  specs: { label: string; value: string }[];
  url?: string;
}

function fromFlipkartSmartphones(filePath: string): NormalizedProduct[] {
  const rows = readRows(filePath);
  const out: NormalizedProduct[] = [];
  for (const r of rows) {
    const lowestPrice = parseIndianPrice(r.discounted_price);
    const originalPriceRaw = parseIndianPrice(r.original_price);
    if (!lowestPrice) continue;
    const originalPrice = originalPriceRaw && originalPriceRaw > lowestPrice ? originalPriceRaw : lowestPrice;
    const brand = titleCase(r.brand || "Unknown");
    const model = r.model.replace(/\s+/g, " ").trim();
    const name = truncateName(`${brand} ${model}${r.colour ? ` (${titleCase(r.colour)})` : ""}`);
    out.push({
      name,
      brand,
      category: "Mobiles",
      image: FALLBACK_IMAGES.Mobiles,
      rating: parseRating(r.ratings),
      reviews: parseCount(r.rating_count),
      lowestPrice,
      originalPrice,
      specs: specs([
        ["RAM", r.memory, " GB"],
        ["Storage", r.storage, " GB"],
        ["Processor", r.processor],
        ["Rear Camera", r.rear_camera],
        ["Front Camera", r.front_camera],
        ["Display", r.display_size, "\""],
        ["Battery", r.battery_capacity, " mAh"],
        ["Battery Type", r.battery_type],
      ]),
    });
  }
  return out;
}

function fromFitnessTrackers(filePath: string): NormalizedProduct[] {
  const rows = readRows(filePath);
  const out: NormalizedProduct[] = [];
  for (const r of rows) {
    const lowestPrice = parseIndianPrice(r["Selling Price"]);
    const originalPriceRaw = parseIndianPrice(r["Original Price"]);
    if (!lowestPrice) continue;
    const originalPrice = originalPriceRaw && originalPriceRaw > lowestPrice ? originalPriceRaw : lowestPrice;
    const brand = titleCase((r["Brand Name"] || "Unknown").trim());
    const model = r["Model Name"].replace(/\s+/g, " ").trim();
    const name = truncateName(`${brand} ${model}${r.Color ? ` (${titleCase(r.Color)})` : ""}`);
    out.push({
      name,
      brand,
      category: "Smart Watches",
      image: FALLBACK_IMAGES["Smart Watches"],
      rating: parseRating(r["Rating (Out of 5)"]),
      reviews: parseCount(r.Reviews),
      lowestPrice,
      originalPrice,
      specs: specs([
        ["Type", r["Device Type"]],
        ["Display", r.Display],
        ["Strap Material", r["Strap Material"]],
        ["Battery Life", r["Average Battery Life (in days)"], " days"],
      ]),
    });
  }
  return out;
}

function fromAmazonElectronics(filePath: string): { items: NormalizedProduct[]; skipped: { accessory: number; uncategorized: number; noPrice: number } } {
  const rows = readRows(filePath);
  const out: NormalizedProduct[] = [];
  const skipped = { accessory: 0, uncategorized: 0, noPrice: 0 };
  for (const r of rows) {
    const rawName = r.name;
    if (!rawName) continue;

    if (ACCESSORY_WORDS.test(rawName)) { skipped.accessory++; continue; }
    const category = classifyAmazonName(rawName);
    if (!category) { skipped.uncategorized++; continue; }

    const discount = parseIndianPrice(r.discount_price);
    const actual = parseIndianPrice(r.actual_price);
    const lowestPrice = discount ?? actual;
    if (!lowestPrice) { skipped.noPrice++; continue; }
    const originalPrice = actual && actual > lowestPrice ? actual : lowestPrice;

    out.push({
      name: truncateName(rawName),
      brand: detectBrand(rawName),
      category,
      image: r.image || FALLBACK_IMAGES[category] || FALLBACK_IMAGES.Mobiles,
      rating: parseRating(r.ratings),
      reviews: parseCount(r.no_of_ratings),
      lowestPrice,
      originalPrice,
      specs: [],
      url: r.link || undefined,
    });
  }
  return { items: out, skipped };
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  const removeMock = process.argv.includes("--remove-mock");

  const flipkartPath = path.join(DATASETS_DIR, "flipkart-smartphones/flipkart_smartphones.csv");
  const fitnessPath = path.join(DATASETS_DIR, "fitness-trackers/Fitness_trackers_updated.csv");
  const amazonPath = path.join(DATASETS_DIR, "amazon-electronics-10k/electronics_product.csv");

  console.log("[kaggle-sync] Reading CSVs from", DATASETS_DIR);
  const amazonResult = fromAmazonElectronics(amazonPath);
  const allItems = [
    ...amazonResult.items,
    ...fromFitnessTrackers(fitnessPath),
    ...fromFlipkartSmartphones(flipkartPath),
  ];
  console.log(`[kaggle-sync] Amazon Electronics: ${amazonResult.items.length} usable (skipped ${amazonResult.skipped.accessory} accessories, ${amazonResult.skipped.uncategorized} uncategorized, ${amazonResult.skipped.noPrice} missing price)`);

  await connectDB();

  const seenNameKeys = new Set<string>();
  const seenNames: string[] = [];
  const perCategory: Record<string, number> = {};
  let upserted = 0;

  for (const item of allItems) {
    const nameKey = item.name.toLowerCase();
    if (seenNameKeys.has(nameKey)) continue;
    seenNameKeys.add(nameKey);
    seenNames.push(item.name);

    const discount = item.originalPrice > item.lowestPrice
      ? Math.round(((item.originalPrice - item.lowestPrice) / item.originalPrice) * 100)
      : 0;

    const stores = buildStores(item.lowestPrice, item.originalPrice, item.reviews, item.rating);
    if (item.url) stores[0].url = item.url;

    const tags = ["search"];
    if (discount >= 15) tags.push("deal");

    await Product.updateOne(
      { name: item.name },
      {
        $set: {
          name: item.name,
          brand: item.brand,
          category: item.category,
          image: item.image,
          rating: item.rating,
          reviews: item.reviews,
          lowestPrice: item.lowestPrice,
          originalPrice: item.originalPrice,
          discount,
          tags,
          inStock: true,
          stores,
          source: "kaggle",
          specs: item.specs,
          priceHistory: buildPriceHistory(item.lowestPrice),
        },
      },
      { upsert: true },
    );
    upserted++;
    perCategory[item.category] = (perCategory[item.category] ?? 0) + 1;
  }

  const res = await Product.deleteMany({ source: "kaggle", name: { $nin: seenNames } });
  const removedStale = res.deletedCount ?? 0;

  // Mark the top 3 most-reviewed Kaggle products per category as trending.
  for (const category of Object.keys(perCategory)) {
    const top = await Product.find({ category, source: "kaggle" }).sort({ reviews: -1 }).limit(3);
    for (const p of top) {
      if (!p.tags.includes("trending")) {
        p.tags.push("trending");
        await p.save();
      }
    }
  }

  let removedMock = 0;
  if (removeMock) {
    const mockRes = await Product.deleteMany({ source: "mock" });
    removedMock = mockRes.deletedCount ?? 0;
  }

  console.log("\n[kaggle-sync] Done.");
  console.log(`[kaggle-sync] Upserted: ${upserted}`);
  console.log("[kaggle-sync] By category:", perCategory);
  console.log(`[kaggle-sync] Removed stale kaggle products: ${removedStale}`);
  if (removeMock) console.log(`[kaggle-sync] Removed old mock products: ${removedMock}`);

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error("[kaggle-sync] Failed:", err);
  process.exit(1);
});
