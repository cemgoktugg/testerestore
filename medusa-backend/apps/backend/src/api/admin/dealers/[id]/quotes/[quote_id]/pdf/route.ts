import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { dealerService } from "../../../../../../../lib/dealer-pricing";
import { loadQuotes } from "../../../../../../../lib/dealer-quote";
import { renderQuotePdf } from "../../../../../../../lib/dealer-quote-pdf";

/** GET /admin/dealers/:id/quotes/:quote_id/pdf — taslak dahil önizleme. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const [dealer] = await dealerService(req.scope).listDealers({ id: req.params.id }, { take: 1 });
  const [quote] = dealer
    ? await loadQuotes(req.scope, { id: req.params.quote_id, dealer_id: dealer.id })
    : [];
  if (!quote) {
    res.status(404).json({ message: "Teklif bulunamadı." });
    return;
  }
  const pdf = await renderQuotePdf({ ...quote, date: quote.sent_at ?? quote.created_at }, dealer);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${quote.number}.pdf"`);
  res.send(pdf);
}
