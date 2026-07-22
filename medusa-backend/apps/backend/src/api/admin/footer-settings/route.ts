import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type FooterService from "../../../modules/footer/service";
import { FOOTER_MODULE } from "../../../modules/footer";

/** GET /admin/footer-settings — returns the singleton row. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<FooterService>(FOOTER_MODULE);
  const list = await svc.listFooterSettings({});
  res.json({ settings: list[0] || null });
}

/**
 * PATCH /admin/footer-settings — updates the singleton row.
 * Creates one on demand if it doesn't exist yet.
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<FooterService>(FOOTER_MODULE);
  const body = req.body as Record<string, unknown>;
  const existing = await svc.listFooterSettings({});

  let settings;
  if (existing.length === 0) {
    [settings] = await svc.createFooterSettings([body]);
  } else {
    [settings] = await svc.updateFooterSettings([
      { id: existing[0].id, ...body },
    ]);
  }
  res.json({ settings });
}
