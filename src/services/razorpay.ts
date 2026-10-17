import crypto from "node:crypto";

// Razorpay's REST API. RAZORPAY_API_BASE exists only so tests can point at a local fake.
const API_BASE = () => process.env.RAZORPAY_API_BASE ?? "https://api.razorpay.com/v1";

export class PaymentError extends Error {}

export const isRazorpayConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

export type PaymentParams = { keyId: string; razorpayOrderId: string; amount: number; currency: string };

export const toPaise = (rupees: number) => Math.round(rupees * 100);

export async function createRazorpayOrder(input: { amountPaise: number; receipt: string }): Promise<{ id: string; amount: number; currency: string }> {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  let res: Response;
  try {
    res = await fetch(`${API_BASE()}/orders`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: input.amountPaise, currency: "INR", receipt: input.receipt }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch (err) {
    console.error("[razorpay] request failed:", err);
    throw new PaymentError("Couldn't reach the payment provider. Please try again.");
  }
  if (!res.ok) {
    console.error("[razorpay] create order failed:", res.status, await res.text().catch(() => ""));
    throw new PaymentError("Couldn't start the payment. Please try again.");
  }
  return (await res.json()) as { id: string; amount: number; currency: string };
}

function hmacMatches(secret: string, message: string | Buffer, signatureHex: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(message).digest();
  const given = Buffer.from(signatureHex, "hex");
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

// Checkout returns razorpay_signature = HMAC_SHA256(order_id + "|" + payment_id, key_secret).
export function verifyPaymentSignature(razorpayOrderId: string, razorpayPaymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  return hmacMatches(secret, `${razorpayOrderId}|${razorpayPaymentId}`, signature);
}

// Webhooks sign the raw request body with the webhook secret.
export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  return hmacMatches(secret, rawBody, signature);
}
