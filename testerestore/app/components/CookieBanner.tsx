"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, X, Check } from "lucide-react";

/**
 * KVKK / e-Privacy uyumlu çerez bilgilendirme banner'ı.
 *
 * Tercih `localStorage`'da saklanır:
 *   - "accepted" : tüm çerezler (zorunlu + analytic + marketing)
 *   - "necessary": yalnızca zorunlu çerezler
 *
 * Reklam/analitik scriptlerin `getCookieConsent()` ile bu değeri okuyup
 * koşullu yüklenmesi gerekir.
 */
const STORAGE_KEY = "ts_cookie_consent";

export type CookieConsent = "accepted" | "necessary" | null;

export function getCookieConsent(): CookieConsent {
  if (typeof window === "undefined") return null;
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "accepted" || v === "necessary" ? v : null;
  } catch {
    return null;
  }
}

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Çerez tercihi yoksa banner'ı göster
    if (getCookieConsent() === null) {
      // Kısa bir gecikme — CLS engellemek için
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  const persist = (value: "accepted" | "necessary") => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* ignore */
    }
    setVisible(false);
    // Tüketicilerin reaktif olması için custom event
    window.dispatchEvent(
      new CustomEvent("cookie-consent-changed", { detail: value })
    );
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Çerez Tercihleri"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-4"
    >
      <div className="mx-auto max-w-5xl rounded-2xl border border-border bg-background/95 backdrop-blur-md shadow-[0_20px_60px_rgba(0,0,0,0.45)] p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex-shrink-0 hidden sm:flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Cookie className="h-5 w-5" />
          </div>
          <div className="flex-1 space-y-2 text-xs sm:text-sm leading-relaxed">
            <h3 className="font-bold text-sm sm:text-base text-foreground">
              Çerez Kullanımı
            </h3>
            <p className="text-muted-foreground">
              Web sitemizdeki deneyiminizi iyileştirmek, site kullanımını
              analiz etmek ve ilgi alanlarınıza uygun içerik sunmak için
              çerezler kullanıyoruz. &quot;Tümünü Kabul Et&quot; ile devam ederek
              analitik ve pazarlama çerezlerini onaylamış olursunuz.
              Tercihlerinizi istediğiniz zaman tarayıcı ayarlarınızdan
              değiştirebilirsiniz.{" "}
              <Link
                href="/yasal/cerez-politikasi"
                className="text-accent hover:underline font-semibold"
              >
                Çerez Politikası
              </Link>
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto sm:items-center sm:self-center">
            <button
              type="button"
              onClick={() => persist("necessary")}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border bg-silver-grad px-4 text-xs font-bold cursor-pointer hover:bg-muted transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Sadece Zorunlu
            </button>
            <button
              type="button"
              onClick={() => persist("accepted")}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-molten-grad px-5 text-xs font-bold text-white glow-orange cursor-pointer"
            >
              <Check className="h-3.5 w-3.5" />
              Tümünü Kabul Et
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
