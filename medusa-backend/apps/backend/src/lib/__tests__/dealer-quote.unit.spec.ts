import { QuoteBodySchema, quoteNumberLabel, quoteTotals } from "../dealer-quote";

describe("quoteTotals", () => {
  it("adet × birim fiyatı toplar ve %20 KDV ekler", () => {
    expect(
      quoteTotals([
        { quantity: 10, unit_price: "724.8" },
        { quantity: 2, unit_price: 763 },
      ])
    ).toEqual({ subtotal: 8774, tax: 1754.8, total: 10528.8 });
  });

  it("boş listede sıfır döner", () => {
    expect(quoteTotals([])).toEqual({ subtotal: 0, tax: 0, total: 0 });
  });
});

describe("quoteNumberLabel", () => {
  it("yıl ve dört haneli sıra numarası verir", () => {
    expect(quoteNumberLabel({ number: 7, created_at: "2026-11-02T10:00:00Z" })).toBe("T-2026-0007");
  });
});

describe("QuoteBodySchema", () => {
  const blade = { kind: "blade", ref_id: "bp_1", length_mm: 2000, quantity: 1 };

  it("geçerli kalemi kabul eder", () => {
    expect(QuoteBodySchema.safeParse({ items: [blade] }).success).toBe(true);
  });

  it.each([
    ["boş liste", { items: [] }],
    ["sıfır adet", { items: [{ ...blade, quantity: 0 }] }],
    ["kısa boy", { items: [{ ...blade, length_mm: 50 }] }],
    ["uzun boy", { items: [{ ...blade, length_mm: 99999 }] }],
    ["bilinmeyen tür", { items: [{ ...blade, kind: "x" }] }],
  ])("%s reddedilir", (_name, body) => {
    expect(QuoteBodySchema.safeParse(body).success).toBe(false);
  });
});
