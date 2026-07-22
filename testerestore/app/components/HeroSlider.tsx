'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Zap,
  Award,
  Sliders,
  CheckCircle2,
  Flame,
  Wrench,
} from 'lucide-react';
import { useHeroSlides, type StoreHeroSlide } from '../../lib/medusa/hooks/useHeroSlides';
import { siteContent } from '../../lib/content-config';

type Slide = {
  id: string;
  badge: string;
  badgeIcon: React.ReactNode;
  title: React.ReactNode;
  highlight: string;
  description: string;
  image: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  accent: string;
};

const BADGE_ICONS: Record<string, React.ReactNode> = {
  zap: <Zap className="h-3.5 w-3.5 animate-pulse" />,
  flame: <Flame className="h-3.5 w-3.5" />,
  wrench: <Wrench className="h-3.5 w-3.5" />,
  award: <Award className="h-3.5 w-3.5" />,
};

/** Map a Medusa hero_slide row → the local Slide shape this component renders. */
function mapMedusaSlide(row: StoreHeroSlide): Slide {
  return {
    id: row.id,
    badge: row.badge,
    badgeIcon: BADGE_ICONS[row.badge_icon] ?? BADGE_ICONS.zap,
    title: (
      <>
        {row.title_prefix}
        {row.title_suffix ? (
          <>
            <br />
            {row.title_suffix}{' '}
          </>
        ) : (
          <> </>
        )}
      </>
    ),
    highlight: row.highlight,
    description: row.description,
    image: row.image_url,
    primaryCta: { label: row.primary_cta_label, href: row.primary_cta_href },
    secondaryCta: {
      label: row.secondary_cta_label || 'Detaylı İncele',
      href: row.secondary_cta_href || '#products',
    },
    accent: row.accent || 'from-orange-500/30 via-amber-500/10',
  };
}

/** Same mapping for the static content-config fallback (used pre-Medusa). */
function mapConfigSlides(): Slide[] {
  return siteContent.hero.slides.map((s) => ({
    id: s.id,
    badge: s.badge,
    badgeIcon: BADGE_ICONS[s.badgeIcon] ?? BADGE_ICONS.zap,
    title: (
      <>
        {s.titlePrefix}
        {s.titleSuffix ? (
          <>
            <br />
            {s.titleSuffix}{' '}
          </>
        ) : (
          <> </>
        )}
      </>
    ),
    highlight: s.highlight,
    description: s.description,
    image: s.image,
    primaryCta: s.primaryCta,
    secondaryCta: s.secondaryCta,
    accent: s.accent,
  }));
}

const AUTOPLAY_INTERVAL = 6000;

