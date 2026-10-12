/**
 * SEO helpers for Medusa-driven pages.
 *
 * Produces Next.js `Metadata` and JSON-LD product schema from a Medusa
 * product. Designed to be called from Server Components / generateMetadata.
 */

import type { Metadata } from "next";
import type { BladeProductMetadata, StoreProduct } from "./types";
import { getProductImage } from "./format";
import { siteContent } from "../content-config";
import { getSiteSeo } from "./services/site-seo";
import type { ProductReview, ReviewStats } from "./services/reviews";
import { isReadyMade } from "../ready-made";

/** Başlıkta marka zaten geçiyor mu? (çift "| Testere Store" önlemek için) */
const BRAND_RE = /testere\s?store/i;

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
    // Sayfa zaten notFound() verir; metadata da indekslenmesin.
    return {
      title: fallbackTitle,
      description: fallbackDescription,
      robots: { index: false, follow: true },
    };
  }
  const meta = (product.metadata || {}) as BladeProductMetadata & {
    seo_keywords?: string;
    og_image?: string;
    robots?: string;
    canonical?: string;
  };
  // Kök layout'un şablonu "%s | <site adı>" ekler. Admin'deki seo_title marka
  // içeriyorsa şablon atlanır (absolute), yoksa marka şablondan gelir. Eskiden
  // burada da "— Testere Store" eklendiği için başlıkta marka iki kez çıkıyordu.
  const rawTitle = meta.seo_title || product.title;
  const hasBrand = BRAND_RE.test(rawTitle);
  const title: Metadata["title"] = hasBrand ? { absolute: rawTitle } : rawTitle;
  const ogTitle = hasBrand ? rawTitle : `${rawTitle} | ${siteName}`;
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
      title: ogTitle,
      description,
      url: canonical,
      siteName,
      images: [{ url: image, alt: product.title }],
      locale: seo.default_locale,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: [image],
      ...(seo.twitter_handle && { creator: seo.twitter_handle }),
    },
  };
}

function absoluteUrl(u: string): string {
  if (!u) return u;
  if (/^https?:\/\//i.test(u)) return u;
  return `${ABSOLUTE_OG}${u.startsWith("/") ? "" : "/"}${u}`;
}

function plainText(md: string | null | undefined): string {
  return (md || "")
    .replace(/[#*_`>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * JSON-LD Product schema — sayfa başına TEK blok, sunucuda üretilir.
 *
 * Kurallar (Google ürün yapısal veri politikası + tüketici mevzuatı):
 *  - aggregateRating / review YALNIZCA onaylı gerçek yorumlardan gelir.
 *    Ürün metadata'sındaki rating / reviews_count seed verisiydi (gerçek yorum
 *    0 iken 4.9 / 312 yorum basılıyordu) → artık hiç okunmaz.
 *  - Ölçüye göre fiyatlanan (yapılandırılabilir) ürünlerde offers basılmaz:
 *    gerçek fiyat seçilen boy/ölçüye göre fiyat matrisinden hesaplanıyor,
 *    varyant fiyatları satış fiyatı değil ("110 TL'den" yanıltıcıydı).
 *  - Hazır boy ürünlerin tek ve gerçek bir fiyatı var → Offer basılır. Fiyat,
 *    sayfada gösterildiği gibi KDV hariçtir (valueAddedTaxIncluded: false).
 */
export function buildProductJsonLd(
  product: StoreProduct,
  reviewData?: { reviews: ProductReview[]; stats: ReviewStats }
): Record<string, unknown> {
  const siteName = siteContent.seo.siteName;
  const url = `${ABSOLUTE_OG}/products/${product.handle || product.id}`;
  const images = Array.from(
    new Set(
      [getProductImage(product), ...(product.images || []).map((i) => i.url)]
        .filter(Boolean)
        .map((u) => absoluteUrl(u as string))
    )
  );
  const description = plainText(product.description || product.subtitle);

  let offers: Record<string, unknown> | undefined;
  if (isReadyMade(product)) {
    const v = product.variants?.[0];
    const cp = v?.calculated_price;
    const amount = cp?.calculated_amount;
    if (typeof amount === "number" && amount > 0 && cp?.currency_code) {
      const price = amount.toFixed(2);
      const currency = cp.currency_code.toUpperCase();
      offers = {
        "@type": "Offer",
        url,
        sku: v?.sku || undefined,
        price,
        priceCurrency: currency,
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price,
          priceCurrency: currency,
          valueAddedTaxIncluded: false,
        },
        availability: "https://schema.org/InStock",
        itemCondition: "https://schema.org/NewCondition",
        seller: { "@type": "Organization", name: siteName },
      };
    }
  }

  const stats = reviewData?.stats;
  const approved = (reviewData?.reviews || []).filter((r) => r.is_approved !== false);
  const hasReviews = !!stats && stats.count > 0 && approved.length > 0;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: product.title,
    url,
    image: images,
    ...(description && { description }),
    sku: isReadyMade(product)
      ? product.variants?.[0]?.sku || product.handle
      : product.handle || product.id,
    brand: { "@type": "Brand", name: siteName },
    ...(product.categories?.[0]?.name && { category: product.categories[0].name }),
    ...(offers && { offers }),
    ...(hasReviews && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: Number(stats!.average.toFixed(1)),
        reviewCount: stats!.count,
        bestRating: 5,
        worstRating: 1,
      },
      review: approved.slice(0, 5).map((r) => ({
        "@type": "Review",
        reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
        author: { "@type": "Person", name: r.author_name },
        ...(r.body && { reviewBody: r.body }),
        datePublished: r.created_at,
      })),
    }),
  };
}

export { ABSOLUTE_OG };
