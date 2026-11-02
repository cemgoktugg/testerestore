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

export interface DealerPriceList {
  company_name: string;
  blades: {
    id: string;
    blade_type: string;
    width_mm: number;
    thickness_mm: number;
    tooth_pitch: string | null;
    list_price_per_meter: number;
    list_welding_fee: number;
    price_per_meter: number;
    welding_fee: number;
  }[];
  products: {
    id: string;
    title: string;
    handle: string;
    list_amount: number | null;
    amount: number | null;
  }[];
}

/** Bayinin özel fiyatları; bayi değilse null. */
export async function getDealerPriceList(): Promise<DealerPriceList | null> {
  if (!MEDUSA_READY) return null;
  try {
    return await medusa.client.fetch<DealerPriceList>("/store/dealer/price-list", {
      cache: "no-store",
    });
  } catch {
    return null;
  }
}

export interface DealerQuote {
  id: string;
  number: string;
  note: string | null;
  created_at: string;
  sent_at: string | null;
  items: {
    id: string;
    title: string;
    detail: string | null;
    quantity: number;
    unit_price: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
}

/** Bayiye gönderilmiş teklifler; bayi değilse null. */
export async function getDealerQuotes(): Promise<DealerQuote[] | null> {
  if (!MEDUSA_READY) return null;
  try {
    const { quotes } = await medusa.client.fetch<{ quotes: DealerQuote[] }>(
      "/store/dealer/quotes",
      { cache: "no-store" }
    );
    return quotes;
  } catch {
    return null;
  }
}

export async function downloadDealerQuotePdf(id: string, number: string): Promise<boolean> {
  try {
    const res = await medusa.client.fetch<Response>(`/store/dealer/quotes/${id}/pdf`, {
      headers: { accept: "application/pdf" },
      cache: "no-store",
    });
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = `${number}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    return true;
  } catch (e) {
    console.error("[medusa] downloadDealerQuotePdf failed", e);
    return false;
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
