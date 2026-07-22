import { medusa } from "../client";
import { MEDUSA_READY } from "../config";
import type { StoreCart } from "../types";
import { getCurrentRegion } from "./region";

const CART_ID_KEY = "ts_cart_id";

const CART_FIELDS = [
  "id",
  "items",
  "*items",
  "*items.variant",
  "*items.variant.product",
  "*items.variant.options",
  "items.metadata",
  "*region",
  "*shipping_address",
  "*billing_address",
  "*shipping_methods",
  "*payment_collection",
  "total",
  "subtotal",
  "tax_total",
  "shipping_total",
  "discount_total",
  "item_total",
  "currency_code",
  "completed_at",
].join(",");

function readCartId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(CART_ID_KEY);
  } catch {
    return null;
  }
}

function writeCartId(id: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (id) localStorage.setItem(CART_ID_KEY, id);
    else localStorage.removeItem(CART_ID_KEY);
  } catch {
    /* ignore */
  }
}

export function clearStoredCartId(): void {
  writeCartId(null);
}

/**
 * Retrieve the persisted cart or `null`.
 * Returns null silently if the stored cart id is no longer valid in Medusa.
 */
export async function retrieveCart(): Promise<StoreCart | null> {
  if (!MEDUSA_READY) return null;
  const id = readCartId();
  if (!id) return null;
  try {
    const { cart } = await medusa.store.cart.retrieve(id, {
      fields: CART_FIELDS,
    });
    // A completed cart has already become an order and can no longer be
    // modified (adding shipping/payment throws). Discard it so a fresh cart
    // is created instead of the checkout getting stuck on a dead cart.
    if ((cart as { completed_at?: string | null })?.completed_at) {
      writeCartId(null);
      return null;
    }
    return cart as StoreCart;
  } catch (e) {
    console.warn("[medusa] retrieveCart failed — clearing cart id", e);
    writeCartId(null);
    return null;
  }
}

/** Create a fresh cart attached to the current region. */
export async function createCart(): Promise<StoreCart | null> {
  if (!MEDUSA_READY) return null;
  const region = await getCurrentRegion();
  if (!region) {
    console.error("[medusa] createCart: no region available");
    return null;
  }
  try {
    const { cart } = await medusa.store.cart.create({
      region_id: region.id,
    });
    writeCartId(cart.id);
    return cart as StoreCart;
  } catch (e) {
    console.error("[medusa] createCart failed", e);
    return null;
  }
}

/** Get-or-create — guarantees a cart on success. */
export async function getOrCreateCart(): Promise<StoreCart | null> {
  const existing = await retrieveCart();
  if (existing) return existing;
  return createCart();
}

export interface AddLineInput {
  variantId: string;
  quantity: number;
  metadata?: Record<string, unknown>;
}

export async function addLineItem(input: AddLineInput): Promise<StoreCart | null> {
  if (!MEDUSA_READY) return null;
  const cart = await getOrCreateCart();
  if (!cart) return null;
  try {
    const { cart: updated } = await medusa.store.cart.createLineItem(cart.id, {
      variant_id: input.variantId,
      quantity: input.quantity,
      metadata: input.metadata,
    });
    return updated as StoreCart;
  } catch (e) {
    console.error("[medusa] addLineItem failed", e);
    return null;
  }
}

export interface AddBladeMatrixLineInput {
  variantId: string;
  quantity: number;
  bladeType: string;
  widthMm: number;
  thicknessMm: number;
  toothPitch: string | null;
  lengthMm: number;
}

/**
 * Matrix-priced add-to-cart. Calls our custom server endpoint, which
 * recomputes the price from the matrix and uses `addToCartWorkflow` with
 * a `unit_price` override — so cart, totals, and checkout all agree.
 *
 * After the call, the cart is re-fetched so the UI shows the new line.
 */
