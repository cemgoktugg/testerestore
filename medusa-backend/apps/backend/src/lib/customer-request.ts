import { randomBytes } from "node:crypto";
import { z } from "zod";

export const orderRequestSchema = z.object({
  request_key: z.string().uuid(),
  kind: z.enum(["return", "exchange"]),
  message: z.string().trim().min(10, "Talebinizi en az 10 karakterle açıklayın.").max(4000),
  items: z.array(z.object({ item_id: z.string().min(1), quantity: z.number().int().positive() })).min(1).max(100),
}).strict();

export function validateRequestItems(
  requested: Array<{ item_id: string; quantity: number }>,
  ordered: Array<{ id: string; quantity: number; title?: string | null; product_title?: string | null } | null>,
) {
  const seen = new Set<string>();
  return requested.map((item) => {
    const source = ordered.find((row) => row?.id === item.item_id);
    if (!source || seen.has(item.item_id) || !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 || item.quantity > Number(source.quantity)) {
      throw new Error("Ürün ve adet siparişinizle eşleşmiyor.");
    }
    seen.add(item.item_id);
    return { ...item, title: source.product_title || source.title || "Ürün" };
  });
}

export function requestNumber() { return "TS-" + randomBytes(8).toString("hex").toUpperCase(); }

export function publicRequest(row: Record<string, any>) {
  return {
    id: row.id, request_number: row.request_number, kind: row.kind,
    status: row.status, order_id: row.order_id, message: row.message,
    items: row.items, public_reply: row.public_reply,
    created_at: row.created_at, updated_at: row.updated_at,
  };
}
