/**
 * Sunucu-güvenli kargo seçimi — TEK KAYNAK.
 *
 * Daha önce yalnızca /store/shipping/auto-select route'unun içindeydi;
 * danışman sohbeti de sepeti hazırlarken aynı kararı vermek zorunda olduğu
 * için buraya çıkarıldı. Ücretsiz kargo eşiğine tarayıcı KARAR VEREMEZ:
 * uydurma bir istek küçük sepette 0 TL'lik seçeneği seçebilirdi.
 */
import type { MedusaContainer } from "@medusajs/framework/types";
import { addShippingMethodToCartWorkflow } from "@medusajs/medusa/core-flows";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

/** Ücretsiz kargo eşiği (ara toplam, KDV hariç) ve altındaki sabit ücret. */
export const FREE_SHIPPING_THRESHOLD = 2000;
export const STANDARD_SHIPPING_FEE = 79.9;

export type AutoShippingResult =
  | {
      ok: true;
      free: boolean;
      item_subtotal: number;
      shipping_option_id: string;
      shipping_fee: number;
    }
  | {
      ok: false;
      code: "CART_NOT_FOUND" | "OPTION_NOT_FOUND" | "WORKFLOW_FAILED";
      message: string;
    };

/**
 * Sepetin ara toplamını sunucuda okur ve doğru kargo yöntemini bağlar.
 *
 *   ara_toplam >= 2000  ->  "Ücretsiz Kargo" (0 TL)
 *   ara_toplam <  2000  ->  "Standart Kargo" (79,90 TL)
 *
 * Önceden bağlı yöntemler silinir; tekrar çağrılması güvenlidir (idempotent).
 */
export async function applyAutoShipping(
  container: MedusaContainer,
  cartId: string
): Promise<AutoShippingResult> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const cartModule = container.resolve(Modules.CART);

  // Ara toplam = Σ(unit_price × quantity) — storefront'taki "Ara Toplam" ile
  // aynı (KDV hariç), sepet seviyesindeki vergi/indirimden bağımsız.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cart = await (cartModule as any).retrieveCart(cartId, {
    relations: ["items", "shipping_methods"],
  });
  if (!cart) {
    return { ok: false, code: "CART_NOT_FOUND", message: "Cart not found" };
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
    return {
      ok: false,
      code: "OPTION_NOT_FOUND",
      message: `Shipping option '${targetName}' not found. Run seed-tr-shipping-update.ts.`,
    };
  }

  // Mevcut yöntemleri temizle ki üst üste binmesin.
  const existing = (cart.shipping_methods || []) as Array<{ id: string }>;
  if (existing.length) {
    await cartModule.deleteShippingMethods(existing.map((m) => m.id));
  }

  try {
    await addShippingMethodToCartWorkflow(container).run({
      input: { cart_id: cartId, options: [{ id: opt.id }] },
    });
  } catch (e) {
    return {
      ok: false,
      code: "WORKFLOW_FAILED",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  return {
    ok: true,
    free,
    item_subtotal: itemSubtotal,
    shipping_option_id: opt.id,
    shipping_fee: free ? 0 : STANDARD_SHIPPING_FEE,
  };
}
