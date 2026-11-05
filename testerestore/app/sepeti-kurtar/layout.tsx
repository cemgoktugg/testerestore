import { noIndexMetadata } from "../../lib/seo";
export const metadata = { ...noIndexMetadata("Sepetinize Devam Edin"), referrer: "no-referrer" as const };
export default function Layout({ children }: { children: React.ReactNode }) { return children; }
