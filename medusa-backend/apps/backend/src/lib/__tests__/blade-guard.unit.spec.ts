import { assertMatrixAllowedForProduct, matrixBladeTypeFor } from "../blade-guard";

const spezial = {
  handle: "spezial-alman-celigi",
  status: "published",
  metadata: { custom_length_enabled: true, min_length_mm: 1000, max_length_mm: 10000 },
};

describe("ahşap ürünleri ayrı matris tipinde", () => {
  it("Uddeholm woodcut'ta, Spezial spezialstahl'da", () => {
    expect(matrixBladeTypeFor({ handle: "woodcut-classic" })).toBe("woodcut");
    expect(matrixBladeTypeFor({ handle: "spezial-alman-celigi" })).toBe("spezialstahl");
  });

  it("Spezial, Uddeholm fiyatıyla sepete konamaz", () => {
    expect(() => assertMatrixAllowedForProduct(spezial, "spezialstahl", 2000)).not.toThrow();
    expect(() => assertMatrixAllowedForProduct(spezial, "woodcut", 2000)).toThrow();
  });
});
