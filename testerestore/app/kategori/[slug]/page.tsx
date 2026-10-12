import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { ArrowRight, CheckCircle2, ChevronDown, Truck } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { JsonLd } from '../../components/StructuredData';
import { listProducts } from '../../../lib/medusa/services/products';
import { listCategories } from '../../../lib/medusa/services/categories';
import { getProductImage } from '../../../lib/medusa/format';
import { isReadyMade, mapReadyMadeCard, formatTL } from '../../../lib/ready-made';
import { pageMetadata, canonicalUrl } from '../../../lib/seo';
import {
  CATEGORY_PAGES,
  getCategoryPage,
  categoryHref,
} from '../../../lib/category-pages';
import type { StoreProduct } from '../../../lib/medusa/types';

/**
 * Kategori landing sayfası — tamamen sunucuda render edilir (SSR/ISR): H1,
 * açıklama, ürün listesi, seçim ipuçları ve SSS HTML'de gelir; Google ve JS
 * çalıştırmayan AI botları içeriği okuyabilir. İçerik: lib/category-pages.ts
 */
export const revalidate = 300;
// Yalnızca tanımlı kategori slug'ları → diğerleri gerçek 404.
export const dynamicParams = false;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return CATEGORY_PAGES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getCategoryPage(slug);
  if (!page) return { title: 'Kategori bulunamadı', robots: { index: false } };
  return pageMetadata({ title: page.title, description: page.description, path: categoryHref(page) });
}

async function productsFor(handles: string[]): Promise<StoreProduct[]> {
  const categories = await listCategories();
  const ids = categories.filter((c) => c.handle && handles.includes(c.handle)).map((c) => c.id);
  if (!ids.length) return [];
  const { products } = await listProducts({ category_id: ids, limit: 100 });
  // Önce ölçüye göre yapılandırılan aileler, sonra hazır boylar (boya göre).
  return [...products].sort((a, b) => Number(isReadyMade(a)) - Number(isReadyMade(b)));
}

export default async function CategoryPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getCategoryPage(slug);
  if (!page) notFound();

  const products = await productsFor(page.handles);
  const url = canonicalUrl(categoryHref(page));
  const related = CATEGORY_PAGES.filter((c) => c.slug !== page.slug);

  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-8 md:py-14">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li>
                <Link href="/" className="font-semibold hover:text-primary transition-colors">
                  Ana Sayfa
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="text-foreground/80">
                {page.name}
              </li>
            </ol>
          </nav>

          <header className="max-w-3xl space-y-4">
            <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight text-foreground leading-tight">
              {page.h1}
            </h1>
            {page.intro.map((p, i) => (
              <p key={i} className="text-sm md:text-[15px] text-muted-foreground leading-relaxed">
                {p}
              </p>
            ))}
          </header>

          {/* Ürünler */}
          <section aria-labelledby="urunler" className="mt-10">
            <div className="flex items-end justify-between gap-4 mb-5">
              <h2 id="urunler" className="text-xl font-bold text-foreground">
                {page.name} Ürünleri
              </h2>
              <span className="text-xs text-muted-foreground">{products.length} ürün</span>
            </div>
            {products.length ? (
              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {products.map((p) => (
                  <li key={p.id}>
                    <CategoryProductCard product={p} />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                Bu kategoride şu an listelenen ürün yok. Özel ölçü talepleriniz için{' '}
                <Link href="/iletisim" className="font-semibold text-accent hover:underline">
                  bizimle iletişime geçin
                </Link>
                .
              </p>
            )}
          </section>

          <div className="mt-14 grid grid-cols-1 gap-10 lg:grid-cols-2">
            {/* Seçim ipuçları */}
            <section aria-labelledby="ipuclari" className="rounded-2xl border border-border bg-metallic-card p-6 md:p-8">
              <h2 id="ipuclari" className="text-lg font-bold text-foreground mb-4">
                {page.tipsTitle}
              </h2>
              <ul className="space-y-3">
                {page.tips.map((t, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-accent mt-0.5" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </section>

            {/* SSS — <details> ile, içerik hep HTML'de */}
            <section aria-labelledby="sss">
              <h2 id="sss" className="text-lg font-bold text-foreground mb-4">
                Sık Sorulan Sorular
              </h2>
              <div className="space-y-3">
                {page.faqs.map((f, i) => (
                  <details key={i} className="group rounded-xl border border-border bg-background p-4 open:bg-muted/30">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-foreground">
                      <h3 className="text-sm font-semibold">{f.q}</h3>
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>

          {/* Diğer kategoriler (iç linkleme) */}
          <nav aria-label="Diğer kategoriler" className="mt-14 border-t border-border pt-8">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
              Diğer kategoriler
            </h2>
            <ul className="flex flex-wrap gap-2">
              {related.map((c) => (
                <li key={c.slug}>
                  <Link
                    href={categoryHref(c)}
                    className="inline-flex items-center rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:border-accent/50 hover:text-accent transition-colors"
                  >
                    {c.h1}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/hazir-urunler"
                  className="inline-flex items-center rounded-full border border-border px-4 py-2 text-xs font-semibold text-foreground hover:border-accent/50 hover:text-accent transition-colors"
                >
                  Hazır Boy Ürünler
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </main>
      <Footer />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'CollectionPage',
              '@id': `${url}#page`,
              url,
              name: page.h1,
              description: page.description,
              mainEntity: {
                '@type': 'ItemList',
                numberOfItems: products.length,
                itemListElement: products.map((p, i) => ({
                  '@type': 'ListItem',
                  position: i + 1,
                  url: canonicalUrl(`/products/${p.handle || p.id}`),
                  name: p.title,
                })),
              },
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: canonicalUrl('/') },
                { '@type': 'ListItem', position: 2, name: page.name, item: url },
              ],
            },
            {
              '@type': 'FAQPage',
              mainEntity: page.faqs.map((f) => ({
                '@type': 'Question',
                name: f.q,
                acceptedAnswer: { '@type': 'Answer', text: f.a },
              })),
            },
          ],
        }}
      />
    </>
  );
}

function CategoryProductCard({ product }: { product: StoreProduct }) {
  const href = `/products/${product.handle || product.id}`;
  const ready = isReadyMade(product);
  const card = ready ? mapReadyMadeCard(product) : null;
  return (
    <Link
      href={href}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-premium-card shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition-all duration-300 hover:-translate-y-1 hover:border-accent/40"
    >
      <div className="relative aspect-square overflow-hidden bg-premium-image-bg">
        <Image
          src={getProductImage(product)}
          alt={product.title || ''}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />
        {ready && (
          <span className="absolute top-3 left-3 rounded-full bg-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
            Hazır Boy
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-[15px] font-semibold leading-snug text-white line-clamp-2 group-hover:text-accent transition-colors">
          {product.title}
        </h3>
        {card?.sizeLabel ? (
          <p className="mt-1.5 text-xs text-[#a8acb3]">{card.sizeLabel}</p>
        ) : (
          product.subtitle && (
            <p className="mt-1.5 text-xs text-[#a8acb3] line-clamp-2">{product.subtitle}</p>
          )
        )}
        <div className="mt-auto flex items-center justify-between pt-4">
          {card && card.price > 0 ? (
            <span className="text-sm font-bold text-white">{formatTL(card.price)}</span>
          ) : (
            <span className="text-xs font-semibold text-[#c7c9cc]">Ölçünüzü seçin</span>
          )}
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-accent">
            {ready ? <Truck className="h-3.5 w-3.5" /> : null}
            İncele <ArrowRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}
