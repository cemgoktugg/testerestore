import { model } from "@medusajs/framework/utils";

/**
 * Hero slide entity — drives the home-page rotating hero carousel.
 *
 * Every visible block on the storefront's <HeroSlider> maps 1:1 to a row in
 * this table. Sort order is ascending (0 = first). `is_active=false` hides
 * the slide from the storefront without deleting it.
 */
const HeroSlide = model.define("hero_slide", {
  id: model.id().primaryKey(),

  // Eyebrow badge (top label above the title)
  badge: model.text(),
  /** lucide-react icon name — one of "zap" | "flame" | "wrench" | "award" */
  badge_icon: model.text().default("zap"),

  // Title is split into a steel-gray prefix + (optional second line) +
  // orange-gradient highlight word — matches the existing storefront design.
  title_prefix: model.text(),
  title_suffix: model.text().nullable(),
  highlight: model.text(),

  // Description and visual
  description: model.text(),
  image_url: model.text(),

  // CTAs
  primary_cta_label: model.text(),
  primary_cta_href: model.text(),
  secondary_cta_label: model.text().nullable(),
  secondary_cta_href: model.text().nullable(),

  /** Tailwind class fragment for the radial accent backdrop. */
  accent: model.text().nullable(),

  sort_order: model.number().default(0),
  is_active: model.boolean().default(true),
});

export default HeroSlide;
