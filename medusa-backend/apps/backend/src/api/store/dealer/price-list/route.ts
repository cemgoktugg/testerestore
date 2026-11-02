import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { BLADE_PRICE_MATRIX_MODULE } from "../../../../modules/blade-price-matrix";
import type BladePriceMatrixService from "../../../../modules/blade-price-matrix/service";
import {
  dealerService,
  findActiveDealer,
  listDealerVariantPrices,
  listSellableVariants,
  mergeBladeRates,
} from "../../../../lib/dealer-pricing";

/**
 * GET /store/dealer/price-list — oturumdaki bayinin özel fiyatları, genel
 * fiyatlarıyla birlikte. Yalnız bayiye özel fiyat girilmiş satırlar döner.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealer = await findActiveDealer(req.scope, (req as any).auth_context?.actor_id);
  if (!dealer) {
    res.status(403).json({ message: "Bu sayfa bayilere özeldir." });
    return;
  }
  const overrides = await dealerService(req.scope).listDealerBladePrices(
    { dealer_id: dealer.id },
    { take: 100000 }
  );
  const rows = overrides.length
    ? await req.scope
        .resolve<BladePriceMatrixService>(BLADE_PRICE_MATRIX_MODULE)
        .listBladePrices(
          { id: overrides.map((o) => o.blade_price_id), is_active: true },
          { take: overrides.length }
        )
    : [];
  const overrideByRow = new Map(overrides.map((o) => [o.blade_price_id, o]));

  const prices = await listDealerVariantPrices(req.scope, dealer.price_list_id);
  const variants = prices.size ? await listSellableVariants(req.scope) : [];

  res.setHeader("Cache-Control", "private, no-store");
  res.json({
    company_name: dealer.company_name,
    blades: rows
      .map((r) => {
        const rates = mergeBladeRates(r, overrideByRow.get(r.id) as never);
        return {
          id: r.id,
          blade_type: r.blade_type,
          width_mm: Number(r.width_mm),
          thickness_mm: Number(r.thickness_mm),
          tooth_pitch: r.tooth_pitch,
          list_price_per_meter: Number(r.price_per_meter),
          list_welding_fee: Number(r.welding_fee ?? 0),
          price_per_meter: rates.pricePerMeter,
          welding_fee: rates.weldingFee,
        };
      })
      .sort(
        (a, b) =>
          a.blade_type.localeCompare(b.blade_type) ||
          a.width_mm - b.width_mm ||
          a.thickness_mm - b.thickness_mm
      ),
    products: variants
      .filter((v) => prices.has(v.id))
      .map((v) => ({
        id: v.id,
        title: v.product.title,
        handle: v.product.handle,
        list_amount: v.calculated_price?.calculated_amount ?? null,
        amount: prices.get(v.id)?.amount ?? null,
      })),
  });
}
