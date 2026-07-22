import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type FooterService from "../../../modules/footer/service";
import { FOOTER_MODULE } from "../../../modules/footer";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<FooterService>(FOOTER_MODULE);
  const groups = await svc.listFooterLinkGroups(
    {},
    { order: { sort_order: "ASC" } }
  );
  res.json({ link_groups: groups });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<FooterService>(FOOTER_MODULE);
  const body = req.body as Record<string, unknown>;
  const [group] = await svc.createFooterLinkGroups([body]);
  res.status(201).json({ link_group: group });
}
