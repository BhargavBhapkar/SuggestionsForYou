// Source data ported from the frontend's former hardcoded src/app/data/products.ts,
// SearchResultsPage.tsx, and PriceComparisonPage.tsx mock arrays.

export const CATEGORIES = [
  { name: "Mobiles", iconName: "Smartphone", count: "12,450+", color: "#3B82F6", bg: "#EFF6FF", darkBg: "#1e3a5f" },
  { name: "Laptops", iconName: "Laptop", count: "8,230+", color: "#8B5CF6", bg: "#F5F3FF", darkBg: "#2d1f5e" },
  { name: "Headphones", iconName: "Headphones", count: "5,120+", color: "#EC4899", bg: "#FDF2F8", darkBg: "#4a1942" },
  { name: "Smart Watches", iconName: "Watch", count: "4,560+", color: "#F97316", bg: "#FFF7ED", darkBg: "#431407" },
  { name: "Tablets", iconName: "Monitor", count: "3,120+", color: "#06B6D4", bg: "#ECFEFF", darkBg: "#0c3d47" },
  { name: "Gaming", iconName: "Gamepad2", count: "6,340+", color: "#10B981", bg: "#ECFDF5", darkBg: "#064e3b" },
  { name: "Televisions", iconName: "Tv", count: "2,780+", color: "#EF4444", bg: "#FEF2F2", darkBg: "#450a0a" },
  { name: "Cameras", iconName: "Camera", count: "3,890+", color: "#F59E0B", bg: "#FFFBEB", darkBg: "#451a03" },
  { name: "Home Appliances", iconName: "Home", count: "9,120+", color: "#14B8A6", bg: "#F0FDFA", darkBg: "#042f2e" },
].map((c, i) => ({ ...c, order: i }));

export const RETAILERS = [
  { name: "Amazon", abbr: "AMZ", color: "#FF9900" },
  { name: "Flipkart", abbr: "FK", color: "#2874F0" },
  { name: "Croma", abbr: "CR", color: "#9E1C30" },
  { name: "Reliance Digital", abbr: "RD", color: "#E31E27" },
  { name: "Vijay Sales", abbr: "VS", color: "#E8320D" },
].map((r, i) => ({ ...r, order: i }));

export const TESTIMONIALS = [
  {
    name: "Rohit Verma", role: "Gadget Reviewer",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=96&h=96&fit=crop&auto=format",
    text: "As someone who reviews tech daily, I use SuggestionsForYou to track prices all the time. The price history accuracy is the best I've seen across any comparison tool.",
    saved: "₹8,400",
  },
  {
    name: "Anjali Mehta", role: "Working Professional",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&fit=crop&auto=format",
    text: "Saved ₹12,000 on my MacBook by waiting just 3 extra days as the AI recommended. I've been telling every colleague about this platform since then.",
    saved: "₹12,000",
  },
  {
    name: "Arjun Singh", role: "College Student",
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&fit=crop&auto=format",
    text: "I'm on a tight budget. SuggestionsForYou is the first thing I open before buying anything online. Found my headphones 40% cheaper than anywhere else.",
    saved: "₹6,200",
  },
  {
    name: "Priya Sharma", role: "E-commerce Manager",
    avatar: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=96&h=96&fit=crop&auto=format",
    text: "We use this to benchmark our own pricing strategy. The real-time data and historical accuracy are genuinely impressive. Worth every rupee our team saves.",
    saved: "₹25,000+",
  },
  {
    name: "Kavita Nair", role: "Homemaker",
    avatar: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=96&h=96&fit=crop&auto=format",
    text: "Found the best deal on a washing machine during the sale season. The AI said to wait 2 more days — I'm so glad I listened. Saved ₹4,500 instantly.",
    saved: "₹4,500",
  },
  {
    name: "Dev Kapoor", role: "Tech Entrepreneur",
    avatar: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=96&h=96&fit=crop&auto=format",
    text: "The coupon discovery feature alone has paid for itself 100x over. It automatically finds and validates promo codes I'd never find manually. Phenomenal product.",
    saved: "₹18,700",
  },
].map((t, i) => ({ ...t, order: i }));

