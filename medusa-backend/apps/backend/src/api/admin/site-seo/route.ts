import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type SiteSeoService from "../../../modules/site-seo/service";
import { SITE_SEO_MODULE } from "../../../modules/site-seo";

/** GET /admin/site-seo — singleton row (yoksa default ile oluşturur). */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<SiteSeoService>(SITE_SEO_MODULE);
  const list = await svc.listSiteSeoes({});
  if (list.length === 0) {
    const [created] = await svc.createSiteSeoes([
      {
        site_name: "Testere Store",
        default_title:
          "Testere Store — Endüstriyel Şerit Testere ve Bıçaklar",
        title_template: "%s | Testere Store",
        default_description:
          "Türkiye'nin lider şerit testere ve şerit testere bıçağı satış platformu. Bi-metal, karbür uçlu, ahşap kesim ve özel boy kaynaklı çözümler.",
        default_keywords:
          "şerit testere, bi-metal şerit testere, karbür uçlu testere, ahşap kesim, endüstriyel kesim",
        robots_default: "index, follow",
        default_locale: "tr_TR",
      },
    ]);
    res.json({ site_seo: created });
    return;
  }
  res.json({ site_seo: list[0] });
}

/** PATCH /admin/site-seo — singleton row'u günceller (yoksa oluşturur). */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<SiteSeoService>(SITE_SEO_MODULE);
  const body = req.body as Record<string, unknown>;
  const existing = await svc.listSiteSeoes({});

  let row;
  if (existing.length === 0) {
    [row] = await svc.createSiteSeoes([body]);
  } else {
    [row] = await svc.updateSiteSeoes([{ id: existing[0].id, ...body }]);
  }
  res.json({ site_seo: row });
}
