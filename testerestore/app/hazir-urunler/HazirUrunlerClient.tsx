'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PackageCheck, Truck, ArrowRight, SlidersHorizontal } from 'lucide-react';
import { useReadyMade } from '../../lib/medusa/hooks/useProducts';
import { mapReadyMadeCard, formatTL, type ReadyMadeCard } from '../../lib/ready-made';
import type { StoreProduct } from '../../lib/medusa/types';

const ACCENT = '#f97316';

type SortKey = 'length-asc' | 'price-asc' | 'price-desc';

const fmtNum = (n: number) =>
  Number.isInteger(n) ? String(n) : String(n);

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
  const widths = useMemo(
    () =>
      Array.from(new Set(all.map((c) => c.width).filter((w): w is number => w != null))).sort(
        (a, b) => a - b
      ),
    [all]
  );
  const lengths = useMemo(
    () =>
      Array.from(new Set(all.map((c) => c.length).filter((l): l is number => l != null))).sort(
        (a, b) => a - b
      ),
    [all]
  );

  const [family, setFamily] = useState<string>('Tümü');
  const [width, setWidth] = useState<string>('');
  const [length, setLength] = useState<string>('');
  const [sort, setSort] = useState<SortKey>('length-asc');

  const filtered = useMemo(() => {
    let out = all;
    if (family !== 'Tümü') out = out.filter((c) => c.family === family);
    if (width) out = out.filter((c) => c.width === Number(width));
    if (length) out = out.filter((c) => c.length === Number(length));
    out = [...out].sort((a, b) => {
      if (sort === 'price-asc') return a.price - b.price;
      if (sort === 'price-desc') return b.price - a.price;
      return (a.length ?? 0) - (b.length ?? 0);
    });
    return out;
  }, [all, family, width, length, sort]);

  const hasFilter = family !== 'Tümü' || !!width || !!length;
  const reset = () => {
    setFamily('Tümü');
    setWidth('');
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
            className={`rounded-full px-4 py-2 text-xs font-semibold transition-all cursor-pointer border ${
              family === f
                ? 'text-white border-transparent'
                : 'text-muted-foreground border-white/10 hover:text-foreground'
            }`}
            style={family === f ? { background: `linear-gradient(90deg, ${ACCENT}, #ea580c)` } : undefined}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Ölçü filtreleri + sıralama */}
      <div className="flex flex-wrap items-center gap-3 mb-8 pb-6 border-b border-border">
        <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filtre:
        </div>
        <select
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          className="rounded-lg border border-white/10 bg-premium-card px-3 py-2 text-xs text-white cursor-pointer"
        >
          <option value="">Tüm genişlikler</option>
          {widths.map((w) => (
            <option key={w} value={w}>{fmtNum(w)} mm genişlik</option>
          ))}
        </select>
        <select
          value={length}
          onChange={(e) => setLength(e.target.value)}
          className="rounded-lg border border-white/10 bg-premium-card px-3 py-2 text-xs text-white cursor-pointer"
        >
          <option value="">Tüm boylar</option>
          {lengths.map((l) => (
            <option key={l} value={l}>{l} mm boy</option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-white/10 bg-premium-card px-3 py-2 text-xs text-white cursor-pointer"
        >
          <option value="length-asc">Boya göre (kısa→uzun)</option>
          <option value="price-asc">Fiyat (artan)</option>
          <option value="price-desc">Fiyat (azalan)</option>
        </select>
        {hasFilter && (
          <button
            type="button"
            onClick={reset}
            className="text-xs text-accent font-semibold cursor-pointer hover:underline"
          >
            Filtreleri temizle
          </button>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {filtered.length} ürün
        </span>
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
