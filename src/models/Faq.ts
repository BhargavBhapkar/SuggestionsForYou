import { Schema, model } from "mongoose";

const translationSchema = new Schema(
  { q: { type: String, required: true }, a: { type: String, required: true } },
  { _id: false },
);

const faqSchema = new Schema({
  q: { type: String, required: true },
  a: { type: String, required: true },
  order: { type: Number, default: 0 },
  translations: {
    hi: { type: translationSchema },
    gu: { type: translationSchema },
  },
});

export default model("Faq", faqSchema);
