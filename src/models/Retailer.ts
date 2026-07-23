import { Schema, model } from "mongoose";

const retailerSchema = new Schema({
  name: { type: String, required: true, unique: true },
  abbr: { type: String, required: true },
  color: { type: String, required: true },
  order: { type: Number, default: 0 },
});

export default model("Retailer", retailerSchema);
