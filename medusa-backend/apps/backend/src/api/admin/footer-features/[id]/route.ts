import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type FooterService from "../../../../modules/footer/service";
import { FOOTER_MODULE } from "../../../../modules/footer";

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<FooterService>(FOOTER_MODULE);
  const id = req.params.id as string;
  const body = req.body as Record<string, unknown>;
  const [feature] = await svc.updateFooterFeatures([{ id, ...body }]);
  res.json({ feature });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<FooterService>(FOOTER_MODULE);
  const id = req.params.id as string;
  await svc.deleteFooterFeatures([id]);
  res.json({ id, deleted: true });
}
