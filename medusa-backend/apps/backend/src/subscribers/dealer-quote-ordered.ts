import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { dealerService } from "../lib/dealer-pricing";

/** Siparişe dönüşen teklifi kapatır; aynı teklif fiyatı ikinci kez kullanılamaz. */
export default async function dealerQuoteOrderedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  try {
    const { data: orders } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
      entity: "order",
      fields: ["id", "items.metadata"],
      filters: { id: data.id },
    });
    const quoteIds = new Set<string>();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const item of ((orders?.[0] as any)?.items ?? []) as any[]) {
      if (typeof item?.metadata?.quote_id === "string") quoteIds.add(item.metadata.quote_id);
    }
    if (!quoteIds.size) return;
    await dealerService(container).updateDealerQuotes(
      [...quoteIds].map((id) => ({ id, status: "ordered", ordered_at: new Date() }))
    );
  } catch (e) {
    logger.error(
      `[dealer-quote] sipariş ${data.id} sonrası teklif kapatılamadı: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
}

export const config: SubscriberConfig = { event: "order.placed" };
