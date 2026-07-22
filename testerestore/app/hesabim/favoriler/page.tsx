"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import WishlistButton from "../../components/WishlistButton";
import { getWishlist } from "../../../lib/wishlist";
import { getProductByHandle } from "../../../lib/medusa/services/products";
import { formatMoney, getProductImage } from "../../../lib/medusa/format";
import type { StoreProduct } from "../../../lib/medusa/types";
import { Heart, ArrowLeft, Loader2, ShoppingBag } from "lucide-react";

export default function WishlistPage() {
  const [items, setItems] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(true);

  async function reload() {
    setLoading(true);
    const handles = getWishlist();
    if (handles.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    const results = await Promise.all(
      handles.map((h) => getProductByHandle(h).catch(() => null))
    );
    setItems(results.filter((p): p is StoreProduct => !!p));
    setLoading(false);
  }

  useEffect(() => {
    reload();
    const onChange = () => reload();
    window.addEventListener("wishlist-changed", onChange);
    return () => window.removeEventListener("wishlist-changed", onChange);
  }, []);

  return (
    <>
      <Header />
      <main className="flex-1 py-8 md:py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/hesabim"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Hesabıma Dön
          </Link>

          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border">
            <Heart className="h-6 w-6 text-rose-500" />
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Favorilerim
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {items.length > 0
                  ? `${items.length} ürün`
                  : "Henüz favori eklemediniz"}
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-metallic-card p-8 max-w-md mx-auto space-y-4">
              <Heart className="h-12 w-12 mx-auto text-muted-foreground/40" />
              <div>
                <h2 className="text-xl font-bold">Favoriler listeniz boş</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Beğendiğiniz ürünlerin sağ üst köşesindeki kalp ikonuna
                  basarak favorilerinize ekleyebilirsiniz.
                </p>
              </div>
              <Link
                href="/"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-molten-grad text-white text-sm font-bold px-6 glow-orange"
              >
                <ShoppingBag className="h-4 w-4" /> Ürünleri Keşfet
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {items.map((p) => {
                const v = p.variants?.[0];
                const price = v?.calculated_price?.calculated_amount;
                return (
                  <article
                    key={p.id}
                    className="relative group rounded-2xl border border-border bg-card overflow-hidden hover:border-accent/40 transition-all duration-300"
                  >
                    <Link
                      href={`/products/${p.handle || p.id}`}
                      className="block"
                    >
                      <div className="relative aspect-square bg-premium-image-bg overflow-hidden">
                        <Image
                          src={getProductImage(p)}
                          alt={p.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                          sizes="(max-width:768px) 100vw, 25vw"
                        />
                      </div>
                      <div className="p-4 space-y-2">
                        <h3 className="text-sm font-bold line-clamp-2 group-hover:text-accent transition-colors">
                          {p.title}
                        </h3>
                        {p.subtitle && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {p.subtitle}
                          </p>
                        )}
                        {typeof price === "number" && price > 0 && (
                          <div className="text-base font-black text-orange-grad pt-1">
                            {formatMoney(
                              price,
                              v?.calculated_price?.currency_code || "try"
                            )}
                          </div>
                        )}
                      </div>
                    </Link>
                    <WishlistButton
                      handle={p.handle || p.id}
                      variant="overlay"
                    />
                  </article>
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
