import Link from 'next/link';
import type { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ArrowRight, FileDown, BookOpen, FileText, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Dijital Katalog',
  description:
    'Bi-Metal M42 & M51, karbür uçlu ve ahşap şerit testere kataloglarını PDF olarak indirin. Diş adımı seçim tablosu ve teknik belgeler.',
};

const DOCUMENTS = [
  {
    title: 'Şerit Testere Genel Kataloğu 2026',
    desc: 'Bi-Metal M42 / M51, karbür uçlu ve ahşap kesim serilerinin tam teknik kataloğu, milimetrik boyut ve diş tabloları.',
    size: '3.4 MB',
    type: 'PDF',
  },
  {
    title: 'Diş Adımı (TPI) Seçim Matrisi',
    desc: 'Malzeme çapına ve et kalınlığına göre ideal TPI seçim tablosu. Kesim hızı ve diş ömrü için referans dokümanı.',
    size: '850 KB',
    type: 'PDF',
  },
  {
    title: 'IDEAL Kaynak Standartları & Tolerans Belgesi',
    desc: 'Alın kaynağı toleransları, mikroyapı tavlama prosedürleri ve kalite kontrol parametreleri.',
    size: '1.9 MB',
    type: 'PDF',
  },
  {
    title: 'Kullanım & İş Güvenliği Emniyet Kılavuzu',
    desc: 'Testere montajı, gergi ayarı, koruyucu donanım ve atölye çalışma güvenliği rehberi.',
    size: '1.2 MB',
    type: 'PDF',
  },
  {
    title: 'Ahşap Kesim Uygulamaları El Kitabı',
    desc: 'Karbon çeliği ve Alman C75S serileri için ahşap türüne göre optimum kesim parametreleri.',
    size: '1.6 MB',
    type: 'PDF',
  },
  {
    title: 'Karbür Uçlu Bıçaklar Teknik El Kitabı',
    desc: 'TCT serisi için paslanmaz, titanyum, nikel alaşımları kesim parametreleri ve bakım talimatları.',
    size: '2.1 MB',
    type: 'PDF',
  },
];

const ACCENT = '#a4b402';

export default function KatalogPage() {
  return (
    <>
      <Header />

      <main className="flex-1 py-12 md:py-20 bg-background">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <div className="flex flex-col items-center text-center mb-16">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-10 sm:w-14" style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}80)` }} />
              <span className="text-[10px] font-semibold tracking-[0.36em] uppercase" style={{ color: ACCENT }}>
                Dijital Katalog
              </span>
              <span className="h-px w-10 sm:w-14" style={{ background: `linear-gradient(90deg, ${ACCENT}80, transparent)` }} />
            </div>
            <h1 className="text-4xl md:text-[3.25rem] font-semibold tracking-[-0.035em] leading-[1.05] max-w-3xl mb-5">
              <span className="text-foreground">Teknik </span>
              <span className="text-orange-grad">Dokümanlar</span>
            </h1>
            <p className="text-[13px] md:text-[15px] text-muted-foreground max-w-2xl leading-relaxed font-light">
              Tüm şerit testere serilerimizin kataloglarını, diş seçim tablolarını ve teknik kılavuzlarını PDF olarak indirin.
              Atölyenizdeki seçim ve kesim parametrelerini bu kaynaklarla optimize edin.
            </p>
          </div>

          {/* Documents grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {DOCUMENTS.map((doc) => (
              <article
                key={doc.title}
                className="group relative flex items-start justify-between gap-4 p-5 rounded-2xl border border-border bg-metallic-card hover:border-accent/40 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-accent">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="space-y-1.5 min-w-0">
                    <h3 className="text-sm font-bold text-foreground leading-snug">{doc.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{doc.desc}</p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-accent uppercase tracking-wider">
                      <span>{doc.size}</span>
                      <span>•</span>
                      <span>{doc.type}</span>
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  className="shrink-0 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground hover:border-accent/40 hover:bg-accent/5 hover:text-accent transition-all cursor-pointer"
                  aria-label={`${doc.title} indir`}
                  title="İndir"
                >
                  <FileDown className="h-4 w-4" />
                </button>
              </article>
            ))}
          </div>

          {/* CTA strip */}
          <div className="mt-16 rounded-3xl border border-accent/15 bg-gradient-to-b from-accent/5 to-accent/0 p-8 md:p-10 text-center space-y-5 glow-orange">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-foreground">
              Özel Boy Hesaplama Önerisi Lazım mı?
            </h2>
            <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
              Atölyenize uygun şeridi belirlemek için parametrik configurator&apos;ı kullanın — milimetrik boyu girin, fiyatı anında görün, IDEAL kaynak garantisiyle aynı gün hazırlanan ürünleri sipariş edin.
            </p>
            <div className="pt-2 flex flex-wrap gap-3 justify-center">
              <Link
                href="/products/bimetal-premium"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-molten-grad text-sm font-bold text-white px-6 transition-all duration-300 glow-orange cursor-pointer"
              >
                <span>Parametrik Hesaplayıcı</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/iletisim"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-silver-grad text-sm font-bold px-6 transition-all duration-300 cursor-pointer"
              >
                <BookOpen className="h-4 w-4" />
                <span>Uzman Desteği Al</span>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}
