import type { Metadata } from "next";
import { noIndexMetadata } from "../../lib/seo";

export const metadata: Metadata = noIndexMetadata("Hesabım");

export default function HesabimLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
