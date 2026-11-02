import { model } from "@medusajs/framework/utils";

/**
 * Bayiye hazırlanan teklif. `draft` yalnız panelde görünür; `sent` bayinin
 * hesabına düşer. Fiyatlar kalemlere kopyalanır: liste sonradan değişse de
 * gönderilmiş teklif aynı kalır.
 */
const DealerQuote = model
  .define("dealer_quote", {
    id: model.id({ prefix: "dlrq" }).primaryKey(),
    dealer_id: model.text(),
    number: model.number(),
    status: model.text().default("draft"),
    note: model.text().nullable(),
    sent_at: model.dateTime().nullable(),
  })
  .indexes([
    { on: ["number"], unique: true },
    { on: ["dealer_id"] },
  ]);

export default DealerQuote;
