import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type FooterService from "../../../modules/footer/service";
import { FOOTER_MODULE } from "../../../modules/footer";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<FooterService>(FOOTER_MODULE);
  const features = await svc.listFooterFeatures(
    {},
    { order: { sort_order: "ASC" } }
  );
  res.json({ features });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<FooterService>(FOOTER_MODULE);
  const body = req.body as Record<string, unknown>;
  const [feature] = await svc.createFooterFeatures([body]);
  res.status(201).json({ feature });
}
