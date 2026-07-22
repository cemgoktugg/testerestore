import Link from 'next/link';
import Header from './components/Header';
import Footer from './components/Footer';
import { ArrowLeft, Search } from 'lucide-react';

export const metadata = {
  title: 'Sayfa bulunamadı (404)',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex-1 min-h-[60vh] flex items-center justify-center bg-background px-4 py-20">
        <div className="max-w-md text-center space-y-5">
          <div className="text-7xl font-black text-orange-grad tracking-tight">404</div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Aradığınız sayfa bulunamadı
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bağlantı taşınmış veya kaldırılmış olabilir. Ürünlerimize göz atabilir
            ya da arama yapabilirsiniz.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-xl bg-molten-grad px-5 py-2.5 text-sm font-bold text-white glow-orange"
            >
              <ArrowLeft className="h-4 w-4" /> Ana Sayfa
            </Link>
            <Link
              href="/arama"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-2.5 text-sm font-bold text-foreground hover:bg-muted transition-colors"
            >
              <Search className="h-4 w-4" /> Ürün Ara
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
