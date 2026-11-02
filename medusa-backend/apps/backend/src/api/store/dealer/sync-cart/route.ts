import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import {
  refreshCartItemsWorkflow,
  transferCartCustomerWorkflow,
  updateLineItemInCartWorkflow,
} from "@medusajs/medusa/core-flows";
import { z } from "zod";
import { computeBladeLine } from "../../../../lib/blade-line";
import { isMatrixLineMetadata } from "../../../../lib/blade-guard";
import { findActiveDealer } from "../../../../lib/dealer-pricing";

const Schema = z.object({ cart_id: z.string().min(1) });

/**
 * POST /store/dealer/sync-cart
 *
 * Sepeti giriş yapan bayiye bağlar ve bayi fiyatlarıyla yeniden fiyatlar.
 * Bayi girişten önce sepet doldurduysa, fiyatı değiştiyse ya da bayiliği
 * kapatıldıysa satırlar buradan güncellenir. Medusa'nın yenilemesi elle
 * fiyatlı matris satırlarına dokunmadığından onlar ayrıca hesaplanır.
 *
 * Bayi olmayan müşterilerin sepetine dokunulmaz.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body", errors: parsed.error.issues });
    return;
  }
  const { cart_id } = parsed.data;
  // Rota kimlik doğrulaması zorunlu (src/api/middlewares.ts).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customerId = (req as any).auth_context?.actor_id as string;

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "cart",
    fields: [
      "id",
      "customer_id",
      "completed_at",
      "metadata",
      "customer.has_account",
      "items.id",
      "items.quantity",
      "items.unit_price",
      "items.metadata",
      "payment_collection.payment_sessions.id",
    ],
    filters: { id: cart_id },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cart = data?.[0] as any;
  if (!cart) {
    res.status(404).json({ message: "Cart not found" });
    return;
  }
  if (cart.completed_at) {
    res.json({ ok: true, changed: false });
    return;
  }

  const ownedByOther =
    cart.customer_id && cart.customer_id !== customerId && cart.customer?.has_account;
  if (ownedByOther) {
    res.status(409).json({
      message: "Bu sepet başka bir hesaba ait.",
      code: "CART_OTHER_CUSTOMER",
    });
    return;
  }

  const dealer = await findActiveDealer(req.scope, customerId);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items = (cart.items ?? []) as any[];
  const hasDealerLine = items.some((it) => it?.metadata?.dealer_price === true);
  if (!dealer && !cart.metadata?.dealer_cart && !hasDealerLine) {
    res.json({ ok: true, changed: false, is_dealer: false });
    return;
  }

  // Ödeme başladıysa (ör. kart ekranından dönüş) tutar değiştirilmez; yenileme
  // ödeme oturumunu düşürürdü. Matris satırları tamamlamada yine doğrulanır.
  if (cart.payment_collection?.payment_sessions?.length) {
    res.json({ ok: true, changed: false, is_dealer: !!dealer });
    return;
  }

  if (cart.customer_id !== customerId) {
    await transferCartCustomerWorkflow(req.scope).run({
      input: { id: cart_id, customer_id: customerId },
    });
  } else {
    await refreshCartItemsWorkflow(req.scope).run({
      input: { cart_id, force_refresh: true },
    });
  }

  let changed = false;
  for (const it of items) {
    const md = (it.metadata ?? {}) as Record<string, unknown>;
    // Teklif satırının fiyatı tekliften gelir, listeyle yeniden fiyatlanmaz.
    if (!isMatrixLineMetadata(md) || md.quote_item_id) continue;
    const quantity = Number(it.quantity);
    const pricing = await computeBladeLine(req.scope, {
      blade_type: String(md.blade_type),
      width_mm: Number(md.width_mm),
      thickness_mm: Number(md.thickness_mm),
      tooth_pitch: (md.tooth_pitch as string | null) ?? null,
      length_mm: Number(md.length_mm),
      quantity,
      customer_id: customerId,
    });
    // Fiyatı kalkmış ölçü satırı olduğu gibi kalır; sipariş tamamlanırken reddedilir.
    if (!pricing || Math.abs(pricing.unit_price - Number(it.unit_price)) <= 0.01) continue;
    await updateLineItemInCartWorkflow(req.scope).run({
      input: {
        cart_id,
        item_id: it.id,
        update: {
          quantity,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          unit_price: pricing.unit_price as any,
          metadata: { ...md, ...pricing.metadata },
        },
      },
    });
    changed = true;
  }

  await req.scope.resolve(Modules.CART).updateCarts(cart_id, {
    metadata: { ...(cart.metadata ?? {}), dealer_cart: !!dealer },
  });

  res.json({ ok: true, changed, is_dealer: !!dealer });
}
