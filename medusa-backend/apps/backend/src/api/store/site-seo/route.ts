import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type SiteSeoService from "../../../modules/site-seo/service";
import { SITE_SEO_MODULE } from "../../../modules/site-seo";

/**
 * GET /store/site-seo — public read.
 * Storefront her sayfa render'ında bunu çekip metadata'yı doldurur.
 * 5 dakika CDN cache (Cache-Control header).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<SiteSeoService>(SITE_SEO_MODULE);
  const list = await svc.listSiteSeos({});
  res.setHeader(
    "Cache-Control",
    "public, max-age=60, s-maxage=300, stale-while-revalidate=600"
  );
  res.json({ site_seo: list[0] || null });
}
