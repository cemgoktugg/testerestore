"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { useCustomer } from "../../context/CustomerContext";
import { useCart } from "../../context/CartContext";
import { formatMoney } from "../../../lib/medusa/format";
import {
  acceptDealerQuote,
  downloadDealerQuotePdf,
  getDealerQuotes,
  requestDealerQuoteRevision,
  type DealerQuote,
} from "../../../lib/medusa/services/dealer";
import { ArrowLeft, Check, Download, FileText, Loader2, Pencil } from "lucide-react";

const STATUS_LABELS: Record<DealerQuote["status"], string> = {
  sent: "Yanıtınız bekleniyor",
  revision_requested: "Revize talebiniz inceleniyor",
  accepted: "Kabul edildi",
  ordered: "Sipariş verildi",
};

/** "." veya "," ondalıklı girişi okur; sayısal değilse NaN. */
const parseDecimal = (raw: string) => Number(raw.replace(",", ".").trim());

export default function DealerQuotesPage() {
  const { customer, loading: customerLoading } = useCustomer();
  const [quotes, setQuotes] = useState<DealerQuote[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [revising, setRevising] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [revisionNote, setRevisionNote] = useState("");
  const { refreshCart } = useCart();
  const router = useRouter();

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

  async function accept(q: DealerQuote) {
    setBusy(q.id);
    setError(null);
    const failure = await acceptDealerQuote(q.id);
    if (failure) {
      setError(failure);
      setBusy(null);
      return;
    }
    await refreshCart();
    router.push("/cart");
  }

  function startRevision(q: DealerQuote) {
    setRevising(q.id);
    setPrices({});
    setRevisionNote("");
    setError(null);
  }

  async function sendRevision(q: DealerQuote) {
    const items = [];
    for (const i of q.items) {
      const raw = (prices[i.id] ?? "").trim();
      if (!raw) continue;
      const value = parseDecimal(raw);
      if (!Number.isFinite(value) || value <= 0) {
        setError(`${i.title}: geçerli bir fiyat yazın.`);
        return;
      }
      items.push({ id: i.id, requested_unit_price: value });
    }
    const note = revisionNote.trim() || null;
    if (!items.length && !note) {
      setError("En az bir fiyat ya da not yazın.");
      return;
    }
    setBusy(q.id);
    setError(null);
    const failure = await requestDealerQuoteRevision(q.id, { note, items });
    if (failure) {
      setError(failure);
    } else {
      setRevising(null);
      setQuotes(await getDealerQuotes());
    }
    setBusy(null);
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
                        {new Date(q.sent_at ?? q.created_at).toLocaleDateString("tr-TR")} ·{" "}
                        <span className="font-semibold text-accent">{STATUS_LABELS[q.status]}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                    {(q.status === "sent" || q.status === "accepted") && (
                      <button
                        type="button"
                        onClick={() => accept(q)}
                        disabled={busy === q.id}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-molten-grad px-4 text-sm font-bold text-white disabled:opacity-60"
                      >
                        {busy === q.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        {q.status === "sent" ? "Teklifi Kabul Et" : "Sepete Git"}
                      </button>
                    )}
                    {q.status === "sent" && (
                      <button
                        type="button"
                        onClick={() => startRevision(q)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold hover:border-accent"
                      >
                        <Pencil className="h-4 w-4" />
                        Revize İste
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => download(q)}
                      disabled={downloading === q.id}
                      className="inline-flex h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold hover:border-accent disabled:opacity-60"
                    >
                      {downloading === q.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      PDF İndir
                    </button>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr className="border-b border-border">
                          <th className="py-2 pr-4 text-left font-semibold">Ürün</th>
                          <th className="py-2 px-4 text-right font-semibold">Adet</th>
                          <th className="py-2 px-4 text-right font-semibold">Birim Fiyat</th>
                          {revising === q.id && (
                            <th className="py-2 px-4 text-right font-semibold">İstediğiniz Fiyat</th>
                          )}
                          {q.status === "revision_requested" && (
                            <th className="py-2 px-4 text-right font-semibold">İstediğiniz Fiyat</th>
                          )}
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
                            {revising === q.id && (
                              <td className="py-2 px-4 text-right">
                                <input
                                  inputMode="decimal"
                                  aria-label={`${i.title} ${i.detail ?? ""} istediğiniz fiyat`}
                                  placeholder="Değişmesin"
                                  value={prices[i.id] ?? ""}
                                  onChange={(e) =>
                                    setPrices((prev) => ({ ...prev, [i.id]: e.target.value }))
                                  }
                                  className="w-28 rounded-lg border border-border bg-background px-2 py-1 text-right text-sm"
                                />
                              </td>
                            )}
                            {q.status === "revision_requested" && (
                              <td className="py-2 px-4 text-right font-semibold">
                                {i.requested_unit_price === null
                                  ? "—"
                                  : formatMoney(i.requested_unit_price, "try")}
                              </td>
                            )}
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
                  {q.status === "revision_requested" && q.revision_note && (
                    <p className="mt-3 text-sm text-muted-foreground">Notunuz: {q.revision_note}</p>
                  )}
                  {revising === q.id && (
                    <div className="mt-4 space-y-3 rounded-xl border border-border p-4">
                      <p className="text-xs text-muted-foreground">
                        Değişmesini istediğiniz satırlara KDV hariç birim fiyat yazın. Boş bıraktığınız satırlar
                        olduğu gibi kalır.
                      </p>
                      <textarea
                        aria-label="Revize notunuz"
                        placeholder="Notunuz (isteğe bağlı)"
                        value={revisionNote}
                        onChange={(e) => setRevisionNote(e.target.value)}
                        rows={3}
                        maxLength={1000}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setRevising(null)}
                          className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-bold"
                        >
                          Vazgeç
                        </button>
                        <button
                          type="button"
                          onClick={() => sendRevision(q)}
                          disabled={busy === q.id}
                          className="inline-flex h-10 items-center gap-2 rounded-xl bg-molten-grad px-4 text-sm font-bold text-white disabled:opacity-60"
                        >
                          {busy === q.id && <Loader2 className="h-4 w-4 animate-spin" />}
                          Revize Talebini Gönder
                        </button>
                      </div>
                    </div>
                  )}
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
