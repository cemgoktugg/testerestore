import type { Metadata } from 'next';
import Link from 'next/link';
import Header from './components/Header';
import Footer from './components/Footer';
import HeroSlider from './components/HeroSlider';
import PremiumCatalog from './components/PremiumCatalog';
import HazirBoySection from './components/HazirBoySection';
import BestSellersSlider from './components/BestSellersSlider';
import HomeDiscovery from './components/HomeDiscovery';
import { listHeroSlides } from '../lib/medusa/services/hero-slides';
import { listBestSellers, listProducts, listReadyMade } from '../lib/medusa/services/products';
import { listCategories } from '../lib/medusa/services/categories';
import { slimProductForCard } from '../lib/medusa/slim';

// SSR + ISR: ana sayfa içeriği (hero, katalog, en çok satanlar) SUNUCUDA çekilip
// componentlere prop geçilir → ilk HTML dolu gelir, resimler anında yüklenmeye
// başlar (eskiden client-side fetch → geç LCP). Client yine arka planda tazeler.
export const revalidate = 300;

// Başlık/açıklama/OG kök layout'tan (admin site-seo) gelir; burada sadece
// canonical eklenir → /?kategori=… varyantları ana sayfanın kopyası sayılmaz.
export const metadata: Metadata = { alternates: { canonical: '/' } };

export default async function Home() {
  const [heroSlides, bestSellers, productsResp, categories, readyMade] =
    await Promise.all([
      listHeroSlides(),
      listBestSellers(8),
      listProducts({ limit: 24 }),
      listCategories(),
      listReadyMade(24),
    ]);
  return (
    <>
      <Header />
      
      <main className="flex-1 bg-background">
        {/* Hero Slider */}
        <HeroSlider initialSlides={heroSlides} />

        {/* Premium Catalog (with category filter) — yapılandırılabilir aileler */}
        <PremiumCatalog
          initialProducts={productsResp.products.map(slimProductForCard)}
          initialCategories={categories}
        />

        {/* Hazır Boy — stoktan, aynı gün kargo (hazır ürün yoksa görünmez) */}
        <HazirBoySection initialReadyMade={readyMade.map(slimProductForCard)} />

        {/* Best Sellers — Horizontal Slider */}
        <BestSellersSlider initialBestSellers={bestSellers.map(slimProductForCard)} />

        {/* Kategori ve rehber sayfalarına SSR iç link */}
        <HomeDiscovery />

        {/* Quick Parametric Calculator CTA Callout */}
        <section className="py-20 border-t border-border bg-chrome relative overflow-hidden">
          <div className="absolute inset-0 metallic-grid opacity-30"></div>
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="rounded-3xl border border-accent/15 bg-gradient-to-b from-accent/5 to-accent/0 p-8 md:p-12 text-center space-y-6 glow-orange">
              <h2 className="text-3xl font-extrabold tracking-tight text-foreground">
                Tam Ölçünüzü Biliyor musunuz?
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                Beklemek yok. Bi-Metal M42 sayfamıza giderek milimetrik boyunuzu girin, fiyatı anında görün ve sepetinize ekleyin. Profesyonel kaynaklı şeridiniz aynı gün hazırlansın.
              </p>
              <div className="pt-2">
                <Link
                  href="/products/bimetal-premium"
                  className="inline-flex h-12 items-center justify-center rounded-xl bg-molten-grad text-sm font-bold text-white px-8 transition-all duration-300 glow-orange cursor-pointer"
                >
                  Parametrik Siparişe Git
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
