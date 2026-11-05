import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/** Resend shipment information using only the order's persisted shipment data. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "order", filters: { id: req.params.id },
    fields: ["id", "email", "display_id", "status", "fulfillments.id", "fulfillments.metadata", "fulfillments.shipped_at", "fulfillments.canceled_at", "fulfillments.labels.tracking_number", "fulfillments.labels.tracking_url"],
  });
  const order = data[0];
  if (!order) { res.status(404).json({ message: "Sipariş bulunamadı." }); return; }
  if (!order.email) { res.status(409).json({ message: "Siparişte e-posta adresi yok." }); return; }
  const shipments = (order.fulfillments || []).filter((row) => row && row.shipped_at && !row.canceled_at);
  if (order.status === "canceled" || !shipments.length) {
    res.status(409).json({ message: "Siparişin kargoya verilmiş gönderisi yok." }); return;
  }
  const notifications = req.scope.resolve(Modules.NOTIFICATION);
  for (const shipment of shipments) {
    if (!shipment) continue;
    const labels = shipment.labels || [];
    await notifications.createNotifications([{
      to: order.email, channel: "email", template: "order.shipped",
      data: {
        order_no: order.display_id ? "#" + order.display_id : order.id.slice(-8).toUpperCase(),
        carrier: shipment.metadata?.carrier_name || "Kargo",
        tracking_number: labels.map((label) => label?.tracking_number).filter(Boolean).join(", "),
        tracking_url: labels.find((label) => label?.tracking_url)?.tracking_url || "",
      },
    }]);
  }
  res.json({ ok: true });
}
