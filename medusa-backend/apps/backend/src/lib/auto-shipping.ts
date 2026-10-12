/**
 * Sunucu-güvenli kargo seçimi — TEK KAYNAK.
 *
 * Ücretsiz kargo artık AYRI bir seçenek değil, "Standart Kargo"nun koşullu
 * fiyatıdır (Medusa price rule: Türkiye bölgesi + `item_total >= 2400` → 0 TL;
 * item_total KDV DAHİL, KDV %20 ile 2.400 KDV dahil = 2.000 KDV hariç).
 * Fiyatı her zaman Medusa hesaplar; müşteri seçeneği standart uç noktadan
 * (`POST /store/carts/:id/shipping-methods`) doğrudan seçse bile küçük sepette
 * 0 TL alamaz. Eskiden 0 TL'lik ayrı "Ücretsiz Kargo" seçeneği vardı ve
 * herhangi bir sepette doğrudan seçilebiliyordu.
 *
 * Bu fonksiyon, müşterinin seçim yapmadığı akışlarda (danışman sohbetinin
 * sepet hazırlaması, eski istemciler) "Standart Kargo"yu bağlar.
 */
import type { MedusaContainer } from "@medusajs/framework/types";
import { addShippingMethodToCartWorkflow } from "@medusajs/medusa/core-flows";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

/**
 * Gösterim amaçlı eşik (ara toplam, KDV hariç) ve taban ücret. Asıl kural
 * Medusa'daki fiyat kuralıdır; değişirse storefront lib/shipping.ts ile
 * birlikte güncellenmeli.
 */
export const FREE_SHIPPING_THRESHOLD = 2000;
export const STANDARD_SHIPPING_FEE = 79.9;
const STANDARD_OPTION_NAME = "Standart Kargo";

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
 * Sepete "Standart Kargo"yu bağlar; ücreti (79,90 TL veya eşik üstünde 0 TL)
 * Medusa'nın fiyat kuralı belirler. Önceden bağlı yöntemler silinir; tekrar
 * çağrılması güvenlidir (idempotent).
 */
export async function applyAutoShipping(
  container: MedusaContainer,
  cartId: string
): Promise<AutoShippingResult> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const cartModule = container.resolve(Modules.CART);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cart = await (cartModule as any).retrieveCart(cartId, {
    relations: ["items", "shipping_methods"],
  });
  if (!cart) {
    return { ok: false, code: "CART_NOT_FOUND", message: "Cart not found" };
  }

  // Ara toplam = Σ(unit_price × quantity) — KDV hariç (yalnızca yanıtta bilgi için)
  const itemSubtotal = (cart.items || []).reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (sum: number, it: any) => sum + Number(it.unit_price) * Number(it.quantity),
    0
  );

  const { data: options } = await query.graph({
    entity: "shipping_option",
    fields: ["id", "name"],
  });
  const opt = options.find((o: { name: string }) => o.name === STANDARD_OPTION_NAME);
  if (!opt) {
    return {
      ok: false,
      code: "OPTION_NOT_FOUND",
      message: `Shipping option '${STANDARD_OPTION_NAME}' not found.`,
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

  // Uygulanan ücret Medusa'nın hesapladığı tutardır (kurala göre 0 veya 79,90).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updated = await (cartModule as any).retrieveCart(cartId, {
    relations: ["shipping_methods"],
  });
  const fee = Number(updated?.shipping_methods?.[0]?.amount ?? STANDARD_SHIPPING_FEE);

  return {
    ok: true,
    free: fee === 0,
    item_subtotal: itemSubtotal,
    shipping_option_id: opt.id,
    shipping_fee: fee,
  };
}
