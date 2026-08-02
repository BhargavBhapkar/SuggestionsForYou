const API_HOST = "real-time-amazon-data.p.rapidapi.com";

export interface AmazonProduct {
  asin: string;
  product_title: string;
  product_price: string | null;
  product_original_price: string | null;
  product_star_rating: string | null;
  product_num_ratings: number | null;
  product_photo: string | null;
  product_url: string | null;
}

interface SearchResponse {
  status: string;
  data?: {
    products: AmazonProduct[];
  };
}

function getApiKey(): string {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error("RAPIDAPI_KEY is not set — see .env");
  return key;
}

export async function searchAmazonProducts(query: string, opts: { country?: string; page?: number } = {}): Promise<AmazonProduct[]> {
  const { country = "IN", page = 1 } = opts;
  const url = new URL(`https://${API_HOST}/search`);
  url.searchParams.set("query", query);
  url.searchParams.set("page", String(page));
  url.searchParams.set("country", country);
  url.searchParams.set("sort_by", "RELEVANCE");
  url.searchParams.set("product_condition", "ALL");
  url.searchParams.set("is_prime", "false");

  const res = await fetch(url, {
    headers: {
      "x-rapidapi-host": API_HOST,
      "x-rapidapi-key": getApiKey(),
    },
  });

  if (!res.ok) {
    throw new Error(`Amazon search failed for "${query}" (${res.status}): ${await res.text().catch(() => res.statusText)}`);
  }

  const body = (await res.json()) as SearchResponse;
  return body.data?.products ?? [];
}

export function parsePrice(raw: string | null): number | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d.]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
