import { DEFAULT_CURRENCY } from "./config";
import type {
  StoreProduct,
  StoreProductVariant,
  StoreCalculatedPrice,
} from "./types";

/**
 * Format a price into the user's locale.
 *
 * Medusa v2 returns prices as decimal numbers in the variant currency
 * (already converted to major units when `calculated_price` is present).
 */
export function formatMoney(
  amount: number | null | undefined,
  currency: string = DEFAULT_CURRENCY
): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "—";
  }
  try {
    return new Intl.NumberFormat("tr-TR", {
      style: "currency",
      currency: (currency || DEFAULT_CURRENCY).toUpperCase(),
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toLocaleString("tr-TR")} ${currency.toUpperCase()}`;
  }
}

/** Pull `calculated_price.calculated_amount` from a variant safely. */
export function getVariantPrice(
  variant: StoreProductVariant | undefined | null
): number | null {
  const cp = variant?.calculated_price as StoreCalculatedPrice | undefined;
  if (cp && typeof cp.calculated_amount === "number") {
    return cp.calculated_amount;
  }
  return null;
}

/** Pull original (pre-discount) price for strikethrough display. */
export function getVariantOriginalPrice(
  variant: StoreProductVariant | undefined | null
): number | null {
  const cp = variant?.calculated_price as StoreCalculatedPrice | undefined;
  if (cp && typeof cp.original_amount === "number") {
    return cp.original_amount;
  }
  return null;
}

/** Get the cheapest variant in a product (used for "from X TL" labels). */
export function getCheapestVariant(
  product: StoreProduct | undefined | null
): StoreProductVariant | null {
  if (!product?.variants?.length) return null;
  const priced = product.variants
    .map((v) => ({ v, p: getVariantPrice(v) }))
    .filter((x): x is { v: StoreProductVariant; p: number } => x.p !== null);
  if (!priced.length) return null;
  priced.sort((a, b) => a.p - b.p);
  return priced[0].v;
}

/** Currency code shared by all variants (falls back to default). */
export function getProductCurrency(product: StoreProduct | undefined): string {
  const v = product?.variants?.[0];
  const cp = v?.calculated_price as StoreCalculatedPrice | undefined;
  return (cp?.currency_code || DEFAULT_CURRENCY).toLowerCase();
}

/** "From X TL" label used on cards. */
export function getProductPriceLabel(
  product: StoreProduct | undefined
): string | undefined {
  if (!product) return undefined;
  const v = getCheapestVariant(product);
  const p = getVariantPrice(v);
  if (p === null) return undefined;
  const currency = getProductCurrency(product);
  return `${formatMoney(p, currency)} 'dan itibaren`;
}

/** Local placeholder images shipped in /public/images. */
const BLADE_IMAGES = {
  machine: "/images/bandsaw_machine.png",
  carbide: "/images/carbide_blade.png",
  wood: "/images/woodworking_blade.png",
  bimetal: "/images/bimetal_blade.png",
} as const;

/**
 * Pick a sensible placeholder image from the product's model, which is written
 * at the start of the title (e.g. "Bi-Metal M42 Hazır — …") and/or the
 * `blade_type` / `product_type` metadata. Used for products that have no
 * uploaded image — ready-made blades in particular — so they automatically
 * get the right blade picture instead of a blank/generic placeholder.
 */
export function resolveBladeImage(opts: {
  title?: string | null;
  bladeType?: string | null;
  productType?: string | null;
}): string {
  const hay = `${opts.title ?? ""} ${opts.bladeType ?? ""}`.toLowerCase();
  if (opts.productType === "machine" || /makine|machine|kraken/.test(hay)) {
    return BLADE_IMAGES.machine;
  }
  if (/karb[üu]r|carbide/.test(hay)) return BLADE_IMAGES.carbide;
  if (/ah[şs]ap|wood|a[ğg]a[çc]/.test(hay)) return BLADE_IMAGES.wood;
  // Bi-Metal / M42 / M51 / et-kemik / sünger-tekstil → bi-metal görseli
  return BLADE_IMAGES.bimetal;
}

/** First real image URL, else a model-aware placeholder (see resolveBladeImage). */
export function getProductImage(product: StoreProduct | undefined): string {
  const real = product?.thumbnail || product?.images?.[0]?.url;
  if (real) return real;
  const meta = (product?.metadata || {}) as {
    blade_type?: string;
    product_type?: string;
  };
  return resolveBladeImage({
    title: product?.title,
    bladeType: meta.blade_type,
    productType: meta.product_type,
  });
}
