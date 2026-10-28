import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { updateLineItemInCartWorkflow } from "@medusajs/medusa/core-flows";
import { Modules } from "@medusajs/framework/utils";
import { computeBladeLine } from "../../../../lib/blade-line";
import {
  assertMatrixAllowedForProduct,
  productForVariant,
} from "../../../../lib/blade-guard";

const Schema = z.object({
  cart_id: z.string().min(1),
  line_id: z.string().min(1),
  quantity: z.coerce.number().int().positive(),
});

/**
 * POST /store/blade-price/cart-update
 *
 * Bir matrix-fiyatlı line item'ın miktarını günceller VE unit_price'ı
 * yeni miktara göre yeniden hesaplar (kaynak adet başına + tier
 * discount tekrar uygulanır; matematik `src/lib/blade-line.ts`).
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
      req.scope
        .resolve("logger")
        .error(`[blade-price/cart-update] ${e instanceof Error ? e.message : String(e)}`);
      res.status(500).json({ message: "Sepet güncellenemedi." });
      return;
    }
  }

  // Satır metadata'sı istemci tarafından yazılabilir; matris fiyatını yalnızca
  // gerçekten bu türdeki ölçüye göre ürünün satırına uygula (ör. hazır boy
  // satırına sahte blade_type eklenerek ucuzlatılmasın).
  try {
    assertMatrixAllowedForProduct(
      line.variant_id ? await productForVariant(req.scope, line.variant_id) : null,
      bladeType,
      lengthMm
    );
  } catch (e) {
    res.status(400).json({
      message: e instanceof Error ? e.message : "Geçersiz ürün",
      code: "BLADE_PRODUCT_MISMATCH",
    });
    return;
  }

  // Matrix-priced item — fiyatı yeniden hesapla (cart-add ve checkout
  // doğrulamasıyla aynı fonksiyon; ayrı kopya fiyat farkı üretir).
  const pricing = await computeBladeLine(req.scope, {
    blade_type: bladeType,
    width_mm: widthMm,
    thickness_mm: thicknessMm,
    tooth_pitch: toothPitch,
    length_mm: lengthMm,
    quantity,
  });
  if (!pricing) {
    res.status(404).json({
      message: "No price defined for the selected combination",
      code: "BLADE_PRICE_NOT_FOUND",
    });
    return;
  }

  try {
    const { result } = await updateLineItemInCartWorkflow(req.scope).run({
      input: {
        cart_id,
        item_id: line_id,
        update: {
          quantity,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          unit_price: pricing.unit_price as any,
          metadata: { ...md, ...pricing.metadata },
        },
      },
    });

    res.json({
      ok: true,
      unit_price: pricing.unit_price,
      total_price: pricing.total_price,
      discount_percent: pricing.discount_percent,
      result,
    });
  } catch (e) {
    req.scope
      .resolve("logger")
      .error(`[blade-price/cart-update] ${e instanceof Error ? e.message : String(e)}`);
    res.status(500).json({ message: "Sepet güncellenemedi." });
  }
}
