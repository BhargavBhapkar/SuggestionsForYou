import { Router, type Request, type Response } from "express";
import Order from "../models/Order.js";
import { isRazorpayConfigured, toPaise, verifyWebhookSignature } from "../services/razorpay.js";
import { markOrderPaid } from "../services/orderPayments.js";

const router = Router();

// Lets the checkout page know whether to offer online payment.
router.get("/config", (_req, res) => {
  res.json({ online: isRazorpayConfigured() });
});

export default router;

// Razorpay's server-to-server notification. It covers buyers who pay and then close
// the tab before our verify-payment call happens. Mounted with a raw body parser in
// server.ts because the signature is computed over the exact bytes sent.
export async function razorpayWebhook(req: Request, res: Response) {
  if (!process.env.RAZORPAY_WEBHOOK_SECRET) return res.status(503).json({ error: "Webhook not configured" });

  const signature = req.get("x-razorpay-signature") ?? "";
  const raw = req.body as unknown;
  if (!Buffer.isBuffer(raw) || !verifyWebhookSignature(raw, signature)) {
    return res.status(400).json({ error: "Invalid signature" });
  }

  let event: { event?: string; payload?: { payment?: { entity?: { id?: string; order_id?: string; amount?: number } } } };
  try {
    event = JSON.parse(raw.toString("utf8"));
  } catch {
    return res.status(400).json({ error: "Invalid payload" });
  }

  if (event.event === "payment.captured" || event.event === "order.paid") {
    const payment = event.payload?.payment?.entity;
    const order = payment?.order_id ? await Order.findOne({ razorpayOrderId: payment.order_id }) : null;
    if (!payment?.id || !order) {
      console.warn("[payments] webhook for an unknown order:", payment?.order_id);
    } else if (payment.amount !== toPaise(order.total)) {
      console.error("[payments] webhook amount mismatch for order", String(order._id), payment.amount, "expected", toPaise(order.total));
    } else {
      await markOrderPaid(order, payment.id);
    }
  }
  res.json({ ok: true });
}
