import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectDB, disconnectDB } from "../config/db.js";
import Product from "../models/Product.js";
import { CATEGORIES } from "./seedData.js";
import { readRows } from "./csv.js";

// Usage: npm run export:image-list
// Writes Datasets/product_images_needed.csv: one row per distinct model that
// needs a photo. Products that differ only by RAM/storage share one photo.
// Save each photo into Datasets/product-images/ named "<image_name>.<jpg|png|webp>".

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASETS = path.resolve(__dirname, "../../../Datasets");
const CSV_PATH = path.join(DATASETS, "electronics_catalog_india.csv");
const OUT_PATH = path.join(DATASETS, "product_images_needed.csv");
const IMAGES_DIR = path.join(DATASETS, "product-images");
const SOURCE = "catalog-india";
const SELLABLE = new Set(["available", "out_of_stock"]);

const STORAGE_ONLY = /^(?:\s*\d+\s*(?:GB|TB)(?:\s*(?:RAM|ROM|Storage))?\s*[+/,&]?)+\s*$/i;

function baseModelName(name: string): string {
  return name
    .replace(/\(([^)]*)\)/g, (m, inner: string) => (STORAGE_ONLY.test(inner) ? " " : m))
    .replace(/\s+/g, " ")
    .trim();
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/\+/g, " plus ").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

type Group = { slug: string; category: string; brand: string; model: string; price: number; url: string; ids: string[] };

async function main() {
  const rows = readRows(CSV_PATH).filter((r) => SELLABLE.has(r.status));

  await connectDB();
  const inAtlas = new Set((await Product.find({ source: SOURCE }, { name: 1 }).lean()).map((p) => p.name));
  await disconnectDB();

  // Mirror ingestCatalog's duplicate-name renaming so names line up with Atlas.
  const used = new Set<string>();
  const groups = new Map<string, Group>();
  const slugOwner = new Map<string, string>();

  for (const row of rows) {
    let name = row.name;
    if (used.has(name.toLowerCase())) {
      name = `${row.name} (${row.launched || row.id})`;
      if (used.has(name.toLowerCase())) name = `${row.name} (${row.id})`;
    }
    used.add(name.toLowerCase());
    if (!inAtlas.has(name)) continue;

    const model = baseModelName(row.name);
    const key = `${row.category}|${row.brand.toLowerCase()}|${model.toLowerCase()}`;
    let g = groups.get(key);
    if (!g) {
      let slug = slugify(model);
      if (slugOwner.has(slug) && slugOwner.get(slug) !== key) slug = `${slug}-${slugify(row.category)}`;
      for (let n = 2; slugOwner.has(slug) && slugOwner.get(slug) !== key; n++) slug = `${slugify(model)}-${n}`;
      slugOwner.set(slug, key);
      g = { slug, category: row.category, brand: row.brand, model, price: Number(row.price_inr), url: row.source_url, ids: [] };
      groups.set(key, g);
    }
    g.ids.push(row.id);
    g.price = Math.min(g.price, Number(row.price_inr));
  }

  const order = new Map(CATEGORIES.map((c, i) => [c.name, i]));
  const list = [...groups.values()].sort(
    (a, b) =>
      (order.get(a.category) ?? 99) - (order.get(b.category) ?? 99) ||
      a.brand.localeCompare(b.brand) ||
      a.model.localeCompare(b.model),
  );

  const header = ["image_name", "category", "brand", "model", "variants", "price_inr", "smartprix_url", "product_ids"];
  const lines = [header.join(",")];
  for (const g of list) {
    lines.push([g.slug, g.category, g.brand, g.model, g.ids.length, g.price, g.url, g.ids.join(";")].map(csvCell).join(","));
  }
  fs.writeFileSync(OUT_PATH, "﻿" + lines.join("\r\n") + "\r\n", "utf-8");
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const byCat: Record<string, number> = {};
  for (const g of list) byCat[g.category] = (byCat[g.category] ?? 0) + 1;
  console.log(`[images] ${[...groups.values()].reduce((n, g) => n + g.ids.length, 0)} products -> ${list.length} photos needed`);
  console.log("[images] By category:", byCat);
  console.log(`[images] Wrote ${OUT_PATH}`);
  console.log(`[images] Put photos in ${IMAGES_DIR}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[images] Failed:", err);
    process.exit(1);
  });
