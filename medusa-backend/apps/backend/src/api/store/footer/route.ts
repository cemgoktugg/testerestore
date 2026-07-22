import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type FooterService from "../../../modules/footer/service";
import { FOOTER_MODULE } from "../../../modules/footer";

/**
 * GET /store/footer
 * Returns all 3 footer datasets (features, link groups, settings) bundled
 * into a single payload for the storefront. Active records only.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<FooterService>(FOOTER_MODULE);

  const [features, linkGroups, settingsList] = await Promise.all([
    service.listFooterFeatures(
      { is_active: true },
      { order: { sort_order: "ASC" } }
    ),
    service.listFooterLinkGroups(
      { is_active: true },
      { order: { sort_order: "ASC" } }
    ),
    service.listFooterSettings({}),
  ]);

  res.json({
    features,
    link_groups: linkGroups,
    settings: settingsList[0] || null,
  });
}
