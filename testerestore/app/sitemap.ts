import type { MetadataRoute } from "next";
import { listProducts } from "../lib/medusa/services/products";
import { listBlogPosts } from "../lib/medusa/services/blog";
import { LEGAL_PAGES } from "../lib/legal-content";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"
).replace(/\/$/, "");

/**
 * Next.js otomatik /sitemap.xml endpoint'i — bu fonksiyondan döner.
 * Statik sayfalar + Medusa ürünleri + blog yazıları + yasal sayfalar
 * dahil edilir.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Ürünler — Medusa'dan tüm yayındaki ürünleri çek. Ana sayfa / hazır ürünler
  // lastmod'u en son güncellenen ürünün tarihini alır (build zamanı değil).
  let productEntries: MetadataRoute.Sitemap = [];
  let latestProductUpdate: Date | undefined;
  try {
    const { products } = await listProducts({ limit: 200 });
    productEntries = products.map((p) => {
      const updated = p.updated_at ? new Date(p.updated_at) : undefined;
      if (updated && (!latestProductUpdate || updated > latestProductUpdate)) {
        latestProductUpdate = updated;
      }
      return {
        url: `${SITE_URL}/products/${p.handle || p.id}`,
        lastModified: updated,
        changeFrequency: "weekly" as const,
        priority: 0.9,
      };
    });
  } catch {
    /* sessiz geç — sitemap her zaman üretilebilsin */
  }

  // /arama (boş arama sayfası), /giris, /kayit bilerek YOK: robots'ta engelli /
  // noindex sayfaları sitemap'e koymak Search Console'da hata üretir.
  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: latestProductUpdate, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/hazir-urunler`, lastModified: latestProductUpdate, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/katalog`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/iletisim`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/blog`, changeFrequency: "weekly", priority: 0.7 },
  ];

  // Yasal sayfalar
  const legalEntries: MetadataRoute.Sitemap = LEGAL_PAGES.map((p) => ({
    url: `${SITE_URL}/yasal/${p.slug}`,
    changeFrequency: "yearly",
    priority: 0.3,
  }));

  // Blog yazıları
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await listBlogPosts(100);
    blogEntries = posts.map((b) => ({
      url: `${SITE_URL}/blog/${b.slug}`,
      lastModified: b.published_at ? new Date(b.published_at) : undefined,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    /* yok say */
  }

  return [...staticEntries, ...productEntries, ...blogEntries, ...legalEntries];
}
