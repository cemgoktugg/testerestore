import type { Metadata } from "next";
import { noIndexMetadata } from "../../lib/seo";

export const metadata: Metadata = noIndexMetadata("Şifre Sıfırla");

export default function ResetLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
