import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
  MEDUSA_READY,
} from "../config";

export interface PageOverride {
  title?: string;
  description?: string;
  og_image?: string;
  keywords?: string;
  robots?: string;
}

export interface SiteSeo {
  id: string;
  site_name: string;
  default_title: string;
  title_template: string;
  default_description: string;
  default_keywords: string | null;
  default_og_image: string | null;
  twitter_handle: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  google_site_verification: string | null;
  yandex_site_verification: string | null;
  bing_site_verification: string | null;
  robots_default: string;
  canonical_base_url: string | null;
  default_locale: string;
  page_overrides: Record<string, PageOverride> | null;
}

const FALLBACK: SiteSeo = {
  id: "fallback",
  site_name: "Testere Store",
  default_title:
    "Testere Store — Endüstriyel Şerit Testere ve Bıçaklar",
  title_template: "%s | Testere Store",
  default_description:
    "Türkiye'nin lider şerit testere ve şerit testere bıçağı satış platformu.",
  default_keywords:
    "şerit testere, bi-metal şerit testere, karbür uçlu testere",
  default_og_image: null,
  twitter_handle: null,
  facebook_url: null,
  instagram_url: null,
  linkedin_url: null,
  youtube_url: null,
  google_site_verification: null,
  yandex_site_verification: null,
  bing_site_verification: null,
  robots_default: "index, follow",
  canonical_base_url: null,
  default_locale: "tr_TR",
  page_overrides: null,
};

/**
 * Site SEO ayarlarını server-side getirir. Cache: 5 dakika.
 * Backend kapalıysa veya hata olursa fallback dönülür — site asla
 * crash etmez.
 */
export async function getSiteSeo(): Promise<SiteSeo> {
  if (!MEDUSA_READY) return FALLBACK;
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/site-seo`, {
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return FALLBACK;
    const data = (await res.json()) as { site_seo: SiteSeo | null };
    return data.site_seo ?? FALLBACK;
  } catch {
    return FALLBACK;
  }
}

/** Verilen sayfa key'i için override + fallback chain'i uygular. */
export function resolvePageSeo(
  seo: SiteSeo,
  pageKey?: string
): {
  title: string;
  description: string;
  keywords: string | null;
  ogImage: string | null;
  robots: string;
} {
  const ov = pageKey ? seo.page_overrides?.[pageKey] : undefined;
  return {
    title: ov?.title || seo.default_title,
    description: ov?.description || seo.default_description,
    keywords: ov?.keywords || seo.default_keywords,
    ogImage: ov?.og_image || seo.default_og_image,
    robots: ov?.robots || seo.robots_default,
  };
}
