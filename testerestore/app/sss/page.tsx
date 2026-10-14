import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { JsonLd } from '../components/StructuredData';
import { pageMetadata } from '../../lib/seo';
import { CATEGORY_PAGES, categoryHref } from '../../lib/category-pages';

export const metadata: Metadata = pageMetadata({
  title: 'Sık Sorulan Sorular',
  description:
    'Şerit testere ölçüsü nasıl alınır, hangi diş adımı (TPI) seçilir, özel boy ve hazır boy farkı, ödeme, kargo ve cayma hakkı hakkında sık sorulan sorular.',
  path: '/sss',
});

/**
 * Cevaplar yalnızca sitenin gerçekten sunduğu hizmetlere dayanır. Kesin teslim
 * süresi, garanti süresi gibi doğrulanmamış vaatler BİLEREK yazılmadı; iade ve
 * cayma metni yasal sayfayla (lib/legal-content.ts) tutarlı tutulmalı.
 */
const SECTIONS: { title: string; items: { q: string; a: string }[] }[] = [
  {
    title: 'Ölçü ve ürün seçimi',
    items: [
      {
        q: 'Özel ölçü şerit testere nasıl sipariş edilir?',
        a: 'Ürün sayfasında bıçak genişliğini, kalınlığını, diş adımını (TPI) ve şerit boyunu milimetre olarak seçersiniz. Fiyat seçiminize göre anında hesaplanır; sepete ekleyip ödemeyi tamamlarsınız. Bıçak girdiğiniz boyda kaynaklanarak hazırlanır.',
      },
      {
        q: 'Şerit testere boyunu nasıl ölçerim?',
        a: 'En doğru değer, makinenizin etiketinde veya kullanım kılavuzunda yazan bıçak boyudur. Elinizde eski bir bıçak varsa üzerine bir işaret koyup düz bir zeminde bir tam tur yuvarlayarak ölçebilirsiniz.',
      },
      {
        q: 'Hangi diş adımını (TPI) seçmeliyim?',
        a: 'Temel kural, kesit içinde aynı anda en az üç dişin çalışmasıdır. İnce cidarlı boru ve profillerde sık diş (yüksek TPI), büyük kesitli dolu malzemede seyrek diş (düşük TPI) seçilir. Ürün sayfasındaki diş profili ve TPI danışmanı, malzemenize göre öneri verir.',
      },
      {
        q: 'Hazır boy ile özel boy arasındaki fark nedir?',
        a: 'Hazır boy bıçaklar standart ölçülerde önceden kaynaklanmış ve stokta bekleyen ürünlerdir; ölçünüz tutuyorsa doğrudan sipariş edebilirsiniz. Özel boy bıçaklar ise siparişinizdeki ölçüye göre kesilip kaynaklanır.',
      },
      {
        q: 'Hangi bıçak hangi malzemeyi keser?',
        a: 'Genel metal, profil ve boru kesiminde bi-metal (M42, M51); sertleştirilmiş çelik ve zor alaşımlarda karbür uçlu; ahşapta karbon çeliği ahşap bıçakları; gıda sektöründe et-kemik bıçakları; sünger ve tekstilde dişsiz veya dalgalı ağızlı bıçaklar kullanılır. Kategori sayfalarında her türün seçim ipuçlarını bulabilirsiniz.',
      },
    ],
  },
  {
    title: 'Ödeme ve teslimat',
    items: [
      {
        q: 'Hangi ödeme yöntemlerini kullanabilirim?',
        a: 'Kredi kartı ve banka kartıyla iyzico güvenli ödeme altyapısı üzerinden ödeme yapabilirsiniz. Ödemeler 3D Secure ile doğrulanır; kart bilgileriniz sitemize iletilmez ve saklanmaz.',
      },
      {
        q: 'Kargo ücreti ne kadar?',
        a: 'Ürün toplamı KDV dahil 2.000 TL ve üzeri siparişlerde standart kargo ücretsizdir. Bu tutarın altındaki siparişlerde kargo ücreti 79,90 TL + KDV’dir. Kargo ücreti, siparişi onaylamadan önce sepet ve ödeme adımında gösterilir.',
      },
      {
        q: 'Siparişimi nasıl takip ederim?',
        a: 'Üye girişi yaparak verdiğiniz siparişlerin durumunu ve kargo bilgisini Hesabım sayfasındaki siparişlerim bölümünden takip edebilirsiniz.',
      },
    ],
  },
  {
    title: 'İade ve cayma hakkı',
    items: [
      {
        q: 'Ürünü iade edebilir miyim?',
        a: 'Hazır boy ürünlerde, teslim tarihinden itibaren 14 gün içinde cayma hakkınızı kullanabilirsiniz. Sizin belirlediğiniz ölçüye göre üretilen (kişiye özel) bıçaklar, Mesafeli Sözleşmeler Yönetmeliği uyarınca cayma hakkı kapsamı dışındadır. Ayrıntılar İade ve Cayma Politikası sayfasındadır.',
      },
      {
        q: 'Ürün kusurlu veya hasarlı gelirse ne yapmalıyım?',
        a: 'Ayıplı veya kargoda hasar görmüş ürünlerde yasal haklarınız saklıdır. Ürünün ve ambalajın fotoğraflarıyla birlikte iletişim sayfasından bize ulaşın; değişim, onarım veya iade süreci yasal haklarınız çerçevesinde yürütülür.',
      },
    ],
  },
];

export default function SssPage() {
  const all = SECTIONS.flatMap((s) => s.items);
  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-10 md:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl md:text-[2.5rem] font-bold tracking-tight text-foreground">
            Sık Sorulan Sorular
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Şerit testere seçimi, sipariş, ödeme, teslimat ve iade hakkında en çok sorulanlar.
            Cevabını bulamadığınız sorular için{' '}
            <Link href="/iletisim" className="font-semibold text-accent hover:underline">
              bize yazın
            </Link>
            .
          </p>

          {SECTIONS.map((section) => (
            <section key={section.title} className="mt-10">
              <h2 className="text-lg font-bold text-foreground mb-4">{section.title}</h2>
              <div className="space-y-3">
                {section.items.map((f) => (
                  <details key={f.q} className="group rounded-xl border border-border bg-background p-4 open:bg-muted/30">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
                      <h3 className="text-sm font-semibold text-foreground">{f.q}</h3>
                      <ChevronDown className="h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                    </summary>
                    <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            </section>
          ))}

          <section className="mt-12 rounded-2xl border border-border bg-metallic-card p-6">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Kategoriler ve politikalar
            </h2>
            <ul className="flex flex-wrap gap-2">
              {CATEGORY_PAGES.filter((c) => !['m42-serit-testere', 'm51-serit-testere'].includes(c.slug)).map((c) => (
                <li key={c.slug}>
                  <Link href={categoryHref(c)} className="inline-flex rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:text-accent hover:border-accent/50">
                    {c.h1}
                  </Link>
                </li>
              ))}
              <li>
                <Link href="/yasal/iade-ve-cayma" className="inline-flex rounded-full border border-border px-3 py-1.5 text-xs font-semibold hover:text-accent hover:border-accent/50">
                  İade ve Cayma Politikası
                </Link>
              </li>
            </ul>
          </section>
        </div>
      </main>
      <Footer />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: all.map((f) => ({
            '@type': 'Question',
            name: f.q,
            acceptedAnswer: { '@type': 'Answer', text: f.a },
          })),
        }}
      />
    </>
  );
}
