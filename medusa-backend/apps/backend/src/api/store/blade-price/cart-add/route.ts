import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { addToCartWorkflow } from "@medusajs/medusa/core-flows";
import type BladePriceMatrixService from "../../../../modules/blade-price-matrix/service";
import { BLADE_PRICE_MATRIX_MODULE } from "../../../../modules/blade-price-matrix";
import { MIN_LENGTH_MM, MAX_LENGTH_MM } from "../calculate/route";

const Schema = z.object({
  cart_id: z.string().min(1),
  variant_id: z.string().min(1),
  blade_type: z.string().min(1),
  width_mm: z.coerce.number().positive(),
  thickness_mm: z.coerce.number().positive(),
  tooth_pitch: z.string().min(1).nullable().optional(),
  // Server-trusted length bounds — same limits as the calculate endpoint so a
  // crafted request can't bypass the configurator's min/max and add an
  // out-of-range blade to the cart.
  length_mm: z.coerce
    .number()
    .min(MIN_LENGTH_MM, `Minimum uzunluk ${MIN_LENGTH_MM} mm olmalıdır.`)
    .max(MAX_LENGTH_MM, `Maksimum uzunluk ${MAX_LENGTH_MM} mm olmalıdır.`),
  quantity: z.coerce.number().int().positive().optional().default(1),
});

/**
 * POST /store/blade-price/cart/add
 *
 * Server-trusted line-item creation for matrix-priced blades. The browser
 * cannot pass `unit_price` directly via the standard store cart API (that
 * would let any client name their own price), so this endpoint:
 *
 *   1. Recomputes the price from the matrix (single source of truth).
 *   2. Calls `addToCartWorkflow` with the matrix-derived `unit_price`,
 *      so the cart line, cart total, and checkout all show the same number.
 *
 * Welding is charged once per line: total = (per_meter × length × qty) + welding,
 * amortized into `unit_price` so cart × qty = configurator total exactly.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.issues,
    });
    return;
  }

  const {
    cart_id,
    variant_id,
    blade_type,
    width_mm,
    thickness_mm,
    tooth_pitch,
    length_mm,
    quantity,
  } = parsed.data;

  const svc = req.scope.resolve<BladePriceMatrixService>(
    BLADE_PRICE_MATRIX_MODULE
  );

  const filter: Record<string, unknown> = {
    is_active: true,
    blade_type,
    width_mm,
    thickness_mm,
  };
  filter.tooth_pitch = tooth_pitch ?? null;

  const rows = await svc.listBladePrices(filter);
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

  const bladeUnitPrice = pricePerMeter * lengthMeter;
  const subtotal = bladeUnitPrice * quantity;
  const totalBeforeDiscount = subtotal + weldingFee;

  // Qty tier discount — frontend BladeConfigurator ile birebir aynı tablo.
  // Burada server-side uygulanır ki müşteri sepette/checkout'ta da
  // indirimli fiyatı görsün.
  const discountPercent =
    quantity >= 10 ? 15 : quantity >= 5 ? 10 : quantity >= 3 ? 5 : 0;
  const totalPrice =
    discountPercent > 0
      ? (totalBeforeDiscount * (100 - discountPercent)) / 100
      : totalBeforeDiscount;

  const round2 = (n: number) => Math.round(n * 100) / 100;

  // Amortize welding + discount across qty so cart × qty == configurator total.
  const amortizedUnitPrice = round2(totalPrice / Math.max(1, quantity));

  try {
    const { result } = await addToCartWorkflow(req.scope).run({
      input: {
        cart_id,
        items: [
          {
            variant_id,
            quantity,
            unit_price: amortizedUnitPrice,
            metadata: {
              product_type: "blade",
              blade_type,
              width_mm,
              thickness_mm,
              tooth_pitch: tooth_pitch ?? null,
              length_mm,
              length_meter: round2(lengthMeter),
              price_per_meter: round2(pricePerMeter),
              welding_fee: round2(weldingFee),
              blade_unit_price: round2(bladeUnitPrice),
              unit_price: amortizedUnitPrice,
              subtotal: round2(subtotal),
              total_before_discount: round2(totalBeforeDiscount),
              discount_percent: discountPercent,
              total_price: round2(totalPrice),
              currency_code: row.currency_code,
              // Legacy keys for cart/order display compatibility
              width: `${width_mm}mm`,
              thickness: `${thickness_mm}mm`,
              tpi: tooth_pitch ? `${tooth_pitch} TPI` : "—",
              custom_length_mm: length_mm,
              welding: weldingFee > 0,
              unit_price_at_add: amortizedUnitPrice,
            },
          },
        ],
      },
    });

    res.json({
      ok: true,
      unit_price: amortizedUnitPrice,
      total_price: round2(totalPrice),
      total_before_discount: round2(totalBeforeDiscount),
      discount_percent: discountPercent,
      welding_fee: round2(weldingFee),
      currency_code: row.currency_code,
      result,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ message: "addToCartWorkflow failed", error: msg });
  }
}
