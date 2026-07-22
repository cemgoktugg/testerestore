"use client";

import { useAsync } from "./useAsync";
import {
  getBladePriceOptions,
  type BladePriceOptions,
} from "../services/blade-price";

export type { BladePriceOptions };

/**
 * Subscribes to the blade-price option tree. Pass `bladeType` to scope
 * the response to a single family (recommended for product pages).
 */
export function useBladePriceOptions(bladeType?: string) {
  return useAsync(() => getBladePriceOptions(bladeType), [bladeType ?? ""]);
}
