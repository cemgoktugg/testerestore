import { model } from "@medusajs/framework/utils";

/**
 * Puan hareketi. `points` pozitif=kazanım, negatif=harcama.
 * `reason` insanca açıklama (örn. "Sipariş #123 — 1500 TL × %1 = 15 puan").
 */
const LoyaltyTransaction = model.define("loyalty_transaction", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  order_id: model.text().nullable(),
  points: model.number(),
  reason: model.text().nullable(),
});

export default LoyaltyTransaction;
