import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readRows } from "./csv.js";
import { queryFor, rankCandidates, type Pick, type SerperImage } from "./imagePick.js";

// Usage (needs SERPER_API_KEY in .env; run `npm run export:image-list` first):
//   npm run fetch:images -- --dry-run            print queries, no network
//   npm run fetch:images -- --limit 20           first 20 un-fetched models (1 Serper credit each)
//   npm run fetch:images -- --category Mobiles   only one category
//   npm run fetch:images -- --retry-misses       search again for models that had no match
//
// For each model in Datasets/product_images_needed.csv it runs one Serper image
// search, keeps only results whose title names exactly that model, checks the
// image URL really serves an image, and records it in
// Datasets/product-image-urls.json. Resumable: finished models are never
// searched again. `npm run sync:catalog` then uses the URLs.

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATASETS = path.resolve(__dirname, "../../../Datasets");
const LIST_PATH = path.join(DATASETS, "product_images_needed.csv");
const URLS_PATH = path.join(DATASETS, "product-image-urls.json");
const CONCURRENCY = 3;
const TRY_CANDIDATES = 3;

type Hit = { url: string; title: string; domain: string; query: string; productIds: string[] };
type Miss = { miss: true; reason: string; query: string; productIds: string[] };
type Cache = Record<string, Hit | Miss>;

const argv = process.argv.slice(2);
const flag = (n: string) => argv.includes(`--${n}`);
const opt = (n: string) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 ? argv[i + 1] : undefined;
};

async function searchImages(query: string, key: string): Promise<SerperImage[]> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch("https://google.serper.dev/images", {
      method: "POST",
      headers: { "X-API-KEY": key, "Content-Type": "application/json" },
      body: JSON.stringify({ q: query, gl: "in", hl: "en", num: 10 }),
      signal: AbortSignal.timeout(20_000),
    });
    if (res.ok) return ((await res.json()) as { images?: SerperImage[] }).images ?? [];
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      throw new Error(`Serper rejected the request (${res.status}): ${(await res.text()).slice(0, 200)} - bad key or out of credits`);
    }
    if (attempt >= 4) throw new Error(`Serper failed after ${attempt} attempts (${res.status})`);
    await new Promise((r) => setTimeout(r, 1500 * attempt));
  }
}

async function servesImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { "user-agent": "SuggestionsForYouImageCheck/0.1" } });
    const type = res.headers.get("content-type") ?? "";
    const len = Number(res.headers.get("content-length") ?? "0");
    await res.body?.cancel();
    return res.ok && /^image\/(jpeg|png|webp|avif)/i.test(type) && (len === 0 || len > 4_000);
  } catch {
    return false;
  }
}

async function main() {
  const rows = readRows(LIST_PATH);
  const cache: Cache = fs.existsSync(URLS_PATH) ? JSON.parse(fs.readFileSync(URLS_PATH, "utf-8")) : {};
  const save = () => fs.writeFileSync(URLS_PATH, JSON.stringify(cache, null, 1), "utf-8");

  const only = opt("category");
  const limit = Number(opt("limit") ?? Infinity);
  const retryMisses = flag("retry-misses");
  const eligible = rows.filter((r) => {
    if (only && r.category !== only) return false;
    const done = cache[r.image_name];
    return !done || (retryMisses && "miss" in done);
  });
  const pending = eligible.slice(0, limit);

  console.log(`[images] ${rows.length} models listed, ${eligible.length} not yet fetched, searching ${pending.length} now`);

  if (flag("dry-run")) {
    for (const r of pending.slice(0, 25)) console.log("-", queryFor(r.brand, r.model, r.category));
    return;
  }

  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error("SERPER_API_KEY is not set in SuggestionsForYou-API/.env");
  if (!pending.length) return;

  let done = 0, hits = 0;
  const queue = [...pending];
  let fatal: Error | null = null;

  async function worker() {
    while (queue.length && !fatal) {
      const r = queue.shift()!;
      const productIds = r.product_ids.split(";");
      const query = queryFor(r.brand, r.model, r.category);
      try {
        const ranked = rankCandidates(await searchImages(query, key!), r.brand, r.model);
        let chosen: Pick | undefined;
        for (const c of ranked.slice(0, TRY_CANDIDATES)) {
          if (await servesImage(c.url)) { chosen = c; break; }
        }
        if (chosen) {
          cache[r.image_name] = { url: chosen.url, title: chosen.title, domain: chosen.domain, query, productIds };
          hits++;
        } else {
          cache[r.image_name] = { miss: true, reason: ranked.length ? "candidates unreachable" : "no title match", query, productIds };
        }
        save();
        done++;
        console.log(`[images] ${done}/${pending.length} ${chosen ? "hit " : "miss"} ${r.model}${chosen ? ` <- ${chosen.domain}` : ""}`);
      } catch (err) {
        fatal = err as Error;
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  save();
  console.log(`\n[images] Searched ${done}, found ${hits}, no match ${done - hits}. Credits used: ${done}.`);
  const all = Object.values(cache);
  console.log(`[images] Cache totals: ${all.filter((v) => !("miss" in v)).length} with photo, ${all.filter((v) => "miss" in v).length} without (of ${rows.length}).`);
  if (fatal) throw fatal;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("[images] Failed:", err.message ?? err);
    process.exit(1);
  });
