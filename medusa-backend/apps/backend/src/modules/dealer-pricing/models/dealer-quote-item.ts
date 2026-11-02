import { model } from "@medusajs/framework/utils";

/** Teklif kalemi. `ref_id`: kind "blade" ise matris satırı, "variant" ise varyant. */
const DealerQuoteItem = model
  .define("dealer_quote_item", {
    id: model.id({ prefix: "dlrqi" }).primaryKey(),
    quote_id: model.text(),
    position: model.number(),
    kind: model.text(),
    ref_id: model.text(),
    /** Sepete eklenecek varyant; bıçakta çelik türünü de belirler (M42/M51). */
    variant_id: model.text().nullable(),
    title: model.text(),
    detail: model.text().nullable(),
    length_mm: model.number().nullable(),
    quantity: model.number(),
    /** KDV hariç; bıçakta boy ve kaynak dahil adet başı fiyat. */
    unit_price: model.bigNumber(),
    /** Bayinin revizede istediği birim fiyat; yanıtlanınca temizlenir. */
    requested_unit_price: model.bigNumber().nullable(),
  })
  .indexes([{ on: ["quote_id"] }]);

export default DealerQuoteItem;
