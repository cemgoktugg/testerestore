"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { listProducts } from "../../lib/medusa/services/products";
import { formatMoney, getProductImage } from "../../lib/medusa/format";
import type { StoreProduct } from "../../lib/medusa/types";
import { Loader2, Package, ArrowLeft, Search } from "lucide-react";

export default function SearchPage() {
  const params = useSearchParams();
  const q = params?.get("q") ?? "";
  const [results, setResults] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!q.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    listProducts({ q, limit: 50 })
      .then(({ products, count }) => {
        setResults(products);
        setCount(count);
      })
      .finally(() => setLoading(false));
  }, [q]);

  return (
    <>
      <Header />
      <main className="flex-1 py-8 md:py-12 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Ana Sayfa
          </Link>

          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <Search className="h-6 w-6 text-accent" />
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Arama Sonuçları
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {q ? (
                  <>
                    <span className="font-semibold text-foreground">&quot;{q}&quot;</span>{" "}
                    için <span className="font-bold">{count}</span> ürün bulundu
                  </>
                ) : (
                  "Aramak için arama kutusunu kullanın"
                )}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-metallic-card p-8 space-y-4">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <div>
                <h2 className="text-xl font-bold">Sonuç bulunamadı</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Farklı bir terimle aramayı deneyin veya kategorilerimize göz atın.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center rounded-xl bg-molten-grad text-white text-sm font-bold px-6 glow-orange"
              >
                Ürünleri Keşfet
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((p) => {
                const variant = p.variants?.[0];
                const price = variant?.calculated_price?.calculated_amount;
                return (
                  <Link
                    key={p.id}
                    href={`/products/${p.handle || p.id}`}
                    className="group rounded-2xl border border-border bg-metallic-card overflow-hidden hover:border-accent/40 hover:-translate-y-1 transition-all duration-300"
                  >
                    <div className="relative aspect-[4/3] bg-premium-image-bg overflow-hidden">
                      <Image
                        src={getProductImage(p)}
                        alt={p.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width:768px) 100vw, 33vw"
                      />
                    </div>
                    <div className="p-5 space-y-2">
                      <h3 className="text-base font-bold group-hover:text-accent transition-colors line-clamp-1">
                        {p.title}
                      </h3>
                      {p.subtitle && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {p.subtitle}
                        </p>
                      )}
                      {typeof price === "number" && price > 0 && (
                        <div className="pt-2 text-lg font-black text-orange-grad">
                          {formatMoney(
                            price,
                            variant?.calculated_price?.currency_code || "try"
                          )}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
