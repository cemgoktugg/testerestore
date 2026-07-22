"use client";

import { useAsync } from "./useAsync";
import {
  listProducts,
  getProductBySlug,
  listBestSellers,
  listRelatedProducts,
} from "../services/products";
import type { StoreProduct } from "../types";

interface ListOpts {
  limit?: number;
  category_id?: string | string[];
  collection_id?: string | string[];
  q?: string;
}

export function useProducts(opts: ListOpts = {}) {
  const key = JSON.stringify(opts);
  return useAsync(() => listProducts(opts), [key], {
    cacheKey: `products:${key}`,
  });
}

export function useProduct(slug: string | undefined) {
  return useAsync(
    () => (slug ? getProductBySlug(slug) : Promise.resolve(null)),
    [slug],
    slug ? { cacheKey: `product:${slug}` } : {}
  );
}

export function useBestSellers(limit = 8) {
  return useAsync(() => listBestSellers(limit), [limit], {
    cacheKey: `bestsellers:${limit}`,
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
