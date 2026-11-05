import { medusa } from "../client";
import { MEDUSA_READY } from "../config";
import type { StoreProduct } from "../types";
import { getCurrentRegion } from "./region";
import { collectAllPages } from "../../pagination";
import { isReadyMade } from "../../ready-made";

const PRODUCT_FIELDS = [
  "id",
  "title",
  "handle",
  "subtitle",
  "description",
  "thumbnail",
  "metadata",
  "created_at",
  "weight",
  "*images",
  "*options",
  "*options.values",
  "*variants",
  "*variants.options",
  "*variants.calculated_price",
  // Stok göstergesi için — StockIndicator/BladeConfigurator bunları okur.
  // manage_inventory=false ise "Stokta" gösterilir; takip ediliyorsa gerçek adet.
  "variants.inventory_quantity",
  "variants.manage_inventory",
  "variants.allow_backorder",
  "*categories",
  "*collection",
  "*tags",
].join(",");

// Lists do not need every option value or full variant record sent to product detail.
const CARD_FIELDS = [
  "id", "title", "handle", "subtitle", "description", "thumbnail", "metadata", "created_at",
  "*images", "*categories", "variants.id", "variants.sku", "*variants.calculated_price",
  "variants.inventory_quantity", "variants.manage_inventory", "variants.allow_backorder",
].join(",");

interface ListOpts {
  limit?: number;
  offset?: number;
  category_id?: string | string[];
  collection_id?: string | string[];
  q?: string;
  handle?: string;
  order?: string;
}

/**
 * Build the query payload accepted by the Store products endpoint.
 * Always includes region_id (required for pricing context).
 */
async function buildQuery(opts: ListOpts = {}) {
  const region = await getCurrentRegion();
  const query: Record<string, unknown> = {
    fields: PRODUCT_FIELDS,
    limit: opts.limit ?? 20,
    offset: opts.offset ?? 0,
  };
  if (region?.id) query.region_id = region.id;
  if (opts.category_id) query.category_id = opts.category_id;
  if (opts.collection_id) query.collection_id = opts.collection_id;
  if (opts.q) query.q = opts.q;
  if (opts.handle) query.handle = opts.handle;
  if (opts.order) query.order = opts.order;
  return query;
}

/** List products, scoped to the current region for pricing. */
export async function listProducts(
  opts: ListOpts = {}
): Promise<{ products: StoreProduct[]; count: number }> {
  if (!MEDUSA_READY) return { products: [], count: 0 };
  const query = await buildQuery(opts);
  const res = await medusa.store.product.list({ ...query, fields: CARD_FIELDS });
  return {
    products: res.products as StoreProduct[],
    count: res.count ?? res.products.length,
  };
}

/** Complete catalogue for filters that the Store API cannot express (metadata). */
export async function listAllProducts(opts: Omit<ListOpts, "limit" | "offset"> = {}): Promise<StoreProduct[]> {
  if (!MEDUSA_READY) return [];
  const query = await buildQuery(opts);
  return collectAllPages(async (offset, limit) => {
    const res = await medusa.store.product.list({ ...query, fields: CARD_FIELDS, order: opts.order || "id", offset, limit });
    return { items: res.products as StoreProduct[], count: res.count };
  });
}

/**
 * Sitemap / llms için hafif liste: fiyat ve varyant yok, güncelleme tarihi
 * ve görseller var. Hata fırlatır (sessizce boş dönmez) — çağıran karar versin.
 */
export async function listProductsForSitemap(): Promise<
  Array<{ handle: string; title: string; updated_at?: string; thumbnail?: string | null; images?: { url: string }[] }>
> {
  if (!MEDUSA_READY) return [];
  return collectAllPages(async (offset, limit) => {
    const res = await medusa.store.product.list({
      fields: "id,handle,title,updated_at,thumbnail,*images", order: "id", offset, limit,
    });
    return { items: res.products as Array<{ handle: string; title: string; updated_at?: string; thumbnail?: string | null; images?: { url: string }[] }>, count: res.count };
  });
}

/** llms.txt / llms-full.txt için: fiyatsız, içerik alanları dahil. Hata fırlatır. */
export async function listProductsForLlms(): Promise<StoreProduct[]> {
  if (!MEDUSA_READY) return [];
  return collectAllPages(async (offset, limit) => {
    const res = await medusa.store.product.list({
      fields: "id,handle,title,subtitle,description,metadata,*categories", order: "id", offset, limit,
    });
    return { items: res.products as StoreProduct[], count: res.count };
  });
}

