import type { MetadataRoute } from "next";
import { listProductsForSitemap } from "../lib/medusa/services/products";
import { listBlogPosts } from "../lib/medusa/services/blog";
import { LEGAL_PAGES } from "../lib/legal-content";
import { CATEGORY_PAGES } from "../lib/category-pages";
import { GUIDES } from "../lib/guides";

const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001"
).replace(/\/$/, "");

/**
 * /sitemap.xml — HER İSTEKTE üretilir. Önceden build'de üretilip ISR ile
 * cache'leniyordu; deploy sırasında backend kapalı olduğundan (Stop → Deploy)
 * sitemap ürünsüz üretiliyor ve ~5 dk öyle servis ediliyordu. Tek bir hafif
 * Medusa sorgusu olduğu için dinamik üretim ucuz.
 */
export const dynamic = "force-dynamic";

const abs = (u: string) => (/^https?:\/\//.test(u) ? u : `${SITE_URL}${u.startsWith("/") ? "" : "/"}${u}`);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  let productEntries: MetadataRoute.Sitemap = [];
  let latest: Date | undefined;
  try {
    const products = await listProductsForSitemap();
    productEntries = products.map((p) => {
      const updated = p.updated_at ? new Date(p.updated_at) : undefined;
      if (updated && (!latest || updated > latest)) latest = updated;
      // Ürün görselleri → Google Görseller keşfi (image sitemap)
      const images = Array.from(
        new Set([p.thumbnail, ...(p.images || []).map((i) => i.url)].filter(Boolean) as string[])
      ).map(abs);
      return {
        url: `${SITE_URL}/products/${p.handle}`,
        lastModified: updated,
        changeFrequency: "weekly" as const,
        priority: 0.9,
        ...(images.length && { images }),
      };
    });
  } catch {
    /* backend'e ulaşılamazsa statik sayfalarla devam */
  }

  const guidesUpdated = GUIDES.map((g) => new Date(g.dateModified)).sort((a, b) => +b - +a)[0];

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: latest, changeFrequency: "daily", priority: 1.0 },
    { url: `${SITE_URL}/hazir-urunler`, lastModified: latest, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/rehber`, lastModified: guidesUpdated, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/sss`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/hakkimizda`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/iletisim`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/katalog`, changeFrequency: "monthly", priority: 0.5 },
  ];

  const categoryEntries: MetadataRoute.Sitemap = CATEGORY_PAGES.map((c) => ({
    url: `${SITE_URL}/kategori/${c.slug}`,
    lastModified: latest,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }));

  const guideEntries: MetadataRoute.Sitemap = GUIDES.map((g) => ({
    url: `${SITE_URL}/rehber/${g.slug}`,
    lastModified: new Date(g.dateModified),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Blog: yalnızca yayınlanmış yazı varsa (boş /blog noindex).
  let blogEntries: MetadataRoute.Sitemap = [];
  try {
    const posts = await listBlogPosts(100);
    if (posts.length) {
      blogEntries = [
        { url: `${SITE_URL}/blog`, changeFrequency: "weekly" as const, priority: 0.6 },
        ...posts.map((b) => ({
          url: `${SITE_URL}/blog/${b.slug}`,
          lastModified: b.published_at ? new Date(b.published_at) : undefined,
          changeFrequency: "monthly" as const,
          priority: 0.6,
        })),
      ];
    }
  } catch {
    /* yok say */
  }

  const legalEntries: MetadataRoute.Sitemap = LEGAL_PAGES.map((p) => ({
    url: `${SITE_URL}/yasal/${p.slug}`,
    changeFrequency: "yearly" as const,
    priority: 0.3,
  }));

  return [...staticEntries, ...categoryEntries, ...productEntries, ...guideEntries, ...blogEntries, ...legalEntries];
}
