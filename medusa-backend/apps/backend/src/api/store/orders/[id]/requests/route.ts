import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CUSTOMER_REQUEST_MODULE } from "../../../../../modules/customer-request";
import type CustomerRequestService from "../../../../../modules/customer-request/service";
import { orderRequestSchema, publicRequest, requestNumber, validateRequestItems } from "../../../../../lib/customer-request";

async function ownedOrder(req: AuthenticatedMedusaRequest) {
  if (req.auth_context?.actor_type !== "customer" || !req.auth_context.actor_id) return null;
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "order",
    fields: ["id", "customer_id", "email", "status", "items.id", "items.quantity", "items.title", "items.product_title", "shipping_address.first_name", "shipping_address.last_name"],
    filters: { id: req.params.id, customer_id: req.auth_context.actor_id },
  });
  return data[0];
}

export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const order = await ownedOrder(req);
  if (!order) { res.status(404).json({ message: "Sipariş bulunamadı." }); return; }
  const service = req.scope.resolve<CustomerRequestService>(CUSTOMER_REQUEST_MODULE);
  const requests = await service.listCustomerRequests(
    { order_id: order.id, customer_id: req.auth_context.actor_id },
    { order: { created_at: "DESC" }, take: 100 },
  );
  res.json({ requests: requests.map(publicRequest) });
}

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const parsed = orderRequestSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: parsed.error.issues[0]?.message }); return; }
  const order = await ownedOrder(req);
  if (!order) { res.status(404).json({ message: "Sipariş bulunamadı." }); return; }
  if (order.status === "canceled") { res.status(409).json({ message: "İptal edilmiş sipariş için talep açılamaz." }); return; }
  const service = req.scope.resolve<CustomerRequestService>(CUSTOMER_REQUEST_MODULE);
  const existing = await service.listCustomerRequests({
    request_key: parsed.data.request_key, customer_id: req.auth_context.actor_id, order_id: order.id,
  });
  if (existing[0]) { res.json({ request: publicRequest(existing[0]) }); return; }
  const open = await service.listCustomerRequests({ order_id: order.id, status: ["new", "in_progress", "awaiting_customer"] });
  if (open.length) { res.status(409).json({ message: "Bu sipariş için açık bir talebiniz bulunuyor. Aşağıdaki talep numarasıyla bizimle iletişime geçebilirsiniz." }); return; }
  let items;
  try { items = validateRequestItems(parsed.data.items, order.items || []); }
  catch (error) { res.status(400).json({ message: error instanceof Error ? error.message : "Geçersiz ürün." }); return; }
  try {
    const [created] = await service.createCustomerRequests([{
      request_number: requestNumber(), request_key: parsed.data.request_key,
      kind: parsed.data.kind, status: "new", customer_id: req.auth_context.actor_id,
      order_id: order.id, email: order.email || "", name: [order.shipping_address?.first_name, order.shipping_address?.last_name].filter(Boolean).join(" ") || "Müşteri",
      message: parsed.data.message, items: { lines: items },
    }]);
    res.status(201).json({ request: publicRequest(created) });
  } catch (error) {
    // A retry or concurrent submission must not create two open requests.
    const requests = await service.listCustomerRequests({ order_id: order.id, customer_id: req.auth_context.actor_id, request_key: parsed.data.request_key });
    if (requests[0]) { res.json({ request: publicRequest(requests[0]) }); return; }
    const active = await service.listCustomerRequests({ order_id: order.id, status: ["new", "in_progress", "awaiting_customer"] });
    if (active.length) { res.status(409).json({ message: "Bu sipariş için açık bir talebiniz bulunuyor." }); return; }
    throw error;
  }
}
