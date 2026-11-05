import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { CUSTOMER_REQUEST_MODULE } from "../../../../modules/customer-request";
import type CustomerRequestService from "../../../../modules/customer-request/service";
import { z } from "zod";
const Schema = z.object({
  status: z.enum(["new", "in_progress", "awaiting_customer", "resolved"]),
  public_reply: z.string().trim().max(4000),
  internal_note: z.string().trim().max(4000),
}).strict();
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Geçersiz talep güncellemesi." }); return; }
  const service = req.scope.resolve<CustomerRequestService>(CUSTOMER_REQUEST_MODULE);
  const [row] = await service.listCustomerRequests({ id: req.params.id });
  if (!row) { res.status(404).json({ message: "Talep bulunamadı." }); return; }
  const [updated] = await service.updateCustomerRequests([{ id: row.id, ...parsed.data }]);
  res.json({ request: updated });
}
