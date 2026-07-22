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
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/katalog`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/iletisim`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/arama`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/giris`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/kayit`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // Yasal sayfalar
  const legalEntries: MetadataRoute.Sitemap = LEGAL_PAGES.map((p) => ({
    url: `${SITE_URL}/yasal/${p.slug}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.4,
  }));

  // Ürünler — Medusa'dan tüm yayındaki ürünleri çek
  let productEntries: MetadataRoute.Sitemap = [];
  try {
    const { products } = await listProducts({ limit: 200 });
    productEntries = products.map((p) => ({
      url: `${SITE_URL}/products/${p.handle || p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    }));
  } catch {
    /* sessiz geç — sitemap her zaman üretilebilsin */
  }

  // Blog yazıları
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await listBlogPosts(100);
    blogEntries = posts.map((b) => ({
      url: `${SITE_URL}/blog/${b.slug}`,
      lastModified: b.published_at ? new Date(b.published_at) : now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));
  } catch {
    /* yok say */
  }

  return [...staticEntries, ...productEntries, ...blogEntries, ...legalEntries];
}
