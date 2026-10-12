'use client';

/**
 * Hazır (ready-made) boy ürünler için satın alma paneli.
 *
 * Hazır ürün önceden kaynaklı, tek SKU, sabit fiyatlıdır — bu yüzden
 * BladeConfigurator'ın parametrik akışı (genişlik/kalınlık/diş adımı seçimi,
 * metre × uzunluk fiyatlaması) burada KULLANILMAZ. Ölçüler salt-okunur
 * gösterilir, fiyat Medusa varyantının kendi fiyatıdır ve sepete `bladeMatrix`
 * olmadan eklenir ki Medusa varyantın statik fiyatını yazsın.
 */

import { useState } from 'react';
import { PackageCheck, Truck, ShoppingCart, Sparkles, Ruler } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { formatMoney } from '../../lib/medusa/format';
import { mapReadyMadeCard } from '../../lib/ready-made';
import { MEDUSA_READY } from '../../lib/medusa/config';
import type { StoreProduct } from '../../lib/medusa/types';

interface Props {
  product: StoreProduct;
  /** Sepetteki küçük görsel — detay sayfasının çözdüğü ana görsel. */
  image: string;
  /** Rozet metni (ör. "Bi-Metal"). */
  categoryLabel?: string;
}

export default function ReadyMadeBuyBox({ product, image, categoryLabel }: Props) {
  const { addToCart, addToMedusaCart } = useCart();
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const card = mapReadyMadeCard(product);
  const variant = product.variants?.[0];
  const unitPrice = card.price;
  const currency = card.currency;

  const specRows: Array<{ label: string; value: string }> = [];
  if (card.width != null) specRows.push({ label: 'Genişlik', value: `${card.width} mm` });
  if (card.thickness != null) specRows.push({ label: 'Kalınlık', value: `${card.thickness} mm` });
  if (card.tooth) specRows.push({ label: 'Diş Adımı', value: `${card.tooth} TPI` });
  if (card.length != null) specRows.push({ label: 'Boy', value: `${card.length.toLocaleString('tr-TR')} mm` });

  const handleAdd = async () => {
    if (busy) return;
    setBusy(true);
    setAddError(null);
    try {
      const legacy = {
        id: `${product.handle || product.id}-hazir`,
        productId: product.handle || product.id,
        name: product.title,
        image,
        type: 'blade' as const,
        specs: {
          width: card.width != null ? `${card.width} mm` : undefined,
          thickness: card.thickness != null ? `${card.thickness} mm` : undefined,
          tpi: card.tooth ?? undefined,
          length: card.length ?? undefined,
        },
        price: unitPrice,
      };

      // bladeMatrix GÖNDERİLMEZ — hazır üründe fiyat matristen değil, varyantın
      // kendi fiyatından gelir.
      if (variant && MEDUSA_READY) {
        await addToMedusaCart({
          variantId: variant.id,
          quantity,
          metadata: {
            is_ready_made: true,
            width_mm: card.width,
            thickness_mm: card.thickness,
            tooth_pitch: card.tooth,
            length_mm: card.length,
            unit_price_at_add: unitPrice,
          },
          legacy,
        });
      } else {
        addToCart(legacy, quantity);
      }

      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    } catch {
      setAddError('Ürün sepete eklenemedi. Lütfen tekrar deneyin; sorun sürerse bizimle iletişime geçin.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl bg-metallic-card p-6 shadow-sm space-y-6">
      {/* Başlık */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center justify-between gap-3 mb-1">
          <span className="text-xs font-bold text-accent uppercase tracking-wider">
            Hazır Boy
          </span>
          {categoryLabel && (
            <span className="rounded-full bg-muted/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {categoryLabel}
            </span>
          )}
        </div>
        <h2 className="text-xl font-bold tracking-tight leading-snug">{product.title}</h2>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-500">
            <PackageCheck className="h-3.5 w-3.5" />
            Stokta
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-500">
            <Truck className="h-3.5 w-3.5" />
            {card.stock != null ? `${card.stock} adet · aynı gün kargo` : 'Aynı gün kargo'}
          </span>
        </div>
      </div>

      {/* Sabit ölçüler — seçilebilir değil, önceden kaynaklı */}
      <div>
        <div className="mb-2 flex items-center gap-2">
          <Ruler className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Ölçüler (sabit)
          </span>
        </div>
        <dl className="grid grid-cols-2 gap-2">
          {specRows.map((row) => (
            <div
              key={row.label}
              className="rounded-lg border border-border bg-background/60 px-3 py-2.5"
            >
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {row.label}
              </dt>
              <dd className="mt-0.5 text-sm font-bold text-foreground">{row.value}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-2.5 text-[11px] leading-relaxed text-muted-foreground">
          Bu ürün önceden alın kaynaklı, standart ölçüde hazırdır. Farklı bir ölçüye
          ihtiyacınız varsa ana üründen özel boy hesaplatabilirsiniz.
        </p>
      </div>

      {/* Adet */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
          Adet
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Adet azalt"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-silver-grad text-lg font-bold cursor-pointer"
          >
            -
          </button>
          <input
            type="number"
            min={1}
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-10 w-16 rounded-lg border border-border bg-background text-center text-sm font-bold focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setQuantity((q) => q + 1)}
            aria-label="Adet artır"
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-silver-grad text-lg font-bold cursor-pointer"
          >
            +
          </button>
        </div>
      </div>

      {/* Fiyat özeti */}
      <div className="rounded-xl bg-muted/40 p-4 border border-border space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Birim fiyat:</span>
          <span className="font-semibold text-foreground">
            {formatMoney(unitPrice, currency)}
          </span>
        </div>
        {quantity > 1 && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Adet:</span>
            <span className="font-semibold text-foreground">× {quantity}</span>
          </div>
        )}
        <div className="border-t border-border pt-2 flex justify-between items-center mt-2">
          <span className="text-sm font-bold">Toplam Tutar:</span>
          <span className="text-xl font-black text-orange-grad">
            {formatMoney(unitPrice * quantity, currency)}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleAdd}
        disabled={busy || unitPrice <= 0}
        className={`w-full flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white transition-all duration-300 shadow-md cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
          added ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-molten-grad glow-orange shadow-md'
        }`}
      >
        {added ? (
          <>
            <Sparkles className="h-4 w-4" /> Sepete Eklendi!
          </>
        ) : (
          <>
            <ShoppingCart className="h-4 w-4" /> Sepete Ekle
          </>
        )}
      </button>
      {addError && (
        <p role="alert" className="text-xs font-semibold text-rose-600">
          {addError}
        </p>
      )}
    </div>
  );
}