export default function HeroSlider() {
  const { data: medusaSlides, loading } = useHeroSlides();

  const slides = useMemo<Slide[]>(() => {
    if (medusaSlides && medusaSlides.length > 0) {
      return medusaSlides.map(mapMedusaSlide);
    }
    return mapConfigSlides();
  }, [medusaSlides]);

  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Reset current if the slide count shrinks below current index.
  useEffect(() => {
    if (current >= slides.length && slides.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrent(0);
    }
  }, [slides.length, current]);

  const goTo = useCallback(
    (index: number) => {
      if (slides.length === 0) return;
      setCurrent((index + slides.length) % slides.length);
    },
    [slides.length]
  );

  const next = useCallback(() => goTo(current + 1), [current, goTo]);
  const prev = useCallback(() => goTo(current - 1), [current, goTo]);

  useEffect(() => {
    if (isPaused || slides.length <= 1) return;
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % slides.length);
    }, AUTOPLAY_INTERVAL);
    return () => clearInterval(id);
  }, [isPaused, slides.length]);

  // Show fallback render while loading first paint — looks identical.
  if (loading && slides.length === 0) {
    return (
      <section className="relative overflow-hidden pt-8 pb-3 md:pt-12 md:pb-5 metallic-grid">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-border bg-metallic-card shadow-2xl min-h-[520px] md:min-h-[560px] animate-pulse" />
        </div>
      </section>
    );
  }

  if (slides.length === 0) return null;

  return (
    <section
      className="relative overflow-hidden pt-8 pb-3 md:pt-12 md:pb-5 metallic-grid"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-metallic-card shadow-2xl">
          {/* Slides container */}
          <div
            className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {slides.map((slide, i) => (
              <div
                key={slide.id}
                className="relative w-full shrink-0"
                aria-roledescription="slide"
                aria-label={`${i + 1} / ${slides.length}`}
                aria-hidden={i !== current}
              >
                {/* Accent glow */}
                <div
                  className={`pointer-events-none absolute -top-1/3 -right-1/4 h-[700px] w-[700px] rounded-full bg-gradient-to-br ${slide.accent} to-transparent blur-3xl opacity-70`}
                />

                <div className="relative grid grid-cols-1 gap-8 lg:grid-cols-12 lg:items-center p-6 md:p-10 lg:p-14 min-h-[520px] md:min-h-[560px]">
                  {/* Text column */}
                  <div className="lg:col-span-7 space-y-5 md:space-y-7 relative z-10">
                    <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-1.5 text-xs font-bold text-accent">
                      {slide.badgeIcon}
                      <span>{slide.badge}</span>
                    </div>

                    <h1 className="text-4xl font-bold tracking-[-0.03em] text-foreground sm:text-5xl md:text-6xl leading-[1.1] md:leading-[1.05]">
                      {slide.title}
                      <span className="text-orange-grad">{slide.highlight}</span>
                    </h1>

                    <p className="max-w-xl text-base md:text-lg text-muted-foreground leading-relaxed">
                      {slide.description}
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Link
                        href={slide.primaryCta.href}
                        className="inline-flex h-12 items-center justify-center rounded-xl bg-molten-grad text-sm font-bold text-white px-8 transition-all duration-300 glow-orange cursor-pointer group"
                      >
                        <span>{slide.primaryCta.label}</span>
                        <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                      </Link>
                      <a
                        href={slide.secondaryCta.href}
                        className="inline-flex h-12 items-center justify-center rounded-xl bg-silver-grad text-sm font-bold text-foreground px-8 transition-colors cursor-pointer"
                      >
                        {slide.secondaryCta.label}
                      </a>
                    </div>
                  </div>

                  {/* Image column */}
                  <div className="lg:col-span-5 relative">
                    <div className="absolute -inset-1 rounded-3xl bg-gradient-to-tr from-primary to-orange-600 opacity-20 blur-xl" />
                    <div className="relative overflow-hidden rounded-3xl bg-metallic-card p-2 shadow-2xl">
                      <Image
                        src={slide.image}
                        alt={slide.highlight}
                        width={600}
                        height={600}
                        className="rounded-2xl object-cover w-full aspect-square transition-transform duration-700 ease-out hover:scale-105"
                        priority={i === 0}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Arrow controls */}
          {slides.length > 1 && (
            <>
              <button
                type="button"
                onClick={prev}
                aria-label="Önceki slayt"
                className="absolute left-3 md:left-5 top-1/2 -translate-y-1/2 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur-md text-foreground shadow-lg hover:bg-background hover:scale-105 transition-all cursor-pointer"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={next}
                aria-label="Sonraki slayt"
                className="absolute right-3 md:right-5 top-1/2 -translate-y-1/2 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background/80 backdrop-blur-md text-foreground shadow-lg hover:bg-background hover:scale-105 transition-all cursor-pointer"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* Indicators */}
          {slides.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
              {slides.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => goTo(i)}
                  aria-label={`${i + 1}. slayta git`}
                  aria-current={i === current}
                  className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                    i === current
                      ? 'w-8 bg-molten-grad'
                      : 'w-2 bg-foreground/30 hover:bg-foreground/50'
                  }`}
                />
              ))}
            </div>
          )}

          {/* Progress bar */}
          {slides.length > 1 && (
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-foreground/10 z-10">
              <div
                key={`${current}-${isPaused}`}
                className="h-full bg-molten-grad"
                style={{
                  animation: isPaused
                    ? 'none'
                    : `heroSliderProgress ${AUTOPLAY_INTERVAL}ms linear forwards`,
                }}
              />
            </div>
          )}
        </div>

        {/* Trust badges below slider */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />, text: '24 Saatte Kargo' },
            { icon: <Award className="h-5 w-5 text-accent shrink-0" />, text: 'Alman Menşeili Çelik' },
            { icon: <Sliders className="h-5 w-5 text-accent shrink-0" />, text: 'Tam Parametrik Sipariş' },
          ].map((badge, i) => (
            <div
              key={i}
              className="premium-card-highlight relative flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-premium-card px-5 py-4 shadow-[0_8px_30px_rgba(0,0,0,0.35)]"
            >
              {badge.icon}
              <span className="text-sm font-medium text-white">{badge.text}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes heroSliderProgress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>
    </section>
  );
}
