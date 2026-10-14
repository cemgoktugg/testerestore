import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import {
  applyAutoShipping,
  FREE_SHIPPING_THRESHOLD,
  remainingToFreeShipping,
  STANDARD_SHIPPING_FEE,
} from "../../../../lib/auto-shipping";

// Geriye dönük uyumluluk: bu sabitler eskiden burada tanımlıydı.
export { FREE_SHIPPING_THRESHOLD, STANDARD_SHIPPING_FEE };

const Schema = z.object({ cart_id: z.string().min(1) });

/**
 * POST /store/shipping/auto-select
 *
 * Server-trusted shipping selection. The browser must NOT decide whether
 * shipping is free — a crafted request could otherwise pick the 0 TRY option
 * for a small cart. Karar `src/lib/auto-shipping.ts` içinde veriliyor;
 * danışman sohbetinin sepet hazırlama akışı da aynı fonksiyonu kullanıyor.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body", errors: parsed.error.issues });
    return;
  }

  const result = await applyAutoShipping(req.scope, parsed.data.cart_id);

  if (!result.ok) {
    const status = result.code === "CART_NOT_FOUND" ? 404 : 500;
    res.status(status).json({ message: result.message });
    return;
  }

  res.json({
    ok: true,
    free: result.free,
    threshold: FREE_SHIPPING_THRESHOLD,
    item_subtotal: result.item_subtotal,
    // KDV dahil (eşikle aynı birimde)
    remaining: result.free ? 0 : remainingToFreeShipping(result.item_subtotal),
    shipping_option_id: result.shipping_option_id,
    shipping_fee: result.shipping_fee,
  });
}
