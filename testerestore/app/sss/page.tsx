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
    'Şerit testere boyu nasıl ölçülür, hangi TPI ve kalite (M42, M51, karbür) seçilir, rodaj, kaynak yerinden kopma, hazır boy ve özel boy farkı, kargo ve cayma hakkı.',
  path: '/sss',
});

/**
 * Cevaplar yalnızca sitenin gerçekten sunduğu hizmetlere dayanır. Kesin teslim
 * süresi, garanti süresi gibi doğrulanmamış vaatler BİLEREK yazılmadı; iade ve
 * cayma metni yasal sayfayla (lib/legal-content.ts) tutarlı tutulmalı.
 * Teknik cevaplar lib/guides.ts'deki rehberlerle tutarlı tutulmalı (TPI,
 * rodaj, gerginlik, soğutma aralıkları; kaynakların ayrıştığı yerler tarafsız).
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
        q: 'Eski bıçağım ve makine etiketim yok; bıçak boyunu nasıl hesaplarım?',
        a: 'İki eşit kasnaklı makinelerde boy L = 2 × C + π × D formülüyle hesaplanır (C: kasnak merkezleri arası mesafe, D: kasnak çapı, mm). Ölçümden önce gerdirme ayarını orta konuma getirin. Örneğin 1.200 mm merkez mesafesi ve 350 mm kasnakta boy yaklaşık 3.500 mm’dir. Farklı çaplı ve üç kasnaklı makineler için Şerit Testere Boyu rehberimize bakın. Ölçünüze göre kaynaklanan bıçaklar iade edilemediğinden sonucu mümkünse makine kılavuzuyla doğrulayın.',
      },
      {
        q: 'Bıçak genişliğini ve kalınlığını nasıl ölçerim?',
        a: 'Genişliği bıçağın sırtından diş ucuna kadar, kalınlığı ise kumpasla dişlerden ve kaynak yerinden uzakta, gövde üzerinden ölçün. Metal kesim makinelerinde 27 × 0,9, 34 × 1,1 ve 41 × 1,3 mm gibi standart genişlik–kalınlık çiftleri yaygındır; ölçtüğünüz değeri makine kılavuzuyla karşılaştırın.',
      },
      {
        q: 'Hazır boy ile özel boy arasındaki fark nedir?',
        a: 'Hazır boy bıçaklar standart ölçülerde önceden kaynaklanmış ve stokta bekleyen ürünlerdir; ölçünüz birebir tutuyorsa doğrudan sipariş edebilirsiniz ve teslimden itibaren 14 gün cayma hakkınız vardır. Özel boy bıçaklar ise siparişinizdeki ölçüye göre kesilip kaynaklanır; kişiye özel üretildikleri için cayma hakkı kapsamı dışındadır. Ölçünüz hazır boylardan biriyle tutmuyorsa ölçüye göre sipariş verin.',
      },
      {
        q: 'Hangi bıçak hangi malzemeyi keser?',
        a: 'Genel metal, profil ve boru kesiminde bi-metal (M42, M51); sertleştirilmiş çelik ve zor alaşımlarda karbür uçlu; ahşapta karbon çeliği ahşap bıçakları; gıda sektöründe et-kemik bıçakları; sünger ve tekstilde dişsiz veya dalgalı ağızlı bıçaklar kullanılır. Kategori sayfalarında her türün seçim ipuçlarını bulabilirsiniz.',
      },
      {
        q: 'M42 ile M51 arasındaki fark nedir, hangisini seçmeliyim?',
        a: 'İkisi de bi-metal bıçaktır; fark diş malzemesindedir. Bi-Metal M42; yapı çeliği, profil, boru ve genel atölye kesimleri için dengeli ve ekonomik bir seçimdir. Bi-Metal M51 daha yüksek sıcak sertlik ve aşınma direnci sunar; paslanmaz, alaşımlı ve takım çeliklerinde, büyük kesitlerde ve seri kesimde tercih edilir. Yaklaşık 45 HRC’nin üzerindeki sertleştirilmiş malzemelerde ise karbür uçlu bıçak gerekir.',
      },
      {
        q: 'Sertleştirilmiş mil veya Hardox kesmek için hangi bıçak gerekir?',
        a: 'Bi-metal bıçaklar yaklaşık 45 HRC’ye kadar olan malzemeler içindir. İndüksiyonla sertleştirilmiş krom kaplı miller, sertleştirilmiş takım çelikleri ve Hardox 500 ve üzeri aşınma plakaları için karbür uçlu bıçak kullanın; Hardox 400 ve 450 sınır bölgesindedir ve düzenli kesimde karbür uçlu bıçak önerilir. Karbür uçlu bıçak rijit ve yeterli gerginlik sağlayan bir makine gerektirir.',
      },
    ],
  },
  {
    title: 'Kullanım, alıştırma ve arızalar',
    items: [
      {
        q: 'Yeni şerit testere bıçağı nasıl alıştırılır (rodaj)?',
        a: 'İlk kesimlerde ilerlemeyi (kesme basıncını) belirgin şekilde azaltın; çoğu üretici normal değerin yaklaşık yarısını önerir. Toplam yaklaşık 150–500 cm² kesit alanını bu şekilde kesin, ardından ilerlemeyi kademeli olarak normale çıkarın. Bant hızı konusunda üreticiler ayrışır: bazıları normal hızı korumayı, bazıları hızı yaklaşık %70–75’e düşürmeyi önerir. Makine ve bıçak kılavuzunuzdaki değeri esas alın.',
      },
      {
        q: 'Bıçak kaynak yerinden koptu, ne yapmalıyım?',
        a: 'Kaynak yerinden kopma, kaynak veya tavlama kusurundan ya da gövdeyi de kırabilecek zorlanmalardan (aşırı gerginlik, kasnak çapına göre kalın bıçak, kılavuz sorunları) kaynaklanabilir. Bıçağın, kırık yüzeyinin ve makine etiketinin fotoğraflarını iletişim sayfasından bize gönderin; inceleme sonucunda ayıplı ürün söz konusuysa değişim, onarım veya iade süreci yasal haklarınız çerçevesinde yürütülür. Yeni bıçağı takmadan önce gerginlik ve kılavuz ayarını da kontrol edin.',
      },
      {
        q: 'Bıçağım neden eğri kesiyor?',
        a: 'En sık nedenler yüksek ilerleme, düşük bıçak gerginliği, parçadan uzak veya aşınmış kılavuzlar ve bir tarafı körelmiş ya da çaprazı bozulmuş dişlerdir. Önce ilerlemeyi azaltın, gerginliği ve kılavuz ayarını kontrol edin; sorun sürüyorsa bıçağı değiştirin.',
      },
      {
        q: 'Bıçak gerginliği ve bor yağı oranı ne olmalı?',
        a: 'Kaynaklar farklı değerler verir: bi-metal bıçaklar için Alman bıçak üreticileri 250–300 N/mm², ABD’deki yaygın uygulama yaklaşık 170–210 N/mm² önerir. Soğutma sıvısında Türkiye’deki atölyelerde %4–5 yaygınken bazı bıçak üreticileri genel çelikler için %8–12, paslanmaz ve takım çelikleri için %15 ve üzerini önerir. Makinenizin, bıçağın ve sıvının üreticisinin değerini esas alın; gerginliği gerginlik ölçerle, oranı refraktometreyle ölçün.',
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
        a: 'Ürün toplamı KDV dahil 2.000 TL ve üzeri siparişlerde standart kargo ücretsizdir. Bu tutarın altındaki siparişlerde kargo ücreti 79,90 TL’dir (KDV dahil). Kargo ücreti, siparişi onaylamadan önce sepet ve ödeme adımında gösterilir.',
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
            Şerit testere seçimi, kullanımı, sipariş, ödeme, teslimat ve iade hakkında en çok sorulanlar.
            Ayrıntılı teknik bilgi için{' '}
            <Link href="/rehber" className="font-semibold text-accent hover:underline">
              şerit testere rehberine
            </Link>{' '}
            bakabilir, cevabını bulamadığınız sorular için{' '}
            <Link href="/iletisim" className="font-semibold text-accent hover:underline">
              bize yazabilirsiniz
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
