'use client';

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  TrendingUp, ArrowRight, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { useBestSellers } from '../../lib/medusa/hooks/useProducts';
import { getProductImage } from '../../lib/medusa/format';
import type { StoreProduct } from '../../lib/medusa/types';
import { siteContent } from '../../lib/content-config';
import { BestSellerCardSkeleton } from './skeletons/CatalogSkeleton';

/**
 * "Öne Çıkan Ürünler" — admin'de is_best_seller / best_seller_rank ile seçilen
 * (editoryal) liste. Puan, yorum sayısı, "x+ satış", "Çok Satan" ve sıra (#1)
 * rozetleri BİLEREK yok: gerçek satış/yorum verisi olmadan bunları göstermek
 * yanıltıcı reklam (Ticari Reklam ve Haksız Ticari Uygulamalar Yönetmeliği).
 * Gerçek yorumlar biriktiğinde puan, onaylı yorumlardan eklenebilir.
 */
interface BestSeller {
  id: string;
  name: string;
  tagline: string;
  image: string;
  href: string;
}

function mapMedusaToBestSeller(products: StoreProduct[]): BestSeller[] {
  return products.map((p) => ({
    id: p.id,
    name: p.title,
    tagline: p.subtitle || p.description || '',
    image: getProductImage(p),
    href: `/products/${p.handle || p.id}`,
  }));
}

const DRAG_THRESHOLD = 6;

export default function BestSellersSlider({
  initialBestSellers,
}: { initialBestSellers?: StoreProduct[] } = {}) {
  const { data: medusaBestSellers, loading } = useBestSellers(8, {
    enabled: !initialBestSellers?.length,
  });

  const bestSellers = useMemo<BestSeller[]>(() => {
    // SSR prop (initialBestSellers) ilk render'da doldurur; client fetch tazeler.
    const source = medusaBestSellers?.length ? medusaBestSellers : initialBestSellers;
    // Ürün gelmezse demo kart yok (olmayan ürünlere link veriyordu) → bölüm gizlenir.
    return source?.length ? mapMedusaToBestSeller(source) : [];
  }, [medusaBestSellers, initialBestSellers]);

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
    setCanScrollRight(
      el.scrollLeft + el.clientWidth < el.scrollWidth - tolerance
    );
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [updateScrollState, bestSellers]);

  const scrollByCard = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const firstCard = el.querySelector<HTMLElement>('[data-slider-card]');
    const cardWidth = firstCard?.offsetWidth ?? 320;
    const gap = 24;
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
    const handleGlobalMouseUp = () => endDrag();
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [endDrag]);

  const sec = siteContent.bestSellersSection;
  const isLoading = loading && !bestSellers.length;
  if (!isLoading && bestSellers.length === 0) return null;

  return (
    <section className="relative pt-14 pb-20 md:pt-16 md:pb-24 border-y border-border bg-muted/20 overflow-hidden">
      <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-accent/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-primary/10 blur-3xl pointer-events-none" />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6 mb-10">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 text-accent">
              <TrendingUp className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium tracking-[0.32em] uppercase">{sec.eyebrow}</span>
            </div>
            <h2 className="text-4xl md:text-[3.25rem] font-semibold tracking-[-0.035em] text-foreground leading-[1.05]">
              {sec.title} <span className="text-orange-grad">{sec.titleHighlight}</span>
            </h2>
            <p className="text-sm md:text-[15px] text-muted-foreground max-w-xl leading-relaxed font-light">
              {sec.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => scrollByCard('left')}
                disabled={!canScrollLeft}
                aria-label="Önceki ürünler"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-premium-card text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all hover:border-accent/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollByCard('right')}
                disabled={!canScrollRight}
                aria-label="Sonraki ürünler"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-premium-card text-white shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all hover:border-accent/50 hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

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
            className="best-sellers-scroll flex gap-6 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 cursor-grab select-none"
          >
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => <BestSellerCardSkeleton key={i} />)
              : bestSellers.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  data-slider-card
                  className="premium-card-highlight group relative flex flex-col shrink-0 snap-start overflow-hidden rounded-2xl border border-white/[0.08] bg-premium-card shadow-[0_8px_30px_rgba(0,0,0,0.35)] transition-all duration-500 hover:-translate-y-1.5 hover:border-accent/40 hover:shadow-[0_20px_60px_rgba(0,0,0,0.55),0_0_30px_rgba(255,120,31,0.12)] cursor-pointer w-[280px] sm:w-[320px] md:w-[340px] lg:w-[360px]"
                >
                  <div className="relative aspect-[5/4] overflow-hidden bg-premium-image-bg">
                    <Image
                      src={item.image}
                      alt={item.name}
                      fill
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                      sizes="(max-width: 768px) 280px, 360px"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#14171c] via-transparent to-transparent pointer-events-none" />

                  </div>

                  <div className="relative flex flex-1 flex-col p-5 z-10">
                    <h3 className="text-base md:text-[17px] font-semibold tracking-[-0.015em] text-white group-hover:text-accent transition-colors mb-1.5 line-clamp-2">
                      {item.name}
                    </h3>

                    <p className="text-[11px] text-[#a8acb3] leading-relaxed mb-4 line-clamp-2 font-light">
                      {item.tagline}
                    </p>

                    <div className="flex items-center justify-end pt-3 mt-auto border-t border-white/10">
                      <div className="inline-flex items-center gap-1 text-xs font-semibold text-orange-grad">
                        <span>İncele</span>
                        <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        .best-sellers-scroll {
          scrollbar-width: none;
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
        }
        .best-sellers-scroll::-webkit-scrollbar { display: none; }
        .best-sellers-scroll.is-dragging {
          scroll-snap-type: none;
          scroll-behavior: auto;
          cursor: grabbing;
        }
        .best-sellers-scroll.is-dragging :global(*) { cursor: grabbing !important; }
        .best-sellers-scroll :global(img) {
          -webkit-user-drag: none;
          pointer-events: none;
        }
      `}</style>
    </section>
  );
}
