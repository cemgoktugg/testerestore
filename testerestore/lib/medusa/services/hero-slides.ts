import { MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY, MEDUSA_READY } from "../config";

/**
 * Hero slide DTO returned by GET /store/hero-slides.
 * Mirrors the Medusa `hero_slide` entity columns (camel/snake preserved as-is).
 */
export interface StoreHeroSlide {
  id: string;
  badge: string;
  badge_icon: "zap" | "flame" | "wrench" | "award" | string;
  title_prefix: string;
  title_suffix?: string | null;
  highlight: string;
  description: string;
  image_url: string;
  primary_cta_label: string;
  primary_cta_href: string;
  secondary_cta_label?: string | null;
  secondary_cta_href?: string | null;
  accent?: string | null;
  sort_order: number;
  is_active: boolean;
}

interface ListResponse {
  hero_slides: StoreHeroSlide[];
  count: number;
}

/** Fetch active hero slides from the public store API. */
export async function listHeroSlides(): Promise<StoreHeroSlide[]> {
  if (!MEDUSA_READY) return [];
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/hero-slides`, {
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const data = (await res.json()) as ListResponse;
    return data.hero_slides ?? [];
  } catch (e) {
    console.error("[medusa] listHeroSlides failed", e);
    return [];
  }
}
