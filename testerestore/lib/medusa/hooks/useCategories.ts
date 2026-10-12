"use client";

import { useAsync } from "./useAsync";
import { listCategories, listCollections, getCategoryByHandle } from "../services/categories";

export function useCategories(fetchOpts: { enabled?: boolean } = {}) {
  return useAsync(() => listCategories(), [], { enabled: fetchOpts.enabled });
}

export function useCollections() {
  return useAsync(() => listCollections(), []);
}

export function useCategory(handle: string | undefined) {
  return useAsync(
    () => (handle ? getCategoryByHandle(handle) : Promise.resolve(null)),
    [handle]
  );
}
