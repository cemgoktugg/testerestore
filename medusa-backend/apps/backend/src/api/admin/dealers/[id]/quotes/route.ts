import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { dealerService, type DealerRecord } from "../../../../../lib/dealer-pricing";
import { createQuote, loadQuotes, QuoteBodySchema } from "../../../../../lib/dealer-quote";

const findDealer = async (req: MedusaRequest) =>
  (await dealerService(req.scope).listDealers({ id: req.params.id }, { take: 1 }))[0] as
    | unknown as DealerRecord | undefined;

/** GET /admin/dealers/:id/quotes — bayinin teklifleri (taslaklar dahil). */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const dealer = await findDealer(req);
  if (!dealer) {
    res.status(404).json({ message: "Bayi bulunamadı." });
    return;
  }
  res.json({ quotes: await loadQuotes(req.scope, { dealer_id: dealer.id }) });
}

/** POST /admin/dealers/:id/quotes — taslak teklif; fiyatlar sunucuda hesaplanır. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const dealer = await findDealer(req);
  if (!dealer) {
    res.status(404).json({ message: "Bayi bulunamadı." });
    return;
  }
  const parsed = QuoteBodySchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Geçersiz teklif",
      errors: parsed.error.issues,
    });
    return;
  }
  const quote = await createQuote(req.scope, dealer, parsed.data);
  const [full] = await loadQuotes(req.scope, { id: quote.id });
  res.status(201).json({ quote: full });
}
