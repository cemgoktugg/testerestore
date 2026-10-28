/**
 * Kargo kuralları — storefront için tek kaynak.
 *
 * KURAL: ürün toplamı KDV DAHİL 2.000 TL ve üzeri → standart kargo ücretsiz;
 * altında 171,00 TL (KDV DAHİL — kullanıcı kararı 2026-10-27).
 *
 * Asıl kural Medusa'da: "Standart Kargo" seçeneğinin koşullu fiyatı (price
 * rule `item_total >= 2000`; item_total KDV dahil ürün toplamıdır). Buradaki
 * değerler yalnızca gösterim içindir (sepet ilerleme çubuğu, kargo seçenekleri
 * gelmeden önceki özet); eşik değişirse ikisi birlikte güncellenmeli
 * (backend: src/lib/auto-shipping.ts).
 *
 * Fonksiyonlar sepetteki KDV HARİÇ ara toplamı alır (sepet öyle tutuluyor) ve
 * eşikle karşılaştırmak için KDV'yi ekler.
 *
 * KDV gösterimi: özetteki "KDV" satırı yalnızca ÜRÜNLERİN KDV'sidir; kargo tek
 * satırda KDV DAHİL gösterilir (kargonun KDV'si fiyatın içindedir, faturada yine
 * yer alır). Medusa'da Türkiye bölgesi "KDV dahil fiyat" tercihiyle kargo fiyatı
 * KDV dahil hesaplanır; tercih kapalıysa (eski durum) sunucu kargoya %20 ekler —
 * shippingWithKdv() iki durumda da müşterinin ödeyeceği kargo tutarını verir, yani
 * özet her zaman tahsil edilen tutarla aynıdır.
 */
/** Ücretsiz kargo eşiği — KDV DAHİL ürün toplamı. */
export const FREE_SHIPPING_THRESHOLD = 2000;
/** Standart kargo ücreti — KDV DAHİL. */
export const STANDARD_SHIPPING_FEE = 171;
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

/** Standart kargo ücreti (KDV dahil) — kargo seçenekleri gelmeden önceki tahmin. */
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

/**
 * Müşterinin ödeyeceği kargo tutarı (KDV dahil). `taxInclusive`: Medusa bu kargo
 * fiyatını KDV dahil mi hesaplıyor (shipping option `is_tax_inclusive`).
 */
export function shippingWithKdv(amount: number, taxInclusive = true): number {
  return taxInclusive ? round2(amount) : round2(amount * (1 + KDV_RATE));
}

export interface OrderSummary {
  /** Ürünler, KDV hariç */
  subTotal: number;
  /** Kargo, KDV DAHİL */
  shipping: number;
  discount: number;
  /** Yalnızca ürünlerin KDV'si */
  kdv: number;
  total: number;
}

/**
 * Sipariş özeti: Ara Toplam (KDV hariç) + KDV (ürünler) + Kargo (KDV dahil) =
 * Genel Toplam; Medusa'nın tahsil ettiği tutarla aynıdır.
 */
export function summarizeOrder(
  itemSubtotal: number,
  discount = 0,
  /** Sunucunun seçili kargo seçeneği için hesapladığı ücret (varsa bu kullanılır). */
  shippingOverride?: number,
  /** Sunucu bu kargo fiyatını KDV dahil mi hesaplıyor (yoksa %20 eklenir). */
  shippingTaxInclusive = true
): OrderSummary {
  const subTotal = Math.max(0, itemSubtotal);
  const shipping =
    typeof shippingOverride === 'number'
      ? shippingWithKdv(shippingOverride, shippingTaxInclusive)
      : shippingFeeFor(subTotal);
  const kdv = round2(Math.max(0, subTotal - discount) * KDV_RATE);
  const total = round2(subTotal - discount + kdv + shipping);
  return { subTotal, shipping, discount, kdv, total };
}
