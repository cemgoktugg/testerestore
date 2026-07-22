"use client";

import { useAsync } from "./useAsync";
import { listHeroSlides, type StoreHeroSlide } from "../services/hero-slides";

export type { StoreHeroSlide };

export function useHeroSlides() {
  return useAsync<StoreHeroSlide[]>(() => listHeroSlides(), []);
}
