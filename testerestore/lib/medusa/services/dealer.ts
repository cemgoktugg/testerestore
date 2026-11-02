import { medusa } from "../client";
import { MEDUSA_READY } from "../config";
import type { StoreProduct } from "../types";

export interface DealerProfile {
  company_name: string;
  /** variant_id → bayi fiyatı */
  variant_prices: Record<string, number>;
}

/** Oturumdaki müşteri aktif bayiyse fiyat listesini döner, değilse null. */
export async function getDealerProfile(): Promise<DealerProfile | null> {
  if (!MEDUSA_READY) return null;
  try {
    const data = await medusa.client.fetch<
      { is_dealer: false } | ({ is_dealer: true } & DealerProfile)
    >("/store/dealer/me", { cache: "no-store" });
    return data.is_dealer ? data : null;
  } catch (e) {
    console.error("[medusa] getDealerProfile failed", e);
    return null;
  }
}

export type DealerCartSync = "updated" | "unchanged" | "other_account" | "failed";

/** Sepeti oturumdaki bayiye bağlar ve bayi fiyatlarıyla yeniden fiyatlar. */
export async function syncDealerCart(cartId: string): Promise<DealerCartSync> {
  if (!MEDUSA_READY) return "failed";
  try {
    const data = await medusa.client.fetch<{ is_dealer?: boolean; changed?: boolean }>(
      "/store/dealer/sync-cart",
      { method: "POST", body: { cart_id: cartId } }
    );
    return data.is_dealer || data.changed ? "updated" : "unchanged";
  } catch (e) {
    if ((e as { status?: number })?.status === 409) return "other_account";
    console.error("[medusa] syncDealerCart failed", e);
    return "failed";
  }
}

/**
 * Sunucuda anonim üretilen ürün verisine bayi fiyatlarını uygular. Yalnız
 * gösterim içindir: sepet fiyatını her zaman sunucu belirler.
 */
export function withDealerPrices<T extends StoreProduct | null | undefined>(
  product: T,
  prices?: Record<string, number> | null
): T {
  if (!product?.variants?.length || !prices) return product;
  return {
    ...product,
    variants: product.variants.map((v) => {
      const amount = prices[v.id];
      return typeof amount === "number" && v.calculated_price
        ? { ...v, calculated_price: { ...v.calculated_price, calculated_amount: amount } }
        : v;
    }),
  };
}
