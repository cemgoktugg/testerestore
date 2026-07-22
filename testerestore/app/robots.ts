import type { MetadataRoute } from "next";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"
).replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/"],
        disallow: [
          "/checkout",
          "/cart",
          "/hesabim/",
          "/giris",
          "/kayit",
          "/sifremi-unuttum",
          "/sifre-sifirla",
          "/api/",
          "/_next/",
        ],
      },
      // Marketing crawler'ları için ek izin (kupon takibi vs.)
      { userAgent: "GPTBot", disallow: ["/checkout", "/hesabim/"] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
