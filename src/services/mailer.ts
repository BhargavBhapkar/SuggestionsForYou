import nodemailer from "nodemailer";

export const INBOX_EMAIL = process.env.CONTACT_INBOX ?? "support@suggestionsforyou.com";

export const isMailConfigured = () => !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);

// Created on first use so the server starts fine without any SMTP settings.
let transport: nodemailer.Transporter | undefined;
function getTransport() {
  if (!transport) {
    const port = Number(process.env.SMTP_PORT) || 465;
    transport = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transport;
}

export interface OutgoingMail {
  subject: string;
  text: string;
  /** Where a reply should go (the visitor's address). */
  replyTo?: string;
}

/** Sends a mail to the shared inbox. Returns false (and logs) instead of throwing, so callers can still save the message. */
export async function sendToInbox(mail: OutgoingMail): Promise<boolean> {
  if (!isMailConfigured()) return false;
  try {
    await getTransport().sendMail({
      from: `"SuggestionsForYou website" <${process.env.SMTP_USER}>`,
      to: INBOX_EMAIL,
      replyTo: mail.replyTo,
      subject: mail.subject,
      text: mail.text,
    });
    return true;
  } catch (err) {
    console.error("[mailer] could not send mail:", err instanceof Error ? err.message : err);
    return false;
  }
}
