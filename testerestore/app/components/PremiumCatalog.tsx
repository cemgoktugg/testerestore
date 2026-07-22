'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowRight, ChevronDown, X as XIcon } from 'lucide-react';
import { useProducts } from '../../lib/medusa/hooks/useProducts';
import { useCategories } from '../../lib/medusa/hooks/useCategories';
import { getProductImage } from '../../lib/medusa/format';
import type { StoreProduct, StoreProductCategory } from '../../lib/medusa/types';
import { getDemoCatalog, type DemoCatalogItem } from '../../lib/demo-products';
import { siteContent } from '../../lib/content-config';
import { CatalogGridSkeleton } from './skeletons/CatalogSkeleton';

/** Site genelinde kullanılan turuncu accent — `--accent` Tailwind değişkeniyle uyumlu. */
const ACCENT = '#f97316';      // orange-500 (light mode brand accent)
const ACCENT_HI = '#fb923c';   // orange-400 — gradient'in açık ucu

interface CatalogCardData {
  id: string;
  handle: string;
  name: string;
  description: string;
  image: string;
  category: string;
  href: string;
  /** Sıralama/filtreleme için minimum varyant fiyatı (0 → bilinmiyor). */
  price: number;
  currency: string;
  /** Sıralama için oluşturulma zaman damgası (newest için). */
  createdAt: number;
}

/**
 * Fixed pill list. Each pill matches Medusa categories by `handle`
 * (or by demo `category` string in fallback mode). Renaming a Medusa
 * category in Admin won't break filtering — only the handle matters.
 */
const CATEGORY_PILLS: ReadonlyArray<{
  label: string;
  /** Medusa category handles that count as this pill. */
  handles: ReadonlyArray<string>;
  /** Demo-mode `category` strings that count as this pill. */
  demoMatches: ReadonlyArray<string>;
}> = [
  {
    label: 'Bi-Metal',
    handles: ['bimetal', 'bimetal-m42', 'bimetal-m51', 'bi-metal'],
    demoMatches: ['Metal', 'Bi-Metal'],
  },
  {
    label: 'Ahşap Kesim',
    handles: ['wood', 'ahsap', 'ahşap'],
    demoMatches: ['Ahşap'],
  },
  {
    label: 'Et ve Kemik Kesim',
    handles: ['meat-bone', 'et-ve-kemik'],
    demoMatches: ['Et ve Kemik'],
  },
  {
    label: 'Karbür Uçlu',
    handles: ['carbide-tipped', 'karbur-uclu'],
    demoMatches: ['Karbür Uçlu'],
  },
];

const PILL_LABELS = ['Tümü', ...CATEGORY_PILLS.map((p) => p.label)];

function pillLabelForMedusa(p: StoreProduct): string {
  const productHandles = (p.categories ?? [])
    .map((c) => c.handle)
    .filter(Boolean) as string[];
  for (const pill of CATEGORY_PILLS) {
    if (productHandles.some((h) => pill.handles.includes(h))) {
      return pill.label;
    }
  }
  return p.categories?.[0]?.name ?? 'Şerit Testere';
}

function pillLabelForDemo(category: string): string {
  for (const pill of CATEGORY_PILLS) {
    if (pill.demoMatches.includes(category)) return pill.label;
  }
  return category;
}

function mapMedusaToCard(
  products: StoreProduct[],
  _categories: StoreProductCategory[]
): CatalogCardData[] {
  void _categories;
  return products.map((p) => {
    // Minimum variant price (excluding 0/null)
    const prices =
      p.variants
        ?.map((v) => v.calculated_price?.calculated_amount)
        .filter((x): x is number => typeof x === 'number' && x > 0) ?? [];
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const currency =
      p.variants?.[0]?.calculated_price?.currency_code || 'try';
    const createdAt = p.created_at ? new Date(p.created_at).getTime() : 0;
    return {
      id: p.id,
      handle: p.handle || p.id,
      name: p.title,
      description: p.subtitle || p.description || '',
      image: getProductImage(p),
      category: pillLabelForMedusa(p),
      href: `/products/${p.handle || p.id}`,
      price: minPrice,
      currency,
      createdAt,
    };
  });
}

