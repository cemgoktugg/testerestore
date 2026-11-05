jest.mock("@medusajs/framework/utils", () => ({ ContainerRegistrationKeys: { QUERY: "query" } }));
jest.mock("../../modules/customer-request", () => ({ CUSTOMER_REQUEST_MODULE: "customerRequest" }));

import { GET, POST } from "../../api/store/orders/[id]/requests/route";

const requestKey = "f2cdd7cb-2cb7-4df8-98ba-872097130955";
function harness(owner = "customer_a", actor = "customer_a") {
  const graph = jest.fn(async ({ filters }) => ({ data: filters.customer_id === owner
    ? [{ id: "order_a", customer_id: owner, status: "pending", email: "customer@example.com", items: [{ id: "line_a", quantity: 2, title: "Bıçak" }] }]
    : [] }));
  const service = { listCustomerRequests: jest.fn(async () => []), createCustomerRequests: jest.fn(async (rows) => [{ id: "request_a", ...rows[0] }]) };
  const req = {
    params: { id: "order_a" }, auth_context: { actor_type: "customer", actor_id: actor },
    body: { request_key: requestKey, kind: "return", message: "Ürün talep açıklaması", items: [{ item_id: "line_a", quantity: 1 }] },
    scope: { resolve: (name: string) => name === "query" ? { graph } : service },
  };
  const res = { status: jest.fn(), json: jest.fn() };
  res.status.mockReturnValue(res);
  return { req, res, service, graph };
}
describe("order request authorization", () => {
  test("neither lists nor creates requests for another customer's order", async () => {
    const state = harness("customer_b", "customer_a");
    await GET(state.req as never, state.res as never);
    expect(state.res.status).toHaveBeenCalledWith(404);
    expect(state.service.listCustomerRequests).not.toHaveBeenCalled();
    await POST(state.req as never, state.res as never);
    expect(state.service.createCustomerRequests).not.toHaveBeenCalled();
    expect(state.graph).toHaveBeenCalledWith(expect.objectContaining({ filters: { id: "order_a", customer_id: "customer_a" } }));
  });
  test("rejects an order item forged from another order without persisting a request", async () => {
    const state = harness();
    state.req.body.items = [{ item_id: "foreign_line", quantity: 1 }];
    await POST(state.req as never, state.res as never);
    expect(state.res.status).toHaveBeenCalledWith(400);
    expect(state.service.createCustomerRequests).not.toHaveBeenCalled();
  });
  test("persists an owned request as new without invoking shipment or order mutations", async () => {
    const state = harness();
    await POST(state.req as never, state.res as never);
    expect(state.res.status).toHaveBeenCalledWith(201);
    expect(state.service.createCustomerRequests).toHaveBeenCalledWith([expect.objectContaining({
      order_id: "order_a", customer_id: "customer_a", status: "new", kind: "return",
      items: { lines: [{ item_id: "line_a", quantity: 1, title: "Bıçak" }] },
    })]);
  });
});
