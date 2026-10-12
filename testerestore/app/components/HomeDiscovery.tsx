import Link from 'next/link';
import { ArrowRight, BookOpen } from 'lucide-react';
import { CATEGORY_PAGES, categoryHref } from '../../lib/category-pages';
import { GUIDES } from '../../lib/guides';

/**
 * Ana sayfada kategori sayfalarına ve rehberlere sunucu tarafında iç link.
 * Kategoriler ana sayfada eskiden yalnızca istemci tarafı filtreydi; bu
 * bölüm Google'ın ve AI botlarının kategori/rehber sayfalarını ana sayfadan
 * keşfetmesini sağlar.
 */
const MAIN = CATEGORY_PAGES.filter((c) => !['m42-serit-testere', 'm51-serit-testere'].includes(c.slug));

export default function HomeDiscovery() {
  return (
    <section className="py-16 md:py-20 border-t border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-14">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Kullanım alanına göre şerit testereler</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Kesmek istediğiniz malzemeyi seçin; her kategoride seçim ipuçları ve sık sorulan sorular var.
          </p>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {MAIN.map((c) => (
              <li key={c.slug}>
                <Link
                  href={categoryHref(c)}
                  className="group flex h-full flex-col rounded-2xl border border-border bg-metallic-card p-5 transition-colors hover:border-accent/50"
                >
                  <h3 className="text-[15px] font-bold leading-snug text-foreground group-hover:text-accent">{c.h1}</h3>
                  <p className="mt-2 flex-1 text-xs leading-relaxed text-muted-foreground line-clamp-3">{c.description}</p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent">
                    Kategoriye git <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Şerit testere rehberi</h2>
              <p className="mt-2 text-sm text-muted-foreground">Doğru bıçağı seçmek ve bıçak ömrünü uzatmak için teknik bilgiler.</p>
            </div>
            <Link href="/rehber" className="hidden sm:inline-flex items-center gap-1 text-sm font-semibold text-accent">
              Tüm rehberler <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <ul className="mt-6 grid gap-4 md:grid-cols-3">
            {GUIDES.slice(0, 3).map((g) => (
              <li key={g.slug}>
                <Link
                  href={`/rehber/${g.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-border p-5 transition-colors hover:border-accent/50"
                >
                  <BookOpen className="h-5 w-5 text-accent" />
                  <h3 className="mt-3 text-[15px] font-bold leading-snug text-foreground group-hover:text-accent">{g.h1}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{g.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
          <Link href="/rehber" className="mt-4 inline-flex sm:hidden items-center gap-1 text-sm font-semibold text-accent">
            Tüm rehberler <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
