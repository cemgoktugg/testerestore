import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type BladePriceMatrixService from "../modules/blade-price-matrix/service";
import { BLADE_PRICE_MATRIX_MODULE } from "../modules/blade-price-matrix";

/**
 * One-shot cleanup script — wipes all blade_price rows via the Medusa
 * service (soft-delete by default). Needed once before re-running the
 * migration that converts width_mm / thickness_mm from integer to numeric,
 * because the alter adds NOT NULL columns that existing rows can't satisfy.
 */
export default async function clearBladePrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const svc = container.resolve<BladePriceMatrixService>(
    BLADE_PRICE_MATRIX_MODULE
  );
  const rows = await svc.listBladePrices({});
  if (rows.length === 0) {
    logger.info("No rows to delete.");
    return;
  }
  await svc.deleteBladePrices(rows.map((r) => r.id));
  logger.info(`Deleted ${rows.length} blade_price rows.`);
}