export async function addBladeMatrixLine(
  input: AddBladeMatrixLineInput
): Promise<StoreCart | null> {
  if (!MEDUSA_READY) return null;
  const cart = await getOrCreateCart();
  if (!cart) return null;
  try {
    const { MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY } = await import(
      "../config"
    );
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/blade-price/cart-add`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
      },
      credentials: "include",
      body: JSON.stringify({
        cart_id: cart.id,
        variant_id: input.variantId,
        quantity: input.quantity,
        blade_type: input.bladeType,
        width_mm: input.widthMm,
        thickness_mm: input.thicknessMm,
        tooth_pitch: input.toothPitch,
        length_mm: input.lengthMm,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error("[medusa] addBladeMatrixLine failed", res.status, text);
      return null;
    }
    return await retrieveCart();
  } catch (e) {
    console.error("[medusa] addBladeMatrixLine failed", e);
    return null;
  }
}

export async function updateLineItem(
  lineItemId: string,
  quantity: number
): Promise<StoreCart | null> {
  if (!MEDUSA_READY) return null;
  const cart = await retrieveCart();
  if (!cart) return null;
  if (quantity <= 0) return removeLineItem(lineItemId);
  try {
    const { cart: updated } = await medusa.store.cart.updateLineItem(
      cart.id,
      lineItemId,
      { quantity }
    );
    return updated as StoreCart;
  } catch (e) {
    console.error("[medusa] updateLineItem failed", e);
    return null;
  }
}

/**
 * Matrix-fiyatlı line item için sepetten miktar güncelleme. Server fiyatı
 * yeni qty'ye göre yeniden hesaplar (welding tek seferlik + tier discount).
 */
export async function updateBladeMatrixLine(
  lineId: string,
  quantity: number
): Promise<StoreCart | null> {
  if (!MEDUSA_READY) return null;
  const cart = await retrieveCart();
  if (!cart) return null;
  if (quantity <= 0) return removeLineItem(lineId);
  try {
    const { MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY } = await import(
      "../config"
    );
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/blade-price/cart-update`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
        },
        credentials: "include",
        body: JSON.stringify({ cart_id: cart.id, line_id: lineId, quantity }),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error("[medusa] updateBladeMatrixLine failed", res.status, text);
      return null;
    }
    return await retrieveCart();
  } catch (e) {
    console.error("[medusa] updateBladeMatrixLine failed", e);
    return null;
  }
}

export async function removeLineItem(
  lineItemId: string
): Promise<StoreCart | null> {
  if (!MEDUSA_READY) return null;
  const cart = await retrieveCart();
  if (!cart) return null;
  try {
    const { parent } = (await medusa.store.cart.deleteLineItem(
      cart.id,
      lineItemId
    )) as { parent: StoreCart };
    return parent;
  } catch (e) {
    console.error("[medusa] removeLineItem failed", e);
    return null;
  }
}

export async function updateCart(
  data: Record<string, unknown>
): Promise<StoreCart | null> {
  if (!MEDUSA_READY) return null;
  const cart = await retrieveCart();
  if (!cart) return null;
  try {
    const { cart: updated } = await medusa.store.cart.update(cart.id, data);
    return updated as StoreCart;
  } catch (e) {
    console.error("[medusa] updateCart failed", e);
    return null;
  }
}

// ---------- Promotions / Kupon ----------

/**
 * Sepete kupon kodu uygula. Medusa'nın native promotions modülünü
 * kullanır — admin'de tanımlı code'ları kabul eder. Geçersizse promotion
 * silent şekilde uygulanmaz; cart objesinde değişiklik olur olmaz UI
 * `discount_total > 0` mu kontrol ederek başarıyı doğrular.
 */
