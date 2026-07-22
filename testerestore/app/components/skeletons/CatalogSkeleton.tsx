/**
 * Loading skeletons for catalog/best-seller cards.
 * Same dimensions as the real cards so the layout doesn't jump.
 */

export function CatalogCardSkeleton() {
  return (
    <div className="catalog-skeleton flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
      <div className="aspect-square skeleton-shimmer" />
      <div className="p-5 space-y-3">
        <div className="h-4 w-3/4 rounded skeleton-shimmer" />
        <div className="h-3 w-full rounded skeleton-shimmer" />
        <div className="h-3 w-5/6 rounded skeleton-shimmer" />
        <div className="h-10 w-full rounded-xl skeleton-shimmer mt-3" />
      </div>
      <style jsx>{`
        .catalog-skeleton {
          background: linear-gradient(135deg, #2b2f36 0%, #1f2329 55%, #14171c 100%);
        }
        .skeleton-shimmer {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.04) 0%,
            rgba(255, 255, 255, 0.09) 50%,
            rgba(255, 255, 255, 0.04) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.6s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}

export function BestSellerCardSkeleton() {
  return (
    <div className="best-seller-skeleton shrink-0 flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] shadow-[0_8px_30px_rgba(0,0,0,0.35)] w-[280px] sm:w-[320px] md:w-[340px] lg:w-[360px]">
      <div className="aspect-[5/4] skeleton-shimmer" />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-3 w-20 rounded skeleton-shimmer" />
          <div className="h-3 w-12 rounded skeleton-shimmer" />
        </div>
        <div className="h-5 w-4/5 rounded skeleton-shimmer" />
        <div className="h-3 w-full rounded skeleton-shimmer" />
        <div className="flex justify-between pt-2">
          <div className="h-3 w-16 rounded skeleton-shimmer" />
          <div className="h-3 w-12 rounded skeleton-shimmer" />
        </div>
      </div>
      <style jsx>{`
        .best-seller-skeleton {
          background: linear-gradient(135deg, #2b2f36 0%, #1f2329 55%, #14171c 100%);
        }
        .skeleton-shimmer {
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0.04) 0%,
            rgba(255, 255, 255, 0.09) 50%,
            rgba(255, 255, 255, 0.04) 100%
          );
          background-size: 200% 100%;
          animation: shimmer 1.6s ease-in-out infinite;
        }
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }
      `}</style>
    </div>
  );
}

export function CatalogGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <CatalogCardSkeleton key={i} />
      ))}
    </div>
  );
}
