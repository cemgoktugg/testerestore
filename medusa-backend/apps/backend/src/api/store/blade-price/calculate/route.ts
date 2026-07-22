import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import type BladePriceMatrixService from "../../../../modules/blade-price-matrix/service";
import { BLADE_PRICE_MATRIX_MODULE } from "../../../../modules/blade-price-matrix";

// Server-side length bounds (mm). The configurator UI already enforces these
// per-product, but the API must not trust the client: a crafted request could
// otherwise price a 1mm or 9,999,999mm blade. 1000mm is the global minimum;
// 15000mm matches the largest product's max_length_mm ceiling.
export const MIN_LENGTH_MM = 1000;
export const MAX_LENGTH_MM = 15000;

const CalcSchema = z.object({
  blade_type: z.string().min(1),
  width_mm: z.coerce.number().positive(),
  thickness_mm: z.coerce.number().positive(),
  tooth_pitch: z.string().min(1).nullable().optional(),
  length_mm: z.coerce
    .number()
    .min(MIN_LENGTH_MM, `Minimum uzunluk ${MIN_LENGTH_MM} mm olmalıdır.`)
    .max(MAX_LENGTH_MM, `Maksimum uzunluk ${MAX_LENGTH_MM} mm olmalıdır.`),
  quantity: z.coerce.number().int().positive().optional().default(1),
});

/**
 * POST /store/blade-price/calculate
 *
 * Pricing formula:
 *   unit_price  = price_per_meter × length_mm / 1000       (per blade, no welding)
 *   subtotal    = unit_price × quantity                     (blades only)
 *   total_price = subtotal + welding_fee                    (welding charged ONCE)
 *
 * Welding is a flat per-order assembly cost; multiplying it by quantity
 * over-charges customers who want several identical blades. The storefront
 * still surfaces it as a line in the breakdown for transparency.
 *
 * 404 if no matrix row matches the chosen combination (caller should show
 * "Bu ölçü için fiyat tanımlı değil").
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = CalcSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.issues,
    });
    return;
  }

  const {
    blade_type,
    width_mm,
    thickness_mm,
    tooth_pitch,
    length_mm,
    quantity,
  } = parsed.data;

  const service = req.scope.resolve<BladePriceMatrixService>(
    BLADE_PRICE_MATRIX_MODULE
  );

  const filter: Record<string, unknown> = {
    is_active: true,
    blade_type,
    width_mm,
    thickness_mm,
  };
  if (tooth_pitch) filter.tooth_pitch = tooth_pitch;
  else filter.tooth_pitch = null;

  const rows = await service.listBladePrices(filter);
  if (rows.length === 0) {
    res.status(404).json({
      message: "No price defined for the selected combination",
      code: "BLADE_PRICE_NOT_FOUND",
    });
    return;
  }

  const row = rows[0] as {
    price_per_meter: number | string;
    welding_fee: number | string;
    currency_code: string;
  };

  const pricePerMeter = Number(row.price_per_meter);
  const weldingFee = Number(row.welding_fee ?? 0);
  const lengthMeter = length_mm / 1000;

  // Welding is added once (per cart line), NOT per blade.
  const unitPrice = pricePerMeter * lengthMeter;
  const subtotal = unitPrice * quantity;
  const totalPrice = subtotal + weldingFee;

  // Round to 2 decimals for currency
  const round2 = (n: number) => Math.round(n * 100) / 100;

  res.json({
    blade_type,
    width_mm,
    thickness_mm,
    tooth_pitch: tooth_pitch ?? null,
    length_mm,
    length_meter: round2(lengthMeter),
    quantity,
    price_per_meter: round2(pricePerMeter),
    welding_fee: round2(weldingFee),
    unit_price: round2(unitPrice),
    subtotal: round2(subtotal),
    total_price: round2(totalPrice),
    currency_code: row.currency_code,
  });
}
