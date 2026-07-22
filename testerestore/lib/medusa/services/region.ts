import { medusa } from "../client";
import { DEFAULT_REGION, MEDUSA_READY } from "../config";
import type { StoreRegion } from "../types";

let _regionCache: StoreRegion | null = null;
let _allRegionsCache: StoreRegion[] | null = null;

/**
 * List all regions exposed by the Medusa store.
 * Cached in-memory for the lifetime of the JS module.
 */
export async function listRegions(): Promise<StoreRegion[]> {
  if (!MEDUSA_READY) return [];
  if (_allRegionsCache) return _allRegionsCache;
  try {
    const { regions } = await medusa.store.region.list({ limit: 100 });
    _allRegionsCache = regions as StoreRegion[];
    return _allRegionsCache;
  } catch (e) {
    console.error("[medusa] listRegions failed", e);
    return [];
  }
}

/**
 * Pick the region that should be used for pricing.
 *
 * Resolution order:
 *  1. Region matching NEXT_PUBLIC_DEFAULT_REGION (by country code)
 *  2. First region returned
 */
export async function getCurrentRegion(): Promise<StoreRegion | null> {
  if (!MEDUSA_READY) return null;
  if (_regionCache) return _regionCache;

  const regions = await listRegions();
  if (!regions.length) return null;

  const wanted = DEFAULT_REGION.toLowerCase();
  const match = regions.find((r) =>
    r.countries?.some((c) => c.iso_2?.toLowerCase() === wanted)
  );
  _regionCache = (match || regions[0]) as StoreRegion;
  return _regionCache;
}
