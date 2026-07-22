import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows";

/**
 * POST /store/orders/:id/cancel
 *
 * Giriş yapmış müşterinin KENDİ siparişini iptal etmesi.
 *
 * Auth: Medusa'nın store auth middleware'i `req.auth_context.actor_id` ile
 * customer_id verir; login değilse 401.
 *
 * Kurallar (müşteri kendisi iptal edebilir):
 *   - sipariş kendisine ait olmalı
 *   - iptal/tamamlanmış olmamalı
 *   - henüz hazırlanmamış/kargolanmamış olmalı (fulfillment_status = not_fulfilled)
 *
 * cancelOrderWorkflow captured ödemeleri (iyzico) OTOMATİK iade eder ve
 * siparişi iptal statüsüne çeker.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customerId = (req as any).auth_context?.actor_id as string | undefined;
  if (!customerId) {
    res.status(401).json({ message: "Bu işlem için giriş yapmalısınız." });
    return;
  }

  const orderId = req.params.id as string;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: orders } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "status", "fulfillment_status", "display_id"],
    filters: { id: orderId },
  });
  const order = orders?.[0];

  if (!order) {
    res.status(404).json({ message: "Sipariş bulunamadı." });
    return;
  }
  if (order.customer_id !== customerId) {
    res.status(403).json({ message: "Bu sipariş size ait değil." });
    return;
  }

  const status = String(order.status || "").toLowerCase();
  const fulfillment = String(order.fulfillment_status || "").toLowerCase();

  if (status === "canceled") {
    res.status(400).json({ message: "Bu sipariş zaten iptal edilmiş." });
    return;
  }
  if (status === "completed" || status === "archived") {
    res.status(400).json({
      message:
        "Tamamlanmış sipariş iptal edilemez. Lütfen iade talebi için bizimle iletişime geçin.",
    });
    return;
  }
  if (fulfillment && fulfillment !== "not_fulfilled") {
    res.status(400).json({
      message:
        "Siparişiniz hazırlık/kargo aşamasında olduğu için buradan iptal edilemiyor. Lütfen bizimle iletişime geçin.",
    });
    return;
  }

  try {
    await cancelOrderWorkflow(req.scope).run({
      input: { order_id: orderId, canceled_by: customerId },
    });
    res.json({
      ok: true,
      message:
        "Siparişiniz iptal edildi. Ödeme alındıysa iade süreci başlatıldı.",
    });
  } catch (e) {
    res.status(500).json({
      message:
        "Sipariş iptal edilemedi. Lütfen tekrar deneyin veya bizimle iletişime geçin.",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
