import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { createOrderShipmentWorkflow } from "@medusajs/medusa/core-flows";
import { z } from "zod";
const Schema = z.object({
  fulfillment_id: z.string().min(1),
  carrier_name: z.string().trim().min(1).max(100),
  tracking_number: z.string().trim().min(1).max(150),
  tracking_url: z.string().url().refine((value) => new URL(value).protocol === "https:", "Takip bağlantısı HTTPS olmalı.").optional(),
  notify: z.boolean().default(true),
}).strict();
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: parsed.error.issues[0]?.message }); return; }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "order", filters: { id: req.params.id },
    fields: ["id", "status", "items.id", "items.quantity", "fulfillments.id", "fulfillments.metadata", "fulfillments.shipped_at", "fulfillments.canceled_at", "fulfillments.items.line_item_id"],
  });
  const order = data[0];
  const fulfillment = order?.fulfillments?.find((item) => item?.id === parsed.data.fulfillment_id);
  if (!order || !fulfillment) { res.status(404).json({ message: "Siparişe ait hazırlık kaydı bulunamadı." }); return; }
  if (order.status === "canceled" || fulfillment.canceled_at || fulfillment.shipped_at) {
    res.status(409).json({ message: "Bu hazırlık kaydı gönderime uygun değil veya zaten gönderilmiş." }); return;
  }
  const itemIds = new Set(fulfillment.items?.map((item) => item?.line_item_id));
  const items = (order.items || []).filter((item) => item && itemIds.has(item.id)).map((item) => ({ id: item!.id, quantity: item!.quantity }));
  if (!items.length) { res.status(409).json({ message: "Hazırlık kaydında gönderilecek ürün bulunamadı." }); return; }
  const fulfillmentModule = req.scope.resolve(Modules.FULFILLMENT);
  await fulfillmentModule.updateFulfillment(fulfillment.id, { metadata: { ...(fulfillment.metadata || {}), carrier_name: parsed.data.carrier_name } });
  await createOrderShipmentWorkflow(req.scope).run({
    input: {
      order_id: order.id, fulfillment_id: fulfillment.id, items,
      created_by: req.auth_context?.actor_id, no_notification: !parsed.data.notify,
      labels: [{ tracking_number: parsed.data.tracking_number, tracking_url: parsed.data.tracking_url || "", label_url: "" }],
    },
  });
  res.json({ ok: true });
}