export const FAQS = [
  {
    q: "How does SuggestionsForYou find the best price?",
    a: "We connect to 50+ verified Indian retailers in real-time and aggregate their live prices every 15 minutes. Our AI identifies the genuine lowest price, validates stock availability, and factors in delivery charges and applicable coupons to give you the true best deal.",
  },
  {
    q: "Is SuggestionsForYou completely free to use?",
    a: "Yes, completely free. You can compare prices, view full price history charts, and browse all product categories without creating an account. Our Pro plan adds unlimited price alerts, extended 24-month history, and AI buy-timing recommendations.",
  },
  {
    q: "How accurate are the prices shown?",
    a: "Prices are refreshed every 15 minutes for most products and every 5 minutes for trending and flash-deal items. We verify prices directly against retailer APIs and live product pages, maintaining 99.2% accuracy across all listed products.",
  },
  {
    q: "How do Price Drop Alerts work?",
    a: "Set a target price for any product. We monitor all 50+ retailers 24/7 and send you an instant email or SMS notification the moment any retailer's price drops to or below your target. You can set multiple alerts for the same product across different retailers.",
  },
  {
    q: "Which Indian retailers are covered?",
    a: "We currently cover Amazon India, Flipkart, Croma, Reliance Digital, Vijay Sales, Samsung Shop, Apple India, and 40+ more retailers. We're continuously adding new retailers based on user demand and coverage requests.",
  },
  {
    q: "How does the AI price prediction work?",
    a: "Our ML models are trained on 2+ years of historical price data across millions of products. They identify seasonal patterns, flash sale cycles, and restocking trends to predict — with 94% accuracy — whether a price will drop within the next 30 days and by approximately how much.",
  },
  {
    q: "Can I compare prices for any product?",
    a: "You can search for virtually any consumer electronics, home appliance, gadget, or accessory sold by major Indian retailers. We currently index 2.4 million+ products and add thousands of new products daily based on live search demand.",
  },
  {
    q: "Do you share my personal data with retailers?",
    a: "Absolutely not. We never share your personal data, search history, or alert preferences with retailers or any third parties. We earn revenue through affiliate commissions when you click through to purchase — at absolutely no extra cost to you.",
  },
  {
    q: "How are coupon codes discovered and verified?",
    a: "Our system automatically discovers and validates coupon codes from official retailer sources, community contributions, and partner relationships. Every code is tested before being shown to you. Invalid or expired codes are removed within minutes of detection.",
  },
].map((f, i) => ({ ...f, order: i }));

// ─── Product catalog ────────────────────────────────────────────────────────
// Each raw entry below is merged by name across the old TRENDING_PRODUCTS /
// AI_PRODUCTS / FLASH_DEALS / search-results mock arrays. buildProducts() then
// derives a realistic 5-retailer store breakdown and price history scaled to
// each product's own price, instead of every product sharing identical
// hardcoded retailer figures like the old frontend mock did.

interface RawProduct {
  name: string;
  brand: string;
  category: string;
  image: string;
  rating: number;
  reviews: number;
  lowestPrice: number;
  originalPrice: number;
  discount: number;
  badge?: string;
  tags: string[];
  inStock?: boolean;
  aiScore?: number;
  aiReason?: string;
  dealStore?: string;
  dealStoreColor?: string;
  dealStock?: number;
  dealLimited?: boolean;
}

