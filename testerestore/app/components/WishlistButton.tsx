"use client";

import React, { useEffect, useState } from "react";
import { Heart } from "lucide-react";
import { isInWishlist, toggleWishlist } from "../../lib/wishlist";

interface Props {
  handle: string;
  /** Floating overlay button (ürün kart resmi üstünde) veya inline (ürün
   *  detayda butonun yanında) — varyant. */
  variant?: "overlay" | "inline";
  /** Inline modda metin gösterilsin mi? */
  showLabel?: boolean;
}

/**
 * Ürün kartına / detay sayfasına eklenen kalp butonu. Wishlist localStorage
 * üzerinden kalıcı. Tıklamada ✓ animasyon.
 */
export default function WishlistButton({
  handle,
  variant = "overlay",
  showLabel = false,
}: Props) {
  const [active, setActive] = useState(false);
  const [popping, setPopping] = useState(false);

  useEffect(() => {
    setActive(isInWishlist(handle));
    const sync = () => setActive(isInWishlist(handle));
    window.addEventListener("wishlist-changed", sync);
    return () => window.removeEventListener("wishlist-changed", sync);
  }, [handle]);

  function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleWishlist(handle);
    setActive(added);
    if (added) {
      setPopping(true);
      setTimeout(() => setPopping(false), 400);
    }
  }

  if (variant === "inline") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={active ? "Favorilerden çıkar" : "Favorilere ekle"}
        className={`inline-flex items-center gap-2 rounded-xl h-10 px-4 text-xs font-bold border transition-all cursor-pointer ${
          active
            ? "border-rose-500/40 bg-rose-500/10 text-rose-600"
            : "border-border bg-card hover:border-rose-500/40 hover:text-rose-600"
        }`}
      >
        <Heart
          className={`h-4 w-4 transition-transform ${active ? "fill-rose-500 text-rose-500" : ""} ${
            popping ? "scale-125" : ""
          }`}
        />
        {showLabel && <span>{active ? "Favorilerde" : "Favorilere Ekle"}</span>}
      </button>
    );
  }

  // overlay
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? "Favorilerden çıkar" : "Favorilere ekle"}
      className={`absolute top-3 right-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-black/55 backdrop-blur-md transition-all duration-300 cursor-pointer ${
        active
          ? "border-rose-500/60 text-rose-400 hover:bg-rose-500/20"
          : "border-white/15 text-white/90 hover:text-rose-400 hover:border-rose-500/40"
      }`}
    >
      <Heart
        className={`h-4 w-4 transition-transform ${active ? "fill-rose-500 text-rose-500" : ""} ${
          popping ? "scale-125" : ""
        }`}
      />
    </button>
  );
}
