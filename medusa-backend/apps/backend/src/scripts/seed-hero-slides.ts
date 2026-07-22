import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type HeroSliderService from "../modules/hero-slider/service";
import { HERO_SLIDER_MODULE } from "../modules/hero-slider";

/**
 * Seeds the 3 default hero slides matching the original static content.
 *
 * Run with:
 *   cd medusa-backend/apps/backend
 *   npx medusa exec ./src/scripts/seed-hero-slides.ts
 *
 * Idempotent: skips if any hero slides already exist.
 */
export default async function seedHeroSlides({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const service = container.resolve<HeroSliderService>(HERO_SLIDER_MODULE);

  const existing = await service.listHeroSlides({});
  if (existing.length > 0) {
    logger.info(`hero_slide table already has ${existing.length} rows — skipping seed.`);
    return;
  }

  await service.createHeroSlides([
    {
      sort_order: 0,
      is_active: true,
      badge: "Özel Boy Kaynaklı Şerit Testereler",
      badge_icon: "zap",
      title_prefix: "Endüstriyel Kesimde",
      title_suffix: null,
      highlight: "Premium Standartlar",
      description:
        "Geleceğin Şerit Testere Mağazası. Malzemenizi seçin, milimetrik boyunuzu girin, 3D inceleyin ve kaynak garantisiyle sipariş verin.",
      image_url: "/images/hero_bandsaw.png",
      primary_cta_label: "Hemen Yapılandır",
      primary_cta_href: "/products/bimetal-premium",
      secondary_cta_label: "Ürünleri İncele",
      secondary_cta_href: "#products",
      accent: "from-orange-500/30 via-amber-500/10",
    },
    {
      sort_order: 1,
      is_active: true,
      badge: "Karbür Uçlu Yeni Seri",
      badge_icon: "flame",
      title_prefix: "Paslanmaz & Titanyum İçin",
      title_suffix: null,
      highlight: "Karbür Uçlu Performans",
      description:
        "Karbür uçlu dişleriyle en sert alaşımlarda dahi rakipsiz kesim hızı. Uzun ömür, düşük titreşim, profesyonel atölye standardı.",
      image_url: "/images/carbide_blade.png",
      primary_cta_label: "Carbide Modelini Gör",
      primary_cta_href: "/products/carbide-ultimate",
      secondary_cta_label: "Tüm Bıçaklar",
      secondary_cta_href: "#products",
      accent: "from-sky-500/25 via-indigo-500/10",
    },
    {
      sort_order: 2,
      is_active: true,
      badge: "Profesyonel Atölye Ekipmanı",
      badge_icon: "wrench",
      title_prefix: "Güçlü Motor, Hassas Kesim",
      title_suffix: null,
      highlight: "Kraken Şerit Makinesi",
      description:
        "2.2 kW motor, 350 mm volan ve lazer kılavuzlu döküm gövde. Atölyenizin üretim hızını üst seviyeye çıkaran profesyonel çözüm.",
      image_url: "/images/bandsaw_machine.png",
      primary_cta_label: "Makineyi İncele",
      primary_cta_href: "/products/kraken-machine",
      secondary_cta_label: "Teknik Özellikler",
      secondary_cta_href: "#products",
      accent: "from-emerald-500/25 via-teal-500/10",
    },
  ]);

  logger.info("✅ 3 hero slides seeded.");
}
