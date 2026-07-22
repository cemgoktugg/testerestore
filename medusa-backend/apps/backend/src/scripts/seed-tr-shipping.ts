import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import {
  createShippingOptionsWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * Adds a Turkey service zone with two shipping options (Standard / Express)
 * to the default fulfillment set. Without this, customers in Türkiye region
 * have no shipping options and Medusa cart.complete() refuses to create
 * an order.
 *
 * Run with:
 *   cd medusa-backend/apps/backend
 *   npx medusa exec ./src/scripts/seed-tr-shipping.ts
 *
 * Idempotent: skips if a TR-named service zone already exists.
 */
export default async function seedTrShipping({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT);

  // 1. Find the TR region
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
  });
  const trRegion = regions.find((r) => r.name === "Türkiye");
  if (!trRegion) {
    logger.error("Türkiye region not found.");
    return;
  }

  // 2. Find an existing fulfillment set
  const sets = await fulfillmentModule.listFulfillmentSets({});
  if (!sets.length) {
    logger.error("No fulfillment set found.");
    return;
  }
  const fulfillmentSet = sets[0];

  // 3. Skip if TR service zone already exists
  const { data: zones } = await query.graph({
    entity: "service_zone",
    fields: ["id", "name"],
  });
  if (zones.find((z) => z.name === "Türkiye")) {
    logger.info("TR service zone already exists — skipping.");
    return;
  }

  // 4. Create the TR service zone
  const newZone = await fulfillmentModule.createServiceZones({
    name: "Türkiye",
    fulfillment_set_id: fulfillmentSet.id,
    geo_zones: [{ country_code: "tr", type: "country" }],
  });
  logger.info(`Created TR service zone: ${newZone.id}`);

  // 5. Get the default shipping profile
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const shippingProfile = shippingProfiles[0];

  // 6. Create the two shipping options
  await createShippingOptionsWorkflow(container).run({
    input: [
      {
        name: "Standart Kargo",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: newZone.id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Standart",
          description: "3-5 iş günü içinde teslim.",
          code: "standard",
        },
        prices: [
          { region_id: trRegion.id, amount: 150 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
      {
        name: "Hızlı Kargo (Express)",
        price_type: "flat",
        provider_id: "manual_manual",
        service_zone_id: newZone.id,
        shipping_profile_id: shippingProfile.id,
        type: {
          label: "Express",
          description: "1-2 iş günü içinde teslim.",
          code: "express",
        },
        prices: [
          { region_id: trRegion.id, amount: 300 },
        ],
        rules: [
          { attribute: "enabled_in_store", value: "true", operator: "eq" },
          { attribute: "is_return", value: "false", operator: "eq" },
        ],
      },
    ],
  });

  logger.info("✅ Türkiye shipping options created.");
}
