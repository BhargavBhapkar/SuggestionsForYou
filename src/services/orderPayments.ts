import Cart from "../models/Cart.js";
import type Order from "../models/Order.js";

type OrderDoc = InstanceType<typeof Order>;

// Marks an online order paid and removes the ordered lines from the buyer's cart.
// Safe to call twice for the same payment.
export async function markOrderPaid(order: OrderDoc, razorpayPaymentId: string): Promise<void> {
  if (order.paymentStatus === "paid") return;
  if (order.orderStatus === "cancelled") {
    console.error("[payments] payment received for a CANCELLED order, refund needed:", String(order._id), razorpayPaymentId);
  }
  order.paymentStatus = "paid";
  order.razorpayPaymentId = razorpayPaymentId;
  order.paidAt = new Date();
  await order.save();

  if (order.items.length > 0) {
    await Cart.updateOne(
      { user: order.user },
      { $pull: { items: { $or: order.items.map((it) => ({ product: it.product, storeName: it.storeName })) } } },
    );
  }
}
