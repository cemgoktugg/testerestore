import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { JsonLd } from '../components/StructuredData';
import { pageMetadata, canonicalUrl } from '../../lib/seo';
import { CATEGORY_PAGES, categoryHref } from '../../lib/category-pages';
import { GUIDES } from '../../lib/guides';

export const metadata: Metadata = pageMetadata({
  title: 'Hakkımızda',
  description:
    'Testere Store; metal, ahşap, gıda ve tekstil sektörleri için şerit testere bıçaklarını müşterinin makinesine göre milimetrik ölçüde hazırlayan online mağaza.',
  path: '/hakkimizda',
});

/**
 * Hakkımızda — şirket künyesi (unvan, kuruluş yılı, adres vb.) BİLEREK yok;
 * gerçek bilgiler lib/company-info.ts'e girildiğinde buraya eklenecek.
 * Üretim adımları sitede (checkout, katalog) zaten anlatılan süreçle tutarlı.
 */
const STEPS = [
  'Siz bıçak türünü, genişliği, kalınlığı, diş adımını ve boyu sitemizden seçersiniz; fiyat anında hesaplanır.',
  'Bıçak, seçtiğiniz ölçüye göre şerit rulosundan kesilir.',
  'Uçlar alın kaynağıyla birleştirilir; kaynak bölgesi tavlanıp taşlanarak bıçak gövdesiyle aynı kesite getirilir.',
  'Kaynak ve ölçü kontrolünden geçen bıçak, kargoda zarar görmeyecek şekilde paketlenir.',
];

export default function AboutPage() {
  const url = canonicalUrl('/hakkimizda');
  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-10 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-10">
          <header className="space-y-4">
            <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight text-foreground">Hakkımızda</h1>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Testere Store, şerit testere bıçaklarında uzmanlaşmış bir online mağazadır. Metal, ahşap, gıda ve
              tekstil sektörlerinde kullanılan şerit testere bıçaklarını, müşterinin makinesine göre milimetrik
              ölçüde kaynaklı olarak hazırlıyoruz. Standart ölçüler için stoktan gönderilen hazır boy bıçaklar da
              sunuyoruz.
            </p>
          </header>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">Ne satıyoruz?</h2>
            <ul className="space-y-2">
              {CATEGORY_PAGES.filter((c) => !['m42-serit-testere', 'm51-serit-testere'].includes(c.slug)).map((c) => (
                <li key={c.slug} className="text-[15px] leading-relaxed text-muted-foreground">
                  <Link href={categoryHref(c)} className="font-semibold text-foreground hover:text-accent">
                    {c.h1}
                  </Link>{' '}
                  — {c.description}
                </li>
              ))}
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">Bıçağınız nasıl hazırlanır?</h2>
            <ol className="list-decimal space-y-2 pl-6 text-[15px] leading-relaxed text-muted-foreground">
              {STEPS.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ol>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-bold text-foreground">Doğru bıçağı seçmenize yardımcı oluyoruz</h2>
            <p className="text-[15px] leading-relaxed text-muted-foreground">
              Ürün sayfalarındaki diş profili ve TPI danışmanı, malzemenize ve kesitinize göre diş adımı önerir;
              sohbet danışmanımız makinenize uygun bıçak ölçüsünü bulmanıza yardım eder. Teknik rehberlerimizde
              seçim ve kullanım konusundaki temel bilgileri bulabilirsiniz:
            </p>
            <ul className="space-y-1.5">
              {GUIDES.map((g) => (
                <li key={g.slug}>
                  <Link href={`/rehber/${g.slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground hover:text-accent">
                    <ArrowRight className="h-3.5 w-3.5 text-accent" /> {g.h1}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border border-border bg-metallic-card p-6 space-y-2">
            <h2 className="text-lg font-bold text-foreground">Bize ulaşın</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Ölçü, malzeme veya sipariş konusunda sorularınız için{' '}
              <Link href="/iletisim" className="font-semibold text-accent hover:underline">iletişim sayfamızdan</Link>{' '}
              bize yazabilir, sık sorulan soruları{' '}
              <Link href="/sss" className="font-semibold text-accent hover:underline">SSS sayfasında</Link> inceleyebilirsiniz.
            </p>
          </section>
        </div>
      </main>
      <Footer />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'AboutPage',
          '@id': `${url}#page`,
          url,
          name: 'Hakkımızda — Testere Store',
          inLanguage: 'tr-TR',
          about: { '@id': `${canonicalUrl('/')}#organization` },
        }}
      />
    </>
  );
}
