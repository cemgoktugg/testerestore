"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Clock } from "lucide-react";
import { getRecentlyViewed } from "../../lib/recently-viewed";
import { getProductByHandle } from "../../lib/medusa/services/products";
import { getProductImage, formatMoney } from "../../lib/medusa/format";
import type { StoreProduct } from "../../lib/medusa/types";

interface Props {
  /** Bu sayfadaki ürünü listeden çıkar (örn. ürün detay sayfasında). */
  excludeHandle?: string;
  /** Maks gösterilecek kart sayısı. */
  limit?: number;
  /** Başlık üstüne küçük override yazı. */
  title?: string;
}

/**
 * Son baktığınız ürünler şeridi — sadece localStorage'da kayıt varsa
 * görünür. Sıfırsa hiç render olmaz (CLS yok).
 */
export default function RecentlyViewed({
  excludeHandle,
  limit = 6,
  title = "Son Görüntülediğin Ürünler",
}: Props) {
  const [products, setProducts] = useState<StoreProduct[]>([]);

  useEffect(() => {
    const handles = getRecentlyViewed(excludeHandle).slice(0, limit);
    if (handles.length === 0) return;
    (async () => {
      const results = await Promise.all(
        handles.map((h) => getProductByHandle(h).catch(() => null))
      );
      setProducts(results.filter((p): p is StoreProduct => !!p));
    })();
  }, [excludeHandle, limit]);

  if (products.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border pt-12">
      <div className="flex items-center gap-2 mb-6">
        <Clock className="h-5 w-5 text-accent" />
        <h2 className="text-xl md:text-2xl font-extrabold tracking-tight">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {products.map((p) => {
          const v = p.variants?.[0];
          const price = v?.calculated_price?.calculated_amount;
          return (
            <Link
              key={p.id}
              href={`/products/${p.handle || p.id}`}
              className="group rounded-xl border border-border bg-card overflow-hidden hover:border-accent/40 transition-all duration-300"
            >
              <div className="relative aspect-square bg-premium-image-bg">
                <Image
                  src={getProductImage(p)}
                  alt={p.title}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-500"
                  sizes="(max-width:768px) 50vw, 16vw"
                />
              </div>
              <div className="p-3 space-y-1">
                <h3 className="text-xs font-bold line-clamp-2 group-hover:text-accent transition-colors leading-snug">
                  {p.title}
                </h3>
                {typeof price === "number" && price > 0 && (
                  <div className="text-sm font-black text-orange-grad">
                    {formatMoney(
                      price,
                      v?.calculated_price?.currency_code || "try"
                    )}
                  </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
