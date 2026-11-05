import { orderRequestSchema, publicRequest, validateRequestItems } from "../customer-request";
const ordered = [{ id: "item_a", quantity: 2, title: "Bıçak" }];
describe("customer request boundaries", () => {
  test("rejects items outside the order and excessive or fractional quantities", () => {
    expect(() => validateRequestItems([{ item_id: "other_order_item", quantity: 1 }], ordered)).toThrow();
    expect(() => validateRequestItems([{ item_id: "item_a", quantity: 3 }], ordered)).toThrow();
    expect(() => validateRequestItems([{ item_id: "item_a", quantity: 1.5 }], ordered)).toThrow();
  });
  test("does not allow duplicated item IDs to bypass quantity validation", () => {
    expect(() => validateRequestItems([{ item_id: "item_a", quantity: 2 }, { item_id: "item_a", quantity: 2 }], ordered)).toThrow();
  });
  test("snapshots server title and accepts a valid partial request", () => {
    expect(validateRequestItems([{ item_id: "item_a", quantity: 1 }], ordered)).toEqual([{ item_id: "item_a", quantity: 1, title: "Bıçak" }]);
  });
  test("does not expose internal notes or other personal fields in customer responses", () => {
    const publicRow = publicRequest({ id: "req_a", internal_note: "private", email: "private@example.com", name: "Hidden", request_key: "secret", public_reply: "İnceleniyor" });
    expect(publicRow).not.toHaveProperty("internal_note");
    expect(publicRow).not.toHaveProperty("email");
    expect(publicRow).not.toHaveProperty("request_key");
    expect(publicRow.public_reply).toBe("İnceleniyor");
  });
  test("rejects submitted order ownership and status fields", () => {
    expect(orderRequestSchema.safeParse({ request_key: "f2cdd7cb-2cb7-4df8-98ba-872097130955", kind: "return", message: "Ürün değişimi talebi", items: [{ item_id: "item_a", quantity: 1 }], customer_id: "someone_else", status: "resolved" }).success).toBe(false);
  });
});
