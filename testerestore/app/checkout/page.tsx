'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import { useCustomer } from '../context/CustomerContext';
import {
  CreditCard, Landmark, Truck, CheckCircle2, ShieldCheck, FileText,
  ArrowLeft, ArrowRight, Printer, RefreshCw, User, Zap,
} from 'lucide-react';
import TrustSignals from '../components/TrustSignals';
import { formatMoney } from '../../lib/medusa/format';
import { MEDUSA_READY, DEFAULT_REGION } from '../../lib/medusa/config';
import {
  updateCart,
  autoSelectShipping,
  addShippingMethod,
  listShippingOptions,
  initializePayment,
  completeCart,
  type CartShippingOption,
} from '../../lib/medusa/services/cart';
import { normalizePhoneTR, isValidTCKN, isValidVKN } from '../../lib/tr-address';
import AddressFields, { EMPTY_ADDRESS, type AddressValue } from './AddressFields';
import InvoiceFields, { EMPTY_INVOICE, type InvoiceValue } from './InvoiceFields';
import ShippingOptions from './ShippingOptions';
import { summarizeOrder } from '../../lib/shipping';
import { companyInfo } from '../../lib/company-info';

/** Havale/EFT seçeneği yalnızca gerçek bir IBAN tanımlıysa sunulur. */
const HAS_BANK_ACCOUNT = companyInfo.iban.trim().length > 0;

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
  const [email, setEmail] = useState('');
  const [ship, setShipState] = useState<AddressValue>(EMPTY_ADDRESS);
  const setShip = (patch: Partial<AddressValue>) => setShipState((p) => ({ ...p, ...patch }));
  const [billingSame, setBillingSame] = useState(true);
  const [bill, setBillState] = useState<AddressValue>(EMPTY_ADDRESS);
  const setBill = (patch: Partial<AddressValue>) => setBillState((p) => ({ ...p, ...patch }));
  const [invoice, setInvoiceState] = useState<InvoiceValue>(EMPTY_INVOICE);
  const setInvoice = (patch: Partial<InvoiceValue>) => setInvoiceState((p) => ({ ...p, ...patch }));
  const [fieldErrors, setFieldErrors] = useState<{
    phone?: string | null;
    billPhone?: string | null;
    invoice: Partial<Record<keyof InvoiceValue, string>>;
  }>({ invoice: {} });

  // Kargo seçenekleri — fiyatlar sunucuda bu sepet için hesaplanır.
  const [shippingOptions, setShippingOptions] = useState<CartShippingOption[]>([]);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [selectedShippingId, setSelectedShippingId] = useState<string | null>(null);

  // Pre-fill from logged-in customer (one-shot)
  useEffect(() => {
    if (!customer) return;
    setEmail((prev) => prev || customer.email || '');
    const defaultAddr =
      customer.addresses?.find((a) => a.is_default_shipping) || customer.addresses?.[0];
    setShipState((p) => ({
      ...p,
      fullName: p.fullName || ((customer.first_name || '') + ' ' + (customer.last_name || '')).trim(),
      phone: p.phone || customer.phone || '',
      address: p.address || defaultAddr?.address_1 || '',
      city: p.city || defaultAddr?.city || '',
      district: p.district || defaultAddr?.province || '',
      postalCode: p.postalCode || defaultAddr?.postal_code || '',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id]);

  // Sepette kayıtlı teslimat adresi varsa formu ondan doldur (one-shot).
  // Giriş yapmamış müşteride tek kaynak budur: danışman sohbetinden gelen
  // sepetin adresi sunucuda zaten dolu, kullanıcıya tekrar yazdırmayalım.
  // Üstteki müşteri bloğu önce çalışır; burada yalnızca BOŞ alanlar dolar.
  useEffect(() => {
    const addr = medusaCart?.shipping_address;
    if (!addr) return;
    setEmail((prev) => prev || (medusaCart?.email as string | undefined) || '');
    setShipState((p) => ({
      ...p,
      fullName: p.fullName || ((addr.first_name || '') + ' ' + (addr.last_name || '')).trim(),
      phone: p.phone || addr.phone || '',
      address: p.address || addr.address_1 || '',
      city: p.city || addr.city || '',
      district: p.district || addr.province || '',
      postalCode: p.postalCode || addr.postal_code || '',
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [medusaCart?.shipping_address?.id]);

  // Sepet içeriği değiştikçe kargo seçeneklerini (sunucu fiyatlarıyla) yenile.
  const shippingKey = `${medusaCart?.id ?? ''}|${medusaCart?.item_subtotal ?? ''}|${medusaCart?.items?.length ?? 0}`;
  useEffect(() => {
    if (!medusaCart?.id) return;
    let cancelled = false;
    setShippingLoading(true);
    listShippingOptions()
      .then((opts) => {
        if (cancelled) return;
        setShippingOptions(opts);
        setSelectedShippingId((prev) => {
          if (prev && opts.some((o) => o.id === prev)) return prev;
          const standard = opts.find((o) => o.typeCode === 'standard');
          return (standard ?? [...opts].sort((a, b) => a.amount - b.amount)[0])?.id ?? null;
        });
      })
      .finally(() => {
        if (!cancelled) setShippingLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shippingKey]);

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
  // KDV satırı yalnızca ürünlerin KDV'si; kargo KDV dahil tek satır. Kargo =
  // seçili seçeneğin SUNUCUDA hesaplanmış ücreti (ücretsiz kargo kuralı Medusa'da).
  // Seçenekler gelmeden önce lib/shipping'deki gösterim aynası kullanılır.
  const selectedShipping = shippingOptions.find((o) => o.id === selectedShippingId);
  const summary = summarizeOrder(
    subTotal,
    discount,
    selectedShipping?.amount,
    selectedShipping?.taxInclusive ?? true
  );
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

    // Alan doğrulamaları (telefon, T.C. kimlik, kurumsal fatura alanları)
    const phoneNorm = normalizePhoneTR(ship.phone);
    const billPhoneNorm = billingSame ? phoneNorm : normalizePhoneTR(bill.phone);
    const invErrors: Partial<Record<keyof InvoiceValue, string>> = {};
    if (invoice.type === 'bireysel' && invoice.tckn && !isValidTCKN(invoice.tckn)) {
      invErrors.tckn = 'Geçerli bir T.C. kimlik numarası girin veya alanı boş bırakın.';
    }
    if (invoice.type === 'kurumsal') {
      if (!invoice.companyName.trim()) invErrors.companyName = 'Firma unvanı gerekli.';
      if (!isValidVKN(invoice.vkn)) invErrors.vkn = 'Vergi numarası 10 haneli olmalı.';
      if (!invoice.taxOffice.trim()) invErrors.taxOffice = 'Vergi dairesi gerekli.';
    }
    setFieldErrors({
      phone: phoneNorm ? null : 'Geçerli bir telefon numarası girin (05XX XXX XX XX).',
      billPhone: billPhoneNorm ? null : 'Geçerli bir telefon numarası girin.',
      invoice: invErrors,
    });
    if (!phoneNorm || !billPhoneNorm || Object.keys(invErrors).length) {
      setSubmitError('Lütfen işaretli alanları düzeltin.');
      return;
    }

    setSubmitting(true);

    try {
      if (!MEDUSA_READY || !medusaCart) {
        // Eskiden burada rastgele "TS-xxxxxx" numarasıyla sahte "Siparişiniz
        // alındı" gösterilip sepet boşaltılıyordu — gerçekte sipariş yokken.
        throw new Error(
          'Sepetiniz sunucuyla eşitlenemedi. Lütfen sayfayı yenileyip tekrar deneyin; sorun sürerse bizimle iletişime geçin.'
        );
      }

      const toAddress = (a: AddressValue, phoneN: string, company?: string) => {
        const [firstName, ...rest] = a.fullName.trim().split(/\s+/);
        return {
          first_name: firstName,
          last_name: rest.join(' ') || firstName,
          phone: phoneN,
          address_1: a.address.trim(),
          city: a.city,
          province: a.district.trim(),
          postal_code: a.postalCode || undefined,
          company: company || undefined,
          country_code: DEFAULT_REGION.toLowerCase(),
        };
      };
      const company = invoice.type === 'kurumsal' ? invoice.companyName.trim() : undefined;
      const shippingAddress = toAddress(ship, phoneNorm);
      const billingAddress = billingSame
        ? { ...shippingAddress, company }
        : toAddress(bill, billPhoneNorm, company);

      // 1. E-posta, adresler ve fatura bilgileri → sepet (metadata siparişe taşınır)
      await updateCart({
        email,
        shipping_address: shippingAddress,
        billing_address: billingAddress,
        metadata: {
          preferred_payment_method: paymentMethod,
          district: ship.district,
          invoice_type: invoice.type,
          ...(invoice.type === 'bireysel' && invoice.tckn ? { tckn: invoice.tckn } : {}),
          ...(invoice.type === 'kurumsal'
            ? { company_name: company, vkn: invoice.vkn, tax_office: invoice.taxOffice.trim() }
            : {}),
        },
      });

      // 2. Kargo: müşterinin seçtiği seçenek. Fiyatı Medusa'daki kural hesaplar
      //    (ücretsiz kargo eşiği sunucuda — tarayıcı fiyata karar veremez).
      let shippingOk = false;
      if (selectedShippingId) shippingOk = !!(await addShippingMethod(selectedShippingId));
      if (!shippingOk) shippingOk = !!(await autoSelectShipping());
      if (!shippingOk) {
        throw new Error('Kargo seçeneği belirlenemedi. Lütfen tekrar deneyin veya bizimle iletişime geçin.');
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

      setOrderNumber(result.displayId ? `#${result.displayId}` : result.orderId);
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
                Bizi tercih ettiğiniz için teşekkür ederiz. Siparişiniz hazırlanmak üzere sıraya alındı. Sorularınız için sipariş numaranızla bize ulaşabilirsiniz.
              </p>
            </div>

            {/* Order Info Card */}
            <div className="rounded-2xl bg-metallic-card p-6 text-left divide-y divide-border/60 max-w-md mx-auto">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-muted-foreground uppercase">Sipariş No:</span>
                <span className="font-black text-primary text-sm">{orderNumber}</span>
              </div>
            </div>

            {/* Misafir checkout sonrası üyelik teşviki */}
            {!isAuthenticated && email && (
              <div className="max-w-md mx-auto rounded-2xl border-2 border-accent/40 bg-gradient-to-br from-accent/10 to-orange-500/5 p-5 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-5 w-5 text-accent" />
                  <h3 className="text-base font-extrabold text-foreground">
                    Siparişlerinizi Kolayca Takip Edin
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  Hesap oluşturarak siparişlerinizi ve kargo durumunu tek yerden takip
                  edin, adres bilgilerinizi bir sonraki alışverişinizde yeniden girmeyin.
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
                    <Truck className="h-4 w-4" /> Teslimat Adresi
                  </h2>

                  <div>
                    <label htmlFor="checkout-email" className="block text-xs font-semibold text-muted-foreground mb-1">E-Posta Adresi *</label>
                    <input
                      id="checkout-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none font-medium"
                      placeholder="ornek@firma.com"
                    />
                  </div>

                  <AddressFields value={ship} onChange={setShip} section="shipping" phoneError={fieldErrors.phone} />
                </div>

                {/* Fatura bilgileri */}
                <div className="rounded-2xl bg-metallic-card p-6 space-y-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-3 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Fatura Bilgileri
                  </h2>
                  <InvoiceFields value={invoice} onChange={setInvoice} errors={fieldErrors.invoice} />
                  <label className="flex items-center gap-2 text-xs font-semibold text-foreground cursor-pointer">
                    <input
                      type="checkbox"
                      checked={billingSame}
                      onChange={(e) => setBillingSame(e.target.checked)}
                      className="h-4 w-4 accent-orange-500 cursor-pointer"
                    />
                    Fatura adresim teslimat adresiyle aynı
                  </label>
                  {!billingSame && (
                    <AddressFields value={bill} onChange={setBill} section="billing" phoneError={fieldErrors.billPhone} />
                  )}
                </div>

                {/* Kargo */}
                <div className="rounded-2xl bg-metallic-card p-6 space-y-4">
                  <h2 className="text-sm font-bold uppercase tracking-wider text-foreground border-b border-border pb-3 mb-2 flex items-center gap-2">
                    <Truck className="h-4 w-4" /> Kargo
                  </h2>
                  <ShippingOptions
                    options={shippingOptions}
                    selectedId={selectedShippingId}
                    onSelect={setSelectedShippingId}
                    loading={shippingLoading}
                    itemSubtotal={subTotal}
                    currency={currency}
                  />
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
                    {HAS_BANK_ACCOUNT && (
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
                    )}
                  </div>

                  {/* Card Section */}
                  {paymentMethod === 'card' ? (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      {/* Kart bilgisi BU SAYFADA ALINMAZ. Eskiden burada kart no /
                          SKT / CVV soruluyordu ama hiçbir yere gönderilmiyordu;
                          müşteri kartını iyzico'da ikinci kez giriyordu. */}
                      <div className="rounded-xl border border-border bg-muted/40 p-4 text-xs text-muted-foreground leading-relaxed flex items-start gap-3">
                        <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-600" />
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">
                            Kart bilgilerinizi bir sonraki adımda iyzico güvenli ödeme sayfasında gireceksiniz.
                          </p>
                          <p>
                            Ödeme 3D Secure ile doğrulanır. Kart bilgileriniz sitemize iletilmez ve saklanmaz.
                          </p>
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
                            <span className="font-bold text-foreground">{companyInfo.bankName}</span>
                            <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">Kurumsal</span>
                          </div>
                          <div>Alıcı: <strong className="text-foreground">{companyInfo.legalName}</strong></div>
                          {companyInfo.bankBranch && (
                            <div>Şube: <span className="text-foreground">{companyInfo.bankBranch}</span></div>
                          )}
                          <div>IBAN: <strong className="text-primary font-mono select-all">{companyInfo.iban}</strong></div>
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
                              ? [item.specs.length ? `L: ${item.specs.length} mm` : null, item.specs.width, item.specs.thickness, item.specs.tpi].filter(Boolean).join(' • ')
                              : [item.specs.width, item.specs.thickness].filter(Boolean).join(' • ')
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
                      <span>Ara Toplam (KDV hariç)</span>
                      <span className="font-semibold text-foreground">{formatMoney(subTotal, currency)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>KDV (%20)</span>
                      <span className="font-semibold text-foreground">{formatMoney(kdv, currency)}</span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Kargo{shippingCost === 0 ? '' : ' (KDV dahil)'}</span>
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
                        {/* Aydınlatma bir bilgilendirmedir, rıza değil (KVKK md.10);
                            hizmet şartına bağlı "kabul ediyorum" ifadesi kaldırıldı. */}
                        <Link
                          href="/yasal/kvkk-aydinlatma-metni"
                          target="_blank"
                          className="text-accent hover:underline font-semibold"
                        >
                          KVKK Aydınlatma Metni
                        </Link>
                        ’ni okudum, kişisel verilerimin sipariş ve teslimat için işleneceği konusunda bilgilendirildim.
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
                          <span>Siparişi Onayla ve Öde</span>
                          <ArrowRight className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground text-center">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    <span>Ödemeniz iyzico altyapısıyla, 3D Secure doğrulamasıyla alınır</span>
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
