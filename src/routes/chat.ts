import { Router } from "express";
import { z } from "zod";
import Anthropic from "@anthropic-ai/sdk";
import Product from "../models/Product.js";
import Faq from "../models/Faq.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { chatLimiter } from "../middleware/rateLimit.js";

const router = Router();

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(4000),
});

const chatSchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
});

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) return null;
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}

const SEARCH_PRODUCTS_TOOL: Anthropic.Tool = {
  name: "search_products",
  description:
    "Search the live SuggestionsForYou product catalog to find and recommend real products. " +
    "Use this whenever the user asks for a product recommendation, wants to compare options, or asks what to buy. " +
    "Call it with a query and/or category and/or a price ceiling; it returns real products with their current lowest price.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Free-text search, e.g. product name, brand, or need (\"gaming laptop\")." },
      category: {
        type: "string",
        description: "Exact category to filter by, if known.",
        enum: ["Mobiles", "Laptops", "Headphones", "Smart Watches", "Tablets", "Gaming", "Televisions", "Cameras", "Home Appliances", "Monitors"],
      },
      maxPrice: { type: "number", description: "Maximum budget in INR, if the user gave one." },
      minPrice: { type: "number", description: "Minimum price in INR, if relevant." },
      limit: { type: "number", description: "Max results to return (default 5, max 8)." },
    },
    additionalProperties: false,
  },
};

async function runSearchProducts(input: {
  query?: string;
  category?: string;
  maxPrice?: number;
  minPrice?: number;
  limit?: number;
}) {
  const filter: Record<string, unknown> = {};
  if (input.category) filter.category = input.category;
  if (input.query) filter.$text = { $search: input.query };
  if (input.maxPrice != null || input.minPrice != null) {
    filter.lowestPrice = {
      ...(input.minPrice != null ? { $gte: input.minPrice } : {}),
      ...(input.maxPrice != null ? { $lte: input.maxPrice } : {}),
    };
  }

  const limit = Math.min(Math.max(input.limit ?? 5, 1), 8);
  const products = await Product.find(filter).sort({ rating: -1 }).limit(limit).exec();

  return products.map((p) => ({
    name: p.name,
    brand: p.brand,
    category: p.category,
    lowestPrice: p.lowestPrice,
    originalPrice: p.originalPrice,
    discount: p.discount,
    rating: p.rating,
    reviews: p.reviews,
    inStock: p.inStock,
  }));
}

let cachedSystemPrompt: { text: string; expiresAt: number } | null = null;

async function buildSystemPrompt(): Promise<string> {
  if (cachedSystemPrompt && cachedSystemPrompt.expiresAt > Date.now()) {
    return cachedSystemPrompt.text;
  }

  const faqs = await Faq.find().sort({ order: 1 }).limit(9).lean();
  const faqBlock = faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n\n");

  const text = `You are the AI assistant embedded in SuggestionsForYou, an Indian AI-powered price comparison site that tracks prices across 5 retailers (Amazon, Flipkart, Croma, Reliance Digital, Vijay Sales) for electronics like mobiles, laptops, headphones, smart watches, tablets, gaming gear, TVs, cameras, and home appliances.

You have two jobs:
1. General site assistant — answer questions about how the site works, pricing, deals, price alerts, orders, accounts, and payments (Cash on Delivery is the only payment method today), using the FAQ knowledge below.
2. Product advisor — when the user wants product recommendations, help them find real products by calling the search_products tool. Always ground recommendations in tool results — never invent a product, price, or spec. Ask a brief clarifying question (budget, category, use case) if the request is too vague to search well.

Keep replies short and conversational (2-5 sentences, or a short list for recommendations). When you recommend a product, mention its name, its current lowest price in ₹, and one reason it fits. Don't use markdown headers. This is a chat widget, not a document.

Frequently asked questions (use these to answer general questions accurately):

${faqBlock}`;

  cachedSystemPrompt = { text, expiresAt: Date.now() + 10 * 60 * 1000 };
  return text;
}

router.post(
  "/",
  chatLimiter,
  asyncHandler(async (req, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    if (parsed.data.messages[parsed.data.messages.length - 1].role !== "user") {
      return res.status(400).json({ error: "The last message must be from the user" });
    }

    const anthropic = getClient();
    if (!anthropic) {
      return res.status(503).json({ error: "not_configured" });
    }
    const system = await buildSystemPrompt();

    const messages: Anthropic.MessageParam[] = parsed.data.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    let response = await anthropic.messages.create({
      model: "claude-opus-5",
      max_tokens: 1024,
      output_config: { effort: "medium" },
      system,
      tools: [SEARCH_PRODUCTS_TOOL],
      messages,
    });

    // Resolve at most a couple of tool-use rounds so a recommendation request
    // can search, then answer using the results.
    let rounds = 0;
    while (response.stop_reason === "tool_use" && rounds < 3) {
      rounds++;
      const toolUses = response.content.filter(
        (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
      );
      messages.push({ role: "assistant", content: response.content });

      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const use of toolUses) {
        try {
          const result = await runSearchProducts(use.input as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: use.id,
            content: JSON.stringify(result),
          });
        } catch (err) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: use.id,
            content: "Search failed.",
            is_error: true,
          });
        }
      }
      messages.push({ role: "user", content: toolResults });

      response = await anthropic.messages.create({
        model: "claude-opus-5",
        max_tokens: 1024,
        output_config: { effort: "medium" },
        system,
        tools: [SEARCH_PRODUCTS_TOOL],
        messages,
      });
    }

    if (response.stop_reason === "refusal") {
      return res.json({
        reply: "I can't help with that one — try asking me about products, deals, or how the site works.",
      });
    }

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === "text");
    res.json({ reply: textBlock?.text ?? "Sorry, I didn't catch that — could you rephrase?" });
  }),
);

export default router;
