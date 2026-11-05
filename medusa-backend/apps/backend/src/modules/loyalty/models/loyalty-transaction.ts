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
  idempotency_key: model.text().nullable(),
  target_points: model.number().nullable(),
}).indexes([{ name: "IDX_loyalty_transaction_key", on: ["idempotency_key"], unique: true }]);

export default LoyaltyTransaction;
