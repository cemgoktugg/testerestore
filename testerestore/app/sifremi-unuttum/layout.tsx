import type { Metadata } from "next";
import { noIndexMetadata } from "../../lib/seo";

export const metadata: Metadata = noIndexMetadata("Şifremi Unuttum");

export default function ResetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
