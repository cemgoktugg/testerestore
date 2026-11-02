import { mergeBladeRates } from "../dealer-pricing";

const row = { price_per_meter: "450", welding_fee: "70" };

describe("mergeBladeRates", () => {
  it("bayi fiyatı yoksa genel fiyatı kullanır", () => {
    expect(mergeBladeRates(row)).toEqual({ pricePerMeter: 450, weldingFee: 70, dealerPrice: false });
    expect(mergeBladeRates(row, null).dealerPrice).toBe(false);
  });

  it("boş alanlar genel fiyatı kullanır ve bayi fiyatı sayılmaz", () => {
    expect(mergeBladeRates(row, { price_per_meter: null, welding_fee: null })).toEqual({
      pricePerMeter: 450,
      weldingFee: 70,
      dealerPrice: false,
    });
  });

  it("yalnız metre fiyatı girilirse kaynak genel kalır", () => {
    expect(mergeBladeRates(row, { price_per_meter: "300", welding_fee: null })).toEqual({
      pricePerMeter: 300,
      weldingFee: 70,
      dealerPrice: true,
    });
  });

  it("yalnız kaynak girilirse metre genel kalır; 0 kaynak geçerlidir", () => {
    expect(mergeBladeRates(row, { price_per_meter: null, welding_fee: 0 })).toEqual({
      pricePerMeter: 450,
      weldingFee: 0,
      dealerPrice: true,
    });
  });
});
