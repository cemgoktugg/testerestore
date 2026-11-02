import { model } from "@medusajs/framework/utils";

/**
 * Bir bayinin matris satırına özel fiyatı. Boş alan genel fiyatı kullanır;
 * örneğin yalnız metre fiyatı girilirse kaynak ücreti matristen gelir.
 */
const DealerBladePrice = model
  .define("dealer_blade_price", {
    id: model.id({ prefix: "dlrbp" }).primaryKey(),
    dealer_id: model.text(),
    blade_price_id: model.text(),
    price_per_meter: model.bigNumber().nullable(),
    welding_fee: model.bigNumber().nullable(),
  })
  .indexes([
    {
      on: ["dealer_id", "blade_price_id"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ]);

export default DealerBladePrice;
