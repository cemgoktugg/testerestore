'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import {
  CreditCard, Landmark, Truck, CheckCircle2, ShieldCheck,
  ArrowLeft, ArrowRight, Printer, RefreshCw, Calendar, User, Zap,
} from 'lucide-react';
import TrustSignals from '../components/TrustSignals';
import { formatMoney } from '../../lib/medusa/format';
import { MEDUSA_READY, DEFAULT_REGION } from '../../lib/medusa/config';
import {
  updateCart,
  autoSelectShipping,
  initializePayment,
  completeCart,
} from '../../lib/medusa/services/cart';
import { summarizeOrder } from '../../lib/shipping';

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart, medusaCart, refreshCart } = useCart();
  const { customer, isAuthenticated } = useCustomer();
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'wire'>('card');
  const [orderCompleted, setOrderCompleted] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // 6502 sayılı kanun uyarınca alıcının açık onayı zorunlu
  const [consentDistance, setConsentDistance] = useState(false);
  const [consentPreInfo, setConsentPreInfo] = useState(false);
  const [consentKvkk, setConsentKvkk] = useState(false);

  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [address, setAddress] = useState('');

  // Pre-fill from logged-in customer (one-shot)
  useEffect(() => {
    if (!customer) return;
    setEmail((prev) => prev || customer.email || '');
    setFullName((prev) => {
      if (prev) return prev;
      const fn = customer.first_name || '';
      const ln = customer.last_name || '';
      return (fn + ' ' + ln).trim();
    });
    setPhone((prev) => prev || customer.phone || '');
    const defaultAddr = customer.addresses?.find(
      (a) => a.is_default_shipping
    ) || customer.addresses?.[0];
    if (defaultAddr) {
      setAddress((prev) => prev || defaultAddr.address_1 || '');
      setCity((prev) => prev || defaultAddr.city || '');
      setDistrict((prev) => prev || defaultAddr.province || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

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
  // KDV is charged on items + shipping; this breakdown adds up to exactly what
  // Medusa charges at checkout (free shipping >= 2000 TL, else 79.90 TL).
  const summary = summarizeOrder(subTotal, discount);
  const kdv = summary.kdv;
  const shippingCost = summary.shipping;
  const grandTotal = summary.total;

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // Yasal zorunluluk: bu üç kutu işaretlenmeden sipariş alınamaz
    if (!consentDistance || !consentPreInfo || !consentKvkk) {
      setSubmitError(
        'Devam etmek için Mesafeli Satış Sözleşmesi, Ön Bilgilendirme Formu ve KVKK metnini onaylamanız gerekiyor.'
      );
      return;
    }

    setSubmitting(true);

    try {
      if (!MEDUSA_READY || !medusaCart) {
        // Fallback for demo mode without backend
        const randomOrderNum = `TS-${Math.floor(100000 + Math.random() * 900000)}`;
        setOrderNumber(randomOrderNum);
        setOrderCompleted(true);
        await clearCart();
        return;
      }

      const [firstName, ...rest] = fullName.trim().split(' ');
      const lastName = rest.join(' ') || firstName;
      const addressPayload = {
        first_name: firstName,
        last_name: lastName,
        phone,
        address_1: address,
        city,
        province: district,
        country_code: DEFAULT_REGION.toLowerCase(),
      };

      // 1. Push email + address onto the cart
      await updateCart({
        email,
        shipping_address: addressPayload,
        billing_address: addressPayload,
        metadata: {
          preferred_payment_method: paymentMethod,
          district,
        },
      });

      // 2. Add the correct shipping method — the server decides free (>= 2000 TL)
      //    vs the 79.90 TL flat fee from the cart subtotal, so it can't be gamed.
      const ship = await autoSelectShipping();
      if (!ship) {
        throw new Error(
          'Kargo seçeneği belirlenemedi. Lütfen tekrar deneyin veya yöneticiyle iletişime geçin.'
        );
      }

      // 3. Initialize payment.
      // - Kart seçilirse → Iyzico checkout form üzerinden 3DS akışı
      // - Havale seçilirse → manuel/system provider, anında authorize olur
      if (paymentMethod === 'card') {
        const updated = await initializePayment('pp_iyzico_iyzico');
        // Iyzico session.data içinde paymentPageUrl döner — kullanıcıyı
        // oraya yönlendiriyoruz. Geri callback /checkout/iyzico-callback'e.
        const session = updated?.payment_collection?.payment_sessions?.find(
          (s) => s.provider_id === 'pp_iyzico_iyzico' || s.provider_id === 'iyzico'
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = (session?.data as any) || {};
        const paymentPageUrl = data?.paymentPageUrl as string | undefined;
        if (paymentPageUrl) {
          window.location.href = paymentPageUrl;
          return; // user leaves the SPA
        }
        // DRY mode (Iyzico key yok) — fallback to immediate completion
        if (!data?.dryMode) {
          throw new Error(
            'Iyzico ödeme sayfası başlatılamadı. Lütfen yöneticiyle iletişime geçin.'
          );
        }
        // else fall through to completeCart
      } else {
        // Havale / EFT
        await initializePayment('pp_system_default');
      }

      // 4. Complete the cart → creates a Medusa Order
      await refreshCart();
      const result = await completeCart();

      if (result.type !== 'order' || !result.orderId) {
        throw new Error(result.error || 'Sipariş oluşturulamadı.');
      }

      setOrderNumber(result.orderId);
      setOrderCompleted(true);
      await clearCart();
    } catch (err) {
      setSubmitError(
        err instanceof Error
          ? err.message
          : 'Sipariş gönderilemedi. Lütfen tekrar deneyin.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (orderCompleted) {
    return (
      <>
        <Header />
        <main className="flex-1 py-12 md:py-24 bg-background">
          <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 text-center space-y-8">
            
            {/* Success Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500 animate-bounce">
              <CheckCircle2 className="h-12 w-12" />
            </div>

            {/* Success Messages */}
            <div className="space-y-3">
              <h1 className="text-3xl font-black tracking-tight text-foreground sm:text-4xl">
                Siparişiniz Alındı!
              </h1>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Bizi tercih ettiğiniz için teşekkür ederiz. Kaynak atölyemiz şerit bıçaklarınızı milimetrik kesim ve Ideal kaynak teknolojisi ile hazırlamaya başladı.
              </p>
            </div>

            {/* Order Info Card */}
            <div className="rounded-2xl bg-metallic-card p-6 text-left divide-y divide-border/60 max-w-md mx-auto">
              <div className="pb-4 flex justify-between items-center text-xs">
                <span className="font-bold text-muted-foreground uppercase">Sipariş No:</span>
                <span className="font-black text-primary text-sm">{orderNumber}</span>
              </div>
              <div className="py-4 flex justify-between items-center text-xs">
                <span className="font-bold text-muted-foreground uppercase">Kaynak & Hazırlık Süresi:</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <RefreshCw className="h-3.5 w-3.5 text-primary animate-spin" /> 16-24 Saat
                </span>
              </div>
              <div className="py-4 flex justify-between items-center text-xs">
                <span className="font-bold text-muted-foreground uppercase">Kargo Çıkışı:</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Truck className="h-3.5 w-3.5 text-primary" /> En Geç Yarın
                </span>
              </div>
              <div className="pt-4 flex justify-between items-center text-xs">
                <span className="font-bold text-muted-foreground uppercase">Tahmini Teslimat:</span>
                <span className="font-semibold text-foreground flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-primary" /> 2-3 İş Günü
                </span>
              </div>
            </div>

            {/* Misafir checkout sonrası üyelik teşviki */}
            {!isAuthenticated && email && (
              <div className="max-w-md mx-auto rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-accent/10 to-orange-500/5 p-5 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-accent" />
                  <h3 className="text-base font-extrabold text-foreground">
                    Sonraki Siparişe %10 İndirim
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  Hesap oluşturarak siparişlerinizi kolayca takip edin, fatura indirin
                  ve <strong className="text-foreground">bir sonraki siparişinizde %10 indirim</strong>{" "}
                  kazanın.
                </p>
                <Link
                  href={`/kayit?email=${encodeURIComponent(email)}&next=/hesabim`}
                  className="inline-flex w-full h-10 items-center justify-center gap-2 rounded-xl bg-molten-grad text-xs font-bold text-white px-4 glow-orange"
                >
                  <Zap className="h-3.5 w-3.5" />
                  Üyelik Oluştur — Bedava
                </Link>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  Email adresiniz ({email}) hazır olarak gelecek.
                </p>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-xl bg-molten-grad text-sm font-bold text-white px-8 glow-orange shadow-md cursor-pointer"
              >
                Ana Sayfaya Dön
              </Link>
              <button
                onClick={() => window.print()}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-silver-grad text-sm font-bold text-foreground px-8 cursor-pointer"
              >
                <Printer className="h-4 w-4" /> Sipariş Detayını Yazdır
              </button>
            </div>

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
          
          <div className="mb-6 pb-4 border-b border-border flex items-center gap-2">
            <Link href="/cart" className="p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Siparişi Tamamla</h1>
          </div>

          {/* Trust signals banner — checkout güveni artırır */}
          <div className="mb-6">
            <TrustSignals variant="banner" />
          </div>

          {!isAuthenticated && cart.length > 0 && (
            <div className="mb-6 rounded-2xl border border-accent/20 bg-accent/5 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start sm:items-center gap-3">
                <div className="h-10 w-10 shrink-0 rounded-full bg-accent/10 text-accent flex items-center justify-center">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Daha hızlı ödeme yapın</p>
                  <p className="text-xs text-muted-foreground">
                    Giriş yaparsanız bilgileriniz otomatik dolar ve sipariş geçmişinize kayıt edilir.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 sm:gap-3 shrink-0">
                <Link href="/giris?next=/checkout" className="inline-flex h-9 items-center px-4 rounded-lg bg-molten-grad text-white text-xs font-bold glow-orange">
                  Giriş Yap
                </Link>
                <Link href="/kayit" className="inline-flex h-9 items-center px-4 rounded-lg bg-silver-grad text-xs font-bold">
                  Hesap Oluştur
                </Link>
              </div>
            </div>
          )}

          {cart.length === 0 ? (
            /* Fallback Empty checkout */
            <div className="text-center py-20 bg-metallic-card rounded-2xl max-w-md mx-auto space-y-4">
              <p className="text-sm text-muted-foreground">Sipariş verilecek ürün bulunamadı. Lütfen önce sepetinize ürün ekleyin.</p>
              <Link href="/" className="inline-flex h-10 items-center justify-center bg-molten-grad text-white text-xs font-bold px-6 rounded-lg glow-orange">
                Alışverişe Başla
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmitOrder} className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
              
              {/* Left Column: Checkout Form (8 cols) */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* 1. Address Block */}
                <div className="rounded-2xl bg-metallic-card p-6 space-y-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-3 mb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Teslimat & Fatura Adresi
                  </h2>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Ad Soyad *</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-medium"
                        placeholder="Örn: Cihad Çetinkaya"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Telefon Numarası *</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-medium"
                        placeholder="0 (555) 123 4567"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">E-Posta Adresi *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-medium"
                      placeholder="adsoyad@sirket.com"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">Şehir *</label>
                      <input
                        type="text"
                        required
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-medium"
                        placeholder="İstanbul"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-muted-foreground mb-1">İlçe *</label>
                      <input
                        type="text"
                        required
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-medium"
                        placeholder="Başakşehir"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground mb-1">Açık Adres *</label>
                    <textarea
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-medium"
                      placeholder="Sokak, bina, daire no, sanayi sitesi blok detaylarını eksiksiz girin..."
                    />
                  </div>
                </div>

                {/* 2. Payment Method Selector */}
                <div className="rounded-2xl bg-metallic-card p-6 space-y-6">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-3 mb-2 flex items-center gap-2">
                    <CreditCard className="h-4 w-4" /> Ödeme Yöntemi
                  </h2>

                  {/* Tabs */}
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('card')}
                      className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold border transition-all duration-200 cursor-pointer ${
                        paymentMethod === 'card'
                          ? 'border-accent bg-accent/10 text-accent shadow-sm'
                          : 'bg-silver-grad'
                      }`}
                    >
                      <CreditCard className="h-4 w-4" />
                      <span>Kredi / Banka Kartı</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('wire')}
                      className={`flex items-center justify-center gap-2 rounded-xl py-3 text-xs font-bold border transition-all duration-200 cursor-pointer ${
                        paymentMethod === 'wire'
                          ? 'border-accent bg-accent/10 text-accent shadow-sm'
                          : 'bg-silver-grad'
                      }`}
                    >
                      <Landmark className="h-4 w-4" />
                      <span>Havale / EFT Transferi</span>
                    </button>
                  </div>

                  {/* Card Section */}
                  {paymentMethod === 'card' ? (
                    <div className="space-y-4 animate-in fade-in duration-200">
                      
                      {/* Premium card preview container */}
                      <div className="mx-auto max-w-[320px] rounded-2xl bg-gradient-to-br from-zinc-800 to-zinc-950 p-6 text-white shadow-xl flex flex-col justify-between aspect-[1.58] border border-white/10 glow-orange mb-4">
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-black tracking-widest opacity-80 uppercase">Premium Saw Card</span>
                          <div className="h-7 w-10 bg-white/10 rounded-md backdrop-blur-sm border border-white/5 flex items-center justify-center font-bold italic text-xs">
                            Visa
                          </div>
                        </div>
                        <div className="space-y-1.5 py-4">
                          <span className="block text-[9px] text-zinc-400 font-bold uppercase tracking-wider">Kart Numarası</span>
                          <span className="text-sm font-mono font-bold tracking-widest">
                            {cardNumber || '•••• •••• •••• ••••'}
                          </span>
                        </div>
                        <div className="flex justify-between items-end text-xs">
                          <div>
                            <span className="block text-[8px] text-zinc-500 font-bold uppercase">Kart Sahibi</span>
                            <span className="font-bold truncate max-w-[150px] block">
                              {cardName.toUpperCase() || 'AD SOYAD'}
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="block text-[8px] text-zinc-500 font-bold uppercase">SKT</span>
                            <span className="font-mono font-bold">{cardExpiry || 'AA/YY'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Kart Sahibinin Adı *</label>
                          <input
                            type="text"
                            required={paymentMethod === 'card'}
                            value={cardName}
                            onChange={(e) => setCardName(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-bold"
                            placeholder="Kart üzerindeki isim"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Kart Numarası *</label>
                          <input
                            type="text"
                            required={paymentMethod === 'card'}
                            maxLength={19}
                            value={cardNumber}
                            onChange={(e) => setCardNumber(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-bold font-mono"
                            placeholder="16 Haneli kart no"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Son Kullanma (AA/YY) *</label>
                          <input
                            type="text"
                            required={paymentMethod === 'card'}
                            maxLength={5}
                            value={cardExpiry}
                            onChange={(e) => setCardExpiry(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-bold font-mono"
                            placeholder="AA/YY"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-muted-foreground mb-1">Güvenlik Kodu (CVV) *</label>
                          <input
                            type="password"
                            required={paymentMethod === 'card'}
                            maxLength={3}
                            value={cardCvv}
                            onChange={(e) => setCardCvv(e.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-bold font-mono"
                            placeholder="3 Haneli"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Bank Transfer Section */
                    <div className="space-y-4 animate-in fade-in duration-200">
                      <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-4">
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Siparişinizi onayladıktan sonra lütfen aşağıdaki şirket banka hesabımıza sipariş tutarını transfer edin. Havale açıklama alanına isminizi veya sipariş numaranızı yazmayı unutmayın.
                        </p>

                        <div className="border border-border rounded-lg bg-background p-3 space-y-1 text-xs">
                          <div className="flex justify-between items-center border-b border-border pb-1.5 mb-1.5">
                            <span className="font-bold text-foreground">Akbank T.A.Ş.</span>
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">Kurumsal</span>
                          </div>
                          <div>Alıcı: <strong className="text-foreground">Testere Store A.Ş.</strong></div>
                          <div>Şube: <span className="text-foreground">İkitelli OSB (334)</span></div>
                          <div>IBAN: <strong className="text-primary font-mono select-all">TR56 0004 6000 8910 0022 3344 55</strong></div>
                        </div>

                        <div className="text-[10px] text-primary flex items-start gap-1">
                          <ShieldCheck className="h-4 w-4 shrink-0" />
                          <span>EFT/Havale ulaştığında kaynak atölyemiz kesim işlemlerini başlatıp bildirim gönderecektir.</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Order Overview & Submit Button (4 cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                <div className="rounded-2xl bg-metallic-card p-6">
                  <h2 className="text-base font-bold uppercase tracking-wider text-foreground border-b border-border pb-3 mb-4">
                    Siparişiniz
                  </h2>

                  {/* Compact Cart Items */}
                  <div className="space-y-4 max-h-[250px] overflow-y-auto pr-1 mb-6 divide-y divide-border/60">
                    {cart.map((item, index) => (
                      <div key={item.id} className={`flex items-start justify-between gap-2 text-xs ${index > 0 ? 'pt-3' : ''}`}>
                        <div>
                          <span className="font-bold text-foreground block">{item.name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {item.type === 'blade' 
                              ? `L: ${item.specs.length}mm • ${item.specs.width} • ${item.specs.tpi}`
                              : `${item.specs.width} • ${item.specs.thickness}`
                            }
                          </span>
                          <span className="block text-[10px] font-bold text-primary mt-0.5">
                            Adet: {item.quantity}
                          </span>
                        </div>
                        <span className="font-black text-foreground shrink-0">{formatMoney(item.price * item.quantity, currency)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Details */}
                  <div className="space-y-2 border-t border-border pt-4 text-xs">
                    <div className="flex justify-between text-muted-foreground">
                      <span>Ara Toplam</span>
                      <span className="font-semibold text-foreground">{formatMoney(subTotal, currency)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>KDV {medusaCart ? '' : '(%20)'}</span>
                      <span className="font-semibold text-foreground">{formatMoney(kdv, currency)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Kargo</span>
                      <span className="font-semibold text-foreground">
                        {shippingCost === 0 ? 'Ücretsiz' : formatMoney(shippingCost, currency)}
                      </span>
                    </div>
                    <div className="border-t border-border pt-3 mt-1 flex justify-between items-center">
                      <span className="text-sm font-bold text-foreground">Genel Toplam</span>
                      <span className="text-lg font-black text-orange-grad">{formatMoney(grandTotal, currency)}</span>
                    </div>
                  </div>

                  {/* Yasal onay kutuları — 6502 sayılı TKHK + Mesafeli Sözleşmeler Yönetmeliği gereği zorunlu */}
                  <div className="mt-5 space-y-2.5 rounded-xl border border-border bg-muted/30 p-4">
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentDistance}
                        onChange={(e) => setConsentDistance(e.target.checked)}
                        className="mt-0.5 h-4 w-4 cursor-pointer accent-orange-500"
                      />
                      <span className="text-[11px] text-muted-foreground leading-relaxed">
                        <Link
                          href="/yasal/mesafeli-satis-sozlesmesi"
                          target="_blank"
                          className="text-accent hover:underline font-semibold"
                        >
                          Mesafeli Satış Sözleşmesi
                        </Link>
                        ’ni okudum, anladım ve kabul ediyorum.
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentPreInfo}
                        onChange={(e) => setConsentPreInfo(e.target.checked)}
                        className="mt-0.5 h-4 w-4 cursor-pointer accent-orange-500"
                      />
                      <span className="text-[11px] text-muted-foreground leading-relaxed">
                        <Link
                          href="/yasal/on-bilgilendirme-formu"
                          target="_blank"
                          className="text-accent hover:underline font-semibold"
                        >
                          Ön Bilgilendirme Formu
                        </Link>
                        ’nu okudum ve onaylıyorum. Özel boy kaynaklı şerit
                        bıçaklar için cayma hakkımın bulunmadığını biliyorum.
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={consentKvkk}
                        onChange={(e) => setConsentKvkk(e.target.checked)}
                        className="mt-0.5 h-4 w-4 cursor-pointer accent-orange-500"
                      />
                      <span className="text-[11px] text-muted-foreground leading-relaxed">
                        Kişisel verilerimin{" "}
                        <Link
                          href="/yasal/kvkk-aydinlatma-metni"
                          target="_blank"
                          className="text-accent hover:underline font-semibold"
                        >
                          KVKK Aydınlatma Metni
                        </Link>{" "}
                        kapsamında işlenmesini kabul ediyorum.
                      </span>
                    </label>
                  </div>

                  {submitError && (
                    <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                      {submitError}
                    </div>
                  )}

                  <div className="mt-6">
                    <button
                      type="submit"
                      disabled={submitting}
                      className={`w-full flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold text-white shadow-md transition-all duration-300 group ${
                        submitting
                          ? 'bg-muted text-muted-foreground cursor-not-allowed'
                          : 'bg-molten-grad glow-orange cursor-pointer'
                      }`}
                    >
                      {submitting ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          <span>Sipariş Gönderiliyor...</span>
                        </>
                      ) : (
                        <>
                          <span>Siparişi Tamamla</span>
                          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground text-center">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>IDEAL Kaynak ve Boy Değişim Garantisi Altındadır</span>
                  </div>
                </div>

              </div>

            </form>
          )}

        </div>
      </main>

      <Footer />
    </>
  );
}
