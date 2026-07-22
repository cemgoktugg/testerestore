import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import type LoyaltyService from "../modules/loyalty/service";
import { LOYALTY_MODULE } from "../modules/loyalty";

/**
 * Sipariş tamamlandığında müşteriye puan yaz. Misafir siparişlerinde
 * customer_id yoksa puan eklenmez.
 */
export default async function loyaltyCreditHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const orderModule = container.resolve(Modules.ORDER);
  const loyalty = container.resolve<LoyaltyService>(LOYALTY_MODULE);

  try {
    const order = await orderModule.retrieveOrder(data.id);
    if (!order.customer_id) {
      // Misafir sipariş — puan yok
      return;
    }
    const total = Number(order.total) || 0;
    if (total <= 0) return;

    const txn = await loyalty.creditForOrder({
      customerId: order.customer_id,
      orderId: order.id,
      totalTry: total,
    });
    if (txn) {
      logger.info(
        `[loyalty] ${txn.points} puan eklendi → customer ${order.customer_id} (order ${order.id})`
      );
    }
  } catch (e) {
    logger.error(
      `[loyalty-credit] failed: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

export const config: SubscriberConfig = { event: "order.placed" };
