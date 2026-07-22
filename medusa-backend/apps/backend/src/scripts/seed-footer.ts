import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type FooterService from "../modules/footer/service";
import { FOOTER_MODULE } from "../modules/footer";

/**
 * Seeds the footer with the same content the storefront previously hard-coded.
 *
 * Run with:
 *   cd medusa-backend/apps/backend
 *   npx medusa exec ./src/scripts/seed-footer.ts
 *
 * Idempotent: skips if data already exists.
 */
export default async function seedFooter({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const svc = container.resolve<FooterService>(FOOTER_MODULE);

  // ---------- Features ----------
  const existingFeatures = await svc.listFooterFeatures({});
  if (existingFeatures.length === 0) {
    await svc.createFooterFeatures([
      {
        sort_order: 0,
        is_active: true,
        icon: "truck",
        title: "Hızlı Kargo & Teslimat",
        description: "Kaynaklı bıçaklar 24 saat içinde kargoya verilir.",
      },
      {
        sort_order: 1,
        is_active: true,
        icon: "shield",
        title: "Üstün Çelik Kalitesi",
        description: "Alman ve İsveç menşeili premium çelik alaşımları.",
      },
      {
        sort_order: 2,
        is_active: true,
        icon: "refresh",
        title: "Birebir Kaynak Garantisi",
        description:
          "Kaynak yerinden kırılmalarda koşulsuz değişim garantisi.",
      },
    ]);
    logger.info("✅ 3 footer features seeded.");
  } else {
    logger.info("Footer features already present — skipping.");
  }

  // ---------- Link groups ----------
  const existingGroups = await svc.listFooterLinkGroups({});
  if (existingGroups.length === 0) {
    await svc.createFooterLinkGroups([
      {
        sort_order: 0,
        is_active: true,
        title: "Ürünler",
        links: [
          { label: "Bi-Metal Şerit Testereler", href: "/?kategori=Bi-Metal#products" },
          { label: "Karbür Şerit Testereler", href: "/?kategori=Karb%C3%BCr+U%C3%A7lu#products" },
          { label: "Ağaç Kesim Şeritleri", href: "/?kategori=Ah%C5%9Fap+Kesim#products" },
          { label: "Et ve Kemik Kesim", href: "/?kategori=Et+ve+Kemik+Kesim#products" },
        ],
      },
      {
        sort_order: 1,
        is_active: true,
        title: "Hızlı Menü",
        links: [
          { label: "Ana Sayfa", href: "/" },
          { label: "Parametrik Hesaplayıcı", href: "/products/bimetal-premium" },
          { label: "Dijital Katalog", href: "/katalog" },
          { label: "İletişim", href: "/iletisim" },
          { label: "Sepetim", href: "/cart" },
        ],
      },
    ]);
    logger.info("✅ 2 footer link groups seeded.");
  } else {
    logger.info("Footer link groups already present — skipping.");
  }

  // ---------- Settings (singleton) ----------
  const existingSettings = await svc.listFooterSettings({});
  if (existingSettings.length === 0) {
    await svc.createFooterSettings([
      {
        company_description:
          "Türkiye'nin lider şerit testere ve şerit testere bıçağı satış platformu. Endüstriyel kesim ihtiyaçlarınız için yüksek hassasiyetli, dayanıklı ve özel boy kaynaklı çözümler sunuyoruz.",
        contact_phone: "+90 (212) 555 10 20",
        contact_email: "destek@testerestore.com",
        contact_address:
          "İkitelli O.S.B. Metal İş Sanayi Sitesi, 14. Blok No: 45, Başakşehir / İstanbul",
        copyright_text:
          "© {year} Testere Store. Tüm hakları saklıdır.",
        legal_links: [
          { label: "KVKK Aydınlatma Metni", href: "/yasal/kvkk-aydinlatma-metni" },
          { label: "Gizlilik Politikası", href: "/yasal/gizlilik-politikasi" },
          { label: "Çerez Politikası", href: "/yasal/cerez-politikasi" },
          { label: "Mesafeli Satış Sözleşmesi", href: "/yasal/mesafeli-satis-sozlesmesi" },
          { label: "Ön Bilgilendirme Formu", href: "/yasal/on-bilgilendirme-formu" },
          { label: "İade ve Cayma", href: "/yasal/iade-ve-cayma" },
          { label: "Üyelik Sözleşmesi", href: "/yasal/uyelik-sozlesmesi" },
        ],
      },
    ]);
    logger.info("✅ Footer settings seeded.");
  } else {
    logger.info("Footer settings already present — skipping.");
  }

  logger.info("=== Footer seed done ===");
}
