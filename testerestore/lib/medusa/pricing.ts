/**
 * Band-saw parametric pricing.
 *
 * Pricing model: each (width × thickness × TPI) combo is its own Medusa variant.
 *   - `variant.calculated_price.calculated_amount` is the price-per-meter (when
 *     `product.metadata.price_calculation_type === "per_meter"`) or the flat
 *     price (when `"fixed"`).
 *   - Welding cost is read from `variant.metadata.welding_cost` (override)
 *     or `product.metadata.welding_cost` (default).
 *   - Custom length is collected from the user in mm and converted to meters.
 *
 * The frontend NEVER guesses the price; if the variant has no calculated_price,
 * the configurator surfaces "Fiyat alınamadı" rather than inventing a number.
 */

import type {
  BladeProductMetadata,
  BladeVariantMetadata,
  StoreProduct,
  StoreProductVariant,
} from "./types";
import { getVariantPrice } from "./format";

export interface PriceBreakdown {
  /** Per-meter or flat price (depending on model). */
  basePrice: number;
  /** Length in mm — 0 for fixed-price products. */
  lengthMm: number;
  /** length × pricePerMeter — equal to basePrice for fixed. */
  bladePrice: number;
  /** Welding cost added once per blade. */
  weldingCost: number;
  /** bladePrice + weldingCost. */
  unitPrice: number;
  /** unitPrice × quantity. */
  totalBeforeDiscount: number;
  /** Percentage tier (0/5/10/15). */
  discountPercent: number;
  /** Total after percentage discount, rounded. */
  total: number;
  /** Currency code. */
  currency: string;
  /** True when the variant lacked calculated_price. */
  unavailable?: boolean;
}

export interface PriceInput {
  product: StoreProduct;
  variant: StoreProductVariant | null | undefined;
  lengthMm: number;
  quantity: number;
  /** Apply quantity-tier discount? Defaults to true. */
  applyTierDiscount?: boolean;
}

/** Quantity discount tiers — same as the original BladeConfigurator. */
export const DISCOUNT_TIERS = [
  { qty: 3, percent: 5, label: "3 Adet" },
  { qty: 5, percent: 10, label: "5 Adet" },
  { qty: 10, percent: 15, label: "10+ Adet" },
] as const;

export function getDiscountPercent(quantity: number): number {
  for (let i = DISCOUNT_TIERS.length - 1; i >= 0; i--) {
    if (quantity >= DISCOUNT_TIERS[i].qty) return DISCOUNT_TIERS[i].percent;
  }
  return 0;
}

function readProductMeta(p: StoreProduct): BladeProductMetadata {
  return (p.metadata || {}) as BladeProductMetadata;
}

function readVariantMeta(
  v: StoreProductVariant | null | undefined
): BladeVariantMetadata {
  return ((v?.metadata as BladeVariantMetadata) || {}) as BladeVariantMetadata;
}

/**
 * Compute price breakdown.
 *
 * If `price_calculation_type === "per_meter"` the variant price is multiplied
 * by `lengthMm / 1000`. Otherwise the variant price is used as-is.
 */
export function calculatePrice(input: PriceInput): PriceBreakdown {
  const { product, variant, lengthMm, quantity, applyTierDiscount = true } =
    input;
  const pMeta = readProductMeta(product);
  const vMeta = readVariantMeta(variant);

  const basePrice = getVariantPrice(variant);
  const currency = (
    (variant?.calculated_price?.currency_code as string | undefined) ||
    "try"
  ).toLowerCase();

  if (basePrice === null) {
    return {
      basePrice: 0,
      lengthMm,
      bladePrice: 0,
      weldingCost: 0,
      unitPrice: 0,
      totalBeforeDiscount: 0,
      discountPercent: 0,
      total: 0,
      currency,
      unavailable: true,
    };
  }

  const calcType = pMeta.price_calculation_type ?? "per_meter";
  const lengthM = Math.max(0, lengthMm) / 1000;

  const bladePrice =
    calcType === "per_meter" ? round2(basePrice * lengthM) : basePrice;

  const weldingCost =
    typeof vMeta.welding_cost === "number"
      ? vMeta.welding_cost
      : typeof pMeta.welding_cost === "number"
      ? pMeta.welding_cost
      : 0;

  const unitPrice = round2(bladePrice + weldingCost);
  const totalBeforeDiscount = round2(unitPrice * quantity);
  const discountPercent = applyTierDiscount ? getDiscountPercent(quantity) : 0;
  const total = round2((totalBeforeDiscount * (100 - discountPercent)) / 100);

  return {
    basePrice,
    lengthMm,
    bladePrice,
    weldingCost,
    unitPrice,
    totalBeforeDiscount,
    discountPercent,
    total,
    currency,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Clamp a custom length to product min/max metadata. */
export function clampLength(
  product: StoreProduct,
  lengthMm: number
): { value: number; clamped: boolean } {
  const meta = readProductMeta(product);
  const min = typeof meta.min_length_mm === "number" ? meta.min_length_mm : 100;
  const max =
    typeof meta.max_length_mm === "number" ? meta.max_length_mm : 20000;
  const v = Math.max(min, Math.min(max, Math.round(lengthMm)));
  return { value: v, clamped: v !== lengthMm };
}

/** Whether the product expects a customer-supplied length input. */
export function expectsCustomLength(product: StoreProduct): boolean {
  const meta = readProductMeta(product);
  return meta.custom_length_enabled !== false &&
    (meta.product_type ?? "blade") === "blade";
}
