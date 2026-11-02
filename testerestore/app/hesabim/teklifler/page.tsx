"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useCustomer } from "../../context/CustomerContext";
import { formatMoney } from "../../../lib/medusa/format";
import {
  downloadDealerQuotePdf,
  getDealerQuotes,
  type DealerQuote,
} from "../../../lib/medusa/services/dealer";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";

export default function DealerQuotesPage() {
  const { customer, loading: customerLoading } = useCustomer();
  const [quotes, setQuotes] = useState<DealerQuote[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (customerLoading) return;
    let cancelled = false;
    (customer ? getDealerQuotes() : Promise.resolve(null)).then((data) => {
      if (cancelled) return;
      setQuotes(data);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [customer, customerLoading]);

  async function download(q: DealerQuote) {
    setDownloading(q.id);
    setError(null);
    const ok = await downloadDealerQuotePdf(q.id, q.number);
    if (!ok) setError("PDF indirilemedi. Lütfen tekrar deneyin.");
    setDownloading(null);
  }

  return (
    <>
      <Header />
      <main className="flex-1 py-8 md:py-16 bg-background">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/hesabim"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Hesabıma Dön
          </Link>
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            <FileText className="h-6 w-6 text-accent" />
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Tekliflerim</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Size hazırlanan teklifler. Birim fiyatlara KDV dahil değildir.
              </p>
            </div>
          </div>

          {error && <p role="alert" className="mb-4 text-sm font-semibold text-rose-600">{error}</p>}

          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
            </div>
          ) : quotes === null ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Bu sayfa bayi hesaplarına özeldir.
            </p>
          ) : quotes.length === 0 ? (
            <p className="py-16 text-center text-sm text-muted-foreground">
              Henüz size gönderilmiş bir teklif yok.
            </p>
          ) : (
            <div className="space-y-6">
              {quotes.map((q) => (
                <section key={q.id} className="rounded-2xl border border-border bg-metallic-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="font-bold">{q.number}</h2>
                      <p className="text-xs text-muted-foreground">
                        {new Date(q.sent_at ?? q.created_at).toLocaleDateString("tr-TR")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => download(q)}
                      disabled={downloading === q.id}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-molten-grad px-4 text-sm font-bold text-white disabled:opacity-60"
                    >
                      {downloading === q.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      PDF İndir
                    </button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr className="border-b border-border">
                          <th className="py-2 pr-4 text-left font-semibold">Ürün</th>
                          <th className="py-2 px-4 text-right font-semibold">Adet</th>
                          <th className="py-2 px-4 text-right font-semibold">Birim Fiyat</th>
                          <th className="py-2 pl-4 text-right font-semibold">Tutar</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {q.items.map((i) => (
                          <tr key={i.id}>
                            <td className="py-2 pr-4">
                              <div className="font-semibold">{i.title}</div>
                              {i.detail && <div className="text-xs text-muted-foreground">{i.detail}</div>}
                            </td>
                            <td className="py-2 px-4 text-right">{i.quantity}</td>
                            <td className="py-2 px-4 text-right">{formatMoney(i.unit_price, "try")}</td>
                            <td className="py-2 pl-4 text-right">{formatMoney(i.unit_price * i.quantity, "try")}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <dl className="mt-4 ml-auto max-w-xs space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">Ara Toplam (KDV hariç)</dt>
                      <dd>{formatMoney(q.subtotal, "try")}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">KDV (%20)</dt>
                      <dd>{formatMoney(q.tax, "try")}</dd>
                    </div>
                    <div className="flex justify-between font-bold">
                      <dt>Genel Toplam</dt>
                      <dd>{formatMoney(q.total, "try")}</dd>
                    </div>
                  </dl>
                  {q.note && <p className="mt-3 text-sm text-muted-foreground">Not: {q.note}</p>}
                </section>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
