'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useCart } from '../../context/CartContext';
import { useCustomer } from '../../context/CustomerContext';
import { completeCart, type CompletedOrderSummary } from '../../../lib/medusa/services/cart';
import { formatMoney } from '../../../lib/medusa/format';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft, Zap } from 'lucide-react';

/**
 * Iyzico 3DS callback handler — sipariş onay ekranı.
 *
 * Iyzico'dan geri dönüşte açılır; Medusa cart.complete'ı tetikleyerek siparişi
 * oluşturur. Token doğrulaması (checkoutForm.retrieve + tutar kontrolü) backend
 * ödeme sağlayıcısının authorizePayment'inde yapılır.
 *
 * - Misafir müşteri hesap sayfasına YÖNLENDİRİLMEZ (giriş ister → giriş
 *   ekranına düşüyordu); onay ekranı burada kalır.
 * - Sonuç sessionStorage'da token'a bağlı tutulur: sayfa yenilenirse sepet
 *   artık olmadığından ikinci tamamlama "sepet yok" döner ve sipariş
 *   oluşmuşken "Ödeme Tamamlanamadı" gösteriliyordu.
 * - Token adres çubuğundan silinir (analitik/yönlendirenlere sızmasın).
 */

const STORAGE_KEY = 'ts_last_order';

interface StoredOrder {
  token: string;
  orderId: string;
  displayId?: number;
  summary?: CompletedOrderSummary;
}

function readStored(token: string): StoredOrder | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const v = raw ? (JSON.parse(raw) as StoredOrder) : null;
    return v && v.token === token ? v : null;
  } catch {
    return null;
  }
}

/** Medusa/iyzico hata metinlerini müşteriye anlaşılır mesaja çevirir. */
function friendlyError(raw: string | undefined): string {
  const m = (raw || '').toLowerCase();
  if (m.includes('no cart')) {
    return 'Bu ödemeye ait sepet bulunamadı. Ödemeniz alındıysa siparişiniz oluşturulmuştur; emin olmak için lütfen bizimle iletişime geçin.';
  }
  if (m.includes('fiyatlar güncellendi')) {
    // Para iyzico'da 3DS anında çekilmiş olabilir — tekrar ödemeden önce bize ulaşsın.
    return 'Sepetinizdeki fiyatlar ödeme sırasında değiştiği için sipariş oluşturulamadı. Lütfen TEKRAR ÖDEME YAPMADAN bizimle iletişime geçin; ödemenizi kontrol edip siparişinizi oluşturalım veya iade edelim.';
  }
  return 'Ödemeniz onaylanmadı. Kart bilgilerinizi kontrol edip tekrar deneyebilirsiniz. Kartınızdan tutar çekildiyse lütfen bizimle iletişime geçin; hemen kontrol edelim.';
}

