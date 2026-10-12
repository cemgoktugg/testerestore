import { notFound } from 'next/navigation';
import { listProducts, listRelatedProducts } from '../../../lib/medusa/services/products';
import { getProductBySlugCached } from '../../../lib/medusa/server/product-cache';
import ProductDetailClient from './ProductDetailClient';

/**
 * Product detail — Server Component.
 *
 * Ürün SUNUCUDA çekilir (SSR/ISR) ve interaktif client bileşenine prop olarak
 * geçirilir. Eski hâlde sayfa 'use client' idi ve ürünü tarayıcıda fetch
 * ediyordu → iskelet + geç LCP + zayıf ürün SEO'su. Artık:
 *   - ilk render'da HTML dolu gelir (crawler + LCP kazancı)
 *   - en çok kullanılan ürünler build'de statik üretilir (generateStaticParams)
 *   - diğerleri talep üzerine üretilip ISR ile cache'lenir (revalidate)
 */
export const revalidate = 300; // 5 dk ISR

// dynamicParams=true: generateStaticParams'ta olmayan (SONRADAN eklenen) ürünler
// TALEP ÜZERİNE render edilir → yeni ürün deploy beklemeden görünür. Geçersiz
// handle aşağıda `notFound()` ile GERÇEK 404 döner (soft-404 yok, SEO korunur).
export const dynamicParams = true;

export async function generateStaticParams() {
  const ids: { id: string }[] = [];
  const pageSize = 100;
  for (let offset = 0; ; offset += pageSize) {
    const { products, count } = await listProducts({ limit: pageSize, offset });
    for (const p of products) ids.push({ id: p.handle || p.id });
    if (products.length === 0 || offset + pageSize >= count) break;
  }
  return ids;
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const product = await getProductBySlugCached(id);
  // Geçersiz handle/id → gerçek 404 (HTTP 404). Client fetch yok, null = ürün yok.
  // Aksi hâlde "soft 404" (200) olur ve Google indeksleme/SEO'yu cezalandırır.
  if (!product) notFound();
  // İlgili ürünler sunucuda: linkler SSR HTML'inde olur (iç linkleme).
  const related = await listRelatedProducts(product, 3).catch(() => []);
  return <ProductDetailClient initialProduct={product} initialRelated={related} slug={id} />;
}
