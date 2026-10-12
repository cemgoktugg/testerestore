import type { Metadata } from "next";
import { siteContent } from "./content-config";

/**
 * SITE URL — env'den okur, sonunda slash'ı temizler. Tüm canonical/OG
 * URL'leri için tek doğru kaynak.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"
).replace(/\/$/, "");

/** Verilen path için tam canonical URL döndürür. */
export function canonicalUrl(path: string): string {
  if (!path.startsWith("/")) path = "/" + path;
  return `${SITE_URL}${path}`;
}

/**
 * Private/transactional sayfalar için noindex metadata.
 * Sepet, checkout, hesabım, giriş/kayıt gibi yerlerde kullanılır.
 */
export function noIndexMetadata(title?: string): Metadata {
  return {
    title: title || "Özel Sayfa",
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
  };
}

/**
 * Yardımcı: Bir sayfa metadata'sını kanonik URL'le birlikte oluşturur.
 *
 * Next.js metadata'yı üst seviye anahtar bazında birleştirir: alt sayfada
 * `openGraph` verilirse kök layout'unki TAMAMEN ezilir. Bu yüzden siteName,
 * locale ve varsayılan görsel burada yeniden verilir. Kök layout'a canonical
 * KONMAZ — konursa canonical'sız her sayfa ana sayfayı işaret eder.
 */
export function pageMetadata(opts: {
  title?: string;
  description?: string;
  path: string;
  image?: string;
  noindex?: boolean;
}): Metadata {
  const url = canonicalUrl(opts.path);
  const image = opts.image || siteContent.seo.ogImage;
  const ogTitle = opts.title
    ? `${opts.title} | ${siteContent.seo.siteName}`
    : siteContent.seo.defaultTitle;
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      siteName: siteContent.seo.siteName,
      locale: "tr_TR",
      title: ogTitle,
      description: opts.description,
      url,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description: opts.description,
      images: image ? [image] : undefined,
    },
    ...(opts.noindex && {
      robots: { index: false, follow: false },
    }),
  };
}
