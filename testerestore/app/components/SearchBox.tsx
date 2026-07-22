"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Search, X, Loader2, Package } from "lucide-react";
import { listProducts } from "../../lib/medusa/services/products";
import { formatMoney, getProductImage } from "../../lib/medusa/format";
import type { StoreProduct } from "../../lib/medusa/types";

/**
 * Header search box. Two surfaces:
 *   - Desktop: inline input with dropdown of top 6 matches.
 *   - Mobile : icon-only trigger that opens a full-screen overlay.
 *
 * Debounce: 250ms. Q is sent to Medusa /store/products?q=… which already
 * does ILIKE matching on title + description.
 */
const DEBOUNCE_MS = 250;
const MAX_SUGGESTIONS = 6;

interface SearchBoxProps {
  variant?: "desktop" | "mobile";
  /** Header'da iki satırlı düzende geniş bant olarak kullanmak için. */
  wide?: boolean;
}

export default function SearchBox({
  variant = "desktop",
  wide = false,
}: SearchBoxProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dış tıklama → kapat
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Esc → kapat
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Debounced fetch
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { products } = await listProducts({
          q,
          limit: MAX_SUGGESTIONS,
        });
        setResults(products);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Mobile açılınca input'a focus
  useEffect(() => {
    if (mobileOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [mobileOpen]);

  const submit = () => {
    const q = query.trim();
    if (!q) return;
    setOpen(false);
    setMobileOpen(false);
    router.push(`/arama?q=${encodeURIComponent(q)}`);
  };

  if (variant === "mobile") {
    return (
      <>
        <button
          type="button"
          aria-label="Ara"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg hover:bg-muted transition-colors cursor-pointer md:hidden"
        >
          <Search className="h-4 w-4" />
        </button>
        {mobileOpen && (
          <div className="fixed inset-0 z-[120] bg-background/95 backdrop-blur-md md:hidden">
            <div className="p-4 border-b border-border flex items-center gap-3">
              <Search className="h-5 w-5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit()}
                placeholder="Ürün ara..."
                className="flex-1 bg-transparent text-base font-medium focus:outline-none"
              />
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  setQuery("");
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted cursor-pointer"
                aria-label="Kapat"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto h-[calc(100%-65px)]">
              <Suggestions
                query={query}
                results={results}
                loading={loading}
                onPick={() => setMobileOpen(false)}
                onSeeAll={submit}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  // Desktop
  return (
    <div
      ref={wrapperRef}
      className={`relative ${wide ? "block w-full" : "hidden md:block w-full max-w-sm"}`}
    >
      <div className="relative">
        <Search
          className={`absolute left-3 top-1/2 -translate-y-1/2 ${
            wide ? "h-5 w-5" : "h-4 w-4"
          } text-muted-foreground`}
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={
            wide
              ? "Ürün, kategori veya marka ara..."
              : "Ürün ara..."
          }
          className={`w-full ${
            wide ? "h-11 pl-11 pr-11 text-sm rounded-xl" : "h-9 pl-9 pr-9 text-sm rounded-lg"
          } border border-border bg-muted/40 focus:bg-background focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all`}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              inputRef.current?.focus();
            }}
            className={`absolute right-2 top-1/2 -translate-y-1/2 inline-flex ${
              wide ? "h-7 w-7" : "h-6 w-6"
            } items-center justify-center rounded hover:bg-muted cursor-pointer`}
            aria-label="Temizle"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && query.trim().length >= 2 && (
        <div className="absolute top-full mt-2 left-0 right-0 rounded-xl border border-border bg-background shadow-[0_12px_36px_rgba(0,0,0,0.25)] overflow-hidden z-50">
          <Suggestions
            query={query}
            results={results}
            loading={loading}
            onPick={() => setOpen(false)}
            onSeeAll={submit}
          />
        </div>
      )}
    </div>
  );
}

function Suggestions({
  query,
  results,
  loading,
  onPick,
  onSeeAll,
}: {
  query: string;
  results: StoreProduct[];
  loading: boolean;
  onPick: () => void;
  onSeeAll: () => void;
}) {
  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
        <span className="text-xs">Aranıyor...</span>
      </div>
    );
  }
  if (query.trim().length < 2) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground">
        En az 2 harf yazın
      </div>
    );
  }
  if (!results.length) {
    return (
      <div className="p-6 text-center space-y-2">
        <Package className="h-8 w-8 mx-auto text-muted-foreground/50" />
        <div className="text-xs text-muted-foreground">
          &quot;{query}&quot; için sonuç bulunamadı
        </div>
      </div>
    );
  }
  return (
    <>
      <ul className="divide-y divide-border/50 max-h-[60vh] overflow-y-auto">
        {results.map((p) => {
          const variant = p.variants?.[0];
          const price = variant?.calculated_price?.calculated_amount;
          return (
            <li key={p.id}>
              <Link
                href={`/products/${p.handle || p.id}`}
                onClick={onPick}
                className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors"
              >
                <div className="relative w-14 h-14 shrink-0 rounded-lg overflow-hidden bg-muted border border-border">
                  <Image
                    src={getProductImage(p)}
                    alt={p.title}
                    fill
                    className="object-cover"
                    sizes="56px"
                  />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="text-sm font-bold leading-snug line-clamp-2">
                    {p.title}
                  </div>
                  {p.subtitle && (
                    <div className="text-[11px] text-muted-foreground line-clamp-1">
                      {p.subtitle}
                    </div>
                  )}
                  {typeof price === "number" && price > 0 && (
                    <div className="text-sm font-bold text-orange-grad pt-0.5">
                      {formatMoney(
                        price,
                        variant?.calculated_price?.currency_code || "try"
                      )}
                    </div>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={onSeeAll}
        className="w-full p-3 text-center text-xs font-bold text-accent hover:bg-muted/50 border-t border-border cursor-pointer"
      >
        Tüm sonuçları gör →
      </button>
    </>
  );
}
