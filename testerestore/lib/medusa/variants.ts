/**
 * Variant selection helpers for parametric blade products.
 *
 * Each variant in Medusa represents one (Width × Thickness × TPI) combination.
 * Option titles must match OPTION_WIDTH / OPTION_THICKNESS / OPTION_TPI exactly.
 */

import type { StoreProduct, StoreProductVariant } from "./types";
import { OPTION_WIDTH, OPTION_THICKNESS, OPTION_TPI } from "./types";

export interface BladeOptionSet {
  /** Sorted, unique values across all variants. */
  widths: string[];
  thicknesses: string[];
  tpis: string[];
  /** Allowed thicknesses per width. */
  thicknessByWidth: Record<string, string[]>;
  /** Allowed TPIs per (width, thickness). */
  tpiByWidthThickness: Record<string, string[]>;
}

const KEY = (w: string, t: string) => `${w}|${t}`;

function getOptionValue(
  variant: StoreProductVariant,
  optionTitle: string
): string | undefined {
  if (!variant.options) return undefined;
  for (const ov of variant.options) {
    const title = (ov as { option?: { title?: string } }).option?.title;
    if (title === optionTitle) {
      return ((ov as { value?: string }).value as string) || undefined;
    }
  }
  return undefined;
}

/**
 * Build an "option matrix" that the configurator uses to drive the
 * Width / Thickness / TPI selects (with dependent disabling).
 */
export function buildOptionMatrix(product: StoreProduct): BladeOptionSet {
  const widths = new Set<string>();
  const thicknesses = new Set<string>();
  const tpis = new Set<string>();
  const thicknessByWidth: Record<string, Set<string>> = {};
  const tpiByWidthThickness: Record<string, Set<string>> = {};

  for (const v of product.variants ?? []) {
    const w = getOptionValue(v, OPTION_WIDTH);
    const t = getOptionValue(v, OPTION_THICKNESS);
    const tp = getOptionValue(v, OPTION_TPI);

    if (w) widths.add(w);
    if (t) thicknesses.add(t);
    if (tp) tpis.add(tp);

    if (w && t) {
      thicknessByWidth[w] ??= new Set();
      thicknessByWidth[w].add(t);
      if (tp) {
        const k = KEY(w, t);
        tpiByWidthThickness[k] ??= new Set();
        tpiByWidthThickness[k].add(tp);
      }
    }
  }

  const sortNum = (arr: string[]) =>
    [...arr].sort((a, b) => {
      const an = parseFloat(a);
      const bn = parseFloat(b);
      if (Number.isFinite(an) && Number.isFinite(bn) && an !== bn) return an - bn;
      return a.localeCompare(b);
    });

  return {
    widths: sortNum([...widths]),
    thicknesses: sortNum([...thicknesses]),
    tpis: [...tpis].sort(),
    thicknessByWidth: Object.fromEntries(
      Object.entries(thicknessByWidth).map(([k, v]) => [k, sortNum([...v])])
    ),
    tpiByWidthThickness: Object.fromEntries(
      Object.entries(tpiByWidthThickness).map(([k, v]) => [k, [...v].sort()])
    ),
  };
}

/**
 * Find the variant matching the given (width, thickness, TPI) selection.
 * If an exact match is missing, falls back to (width, thickness) only,
 * then to width only. Returns null if no variant exists at all.
 */
export function findVariant(
  product: StoreProduct,
  selection: { width?: string; thickness?: string; tpi?: string }
): StoreProductVariant | null {
  const variants = product.variants ?? [];
  if (!variants.length) return null;

  const exact = variants.find(
    (v) =>
      (!selection.width || getOptionValue(v, OPTION_WIDTH) === selection.width) &&
      (!selection.thickness ||
        getOptionValue(v, OPTION_THICKNESS) === selection.thickness) &&
      (!selection.tpi || getOptionValue(v, OPTION_TPI) === selection.tpi)
  );
  if (exact) return exact;

  const partial = variants.find(
    (v) =>
      (!selection.width ||
        getOptionValue(v, OPTION_WIDTH) === selection.width) &&
      (!selection.thickness ||
        getOptionValue(v, OPTION_THICKNESS) === selection.thickness)
  );
  if (partial) return partial;

  const byWidth = variants.find(
    (v) =>
      !selection.width || getOptionValue(v, OPTION_WIDTH) === selection.width
  );
  return byWidth ?? variants[0] ?? null;
}

/** Public helper for callers that want to read an option from a variant. */
export function readOption(
  variant: StoreProductVariant,
  optionTitle: string
): string | undefined {
  return getOptionValue(variant, optionTitle);
}

/** True when the variant has stock (or stock is not tracked). */
export function isVariantInStock(variant: StoreProductVariant | null): boolean {
  if (!variant) return false;
  const v = variant as StoreProductVariant & {
    manage_inventory?: boolean;
    allow_backorder?: boolean;
    inventory_quantity?: number;
  };
  if (v.manage_inventory === false) return true;
  if (v.allow_backorder) return true;
  if (typeof v.inventory_quantity === "number") return v.inventory_quantity > 0;
  return true;
}
