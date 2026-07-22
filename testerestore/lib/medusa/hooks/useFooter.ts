"use client";

import { useAsync } from "./useAsync";
import { getFooter, type FooterPayload } from "../services/footer";

export type { FooterPayload };

export function useFooter() {
  return useAsync(() => getFooter(), []);
}
