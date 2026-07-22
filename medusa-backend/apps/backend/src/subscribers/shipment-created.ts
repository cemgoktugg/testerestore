import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * `shipment.created` → müşteriye "kargoya verildi" maili.
 *
 * Medusa admin'de bir fulfillment "Kargoya verildi" (mark as shipped) olarak
 * işaretlenip takip numarası girildiğinde bu event tetiklenir. Event datası
 * { id: <fulfillment_id>, no_notification } gelir.
 *
 * Fulfillment'ın label'larından (tracking_number/tracking_url) ve bağlı
 * order'dan (email, display_id) bilgileri alıp Resend üzerinden
 * "order.shipped" template'ini yollarız.
 */
export default async function shipmentCreatedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string; no_notification?: boolean }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const notificationModule = container.resolve(Modules.NOTIFICATION);

  if (data.no_notification) {
    logger.info(`[shipment-created] ${data.id} no_notification — mail atlandı`);
    return;
  }

  try {
    const { data: fulfillments } = await query.graph({
      entity: "fulfillment",
      fields: [
        "id",
        "labels.tracking_number",
        "labels.tracking_url",
        "order.id",
        "order.display_id",
        "order.email",
        "order.shipping_methods.name",
        "order.metadata",
      ],
      filters: { id: data.id },
    });

    const fulfillment = fulfillments?.[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order = (fulfillment as any)?.order;
    if (!order?.email) {
      logger.warn(
        `[shipment-created] ${data.id} için order/email bulunamadı — mail atlanıyor`
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const labels = ((fulfillment as any).labels || []) as Array<{
      tracking_number?: string | null;
      tracking_url?: string | null;
    }>;
    const trackingNumbers = labels
      .map((l) => l.tracking_number)
      .filter(Boolean) as string[];
    const trackingNumber = trackingNumbers.join(", ");
    const trackingUrl =
      labels.find((l) => l.tracking_url)?.tracking_url || undefined;

    const meta = (order.metadata || {}) as Record<string, unknown>;
    const carrier =
      (meta.carrier_name as string | undefined) ||
      order.shipping_methods?.[0]?.name ||
      "Kargo";
    const orderNo = order.display_id
      ? `#${order.display_id}`
      : String(order.id).slice(-8).toUpperCase();

    await notificationModule.createNotifications([
      {
        to: order.email,
        channel: "email",
        template: "order.shipped",
        data: {
          order_no: orderNo,
          carrier,
          tracking_number: trackingNumber,
          tracking_url: trackingUrl,
        },
      },
    ]);

    logger.info(
      `[shipment-created] kargo maili kuyruğa alındı → ${order.email} (${orderNo}, takip: ${trackingNumber || "-"})`
    );
  } catch (e) {
    logger.error(
      `[shipment-created] failed: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

export const config: SubscriberConfig = {
  event: "shipment.created",
};
