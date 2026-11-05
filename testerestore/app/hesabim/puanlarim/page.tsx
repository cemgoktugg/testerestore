"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useCustomer } from "../../context/CustomerContext";
import { useRouter } from "next/navigation";
import { MEDUSA_READY } from "../../../lib/medusa/config";
import { medusa } from "../../../lib/medusa/client";
import { formatMoney } from "../../../lib/medusa/format";
import {
  Loader2,
  ArrowLeft,
  Award,
  TrendingUp,
  Sparkles,
  Calendar,
} from "lucide-react";

interface LoyaltyTransaction {
  id: string;
  order_id: string | null;
  points: number;
  reason: string | null;
  created_at: string;
}

interface LoyaltyData {
  balance: number;
  lifetime_earned: number;
  balance_try: number;
  transactions: LoyaltyTransaction[];
  redemptions: Array<{ id: string; request_key: string; points: number; code: string; status: 'draft' | 'reserved' | 'ready' }>;
}

export default function LoyaltyPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useCustomer();
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [points, setPoints] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const pendingRequest = useRef<{ request_key: string; points: number } | null>(null);
  const redeemingRef = useRef(false);

  const load = useCallback(async () => {
    if (!MEDUSA_READY) {
      setError('Puan bilgisi şu anda alınamıyor.');
      setLoading(false);
      return;
    }
    try {
      setData(await medusa.client.fetch<LoyaltyData>('/store/loyalty/me'));
      setError(null);
    } catch {
      setError('Puan bilgisi alınamadı. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  }, []);

  async function redeem(existing?: { request_key: string; points: number }) {
    if (redeemingRef.current) return;
    const amount = Number(points);
    if (!existing && (!Number.isSafeInteger(amount) || amount < 1)) return;
    const request = existing ?? pendingRequest.current ?? { request_key: crypto.randomUUID(), points: amount };
    pendingRequest.current = request;
    redeemingRef.current = true;
    setRedeeming(true);
    setMessage(null);
    try {
      const result = await medusa.client.fetch<{ redemption: { code: string } }>('/store/loyalty/redeem', { method: 'POST', body: request });
      setMessage(`Kuponunuz hazır: ${result.redemption.code}. Sepette kupon alanına ekleyebilirsiniz.`);
      pendingRequest.current = null;
      setPoints('');
    } catch {
      setMessage('Kupon dönüşümü tamamlanamadı. Aynı işlemi yeniden deneyebilirsiniz; ikinci kez puan düşülmez.');
    } finally {
      await load();
      redeemingRef.current = false;
      setRedeeming(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/giris?next=/hesabim/puanlarim");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (isAuthenticated) void load();
  }, [isAuthenticated, load]);

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

  return (
    <>
      <Header />
      <main className="flex-1 py-8 md:py-16 bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/hesabim"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Hesabıma Dön
          </Link>

          <header className="mb-8 pb-4 border-b border-border flex items-center gap-3">
            <Award className="h-6 w-6 text-accent" />
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
                Puanlarım
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Her 100 TL alışverişte 1 puan kazanın · 1 puan = 0,50 TL indirim
              </p>
            </div>
          </header>

          {error && <div role="alert" className="mb-6 rounded-xl border border-rose-500/30 p-4 text-sm">
            {error} <button type="button" onClick={() => void load()} className="ml-2 font-bold underline">Tekrar dene</button>
          </div>}

          {/* Bakiye kartları */}
          {data && <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl bg-gradient-to-br from-accent/20 to-orange-500/10 border border-accent/40 p-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Aktif Bakiye
                </span>
              </div>
              <div className="text-5xl font-black text-orange-grad">
                {Math.max(0, data.balance)}
              </div>
              <div className="text-xs text-muted-foreground mt-1 font-semibold">
                ≈ {formatMoney(data?.balance_try ?? 0, "try")} indirim değeri
              </div>
            </div>
            <div className="rounded-2xl bg-card border border-border p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Toplam Kazanılan
                </span>
              </div>
              <div className="text-5xl font-black text-foreground">
                {data?.lifetime_earned ?? 0}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Yaşam boyu puanlarınız
              </div>
            </div>
          </div>

          {data.balance < 0 && <p className="mb-6 text-sm text-muted-foreground">İptal veya iade nedeniyle {Math.abs(data.balance)} puan düzeltmesi bulunuyor. Yeni kazanımlarınız önce bu farkı kapatır.</p>}
          <section className="mb-8 rounded-2xl border border-border bg-card p-6 space-y-3">
            <h2 className="font-bold">Puanlarını kupona dönüştür</h2>
            <p className="text-xs text-muted-foreground">1 puan = 0,50 TL. Kupon yalnızca hesabınızla ve tek siparişte kullanılabilir. Sepet tutarından fazla puanı dönüştürmeyin; kullanılmayan kupon tutarı sonraki siparişe aktarılmaz.</p>
            <form className="flex flex-wrap gap-3 items-end" onSubmit={(event) => { event.preventDefault(); void redeem(); }}>
              <label className="text-sm space-y-1"><span className="block">Dönüştürülecek puan</span>
                <input type="number" min={1} step={1} max={Math.max(0, data.balance)} value={points} onChange={(event) => { setPoints(event.target.value); pendingRequest.current = null; }} disabled={redeeming} required className="w-36 h-10 rounded-lg border border-border bg-background px-3" />
              </label>
              <button type="submit" disabled={redeeming || data.balance < 1} className="h-10 px-4 rounded-xl bg-molten-grad text-white font-bold text-sm disabled:opacity-50">{redeeming ? 'Hazırlanıyor…' : 'Kupon oluştur'}</button>
            </form>
            {message && <p role="status" className="text-sm break-all">{message}</p>}
            {(data.redemptions ?? []).length > 0 && <div className="space-y-2 pt-2">
              <h3 className="text-sm font-bold">Kupon dönüşümlerim</h3>
              {data.redemptions.map((redemption) => <div key={redemption.id} className="rounded-lg border border-border p-3 text-sm">
                <p>{redemption.points} puan · {formatMoney(redemption.points * .5, 'try')}</p>
                {redemption.status === 'ready' ? <code className="block mt-1 select-all break-all">{redemption.code}</code> : <button type="button" disabled={redeeming} onClick={() => void redeem(redemption)} className="mt-1 font-bold underline">{redemption.status === 'reserved' ? 'Ayrılan puanla kuponu tamamla' : 'Kupon oluşturmayı tekrar dene'}</button>}
              </div>)}
            </div>}
          </section>
          </>}

          {/* Hareketler */}
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Puan Hareketleri
          </h2>
          {data && (data.transactions.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-border bg-metallic-card">
              <Award className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold">Henüz puan hareketi yok</p>
              <p className="text-xs text-muted-foreground mt-1">
                İlk tamamlanan siparişinizden sonra burada görünür.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {data.transactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-border bg-card p-4"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold">
                      {t.reason || (t.points > 0 ? "Puan kazanımı" : "Puan kullanımı")}
                    </div>
                    <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <Calendar className="h-3 w-3" />
                      {new Date(t.created_at).toLocaleString("tr-TR")}
                    </div>
                  </div>
                  <div
                    className={`text-lg font-black shrink-0 ml-4 ${
                      t.points > 0 ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {t.points > 0 ? "+" : ""}
                    {t.points}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {/* Nasıl çalışır kutusu */}
          <div className="mt-10 rounded-2xl border border-border bg-muted/30 p-6 text-sm space-y-2">
            <h3 className="font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent" /> Nasıl çalışır?
            </h3>
            <ul className="text-xs text-muted-foreground space-y-1.5 leading-relaxed pl-5 list-disc">
              <li>
                Her tamamlanmış siparişin <strong>%1&apos;i</strong> kadar puan
                kazanırsınız (örn. 1.500 TL alışveriş → 15 puan).
              </li>
              <li>
                1 puan = <strong>0,50 TL</strong> indirim değerindedir.
              </li>
              <li>
                Puanlarınız sipariş tamamlandığında otomatik hesabınıza eklenir.
              </li>
              <li>
                İade durumlarında ilgili puanlar geri çekilebilir.
              </li>
            </ul>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
