import { Schema, model } from "mongoose";

const subscriberSchema = new Schema(
  { email: { type: String, required: true, unique: true, lowercase: true, trim: true } },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export default model("Subscriber", subscriberSchema);
