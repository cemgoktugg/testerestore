import React from "react";
import type { StoreProduct } from "../../lib/medusa/types";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"
).replace(/\/$/, "");

const COMPANY = {
  name: "Testere Store",
  legalName: "Testere Store Ticaret Ltd. Şti.",
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo.png`,
  email: "destek@testerestore.com",
  phone: "+90-212-555-10-20",
  street: "İkitelli O.S.B. Metal İş Sanayi Sitesi, 14. Blok No: 45",
  district: "Başakşehir",
  city: "İstanbul",
  country: "TR",
  postalCode: "34490",
};

/**
 * Tek bir <script type="application/ld+json"> render eder. Çocuk olarak
 * obje verilir; Next.js'de Head içine değil body'ye yerleştirilebilir
 * (Google her ikisini de okur).
 */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data),
      }}
    />
  );
}

/** Organization + LocalBusiness — RootLayout'a yerleştirilir. */
export function OrganizationJsonLd() {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "Organization",
            "@id": `${SITE_URL}#organization`,
            name: COMPANY.name,
            legalName: COMPANY.legalName,
            url: COMPANY.url,
            logo: COMPANY.logo,
            email: COMPANY.email,
            telephone: COMPANY.phone,
            address: {
              "@type": "PostalAddress",
              streetAddress: COMPANY.street,
              addressLocality: COMPANY.district,
              addressRegion: COMPANY.city,
              postalCode: COMPANY.postalCode,
              addressCountry: COMPANY.country,
            },
          },
          {
            "@type": "WebSite",
            "@id": `${SITE_URL}#website`,
            url: COMPANY.url,
            name: COMPANY.name,
            publisher: { "@id": `${SITE_URL}#organization` },
            potentialAction: {
              "@type": "SearchAction",
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${SITE_URL}/arama?q={search_term_string}`,
              },
              "query-input": "required name=search_term_string",
            },
          },
          {
            "@type": "LocalBusiness",
            "@id": `${SITE_URL}#localbusiness`,
            name: COMPANY.name,
            url: COMPANY.url,
            image: COMPANY.logo,
            telephone: COMPANY.phone,
            address: {
              "@type": "PostalAddress",
              streetAddress: COMPANY.street,
              addressLocality: COMPANY.district,
              addressRegion: COMPANY.city,
              postalCode: COMPANY.postalCode,
              addressCountry: COMPANY.country,
            },
            openingHoursSpecification: [
              {
                "@type": "OpeningHoursSpecification",
                dayOfWeek: [
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                ],
                opens: "09:00",
                closes: "18:00",
              },
            ],
          },
        ],
      }}
    />
  );
}

interface ProductJsonLdProps {
  product: StoreProduct;
  /** İlgili AggregateRating zaten yorum bölümünde varsa true ver. */
  hasReviewsBlock?: boolean;
}

/** Ürün detayı için Schema.org Product. */
export function ProductJsonLd({ product, hasReviewsBlock }: ProductJsonLdProps) {
  const v = product.variants?.[0];
  const minPrice =
    product.variants
      ?.map((va) => va.calculated_price?.calculated_amount)
      .filter((x): x is number => typeof x === "number" && x > 0)
      .reduce((min, p) => (p < min ? p : min), Infinity) ?? null;
  const price = Number.isFinite(minPrice) ? minPrice : null;
  const currency = (
    v?.calculated_price?.currency_code || "try"
  ).toUpperCase();
  const url = `${SITE_URL}/products/${product.handle || product.id}`;
  const image =
    product.thumbnail ||
    product.images?.[0]?.url ||
    `${SITE_URL}/images/bimetal_blade.png`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = (v as any)?.inventory_quantity;
  const inStock =
    typeof inv === "number"
      ? inv > 0
      : true; // bilinmiyorsa stokta varsay

  const data: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.subtitle || product.description || undefined,
    image: typeof image === "string" ? image : undefined,
    sku: v?.sku || product.handle,
    brand: { "@type": "Brand", name: "Testere Store" },
    url,
  };

  if (typeof price === "number" && price > 0) {
    data.offers = {
      "@type": "Offer",
      url,
      priceCurrency: currency,
      price: price.toFixed(2),
      availability: inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: { "@type": "Organization", name: "Testere Store" },
    };
  }

  // AggregateRating ayrıca yorum bölümünden basılıyor (ProductReviews).
  // hasReviewsBlock=true ise burada tekrar basmıyoruz, çift sayım olmasın.
  void hasReviewsBlock;

  return <JsonLd data={data} />;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

export function BreadcrumbJsonLd({ items }: { items: BreadcrumbItem[] }) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: items.map((it, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: it.name,
          item: it.url.startsWith("http") ? it.url : `${SITE_URL}${it.url}`,
        })),
      }}
    />
  );
}

/**
 * FAQ Schema — Google'da "People also ask" benzeri zengin sonuç gösterir.
 * Ürün detay sayfalarına, blog yazılarına veya statik FAQ sayfasına eklenir.
 */
export function FaqJsonLd({
  questions,
}: {
  questions: Array<{ question: string; answer: string }>;
}) {
  if (!questions || questions.length === 0) return null;
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: questions.map((q) => ({
          "@type": "Question",
          name: q.question,
          acceptedAnswer: {
            "@type": "Answer",
            text: q.answer,
          },
        })),
      }}
    />
  );
}

/**
 * Article Schema — Blog yazısı sayfası için. BlogPosting'in genelleştirilmiş
 * versiyonu; daha zengin Google sonucu için.
 */
export function ArticleJsonLd({
  headline,
  description,
  image,
  datePublished,
  dateModified,
  authorName,
  publisherName,
  publisherLogo,
}: {
  headline: string;
  description?: string;
  image?: string;
  datePublished?: string | null;
  dateModified?: string | null;
  authorName?: string | null;
  publisherName?: string;
  publisherLogo?: string;
}) {
  return (
    <JsonLd
      data={{
        "@context": "https://schema.org",
        "@type": "Article",
        headline,
        description,
        image,
        datePublished,
        dateModified: dateModified || datePublished,
        author: authorName
          ? { "@type": "Person", name: authorName }
          : undefined,
        publisher: publisherName
          ? {
              "@type": "Organization",
              name: publisherName,
              logo: publisherLogo
                ? { "@type": "ImageObject", url: publisherLogo }
                : undefined,
            }
          : undefined,
      }}
    />
  );
}
