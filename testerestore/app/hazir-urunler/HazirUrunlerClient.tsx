'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PackageCheck, Truck, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { useReadyMade } from '../../lib/medusa/hooks/useProducts';
import { mapReadyMadeCard, formatTL, type ReadyMadeCard } from '../../lib/ready-made';
import type { StoreProduct } from '../../lib/medusa/types';

const ACCENT = '#f97316';

type SortKey = 'length-asc' | 'length-desc' | 'price-asc' | 'price-desc';
type FacetKey = 'width' | 'thickness' | 'tooth' | 'length';

const fmtNum = (n: number) =>
  Number.isInteger(n) ? String(n) : String(n);

/** Diş adımı sıralaması: kaba (düşük TPI) → ince. "1.4/2" < "4/6" < "10/14" < "18". */
const toothOrder = (t: string) => parseFloat(t.split('/')[0].replace(',', '.')) || 0;

/**
 * Filtre açılır listesi — temanın renk değişkenleriyle (açık/koyu temada
 * okunur). Eskiden sabit beyaz yazı + koyu gradyan zemin vardı; Windows'ta
 * açılan seçenek listesi beyaz zemin üzerinde beyaz yazı olarak görünmüyordu.
 */
function FilterSelect({
  label,
  value,
  onChange,
  children,
  active = !!value,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
  /** Seçili filtre vurgusu (sıralama kutusunda kapalı). */
  active?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 min-w-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/30 ${
          active ? 'border-accent' : 'border-border hover:border-accent/50'
        }`}
      >
        {children}
      </select>
    </label>
  );
}

const OPTION_CLASS = 'bg-background text-foreground';

export default function HazirUrunlerClient({
  initialReadyMade,
}: { initialReadyMade?: StoreProduct[] } = {}) {
  const { data: medusaReady } = useReadyMade(200);

  const all = useMemo<ReadyMadeCard[]>(() => {
    const source = medusaReady?.length ? medusaReady : initialReadyMade;
    return (source ?? []).map(mapReadyMadeCard);
  }, [medusaReady, initialReadyMade]);

  const families = useMemo(
    () => Array.from(new Set(all.map((c) => c.family))).sort((a, b) => a.localeCompare(b, 'tr')),
    [all]
  );
  const [family, setFamily] = useState<string>('Tümü');
  const [width, setWidth] = useState<string>('');
  const [thickness, setThickness] = useState<string>('');
  const [tooth, setTooth] = useState<string>('');
  const [length, setLength] = useState<string>('');
  const [sort, setSort] = useState<SortKey>('length-asc');

  /** Ürün seçili filtrelere uyuyor mu (`except` alanı yok sayılarak). */
  const matches = (c: ReadyMadeCard, except?: FacetKey) =>
    (family === 'Tümü' || c.family === family) &&
    (except === 'width' || !width || c.width === Number(width)) &&
    (except === 'thickness' || !thickness || c.thickness === Number(thickness)) &&
    (except === 'tooth' || !tooth || c.tooth === tooth) &&
    (except === 'length' || !length || c.length === Number(length));

  /**
   * Bir ölçünün TÜM değerleri (her zaman listede) + diğer seçimlere göre kaç
   * ürün kaldığı. Sonuç vermeyecek değerler listede kalır ama seçilemez.
   */
  function facet<T extends string | number>(key: FacetKey, get: (c: ReadyMadeCard) => T | null, order: (a: T, b: T) => number) {
    const values = Array.from(new Set(all.map(get).filter((v): v is T => v != null))).sort(order);
    return values.map((value) => ({
      value,
      count: all.filter((c) => matches(c, key) && get(c) === value).length,
    }));
  }
  const widthOpts = facet('width', (c) => c.width, (a, b) => a - b);
  const thicknessOpts = facet('thickness', (c) => c.thickness, (a, b) => a - b);
  const toothOpts = facet('tooth', (c) => c.tooth, (a, b) => toothOrder(a) - toothOrder(b) || a.localeCompare(b));
  const lengthOpts = facet('length', (c) => c.length, (a, b) => a - b);

  const filtered = useMemo(() => {
    const out = all.filter((c) => matches(c));
    return [...out].sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      if (sort === 'length-desc') return (b.length ?? 0) - (a.length ?? 0);
      return (a.length ?? 0) - (b.length ?? 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, family, width, thickness, tooth, length, sort]);

  const hasFilter = family !== 'Tümü' || !!width || !!thickness || !!tooth || !!length;
  const reset = () => {
    setFamily('Tümü');
    setWidth('');
    setThickness('');
    setTooth('');
    setLength('');
  };

  const familyPills = ['Tümü', ...families];

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 md:py-12">
      {/* Aile pill'leri */}
      <div className="flex flex-wrap gap-2 mb-6">
        {familyPills.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFamily(f)}
            aria-pressed={family === f}
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer border ${
              family === f
                ? 'text-white border-transparent'
                : 'bg-background text-foreground/80 border-border hover:border-accent/50 hover:text-foreground'
            }`}
            style={family === f ? { background: `linear-gradient(90deg, ${ACCENT}, #ea580c)` } : undefined}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Ölçü filtreleri + sıralama */}
      <div className="mb-8 pb-6 border-b border-border">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
            <SlidersHorizontal className="h-3.5 w-3.5 text-accent" /> Filtrele
          </div>
          <div className="flex items-center gap-3">
            {hasFilter && (
              <button
                type="button"
                onClick={reset}
                className="text-xs text-accent font-semibold cursor-pointer hover:underline"
              >
                Filtreleri temizle
              </button>
            )}
            <span className="text-xs text-muted-foreground">{filtered.length} ürün</span>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <FilterSelect label="Genişlik" value={width} onChange={setWidth}>
            <option value="" className={OPTION_CLASS}>Tümü</option>
            {widthOpts.map((o) => (
              <option key={o.value} value={o.value} disabled={o.count === 0 && String(o.value) !== width} className={OPTION_CLASS}>
                {fmtNum(o.value)} mm ({o.count})
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Kalınlık" value={thickness} onChange={setThickness}>
            <option value="" className={OPTION_CLASS}>Tümü</option>
            {thicknessOpts.map((o) => (
              <option key={o.value} value={o.value} disabled={o.count === 0 && String(o.value) !== thickness} className={OPTION_CLASS}>
                {fmtNum(o.value)} mm ({o.count})
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Diş (TPI)" value={tooth} onChange={setTooth}>
            <option value="" className={OPTION_CLASS}>Tümü</option>
            {toothOpts.map((o) => (
              <option key={o.value} value={o.value} disabled={o.count === 0 && o.value !== tooth} className={OPTION_CLASS}>
                {o.value} TPI ({o.count})
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Boy" value={length} onChange={setLength}>
            <option value="" className={OPTION_CLASS}>Tümü</option>
            {lengthOpts.map((o) => (
              <option key={o.value} value={o.value} disabled={o.count === 0 && String(o.value) !== length} className={OPTION_CLASS}>
                {o.value} mm ({o.count})
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Sırala" value={sort} onChange={(v) => setSort(v as SortKey)} active={false}>
            <option value="length-asc" className={OPTION_CLASS}>Boy: kısa → uzun</option>
            <option value="length-desc" className={OPTION_CLASS}>Boy: uzun → kısa</option>
            <option value="price-asc" className={OPTION_CLASS}>Fiyat: artan</option>
            <option value="price-desc" className={OPTION_CLASS}>Fiyat: azalan</option>
          </FilterSelect>
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-sm text-muted-foreground">
          {all.length === 0
            ? 'Henüz hazır boy ürün eklenmemiş.'
            : 'Bu filtreyle ürün bulunamadı.'}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
          {filtered.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="premium-card-highlight group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-premium-card shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-500 hover:-translate-y-1.5 hover:border-accent/40 cursor-pointer"
            >
              <div className="relative aspect-square overflow-hidden bg-premium-image-bg">
                <Image
                  src={item.image}
                  alt={item.family}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-110"
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#14171c] via-transparent to-transparent pointer-events-none" />
                <div className="absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-emerald-500/90 text-white px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] shadow-lg">
                  <PackageCheck className="h-3 w-3" />
                  <span>Stokta</span>
                </div>
              </div>

              <div className="relative flex flex-1 flex-col p-4 z-10">
                <h3 className="text-sm font-semibold tracking-[-0.015em] text-white group-hover:text-accent transition-colors line-clamp-1">
                  {item.family}
                </h3>
                <p className="mt-1 text-[11px] text-[#a8acb3] font-medium">
                  {item.sizeLabel}
                </p>

                <div className="mt-4 pt-3 flex items-end justify-between border-t border-white/10">
                  <div>
                    {item.price > 0 && (
                      <div className="text-base font-bold text-white">
                        {formatTL(item.price)}
                      </div>
                    )}
                    {item.stock != null && (
                      <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-emerald-400">
                        <Truck className="h-3 w-3" />
                        {item.stock} adet · aynı gün
                      </div>
                    )}
                  </div>
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white transition-all duration-300 group-hover:border-transparent group-hover:bg-molten-grad group-hover:glow-orange">
                    <ArrowRight className="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
