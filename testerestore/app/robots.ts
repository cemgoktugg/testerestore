import type { MetadataRoute } from "next";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"
).replace(/\/$/, "");

// Tüm tarayıcılar (Googlebot, GPTBot, ClaudeBot, PerplexityBot…) aynı kuralları
// alır. Ayrı bir bot grubu tanımlamak `*` grubunu O BOT için tamamen ezer —
// eskiden GPTBot grubu yüzünden GPTBot /cart, /api gibi yolları tarayabiliyordu.
// `/_next/` ASLA engellenmemeli: Google JS/CSS'i ve /_next/image üzerinden
// servis edilen ürün görsellerini oradan çeker; engellenirse sayfayı render
// edemez ve görseller Google Görseller'e giremez.
const PRIVATE_PATHS = [
  "/checkout",
  "/cart",
  "/hesabim/",
  "/giris",
  "/kayit",
  "/sifremi-unuttum",
  "/sifre-sifirla",
  "/api/",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/"], disallow: PRIVATE_PATHS }],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
