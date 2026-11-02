import { model } from "@medusajs/framework/utils";

/**
 * Bayiye hazırlanan teklif. Fiyatlar kalemlere kopyalanır: liste sonradan
 * değişse de gönderilmiş teklif aynı kalır.
 *
 * Durumlar: draft (yalnız panel) → sent → accepted (sepette) → ordered.
 * sent → revision_requested → sent: bayi fiyat ister, yönetici yanıtlar.
 */
const DealerQuote = model
  .define("dealer_quote", {
    id: model.id({ prefix: "dlrq" }).primaryKey(),
    dealer_id: model.text(),
    number: model.number(),
    status: model.text().default("draft"),
    note: model.text().nullable(),
    sent_at: model.dateTime().nullable(),
    accepted_at: model.dateTime().nullable(),
    ordered_at: model.dateTime().nullable(),
    /** Yanıtlanan revize sayısı; teklif numarasında -R1 olarak görünür. */
    revision: model.number().default(0),
    revision_note: model.text().nullable(),
    revision_requested_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["number"], unique: true },
    { on: ["dealer_id"] },
  ]);

export default DealerQuote;
