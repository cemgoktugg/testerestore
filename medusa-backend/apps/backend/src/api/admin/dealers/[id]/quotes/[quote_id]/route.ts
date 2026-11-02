import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { dealerService, type DealerRecord } from "../../../../../../lib/dealer-pricing";
import {
  loadQuotes,
  priceQuoteItems,
  QuoteBodySchema,
  replaceQuoteItems,
} from "../../../../../../lib/dealer-quote";

const UpdateSchema = z.union([z.object({ action: z.literal("send") }), QuoteBodySchema]);

/**
 * POST /admin/dealers/:id/quotes/:quote_id
 * Taslağı günceller ya da `{ action: "send" }` ile bayiye gönderir. Gönderirken
 * fiyatlar güncel listeden yeniden hesaplanır; gönderilmiş teklif değişmez.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service = dealerService(req.scope);
  const [dealer] = await service.listDealers({ id: req.params.id }, { take: 1 });
  const [quote] = dealer
    ? await service.listDealerQuotes({ id: req.params.quote_id, dealer_id: dealer.id }, { take: 1 })
    : [];
  if (!quote) {
    res.status(404).json({ message: "Teklif bulunamadı." });
    return;
  }
  if (quote.status !== "draft") {
    res.status(409).json({ message: "Gönderilmiş teklif değiştirilemez. Silip yenisini hazırlayın." });
    return;
  }
  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Geçersiz teklif",
      errors: parsed.error.issues,
    });
    return;
  }
  const record = dealer as unknown as DealerRecord;

  if ("action" in parsed.data) {
    const current = await service.listDealerQuoteItems(
      { quote_id: quote.id },
      { order: { position: "ASC" }, take: 10000 }
    );
    const items = await priceQuoteItems(
      req.scope,
      record,
      current.map((i) => ({
        kind: i.kind as "blade" | "variant",
        ref_id: i.ref_id,
        length_mm: i.length_mm,
        quantity: Number(i.quantity),
      }))
    );
    await replaceQuoteItems(req.scope, quote.id, items);
    await service.updateDealerQuotes({ id: quote.id, status: "sent", sent_at: new Date() });
  } else {
    const items = await priceQuoteItems(req.scope, record, parsed.data.items);
    await replaceQuoteItems(req.scope, quote.id, items);
    await service.updateDealerQuotes({ id: quote.id, note: parsed.data.note ?? null });
  }
  const [full] = await loadQuotes(req.scope, { id: quote.id });
  res.json({ quote: full });
}

/** DELETE — teklifi siler; gönderilmişse bayinin hesabından da kalkar. */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = dealerService(req.scope);
  const [quote] = await service.listDealerQuotes(
    { id: req.params.quote_id, dealer_id: req.params.id },
    { select: ["id"], take: 1 }
  );
  if (!quote) {
    res.status(404).json({ message: "Teklif bulunamadı." });
    return;
  }
  await service.softDeleteDealerQuotes(quote.id);
  res.json({ id: quote.id, deleted: true });
}
