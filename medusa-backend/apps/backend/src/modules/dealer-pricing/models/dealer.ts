import { model } from "@medusajs/framework/utils";

/**
 * Bayi kaydı: bir müşteri hesabını özel fiyat listesine bağlar.
 *
 * Hazır boy ve makine fiyatları Medusa'nın fiyat listesindedir
 * (`price_list_id`, kural: `customer_group_id`); ölçüye göre bıçak fiyatları
 * `dealer_blade_price` tablosundadır. Ayrıntı: src/lib/dealer-pricing.ts.
 */
const Dealer = model
  .define("dealer", {
    id: model.id({ prefix: "dlr" }).primaryKey(),
    customer_id: model.text(),
    company_name: model.text(),
    is_active: model.boolean().default(true),
    customer_group_id: model.text(),
    price_list_id: model.text(),
    note: model.text().nullable(),
  })
  .indexes([
    { on: ["customer_id"], unique: true, where: "deleted_at IS NULL" },
  ]);

export default Dealer;
