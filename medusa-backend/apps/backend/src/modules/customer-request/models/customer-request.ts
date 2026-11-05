import { model } from "@medusajs/framework/utils";

const CustomerRequest = model.define("customer_request", {
  id: model.id().primaryKey(),
  request_number: model.text().unique(),
  request_key: model.text().unique(),
  kind: model.enum(["contact", "return", "exchange"]),
  status: model.enum(["new", "in_progress", "awaiting_customer", "resolved"]).default("new"),
  customer_id: model.text().nullable(),
  order_id: model.text().nullable(),
  name: model.text(),
  email: model.text(),
  phone: model.text().nullable(),
  topic: model.text().nullable(),
  message: model.text(),
  items: model.json().nullable(),
  public_reply: model.text().nullable(),
  internal_note: model.text().nullable(),
});
export default CustomerRequest;