function mapDemoToCard(items: DemoCatalogItem[]): CatalogCardData[] {
  return items.map((i) => ({
    id: i.id,
    handle: i.handle,
    name: i.name,
    description: i.description,
    image: i.image,
    category: pillLabelForDemo(i.category),
    href: `/products/${i.handle}`,
    price: 0,
    currency: 'try',
    createdAt: 0,
  }));
}


const COLLAPSED_COUNT = 4;

export default function PremiumCatalog() {
  const { data: productsResp, loading: productsLoading } = useProducts({
    limit: 24,
  });
  const { data: categoryList, loading: categoriesLoading } = useCategories();

  const items = useMemo<CatalogCardData[]>(() => {
    if (productsResp?.products?.length) {
      return mapMedusaToCard(productsResp.products, categoryList ?? []);
    }
    return mapDemoToCard(getDemoCatalog());
  }, [productsResp, categoryList]);

  const categories = PILL_LABELS;

  // URL-driven initial filter — Header category links pass ?kategori=X.
  const searchParams = useSearchParams();
  const urlCategory = searchParams.get('kategori');
  const initialActive =
    urlCategory && PILL_LABELS.includes(urlCategory) ? urlCategory : 'Tümü';

  const [active, setActive] = useState<string>(initialActive);
  const [showAll, setShowAll] = useState(false);
  const [priceMin, setPriceMin] = useState<string>(
    searchParams.get('minPrice') || ''
  );
  const [priceMax, setPriceMax] = useState<string>(
    searchParams.get('maxPrice') || ''
  );

  // When the URL param changes (clicking another Header link without full
  // navigation), sync the active pill.
  useEffect(() => {
    if (urlCategory && PILL_LABELS.includes(urlCategory) && urlCategory !== active) {
      setActive(urlCategory);
      setShowAll(false);
    }
    // Only react to url changes, not user clicks on pills
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlCategory]);

  const filtered = useMemo(() => {
    let out =
      active === 'Tümü' ? items : items.filter((i) => i.category === active);
    const min = priceMin.trim() === '' ? null : Number(priceMin);
    const max = priceMax.trim() === '' ? null : Number(priceMax);
    if (min !== null && !isNaN(min)) {
      out = out.filter((i) => i.price === 0 || i.price >= min);
    }
    if (max !== null && !isNaN(max)) {
      out = out.filter((i) => i.price === 0 || i.price <= max);
    }
    return out;
  }, [items, active, priceMin, priceMax]);

  const visible = showAll ? filtered : filtered.slice(0, COLLAPSED_COUNT);
  const hasMore = filtered.length > COLLAPSED_COUNT;
  const hasActiveFilter =
    priceMin.trim() !== '' || priceMax.trim() !== '';

  const resetFilters = () => {
    setPriceMin('');
    setPriceMax('');
  };
  const isLoading = productsLoading || categoriesLoading;

  const handleCategoryChange = (cat: string) => {
    setActive(cat);
    setShowAll(false);
  };

  const sec = siteContent.catalogSection;

  return (
    <section
      id="products"
      className="relative pt-4 pb-10 md:pt-6 md:pb-14 overflow-hidden"
    >
      {/* Decorative background */}
      <div className="absolute inset-0 metallic-grid opacity-40 pointer-events-none" />
      <div
        className="absolute top-20 left-1/2 -translate-x-1/2 h-72 w-[42rem] max-w-full rounded-full blur-3xl pointer-events-none"
        style={{ background: `${ACCENT}1a` }}
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header — refined premium */}
        <div className="flex flex-col items-center text-center mb-12 md:mb-14">
          <div className="flex items-center gap-3 mb-6">
            <span
              className="h-px w-10 sm:w-14"
              style={{ background: `linear-gradient(90deg, transparent, ${ACCENT}80)` }}
            />
            <span
              className="text-[10px] font-semibold tracking-[0.36em] uppercase"
              style={{ color: ACCENT }}
            >
              {sec.eyebrow}
            </span>
            <span
              className="h-px w-10 sm:w-14"
              style={{ background: `linear-gradient(90deg, ${ACCENT}80, transparent)` }}
            />
          </div>

          <h2 className="text-4xl md:text-[3.25rem] font-semibold tracking-[-0.035em] leading-[1.05] max-w-3xl mb-5">
            <span className="text-foreground">{sec.title} </span>
            <span className="catalog-title-shine">{sec.titleHighlight}</span>
          </h2>

          <span
            className="h-[2px] w-14 rounded-full mb-5"
            style={{ background: `linear-gradient(90deg, transparent 0%, ${ACCENT} 50%, transparent 100%)` }}
          />

          <p className="text-[13px] md:text-[15px] text-muted-foreground max-w-xl leading-relaxed font-light">
            {sec.subtitle}
          </p>
        </div>

        {/* Category Filter Pills */}
        <div className="mb-10 flex justify-center">
          <div className="catalog-filter-scroll w-full sm:w-auto overflow-x-auto">
            <div className="mx-auto inline-flex items-center gap-1.5 p-1.5 rounded-full border border-white/10 catalog-filter-shell shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              {categories.map((cat) => {
                const isActive = active === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => handleCategoryChange(cat)}
                    aria-pressed={isActive}
                    className={`catalog-pill relative px-4 sm:px-5 py-2.5 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 cursor-pointer ${
                      isActive ? 'catalog-pill--active' : 'catalog-pill--idle'
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Fiyat filtre satırı */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-3 text-xs">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-2">
            <span className="font-semibold text-muted-foreground">Fiyat:</span>
            <input
              type="number"
              inputMode="decimal"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              placeholder="Min"
              className="w-16 bg-transparent text-foreground font-bold focus:outline-none placeholder:text-muted-foreground/50"
            />
            <span className="text-muted-foreground">—</span>
            <input
              type="number"
              inputMode="decimal"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              placeholder="Max"
              className="w-16 bg-transparent text-foreground font-bold focus:outline-none placeholder:text-muted-foreground/50"
            />
            <span className="text-muted-foreground text-[10px]">TL</span>
          </div>
          {hasActiveFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 text-accent px-3 py-2 font-bold hover:bg-accent/20 transition-colors cursor-pointer"
            >
              <XIcon className="h-3 w-3" />
              Filtreyi Temizle
            </button>
          )}
          <span className="text-muted-foreground font-medium">
            {filtered.length} ürün
          </span>
        </div>

        {/* Loading skeleton */}
        {isLoading && !items.length && <CatalogGridSkeleton count={COLLAPSED_COUNT} />}

        {/* Cards Grid */}
        {!isLoading || items.length ? (
          <div
            key={active}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6"
          >
            {visible.map((item, idx) => (
              <article
                key={item.id}
                className="catalog-card group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-500 hover:-translate-y-2"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <div className="pointer-events-none absolute top-0 right-0 h-full w-1/3 bg-gradient-to-l from-white/[0.05] to-transparent" />
                <div
                  className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ boxShadow: `0 0 0 1px ${ACCENT}55, 0 18px 50px -10px ${ACCENT}30` }}
                />

                {/* Image — tıklanınca ürün sayfasına gider */}
                <Link
                  href={item.href}
                  aria-label={item.name}
                  className="relative block aspect-square overflow-hidden catalog-image-bg cursor-pointer"
                >
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.09]"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#14171c] via-[#14171c]/15 to-transparent" />
                  {/* Molten sweep — hover'da alttan yukarı kor ışıması */}
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ background: `linear-gradient(to top, ${ACCENT}26, transparent 70%)` }}
                  />

                  {/* Kategori rozeti — kor nokta */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/10 pl-2 pr-2.5 py-1 text-[10px] font-semibold text-[#c7c9cc] uppercase tracking-[0.14em]">
                      <span
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }}
                      />
                      {item.category}
                    </span>
                  </div>
                </Link>

                {/* Content */}
                <div className="relative flex flex-1 flex-col p-5 z-10">
                  <Link href={item.href} className="block cursor-pointer">
                    <h3 className="text-[15px] md:text-[17px] font-semibold tracking-[-0.02em] text-white leading-snug line-clamp-2 transition-colors duration-300 group-hover:text-accent">
                      {item.name}
                    </h3>
                    {/* Başlık altı accent çizgisi — hover'da uzar */}
                    <span
                      className="mt-2.5 block h-[2px] w-8 rounded-full transition-all duration-500 group-hover:w-16"
                      style={{ background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT}00)` }}
                    />
                  </Link>

                  <p className="mt-3 text-xs text-[#9aa0a8] leading-relaxed line-clamp-2">
                    {item.description}
                  </p>

                  {/* CTA — dairesel, hover'da molten dolan ok */}
                  <div className="mt-5 pt-4 flex items-center justify-between border-t border-white/[0.06]">
                    <Link
                      href={item.href}
                      aria-label={`${item.name} — İncele`}
                      className="group/btn inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#c7c9cc] transition-colors duration-300 hover:text-white cursor-pointer"
                    >
                      <span>İncele</span>
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white transition-all duration-300 group-hover/btn:border-transparent group-hover/btn:bg-molten-grad group-hover/btn:glow-orange">
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
                      </span>
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20 text-sm text-muted-foreground">
            Bu kategoride henüz ürün bulunmamaktadır.
          </div>
        )}

        {/* Show More / Less Toggle */}
        {hasMore && (
          <div className="mt-10 flex flex-col items-center gap-3">
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              aria-expanded={showAll}
              className="catalog-more-btn group/more inline-flex items-center gap-2 rounded-full border border-white/10 px-7 py-3 text-xs font-bold tracking-wide uppercase text-[#dadcdf] hover:text-white transition-all duration-300 cursor-pointer"
            >
              <span>
                {showAll
                  ? 'Daha Az Göster'
                  : `Daha Fazla Ürün (${filtered.length - COLLAPSED_COUNT})`}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform duration-300 ${
                  showAll ? 'rotate-180' : 'group-hover/more:translate-y-0.5'
                }`}
              />
            </button>
            <span className="text-[11px] text-muted-foreground">
              {showAll
                ? `Tüm ${filtered.length} ürün gösteriliyor`
                : `${visible.length} / ${filtered.length} ürün gösteriliyor`}
            </span>
          </div>
        )}
      </div>

      <style jsx>{`
        .catalog-title-shine {
          background: linear-gradient(135deg, #f1f5f9 0%, #c7c9cc 45%, #94a3b8 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        :global(.dark) .catalog-title-shine {
          background: linear-gradient(135deg, #ffffff 0%, #c7c9cc 50%, #8a8f97 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .catalog-filter-shell {
          background: linear-gradient(135deg, #2b2f36 0%, #1f2329 50%, #14171c 100%);
        }
        .catalog-filter-scroll { scrollbar-width: none; }
        .catalog-filter-scroll::-webkit-scrollbar { display: none; }

        .catalog-pill--idle {
          color: #c7c9cc;
          background: linear-gradient(135deg, rgba(58, 64, 72, 0.6) 0%, rgba(43, 47, 54, 0.6) 100%);
          border: 1px solid rgba(255, 255, 255, 0.04);
        }
        .catalog-pill--idle:hover {
          color: #ffffff;
          border-color: ${ACCENT}40;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 0 18px ${ACCENT}20;
        }
        .catalog-pill--active {
          color: #ffffff;
          background: linear-gradient(135deg, ${ACCENT_HI} 0%, ${ACCENT} 100%);
          border: 1px solid ${ACCENT};
          box-shadow: 0 0 24px ${ACCENT}55, inset 0 1px 0 rgba(255, 255, 255, 0.25);
          text-shadow: 0 1px 1px rgba(0, 0, 0, 0.15);
        }

        .catalog-card {
          background: linear-gradient(135deg, #2b2f36 0%, #1f2329 55%, #14171c 100%);
          animation: catalogFadeUp 500ms cubic-bezier(0.22, 1, 0.36, 1) both;
        }
        .catalog-image-bg {
          background: linear-gradient(135deg, #3a4048 0%, #2b2f36 55%, #1f2329 100%);
        }
        .catalog-cta {
          background: linear-gradient(135deg, #3a4048 0%, #2b2f36 50%, #1f2329 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 2px 8px rgba(0, 0, 0, 0.25);
        }
        .catalog-cta:hover {
          border-color: ${ACCENT}55;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1), 0 0 18px ${ACCENT}30, 0 4px 12px rgba(0, 0, 0, 0.35);
        }
        .catalog-more-btn {
          background: linear-gradient(135deg, #3a4048 0%, #2b2f36 50%, #1f2329 100%);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06), 0 4px 14px rgba(0, 0, 0, 0.3);
        }
        .catalog-more-btn:hover {
          border-color: ${ACCENT}55;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12), 0 0 22px ${ACCENT}35, 0 6px 18px rgba(0, 0, 0, 0.4);
        }
        @keyframes catalogFadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
}
