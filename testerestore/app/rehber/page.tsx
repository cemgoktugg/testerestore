import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { JsonLd } from '../components/StructuredData';
import { pageMetadata, canonicalUrl } from '../../lib/seo';
import { GUIDES } from '../../lib/guides';

export const metadata: Metadata = pageMetadata({
  title: 'Şerit Testere Rehberi',
  description:
    'Şerit testere seçimi ve kullanımı üzerine teknik rehberler: TPI (diş adımı) seçimi, M42–M51–karbür karşılaştırması, bıçak boyu ölçme, kırılma nedenleri, rodaj ve bakım.',
  path: '/rehber',
});

export default function GuidesIndexPage() {
  const url = canonicalUrl('/rehber');
  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-10 md:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight text-foreground">Şerit Testere Rehberi</h1>
          <p className="mt-3 max-w-2xl text-sm md:text-[15px] leading-relaxed text-muted-foreground">
            Doğru bıçağı seçmek, ölçüyü doğru almak ve bıçak ömrünü uzatmak için hazırladığımız teknik rehberler.
          </p>
          <ul className="mt-10 grid gap-5 md:grid-cols-2">
            {GUIDES.map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/rehber/${g.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-metallic-card p-6 transition-colors hover:border-accent/50"
                >
                  <BookOpen className="h-5 w-5 text-accent" />
                  <h2 className="mt-3 text-lg font-bold leading-snug text-foreground group-hover:text-accent">{g.h1}</h2>
                  <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{g.summary}</p>
                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                    Rehberi oku <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </main>
      <Footer />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': `${url}#page`,
          url,
          name: 'Şerit Testere Rehberi',
          inLanguage: 'tr-TR',
          mainEntity: {
            '@type': 'ItemList',
            itemListElement: GUIDES.map((g, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: canonicalUrl(`/rehber/${g.slug}`),
              name: g.h1,
            })),
          },
        }}
      />
    </>
  );
}
