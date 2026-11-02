import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { dealerService, findActiveDealer } from "../../../../../../lib/dealer-pricing";

const Schema = z.object({
  note: z.string().trim().max(1000).nullable().optional(),
  items: z
    .array(
      z.object({
        id: z.string().min(1),
        requested_unit_price: z.number().positive("Fiyat 0'dan büyük olmalı.").max(100000000),
      })
    )
    .default([]),
});

/**
 * POST /store/dealer/quotes/:id/revision
 *
 * Bayi gönderilmiş teklif için istediği birim fiyatları ve notunu iletir.
 * Yalnız talep kaydedilir; fiyat, yönetici panelden yanıtlayana kadar değişmez.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.issues[0]?.message ?? "Geçersiz talep" });
    return;
  }
  const { note, items } = parsed.data;
  if (!items.length && !note) {
    res.status(400).json({ message: "En az bir fiyat ya da not yazın." });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealer = await findActiveDealer(req.scope, (req as any).auth_context?.actor_id);
  const service = dealerService(req.scope);
  const [quote] = dealer
    ? await service.listDealerQuotes({ id: req.params.id, dealer_id: dealer.id }, { take: 1 })
    : [];
  if (!quote || quote.status === "draft") {
    res.status(404).json({ message: "Teklif bulunamadı." });
    return;
  }
  if (quote.status !== "sent") {
    res.status(409).json({ message: "Bu teklif için revize istenemez." });
    return;
  }

  const current = await service.listDealerQuoteItems(
    { quote_id: quote.id },
    { select: ["id"], take: 10000 }
  );
  const known = new Set(current.map((i) => i.id));
  if (items.some((i) => !known.has(i.id))) {
    res.status(400).json({ message: "Teklifte olmayan bir kalem gönderildi." });
    return;
  }
  const requested = new Map(items.map((i) => [i.id, i.requested_unit_price]));
  await service.updateDealerQuoteItems(
    current.map((i) => ({ id: i.id, requested_unit_price: requested.get(i.id) ?? null }))
  );
  await service.updateDealerQuotes({
    id: quote.id,
    status: "revision_requested",
    revision_note: note ?? null,
    revision_requested_at: new Date(),
  });
  res.json({ ok: true });
}