export default function IyzicoCallbackPage() {
  const params = useSearchParams();
  const token = params?.get('token') || '';
  const { clearCart } = useCart();
  const { isAuthenticated, loading: customerLoading } = useCustomer();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('');
  const [order, setOrder] = useState<StoredOrder | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    if (token) {
      try {
        window.history.replaceState(null, '', '/checkout/iyzico-callback');
      } catch {
        /* yoksay */
      }
    }
    if (!token) {
      setStatus('error');
      setMessage('Geçersiz dönüş: ödeme bilgisi bulunamadı.');
      return;
    }

    const stored = readStored(token);
    if (stored) {
      setOrder(stored);
      setStatus('success');
      return;
    }

    (async () => {
      try {
        const result = await completeCart();
        if (result.type === 'order' && result.orderId) {
          const done: StoredOrder = {
            token,
            orderId: result.orderId,
            displayId: result.displayId,
            summary: result.summary,
          };
          try {
            sessionStorage.setItem(STORAGE_KEY, JSON.stringify(done));
          } catch {
            /* yoksay */
          }
          setOrder(done);
          setStatus('success');
          await clearCart();
        } else {
          setStatus('error');
          setMessage(friendlyError(result.error));
        }
      } catch (e) {
        setStatus('error');
        setMessage(friendlyError(e instanceof Error ? e.message : undefined));
      }
    })();
  }, [token, clearCart]);

  const orderNumber = order?.displayId ? `#${order.displayId}` : order?.orderId.slice(-8).toUpperCase();
  const summary = order?.summary;
  const currency = summary?.currency || 'try';

  return (
    <>
      <Header />
      <main className="flex-1 py-12 md:py-20 bg-background">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
          {status === 'processing' && (
            <div className="space-y-6" role="status" aria-live="polite">
              <Loader2 className="h-16 w-16 mx-auto animate-spin text-accent" />
              <h1 className="text-2xl font-bold">Ödemeniz Doğrulanıyor</h1>
              <p className="text-sm text-muted-foreground">
                Lütfen sayfayı kapatmayın, siparişinizi oluşturuyoruz…
              </p>
            </div>
          )}

          {status === 'success' && order && (
            <div className="space-y-8">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <div className="space-y-3">
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Siparişiniz Alındı!</h1>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Ödemeniz başarıyla alındı. Bizi tercih ettiğiniz için teşekkür ederiz; siparişiniz
                  hazırlanmak üzere sıraya alındı. Sorularınız için sipariş numaranızla bize
                  ulaşabilirsiniz.
                </p>
              </div>

              <div className="rounded-2xl bg-metallic-card p-6 text-left divide-y divide-border/60 max-w-md mx-auto">
                <div className="flex justify-between items-center text-xs pb-3">
                  <span className="font-bold text-muted-foreground uppercase">Sipariş No</span>
                  <span className="font-black text-primary text-base">{orderNumber}</span>
                </div>
                {summary?.items?.length ? (
                  <ul className="py-3 space-y-2">
                    {summary.items.map((it, i) => (
                      <li key={i} className="flex justify-between gap-3 text-xs">
                        <span className="text-foreground">
                          {it.title}
                          {it.subtitle ? <span className="text-muted-foreground"> — {it.subtitle}</span> : null}
                          <span className="text-muted-foreground"> × {it.quantity}</span>
                        </span>
                        <span className="font-semibold whitespace-nowrap">{formatMoney(it.total, currency)}</span>
                      </li>
                    ))}
                  </ul>
                ) : null}
                {summary ? (
                  <div className="flex justify-between items-center text-sm pt-3">
                    <span className="font-bold">Ödenen Toplam (KDV dahil)</span>
                    <span className="font-black">{formatMoney(summary.total, currency)}</span>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                {isAuthenticated ? (
                  <Link
                    href={`/hesabim/siparis/${order.orderId}`}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-molten-grad px-6 text-sm font-bold text-white glow-orange"
                  >
                    Siparişimi Görüntüle
                  </Link>
                ) : null}
                <Link
                  href="/"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border px-6 text-sm font-bold text-foreground hover:bg-muted"
                >
                  Alışverişe Devam Et
                </Link>
              </div>

              {!customerLoading && !isAuthenticated && (
                <div className="max-w-md mx-auto rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-accent/10 to-orange-500/5 p-5 text-left">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-5 w-5 text-accent" />
                    <h2 className="text-base font-extrabold">Sonraki Siparişlerinizi Kolayca Takip Edin</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                    Hesap oluşturursanız bundan sonraki siparişlerinizi ve kargo durumunu tek yerden
                    takip eder, adres bilgilerinizi yeniden girmezsiniz. Bu siparişle ilgili
                    sorularınız için sipariş numaranız yeterli.
                  </p>
                  <Link
                    href={`/kayit${summary?.email ? `?email=${encodeURIComponent(summary.email)}&next=/hesabim` : ''}`}
                    className="inline-flex w-full h-10 items-center justify-center gap-2 rounded-xl bg-molten-grad text-xs font-bold text-white px-4 glow-orange"
                  >
                    Ücretsiz Hesap Oluştur
                  </Link>
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
                <AlertCircle className="h-12 w-12" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-2">Ödeme Tamamlanamadı</h1>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">{message}</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link
                  href="/checkout"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-molten-grad px-6 text-sm font-bold text-white"
                >
                  <ArrowLeft className="h-4 w-4" /> Ödemeye Geri Dön
                </Link>
                <Link
                  href="/iletisim"
                  className="inline-flex h-11 items-center justify-center rounded-xl border border-border px-6 text-sm font-bold text-foreground hover:bg-muted"
                >
                  Bize Ulaşın
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
