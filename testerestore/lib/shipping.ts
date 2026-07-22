/**
 * Shipping rules — single source of truth for the storefront.
 *
 * Mirrors the backend (`/store/shipping/auto-select` + seed-tr-shipping-update):
 *   - item subtotal (KDV-exclusive) >= 2000 TL  ->  free shipping
 *   - below 2000 TL                              ->  79.90 TL flat fee
 *
 * KDV (20%) is charged on items + shipping, exactly as Medusa computes it, so
 * the summary shown here equals the amount charged at checkout.
 */
export const FREE_SHIPPING_THRESHOLD = 2000;
export const STANDARD_SHIPPING_FEE = 79.9;
export const KDV_RATE = 0.2;

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Shipping base fee (KDV-exclusive) for a given item subtotal. */
export function shippingFeeFor(itemSubtotal: number): number {
  if (itemSubtotal <= 0) return 0;
  return itemSubtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_FEE;
}

/** True once the cart qualifies for free shipping. */
export function qualifiesForFreeShipping(itemSubtotal: number): boolean {
  return itemSubtotal >= FREE_SHIPPING_THRESHOLD;
}

/** How much more (KDV-exclusive) is needed to reach free shipping. */
export function amountToFreeShipping(itemSubtotal: number): number {
  if (itemSubtotal <= 0) return FREE_SHIPPING_THRESHOLD;
  return Math.max(0, FREE_SHIPPING_THRESHOLD - itemSubtotal);
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
export function summarizeOrder(itemSubtotal: number, discount = 0): OrderSummary {
  const subTotal = Math.max(0, itemSubtotal);
  const shipping = shippingFeeFor(subTotal);
  const taxable = Math.max(0, subTotal + shipping - discount);
  const kdv = round2(taxable * KDV_RATE);
  const total = round2(subTotal + shipping - discount + kdv);
  return { subTotal, shipping, discount, kdv, total };
}
