import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readRows } from "./csv.js";

// Usage:
//   npm run sync:photos -- --dry-run     report only, copy nothing
//   npm run sync:photos                  copy + record + write the remaining list
//   npm run sync:photos -- --from "<folder>"   use another source folder
// Default source: "Product Images/product_image_downloader_v2/Datasets/product-images",
// or plain "Product Images" if that folder is missing.
//
// Takes photos you saved as "<image_name>.<jpg|png|webp>" (names from
// Datasets/product_images_needed.csv), copies them into
// SuggestionsForYou-UI/public/product-images/ and records them in
// Datasets/product-image-urls.json, which `npm run sync:catalog` reads. Local
// photos win over anything `fetch:images` found. Models still without a photo
// are written to Datasets/product_images_remaining.csv.
// After syncing new photos, run `npm run compress:images` in the UI project to shrink them.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");
const DATASETS = path.join(ROOT, "Datasets");
const LIST_PATH = path.join(DATASETS, "product_images_needed.csv");
const URLS_PATH = path.join(DATASETS, "product-image-urls.json");
const REMAINING_PATH = path.join(DATASETS, "product_images_remaining.csv");
const DEST = path.join(ROOT, "SuggestionsForYou-UI/public/product-images");
const PUBLIC_PREFIX = "/product-images/";

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const fromIdx = argv.indexOf("--from");
const DOWNLOADER_DIR = path.join(ROOT, "Product Images", "product_image_downloader_v2", "Datasets", "product-images");
const SRC = fromIdx >= 0 ? path.resolve(argv[fromIdx + 1]) : fs.existsSync(DOWNLOADER_DIR) ? DOWNLOADER_DIR : path.join(ROOT, "Product Images");

type Kind = "jpg" | "png" | "webp";

function sniff(buf: Buffer): { kind: Kind; w: number; h: number } | null {
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
        return { kind: "jpg", h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return { kind: "jpg", w: 0, h: 0 };
  }
  if (buf.length > 24 && buf.toString("latin1", 1, 4) === "PNG") return { kind: "png", w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
  if (buf.length > 30 && buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return { kind: "webp", w: 0, h: 0 };
  return null;
}

const csvCell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function main() {
  const rows = readRows(LIST_PATH);
  const byName = new Map(rows.map((r) => [r.image_name, r]));
  if (!fs.existsSync(SRC)) throw new Error(`Source folder not found: ${SRC}`);

  const matched = new Map<string, { file: string; kind: Kind; w: number; h: number; bytes: number }>();
  const unmatched: string[] = [];
  const invalid: string[] = [];
  const tiny: string[] = [];
  const duplicates: string[] = [];

  for (const file of fs.readdirSync(SRC).sort()) {
    const full = path.join(SRC, file);
    if (!fs.statSync(full).isFile()) continue;
    const ext = path.extname(file).toLowerCase();
    if (![".jpg", ".jpeg", ".png", ".webp"].includes(ext)) { unmatched.push(`${file} (not an image)`); continue; }
    const name = path.basename(file, path.extname(file)).toLowerCase();
    if (!byName.has(name)) { unmatched.push(file); continue; }
    const buf = fs.readFileSync(full);
    const info = sniff(buf);
    if (!info || buf.length < 1_500) { invalid.push(file); continue; }
    if (info.w && Math.min(info.w, info.h) < 200) tiny.push(`${file} (${info.w}x${info.h})`);
    if (matched.has(name)) { duplicates.push(file); continue; }
    matched.set(name, { file, kind: info.kind, w: info.w, h: info.h, bytes: buf.length });
  }

  // Photos copied on an earlier run (possibly from another folder) still count.
  const already = new Set(fs.existsSync(DEST) ? fs.readdirSync(DEST).map((f) => path.basename(f, path.extname(f))) : []);
  const have = (name: string) => matched.has(name) || already.has(name);
  const missing = rows.filter((r) => !have(r.image_name));
  const covered = rows.filter((r) => have(r.image_name));
  const productsCovered = covered.reduce((n, r) => n + r.product_ids.split(";").length, 0);
  const productsTotal = rows.reduce((n, r) => n + r.product_ids.split(";").length, 0);

  console.log(`[photos] Source: ${SRC}`);
  console.log(`[photos] ${matched.size} photos in the source folder; ${covered.length}/${rows.length} models have a photo once synced (covers ${productsCovered}/${productsTotal} products)`);
  if (unmatched.length) console.log(`[photos] ${unmatched.length} files match no listed model:`, unmatched);
  if (invalid.length) console.log(`[photos] ${invalid.length} files are not valid images (or under 1.5 KB), ignored:`, invalid);
  if (duplicates.length) console.log(`[photos] ${duplicates.length} duplicate files ignored:`, duplicates);
  if (tiny.length) console.log(`[photos] ${tiny.length} photos are under 200 px on a side (still used):`, tiny);

  const missByCat: Record<string, number> = {};
  for (const r of missing) missByCat[r.category] = (missByCat[r.category] ?? 0) + 1;
  console.log("[photos] Still missing by category:", missByCat);

  if (dryRun) return;

  fs.mkdirSync(DEST, { recursive: true });
  const cache: Record<string, Record<string, unknown>> = fs.existsSync(URLS_PATH) ? JSON.parse(fs.readFileSync(URLS_PATH, "utf-8")) : {};
  let copied = 0;
  for (const [name, m] of matched) {
    const outName = `${name}.${m.kind}`;
    const target = path.join(DEST, outName);
    // Skip files already on the site unless the source was changed after it was copied
    // (the UI's `npm run compress:images` shrinks copies, so size can't be compared).
    if (!fs.existsSync(target) || fs.statSync(path.join(SRC, m.file)).mtimeMs > fs.statSync(target).mtimeMs) {
      fs.copyFileSync(path.join(SRC, m.file), target);
      copied++;
    }
    const row = byName.get(name)!;
    cache[name] = { url: PUBLIC_PREFIX + outName, title: row.model, domain: "local", query: "", productIds: row.product_ids.split(";") };
  }
  // A local entry whose file is gone from the site folder falls back to the placeholder.
  for (const [name, entry] of Object.entries(cache)) {
    if (entry.domain === "local" && !have(name)) delete cache[name];
  }
  fs.writeFileSync(URLS_PATH, JSON.stringify(cache, null, 1), "utf-8");

  const header = ["image_name", "category", "brand", "model", "variants", "price_inr", "smartprix_url", "product_ids"];
  const lines = [header.join(",")];
  for (const r of missing) lines.push(header.map((h) => csvCell(r[h])).join(","));
  fs.writeFileSync(REMAINING_PATH, "﻿" + lines.join("\r\n") + "\r\n", "utf-8");

  console.log(`[photos] Copied ${copied} new/changed files to ${DEST}`);
  console.log(`[photos] Recorded ${matched.size} photos in ${URLS_PATH}`);
  console.log(`[photos] Wrote ${missing.length} remaining models to ${REMAINING_PATH}`);
}

try {
  main();
} catch (err) {
  console.error("[photos] Failed:", (err as Error).message);
  process.exit(1);
}
