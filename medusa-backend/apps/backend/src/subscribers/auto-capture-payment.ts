import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { capturePaymentWorkflow } from "@medusajs/medusa/core-flows";

/**
 * `order.placed` → kart (iyzico) ödemelerini otomatik capture et.
 *
 * Neden: Medusa varsayılan olarak ödemeyi "authorized" bırakır ve admin'den
 * manuel capture bekler. Ancak iyzico Checkout Form'da para 3DS anında
 * ÇEKİLİR — yani Medusa'da da otomatik captured görünmeli, aksi halde sipariş
 * "tamamlanmadı / tahsil bekleniyor" gibi görünür.
 *
 * Sadece iyzico ödemeleri yakalanır; havale/EFT (pp_system_default) authorized
 * kalır çünkü para fiziksel olarak gelene kadar merchant manuel onaylamalı.
 *
 * provider.capturePayment bizim implementasyonda no-op'tur (para zaten çekili),
 * dolayısıyla bu yalnızca Medusa kaydını "captured"a çevirir, tekrar çekim yapmaz.
 */
export default async function autoCapturePaymentHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "payment_collections.payments.id",
        "payment_collections.payments.captured_at",
        "payment_collections.payments.provider_id",
      ],
      filters: { id: data.id },
    });

    const order = orders?.[0];
    if (!order) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payments = ((order.payment_collections as any[]) || []).flatMap(
      (pc) => pc?.payments || []
    );

    for (const p of payments) {
      if (!p?.id || p.captured_at) continue; // zaten yakalanmış
      if (!String(p.provider_id || "").includes("iyzico")) continue; // havale manuel kalsın
      try {
        await capturePaymentWorkflow(container).run({
          input: { payment_id: p.id },
        });
        logger.info(
          `[auto-capture] payment ${p.id} captured (order ${order.id})`
        );
      } catch (e) {
        logger.error(
          `[auto-capture] payment ${p.id} capture failed: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    }
  } catch (e) {
    logger.error(
      `[auto-capture] failed: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
};
