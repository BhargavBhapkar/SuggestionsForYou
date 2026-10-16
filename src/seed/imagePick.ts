export type SerperImage = {
  title?: string;
  imageUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  domain?: string;
  link?: string;
  position?: number;
};

// Retail / spec / brand sites that carry clean product shots.
const PREFERRED = [
  "smartprix.com", "gsmarena.com", "91mobiles.com", "gadgets360.com", "amazon.in", "amazon.com", "media-amazon.com",
  "flipkart.com", "flixcart.com", "croma.com", "reliancedigital.in", "vijaysales.com", "mi.com", "samsung.com",
  "apple.com", "oneplus.in", "oneplus.com", "realme.com", "vivo.com", "oppo.com", "motorola.in", "sony.co.in",
  "boat-lifestyle.com", "noise.com", "dell.com", "hp.com", "lenovo.com", "asus.com", "acer.com", "lg.com",
];

// Stock-photo farms, social sites and hosts that block hotlinking or use watermarks.
const BLOCKED = [
  "pinterest.", "alamy.", "shutterstock.", "istockphoto.", "dreamstime.", "gettyimages.", "depositphotos.",
  "facebook.", "fbsbx.", "instagram.", "youtube.", "ytimg.", "twimg.", "twitter.", "reddit.", "tiktok.",
  "aliexpress.", "alibaba.", "temu.", "wish.com", "etsy.", "ebay.", "olx.", "quikr.", "lookaside",
];

const ACCESSORY_WORDS = new Set([
  "case", "cover", "tempered", "protector", "guard", "skin", "sticker", "charger", "cable", "strap", "band",
  "adapter", "stand", "mount", "bag", "sleeve", "refurbished", "renewed", "used", "box", "unboxing", "review",
]);
// A title that continues with one of these right after the model name is a different, larger/smaller model.
const VARIANT_WORDS = new Set([
  "pro", "plus", "max", "ultra", "lite", "neo", "fe", "se", "mini", "air", "edge", "fold", "flip", "gt", "turbo",
  "prime", "power", "active", "ace", "speed",
]);

// Lowercase, "+" -> "plus", split letter/digit boundaries so "CE4" == "CE 4" and "A5" != "A55".
export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/\+/g, " plus ")
    .replace(/([a-z])(\d)/g, "$1 $2")
    .replace(/(\d)([a-z])/g, "$1 $2")
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

export function stripBrand(model: string, brand: string): string[] {
  const m = tokens(model);
  const b = tokens(brand);
  if (b.length && b.every((t, i) => m[i] === t)) {
    const rest = m.slice(b.length);
    if (rest.length) return rest;
  }
  return m;
}

function indexOfSeq(hay: string[], needle: string[]): number {
  if (!needle.length) return -1;
  outer: for (let i = 0; i + needle.length <= hay.length; i++) {
    for (let j = 0; j < needle.length; j++) if (hay[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

export function titleMatchesModel(title: string, model: string, brand: string): boolean {
  const want = stripBrand(model, brand);
  const have = tokens(title);
  const at = indexOfSeq(have, want);
  if (at < 0) return false;
  if (have.some((t) => ACCESSORY_WORDS.has(t)) && !want.some((t) => ACCESSORY_WORDS.has(t))) return false;
  const next = have[at + want.length];
  if (next && VARIANT_WORDS.has(next) && !want.includes(next)) return false;
  // "Pixel 8" vs "Pixel 8a", "iPhone 17" vs "iPhone 17e": a lone letter right after a number is a variant suffix.
  if (next && /^[a-z]$/.test(next) && /^\d+$/.test(want[want.length - 1])) return false;
  return true;
}

const hostMatches = (host: string, list: string[]) => list.some((d) => host.includes(d));

export function queryFor(brand: string, model: string, category: string): string {
  const noun: Record<string, string> = {
    Mobiles: "smartphone", Laptops: "laptop", "Smart Watches": "smartwatch", Tablets: "tablet",
    Monitors: "monitor", Televisions: "TV", Cameras: "camera",
  };
  const hasBrand = tokens(model).slice(0, tokens(brand).length).join(" ") === tokens(brand).join(" ");
  return [hasBrand ? "" : brand, model, noun[category] ?? ""].filter(Boolean).join(" ");
}

export type Pick = { url: string; title: string; domain: string; width: number; height: number; score: number };

// Ranked candidates (best first) that plausibly show exactly this model.
export function rankCandidates(images: SerperImage[], brand: string, model: string): Pick[] {
  const out: Pick[] = [];
  for (const [i, img] of images.entries()) {
    const url = img.imageUrl ?? "";
    if (!/^https:\/\//i.test(url) || url.length > 600) continue;
    let host = "";
    try { host = new URL(url).hostname.toLowerCase(); } catch { continue; }
    const page = (img.domain ?? "").toLowerCase();
    if (hostMatches(host, BLOCKED) || hostMatches(page, BLOCKED)) continue;
    if (/\.(svg|gif)(\?|$)/i.test(url) || /^data:/i.test(url)) continue;

    const w = img.imageWidth ?? 0;
    const h = img.imageHeight ?? 0;
    if (Math.min(w, h) < 300) continue;
    const ratio = w / h;
    if (ratio < 0.5 || ratio > 2) continue;

    if (!titleMatchesModel(img.title ?? "", model, brand)) continue;

    let score = 20 - i;
    if (hostMatches(host, PREFERRED) || hostMatches(page, PREFERRED)) score += 30;
    score += Math.max(0, 10 - Math.abs(Math.log(ratio)) * 15);
    if (Math.min(w, h) >= 600) score += 8;
    out.push({ url, title: img.title ?? "", domain: page || host, width: w, height: h, score });
  }
  return out.sort((a, b) => b.score - a.score);
}
