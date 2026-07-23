import { Schema, model } from "mongoose";

const testimonialSchema = new Schema({
  name: { type: String, required: true },
  role: { type: String, required: true },
  text: { type: String, required: true },
  avatar: { type: String, required: true },
  saved: { type: String, required: true },
  order: { type: Number, default: 0 },
});

export default model("Testimonial", testimonialSchema);
