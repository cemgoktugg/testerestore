import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { addToCartWorkflow } from "@medusajs/medusa/core-flows";
import { computeBladeLine } from "../../../../lib/blade-line";
import {
  assertMatrixAllowedForProduct,
  productForVariant,
} from "../../../../lib/blade-guard";
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
 *
 * Fiyat matematiği `src/lib/blade-line.ts` içinde — danışman sohbetinden
 * gelen sepete ekleme de aynı fonksiyonu kullanıyor.
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

  const { cart_id, variant_id, quantity, ...blade } = parsed.data;

  // Matris fiyatı yalnızca bu türdeki ölçüye göre ürüne uygulanabilir —
  // aksi halde herhangi bir ürün en ucuz matris satırıyla sepete konabilirdi.
  try {
    assertMatrixAllowedForProduct(
      await productForVariant(req.scope, variant_id),
      blade.blade_type,
      blade.length_mm
    );
  } catch (e) {
    res.status(400).json({
      message: e instanceof Error ? e.message : "Geçersiz ürün",
      code: "BLADE_PRODUCT_MISMATCH",
    });
    return;
  }

  const pricing = await computeBladeLine(req.scope, { ...blade, quantity });
  if (!pricing) {
    res.status(404).json({
      message: "No price defined for the selected combination",
      code: "BLADE_PRICE_NOT_FOUND",
    });
    return;
  }

  try {
    const { result } = await addToCartWorkflow(req.scope).run({
      input: {
        cart_id,
        items: [
          {
            variant_id,
            quantity,
            unit_price: pricing.unit_price,
            metadata: pricing.metadata,
          },
        ],
      },
    });

    res.json({
      ok: true,
      unit_price: pricing.unit_price,
      total_price: pricing.total_price,
      total_before_discount: pricing.total_before_discount,
      discount_percent: pricing.discount_percent,
      welding_fee: pricing.welding_fee,
      currency_code: pricing.currency_code,
      result,
    });
  } catch (e) {
    req.scope
      .resolve("logger")
      .error(`[blade-price/cart-add] ${e instanceof Error ? e.message : String(e)}`);
    res.status(500).json({ message: "Ürün sepete eklenemedi." });
  }
}
