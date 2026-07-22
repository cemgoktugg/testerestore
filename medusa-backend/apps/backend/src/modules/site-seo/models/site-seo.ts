import { model } from "@medusajs/framework/utils";

/**
 * Site-wide SEO ayarları — singleton (tek satır).
 *
 * Storefront her sayfa render'ında bu kayıtı okur ve metadata'yı doldurur.
 * Sayfa-özel override'lar `page_overrides` JSON map'i üzerinden yapılır:
 *
 *   page_overrides = {
 *     "home":     { "title": "...", "description": "...", "og_image": "..." },
 *     "blog":     { "title": "Blog | ...", ... },
 *     "iletisim": { ... },
 *     ...
 *   }
 *
 * Override'da olmayan alanlar için fallback olarak ana alanlar kullanılır.
 */
const SiteSeo = model.define("site_seo", {
  id: model.id().primaryKey(),

  // ---- Temel ----
  site_name: model.text().default("Testere Store"),
  default_title: model.text(),
  /** Sayfa başlıklarına eklenir, örn: "%s | Testere Store" */
  title_template: model.text().default("%s | Testere Store"),
  default_description: model.text(),
  default_keywords: model.text().nullable(),

  // ---- Open Graph / Sosyal ----
  default_og_image: model.text().nullable(),
  twitter_handle: model.text().nullable(),
  facebook_url: model.text().nullable(),
  instagram_url: model.text().nullable(),
  linkedin_url: model.text().nullable(),
  youtube_url: model.text().nullable(),

  // ---- Search Engine doğrulama meta'ları ----
  google_site_verification: model.text().nullable(),
  yandex_site_verification: model.text().nullable(),
  bing_site_verification: model.text().nullable(),

  // ---- Robots ----
  /** Site genel robots direktifi — varsayılan "index, follow". */
  robots_default: model.text().default("index, follow"),

  // ---- Canonical / Hreflang ----
  canonical_base_url: model.text().nullable(),

  // ---- Locale ----
  default_locale: model.text().default("tr_TR"),

  // ---- Sayfa override'ları (esnek JSON) ----
  /**
   * { "<page-key>": { title, description, og_image, keywords, robots } }
   * Geçerli page-key örnekleri:
   * "home", "blog", "iletisim", "katalog", "arama", "kayit", "giris"
   */
  page_overrides: model.json().nullable(),
});

export default SiteSeo;
