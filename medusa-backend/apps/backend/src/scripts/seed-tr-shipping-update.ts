import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import {
  createShippingOptionsWorkflow,
  updateShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Free-shipping-over-2000 setup for the Türkiye region:
 *   - "Standart Kargo"  -> 79.90 TRY (the under-threshold flat fee)
 *   - "Ücretsiz Kargo"  -> 0 TRY     (selected server-side when item
 *                                     subtotal >= 2000, see
 *                                     /store/shipping/auto-select)
 *
 * Prices are KDV-exclusive, consistent with the product prices: Medusa adds
 * the 20% KDV on top of the shipping base at checkout.
 *
 * Run with:
 *   cd medusa-backend/apps/backend
 *   npx medusa exec ./src/scripts/seed-tr-shipping-update.ts
 *
 * Idempotent: updates the existing Standart Kargo price and only creates
 * Ücretsiz Kargo if it does not already exist.
 */
const STANDARD_FEE = 79.9;

export default async function seedTrShippingUpdate({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name"],
  });
  const trRegion = regions.find((r) => r.name === "Türkiye");
  if (!trRegion) {
    logger.error("Türkiye region not found. Run seed-testere.ts first.");
    return;
  }

  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: [
      "id",
      "name",
      "service_zone_id",
      "shipping_profile_id",
      "prices.id",
      "prices.amount",
      "prices.currency_code",
    ],
  });

  // 1. Standart Kargo -> 79.90
  const standard = options.find((o) => o.name === "Standart Kargo");
  if (standard) {
    const tryPrice = (standard.prices || []).find(
      (p: { currency_code?: string }) => p.currency_code === "try"
    );
    await updateShippingOptionsWorkflow(container).run({
      input: [
        {
          id: standard.id,
          prices: [
            tryPrice?.id
              ? { id: tryPrice.id, amount: STANDARD_FEE }
              : { region_id: trRegion.id, amount: STANDARD_FEE },
          ],
        },
      ],
    });
    logger.info(`✅ 'Standart Kargo' price set to ${STANDARD_FEE} TRY.`);
  } else {
    logger.warn("'Standart Kargo' not found — run seed-tr-shipping.ts first.");
  }

  // 2. Ücretsiz Kargo (0) — create if missing
  if (options.find((o) => o.name === "Ücretsiz Kargo")) {
    logger.info("'Ücretsiz Kargo' already exists — skipping creation.");
    return;
  }

  const { data: zones } = await query.graph({
    entity: "service_zone",
    fields: ["id", "name"],
  });
  const trZone = zones.find((z) => z.name === "Türkiye");
  const { data: profiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const profile = profiles[0];
  if (!trZone || !profile) {
    logger.error("TR service zone or shipping profile missing.");
    return;
  }

  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Ücretsiz Kargo",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: trZone.id,
        shipping_profile_id: profile.id,
        type: {
          label: "Ücretsiz",
          description: "2000 TL ve üzeri siparişlerde ücretsiz kargo.",
          code: "free",
        },
        prices: [{ region_id: trRegion.id, amount: 0 }],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  });
  logger.info("✅ Created 'Ücretsiz Kargo' (0 TRY).");
}
