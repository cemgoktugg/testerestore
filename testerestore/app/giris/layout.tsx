import type { Metadata } from "next";
import { noIndexMetadata } from "../../lib/seo";

export const metadata: Metadata = noIndexMetadata("Giriş Yap");

export default function GirisLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
