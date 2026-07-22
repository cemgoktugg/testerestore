"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { X, Zap, Truck, ArrowRight, Clock } from "lucide-react";
import { formatMoney, resolveBladeImage } from "../../lib/medusa/format";
import type { ReadyMadeSuggestion } from "../../lib/medusa/services/ready-made";

interface Props {
  open: boolean;
  suggestions: ReadyMadeSuggestion[];
  /** Müşterinin girdiği uzunluk — başlıkta gösterilir. */
  requestedLengthMm: number;
  onClose: () => void;
  /** "Özel boyla devam et" denirse popup kapanır. */
  onContinueCustom: () => void;
}

/**
 * Müşteri uzunluk girdiğinde, eğer hazır stoğumuzda eşleşen ürün varsa
 * açılan modal. Avantaj rozetleri: aynı gün kargo, stoktan, hazır kaynak.
 */
export default function ReadyMadeSuggestionPopup({
  open,
  suggestions,
  requestedLengthMm,
  onClose,
  onContinueCustom,
}: Props) {
  if (!open || suggestions.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-background border border-border rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in slide-in-from-bottom-8 sm:zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-emerald-500/15 via-accent/10 to-orange-500/15 p-6 pb-5 border-b border-border">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-background/60 cursor-pointer"
            aria-label="Kapat"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-lg shrink-0">
              <Zap className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                <Clock className="h-3 w-3" />
                Hızlı Teslimat
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold tracking-tight">
                {requestedLengthMm.toLocaleString("tr-TR")} mm için hazır
                stoğumuzda <span className="text-orange-grad">{suggestions.length}</span>{" "}
                seçenek var!
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Aşağıdaki hazır kaynaklı ürünlerimiz <strong>aynı gün kargoya</strong>{" "}
                verilir. Özel boy üretim 3-7 iş günü sürerken, hazır stoktan
                anında gönderilir.
              </p>
            </div>
          </div>
        </div>

        {/* Liste */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {suggestions.map((s) => (
            <article
              key={s.id}
              className="rounded-xl border border-border bg-card hover:border-accent/40 hover:shadow-md transition-all duration-200 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row gap-4 p-4">
                {/* Görsel */}
                <div className="relative w-full sm:w-28 h-32 sm:h-28 shrink-0 rounded-lg overflow-hidden bg-premium-image-bg border border-border">
                  <Image
                    src={
                      s.thumbnail ||
                      resolveBladeImage({
                        title: s.title,
                        bladeType: s.blade_type,
                      })
                    }
                    alt={s.title}
                    fill
                    className="object-cover"
                    sizes="112px"
                  />
                  {typeof s.inventory_quantity_display === "number" &&
                    s.inventory_quantity_display > 0 &&
                    s.inventory_quantity_display <= 10 && (
                      <div className="absolute top-1 left-1 inline-flex items-center rounded-md bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5">
                        Son {s.inventory_quantity_display}
                      </div>
                    )}
                </div>

                {/* İçerik */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <h3 className="text-base font-bold leading-snug line-clamp-2">
                    {s.title}
                  </h3>

                  {/* Spec rozetleri */}
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <span className="inline-flex items-center rounded-md bg-muted/60 text-foreground px-2 py-0.5 text-[10px] font-bold">
                      {s.width_mm}×{s.thickness_mm} mm
                    </span>
                    {s.tooth_pitch && (
                      <span className="inline-flex items-center rounded-md bg-muted/60 text-foreground px-2 py-0.5 text-[10px] font-bold">
                        {s.tooth_pitch} TPI
                      </span>
                    )}
                    <span className="inline-flex items-center rounded-md bg-accent/10 text-accent px-2 py-0.5 text-[10px] font-bold">
                      {s.length_mm} mm
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 text-[10px] font-bold">
                      <Truck className="h-2.5 w-2.5" />
                      Aynı gün kargoda
                    </span>
                  </div>

                  {/* Fiyat + CTA */}
                  <div className="mt-auto pt-3 flex items-end justify-between gap-3">
                    {typeof s.price === "number" && s.price > 0 ? (
                      <div>
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                          Hazır fiyatı
                        </div>
                        <div className="text-xl font-black text-orange-grad leading-none">
                          {formatMoney(s.price, s.currency_code)}
                        </div>
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground">
                        Fiyat için ürüne gidin
                      </div>
                    )}
                    <Link
                      href={`/products/${s.handle}`}
                      onClick={onClose}
                      className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl bg-molten-grad text-white text-xs font-bold glow-orange cursor-pointer whitespace-nowrap"
                    >
                      İncele <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border bg-muted/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-[11px] text-muted-foreground text-center sm:text-left">
            Özel ölçüde mi istiyorsunuz? Sorun değil — özel boy seçeneğiyle
            devam edebilirsiniz.
          </p>
          <button
            type="button"
            onClick={onContinueCustom}
            className="inline-flex items-center justify-center h-10 px-5 rounded-xl border border-border bg-background hover:bg-muted text-xs font-bold cursor-pointer whitespace-nowrap"
          >
            Özel boyla devam et
          </button>
        </div>
      </div>
    </div>
  );
}
