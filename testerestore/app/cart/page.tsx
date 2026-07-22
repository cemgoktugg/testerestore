'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import { Trash2, ShoppingBag, ArrowRight, ArrowLeft, Loader2, Tag, CheckCircle2 } from 'lucide-react';
import { formatMoney } from '../../lib/medusa/format';
import { MEDUSA_READY } from '../../lib/medusa/config';
import { applyPromoCode, removePromoCode } from '../../lib/medusa/services/cart';
import {
  summarizeOrder,
  amountToFreeShipping,
  qualifiesForFreeShipping,
  FREE_SHIPPING_THRESHOLD,
} from '../../lib/shipping';
import CrossSell from '../components/CrossSell';

export default function CartPage() {
  const {
    cart,
    medusaCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    refreshCart,
    cartTotal,
    cartCount,
    loading,
  } = useCart();
  const [promoInput, setPromoInput] = useState('');
  const [promoApplying, setPromoApplying] = useState(false);
  const [promoMessage, setPromoMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const appliedPromos = ((medusaCart as any)?.promotions ?? []) as Array<{
    code: string;
    is_automatic?: boolean;
  }>;

  async function handleApplyPromo() {
    const code = promoInput.trim();
    if (!code) return;
    setPromoApplying(true);
    setPromoMessage(null);
    const res = await applyPromoCode(code);
    setPromoApplying(false);
    if (res.ok) {
      await refreshCart();
      const wasApplied = (res.cart?.promotions ?? []).some(
        (p) => p.code === code
      );
      if (wasApplied) {
        setPromoMessage({ type: 'success', text: 'Kupon uygulandı' });
        setPromoInput('');
      } else {
        setPromoMessage({
          type: 'error',
          text: 'Bu kupon kodu geçersiz veya bu sepete uygulanamaz.',
        });
      }
    } else {
      setPromoMessage({
        type: 'error',
        text: 'Kupon uygulanamadı. Kodu kontrol edin.',
      });
    }
  }

  async function handleRemovePromo(code: string) {
    await removePromoCode(code);
    await refreshCart();
    setPromoMessage(null);
  }

  // Order summary. Shipping follows the free-over-2000 rule and KDV is charged
  // on items + shipping, so this breakdown equals exactly what Medusa charges
  // at checkout (the server attaches the same shipping method there).
  const currency = (medusaCart?.currency_code as string | undefined) || 'try';
  const subTotal =
    typeof medusaCart?.item_subtotal === 'number'
      ? (medusaCart.item_subtotal as number)
      : typeof medusaCart?.subtotal === 'number'
      ? (medusaCart.subtotal as number)
      : cartTotal;
  const discount =
    typeof medusaCart?.discount_total === 'number'
      ? (medusaCart.discount_total as number)
      : 0;
  const summary = summarizeOrder(subTotal, discount);
  const kdv = summary.kdv;
  const shippingCost = summary.shipping;
  const grandTotal = summary.total;
  const freeShipping = qualifiesForFreeShipping(subTotal);
  const remainingForFree = amountToFreeShipping(subTotal);
  const freeProgress = Math.min(
    100,
    Math.round((subTotal / FREE_SHIPPING_THRESHOLD) * 100)
  );

  if (loading && cart.length === 0) {
    return (
      <>
        <Header />
        <main className="flex-1 py-8 md:py-16 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-[40vh]">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <main className="flex-1 py-8 md:py-16 bg-background">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-border">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Alışveriş Sepetim <span className="text-primary">({cartCount})</span>
            </h1>
            <div className="flex items-center gap-4">
              {cart.length > 0 && (
                <button
                  onClick={() => {
                    if (
                      confirm(
                        "Sepetinizdeki tüm ürünler silinecek. Devam edilsin mi?"
                      )
                    ) {
                      clearCart();
                    }
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-500 transition-colors cursor-pointer"
                  title="Sepetteki tüm ürünleri sil ve yeni sepet başlat"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Sepeti Temizle</span>
                </button>
              )}
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Alışverişe Devam Et</span>
              </Link>
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-metallic-card p-8 max-w-2xl mx-auto space-y-6">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShoppingBag className="h-8 w-8" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight">Sepetiniz Boş</h2>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                  Sepetinizde henüz ürün bulunmuyor. Şerit testere bıçaklarımızı veya
                  makinelerimizi inceleyerek hemen sipariş oluşturabilirsiniz.
                </p>
              </div>
              <div className="pt-2">
                <Link
                  href="/"
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-molten-grad text-sm font-bold text-white px-8 transition-all duration-300 glow-orange cursor-pointer"
                >
                  Ürünleri Keşfet
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
              <div className="lg:col-span-8 space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-metallic-card hover:border-border/80 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted border border-border">
                        <Image
                          src={item.image}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="80px"
                        />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-foreground leading-snug">
                          {item.name}
                        </h3>
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-[11px] text-muted-foreground font-medium">
                          {item.type === 'blade' ? (
                            <>
                              {item.specs.width && <><span>Genişlik: {item.specs.width}</span><span>•</span></>}
                              {item.specs.thickness && <><span>Kalınlık: {item.specs.thickness}</span><span>•</span></>}
                              {item.specs.tpi && <><span>Hatve: {item.specs.tpi}</span><span>•</span></>}
                              {item.specs.length ? (
                                <span>
                                  Boy: <strong className="text-foreground">{item.specs.length} mm</strong>
                                </span>
                              ) : null}
                            </>
                          ) : (
                            <>
                              {item.specs.width && <><span>Bağlantı: {item.specs.width}</span><span>•</span></>}
                              {item.specs.thickness && <><span>Alt Stant: {item.specs.thickness}</span><span>•</span></>}
                              {item.specs.tpi && <span>Kılavuz: {item.specs.tpi}</span>}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-border/60">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-silver-grad text-sm font-bold cursor-pointer"
                        >
                          -
                        </button>
                        <span className="w-10 text-center text-xs font-bold select-none">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-lg bg-silver-grad text-sm font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>

                      <div className="text-right min-w-[100px]">
                        <span className="block text-[10px] text-muted-foreground font-bold uppercase">
                          Tutar
                        </span>
                        <span className="text-sm font-black text-foreground">
                          {formatMoney(item.price * item.quantity, currency)}
                        </span>
                        <span className="block text-[9px] text-muted-foreground">
                          ({formatMoney(item.price, currency)} / adet)
                        </span>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="rounded-lg p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-all cursor-pointer"
                        title="Ürünü Sepetten Çıkar"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="lg:col-span-4 space-y-4">
                {/* Aciliyet rozetleri */}
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    14:00&apos;a kadar siparişler aynı gün kargoda
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-blue-700 dark:text-blue-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    14 gün koşulsuz iade hakkı
                  </div>
                  <div className="flex items-center gap-2 text-xs font-bold text-orange-700 dark:text-orange-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                    Stoktaki son ürünleriniz hazır
                  </div>
                </div>

                <div className="rounded-2xl bg-metallic-card p-6 shadow-sm">
                <h2 className="text-base font-bold uppercase tracking-wider text-foreground border-b border-border pb-3 mb-4">
                  Sipariş Özeti
                </h2>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Ara Toplam {medusaCart ? '' : '(KDV Hariç)'}</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(subTotal, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>KDV {medusaCart ? '' : '(%20)'}</span>
                    <span className="font-semibold text-foreground">
                      {formatMoney(kdv, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Kargo Ücreti</span>
                    <span className="font-semibold text-foreground">
                      {shippingCost === 0 ? (
                        <strong className="text-emerald-500 font-bold uppercase">
                          Ücretsiz
                        </strong>
                      ) : (
                        formatMoney(shippingCost, currency)
                      )}
                    </span>
                  </div>

                  {subTotal > 0 && (
                    freeShipping ? (
                      <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-2.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 leading-snug">
                        🎉 Tebrikler! Siparişiniz <strong>ücretsiz kargo</strong> kazandı.
                      </div>
                    ) : (
                      <div className="rounded-lg bg-primary/5 border border-primary/10 p-2.5 space-y-2">
                        <p className="text-[11px] text-primary/95 leading-snug">
                          Ücretsiz kargoya{' '}
                          <strong>{formatMoney(remainingForFree, currency)}</strong>{' '}
                          kaldı! Sepetinize bu tutarda ürün daha ekleyin, kargo bizden.
                        </p>
                        <div className="h-1.5 w-full rounded-full bg-primary/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${freeProgress}%` }}
                          />
                        </div>
                      </div>
                    )
                  )}

                  {/* Indirim göstergesi (Medusa promotion uygulandıysa) */}
                  {typeof medusaCart?.discount_total === 'number' &&
                    medusaCart.discount_total > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span className="inline-flex items-center gap-1.5 font-bold">
                          <Tag className="h-3.5 w-3.5" /> İndirim
                        </span>
                        <span className="font-semibold">
                          − {formatMoney(medusaCart.discount_total, currency)}
                        </span>
                      </div>
                    )}

                  {/* Kupon kodu — uygulanmışları göster + yeni girişi */}
                  <div className="border-t border-border pt-3 mt-1 space-y-2">
                    {appliedPromos.length > 0 && (
                      <div className="space-y-1.5">
                        {appliedPromos.map((p) => (
                          <div
                            key={p.code}
                            className="flex items-center justify-between rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5"
                          >
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {p.code}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleRemovePromo(p.code)}
                              className="text-[10px] text-muted-foreground hover:text-rose-600 cursor-pointer"
                            >
                              Kaldır
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value.toUpperCase());
                          setPromoMessage(null);
                        }}
                        onKeyDown={(e) => e.key === 'Enter' && handleApplyPromo()}
                        placeholder="Kupon kodu"
                        className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-xs font-bold focus:outline-none focus:border-accent uppercase"
                      />
                      <button
                        type="button"
                        onClick={handleApplyPromo}
                        disabled={promoApplying || !promoInput.trim()}
                        className={`h-9 px-4 rounded-lg text-xs font-bold transition-colors ${
                          promoApplying || !promoInput.trim()
                            ? 'bg-muted text-muted-foreground cursor-not-allowed'
                            : 'bg-foreground text-background hover:opacity-90 cursor-pointer'
                        }`}
                      >
                        {promoApplying ? '...' : 'Uygula'}
                      </button>
                    </div>
                    {promoMessage && (
                      <div
                        className={`text-[11px] font-semibold ${
                          promoMessage.type === 'success'
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      >
                        {promoMessage.text}
                      </div>
                    )}
                  </div>

                  <div className="border-t border-border pt-4 mt-2 flex justify-between items-center">
                    <span className="text-sm font-bold text-foreground">Genel Toplam</span>
                    <div className="text-right">
                      <span className="text-xl font-black text-orange-grad">
                        {formatMoney(grandTotal, currency)}
                      </span>
                      <span className="block text-[9px] text-muted-foreground font-medium italic mt-0.5">
                        KDV ve Kargo Dahil
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <Link
                    href="/checkout"
                    className="w-full flex h-11 items-center justify-center gap-2 rounded-xl bg-molten-grad text-sm font-bold text-white shadow-md glow-orange transition-all duration-300 cursor-pointer group"
                  >
                    <span>Siparişi Tamamla</span>
                    <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                  </Link>
                </div>

                <div className="mt-4 text-center">
                  <span className="text-[10px] text-muted-foreground">
                    {MEDUSA_READY
                      ? 'Sepet Medusa üzerinden senkronize ediliyor.'
                      : 'Güvenli 256-bit SSL şifreleme ve 3D Secure ödeme koruması.'}
                  </span>
                </div>
                </div>
              </div>
            </div>
          )}

          {/* Cross-sell — sepete eklenen ürünleri exclude eden öneri şeridi */}
          {cart.length > 0 && (
            <CrossSell
              exclude={cart.map((it) => it.productId)}
              title="Bunlara da ihtiyacınız olabilir"
              limit={4}
            />
          )}
        </div>
      </main>

      <Footer />
    </>
  );
}
