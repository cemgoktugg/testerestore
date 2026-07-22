import { medusa } from "../client";
import { MEDUSA_READY } from "../config";
import type { StoreCollection, StoreProductCategory } from "../types";

/**
 * Flat list of all visible categories (parents + children).
 * The frontend filters/renders nesting as needed.
 */
export async function listCategories(): Promise<StoreProductCategory[]> {
  if (!MEDUSA_READY) return [];
  try {
    const { product_categories } = await medusa.store.category.list({
      fields: "id,name,handle,parent_category_id,metadata,*category_children",
      limit: 100,
    });
    return product_categories as StoreProductCategory[];
  } catch (e) {
    console.error("[medusa] listCategories failed", e);
    return [];
  }
}

/** Resolve category by handle (used by /categories/[handle] routes). */
export async function getCategoryByHandle(
  handle: string
): Promise<StoreProductCategory | null> {
  if (!MEDUSA_READY || !handle) return null;
  try {
    const { product_categories } = await medusa.store.category.list({
      handle,
      fields: "id,name,handle,description,metadata,parent_category_id",
      limit: 1,
    });
    return ((product_categories?.[0] as StoreProductCategory) || null) ?? null;
  } catch (e) {
    console.error(`[medusa] getCategoryByHandle(${handle}) failed`, e);
    return null;
  }
}

export async function listCollections(): Promise<StoreCollection[]> {
  if (!MEDUSA_READY) return [];
  try {
    const { collections } = await medusa.store.collection.list({
      fields: "id,handle,title,metadata",
      limit: 100,
    });
    return collections as StoreCollection[];
  } catch (e) {
    console.error("[medusa] listCollections failed", e);
    return [];
  }
}
