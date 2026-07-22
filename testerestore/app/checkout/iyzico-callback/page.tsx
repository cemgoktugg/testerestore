'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { useCart } from '../../context/CartContext';
import { completeCart } from '../../../lib/medusa/services/cart';
import { Loader2, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';

/**
 * Iyzico 3DS callback handler.
 *
 * Bu sayfa Iyzico'dan geri yönlendirme sonrası açılır. Kart kullanıcı
 * tarafından onaylanmış demektir — Medusa cart.complete'ı tetikleyerek
 * order'ı oluştururuz.
 *
 * Token verify (Iyzico checkoutForm.retrieve) backend payment provider'ın
 * authorizePayment'inde otomatik yapılır.
 */
export default function IyzicoCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params?.get('token');
  const { clearCart } = useCart();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>(
    'processing'
  );
  const [message, setMessage] = useState<string>('');
  const [orderId, setOrderId] = useState<string>('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Geçersiz dönüş — token bulunamadı.');
      return;
    }

    (async () => {
      try {
        const result = await completeCart();
        if (result.type === 'order' && result.orderId) {
          setOrderId(result.orderId);
          setStatus('success');
          await clearCart();
          // Otomatik hesabıma yönlendir (5 sn sonra)
          setTimeout(() => {
            router.push(`/hesabim/siparis/${result.orderId}`);
          }, 5000);
        } else {
          setStatus('error');
          setMessage(result.error || 'Sipariş tamamlanamadı.');
        }
      } catch (e) {
        setStatus('error');
        setMessage(e instanceof Error ? e.message : 'Bilinmeyen hata.');
      }
    })();
  }, [token, router, clearCart]);

  return (
    <>
      <Header />
      <main className="flex-1 py-12 md:py-24 bg-background">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center">
          {status === 'processing' && (
            <div className="space-y-6">
              <Loader2 className="h-16 w-16 mx-auto animate-spin text-accent" />
              <h1 className="text-2xl font-bold">Ödeme Doğrulanıyor</h1>
              <p className="text-sm text-muted-foreground">
                Lütfen sayfayı kapatmayın, siparişinizi oluşturuyoruz...
              </p>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 animate-bounce">
                <CheckCircle2 className="h-12 w-12" />
              </div>
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight mb-2">
                  Ödemeniz Başarılı!
                </h1>
                <p className="text-sm text-muted-foreground">
                  Sipariş numaranız:{' '}
                  <span className="font-bold text-foreground">{orderId.slice(-8).toUpperCase()}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  E-posta adresinize sipariş özeti gönderildi.
                </p>
              </div>
              <Link
                href={`/hesabim/siparis/${orderId}`}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-molten-grad px-6 text-sm font-bold text-white glow-orange"
              >
                Siparişimi Görüntüle
              </Link>
              <p className="text-[10px] text-muted-foreground">
                Birkaç saniye içinde otomatik yönlendirileceksiniz.
              </p>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-rose-500/10 text-rose-500">
                <AlertCircle className="h-12 w-12" />
              </div>
              <div>
                <h1 className="text-2xl font-bold mb-2">Ödeme Tamamlanamadı</h1>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {message || 'Bilinmeyen bir hata oluştu.'}
                </p>
              </div>
              <Link
                href="/checkout"
                className="inline-flex items-center gap-2 text-accent font-semibold"
              >
                <ArrowLeft className="h-4 w-4" /> Sepete Geri Dön
              </Link>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
