import type { Metadata } from 'next';
import { getProductBySlugCached } from '../../../lib/medusa/server/product-cache';
import { buildProductJsonLd, buildProductMetadata } from '../../../lib/medusa/seo';
import { listProductReviews } from '../../../lib/medusa/services/reviews';
import { safeJsonLd } from '../../components/StructuredData';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductBySlugCached(id);
  // Ürün yoksa sayfa notFound() verir; başlıkta uydurma/demo ürün adı olmasın.
  return buildProductMetadata(product, 'Ürün bulunamadı', 'Aradığınız ürün bulunamadı.');
}

export default async function ProductLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const product = await getProductBySlugCached(id);
  const reviewData = product ? await listProductReviews(product.id) : undefined;
  const jsonLd = product ? buildProductJsonLd(product, reviewData) : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // Yorumlar kullanıcı içeriği taşır — safeJsonLd "<" karakterini kaçırır.
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
