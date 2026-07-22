/**
 * Domain types for the band-saw store.
 *
 * Three categories:
 *   1. Re-exported Medusa Store types (HttpTypes).
 *   2. Shaped types used by the frontend UI (StoreProductCard, etc.).
 *   3. Band-saw specific metadata interfaces that the admin fills in.
 */

import type { HttpTypes } from "@medusajs/types";

// Re-export the Medusa store types we use across the app
export type StoreProduct = HttpTypes.StoreProduct;
export type StoreProductVariant = HttpTypes.StoreProductVariant;
export type StoreProductOption = HttpTypes.StoreProductOption;
export type StoreProductCategory = HttpTypes.StoreProductCategory;
export type StoreCollection = HttpTypes.StoreCollection;
export type StoreRegion = HttpTypes.StoreRegion;
export type StoreCart = HttpTypes.StoreCart;
export type StoreCartLineItem = HttpTypes.StoreCartLineItem;
export type StoreCalculatedPrice = HttpTypes.StoreCalculatedPrice;

/**
 * Admin metadata convention for blade products.
 *
 * Stored on `product.metadata` (Medusa Admin → Product → Metadata tab).
 * Every field is optional so the frontend degrades gracefully.
 */
export interface BladeProductMetadata {
  /** Blade material grade — M42, M51, TCT, carbon, stainless, etc. */
  blade_type?: string;

  /** Material(s) the blade is designed to cut. */
  material_usage?: Array<
    "metal" | "wood" | "meat_bone" | "sponge_textile" | "carbide_tipped" | string
  >;

  /** Default/displayed width — actual widths are usually variant options. */
  width_mm?: string | number;

  /** Default/displayed thickness. */
  thickness_mm?: string | number;

  /** Available tooth pitches (TPI). */
  tooth_pitch?: string[];

  /** Tooth form for the spec visualizer — düz / kanca / atlamalı. */
  tooth_form?: "regular" | "hook" | "skip";

  /** Tooth set pattern — raker / dalga / değişken. */
  set_type?: "raker" | "wavy" | "alternate";

  /** If true, the frontend shows a custom-length input. */
  custom_length_enabled?: boolean;

  /** Minimum allowed custom length in mm. */
  min_length_mm?: number;

  /** Maximum allowed custom length in mm. */
  max_length_mm?: number;

  /**
   * Pricing model for custom-length blades:
   *   - "per_meter" → variant price is per meter; multiplied by length_m
   *   - "fixed"     → variant price is the final price (length ignored)
   */
  price_calculation_type?: "per_meter" | "fixed";

  /** Welding cost added once per blade (TL or store currency unit). */
  welding_cost?: number;

  /** Bullet list of selling features shown under "Temel Avantajları". */
  technical_features?: string[];

  /** Free-form technical spec rows shown in the "Teknik Özellikler" table.
   *  Admin-editable; appended after the auto-derived rows. */
  technical_specs?: Array<{ label: string; value: string }>;

  /** Recommended cutting speeds shown in the "Kullanım Alanları" tab. */
  cutting_speeds?: Array<{ material: string; speed: string }>;

  /** SEO overrides. */
  seo_title?: string;
  seo_description?: string;

  /** Long marketing description (overrides product.description in detail page). */
  long_description?: string;

  /** Applications list shown in "Kullanım Alanları" tab. */
  applications?: string[];

  /** Featured/best-seller flag for home page widgets. */
  is_best_seller?: boolean;
  best_seller_rank?: number;

  /** Optional dummy review/rating metadata for badges. */
  rating?: number;
  reviews_count?: number;
  sold_count?: string;

  /** Type discriminator — UI uses this to switch detail-page layout. */
  product_type?: "blade" | "machine";

  /** Documents/PDFs (downloadable spec sheets etc.). */
  documents?: Array<{ name: string; url: string; size?: string; desc?: string }>;
}

/**
 * Variant metadata convention.
 *
 * Variant options (width/thickness/TPI) are first-class Medusa option values.
 * Things that vary per variant but aren't options live here.
 */
export interface BladeVariantMetadata {
  /** Price per meter in minor currency units (e.g. cents). Overrides product. */
  price_per_meter?: number;

  /** Per-variant welding cost override. */
  welding_cost?: number;

  /** Lead-time hint shown next to price. */
  lead_time_days?: number;
}

/**
 * Convention for Medusa product option titles.
 * Keep these EXACTLY matching what the Medusa Admin uses.
 */
export const OPTION_WIDTH = "Genişlik";
export const OPTION_THICKNESS = "Kalınlık";
export const OPTION_TPI = "Diş Adımı";

/** Shape consumed by the home-page Premium Catalog card. */
export interface CatalogProductCard {
  id: string;
  handle: string;
  name: string;
  description: string;
  image: string;
  category: string;
  href: string;
  priceLabel?: string;
  isBestSeller?: boolean;
}

/** Shape consumed by the Best Sellers slider. */
export interface BestSellerCard {
  id: string;
  handle: string;
  name: string;
  tagline: string;
  image: string;
  rating: number;
  reviews: number;
  sold: string;
  href: string;
}

/** Item-level data passed to addToCart with band-saw specific metadata. */
export interface BladeCartItemPayload {
  variantId: string;
  quantity: number;
  bladeSpecs: {
    width?: string;
    thickness?: string;
    tpi?: string;
    length_mm?: number;
    welding?: boolean;
  };
  /** Unit price the user saw in the configurator (in minor units). */
  unitPriceAtAdd?: number;
}
