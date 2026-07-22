"use client";

import React from "react";
import {
  ShieldCheck,
  Lock,
  Truck,
  RotateCcw,
  CreditCard,
  Award,
} from "lucide-react";

/**
 * Üç farklı varyant — ihtiyaca göre yerleştir:
 *   - "row": footer/checkout altına 4 sütunlu rozet sırası
 *   - "compact": ürün/sepet kenarında dikey kart
 *   - "banner": checkout üstünde tek satır güvenlik rozetleri
 */
interface Props {
  variant?: "row" | "compact" | "banner";
}

const ITEMS = [
  {
    icon: Lock,
    title: "256-bit SSL",
    desc: "Tüm bağlantılar şifrelidir",
  },
  {
    icon: ShieldCheck,
    title: "Güvenli Ödeme",
    desc: "3D Secure & PCI-DSS uyumlu",
  },
  {
    icon: Truck,
    title: "Aynı Gün Kargo",
    desc: "14:00'a kadar siparişler",
  },
  {
    icon: RotateCcw,
    title: "14 Gün İade",
    desc: "Cayma hakkı korumalı",
  },
];

export default function TrustSignals({ variant = "row" }: Props) {
  if (variant === "banner") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Lock className="h-3.5 w-3.5 text-emerald-600" />
          256-bit SSL Şifreli
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
          3D Secure Ödeme
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Award className="h-3.5 w-3.5 text-emerald-600" />
          ETBİS Kayıtlı E-Ticaret
        </span>
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
          Iyzico Korumalı
        </span>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <ul className="space-y-2 text-xs">
        {ITEMS.map(({ icon: Icon, title, desc }) => (
          <li key={title} className="flex items-start gap-2">
            <Icon className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">{title}</div>
              <div className="text-muted-foreground text-[10px]">{desc}</div>
            </div>
          </li>
        ))}
      </ul>
    );
  }

  // "row"
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-8">
      {ITEMS.map(({ icon: Icon, title, desc }) => (
        <div
          key={title}
          className="flex flex-col items-center text-center p-4 rounded-xl bg-card border border-border hover:border-accent/30 transition-colors"
        >
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 mb-2">
            <Icon className="h-6 w-6" />
          </div>
          <div className="text-sm font-bold">{title}</div>
          <div className="text-[11px] text-muted-foreground mt-0.5">{desc}</div>
        </div>
      ))}
    </div>
  );
}
