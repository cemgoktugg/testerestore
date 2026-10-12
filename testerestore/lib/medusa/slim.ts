import type { StoreProduct } from "./types";

/**
 * Kart/listeleme bileşenlerine (client component) prop olarak geçilecek ürünü
 * küçültür. Tam StoreProduct nesneleri (yüzlerce varyant + her birinin
 * calculated_price'ı) RSC payload'una gömülüyordu → ana sayfa HTML'i 2,75 MB.
 *
 * Kartların kullandığı alanlar korunur: kimlik/başlık/açıklama, görsel,
 * kategori handle/adı, kart metadata'sı ve EN UCUZ varyantın fiyatı + stok
 * bilgisi (minimum fiyat ve hazır-boy stok gösterimi için yeterli).
 */
const CARD_META_KEYS = [
  "is_ready_made",
  "blade_type",
  "product_type",
  "width_mm",
  "thickness_mm",
  "tooth_pitch",
  "length_mm",
  "is_best_seller",
  "best_seller_rank",
] as const;

const MAX_DESCRIPTION = 280;

export function slimProductForCard(p: StoreProduct): StoreProduct {
  const variants = p.variants ?? [];
  let cheapest: (typeof variants)[number] | undefined;
  for (const v of variants) {
    const amount = v.calculated_price?.calculated_amount;
    if (typeof amount !== "number" || amount <= 0) continue;
    const best = cheapest?.calculated_price?.calculated_amount;
    if (typeof best !== "number" || amount < best) cheapest = v;
  }
  const v = cheapest ?? variants[0];

  const meta = (p.metadata || {}) as Record<string, unknown>;
  const slimMeta: Record<string, unknown> = {};
  for (const k of CARD_META_KEYS) if (k in meta) slimMeta[k] = meta[k];

  const description = p.description || "";

  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    subtitle: p.subtitle,
    description:
      description.length > MAX_DESCRIPTION
        ? `${description.slice(0, MAX_DESCRIPTION)}…`
        : description,
    thumbnail: p.thumbnail,
    images: (p.images ?? []).slice(0, 1).map((i) => ({ id: i.id, url: i.url })),
    categories: (p.categories ?? []).map((c) => ({
      id: c.id,
      name: c.name,
      handle: c.handle,
    })),
    metadata: slimMeta,
    created_at: p.created_at,
    updated_at: p.updated_at,
    variants: v
      ? [
          {
            id: v.id,
            sku: v.sku,
            manage_inventory: v.manage_inventory,
            inventory_quantity: v.inventory_quantity,
            calculated_price: v.calculated_price
              ? {
                  calculated_amount: v.calculated_price.calculated_amount,
                  currency_code: v.calculated_price.currency_code,
                }
              : undefined,
          },
        ]
      : [],
    // Kart bileşenleri yalnızca yukarıdaki alanları okur; tipin geri kalanı
    // bilerek boş bırakıldı.
  } as unknown as StoreProduct;
}
