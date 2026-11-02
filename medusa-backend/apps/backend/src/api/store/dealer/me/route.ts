import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { findActiveDealer, listDealerVariantPrices } from "../../../../lib/dealer-pricing";

/**
 * GET /store/dealer/me
 *
 * Giriş yapmış müşterinin bayi bilgisi ve varyant fiyatları. Sayfalar sunucuda
 * anonim üretilip önbelleğe alındığından mağaza bu fiyatları tarayıcıda
 * uygular. Yanıt yalnızca oturumdaki müşterinin kendi verisini içerir.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customerId = (req as any).auth_context?.actor_id as string | undefined;
  const dealer = await findActiveDealer(req.scope, customerId);
  res.setHeader("Cache-Control", "private, no-store");
  if (!dealer) {
    res.json({ is_dealer: false });
    return;
  }
  const prices = await listDealerVariantPrices(req.scope, dealer.price_list_id);
  res.json({
    is_dealer: true,
    company_name: dealer.company_name,
    variant_prices: Object.fromEntries(
      [...prices].map(([variantId, p]) => [variantId, p.amount])
    ),
  });
}
