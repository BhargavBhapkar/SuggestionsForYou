import { Schema, model } from "mongoose";

const categorySchema = new Schema({
  name: { type: String, required: true, unique: true },
  iconName: { type: String, required: true },
  count: { type: String, required: true },
  color: { type: String, required: true },
  bg: { type: String, required: true },
  darkBg: { type: String, required: true },
  order: { type: Number, default: 0 },
});

export default model("Category", categorySchema);
