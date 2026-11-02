import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { findActiveDealer } from "../../../../../../lib/dealer-pricing";
import { loadQuotes } from "../../../../../../lib/dealer-quote";
import { renderQuotePdf } from "../../../../../../lib/dealer-quote-pdf";

/** GET /store/dealer/quotes/:id/pdf — yalnız bayinin kendi gönderilmiş teklifi. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealer = await findActiveDealer(req.scope, (req as any).auth_context?.actor_id);
  const [quote] = dealer
    ? await loadQuotes(req.scope, { id: req.params.id, dealer_id: dealer.id, status: "sent" })
    : [];
  if (!dealer || !quote) {
    res.status(404).json({ message: "Teklif bulunamadı." });
    return;
  }
  const pdf = await renderQuotePdf({ ...quote, date: quote.sent_at ?? quote.created_at }, dealer);
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${quote.number}.pdf"`);
  res.send(pdf);
}
