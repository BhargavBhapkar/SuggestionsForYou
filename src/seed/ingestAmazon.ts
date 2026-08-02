import "dotenv/config";
import { connectDB, disconnectDB } from "../config/db.js";
import Product from "../models/Product.js";
import { searchAmazonProducts, parsePrice, type AmazonProduct } from "../services/amazonApi.js";
import { buildStores, buildPriceHistory } from "./seedData.js";

// Two search queries per category keeps this run at 18 requests total —
// well under the RapidAPI free tier's 100/month cap, with headroom to re-run.
const CATEGORY_QUERIES: Record<string, string[]> = {
  Mobiles: ["smartphone", "5G smartphone"],
  Laptops: ["laptop", "gaming laptop"],
  Headphones: ["wireless headphones", "bluetooth earbuds"],
  "Smart Watches": ["smartwatch", "fitness tracker watch"],
  Tablets: ["tablet", "android tablet"],
  Gaming: ["gaming console", "gaming controller"],
  Televisions: ["smart tv", "4k tv"],
  Cameras: ["dslr camera", "mirrorless camera"],
  "Home Appliances": ["washing machine", "refrigerator"],
};

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

function cleanTitle(title: string): string {
  let t = title.split(/\s[|–]\s/)[0].trim();
  if (t.length > 90) {
    const cut = t.slice(0, 90);
    t = cut.slice(0, cut.lastIndexOf(" ")) + "…";
  }
  return t;
}

async function main() {
  await connectDB();

  const seenAsins = new Set<string>();
  const seenNames = new Set<string>();
  let requestCount = 0;
  let rawCount = 0;
  let insertedCount = 0;
  const perCategory: Record<string, number> = {};

  for (const [category, queries] of Object.entries(CATEGORY_QUERIES)) {
    perCategory[category] = 0;
    const candidates: (AmazonProduct & { category: string })[] = [];

    for (const query of queries) {
      requestCount++;
      console.log(`[ingest] (${requestCount}) searching "${query}" for ${category}...`);
      let items: AmazonProduct[] = [];
      try {
        items = await searchAmazonProducts(query, { country: "IN" });
      } catch (err) {
        console.error(`[ingest] search failed for "${query}":`, err instanceof Error ? err.message : err);
        continue;
      }
      rawCount += items.length;
      for (const item of items) candidates.push({ ...item, category });
      await new Promise((r) => setTimeout(r, 400));
    }

    for (const item of candidates) {
      if (!item.asin || seenAsins.has(item.asin)) continue;
      if (!item.product_star_rating || (item.product_num_ratings ?? 0) < 10) continue;
      const price = parsePrice(item.product_price);
      if (!price) continue;

      const name = cleanTitle(item.product_title);
      const nameKey = name.toLowerCase();
      if (seenNames.has(nameKey)) continue;

      seenAsins.add(item.asin);
      seenNames.add(nameKey);

      const rating = Math.round(Number.parseFloat(item.product_star_rating) * 10) / 10;
      const reviews = item.product_num_ratings ?? 0;
      const rawOriginal = parsePrice(item.product_original_price);
      const originalPrice = rawOriginal && rawOriginal > price ? rawOriginal : price;
      const discount = originalPrice > price ? Math.round(((originalPrice - price) / originalPrice) * 100) : 0;

      const stores = buildStores(price, originalPrice, reviews, rating);
      if (item.product_url) stores[0].url = item.product_url;

      const tags = ["search"];
      if (discount >= 15) tags.push("deal");

      const doc = {
        name,
        brand: detectBrand(item.product_title),
        category,
        image: item.product_photo || "",
        rating,
        reviews,
        lowestPrice: price,
        originalPrice,
        discount,
        tags,
        inStock: true,
        stores,
        dealStore: discount >= 15 ? "Amazon" : undefined,
        dealStoreColor: discount >= 15 ? "#FF9900" : undefined,
        dealStock: discount >= 15 ? Math.floor(Math.random() * 40) + 5 : undefined,
        dealLimited: discount >= 15 ? true : undefined,
        source: "amazon-api",
        asin: item.asin,
        specs: [],
        priceHistory: buildPriceHistory(price),
      };

      if (!doc.image) continue;

      await Product.updateOne({ name }, { $set: doc }, { upsert: true });
      insertedCount++;
      perCategory[category]++;
    }
  }

  // Mark the top 3 most-reviewed real products per category as trending.
  for (const category of Object.keys(CATEGORY_QUERIES)) {
    const top = await Product.find({ category, source: "amazon-api" }).sort({ reviews: -1 }).limit(3);
    for (const p of top) {
      if (!p.tags.includes("trending")) {
        p.tags.push("trending");
        await p.save();
      }
    }
  }

  console.log("\n[ingest] Done.");
  console.log(`[ingest] API requests used this run: ${requestCount}`);
  console.log(`[ingest] Raw candidates fetched: ${rawCount}`);
  console.log(`[ingest] Products inserted/updated: ${insertedCount}`);
  console.log("[ingest] By category:", perCategory);

  await disconnectDB();
  process.exit(0);
}

main().catch((err) => {
  console.error("[ingest] Failed:", err);
  process.exit(1);
});
