import type { Metadata } from "next";
import { noIndexMetadata } from "../../lib/seo";

export const metadata: Metadata = noIndexMetadata("Hesap Oluştur");

export default function KayitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
