import { model } from "@medusajs/framework/utils";

export default model.define("loyalty_redemption", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  request_key: model.text(),
  points: model.number(),
  code: model.text(),
  promotion_id: model.text().nullable(),
  status: model.enum(["draft", "reserved", "ready"]).default("draft"),
}).indexes([
  { name: "IDX_loyalty_redemption_request", on: ["customer_id", "request_key"], unique: true },
  { name: "IDX_loyalty_redemption_code", on: ["code"], unique: true },
]);
