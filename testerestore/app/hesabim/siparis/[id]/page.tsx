'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/Header';
import Footer from '../../../components/Footer';
import { useCustomer } from '../../../context/CustomerContext';
import { getOrder, cancelMyOrder } from '../../../../lib/medusa/services/auth';
import { formatMoney } from '../../../../lib/medusa/format';
import { getOrderStatus } from '../../../../lib/order-status';
import type { HttpTypes } from '@medusajs/types';
import { Loader2, ArrowLeft, Package, Calendar, MapPin, CreditCard, Truck, ExternalLink, RotateCw, XCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useCart } from '../../../context/CartContext';

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const { isAuthenticated, loading: authLoading } = useCustomer();
  const { addToMedusaCart } = useCart();
  const [order, setOrder] = useState<HttpTypes.StoreOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [reordering, setReordering] = useState(false);
  const [reorderSuccess, setReorderSuccess] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelDone, setCancelDone] = useState(false);

  async function handleCancelOrder() {
    if (!order || canceling) return;
    setCanceling(true);
    setCancelError(null);
    const res = await cancelMyOrder(order.id);
    setCanceling(false);
    if (res.ok) {
      setShowCancelConfirm(false);
      setCancelDone(true);
      // Siparişi tazele → durum "İptal Edildi" olarak yansısın
      const fresh = await getOrder(order.id);
      if (fresh) setOrder(fresh);
    } else {
      setCancelError(res.message);
    }
  }

  /**
   * Tüm line item'ları aynı varyantlar + miktarlarla yeni sepete ekler.
   * Matrix-priced item'lar için (metadata.blade_type set olanlar) yeni
   * cart-add endpoint'i devreye girer, böylece fiyat doğru hesaplanır.
   */
  async function handleReorder() {
    if (!order || reordering) return;
    setReordering(true);
    try {
      for (const item of order.items || []) {
        const meta = (item.metadata || {}) as Record<string, unknown>;
        const variantId = item.variant_id;
        if (!variantId) continue;
        if (meta.blade_type && meta.width_mm && meta.thickness_mm && meta.length_mm) {
          // Matrix-priced blade — server tarafında yeniden hesaplanır
          await addToMedusaCart({
            variantId,
            quantity: item.quantity,
            bladeMatrix: {
              bladeType: String(meta.blade_type),
              widthMm: Number(meta.width_mm),
              thicknessMm: Number(meta.thickness_mm),
              toothPitch: meta.tooth_pitch ? String(meta.tooth_pitch) : null,
              lengthMm: Number(meta.length_mm),
            },
            legacy: {
              id: `reorder-${item.id}`,
              productId: item.product_handle || item.product_id || '',
              name: item.product_title || item.title || '',
              image: item.thumbnail || '/images/bimetal_blade.png',
              type: 'blade',
              specs: {
                width: meta.width ? String(meta.width) : undefined,
                thickness: meta.thickness ? String(meta.thickness) : undefined,
                tpi: meta.tpi ? String(meta.tpi) : undefined,
                length: typeof meta.length_mm === 'number' ? meta.length_mm : undefined,
              },
              price: typeof item.unit_price === 'number' ? item.unit_price : 0,
            },
          });
        } else {
          // Normal ürün
          await addToMedusaCart({
            variantId,
            quantity: item.quantity,
            metadata: meta as Record<string, unknown>,
            legacy: {
              id: `reorder-${item.id}`,
              productId: item.product_handle || item.product_id || '',
              name: item.product_title || item.title || '',
              image: item.thumbnail || '/images/bimetal_blade.png',
              type: (meta.product_type as 'blade' | 'machine') || 'machine',
              specs: {},
              price: typeof item.unit_price === 'number' ? item.unit_price : 0,
            },
          });
        }
      }
      setReorderSuccess(true);
      setTimeout(() => router.push('/cart'), 1200);
    } finally {
      setReordering(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace('/giris?next=/hesabim');
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!id) return;
    getOrder(id).then((o) => { setOrder(o); setLoading(false); });
  }, [id]);

  if (authLoading || loading) {
    return (
      <>
        <Header />
        <main className="flex-1 flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </main>
        <Footer />
      </>
    );
  }

  if (!order) {
    return (
      <>
        <Header />
        <main className="flex-1 py-20 mx-auto max-w-3xl px-4 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Sipariş bulunamadı</h1>
          <p className="text-sm text-muted-foreground mb-6">Bu siparişe erişiminiz olmayabilir.</p>
          <Link href="/hesabim" className="inline-flex items-center gap-2 text-accent font-semibold">
            <ArrowLeft className="h-4 w-4" /> Hesabıma dön
          </Link>
        </main>
        <Footer />
      </>
    );
  }

  const ship = order.shipping_address;

  // İptal uygunluğu: iptal/tamamlanmamış + henüz hazırlanmamış/kargolanmamış.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const oAny = order as any;
  const oStatus = String(oAny.status || '').toLowerCase();
  const oFulfill = String(oAny.fulfillment_status || '').toLowerCase();
  const canCancel =
    oStatus !== 'canceled' &&
    oStatus !== 'completed' &&
    oStatus !== 'archived' &&
    (!oFulfill || oFulfill === 'not_fulfilled');

  return (
    <>
      <Header />
      <main className="flex-1 bg-background py-10">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-6 gap-4">
            <Link href="/hesabim" className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4" /> Hesabıma Dön
            </Link>
            <button
              type="button"
              onClick={handleReorder}
              disabled={reordering}
              className={`inline-flex items-center gap-2 rounded-xl h-9 px-4 text-xs font-bold transition-colors ${
                reorderSuccess
                  ? 'bg-emerald-600 text-white'
                  : reordering
                  ? 'bg-muted text-muted-foreground cursor-not-allowed'
                  : 'bg-molten-grad text-white glow-orange cursor-pointer'
              }`}
              title="Bu siparişteki tüm ürünleri sepete ekle"
            >
              <RotateCw className={`h-3.5 w-3.5 ${reordering ? 'animate-spin' : ''}`} />
              {reorderSuccess
                ? 'Sepete Eklendi!'
                : reordering
                ? 'Ekleniyor...'
                : 'Aynı Siparişi Tekrarla'}
            </button>
          </div>

          <header className="flex items-start justify-between mb-8 pb-6 border-b border-border">
            <div>
              <p className="text-[10px] font-bold tracking-[0.32em] uppercase text-accent mb-2">
                Sipariş Detayı
              </p>
              <h1 className="text-3xl font-extrabold tracking-tight">
                #{order.display_id || order.id.slice(0, 8)}
              </h1>
              <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                {order.created_at && new Date(order.created_at).toLocaleString('tr-TR')}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0">
              <span className={`text-[11px] px-3 py-1 rounded-full font-bold tracking-wide ${getOrderStatus(order).className}`}>
                {getOrderStatus(order).label}
              </span>
              {canCancel && (
                <button
                  type="button"
                  onClick={() => { setCancelError(null); setShowCancelConfirm(true); }}
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-500 transition-colors cursor-pointer"
                >
                  <XCircle className="h-3.5 w-3.5" /> Siparişi İptal Et
                </button>
              )}
            </div>
          </header>

          {/* İptal başarı bildirimi */}
          {cancelDone && (
            <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-4 flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-bold text-emerald-700 dark:text-emerald-400">Siparişiniz iptal edildi</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Ödeme alındıysa iade süreci başlatıldı. İade, bankanıza bağlı olarak birkaç iş günü içinde hesabınıza yansır.
                </p>
              </div>
            </div>
          )}

          {/* Kargo takip — Medusa'nın native fulfillment/shipment akışından
              (admin "Kargoya verildi" + takip no) label'ları okur. Geriye
              dönük uyumluluk için order.metadata'daki bilgiyi de destekler. */}
          {(() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ord = order as any;
            const fulfillments = (ord.fulfillments || []) as Array<{
              shipped_at?: string | null;
              delivered_at?: string | null;
              labels?: Array<{
                tracking_number?: string | null;
                tracking_url?: string | null;
              }>;
            }>;
            const meta = (order.metadata || {}) as Record<string, unknown>;

            // Native label'lar öncelikli; yoksa metadata'daki tek kayıt.
            const labelTracks = fulfillments
              .flatMap((f) => f.labels || [])
              .filter((l) => l && l.tracking_number)
              .map((l) => ({
                number: String(l.tracking_number),
                url: l.tracking_url ? String(l.tracking_url) : undefined,
              }));
            const tracks =
              labelTracks.length > 0
                ? labelTracks
                : meta.tracking_number
                ? [
                    {
                      number: String(meta.tracking_number),
                      url: meta.tracking_url
                        ? String(meta.tracking_url)
                        : undefined,
                    },
                  ]
                : [];

            if (tracks.length === 0) return null;

            const shippedAt =
              fulfillments.find((f) => f.shipped_at)?.shipped_at || null;
            const delivered = fulfillments.some((f) => f.delivered_at);
            const carrier =
              (meta.carrier_name as string | undefined) ||
              (ord.shipping_methods?.[0]?.name as string | undefined) ||
              'Kargo';

            return (
              <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Truck className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                    {delivered ? 'Teslim Edildi' : 'Kargoya Verildi'}
                  </span>
                  {shippedAt && (
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(shippedAt).toLocaleDateString('tr-TR')}
                    </span>
                  )}
                </div>
                <div className="text-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Kargo Firması
                    </div>
                    <div className="font-semibold">{carrier}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Takip Numara{tracks.length > 1 ? 'ları' : 'sı'}
                    </div>
                    <div className="font-mono font-semibold space-y-0.5">
                      {tracks.map((t, i) => (
                        <div key={i}>{t.number}</div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {tracks
                    .filter((t) => t.url)
                    .map((t, i) => (
                      <a
                        key={i}
                        href={t.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 transition-colors"
                      >
                        Kargomu Takip Et{tracks.length > 1 ? ` (${t.number})` : ''}{' '}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    ))}
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Ürünler
              </h2>
              {order.items?.map((it) => (
                <div key={it.id} className="rounded-2xl border border-border bg-metallic-card p-4 flex items-start gap-4">
                  <div className="w-16 h-16 shrink-0 rounded-lg bg-muted border border-border overflow-hidden">
                    {it.thumbnail && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={it.thumbnail} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm">{it.product_title || it.title}</div>
                    {it.variant_title && (
                      <div className="text-xs text-muted-foreground mt-0.5">{it.variant_title}</div>
                    )}
                    <div className="text-xs text-muted-foreground mt-1">
                      {it.quantity} × {formatMoney(it.unit_price as number, order.currency_code)}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-black">
                      {formatMoney((it.total as number) ?? ((it.unit_price as number) * it.quantity), order.currency_code)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-border bg-metallic-card p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" /> Ödeme Özeti
                </h3>
                <div className="space-y-2 text-xs">
                  <Row label="Ara Toplam" value={formatMoney(order.item_subtotal as number ?? order.subtotal as number, order.currency_code)} />
                  <Row label="KDV" value={formatMoney(order.tax_total as number, order.currency_code)} />
                  <Row label="Kargo" value={formatMoney(order.shipping_total as number, order.currency_code)} />
                  <div className="pt-2 border-t border-border flex justify-between items-center">
                    <span className="font-bold">Toplam</span>
                    <span className="font-black text-orange-grad text-base">
                      {formatMoney(order.total as number, order.currency_code)}
                    </span>
                  </div>
                </div>
              </div>

              {ship && (
                <div className="rounded-2xl border border-border bg-metallic-card p-5">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> Teslimat Adresi
                  </h3>
                  <div className="text-xs leading-relaxed">
                    <div className="font-bold text-sm">{ship.first_name} {ship.last_name}</div>
                    {ship.phone && <div className="text-muted-foreground">{ship.phone}</div>}
                    <div className="text-muted-foreground mt-1">
                      {ship.address_1}<br />
                      {ship.province && `${ship.province}, `}{ship.city}<br />
                      {(ship.country_code || '').toUpperCase()}
                    </div>
                  </div>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>

      {/* İptal onay modalı */}
      {showCancelConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => { if (!canceling) setShowCancelConfirm(false); }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="h-10 w-10 shrink-0 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-foreground">Siparişi iptal et?</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  #{order.display_id || order.id.slice(0, 8)} numaralı siparişiniz iptal
                  edilecek. Ödeme alındıysa iade süreci otomatik başlatılır. Bu işlem geri
                  alınamaz.
                </p>
              </div>
            </div>

            {cancelError && (
              <div className="mb-4 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300">
                {cancelError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowCancelConfirm(false)}
                disabled={canceling}
                className="flex-1 h-10 rounded-xl border border-border bg-background text-sm font-bold text-foreground hover:bg-muted transition-colors cursor-pointer disabled:opacity-50"
              >
                Vazgeç
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={canceling}
                className="flex-1 h-10 rounded-xl bg-rose-600 hover:bg-rose-500 text-sm font-bold text-white transition-colors cursor-pointer disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {canceling ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> İptal ediliyor...
                  </>
                ) : (
                  'Evet, iptal et'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground">
      <span>{label}</span>
      <span className="font-semibold text-foreground">{value}</span>
    </div>
  );
}
