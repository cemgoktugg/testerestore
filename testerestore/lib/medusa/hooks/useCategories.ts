"use client";

import { useAsync } from "./useAsync";
import { listCategories, listCollections, getCategoryByHandle } from "../services/categories";

export function useCategories() {
  return useAsync(() => listCategories(), []);
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
