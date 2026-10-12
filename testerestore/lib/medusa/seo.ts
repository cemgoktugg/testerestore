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
  // Hazır ürünlerin seo_title'ı alt sistem tarafından uzun üretiliyor (90+ karakter,
  // Google ~60'ta keser) → 60'ı aşıyorsa kısa ölçü başlığı kullanılır.
  const adminTitle =
    meta.seo_title && !(isReadyMade(product) && meta.seo_title.length > 60) ? meta.seo_title : null;
  const rawTitle = adminTitle || readyMadeShortTitle(product) || product.title;
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

/** Hazır boy ürün için ~50 karakterlik başlık: "M51 Hazır Şerit Testere 27×0,9 2/3 TPI 1660 mm". */
function readyMadeShortTitle(product: StoreProduct): string | null {
  if (!isReadyMade(product)) return null;
  const m = (product.metadata || {}) as Record<string, unknown>;
  const grade = /m51/i.test(product.title || '') ? 'M51' : /m42/i.test(product.title || '') ? 'M42' : 'Bi-Metal';
  const tr = (v: unknown) => String(v).replace('.', ',');
  if (!m.width_mm || !m.thickness_mm || !m.length_mm) return null;
  const tooth = m.tooth_pitch ? ` ${tr(m.tooth_pitch)} TPI` : '';
  return `${grade} Hazır Şerit Testere ${tr(m.width_mm)}×${tr(m.thickness_mm)}${tooth} ${m.length_mm} mm`;
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

  // Teknik özellikler yapısal veri olarak: AI asistanları ve Google ölçüleri
  // metinden çıkarmak zorunda kalmaz (ürün sayfasındaki tabloyla aynı kaynak).
  const meta = (product.metadata || {}) as Record<string, unknown>;
  const specs = Array.isArray(meta.technical_specs)
    ? (meta.technical_specs as Array<{ label?: string; value?: string }>).filter((x) => x?.label && x?.value)
    : [];
  const additionalProperty: Record<string, unknown>[] = specs.map((x) => ({
    '@type': 'PropertyValue',
    name: x.label,
    value: x.value,
  }));
  if (isReadyMade(product)) {
    const dims: [string, unknown, string][] = [
      ['Genişlik', meta.width_mm, 'mm'],
      ['Kalınlık', meta.thickness_mm, 'mm'],
      ['Boy', meta.length_mm, 'mm'],
    ];
    for (const [name, v, unit] of dims) {
      if (typeof v === 'number') additionalProperty.push({ '@type': 'PropertyValue', name, value: v, unitText: unit });
    }
    if (meta.tooth_pitch) additionalProperty.push({ '@type': 'PropertyValue', name: 'Diş adımı (TPI)', value: String(meta.tooth_pitch) });
  } else {
    const range = meta.min_length_mm && meta.max_length_mm ? `${meta.min_length_mm}–${meta.max_length_mm} mm` : null;
    if (range) additionalProperty.push({ '@type': 'PropertyValue', name: 'Sipariş edilebilir boy', value: range });
    const pitches = Array.isArray(meta.tooth_pitch) ? (meta.tooth_pitch as string[]) : [];
    if (pitches.length) additionalProperty.push({ '@type': 'PropertyValue', name: 'Diş adımı seçenekleri (TPI)', value: pitches.join(', ') });
  }
  const material = typeof meta.blade_type === 'string' && meta.blade_type !== 'bi-metal' ? meta.blade_type : undefined;

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
    ...(material && { material }),
    ...(additionalProperty.length && { additionalProperty }),
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
