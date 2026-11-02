/**
 * Sepetteki teklif satırının son doğrulaması.
 *
 * Revizeyle anlaşılan fiyat listeden farklı olabilir; bu yüzden teklif satırı
 * listeyle değil teklifle karşılaştırılır. Satır yalnız bayinin kendi kabul
 * ettiği, henüz siparişe dönüşmemiş teklifteki fiyat ve adetle geçerlidir.
 */
import type { MedusaContainer } from "@medusajs/framework/types";
import { MedusaError } from "@medusajs/framework/utils";
import { dealerService } from "./dealer-pricing";

const invalid = () =>
  new MedusaError(
    MedusaError.Types.INVALID_DATA,
    "Sepetinizdeki teklif artık geçerli değil. Lütfen teklif satırlarını sepetten çıkarıp Tekliflerim sayfasından tekrar kontrol edin."
  );

export async function assertQuoteLineValid(
  container: MedusaContainer,
  line: { variant_id?: string | null; quantity: number; unit_price: number; quote_item_id: string },
  customerId?: string | null
): Promise<void> {
  const service = dealerService(container);
  const [item] = await service.listDealerQuoteItems({ id: line.quote_item_id }, { take: 1 });
  if (!item) throw invalid();
  const [quote] = await service.listDealerQuotes({ id: item.quote_id }, { take: 1 });
  if (quote?.status !== "accepted") throw invalid();
  const [dealer] = await service.listDealers(
    { id: quote.dealer_id, is_active: true },
    { take: 1 }
  );
  if (!dealer || !customerId || dealer.customer_id !== customerId) throw invalid();
  if (
    item.variant_id !== line.variant_id ||
    Number(item.quantity) !== line.quantity ||
    Math.abs(Number(item.unit_price) - line.unit_price) > 0.01
  ) {
    throw invalid();
  }
}
