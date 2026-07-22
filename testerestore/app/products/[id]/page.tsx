import { notFound } from 'next/navigation';
import { listProducts } from '../../../lib/medusa/services/products';
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

// generateStaticParams DIŞINDAKİ her handle → gerçek 404 (soft-404 yerine).
// Bunun için generateStaticParams TÜM ürünleri döndürmek ZORUNDA; aksi hâlde
// listeye girmeyen gerçek bir ürün de 404 olur. Yeni ürün eklenince yeniden
// build/deploy gerekir (küçük katalog için kabul edilebilir tercih).
export const dynamicParams = false;

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
  return <ProductDetailClient initialProduct={product} slug={id} />;
}
