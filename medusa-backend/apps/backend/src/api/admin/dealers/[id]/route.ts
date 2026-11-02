import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  deleteCustomerGroupsWorkflow,
  deletePriceListsWorkflow,
  updatePriceListsWorkflow,
} from "@medusajs/medusa/core-flows";
import { z } from "zod";
import { dealerService } from "../../../../lib/dealer-pricing";

const UpdateSchema = z.object({
  company_name: z.string().trim().min(1).optional(),
  note: z.string().trim().nullable().optional(),
  is_active: z.boolean().optional(),
});

/** POST /admin/dealers/:id — ad, not ve aktiflik. Pasif bayi genel fiyat görür. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Geçersiz bilgi", errors: parsed.error.issues });
    return;
  }
  const service = dealerService(req.scope);
  const [current] = await service.listDealers({ id: req.params.id }, { take: 1 });
  if (!current) {
    res.status(404).json({ message: "Bayi bulunamadı." });
    return;
  }
  if (
    parsed.data.is_active !== undefined &&
    parsed.data.is_active !== current.is_active
  ) {
    await updatePriceListsWorkflow(req.scope).run({
      input: {
        price_lists_data: [
          {
            id: current.price_list_id,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            status: (parsed.data.is_active ? "active" : "draft") as any,
          },
        ],
      },
    });
  }
  const dealer = await service.updateDealers({ id: current.id, ...parsed.data });
  res.json({ dealer });
}

/** DELETE /admin/dealers/:id — bayiliği, fiyat listesini ve grubunu kaldırır. */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service = dealerService(req.scope);
  const [current] = await service.listDealers({ id: req.params.id }, { take: 1 });
  if (!current) {
    res.status(404).json({ message: "Bayi bulunamadı." });
    return;
  }
  await deletePriceListsWorkflow(req.scope).run({
    input: { ids: [current.price_list_id] },
  });
  await deleteCustomerGroupsWorkflow(req.scope).run({
    input: { ids: [current.customer_group_id] },
  });
  const overrides = await service.listDealerBladePrices(
    { dealer_id: current.id },
    { select: ["id"], take: 100000 }
  );
  if (overrides.length) {
    await service.softDeleteDealerBladePrices(overrides.map((o) => o.id));
  }
  await service.softDeleteDealers(current.id);
  res.json({ id: current.id, deleted: true });
}
