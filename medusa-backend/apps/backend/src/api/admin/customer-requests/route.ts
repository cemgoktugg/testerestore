import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { CUSTOMER_REQUEST_MODULE } from "../../../modules/customer-request";
import type CustomerRequestService from "../../../modules/customer-request/service";
import { z } from "zod";
const Query = z.object({
  status: z.enum(["new", "in_progress", "awaiting_customer", "resolved"]).optional(),
  kind: z.enum(["contact", "return", "exchange"]).optional(),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parsed = Query.safeParse(req.query);
  if (!parsed.success) { res.status(400).json({ message: "Geçersiz filtre." }); return; }
  const { offset, limit, ...filters } = parsed.data;
  const service = req.scope.resolve<CustomerRequestService>(CUSTOMER_REQUEST_MODULE);
  const [requests, count] = await service.listAndCountCustomerRequests(filters, { skip: offset, take: limit, order: { created_at: "DESC" } });
  res.json({ requests, count, offset, limit });
}