const RAW_PRODUCTS: RawProduct[] = [
  { name: "Samsung Galaxy S25 Ultra", brand: "Samsung", category: "Mobiles", image: "https://images.unsplash.com/photo-1610945264803-c22b62d2a7b3?w=500&h=500&fit=crop&auto=format", rating: 4.8, reviews: 14320, lowestPrice: 124999, originalPrice: 134999, discount: 7, badge: "Trending", tags: ["trending", "search"], inStock: true },
  { name: "Apple MacBook Air M4", brand: "Apple", category: "Laptops", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop&auto=format", rating: 4.9, reviews: 7890, lowestPrice: 112900, originalPrice: 129900, discount: 13, badge: "New Launch", tags: ["trending"] },
  { name: "Sony Bravia 65\" OLED", brand: "Sony", category: "Televisions", image: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500&h=500&fit=crop&auto=format", rating: 4.7, reviews: 3240, lowestPrice: 189990, originalPrice: 249990, discount: 24, badge: "Best Deal", tags: ["trending"] },
  { name: "Canon EOS R6 Mark II", brand: "Canon", category: "Cameras", image: "https://images.unsplash.com/photo-1495707902641-75cac588d2e9?w=500&h=500&fit=crop&auto=format", rating: 4.8, reviews: 2180, lowestPrice: 249995, originalPrice: 294995, discount: 15, badge: "Editor's Pick", tags: ["trending"] },
  { name: "Apple AirPods Pro 2", brand: "Apple", category: "Headphones", image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500&h=500&fit=crop&auto=format", rating: 4.8, reviews: 31200, lowestPrice: 19900, originalPrice: 26900, discount: 26, badge: "Top Rated", tags: ["trending", "deal"], dealStore: "Flipkart", dealStoreColor: "#2874F0", dealStock: 8, dealLimited: true },
  { name: "Apple Watch Series 10", brand: "Apple", category: "Smart Watches", image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&h=500&fit=crop&auto=format", rating: 4.7, reviews: 9870, lowestPrice: 39900, originalPrice: 45900, discount: 13, badge: "Popular", tags: ["trending"] },
  { name: "OnePlus Pad 2", brand: "OnePlus", category: "Tablets", image: "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=500&h=500&fit=crop&auto=format", rating: 4.6, reviews: 5430, lowestPrice: 39999, originalPrice: 49999, discount: 20, badge: "Value Pick", tags: ["trending"] },
  { name: "PS5 Slim Digital Edition", brand: "Sony", category: "Gaming", image: "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=500&h=500&fit=crop&auto=format", rating: 4.9, reviews: 18760, lowestPrice: 44990, originalPrice: 54990, discount: 18, badge: "Hot", tags: ["trending"] },

  { name: "Samsung 65\" 4K QLED TV", brand: "Samsung", category: "Televisions", image: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=600&h=400&fit=crop&auto=format", rating: 4.6, reviews: 4210, lowestPrice: 79990, originalPrice: 129990, discount: 38, tags: ["deal"], dealStore: "Flipkart", dealStoreColor: "#2874F0", dealStock: 12, dealLimited: true },
  { name: "boAt Rockerz 550 Pro", brand: "boAt", category: "Headphones", image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=600&h=400&fit=crop&auto=format", rating: 4.2, reviews: 9840, lowestPrice: 1799, originalPrice: 4999, discount: 64, tags: ["deal"], dealStore: "Amazon", dealStoreColor: "#FF9900", dealStock: 47, dealLimited: true },
  { name: "Lenovo IdeaPad Slim 5", brand: "Lenovo", category: "Laptops", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600&h=400&fit=crop&auto=format", rating: 4.3, reviews: 2650, lowestPrice: 49990, originalPrice: 79990, discount: 37, tags: ["deal"], inStock: false, dealStore: "Croma", dealStoreColor: "#9E1C30", dealStock: 0, dealLimited: false },
  { name: "GoPro Hero 13 Black", brand: "GoPro", category: "Cameras", image: "https://images.unsplash.com/photo-1685615359827-aa31d97578e7?w=600&h=400&fit=crop&auto=format", rating: 4.7, reviews: 3980, lowestPrice: 32990, originalPrice: 49990, discount: 34, tags: ["deal"], dealStore: "Amazon", dealStoreColor: "#FF9900", dealStock: 23, dealLimited: true },
  { name: "OnePlus 13 5G", brand: "OnePlus", category: "Mobiles", image: "https://images.unsplash.com/photo-1672413514634-4781b15fd89e?w=600&h=400&fit=crop&auto=format", rating: 4.6, reviews: 6210, lowestPrice: 54999, originalPrice: 69999, discount: 21, tags: ["deal"], dealStore: "Reliance Digital", dealStoreColor: "#E31E27", dealStock: 31, dealLimited: true },
  { name: "Sony WH-1000XM5", brand: "Sony", category: "Headphones", image: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&h=400&fit=crop&auto=format", rating: 4.8, reviews: 11200, lowestPrice: 24990, originalPrice: 34990, discount: 29, tags: ["deal"], inStock: true, dealStore: "Vijay Sales", dealStoreColor: "#E8320D", dealStock: 19, dealLimited: false },
  { name: "iPad Air M2", brand: "Apple", category: "Tablets", image: "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=600&h=400&fit=crop&auto=format", rating: 4.8, reviews: 8340, lowestPrice: 59900, originalPrice: 74900, discount: 20, tags: ["deal"], dealStore: "Amazon", dealStoreColor: "#FF9900", dealStock: 5, dealLimited: true },

  { name: "iPhone 16 Pro Max", brand: "Apple", category: "Mobiles", image: "https://images.unsplash.com/photo-1571380401583-72ca84994796?w=400&h=400&fit=crop&auto=format", rating: 4.9, reviews: 21400, lowestPrice: 134900, originalPrice: 144900, discount: 7, tags: ["aiPick"], aiScore: 98, aiReason: "Price is at a 6-month low. 97% probability of ₹3,000 further drop in 30 days." },
  { name: "Samsung Galaxy Tab S10 Ultra", brand: "Samsung", category: "Tablets", image: "https://images.unsplash.com/photo-1561154464-82e9adf32764?w=400&h=400&fit=crop&auto=format", rating: 4.6, reviews: 3120, lowestPrice: 89999, originalPrice: 109999, discount: 18, tags: ["aiPick", "search"], aiScore: 95, aiReason: "Festival season discount active. Historically the lowest price of the year." },
  { name: "Sony WH-1000XM6", brand: "Sony", category: "Headphones", image: "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=400&h=400&fit=crop&auto=format", rating: 4.8, reviews: 4670, lowestPrice: 29990, originalPrice: 35990, discount: 17, tags: ["aiPick"], aiScore: 92, aiReason: "Newer model released. Previous gen at 25% off — exceptional value right now." },
  { name: "Dell XPS 15 (2025)", brand: "Dell", category: "Laptops", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=400&fit=crop&auto=format", rating: 4.5, reviews: 1890, lowestPrice: 149990, originalPrice: 169990, discount: 12, tags: ["aiPick"], aiScore: 89, aiReason: "New refresh announced. Current model discounted as retailers clear stock." },
  { name: "Garmin Fenix 8", brand: "Garmin", category: "Smart Watches", image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=400&h=400&fit=crop&auto=format", rating: 4.7, reviews: 2340, lowestPrice: 89990, originalPrice: 99990, discount: 10, tags: ["aiPick"], aiScore: 87, aiReason: "Limited cashback offer on Flipkart. Best price window in 12 months." },
  { name: "LG OLED C4 55\"", brand: "LG", category: "Televisions", image: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=400&h=400&fit=crop&auto=format", rating: 4.6, reviews: 3980, lowestPrice: 139990, originalPrice: 169990, discount: 18, tags: ["aiPick"], aiScore: 84, aiReason: "Price dropped 18% in last 2 weeks. AI predicts stable pricing for 30 days." },

  { name: "Samsung Galaxy A55 5G", brand: "Samsung", category: "Mobiles", image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=500&h=500&fit=crop&auto=format", rating: 4.5, reviews: 8230, lowestPrice: 34999, originalPrice: 41999, discount: 17, tags: ["search"] },
  { name: "Samsung 65\" QLED 4K Smart TV", brand: "Samsung", category: "Televisions", image: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500&h=500&fit=crop&auto=format", rating: 4.7, reviews: 5410, lowestPrice: 89990, originalPrice: 129990, discount: 31, tags: ["search", "aiPick"], aiScore: 90, aiReason: "Exchange offer active — effective discount is the best seen this quarter." },
  { name: "Samsung Galaxy Watch 7", brand: "Samsung", category: "Smart Watches", image: "https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=500&h=500&fit=crop&auto=format", rating: 4.5, reviews: 6780, lowestPrice: 29999, originalPrice: 39999, discount: 25, tags: ["search"] },
  { name: "Samsung Galaxy Buds 3 Pro", brand: "Samsung", category: "Headphones", image: "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=500&h=500&fit=crop&auto=format", rating: 4.4, reviews: 4230, lowestPrice: 16999, originalPrice: 22999, discount: 26, tags: ["search"] },
  { name: "Samsung Galaxy Z Fold 6", brand: "Samsung", category: "Mobiles", image: "https://images.unsplash.com/photo-1721864428881-dbabb9ea0017?w=500&h=500&fit=crop&auto=format", rating: 4.6, reviews: 2980, lowestPrice: 164999, originalPrice: 189999, discount: 13, tags: ["search", "aiPick"], aiScore: 88, aiReason: "Trade-in offer stacks with card discount for the best effective price yet." },
  { name: "Samsung 55\" Crystal UHD 4K", brand: "Samsung", category: "Televisions", image: "https://images.unsplash.com/photo-1593784991095-a205069470b6?w=500&h=500&fit=crop&auto=format", rating: 4.3, reviews: 7810, lowestPrice: 42990, originalPrice: 59990, discount: 28, tags: ["search"] },
  { name: "Samsung Galaxy Book4 Pro", brand: "Samsung", category: "Laptops", image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500&h=500&fit=crop&auto=format", rating: 4.7, reviews: 1920, lowestPrice: 149990, originalPrice: 179990, discount: 17, tags: ["search"] },
  { name: "Samsung 8 kg Front Load Washer", brand: "Samsung", category: "Home Appliances", image: "https://images.unsplash.com/photo-1626806819282-2c1dc01a5e0c?w=500&h=500&fit=crop&auto=format", rating: 4.4, reviews: 3340, lowestPrice: 41990, originalPrice: 56990, discount: 26, tags: ["search"], inStock: false },
  { name: "Samsung Galaxy F55 5G", brand: "Samsung", category: "Mobiles", image: "https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=500&h=500&fit=crop&auto=format", rating: 4.3, reviews: 5670, lowestPrice: 26999, originalPrice: 32999, discount: 18, tags: ["search"] },
  { name: "Samsung 1.5T Wind-Free AC", brand: "Samsung", category: "Home Appliances", image: "https://images.unsplash.com/photo-1667983453881-4992fe86ab1b?w=500&h=500&fit=crop&auto=format", rating: 4.5, reviews: 2890, lowestPrice: 55990, originalPrice: 74990, discount: 25, tags: ["search"] },
];

const PHONE_SPECS = [
  { label: "Display", value: "6.8″ QHD+ Dynamic AMOLED 2X, 120 Hz" },
  { label: "Processor", value: "Snapdragon 8 Elite (4 nm)" },
  { label: "RAM / Storage", value: "12 GB RAM · 256 GB UFS 4.0" },
  { label: "Rear Camera", value: "200 MP main + 50 MP tele + 10 MP ultra-wide" },
  { label: "Battery", value: "5,000 mAh · 45W wired · 15W wireless" },
  { label: "OS", value: "Android 15 · One UI 7" },
  { label: "Build", value: "Armor Aluminium 2 · Corning Gorilla Armor 2" },
  { label: "5G", value: "Yes · Wi-Fi 7 · Bluetooth 5.4 · NFC" },
];

// Retailer offsets relative to lowestPrice, modelled on the original mock's
// Samsung Galaxy S25 Ultra comparison table (Amazon cheapest, Croma priciest).
const STORE_TEMPLATE = [
  { name: "Amazon", abbr: "AMZ", color: "#FF9900", offsetPct: 0, deliveryLabel: "Free Delivery", deliveryTime: "2 days", offer: "10% Bank Offer", cashback: true, coupon: "SAVE10", best: true, lowestEver: true, inStock: true, verified: true, badge: "Best Value" },
  { name: "Flipkart", abbr: "FK", color: "#2874F0", offsetPct: 0.019, deliveryLabel: "Free Delivery", deliveryTime: "3 days", offer: "5% Cashback", cashback: true, coupon: "FK5CB", best: false, lowestEver: false, inStock: true, verified: true },
  { name: "Vijay Sales", abbr: "VS", color: "#E8320D", offsetPct: 0.028, deliveryLabel: "Free Delivery", deliveryTime: "3 days", offer: "Gift Card ₹2,000", cashback: false, coupon: "VS2K", best: false, lowestEver: false, inStock: false, verified: true },
  { name: "Reliance Digital", abbr: "RD", color: "#E31E27", offsetPct: 0.054, deliveryLabel: "Free Delivery", deliveryTime: "5 days", offer: "0% EMI — 6 months", cashback: false, coupon: "EMI6", best: false, lowestEver: false, inStock: true, verified: true },
  { name: "Croma", abbr: "CR", color: "#9E1C30", offsetPct: 0.071, deliveryLabel: "₹99 Delivery", deliveryTime: "4 days", offer: "Exchange Bonus", cashback: false, coupon: "", best: false, lowestEver: false, inStock: true, verified: false },
];

export function buildStores(lowestPrice: number, originalPrice: number, reviews: number, rating: number) {
  return STORE_TEMPLATE.map((t, i) => {
    const price = Math.round((lowestPrice * (1 + t.offsetPct)) / 10) * 10;
    return {
      name: t.name, abbr: t.abbr, color: t.color,
      price, originalPrice,
      inStock: t.inStock, verified: t.verified,
      deliveryLabel: t.deliveryLabel, deliveryTime: t.deliveryTime,
      offer: t.offer,
      cashback: t.cashback ? `₹${Math.round(price * 0.01).toLocaleString("en-IN")} cashback` : undefined,
      coupon: t.coupon || undefined,
      rating: Math.round(Math.max(3.8, rating - i * 0.05) * 10) / 10,
      reviews: Math.max(200, Math.round(reviews / (i + 1))),
      badge: t.badge,
      lowestEver: t.lowestEver,
      url: undefined as string | undefined,
    };
  });
}

export function buildPriceHistory(lowestPrice: number) {
  // Same relative shape as the original mock's PH_30D/90D/1Y, scaled to this
  // product's actual current price instead of one hardcoded absolute figure.
  const scale = lowestPrice / 111900;
  const round = (n: number) => Math.round((n * scale) / 10) * 10;
  return {
    "30d": [
      { day: "1 Jul", amazon: round(119900), flipkart: round(121999), croma: round(125900) },
      { day: "8 Jul", amazon: round(117900), flipkart: round(119900), croma: round(124900) },
      { day: "15 Jul", amazon: round(115900), flipkart: round(117900), croma: round(122900) },
      { day: "22 Jul", amazon: round(113900), flipkart: round(115900), croma: round(120900) },
      { day: "29 Jul", amazon: round(111900), flipkart: round(113999), croma: round(119900) },
    ],
    "90d": [
      { day: "May", amazon: round(129900), flipkart: round(131999), croma: round(134900) },
      { day: "Jun", amazon: round(124900), flipkart: round(126999), croma: round(129900) },
      { day: "Jul", amazon: round(119900), flipkart: round(121999), croma: round(124900) },
      { day: "Aug", amazon: round(115900), flipkart: round(117999), croma: round(119900) },
      { day: "Sep", amazon: round(111900), flipkart: round(113999), croma: round(117900) },
    ],
    "1y": [
      { day: "Oct 23", amazon: round(139900), flipkart: round(141999), croma: round(144900) },
      { day: "Jan 24", amazon: round(134900), flipkart: round(136999), croma: round(139900) },
      { day: "Apr 24", amazon: round(129900), flipkart: round(131999), croma: round(134900) },
      { day: "Jul 24", amazon: round(124900), flipkart: round(126999), croma: round(129900) },
      { day: "Oct 24", amazon: round(119900), flipkart: round(121999), croma: round(124900) },
      { day: "Jan 25", amazon: round(111900), flipkart: round(113999), croma: round(117900) },
    ],
  };
}

export function buildProducts() {
  return RAW_PRODUCTS.map((p) => ({
    name: p.name,
    brand: p.brand,
    category: p.category,
    image: p.image,
    rating: p.rating,
    reviews: p.reviews,
    lowestPrice: p.lowestPrice,
    originalPrice: p.originalPrice,
    discount: p.discount,
    badge: p.badge,
    tags: p.tags,
    inStock: p.inStock ?? true,
    stores: buildStores(p.lowestPrice, p.originalPrice, p.reviews, p.rating),
    aiScore: p.aiScore,
    aiReason: p.aiReason,
    dealStore: p.dealStore,
    dealStoreColor: p.dealStoreColor,
    dealStock: p.dealStock,
    dealLimited: p.dealLimited,
    specs: p.category === "Mobiles" ? PHONE_SPECS : [],
    priceHistory: buildPriceHistory(p.lowestPrice),
  }));
}
