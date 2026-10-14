/**
 * Kargo kuralları — storefront için tek kaynak.
 *
 * KURAL: ürün toplamı KDV DAHİL 2.000 TL ve üzeri → standart kargo ücretsiz;
 * altında 79,90 TL + KDV.
 *
 * Asıl kural Medusa'da: "Standart Kargo" seçeneğinin koşullu fiyatı (price
 * rule `item_total >= 2000`; item_total KDV dahil ürün toplamıdır). Buradaki
 * değerler yalnızca gösterim içindir (sepet ilerleme çubuğu, kargo seçenekleri
 * gelmeden önceki özet); eşik değişirse ikisi birlikte güncellenmeli
 * (backend: src/lib/auto-shipping.ts).
 *
 * Fonksiyonlar sepetteki KDV HARİÇ ara toplamı alır (sepet öyle tutuluyor) ve
 * eşikle karşılaştırmak için KDV'yi ekler. KDV (%20) ürün + kargo üzerinden
 * Medusa'nın hesapladığı gibi uygulanır; özet ödeme tutarıyla aynıdır.
 */
/** Ücretsiz kargo eşiği — KDV DAHİL ürün toplamı. */
export const FREE_SHIPPING_THRESHOLD = 2000;
/** Standart kargo ücreti — KDV hariç. */
export const STANDARD_SHIPPING_FEE = 79.9;
export const KDV_RATE = 0.2;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** KDV hariç ara toplamın KDV dahil karşılığı. */
export function withKdv(itemSubtotal: number): number {
  return round2(itemSubtotal * (1 + KDV_RATE));
}

/** True once the cart qualifies for free shipping. */
export function qualifiesForFreeShipping(itemSubtotal: number): boolean {
  return itemSubtotal > 0 && withKdv(itemSubtotal) >= FREE_SHIPPING_THRESHOLD;
}

/** Shipping base fee (KDV-exclusive) for a given item subtotal. */
export function shippingFeeFor(itemSubtotal: number): number {
  if (itemSubtotal <= 0) return 0;
  return qualifiesForFreeShipping(itemSubtotal) ? 0 : STANDARD_SHIPPING_FEE;
}

/** Ücretsiz kargoya kalan tutar — KDV DAHİL (eşikle aynı birimde). */
export function amountToFreeShipping(itemSubtotal: number): number {
  if (itemSubtotal <= 0) return FREE_SHIPPING_THRESHOLD;
  return Math.max(0, round2(FREE_SHIPPING_THRESHOLD - withKdv(itemSubtotal)));
}

/** Ücretsiz kargoya ilerleme yüzdesi (0–100). */
export function freeShippingProgress(itemSubtotal: number): number {
  if (itemSubtotal <= 0) return 0;
  return Math.min(100, Math.round((withKdv(itemSubtotal) / FREE_SHIPPING_THRESHOLD) * 100));
}

export interface OrderSummary {
  subTotal: number;
  shipping: number;
  discount: number;
  kdv: number;
  total: number;
}

/**
 * Consistent order-summary breakdown that always adds up and equals the
 * amount Medusa charges (KDV on items + shipping, after discount).
 */
export function summarizeOrder(
  itemSubtotal: number,
  discount = 0,
  /** Sunucunun seçili kargo seçeneği için hesapladığı ücret (varsa bu kullanılır). */
  shippingOverride?: number
): OrderSummary {
  const subTotal = Math.max(0, itemSubtotal);
  const shipping =
    typeof shippingOverride === 'number' ? shippingOverride : shippingFeeFor(subTotal);
  const taxable = Math.max(0, subTotal + shipping - discount);
  const kdv = round2(taxable * KDV_RATE);
  const total = round2(subTotal + shipping - discount + kdv);
  return { subTotal, shipping, discount, kdv, total };
}
