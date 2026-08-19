"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Send, X, Loader2, RotateCcw } from "lucide-react";

/**
 * Şerit Testere Danışmanı — yüzen sohbet baloncuğu.
 *
 * Arkasında Rules Engine + RAG servisi var; bu bileşen ona doğrudan değil,
 * kendi origin'imizdeki /api/advisor proxy'si üzerinden konuşur (bkz.
 * app/api/advisor/[...path]/route.ts). Bu sayede CORS yok, servis URL'i
 * dışarı sızmıyor ve rate limit sunucu tarafında uygulanıyor.
 *
 * Konumlandırma: WhatsAppButton `bottom-5 right-5` (h-14) kullanıyor;
 * bu buton onun üstünde `bottom-24` ile duruyor, çakışma yok.
 */

const SESSION_KEY = "ts_advisor_session";
const GREETING =
  "Merhaba! Şerit testere seçiminde yardımcı olayım. Makinenizi, keseceğiniz malzemeyi veya aklınızdaki teknik soruyu yazabilirsiniz.";

type Role = "user" | "bot";

interface ChatMessage {
  id: number;
  role: Role;
  text: string;
  recommendation?: Recommendation | null;
  match?: SuggestResult | null;
}

/**
 * Advisor'ın önerisi. Alanlar RulesEngine.get_recommendation() ile birebir
 * (rules_engine/engine.py:338). Hepsi opsiyonel: konuşma yarıda kaldığında
 * motor kısmi öneri döndürebiliyor.
 */
interface Recommendation {
  sku?: string | null;
  blade_type?: string | null;
  blade_width_mm?: number | null;
  blade_thickness_mm?: number | null;
  tooth_pitch?: string | null;
  blade_length_mm?: number | null;
  confidence?: string | null;
  [key: string]: unknown;
}

/** /api/advisor/suggest çıktısı — katalogla eşleştirme sonucu. */
interface ReadyMadeMatch {
  handle: string;
  title: string;
  price: number | null;
  currency_code: string;
  tooth_pitch: string | null;
  url: string;
}

interface SuggestResult {
  ready_made: ReadyMadeMatch[];
  /** true → diş adımı dahil tam eşleşme. false → aynı ölçü, farklı diş. */
  exact: boolean;
  configurable: { handle: string; label: string; url: string };
}

interface ChatApiResponse {
  success?: boolean;
  response?: string;
  session_id?: string;
  error?: string;
  recommendation?: Recommendation | null;
  next_question?: unknown;
}

/** Öneri kartında gösterilecek alanların Türkçe etiketleri. */
const REC_LABELS: Array<[string, string, string]> = [
  ["blade_width_mm", "Genişlik", "mm"],
  ["blade_thickness_mm", "Kalınlık", "mm"],
  ["tooth_pitch", "Diş adımı", "TPI"],
  ["blade_length_mm", "Boy", "mm"],
];

const TRY_FMT = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

/**
 * next_question servis tarafında bazen düz metin, bazen {text, options}
 * nesnesi olarak dönüyor. İkisini de kaldıracak şekilde okuyoruz — şekil
 * değişirse widget kırılmasın, sadece butonları göstermesin.
 */
function readOptions(nq: unknown): string[] {
  if (!nq || typeof nq !== "object") return [];
  const opts = (nq as { options?: unknown }).options;
  if (!Array.isArray(opts)) return [];
  return opts
    .map((o) => {
      if (typeof o === "string") return o;
      if (o && typeof o === "object") {
        const rec = o as { label?: unknown; value?: unknown; text?: unknown };
        for (const v of [rec.label, rec.value, rec.text]) {
          if (typeof v === "string") return v;
        }
      }
      return "";
    })
    .filter((s): s is string => s.length > 0)
    .slice(0, 6);
}

/**
 * Öneriyi sitedeki ürünle eşleştirir. Hata durumunda null döner — eşleştirme
 * sohbeti bloklamamalı, link yoksa kart yine de öneriyi gösterir.
 */
