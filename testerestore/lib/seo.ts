import type { Metadata } from "next";

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
 */
export function pageMetadata(opts: {
  title?: string;
  description?: string;
  path: string;
  image?: string;
  noindex?: boolean;
}): Metadata {
  const url = canonicalUrl(opts.path);
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: url },
    openGraph: {
      title: opts.title,
      description: opts.description,
      url,
      images: opts.image ? [{ url: opts.image }] : undefined,
    },
    ...(opts.noindex && {
      robots: { index: false, follow: false },
    }),
  };
}
