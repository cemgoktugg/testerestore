import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { addShippingMethodToCartWorkflow } from "@medusajs/medusa/core-flows";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * Free-shipping threshold (item subtotal, KDV-exclusive) and the flat fee
 * charged below it. Kept in sync with the storefront `lib/shipping.ts`.
 */
export const FREE_SHIPPING_THRESHOLD = 2000;
export const STANDARD_SHIPPING_FEE = 79.9;

const Schema = z.object({ cart_id: z.string().min(1) });

/**
 * POST /store/shipping/auto-select
 *
 * Server-trusted shipping selection. The browser must NOT decide whether
 * shipping is free — a crafted request could otherwise pick the 0 TRY option
 * for a small cart. This endpoint reads the cart's item subtotal server-side
 * and attaches the correct shipping method:
 *
 *   item_subtotal >= 2000  ->  "Ücretsiz Kargo" (0 TRY)
 *   item_subtotal <  2000  ->  "Standart Kargo" (79.90 TRY)
 *
 * Any previously attached shipping method is removed first so repeated calls
 * (e.g. the customer editing the cart) stay idempotent.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid body", errors: parsed.error.issues });
    return;
  }
  const { cart_id } = parsed.data;

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const cartModule = req.scope.resolve(Modules.CART);

  // Item subtotal = Σ(unit_price × quantity) — matches the storefront's
  // "Ara Toplam" (KDV-exclusive), independent of cart-level tax/discount.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cart = await (cartModule as any).retrieveCart(cart_id, {
    relations: ["items", "shipping_methods"],
  });
  if (!cart) {
    res.status(404).json({ message: "Cart not found" });
    return;
  }
  const itemSubtotal = (cart.items || []).reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, it: any) => sum + Number(it.unit_price) * Number(it.quantity),
    0
  );

  const free = itemSubtotal >= FREE_SHIPPING_THRESHOLD;
  const targetName = free ? "Ücretsiz Kargo" : "Standart Kargo";

  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
  });
  const opt = options.find((o: { name: string }) => o.name === targetName);
  if (!opt) {
    res.status(500).json({
      message: `Shipping option '${targetName}' not found. Run seed-tr-shipping-update.ts.`,
    });
    return;
  }

  // Remove any existing shipping methods so we don't stack them.
  const existing = (cart.shipping_methods || []) as Array<{ id: string }>;
  if (existing.length) {
    await cartModule.deleteShippingMethods(existing.map((m) => m.id));
  }

  try {
    await addShippingMethodToCartWorkflow(req.scope).run({
      input: { cart_id, options: [{ id: opt.id }] },
    });
  } catch (e) {
    res.status(500).json({
      message: "addShippingMethodToCartWorkflow failed",
      error: e instanceof Error ? e.message : String(e),
    });
    return;
  }

  res.json({
    ok: true,
    free,
    threshold: FREE_SHIPPING_THRESHOLD,
    item_subtotal: itemSubtotal,
    remaining: free ? 0 : Math.max(0, FREE_SHIPPING_THRESHOLD - itemSubtotal),
    shipping_option_id: opt.id,
    shipping_fee: free ? 0 : STANDARD_SHIPPING_FEE,
  });
}
