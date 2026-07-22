import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type SiteSeoService from "../modules/site-seo/service";
import { SITE_SEO_MODULE } from "../modules/site-seo";

/**
 * Site SEO singleton'unu mantıklı varsayılanlarla doldurur.
 *
 * Run:
 *   npx medusa exec ./src/scripts/seed-site-seo.ts
 */
export default async function seedSiteSeo({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const svc = container.resolve<SiteSeoService>(SITE_SEO_MODULE);

  const existing = await svc.listSiteSeoes({});
  if (existing.length > 0) {
    logger.info("site_seo already exists — skipping.");
    return;
  }

  await svc.createSiteSeoes([
    {
      site_name: "Testere Store",
      default_title:
        "Testere Store — Endüstriyel Şerit Testere ve Bıçaklar",
      title_template: "%s | Testere Store",
      default_description:
        "Türkiye'nin lider şerit testere ve şerit testere bıçağı satış platformu. Bi-metal, karbür uçlu, ahşap kesim ve özel boy kaynaklı çözümler. Hızlı kargo, koşulsuz iade.",
      default_keywords:
        "şerit testere, bi-metal şerit testere, karbür uçlu testere, ahşap kesim şeridi, et kemik şeridi, M42 şerit, M51 şerit, endüstriyel kesim, kaynak şerit",
      robots_default: "index, follow",
      default_locale: "tr_TR",
      twitter_handle: "@testerestore",
      page_overrides: {
        home: {
          title:
            "Endüstriyel Şerit Testere ve Bıçaklar | Testere Store",
          description:
            "Bi-metal, karbür uçlu, ahşap kesim ve et-kemik şerit testereler. Özel boy kaynak, hızlı kargo, 14 gün iade. Türkiye'nin lider platformu.",
        },
        blog: {
          title: "Şerit Testere Rehberi — Blog",
          description:
            "Doğru şerit testere seçimi, kesim hızları, diş adımı (TPI) hesaplama ve endüstriyel kesim ipuçları.",
        },
        iletisim: {
          title: "İletişim — Testere Store",
          description:
            "Bize ulaşın: +90 (212) 555 10 20 · destek@testerestore.com · İkitelli OSB, Başakşehir/İstanbul.",
        },
        katalog: {
          title: "Dijital Katalog ve Teknik Dökümanlar",
          description:
            "Şerit testere kataloğumuz, diş adımı seçim tablosu, kullanım kılavuzları ve teknik PDF dokümanlar.",
        },
        arama: {
          title: "Arama Sonuçları",
          description:
            "Testere Store ürün kataloğunda arama yapın — bi-metal, karbür, ahşap, et-kemik.",
          robots: "noindex, follow",
        },
      },
    },
  ]);
  logger.info("✅ site_seo seeded with defaults.");
}