export async function applyPromoCode(
  code: string
): Promise<{ ok: boolean; cart?: StoreCart; error?: string }> {
  if (!MEDUSA_READY) return { ok: false, error: "Medusa not ready" };
  const cart = await retrieveCart();
  if (!cart) return { ok: false, error: "No cart" };
  try {
    const { cart: updated } = await medusa.store.cart.update(cart.id, {
      promo_codes: [code.trim()],
    });
    return { ok: true, cart: updated as StoreCart };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function removePromoCode(
  code: string
): Promise<StoreCart | null> {
  if (!MEDUSA_READY) return null;
  const cart = await retrieveCart();
  if (!cart) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const existing = ((cart as any).promotions || []).map(
      (p: { code: string }) => p.code
    );
    const next = existing.filter((c: string) => c !== code);
    const { cart: updated } = await medusa.store.cart.update(cart.id, {
      promo_codes: next,
    });
    return updated as StoreCart;
  } catch (e) {
    console.error("[medusa] removePromoCode failed", e);
    return null;
  }
}

// ---------- Shipping options ----------

/** List shipping options available for the current cart. */
export async function listShippingOptions(): Promise<
  Array<{ id: string; name: string; amount: number; provider_id?: string }>
> {
  if (!MEDUSA_READY) return [];
  const cart = await retrieveCart();
  if (!cart) return [];
  try {
    const res = await medusa.store.fulfillment.listCartOptions({
      cart_id: cart.id,
    });
    return (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (res.shipping_options as any[]) || []
    ).map((o) => ({
      id: o.id,
      name: o.name,
      amount: o.amount ?? o.calculated_price?.calculated_amount ?? 0,
      provider_id: o.provider_id,
    }));
  } catch (e) {
    console.error("[medusa] listShippingOptions failed", e);
    return [];
  }
}

/**
 * Server-trusted shipping selection. The backend reads the cart's item
 * subtotal and attaches the correct method (free >= 2000 TL, else 79.90 TL),
 * so the client cannot pick free shipping for a small cart. Returns the
 * decision (or null on failure) and re-fetches the cart.
 */
export async function autoSelectShipping(): Promise<{
  free: boolean;
  shipping_fee: number;
  remaining: number;
  threshold: number;
} | null> {
  if (!MEDUSA_READY) return null;
  const cart = await retrieveCart();
  if (!cart) return null;
  try {
    const { MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY } = await import(
      "../config"
    );
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/shipping/auto-select`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
      },
      credentials: "include",
      body: JSON.stringify({ cart_id: cart.id }),
    });
    if (!res.ok) {
      console.error("[medusa] autoSelectShipping failed", res.status);
      return null;
    }
    const data = await res.json();
    return {
      free: !!data.free,
      shipping_fee: Number(data.shipping_fee) || 0,
      remaining: Number(data.remaining) || 0,
      threshold: Number(data.threshold) || 0,
    };
  } catch (e) {
    console.error("[medusa] autoSelectShipping failed", e);
    return null;
  }
}

/** Attach a shipping method to the current cart. */
export async function addShippingMethod(
  optionId: string
): Promise<StoreCart | null> {
  if (!MEDUSA_READY) return null;
  const cart = await retrieveCart();
  if (!cart) return null;
  try {
    const { cart: updated } = await medusa.store.cart.addShippingMethod(
      cart.id,
      { option_id: optionId }
    );
    return updated as StoreCart;
  } catch (e) {
    console.error("[medusa] addShippingMethod failed", e);
    return null;
  }
}

// ---------- Payment ----------

/** Initialize payment collection on the cart (creates payment_collection if missing). */
export async function initializePayment(
  providerId: string
): Promise<StoreCart | null> {
  if (!MEDUSA_READY) return null;
  const cart = await retrieveCart();
  if (!cart) return null;
  try {
    // initiatePaymentSession creates the payment_collection (if missing) and
    // the provider session in one call, returning { payment_collection } whose
    // payment_sessions[].data carries provider payload (iyzico paymentPageUrl).
    const resp = await medusa.store.payment.initiatePaymentSession(cart, {
      provider_id: providerId,
    });
    // retrieveCart()'s field set omits payment_sessions, so the fresh
    // collection from the initiate response must be merged back onto the cart —
    // otherwise paymentPageUrl never reaches the checkout page.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pc = (resp as any)?.payment_collection;
    const refreshed = (await retrieveCart()) || cart;
    return {
      ...refreshed,
      payment_collection: pc ?? refreshed.payment_collection,
    } as StoreCart;
  } catch (e) {
    console.error("[medusa] initializePayment failed", e);
    return null;
  }
}

// ---------- Complete ----------

export interface CompleteResult {
  type: "order" | "cart";
  orderId?: string;
  cart?: StoreCart;
  error?: string;
}

/** Complete the cart → creates an order. */
export async function completeCart(): Promise<CompleteResult> {
  if (!MEDUSA_READY) return { type: "cart", error: "Medusa not ready" };
  const cart = await retrieveCart();
  if (!cart) return { type: "cart", error: "No cart" };
  try {
    const res = await medusa.store.cart.complete(cart.id);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = res as any;
    if (r.type === "order") {
      // Order completed — clear stored cart id so a fresh cart starts next.
      clearStoredCartId();
      return { type: "order", orderId: r.order?.id };
    }
    return { type: "cart", cart: r.cart, error: r.error?.message };
  } catch (e) {
    return {
      type: "cart",
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
