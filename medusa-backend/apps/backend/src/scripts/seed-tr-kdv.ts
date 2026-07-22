import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Adds a 20% KDV default tax rate to the existing Türkiye tax region.
 *
 * The original seed created the TR tax region WITHOUT a rate, so
 * `cart.tax_total` was always 0 (no KDV charged). This patch adds the
 * missing 20% default rate to the live database. Prices are treated as
 * KDV-exclusive: the 20% is added on top of the item subtotal, matching
 * the storefront's "Ara Toplam (KDV Hariç)" + "KDV %20" breakdown.
 *
 * Run with:
 *   cd medusa-backend/apps/backend
 *   npx medusa exec ./src/scripts/seed-tr-kdv.ts
 *
 * Idempotent: skips if a default rate already exists on the TR tax region.
 */
export default async function seedTrKdv({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const taxModule = container.resolve(Modules.TAX);

  const regions = await taxModule.listTaxRegions({ country_code: "tr" });
  if (!regions.length) {
    logger.error(
      "TR tax region not found. Run seed-testere.ts first to create it."
    );
    return;
  }
  const trTaxRegion = regions[0];

  const existing = await taxModule.listTaxRates({
    tax_region_id: trTaxRegion.id,
  });
  const currentDefault = existing.find((r) => r.is_default);
  if (currentDefault) {
    logger.info(
      `TR tax region already has a default rate (${currentDefault.name} @ ${currentDefault.rate}%) — skipping.`
    );
    return;
  }

  await taxModule.createTaxRates([
    {
      tax_region_id: trTaxRegion.id,
      name: "KDV",
      code: "kdv",
      rate: 20,
      is_default: true,
    },
  ]);

  logger.info("✅ Created 20% KDV default tax rate for the TR tax region.");
}
