import React from "react";
import { companyInfo } from "../../lib/company-info";
import { siteContent } from "../../lib/content-config";
import { CATEGORY_NAV } from "../../lib/category-links";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"
).replace(/\/$/, "");

// Şirket künyesi TEK KAYNAKTAN (lib/company-info.ts) okunur.
const COMPANY = {
  name: companyInfo.brand,
  legalName: companyInfo.legalName,
  url: SITE_URL,
  logo: `${SITE_URL}/images/logo.png`,
  email: companyInfo.email,
  phone: companyInfo.phone,
  street: companyInfo.streetAddress,
  district: companyInfo.district,
  city: companyInfo.city,
  country: companyInfo.country,
  postalCode: companyInfo.postalCode,
};

/** AI asistanları ve arama motorları için markanın uzmanlık alanları. */
const KNOWS_ABOUT = [
  'Şerit testere',
  'Şerit testere bıçağı',
  'Bi-metal şerit testere (M42, M51)',
  'Karbür uçlu (TCT) şerit testere',
  'Ahşap şerit testere',
  'Et ve kemik şerit testere',
  'Sünger ve tekstil kesim bıçağı',
  'Şerit testere diş adımı (TPI) seçimi',
  'Şerit testere alın kaynağı',
];

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
            logo: { "@type": "ImageObject", url: COMPANY.logo, width: 512, height: 512 },
            description: siteContent.seo.defaultDescription,
            email: COMPANY.email,
            telephone: COMPANY.phone,
            knowsAbout: KNOWS_ABOUT,
            areaServed: { "@type": "Country", name: "Türkiye" },
            ...(companyInfo.socialProfiles.length && { sameAs: companyInfo.socialProfiles }),
            contactPoint: {
              "@type": "ContactPoint",
              contactType: "customer service",
              email: COMPANY.email,
              telephone: COMPANY.phone,
              areaServed: "TR",
              availableLanguage: ["Turkish"],
            },
            hasOfferCatalog: {
              "@type": "OfferCatalog",
              name: "Şerit testere bıçakları",
              itemListElement: CATEGORY_NAV.map((c) => ({
                "@type": "OfferCatalog",
                name: c.name,
                url: `${SITE_URL}/kategori/${c.slug}`,
              })),
            },
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
            inLanguage: "tr-TR",
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
