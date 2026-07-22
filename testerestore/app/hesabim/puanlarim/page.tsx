"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useCustomer } from "../../context/CustomerContext";
import { useRouter } from "next/navigation";
import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
  MEDUSA_READY,
} from "../../../lib/medusa/config";
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
}

export default function LoyaltyPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useCustomer();
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/giris?next=/hesabim/puanlarim");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (!isAuthenticated || !MEDUSA_READY) return;
    fetch(`${MEDUSA_BACKEND_URL}/store/loyalty/me`, {
      credentials: "include",
      headers: { "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [isAuthenticated]);

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

          {/* Bakiye kartları */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <div className="rounded-2xl bg-gradient-to-br from-accent/20 to-orange-500/10 border border-accent/40 p-6">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-accent" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                  Aktif Bakiye
                </span>
              </div>
              <div className="text-5xl font-black text-orange-grad">
                {data?.balance ?? 0}
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

          {/* Hareketler */}
          <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
            Puan Hareketleri
          </h2>
          {!data || data.transactions.length === 0 ? (
            <div className="text-center py-12 rounded-xl border border-dashed border-border bg-metallic-card">
              <Award className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="text-sm font-semibold">Henüz puan hareketi yok</p>
              <p className="text-xs text-muted-foreground mt-1">
                İlk siparişinizden sonra burada görünür.
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
          )}

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
