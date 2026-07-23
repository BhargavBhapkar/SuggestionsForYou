import { Schema, model } from "mongoose";

const faqSchema = new Schema({
  q: { type: String, required: true },
  a: { type: String, required: true },
  order: { type: Number, default: 0 },
});

export default model("Faq", faqSchema);
