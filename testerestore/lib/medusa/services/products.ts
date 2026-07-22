import { medusa } from "../client";
import { MEDUSA_READY } from "../config";
import type { StoreProduct } from "../types";
import { getCurrentRegion } from "./region";

const PRODUCT_FIELDS = [
  "id",
  "title",
  "handle",
  "subtitle",
  "description",
  "thumbnail",
  "metadata",
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
  "*categories",
  "*collection",
  "*tags",
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
  try {
    const query = await buildQuery(opts);
    const res = await medusa.store.product.list(query);
    return {
      products: res.products as StoreProduct[],
      count: (res as { count?: number }).count ?? res.products.length,
    };
  } catch (e) {
    console.error("[medusa] listProducts failed", e);
    return { products: [], count: 0 };
  }
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
    console.error(`[medusa] getProductByHandle(${handle}) failed`, e);
    return null;
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
    console.error(`[medusa] getProductById(${id}) failed`, e);
    return null;
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
  const { products } = await listProducts({ limit: 40 });
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
  return products.slice(0, limit);
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
