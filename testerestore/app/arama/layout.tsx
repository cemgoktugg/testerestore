import type { Metadata } from "next";
import { noIndexMetadata } from "../../lib/seo";

// Arama sonuç sayfaları ince/kopya içerik üretir → indekslenmez (follow açık).
export const metadata: Metadata = noIndexMetadata("Arama");

export default function AramaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
