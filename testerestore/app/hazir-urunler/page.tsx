import type { Metadata } from 'next';
import Header from '../components/Header';
import Footer from '../components/Footer';
import HazirUrunlerClient from './HazirUrunlerClient';
import { listReadyMade } from '../../lib/medusa/services/products';
import { pageMetadata } from '../../lib/seo';

// SSR + ISR: hazır boy listesi sunucuda çekilir → ilk HTML dolu, SEO dostu.
export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Hazır Boy Şerit Testere — Stoktan, Aynı Gün Kargo',
  description:
    'Önceden kaynaklı, standart ölçülerde hazır şerit testere bıçakları. ' +
    'Genişlik, kalınlık, diş adımı ve boya göre seç, stoktan aynı gün kargoyla al.',
  path: '/hazir-urunler',
});

export default async function HazirUrunlerPage() {
  const readyMade = await listReadyMade(200);

  return (
    <>
      <Header />
      <main className="flex-1 bg-background">
        {/* Sayfa başlığı */}
        <section className="border-b border-border bg-chrome relative overflow-hidden">
          <div className="absolute inset-0 metallic-grid opacity-30" />
          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 md:py-16">
            <div className="inline-flex items-center gap-2 text-emerald-500 mb-3">
              <span className="text-[10px] font-medium tracking-[0.32em] uppercase">
                Stoktan · Aynı Gün Kargo
              </span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground">
              Hazır Boy <span className="text-orange-grad">Şerit Testereler</span>
            </h1>
            <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl">
              Önceden kaynaklı, standart ölçülerde, stoğumuzda. Ölçün tutuyorsa
              yapılandırmadan tek tıkla al — aynı gün kargoda.
            </p>
          </div>
        </section>

        <HazirUrunlerClient initialReadyMade={readyMade} />
      </main>
      <Footer />
    </>
  );
}
