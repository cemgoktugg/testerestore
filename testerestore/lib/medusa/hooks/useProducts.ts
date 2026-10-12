"use client";

import { useAsync } from "./useAsync";
import {
  listProducts,
  getProductBySlug,
  listBestSellers,
  listReadyMade,
  listRelatedProducts,
} from "../services/products";
import type { StoreProduct } from "../types";

interface ListOpts {
  limit?: number;
  category_id?: string | string[];
  collection_id?: string | string[];
  q?: string;
}

/** `enabled: false` → SSR'dan veri geldiyse tarayıcıda yeniden çekme. */
interface FetchOpts {
  enabled?: boolean;
}

export function useProducts(opts: ListOpts = {}, fetchOpts: FetchOpts = {}) {
  const key = JSON.stringify(opts);
  return useAsync(() => listProducts(opts), [key], {
    cacheKey: `products:${key}`,
    enabled: fetchOpts.enabled,
  });
}

export function useProduct(slug: string | undefined) {
  return useAsync(
    () => (slug ? getProductBySlug(slug) : Promise.resolve(null)),
    [slug],
    slug ? { cacheKey: `product:${slug}` } : {}
  );
}

export function useBestSellers(limit = 8, fetchOpts: FetchOpts = {}) {
  return useAsync(() => listBestSellers(limit), [limit], {
    cacheKey: `bestsellers:${limit}`,
    enabled: fetchOpts.enabled,
  });
}

export function useReadyMade(limit = 24, fetchOpts: FetchOpts = {}) {
  return useAsync(() => listReadyMade(limit), [limit], {
    cacheKey: `readymade:${limit}`,
    enabled: fetchOpts.enabled,
  });
}

export function useRelatedProducts(product: StoreProduct | null, limit = 4) {
  return useAsync(
    () =>
      product
        ? listRelatedProducts(product, limit)
        : Promise.resolve([] as StoreProduct[]),
    [product?.id, limit],
    product ? { cacheKey: `related:${product.id}:${limit}` } : {}
  );
}
