import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { updateLineItemInCartWorkflow } from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";
import type BladePriceMatrixService from "../../../../modules/blade-price-matrix/service";
import { BLADE_PRICE_MATRIX_MODULE } from "../../../../modules/blade-price-matrix";

const Schema = z.object({
  cart_id: z.string().min(1),
  line_id: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
});

/**
 * POST /store/blade-price/cart-update
 *
 * Bir matrix-fiyatlı line item'ın miktarını günceller VE unit_price'ı
 * yeni miktara göre yeniden hesaplar (welding tek seferlik + tier
 * discount tekrar uygulanır).
 *
 * Cart line item'ının metadata'sındaki blade_type/width_mm/thickness_mm/
 * tooth_pitch/length_mm okunur; matrix tablosundan price_per_meter ve
 * welding_fee tazelenir.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid body",
      errors: parsed.error.issues,
    });
    return;
  }
  const { cart_id, line_id, quantity } = parsed.data;

  const cartModule = req.scope.resolve(Modules.CART);
  const svc = req.scope.resolve<BladePriceMatrixService>(
    BLADE_PRICE_MATRIX_MODULE
  );

  // Mevcut line item + cart'ı al
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cart = await (cartModule as any).retrieveCart(cart_id, {
    relations: ["items"],
  });
  if (!cart) {
    res.status(404).json({ message: "Cart not found" });
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const line = (cart.items || []).find((it: any) => it.id === line_id);
  if (!line) {
    res.status(404).json({ message: "Line item not found" });
    return;
  }
  const md = (line.metadata || {}) as Record<string, unknown>;
  const bladeType = md.blade_type as string | undefined;
  const widthMm = Number(md.width_mm);
  const thicknessMm = Number(md.thickness_mm);
  const lengthMm = Number(md.length_mm);
  const toothPitch = (md.tooth_pitch as string | null) ?? null;

  if (!bladeType || !widthMm || !thicknessMm || !lengthMm) {
    // Matrix line değil — sıradan update'e düş
    try {
      const { result } = await updateLineItemInCartWorkflow(req.scope).run({
        input: { cart_id, item_id: line_id, update: { quantity } },
      });
      res.json({ ok: true, result });
      return;
    } catch (e) {
      res.status(500).json({
        message: "update failed",
        error: e instanceof Error ? e.message : String(e),
      });
      return;
    }
  }

  // Matrix-priced item — fiyatı yeniden hesapla
  const filter: Record<string, unknown> = {
    is_active: true,
    blade_type: bladeType,
    width_mm: widthMm,
    thickness_mm: thicknessMm,
    tooth_pitch: toothPitch,
  };
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
  const lengthMeter = lengthMm / 1000;
  const bladeUnitPrice = pricePerMeter * lengthMeter;
  const subtotal = bladeUnitPrice * quantity;
  const totalBeforeDiscount = subtotal + weldingFee;

  // Qty tier discount — cart-add ile aynı tablo
  const discountPercent =
    quantity >= 10 ? 15 : quantity >= 5 ? 10 : quantity >= 3 ? 5 : 0;
  const totalPrice =
    discountPercent > 0
      ? (totalBeforeDiscount * (100 - discountPercent)) / 100
      : totalBeforeDiscount;

  const round2 = (n: number) => Math.round(n * 100) / 100;
  const amortizedUnitPrice = round2(totalPrice / Math.max(1, quantity));

  try {
    const { result } = await updateLineItemInCartWorkflow(req.scope).run({
      input: {
        cart_id,
        item_id: line_id,
        update: {
          quantity,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          unit_price: amortizedUnitPrice as any,
          metadata: {
            ...md,
            blade_unit_price: round2(bladeUnitPrice),
            unit_price: amortizedUnitPrice,
            subtotal: round2(subtotal),
            total_before_discount: round2(totalBeforeDiscount),
            discount_percent: discountPercent,
            total_price: round2(totalPrice),
            unit_price_at_add: amortizedUnitPrice,
          },
        },
      },
    });

    res.json({
      ok: true,
      unit_price: amortizedUnitPrice,
      total_price: round2(totalPrice),
      discount_percent: discountPercent,
      result,
    });
  } catch (e) {
    res.status(500).json({
      message: "updateLineItemInCartWorkflow failed",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
