import { Schema, model } from "mongoose";

export const CONTACT_TOPICS = ["question", "suggestion", "order", "other"] as const;

const contactMessageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    topic: { type: String, enum: CONTACT_TOPICS, default: "question" },
    message: { type: String, required: true, trim: true, maxlength: 4000 },
    // true once the notification email to the inbox has been sent
    emailed: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export default model("ContactMessage", contactMessageSchema);
