import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import type FooterService from "../modules/footer/service";
import { FOOTER_MODULE } from "../modules/footer";

/**
 * One-shot: footer_settings.legal_links satırını yeni /yasal/* rotaları ile
 * günceller. Mevcut seed bu linkleri "#" placeholder ile yatırmıştı.
 *
 * Run:
 *   npx medusa exec ./src/scripts/update-footer-legal-links.ts
 */
export default async function updateFooterLegalLinks({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const svc = container.resolve<FooterService>(FOOTER_MODULE);

  const NEW_LINKS = [
    { label: "KVKK Aydınlatma Metni", href: "/yasal/kvkk-aydinlatma-metni" },
    { label: "Gizlilik Politikası", href: "/yasal/gizlilik-politikasi" },
    { label: "Çerez Politikası", href: "/yasal/cerez-politikasi" },
    { label: "Mesafeli Satış Sözleşmesi", href: "/yasal/mesafeli-satis-sozlesmesi" },
    { label: "Ön Bilgilendirme Formu", href: "/yasal/on-bilgilendirme-formu" },
    { label: "İade ve Cayma", href: "/yasal/iade-ve-cayma" },
    { label: "Üyelik Sözleşmesi", href: "/yasal/uyelik-sozlesmesi" },
  ];

  const rows = await svc.listFooterSettings({});
  if (rows.length === 0) {
    logger.info("No footer_settings row — run seed-footer first.");
    return;
  }

  await svc.updateFooterSettings([
    { id: rows[0].id, legal_links: NEW_LINKS },
  ]);
  logger.info(`✅ Footer legal links updated (${NEW_LINKS.length} link).`);
}