/** Fetch a single product by handle (preferred for SEO-friendly URLs). */
export async function getProductByHandle(
  handle: string
): Promise<StoreProduct | null> {
  if (!MEDUSA_READY || !handle) return null;
  try {
    const query = await buildQuery({ handle, limit: 1 });
    const res = await medusa.store.product.list(query);
    return ((res.products?.[0] as StoreProduct) || null) ?? null;
  } catch (e) {
    // Hata ≠ "ürün yok". Eskiden null dönüyordu → sayfa notFound() verip 404'ü
    // ISR ile önbelleğe alıyordu (deploy sırasında backend kısa süre kapalıyken
    // amiral ürün sayfası 404 olarak cache'lendi). Fırlatınca sayfa 500 verir;
    // Next hatalı sonucu önbelleğe almaz, sonraki istek yeniden dener.
    console.error(`[medusa] getProductByHandle(${handle}) failed`, e);
    throw e;
  }
}

/** Fetch a single product by ID. */
export async function getProductById(
  id: string
): Promise<StoreProduct | null> {
  if (!MEDUSA_READY || !id) return null;
  try {
    const region = await getCurrentRegion();
    const res = await medusa.store.product.retrieve(id, {
      fields: PRODUCT_FIELDS,
      ...(region?.id ? { region_id: region.id } : {}),
    });
    return (res.product as StoreProduct) || null;
  } catch (e) {
    // Bilinmeyen ID → Medusa 404 → gerçekten "yok". Diğer hatalar fırlatılır
    // (bkz. getProductByHandle — hata 404 olarak önbelleğe alınmasın).
    if ((e as { status?: number })?.status === 404) return null;
    console.error(`[medusa] getProductById(${id}) failed`, e);
    throw e;
  }
}

/**
 * "Slug" resolver — accepts either a handle ("bimetal-premium")
 * or a Medusa internal ID ("prod_01H..."). Used in URLs that historically
 * passed `id` but should keep working with handle-based seeds.
 */
export async function getProductBySlug(
  slug: string
): Promise<StoreProduct | null> {
  if (!slug) return null;
  if (slug.startsWith("prod_")) {
    const p = await getProductById(slug);
    if (p) return p;
  }
  return getProductByHandle(slug);
}

/** Best-seller list — looks for metadata.is_best_seller, falls back to recent. */
export async function listBestSellers(
  limit = 8
): Promise<StoreProduct[]> {
  if (!MEDUSA_READY) return [];
  return selectBestSellers(await listAllProducts(), limit);
}

export function selectBestSellers(products: StoreProduct[], limit = 8): StoreProduct[] {
  const flagged = products
    .filter((p) => (p.metadata as Record<string, unknown> | null)?.is_best_seller)
    .sort((a, b) => {
      const ra = Number(
        (a.metadata as Record<string, unknown> | null)?.best_seller_rank ?? 9999
      );
      const rb = Number(
        (b.metadata as Record<string, unknown> | null)?.best_seller_rank ?? 9999
      );
      return ra - rb;
    });
  if (flagged.length) return flagged.slice(0, limit);
  return [...products].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()).slice(0, limit);
}

/**
 * Ready-made (hazır boy) ürünler — metadata.is_ready_made === true olanlar.
 * Ana katalogdan ayrı bölümde/sayfada listelenir. Boy'a göre (kısa→uzun) sıralı.
 */
export async function listReadyMade(limit = Number.POSITIVE_INFINITY): Promise<StoreProduct[]> {
  if (!MEDUSA_READY) return [];
  return selectReadyMade(await listAllProducts(), limit);
}

export function selectReadyMade(products: StoreProduct[], limit = Number.POSITIVE_INFINITY): StoreProduct[] {
  const ready = products.filter(isReadyMade);
  ready.sort((a, b) => {
    const la = Number((a.metadata as Record<string, unknown> | null)?.length_mm ?? 0);
    const lb = Number((b.metadata as Record<string, unknown> | null)?.length_mm ?? 0);
    return la - lb;
  });
  return ready.slice(0, limit);
}

/** Related products — same primary category, excluding self. */
export async function listRelatedProducts(
  product: StoreProduct,
  limit = 4
): Promise<StoreProduct[]> {
  if (!MEDUSA_READY) return [];
  const categoryId = product.categories?.[0]?.id;
  if (!categoryId) {
    const { products } = await listProducts({ limit: limit + 1 });
    return products.filter((p) => p.id !== product.id).slice(0, limit);
  }
  const { products } = await listProducts({
    category_id: categoryId,
    limit: limit + 1,
  });
  return products.filter((p) => p.id !== product.id).slice(0, limit);
}
