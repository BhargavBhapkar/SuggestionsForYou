import { Schema, model, type InferSchemaType } from "mongoose";

const storeOfferSchema = new Schema(
  {
    name: { type: String, required: true },
    abbr: { type: String, required: true },
    color: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    inStock: { type: Boolean, default: true },
    verified: { type: Boolean, default: true },
    deliveryLabel: { type: String, default: "Free Delivery" },
    deliveryTime: { type: String, default: "3 days" },
    offer: { type: String },
    cashback: { type: String },
    coupon: { type: String },
    rating: { type: Number, default: 4.5 },
    reviews: { type: Number, default: 0 },
    badge: { type: String },
    lowestEver: { type: Boolean, default: false },
  },
  { _id: false },
);

const pricePointSchema = new Schema(
  {
    day: { type: String, required: true },
    amazon: { type: Number, required: true },
    flipkart: { type: Number, required: true },
    croma: { type: Number, required: true },
  },
  { _id: false },
);

const specSchema = new Schema(
  { label: { type: String, required: true }, value: { type: String, required: true } },
  { _id: false },
);

const productSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    brand: { type: String, required: true },
    category: { type: String, required: true, index: true },
    image: { type: String, required: true },
    rating: { type: Number, required: true, default: 4.5 },
    reviews: { type: Number, required: true, default: 0 },
    lowestPrice: { type: Number, required: true },
    originalPrice: { type: Number, required: true },
    discount: { type: Number, required: true },
    badge: { type: String },
    tags: { type: [String], default: [], index: true },
    inStock: { type: Boolean, default: true },
    stores: { type: [storeOfferSchema], default: [] },
    aiScore: { type: Number },
    aiReason: { type: String },
    dealStore: { type: String },
    dealStoreColor: { type: String },
    dealStock: { type: Number },
    dealLimited: { type: Boolean },
    specs: { type: [specSchema], default: [] },
    priceHistory: {
      "30d": { type: [pricePointSchema], default: [] },
      "90d": { type: [pricePointSchema], default: [] },
      "1y": { type: [pricePointSchema], default: [] },
    },
  },
  { timestamps: true },
);

productSchema.index({ name: "text", brand: "text", category: "text" });

export type ProductDoc = InferSchemaType<typeof productSchema>;
export default model("Product", productSchema);
