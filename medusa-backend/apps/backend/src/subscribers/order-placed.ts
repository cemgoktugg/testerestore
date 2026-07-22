import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * `order.placed` event → sipariş onay e-postası gönder.
 *
 * Medusa cart.complete sonrası bu event'i emit eder. Sipariş detayını
 * yükleyip, müşteri email'ine Resend üzerinden gönderiyoruz.
 *
 * Provider seçimi: ID yerine `template` alanını set ederek route ediyoruz;
 * notification module hangi providerın o template'i destekleyeceğini
 * config'ten okur.
 */
export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const orderModule = container.resolve(Modules.ORDER);
  const notificationModule = container.resolve(Modules.NOTIFICATION);

  try {
    const order = await orderModule.retrieveOrder(data.id, {
      relations: ["items", "shipping_address", "billing_address"],
    });

    const to = order.email;
    if (!to) {
      logger.warn(
        `[order-placed] order ${data.id} has no email — skipping notification`
      );
      return;
    }

    await notificationModule.createNotifications([
      {
        to,
        channel: "email",
        template: "order.placed",
        data: { order },
      },
    ]);

    logger.info(`[order-placed] confirmation email queued → ${to}`);
  } catch (e) {
    logger.error(
      `[order-placed] failed: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
