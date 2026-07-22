import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type BladePriceMatrixService from "../modules/blade-price-matrix/service";
import { BLADE_PRICE_MATRIX_MODULE } from "../modules/blade-price-matrix";

/**
 * Seeds an initial blade price matrix covering the four main blade families
 * sold on the storefront. Idempotent: skips when rows already exist.
 *
 * Run with:
 *   cd medusa-backend/apps/backend
 *   npx medusa exec ./src/scripts/seed-blade-prices.ts
 */
export default async function seedBladePrices({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const svc = container.resolve<BladePriceMatrixService>(
    BLADE_PRICE_MATRIX_MODULE
  );

  const existing = await svc.listBladePrices({});
  if (existing.length > 0) {
    logger.info(
      `Blade price matrix already has ${existing.length} rows — skipping seed.`
    );
    return;
  }

  type Row = {
    blade_type: string;
    width_mm: number;
    thickness_mm: number;
    tooth_pitch: string | null;
    price_per_meter: number;
    welding_fee?: number;
    currency_code?: string;
    is_active?: boolean;
  };

  const rows: Row[] = [];

  // ---------- Bi-Metal (M42 / M51) ----------
  const biMetalSpecs: Array<[number, number, string[]]> = [
    [27, 0.9, ["3/4", "4/6", "5/8"]],
    [34, 1.1, ["2/3", "3/4", "4/6"]],
    [41, 1.3, ["1.4/2", "2/3", "3/4"]],
    [54, 1.6, ["1.1/1.6", "1.4/2", "2/3"]],
  ];
  for (const [w, t, pitches] of biMetalSpecs) {
    for (const p of pitches) {
      rows.push({
        blade_type: "bi-metal",
        width_mm: w,
        thickness_mm: t,
        tooth_pitch: p,
        price_per_meter: 380 + (w - 27) * 18,
        welding_fee: 75,
      });
    }
  }

  // ---------- Karbür Uçlu ----------
  const carbideSpecs: Array<[number, number, string[]]> = [
    [27, 0.9, ["2/3", "3/4"]],
    [34, 1.1, ["1.4/2", "2/3", "3/4"]],
    [41, 1.3, ["1.1/1.6", "1.4/2", "2/3"]],
    [54, 1.6, ["0.85/1.15", "1.1/1.6", "1.4/2"]],
  ];
  for (const [w, t, pitches] of carbideSpecs) {
    for (const p of pitches) {
      rows.push({
        blade_type: "carbide",
        width_mm: w,
        thickness_mm: t,
        tooth_pitch: p,
        price_per_meter: 980 + (w - 27) * 32,
        welding_fee: 120,
      });
    }
  }

  // ---------- Ahşap (Woodcut — Spezial Alman Çeliği, no TPI) ----------
  const woodSpecs: Array<[number, number]> = [
    [13, 0.6],
    [16, 0.6],
    [20, 0.7],
    [25, 0.8],
    [32, 0.9],
    [40, 1.0],
  ];
  for (const [w, t] of woodSpecs) {
    rows.push({
      blade_type: "woodcut",
      width_mm: w,
      thickness_mm: t,
      tooth_pitch: null,
      price_per_meter: 145 + (w - 13) * 6,
      welding_fee: 50,
    });
  }

  // ---------- Et ve Kemik (Hijyenik paslanmaz) ----------
  const meatSpecs: Array<[number, number]> = [
    [16, 0.5],
    [19, 0.55],
    [20, 0.6],
  ];
  for (const [w, t] of meatSpecs) {
    rows.push({
      blade_type: "meat-bone",
      width_mm: w,
      thickness_mm: t,
      tooth_pitch: null,
      price_per_meter: 165 + (w - 16) * 8,
      welding_fee: 45,
    });
  }

  // ---------- Sünger / Tekstil ----------
  const textileSpecs: Array<[number, number]> = [
    [8, 0.45],
    [10, 0.5],
    [13, 0.6],
  ];
  for (const [w, t] of textileSpecs) {
    rows.push({
      blade_type: "textile",
      width_mm: w,
      thickness_mm: t,
      tooth_pitch: null,
      price_per_meter: 95 + (w - 8) * 6,
      welding_fee: 35,
    });
  }

  // Apply defaults
  const payload = rows.map((r) => ({
    currency_code: "try",
    is_active: true,
    welding_fee: 0,
    ...r,
  }));

  await svc.createBladePrices(payload);
  logger.info(`✅ Seeded ${payload.length} blade price matrix rows.`);
}
