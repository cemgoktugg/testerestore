'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Zap, PackageCheck, Truck, ArrowRight, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useReadyMade } from '../../lib/medusa/hooks/useProducts';
import { mapReadyMadeCard, formatTL, type ReadyMadeCard } from '../../lib/ready-made';
import type { StoreProduct } from '../../lib/medusa/types';

const DRAG_THRESHOLD = 6;

export default function HazirBoySection({
  initialReadyMade,
}: { initialReadyMade?: StoreProduct[] } = {}) {
  const { data: medusaReady } = useReadyMade(24, { enabled: !initialReadyMade?.length });

  const cards = useMemo<ReadyMadeCard[]>(() => {
    // SSR prop (initialReadyMade) ilk render'ı doldurur; client fetch tazeler.
    const source = medusaReady?.length ? medusaReady : initialReadyMade;
    return (source ?? []).map(mapReadyMadeCard);
  }, [medusaReady, initialReadyMade]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startScrollLeftRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const tolerance = 4;
    setCanScrollLeft(el.scrollLeft > tolerance);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - tolerance);
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [updateScrollState, cards]);

  const scrollByCard = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>('[data-slider-card]');
    const cardWidth = firstCard?.offsetWidth ?? 260;
    const gap = 20;
    el.scrollBy({
      left: direction === 'right' ? cardWidth + gap : -(cardWidth + gap),
      behavior: 'smooth',
    });
  };

  const endDrag = useCallback(() => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    const el = scrollRef.current;
    if (el) el.classList.remove('is-dragging');
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startXRef.current = e.pageX - el.offsetLeft;
    startScrollLeftRef.current = el.scrollLeft;
    el.classList.add('is-dragging');
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    const el = scrollRef.current;
    if (!el) return;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - startXRef.current;
    if (Math.abs(walk) > DRAG_THRESHOLD) hasDraggedRef.current = true;
    el.scrollLeft = startScrollLeftRef.current - walk;
  };

  const handleClickCapture = (e: React.MouseEvent<HTMLDivElement>) => {
    if (hasDraggedRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDraggedRef.current = false;
    }
  };

  useEffect(() => {
    const up = () => endDrag();
    window.addEventListener('mouseup', up);
    return () => window.removeEventListener('mouseup', up);
  }, [endDrag]);

  // Hazır ürün yoksa bölüm hiç görünmez (kullanıcı henüz eklememişse temiz kalsın).
  if (cards.length === 0) return null;

  return (
    <section className="relative pt-14 pb-16 md:pt-16 md:pb-20 border-b border-border bg-background overflow-hidden">
      <div className="absolute -top-24 right-1/4 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-9">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-emerald-500">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium tracking-[0.32em] uppercase">
                Stoktan · Aynı Gün Kargo
              </span>
            </div>
            <h2 className="text-4xl md:text-[3.25rem] font-semibold tracking-[-0.035em] text-foreground leading-[1.05]">
              Hazır <span className="text-orange-grad">Boy Ürünler</span>
            </h2>
            <p className="text-sm md:text-[15px] text-muted-foreground max-w-xl leading-relaxed font-light">
              Önceden kaynaklı, standart ölçülerde, stoğumuzda. Ölçün tutuyorsa
              yapılandırmadan tek tıkla al — aynı gün kargoda.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/hazir-urunler"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-premium-card px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white transition-all hover:border-accent/50 cursor-pointer whitespace-nowrap"
            >
              Tümünü Gör
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollByCard('left')}
                disabled={!canScrollLeft}
                aria-label="Önceki"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-premium-card text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard('right')}
                disabled={!canScrollRight}
                aria-label="Sonraki"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-premium-card text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all hover:border-accent/50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Slider */}
        <div className="relative">
          <div className={`pointer-events-none absolute left-0 top-0 bottom-2 w-12 z-10 bg-gradient-to-r from-background to-transparent transition-opacity duration-300 ${canScrollLeft ? 'opacity-100' : 'opacity-0'}`} />
          <div className={`pointer-events-none absolute right-0 top-0 bottom-2 w-12 z-10 bg-gradient-to-l from-background to-transparent transition-opacity duration-300 ${canScrollRight ? 'opacity-100' : 'opacity-0'}`} />

          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseLeave={endDrag}
            onClickCapture={handleClickCapture}
            className="hazir-scroll flex gap-5 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 cursor-grab select-none"
          >
            {cards.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                data-slider-card
                className="premium-card-highlight group relative flex flex-col shrink-0 snap-start overflow-hidden rounded-2xl border border-white/[0.08] bg-premium-card shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-500 hover:-translate-y-1.5 hover:border-accent/40 cursor-pointer w-[240px] sm:w-[260px]"
              >
                <div className="relative aspect-square overflow-hidden bg-premium-image-bg">
                  <Image
                    src={item.image}
                    alt={item.family}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-110"
                    sizes="260px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#14171c] via-transparent to-transparent pointer-events-none" />
                  {/* Stok rozeti */}
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
        </div>
      </div>

      <style jsx>{`
        .hazir-scroll {
          scrollbar-width: none;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        .hazir-scroll::-webkit-scrollbar { display: none; }
        .hazir-scroll.is-dragging {
          scroll-snap-type: none;
          scroll-behavior: auto;
          cursor: grabbing;
        }
        .hazir-scroll.is-dragging :global(*) { cursor: grabbing !important; }
        .hazir-scroll :global(img) {
          -webkit-user-drag: none;
          pointer-events: none;
        }
      `}</style>
    </section>
  );
}
