"use client";

import React, { useEffect, useState } from "react";
import { Star, MessageSquare, CheckCircle2, Loader2, X } from "lucide-react";
import {
  listProductReviews,
  submitProductReview,
  type ProductReview,
  type ReviewStats,
} from "../../lib/medusa/services/reviews";
import { useCustomer } from "../context/CustomerContext";

interface Props {
  productId: string;
  productName: string;
}

export default function ProductReviews({ productId, productName }: Props) {
  const { customer } = useCustomer();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState<ReviewStats>({
    count: 0,
    average: 0,
    distribution: [],
  });
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    setLoading(true);
    listProductReviews(productId)
      .then(({ reviews, stats }) => {
        setReviews(reviews);
        setStats(stats);
      })
      .finally(() => setLoading(false));
  }, [productId]);

  return (
    <section className="mt-16 border-t border-border pt-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Müşteri Yorumları
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Gerçek alıcılarımızın değerlendirmeleri
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-molten-grad text-white text-sm font-bold h-10 px-4 glow-orange cursor-pointer shrink-0"
          >
            <MessageSquare className="h-4 w-4" /> Yorum Yaz
          </button>
        </div>

        {/* Stats */}
        <div className="rounded-2xl bg-metallic-card border border-border p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="text-center md:border-r md:border-border md:pr-6">
              <div className="text-5xl font-black text-orange-grad">
                {stats.average.toFixed(1)}
              </div>
              <Stars value={Math.round(stats.average)} size="lg" />
              <div className="text-xs text-muted-foreground mt-2">
                {stats.count} değerlendirme
              </div>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              {[5, 4, 3, 2, 1].map((s) => {
                const c =
                  stats.distribution.find((d) => d.stars === s)?.count ?? 0;
                const pct = stats.count > 0 ? (c / stats.count) * 100 : 0;
                return (
                  <div key={s} className="flex items-center gap-3 text-xs">
                    <span className="w-3 font-bold">{s}</span>
                    <Star className="h-3 w-3 fill-accent text-accent" />
                    <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-molten-grad transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-8 text-muted-foreground tabular-nums text-right">
                      {c}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-accent" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center">
            <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm font-semibold text-foreground">
              Henüz yorum yok
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Bu ürünü değerlendiren ilk siz olun!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {reviews.map((r) => (
              <ReviewCard key={r.id} r={r} />
            ))}
          </div>
        )}

        {/* JSON-LD AggregateRating + reviews — Google'da yıldız görünür */}
        {stats.count > 0 && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "Product",
                name: productName,
                aggregateRating: {
                  "@type": "AggregateRating",
                  ratingValue: stats.average,
                  reviewCount: stats.count,
                  bestRating: 5,
                  worstRating: 1,
                },
                review: reviews.slice(0, 5).map((r) => ({
                  "@type": "Review",
                  reviewRating: {
                    "@type": "Rating",
                    ratingValue: r.rating,
                    bestRating: 5,
                  },
                  author: { "@type": "Person", name: r.author_name },
                  reviewBody: r.body,
                  datePublished: r.created_at,
                })),
              }),
            }}
          />
        )}
      </div>

      {showForm && (
        <ReviewForm
          productId={productId}
          defaultAuthorName={
            customer
              ? `${customer.first_name || ""} ${customer.last_name || ""}`.trim() ||
                customer.email?.split("@")[0] ||
                ""
              : ""
          }
          customerId={customer?.id || null}
          onClose={() => setShowForm(false)}
          onSubmitted={() => {
            setShowForm(false);
            // Yeni yorum onay bekliyor — kullanıcıya bilgi
          }}
        />
      )}
    </section>
  );
}

function Stars({
  value,
  size = "md",
}: {
  value: number;
  size?: "sm" | "md" | "lg";
}) {
  const px = size === "lg" ? "h-5 w-5" : size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`${px} ${
            s <= value
              ? "fill-accent text-accent"
              : "fill-transparent text-muted-foreground/30"
          }`}
        />
      ))}
    </div>
  );
}

function ReviewCard({ r }: { r: ProductReview }) {
  const d = new Date(r.created_at);
  return (
    <article className="rounded-xl border border-border bg-card p-5">
      <header className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-sm">{r.author_name}</span>
            {r.is_verified_purchase && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 px-2 py-0.5 text-[10px] font-bold">
                <CheckCircle2 className="h-3 w-3" /> Doğrulanmış Alıcı
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            {d.toLocaleDateString("tr-TR", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </div>
        </div>
        <Stars value={r.rating} />
      </header>
      {r.title && (
        <h3 className="text-sm font-bold mt-2 mb-1.5">{r.title}</h3>
      )}
      <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
        {r.body}
      </p>
    </article>
  );
}

function ReviewForm({
  productId,
  defaultAuthorName,
  customerId,
  onClose,
  onSubmitted,
}: {
  productId: string;
  defaultAuthorName: string;
  customerId: string | null;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState(defaultAuthorName);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!authorName.trim() || !body.trim() || rating < 1) {
      setError("İsim, puan ve yorum zorunlu");
      return;
    }
    setSubmitting(true);
    const res = await submitProductReview({
      productId,
      rating,
      title: title.trim() || undefined,
      body: body.trim(),
      authorName: authorName.trim(),
      customerId,
    });
    setSubmitting(false);
    if (res.ok) {
      setDone(true);
      setTimeout(onSubmitted, 2000);
    } else {
      setError(res.error || "Gönderim başarısız");
    }
  };

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-background border border-border shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted cursor-pointer"
          aria-label="Kapat"
        >
          <X className="h-4 w-4" />
        </button>

        {done ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle2 className="h-14 w-14 text-emerald-500 mx-auto" />
            <h3 className="text-lg font-bold">Yorumunuz Alındı</h3>
            <p className="text-sm text-muted-foreground">
              Yorumunuz incelemeden geçtikten sonra yayınlanacak. Teşekkürler!
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h3 className="text-lg font-bold">Yorum Yaz</h3>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-2">
                Puanınız
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    type="button"
                    key={s}
                    onMouseEnter={() => setHover(s)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(s)}
                    className="p-1 cursor-pointer"
                    aria-label={`${s} yıldız`}
                  >
                    <Star
                      className={`h-7 w-7 transition-colors ${
                        (hover || rating) >= s
                          ? "fill-accent text-accent"
                          : "fill-transparent text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Adınız
              </label>
              <input
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-accent"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Başlık (opsiyonel)
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-accent"
                placeholder="Kısa bir başlık..."
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block mb-1.5">
                Yorumunuz
              </label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:border-accent resize-none"
                placeholder="Ürün hakkındaki deneyiminizi paylaşın..."
                required
              />
            </div>

            {error && (
              <div className="text-xs text-rose-600 bg-rose-500/10 border border-rose-500/30 rounded-lg p-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`w-full h-11 rounded-xl text-sm font-bold text-white transition-all ${
                submitting
                  ? "bg-muted cursor-not-allowed"
                  : "bg-molten-grad glow-orange cursor-pointer"
              }`}
            >
              {submitting ? "Gönderiliyor..." : "Yorumu Gönder"}
            </button>
            <p className="text-[10px] text-muted-foreground text-center">
              Yorumlar admin onayı sonrası yayınlanır.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
