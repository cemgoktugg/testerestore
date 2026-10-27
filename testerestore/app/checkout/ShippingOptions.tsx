'use client';

import { Truck, Zap } from 'lucide-react';
import { formatMoney } from '../../lib/medusa/format';
import { amountToFreeShipping, FREE_SHIPPING_THRESHOLD, shippingWithKdv } from '../../lib/shipping';
import type { CartShippingOption } from '../../lib/medusa/services/cart';

/**
 * Kargo seçenekleri — fiyatlar SUNUCUDA, bu sepet için hesaplanmış olarak gelir
 * (ücretsiz kargo kuralı Medusa'da). Tek seçenek varsa otomatik seçili gösterilir.
 */
export default function ShippingOptions({
  options,
  selectedId,
  onSelect,
  loading,
  itemSubtotal,
  currency,
}: {
  options: CartShippingOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  /** KDV hariç ara toplam — ücretsiz kargoya kalan tutar için */
  itemSubtotal: number;
  currency: string;
}) {
  const remaining = amountToFreeShipping(itemSubtotal);
  // İpucu yalnızca sunucu standart kargoyu gerçekten ücretli hesapladıysa
  // gösterilir (tarayıcıdaki KDV yuvarlaması eşik sınırında sunucuyla
  // çelişmesin).
  const standardPaid = options.some((o) => o.typeCode === 'standard' && o.amount > 0);

  if (loading && !options.length) {
    return <p className="text-xs text-muted-foreground">Kargo seçenekleri yükleniyor…</p>;
  }
  if (!options.length) {
    return (
      <p className="text-xs text-muted-foreground">
        Kargo seçenekleri şu an yüklenemedi; siparişinizde standart kargo uygulanır.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div role="radiogroup" aria-label="Kargo seçeneği" className="space-y-2">
        {options.map((o) => {
          const active = o.id === selectedId;
          const express = o.typeCode === 'express';
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onSelect(o.id)}
              className={`w-full flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition-all cursor-pointer ${
                active ? 'border-accent bg-accent/10' : 'border-border bg-background hover:border-accent/40'
              }`}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                    active ? 'border-accent' : 'border-muted-foreground/40'
                  }`}
                  aria-hidden="true"
                >
                  {active && <span className="h-2 w-2 rounded-full bg-accent" />}
                </span>
                {express ? <Zap className="h-4 w-4 text-accent" /> : <Truck className="h-4 w-4 text-accent" />}
                <span className="text-sm font-semibold text-foreground">{o.name}</span>
              </span>
              <span className={`text-sm font-bold ${o.amount === 0 ? 'text-emerald-600' : 'text-foreground'}`}>
                {o.amount === 0
                  ? 'Ücretsiz'
                  : `${formatMoney(shippingWithKdv(o.amount, o.taxInclusive), currency)} (KDV dahil)`}
              </span>
            </button>
          );
        })}
      </div>
      {standardPaid && remaining > 0 && itemSubtotal > 0 && (
        <p className="text-[11px] text-muted-foreground">
          Sepetinize KDV dahil <strong className="text-foreground">{formatMoney(remaining, currency)}</strong> daha
          ürün eklerseniz standart kargo ücretsiz olur (KDV dahil {formatMoney(FREE_SHIPPING_THRESHOLD, currency)} ve
          üzeri siparişlerde kargo ücretsiz).
        </p>
      )}
    </div>
  );
}
