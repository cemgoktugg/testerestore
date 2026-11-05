import { medusa } from "../client";
export interface CustomerRequest {
  id: string; request_number: string; kind: "return" | "exchange"; status: string;
  order_id: string; message: string; public_reply?: string | null; created_at: string;
  items?: { lines?: Array<{ item_id: string; title: string; quantity: number }> };
}
export function listOrderRequests(orderId: string): Promise<{ requests: CustomerRequest[] }> {
  return medusa.client.fetch("/store/orders/" + encodeURIComponent(orderId) + "/requests", { method: "GET" });
}
export function createOrderRequest(orderId: string, input: {
  request_key: string; kind: "return" | "exchange"; message: string;
  items: Array<{ item_id: string; quantity: number }>;
}): Promise<{ request: CustomerRequest }> {
  return medusa.client.fetch("/store/orders/" + encodeURIComponent(orderId) + "/requests", { method: "POST", body: input });
}
