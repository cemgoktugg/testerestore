import { model } from "@medusajs/framework/utils";

/** Teklif kalemi. `ref_id`: kind "blade" ise matris satırı, "variant" ise varyant. */
const DealerQuoteItem = model
  .define("dealer_quote_item", {
    id: model.id({ prefix: "dlrqi" }).primaryKey(),
    quote_id: model.text(),
    position: model.number(),
    kind: model.text(),
    ref_id: model.text(),
    title: model.text(),
    detail: model.text().nullable(),
    length_mm: model.number().nullable(),
    quantity: model.number(),
    /** KDV hariç; bıçakta boy ve kaynak dahil adet başı fiyat. */
    unit_price: model.bigNumber(),
  })
  .indexes([{ on: ["quote_id"] }]);

export default DealerQuoteItem;
