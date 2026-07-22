"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Sparkles, ArrowRight } from "lucide-react";
import { listProducts } from "../../lib/medusa/services/products";
import { formatMoney, getProductImage } from "../../lib/medusa/format";
import type { StoreProduct } from "../../lib/medusa/types";

interface Props {
  /** Listeden çıkarılacak ürün handle/id'leri (örn. zaten sepette olanlar). */
  exclude?: string[];
  /** Kategori bazlı ipucu — varsa öncelikle bu kategoriden öner. */
  categoryHint?: string;
  /** Gösterilecek maks kart sayısı. */
  limit?: number;
  /** Başlık override. */
  title?: string;
  /** "Sıkça birlikte alınanlar" tarzı varyant. */
  variant?: "carousel" | "grid";
}

/**
 * Önerilen ürünler bileşeni. Algoritma basit: Medusa'dan ürünler listele,
 * exclude'dakileri çıkar, kalan en fazla `limit` kadarını göster.
 *
 * İleride gerçek "co-occurrence" hesabı yapmak için bir endpoint açılabilir
 * — şimdilik basit popüler ürün önerisi.
 */
export default function CrossSell({
  exclude = [],
  categoryHint,
  limit = 4,
  title = "Sıkça Birlikte Alınanlar",
  variant = "grid",
}: Props) {
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void categoryHint; // kategori filtresi v2'de
    (async () => {
      const { products } = await listProducts({ limit: limit + 6 });
      if (cancelled) return;
      const excludeSet = new Set(exclude);
      const filtered = products.filter(
        (p) => !excludeSet.has(p.handle || p.id) && !excludeSet.has(p.id)
      );
      setProducts(filtered.slice(0, limit));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exclude.join(","), limit, categoryHint]);

  if (!loading && products.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="flex items-center gap-2 mb-5">
        <Sparkles className="h-5 w-5 text-accent" />
        <h2 className="text-lg md:text-xl font-extrabold tracking-tight">
          {title}
        </h2>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] rounded-xl bg-muted/30 animate-pulse"
            />
          ))}
        </div>
      ) : variant === "carousel" ? (
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
          {products.map((p) => (
            <SmallCard key={p.id} p={p} className="w-44 shrink-0 snap-start" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((p) => (
            <SmallCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </section>
  );
}

function SmallCard({
  p,
  className = "",
}: {
  p: StoreProduct;
  className?: string;
}) {
  const v = p.variants?.[0];
  const price = v?.calculated_price?.calculated_amount;
  return (
    <Link
      href={`/products/${p.handle || p.id}`}
      className={`group rounded-xl border border-border bg-card overflow-hidden hover:border-accent/40 transition-all duration-300 ${className}`}
    >
      <div className="relative aspect-square bg-premium-image-bg">
        <Image
          src={getProductImage(p)}
          alt={p.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width:768px) 50vw, 20vw"
        />
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="text-xs font-bold line-clamp-2 group-hover:text-accent transition-colors leading-snug">
          {p.title}
        </h3>
        {typeof price === "number" && price > 0 && (
          <div className="flex items-end justify-between">
            <div className="text-sm font-black text-orange-grad">
              {formatMoney(
                price,
                v?.calculated_price?.currency_code || "try"
              )}
            </div>
            <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-molten-grad text-white opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="h-3 w-3" />
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}
