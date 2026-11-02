import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { dealerService, type DealerRecord } from "../../../../../../lib/dealer-pricing";
import {
  loadQuotes,
  priceQuoteItems,
  QuoteBodySchema,
  replaceQuoteItems,
} from "../../../../../../lib/dealer-quote";

const RespondSchema = z.object({
  action: z.literal("respond"),
  note: z.string().trim().max(1000).nullable().optional(),
  items: z
    .array(z.object({ id: z.string().min(1), unit_price: z.number().positive("Fiyat 0'dan büyük olmalı.") }))
    .min(1),
});
const UpdateSchema = z.union([
  z.object({ action: z.literal("send") }),
  RespondSchema,
  QuoteBodySchema,
]);

/**
 * POST /admin/dealers/:id/quotes/:quote_id
 * Taslağı günceller ya da `{ action: "send" }` ile bayiye gönderir. Gönderirken
 * fiyatlar güncel listeden yeniden hesaplanır; gönderilmiş teklif değişmez.
 * `{ action: "respond" }` revize talebini verilen fiyatlarla yanıtlar: bu fiyat
 * sepette de geçerli olur.
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
  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Geçersiz teklif",
      errors: parsed.error.issues,
    });
    return;
  }
  const record = dealer as unknown as DealerRecord;

  if ("action" in parsed.data && parsed.data.action === "respond") {
    if (quote.status !== "revision_requested") {
      res.status(409).json({ message: "Bu teklif için bekleyen revize talebi yok." });
      return;
    }
    const current = await service.listDealerQuoteItems(
      { quote_id: quote.id },
      { select: ["id"], take: 10000 }
    );
    const prices = new Map(parsed.data.items.map((i) => [i.id, i.unit_price]));
    if (current.some((i) => !prices.has(i.id)) || prices.size !== current.length) {
      res.status(400).json({ message: "Tüm kalemlerin fiyatı girilmeli." });
      return;
    }
    await service.updateDealerQuoteItems(
      current.map((i) => ({
        id: i.id,
        unit_price: prices.get(i.id) as number,
        requested_unit_price: null,
      }))
    );
    await service.updateDealerQuotes({
      id: quote.id,
      status: "sent",
      sent_at: new Date(),
      revision: Number(quote.revision ?? 0) + 1,
      revision_note: null,
      revision_requested_at: null,
      ...(parsed.data.note !== undefined ? { note: parsed.data.note } : {}),
    });
    const [full] = await loadQuotes(req.scope, { id: quote.id });
    res.json({ quote: full });
    return;
  }

  if (quote.status !== "draft") {
    res.status(409).json({ message: "Gönderilmiş teklif değiştirilemez. Silip yenisini hazırlayın." });
    return;
  }

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
        variant_id: i.variant_id,
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
