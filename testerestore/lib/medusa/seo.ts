/**
 * SEO helpers for Medusa-driven pages.
 *
 * Produces Next.js `Metadata` and JSON-LD product schema from a Medusa
 * product. Designed to be called from Server Components / generateMetadata.
 */

import type { Metadata } from "next";
import type { BladeProductMetadata, StoreProduct } from "./types";
import { getProductImage, getProductPriceLabel } from "./format";
import { siteContent } from "../content-config";
import { getSiteSeo } from "./services/site-seo";

const ABSOLUTE_OG = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"
).replace(/\/$/, "");

export async function buildProductMetadata(
  product: StoreProduct | null,
  fallbackTitle: string,
  fallbackDescription: string
): Promise<Metadata> {
  // Medusa Admin'den ayarlanabilir site adı/şablon
  const seo = await getSiteSeo();
  const siteName = seo.site_name || siteContent.seo.siteName;

  if (!product) {
    return {
      title: fallbackTitle,
      description: fallbackDescription,
    };
  }
  const meta = (product.metadata || {}) as BladeProductMetadata & {
    seo_keywords?: string;
    og_image?: string;
    robots?: string;
    canonical?: string;
  };
  const title = meta.seo_title || `${product.title} — ${siteName}`;
  const description =
    meta.seo_description ||
    product.subtitle ||
    product.description ||
    fallbackDescription;
  const image = meta.og_image || getProductImage(product);
  const canonical = meta.canonical || `/products/${product.handle || product.id}`;
  const keywords = meta.seo_keywords || seo.default_keywords || undefined;
  const robots = meta.robots || seo.robots_default;

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    robots,
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName,
      images: [{ url: image, alt: product.title }],
      locale: seo.default_locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
      ...(seo.twitter_handle && { creator: seo.twitter_handle }),
    },
  };
}

/** JSON-LD Product schema for richer Google results. */
export function buildProductJsonLd(product: StoreProduct): Record<string, unknown> {
  const meta = (product.metadata || {}) as BladeProductMetadata;
  const priceLabel = getProductPriceLabel(product);
  const offers = (product.variants || []).map((v) => {
    const cp = v.calculated_price;
    return {
      "@type": "Offer",
      sku: v.sku || v.id,
      price: cp?.calculated_amount ?? undefined,
      priceCurrency: cp?.currency_code?.toUpperCase(),
      availability:
        (v as { inventory_quantity?: number }).inventory_quantity === 0
          ? "https://schema.org/OutOfStock"
          : "https://schema.org/InStock",
    };
  });

  return {
    "@context": "https://schema.org/",
    "@type": "Product",
    name: product.title,
    image: [getProductImage(product)].concat(
      (product.images || []).map((i) => i.url).filter(Boolean) as string[]
    ),
    description: product.description || product.subtitle || "",
    sku: (product.variants?.[0]?.sku as string) || product.id,
    brand: { "@type": "Brand", name: siteContent.seo.siteName },
    offers,
    ...(typeof meta.rating === "number" && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: meta.rating,
        reviewCount: meta.reviews_count ?? 1,
      },
    }),
    ...(priceLabel && { description: priceLabel }),
  };
}

export { ABSOLUTE_OG };
