import Link from 'next/link';
import Header from './components/Header';
import Footer from './components/Footer';
import HeroSlider from './components/HeroSlider';
import PremiumCatalog from './components/PremiumCatalog';
import BestSellersSlider from './components/BestSellersSlider';

export default function Home() {
  return (
    <>
      <Header />
      
      <main className="flex-1 bg-background">
        {/* Hero Slider */}
        <HeroSlider />

        {/* Premium Catalog (with category filter) */}
        <PremiumCatalog />

        {/* Best Sellers — Horizontal Slider */}
        <BestSellersSlider />

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
