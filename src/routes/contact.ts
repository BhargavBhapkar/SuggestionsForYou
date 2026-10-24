import { Router } from "express";
import { z } from "zod";
import ContactMessage, { CONTACT_TOPICS } from "../models/ContactMessage.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { contactLimiter } from "../middleware/rateLimit.js";
import { sendToInbox } from "../services/mailer.js";

const router = Router();

const contactSchema = z.object({
  name: z.string().trim().min(1, "Enter your name").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(254),
  topic: z.enum(CONTACT_TOPICS).default("question"),
  message: z.string().trim().min(10, "Please write a few more words").max(4000, "Message is too long"),
  // Honeypot: hidden from people in the form, bots tend to fill it in.
  website: z.string().max(200).optional(),
});

const TOPIC_LABEL: Record<(typeof CONTACT_TOPICS)[number], string> = {
  question: "Question",
  suggestion: "Suggestion",
  order: "Order help",
  other: "Other",
};

// The message is always saved first; the email to the inbox is a best-effort notification on top.
router.post(
  "/",
  contactLimiter,
  asyncHandler(async (req, res) => {
    const parsed = contactSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    }
    const { website, ...data } = parsed.data;
    // Pretend it worked so a bot learns nothing, but store nothing.
    if (website) return res.status(201).json({ ok: true });

    const saved = await ContactMessage.create(data);
    const emailed = await sendToInbox({
      subject: `[${TOPIC_LABEL[data.topic]}] ${data.name}`,
      replyTo: data.email,
      text: `From: ${data.name} <${data.email}>\nTopic: ${TOPIC_LABEL[data.topic]}\n\n${data.message}\n`,
    });
    if (emailed) await ContactMessage.updateOne({ _id: saved._id }, { emailed: true });

    res.status(201).json({ ok: true });
  }),
);

export default router;
