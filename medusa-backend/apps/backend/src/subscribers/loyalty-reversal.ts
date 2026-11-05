import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { Modules } from "@medusajs/framework/utils";
import type LoyaltyService from "../modules/loyalty/service";
import { LOYALTY_MODULE } from "../modules/loyalty";

export default async function loyaltyReversal({ event, container }: SubscriberArgs<{ id?: string; order_id?: string; return_id?: string }>) {
  const isCancel = event.name === "order.canceled";
  const orderId = isCancel ? event.data.id : event.data.order_id;
  if (!orderId || (!isCancel && !event.data.return_id)) throw new Error("Puan düzeltmesi için sipariş/iade kimliği eksik.");
  const order = await container.resolve(Modules.ORDER).retrieveOrder(orderId, { relations: ["summary"] });
  if (!order.customer_id || order.currency_code?.toLowerCase() !== "try") return;
  const total = isCancel ? 0 : Number(order.summary?.current_order_total ?? order.total);
  if (!Number.isFinite(total) || total < 0) throw new Error("İade sonrası sipariş tutarı alınamadı.");
  await container.resolve<LoyaltyService>(LOYALTY_MODULE).reverseForOrder({
    customerId: order.customer_id,
    orderId,
    eventKey: isCancel ? `cancel:${orderId}` : `return:${orderId}:${event.data.return_id}`,
    totalTry: total,
  });
}

export const config: SubscriberConfig = { event: ["order.canceled", "order.return_received"] };
