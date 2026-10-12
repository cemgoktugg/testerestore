import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, ChevronDown } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { JsonLd } from '../../components/StructuredData';
import { pageMetadata, canonicalUrl } from '../../../lib/seo';
import { GUIDES, getGuide, type GuideBlock } from '../../../lib/guides';
import { siteContent } from '../../../lib/content-config';

/**
 * Teknik rehber sayfası — tamamen sunucuda render edilir (SSG). İçerik
 * lib/guides.ts'de; Article + FAQPage + BreadcrumbList JSON-LD üretir.
 */
export const dynamicParams = false;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return { title: 'Rehber bulunamadı', robots: { index: false } };
  const base = pageMetadata({ title: g.title, description: g.description, path: `/rehber/${g.slug}` });
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: 'article',
      publishedTime: g.datePublished,
      modifiedTime: g.dateModified,
    },
  };
}

function Block({ b }: { b: GuideBlock }) {
  switch (b.type) {
    case 'p':
      return <p className="text-[15px] leading-relaxed text-muted-foreground">{b.text}</p>;
    case 'h2':
      return <h2 className="pt-4 text-xl font-bold tracking-tight text-foreground">{b.text}</h2>;
    case 'ul':
      return (
        <ul className="list-disc space-y-2 pl-6 text-[15px] leading-relaxed text-muted-foreground">
          {b.items.map((i, k) => (
            <li key={k}>{i}</li>
          ))}
        </ul>
      );
    case 'ol':
      return (
        <ol className="list-decimal space-y-2 pl-6 text-[15px] leading-relaxed text-muted-foreground">
          {b.items.map((i, k) => (
            <li key={k}>{i}</li>
          ))}
        </ol>
      );
    case 'table':
      return (
        <figure className="space-y-2">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-muted/50">
                <tr>
                  {b.head.map((h) => (
                    <th key={h} scope="col" className="px-4 py-2.5 font-semibold text-foreground">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.rows.map((r, k) => (
                  <tr key={k} className="border-t border-border">
                    {r.map((c, j) => (
                      <td key={j} className={`px-4 py-2.5 align-top ${j === 0 ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {b.caption && <figcaption className="text-xs text-muted-foreground">{b.caption}</figcaption>}
        </figure>
      );
    case 'formula':
      return (
        <figure className="rounded-xl border border-border bg-muted/30 px-5 py-4">
          <p className="font-mono text-lg font-semibold text-foreground">{b.text}</p>
          {b.note && <figcaption className="mt-1.5 text-xs text-muted-foreground">{b.note}</figcaption>}
        </figure>
      );
    case 'note':
      return (
        <p className="rounded-xl border border-accent/30 bg-accent/5 px-4 py-3 text-sm leading-relaxed text-foreground">
          {b.text}
        </p>
      );
  }
}

export default async function GuidePage({ params }: PageProps) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();
  const url = canonicalUrl(`/rehber/${g.slug}`);
  const others = GUIDES.filter((x) => x.slug !== g.slug);
  const updated = new Date(g.dateModified).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-8 md:py-14">
        <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="mb-6 text-xs text-muted-foreground">
            <ol className="flex flex-wrap items-center gap-1.5">
              <li><Link href="/" className="font-semibold hover:text-primary">Ana Sayfa</Link></li>
              <li aria-hidden="true">/</li>
              <li><Link href="/rehber" className="font-semibold hover:text-primary">Rehber</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page" className="line-clamp-1 text-foreground/80">{g.h1}</li>
            </ol>
          </nav>

          <header className="space-y-3">
            <h1 className="text-3xl md:text-[2.4rem] font-bold leading-tight tracking-tight text-foreground">{g.h1}</h1>
            <p className="text-xs text-muted-foreground">
              {siteContent.seo.siteName} teknik rehberi · Güncelleme: <time dateTime={g.dateModified}>{updated}</time>
            </p>
          </header>

          <div className="mt-8 space-y-5">
            {g.blocks.map((b, i) => (
              <Block key={i} b={b} />
            ))}
          </div>

          {g.faqs.length > 0 && (
            <section aria-labelledby="sss" className="mt-12">
              <h2 id="sss" className="text-xl font-bold text-foreground mb-4">Sık Sorulan Sorular</h2>
              <div className="space-y-3">
                {g.faqs.map((f) => (
                  <details key={f.q} className="group rounded-xl border border-border bg-background p-4 open:bg-muted/30">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-foreground">{f.q}</h3>
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          )}

          <section aria-labelledby="ilgili" className="mt-12 rounded-2xl border border-border bg-metallic-card p-6">
            <h2 id="ilgili" className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">İlgili sayfalar</h2>
            <ul className="space-y-2">
              {g.related.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-accent">
                    <ArrowRight className="h-3.5 w-3.5 text-accent" /> {r.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <nav aria-label="Diğer rehberler" className="mt-10 border-t border-border pt-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">Diğer rehberler</h2>
            <ul className="grid gap-2 sm:grid-cols-2">
              {others.map((o) => (
                <li key={o.slug}>
                  <Link href={`/rehber/${o.slug}`} className="block rounded-xl border border-border p-3 text-sm font-semibold hover:border-accent/50 hover:text-accent">
                    {o.h1}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </article>
      </main>
      <Footer />

      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@graph': [
            {
              '@type': 'Article',
              '@id': `${url}#article`,
              headline: g.h1,
              description: g.description,
              url,
              mainEntityOfPage: url,
              inLanguage: 'tr-TR',
              datePublished: g.datePublished,
              dateModified: g.dateModified,
              author: { '@id': `${canonicalUrl('/')}#organization` },
              publisher: { '@id': `${canonicalUrl('/')}#organization` },
              image: canonicalUrl('/og.jpg'),
            },
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: 'Ana Sayfa', item: canonicalUrl('/') },
                { '@type': 'ListItem', position: 2, name: 'Rehber', item: canonicalUrl('/rehber') },
                { '@type': 'ListItem', position: 3, name: g.h1, item: url },
              ],
            },
            ...(g.faqs.length
              ? [
                  {
                    '@type': 'FAQPage',
                    mainEntity: g.faqs.map((f) => ({
                      '@type': 'Question',
                      name: f.q,
                      acceptedAnswer: { '@type': 'Answer', text: f.a },
                    })),
                  },
                ]
              : []),
          ],
        }}
      />
    </>
  );
}
