import { hasVerifiedPurchase } from "../verified-purchase";
const base = { status: "pending", items: [{ id: "line_a", product_id: "prod_a" }], fulfillments: [{ shipped_at: "2026-10-19", items: [{ line_item_id: "line_a" }] }] };
describe("verified purchase badge", () => {
  test("requires the reviewed product to have shipped or the order to be completed", () => {
    expect(hasVerifiedPurchase([base], "prod_a")).toBe(true);
    expect(hasVerifiedPurchase([base], "prod_b")).toBe(false);
    expect(hasVerifiedPurchase([{ ...base, fulfillments: [] }], "prod_a")).toBe(false);
    expect(hasVerifiedPurchase([{ ...base, status: "completed", fulfillments: [] }], "prod_a")).toBe(true);
  });
  test("does not verify canceled orders, canceled shipments, or another item's shipment", () => {
    expect(hasVerifiedPurchase([{ ...base, status: "canceled" }], "prod_a")).toBe(false);
    expect(hasVerifiedPurchase([{ ...base, fulfillments: [{ ...base.fulfillments[0], canceled_at: "2026-10-19" }] }], "prod_a")).toBe(false);
    expect(hasVerifiedPurchase([{ ...base, fulfillments: [{ shipped_at: "2026-10-19", items: [{ line_item_id: "line_b" }] }] }], "prod_a")).toBe(false);
  });
});
