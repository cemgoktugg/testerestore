import type { Metadata } from 'next';
import { getProductBySlugCached } from '../../../lib/medusa/server/product-cache';
import { buildProductJsonLd, buildProductMetadata } from '../../../lib/medusa/seo';
import { PRODUCT_DETAILS_FALLBACK } from '../../../lib/product-details-fallback';
import { siteContent } from '../../../lib/content-config';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;
  const fb = PRODUCT_DETAILS_FALLBACK[id];
  const fallbackTitle = fb
    ? `${fb.name} — ${siteContent.seo.siteName}`
    : siteContent.seo.defaultTitle;
  const fallbackDescription =
    fb?.description || siteContent.seo.defaultDescription;

  const product = await getProductBySlugCached(id);
  return buildProductMetadata(product, fallbackTitle, fallbackDescription);
}

export default async function ProductLayout({ children, params }: LayoutProps) {
  const { id } = await params;
  const product = await getProductBySlugCached(id);
  const jsonLd = product ? buildProductJsonLd(product) : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          // Safe: schema serialization, escaped braces only
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  );
}