async function fetchMatch(rec: Recommendation): Promise<SuggestResult | null> {
  // Ölçü yoksa soracak bir şey yok (konuşma henüz tamamlanmamış demektir).
  if (!rec.blade_width_mm && !rec.blade_length_mm) return null;
  try {
    const res = await fetch("/api/advisor/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        blade_type: rec.blade_type,
        blade_width_mm: rec.blade_width_mm,
        blade_thickness_mm: rec.blade_thickness_mm,
        tooth_pitch: rec.tooth_pitch,
        blade_length_mm: rec.blade_length_mm,
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as SuggestResult;
  } catch {
    return null;
  }
}

function newSessionId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `s_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  }
}

export default function AdvisorWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<string[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: "bot", text: GREETING },
  ]);

  const sessionRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  // Oturum kimliği sekme ömrü boyunca sabit kalsın (konuşma bağlamı sunucuda
  // bu id ile tutuluyor). sessionStorage: sekme kapanınca sıfırlanır.
  useEffect(() => {
    try {
      const existing = sessionStorage.getItem(SESSION_KEY);
      if (existing) {
        sessionRef.current = existing;
        return;
      }
      const id = newSessionId();
      sessionStorage.setItem(SESSION_KEY, id);
      sessionRef.current = id;
    } catch {
      sessionRef.current = newSessionId();
    }
  }, []);

  // Yeni mesajda en alta kaydır
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  // Açılınca input'a odaklan; Escape ile kapan
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const push = useCallback((m: Omit<ChatMessage, "id">) => {
    setMessages((prev) => [...prev, { ...m, id: nextId.current++ }]);
  }, []);

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      push({ role: "user", text });
      setInput("");
      setOptions([]);
      setBusy(true);

      try {
        const res = await fetch("/api/advisor/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            session_id: sessionRef.current,
          }),
        });

        const data = (await res.json().catch(() => ({}))) as ChatApiResponse;

        // Sunucu session_id döndürdüyse ona sadık kal
        if (data.session_id && data.session_id !== sessionRef.current) {
          sessionRef.current = data.session_id;
          try {
            sessionStorage.setItem(SESSION_KEY, data.session_id);
          } catch {
            /* sessionStorage kapalıysa bellekte devam */
          }
        }

        const reply =
          data.response ||
          (res.ok
            ? "Bu soruyu şu an cevaplayamadım. Farklı bir şekilde sorabilir misiniz?"
            : "Danışmana ulaşılamadı. Lütfen biraz sonra tekrar deneyin.");

        // Öneri geldiyse katalogla eşleştir. Mesajı basmadan önce yapıyoruz ki
        // kart tek seferde tam görünsün (sonradan link belirmesi zıplama yapar).
        const rec = data.recommendation ?? null;
        const match = rec ? await fetchMatch(rec) : null;

        push({ role: "bot", text: reply, recommendation: rec, match });
        setOptions(readOptions(data.next_question));
      } catch {
        push({
          role: "bot",
          text: "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.",
        });
      } finally {
        setBusy(false);
        inputRef.current?.focus();
      }
    },
    [busy, push]
  );

  const reset = useCallback(async () => {
    const id = sessionRef.current;
    setMessages([{ id: nextId.current++, role: "bot", text: GREETING }]);
    setOptions([]);
    setInput("");
    try {
      await fetch("/api/advisor/chat/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: id }),
      });
    } catch {
      /* sunucu sıfırlanamasa da arayüz temiz başlasın */
    }
  }, []);

  return (
    <>
      {/* Açma butonu — WhatsApp butonunun üstünde */}
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Şerit testere danışmanını aç"
          className="fixed bottom-24 right-5 z-50 inline-flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl cursor-pointer"
        >
          <Bot className="h-7 w-7" aria-hidden="true" />
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Şerit testere danışmanı"
          className="fixed bottom-24 right-5 z-50 flex w-[min(23rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-2xl"
          style={{ height: "min(30rem, calc(100vh - 9rem))" }}
        >
          {/* Başlık */}
          <div className="flex items-center gap-2 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
            <Bot className="h-5 w-5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">
                Şerit Testere Danışmanı
              </p>
              <p className="truncate text-xs opacity-80">
                Makine ve malzemenize göre bıçak önerisi
              </p>
            </div>
            <button
              type="button"
              onClick={() => void reset()}
              aria-label="Sohbeti sıfırla"
              className="rounded-md p-1.5 transition-colors hover:bg-black/10 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Danışmanı kapat"
              className="rounded-md p-1.5 transition-colors hover:bg-black/10 cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {/* Mesajlar */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
            aria-live="polite"
          >
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user" ? "flex justify-end" : "flex justify-start"
                }
              >
                <div
                  className={[
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed",
                    m.role === "user"
                      ? "rounded-br-sm bg-primary text-primary-foreground"
                      : "rounded-bl-sm bg-muted text-foreground",
                  ].join(" ")}
                >
                  {m.text}
                  {m.recommendation && (
                    <RecommendationCard
                      rec={m.recommendation}
                      match={m.match ?? null}
                    />
                  )}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Danışman düşünüyor…
                </div>
              </div>
            )}
          </div>

          {/* Hazır seçenekler (servis gönderirse) */}
          {options.length > 0 && !busy && (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => void send(opt)}
                  className="rounded-full border border-border bg-background px-3 py-1 text-xs transition-colors hover:bg-muted cursor-pointer"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Giriş */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-center gap-2 border-t border-border px-3 py-2"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              disabled={busy}
              placeholder="Örn: 27mm makinemde paslanmaz kesiyorum"
              aria-label="Danışmana mesajınız"
              className="min-w-0 flex-1 rounded-full border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={busy || input.trim().length === 0}
              aria-label="Gönder"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-40 cursor-pointer"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </>
  );
}

function RecommendationCard({
  rec,
  match,
}: {
  rec: Recommendation;
  match: SuggestResult | null;
}) {
  const rows = REC_LABELS.filter(([key]) => {
    const v = rec[key];
    return v !== undefined && v !== null && String(v).trim() !== "" && String(v) !== "N/A";
  });

  if (rows.length === 0) return null;

  const ready = match?.ready_made ?? [];

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-background p-2 text-foreground">
      <div>
        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Önerilen bıçak
        </p>
        <dl className="space-y-0.5 text-xs">
          {rows.map(([key, label, unit]) => (
            <div key={key} className="flex justify-between gap-2">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="text-right font-medium">
                {String(rec[key])} {unit}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Hazır stok — birebir ya da aynı ölçüde farklı diş adımı */}
      {ready.length > 0 && (
        <div className="border-t border-border pt-2">
          <p className="mb-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            {match?.exact
              ? "✓ Hazır stokta — aynı ölçü"
              : "Aynı ölçüde hazır ürün (diş adımı farklı)"}
          </p>
          <div className="space-y-1">
            {ready.map((p) => (
              <a
                key={p.handle}
                href={p.url}
                className="block rounded-md border border-border px-2 py-1.5 transition-colors hover:bg-muted"
              >
                <span className="block text-xs font-medium leading-snug">
                  {p.title}
                </span>
                {p.price !== null && (
                  <span className="text-xs text-muted-foreground">
                    {TRY_FMT.format(p.price)}
                  </span>
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Yapılandırılabilir ürün — her ölçü, özel boy hesaplanabiliyor */}
      {match?.configurable && (
        <div className="border-t border-border pt-2">
          <a
            href={match.configurable.url}
            className="block rounded-md border border-border px-2 py-1.5 text-xs transition-colors hover:bg-muted"
          >
            <span className="block font-medium">{match.configurable.label}</span>
            <span className="text-muted-foreground">
              {ready.length > 0
                ? "Farklı ölçü / özel boy hesapla"
                : "Bu ölçüyü özel boy olarak hesapla"}
            </span>
          </a>
        </div>
      )}
    </div>
  );
}
