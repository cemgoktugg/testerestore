"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bot,
  Send,
  X,
  Loader2,
  RotateCcw,
  ShoppingCart,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";
import { useCart } from "../context/CartContext";
import AdvisorRichText from "./AdvisorRichText";
import { setStoredCartId } from "../../lib/medusa/services/cart";
import {
  CONSENT_ACCEPT,
  CONSENT_CANCEL,
  CONSENT_QUESTION,
  EMPTY_FORM,
  PURCHASE_STEPS,
  buildSignupPayload,
  derivePurchaseTarget,
  describeTarget,
  type PurchaseForm,
  type PurchaseTarget,
  type Recommendation,
  type SignupResponse,
  type SuggestResult,
} from "./advisor-purchase";

/**
 * Şerit Testere Danışmanı — yüzen sohbet baloncuğu.
 *
 * Arkasında Rules Engine + RAG servisi var; bu bileşen ona doğrudan değil,
 * kendi origin'imizdeki /api/advisor proxy'si üzerinden konuşur (bkz.
 * app/api/advisor/[...path]/route.ts). Bu sayede CORS yok, servis URL'i
 * dışarı sızmıyor ve rate limit sunucu tarafında uygulanıyor.
 *
 * İki mod var:
 *   • "chat"     — soru/cevap, öneri üretimi (LLM + kural motoru)
 *   • "purchase" — öneri beğenilince açılan, adım adım bilgi toplayan akış
 *
 * Satın alma modunda LLM'e HİÇ istek gitmez: sorular bu dosyada tanımlı
 * (bkz. advisor-purchase.ts), cevaplar burada doğrulanır ve tek seferde
 * /api/advisor/purchase ucuna gönderilir. Yani müşterinin adı, telefonu ve
 * adresi OpenAI'ye hiç uğramaz.
 *
 * Konumlandırma: WhatsAppButton `bottom-5 right-5` (h-14) kullanıyor;
 * bu buton onun üstünde `bottom-24` ile duruyor, çakışma yok.
 */

const SESSION_KEY = "ts_advisor_session";
const CART_ID_KEY = "ts_cart_id";
// Yapay zekâ beyanı ilk mesajda (Ticari Reklam Yönetmeliği değişikliği,
// 1 Ağustos 2026: satın alma kararını etkileyebilecek YZ kullanımı açıkça
// belirtilmeli). Kimlik: "TestereStore'un yapay zekâ asistanı".
const GREETING =
  "Merhaba! Ben TestereStore'un yapay zekâ asistanıyım. Bıçak seçimi, fiyat ve hazır stok, kargo-ödeme-iade ya da kesim sorunları hakkında sorabilirsiniz; makinenizi veya keseceğiniz malzemeyi yazmanız yeterli.";

type Role = "user" | "bot";

/**
 * Sohbetin altında beliren hazır cevap butonu.
 *
 * `run` yoksa buton kendi etiketini sohbete gönderir — danışmanın kendi
 * seçenekleri (next_question.options) böyle çalışıyor. Satın alma akışının
 * butonları ise kendi işlerini yapmak için `run` veriyor.
 */
interface QuickAction {
  label: string;
  run?: () => void;
  tone?: "primary" | "default";
}

interface ChatMessage {
  id: number;
  role: Role;
  text: string;
  recommendation?: Recommendation | null;
  match?: SuggestResult | null;
  /** Kayıt tamamlandığında basılan özet kartı. */
  receipt?: SignupResponse | null;
  /** Danışman servisinden gelen cevap (👍/👎 yalnızca bunlarda gösterilir). */
  fromAdvisor?: boolean;
}

interface ChatApiResponse {
  success?: boolean;
  response?: string;
  session_id?: string;
  error?: string;
  recommendation?: Recommendation | null;
  next_question?: unknown;
}

/** Satın alma akışının o anki durumu. */
interface PurchaseState {
  target: PurchaseTarget;
  /** PURCHASE_STEPS içindeki sıra; uzunluğa eşitse onay adımındayız. */
  stepIndex: number;
  form: PurchaseForm;
  submitting: boolean;
}

/**
 * Onay adımının butonları. Etiketler `send()` üzerinden `answerStep`'e gider;
 * ayrı bir işleyiciye gerek yok (bkz. QuickAction).
 */
const CONSENT_ACTIONS: QuickAction[] = [
  { label: CONSENT_ACCEPT, tone: "primary" },
  { label: CONSENT_CANCEL },
];

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

/** Tarayıcıda zaten dolu bir sepet var mı? (Uyarı metni için.) */
function hasOtherCart(newCartId: string): boolean {
  try {
    const existing = localStorage.getItem(CART_ID_KEY);
    return !!existing && existing !== newCartId;
  } catch {
    return false;
  }
}

export default function AdvisorWidget() {
  const router = useRouter();
  const { refreshCart } = useCart();

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  // Cevaplara verilen 👍/👎 (mesaj id → oy); yalnızca bu oturumda tutulur.
  const [ratings, setRatings] = useState<Record<number, "up" | "down">>({});
  const [actions, setActions] = useState<QuickAction[]>([]);
  const [purchase, setPurchase] = useState<PurchaseState | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 0, role: "bot", text: GREETING },
  ]);

  const sessionRef = useRef<string>("");

  /** Cevaba 👍/👎 — danışmanın olay kaydına gider (cevabın ilk 300 karakteriyle). */
  const rate = useCallback((m: { id: number; text: string }, rating: "up" | "down") => {
    setRatings((prev) => ({ ...prev, [m.id]: rating }));
    void fetch("/api/advisor/chat/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionRef.current, rating, bot_text: m.text.slice(0, 300) }),
    }).catch(() => {
      /* geri bildirim gidemese de sohbet sürer */
    });
  }, []);
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

  // ── Sepete geçiş ───────────────────────────────────────────────────────
  // Sunucuda hazırlanan sepeti bu tarayıcının aktif sepeti yapıp checkout'a
  // götürür. refreshCart() hem Medusa sepetini hem eski yerel listeyi
  // yeniden kurar (bkz. CartContext.refreshCart), o yüzden ayrıca bir
  // senkronizasyon gerekmiyor.
  const goToCheckout = useCallback(
    async (cartId: string) => {
      setStoredCartId(cartId);
      await refreshCart();
      setOpen(false);
      router.push("/checkout");
    },
    [refreshCart, router]
  );

  // ── Satın alma akışı ───────────────────────────────────────────────────

  /**
   * Sıradaki soruyu (ve varsa hazır cevap butonlarını) basar.
   *
   * Butonların ayrı bir işleyicisi yok: etiketleri `send()` üzerinden geçiyor,
   * `send()` de satın alma modunda cevabı `answerStep`'e yönlendiriyor. Yani
   * "2" yazmakla "2" butonuna basmak tamamen aynı yoldan ilerliyor.
   */
  const askStep = useCallback(
    (state: PurchaseState) => {
      if (state.stepIndex < PURCHASE_STEPS.length) {
        const step = PURCHASE_STEPS[state.stepIndex];
        push({ role: "bot", text: step.question });
        setActions((step.options ?? []).map((label) => ({ label })));
        return;
      }
      push({ role: "bot", text: CONSENT_QUESTION });
      setActions(CONSENT_ACTIONS);
    },
    [push]
  );

  const cancelPurchase = useCallback(() => {
    setPurchase(null);
    setActions([]);
    push({
      role: "bot",
      text: "Tamam, kaydı iptal ettim. Başka bir sorunuz varsa yazabilirsiniz.",
    });
  }, [push]);

  const submitPurchase = useCallback(
    async (state: PurchaseState) => {
      setPurchase({ ...state, submitting: true });
      setActions([]);
      setBusy(true);

      try {
        const res = await fetch("/api/advisor/purchase", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            buildSignupPayload(state.form, state.target, sessionRef.current)
          ),
        });
        const data = (await res.json().catch(() => ({}))) as SignupResponse;

        if (!res.ok || !data.ok || !data.cart_id) {
          push({
            role: "bot",
            text:
              (data.message ||
                "Kayıt tamamlanamadı. Lütfen biraz sonra tekrar deneyin.") +
              '\n\nTekrar denemek için "Onaylıyorum"a basabilirsiniz.',
          });
          // Doldurulan bilgiler dursun; onay adımında kalıp tekrar denesin.
          setPurchase({ ...state, submitting: false });
          setActions(CONSENT_ACTIONS);
          return;
        }

        const text =
          data.account === "existing"
            ? "Bu e-posta adresi zaten kayıtlı, o yüzden yeni hesap açmadım. Ürünü sepetinize hazırladım — giriş yaptıktan sonra ödemeye geçebilirsiniz."
            : data.account === "email_unavailable"
            ? "Üyelik oluşturma şu an kullanılamıyor, ama siparişiniz için gereken her şeyi hazırladım. Üye olmadan ödemeye geçebilirsiniz."
            : `Hesabınızı oluşturdum ve ${state.form.email} adresine geçici şifrenizi gönderdim. Ürünü de sepetinize ekledim.`;

        push({ role: "bot", text, receipt: data });
        setPurchase(null);
      } catch {
        push({
          role: "bot",
          text: "Bağlantı kurulamadı. İnternet bağlantınızı kontrol edip tekrar deneyin.",
        });
        setPurchase({ ...state, submitting: false });
      } finally {
        setBusy(false);
      }
    },
    [push]
  );

  const startPurchase = useCallback(
    (target: PurchaseTarget) => {
      const state: PurchaseState = {
        target,
        stepIndex: 0,
        form: { ...EMPTY_FORM },
        submitting: false,
      };
      setPurchase(state);
      askStep(state);
      inputRef.current?.focus();
    },
    [askStep]
  );

  /** Satın alma modundayken kullanıcının yazdığı/tıkladığı cevabı işler. */
  const answerStep = useCallback(
    (state: PurchaseState, raw: string) => {
      const text = raw.trim();
      if (!text) return;

      push({ role: "user", text });
      setInput("");

      // Onay adımı. Butona basmak yerine yazan kullanıcıyı da anlıyoruz ama
      // anlamadığımızda İPTAL ETMİYORUZ — tekrar soruyoruz. "evet" yazan
      // birinin siparişinin sessizce iptal olması kabul edilemez.
      if (state.stepIndex >= PURCHASE_STEPS.length) {
        const norm = text.toLocaleLowerCase("tr");
        if (/^(onaylıyorum|evet|onay|tamam|olur|kabul)/.test(norm)) {
          void submitPurchase(state);
          return;
        }
        if (/^(vazgeç|vazgec|hayır|hayir|iptal|istemiyorum)/.test(norm)) {
          cancelPurchase();
          return;
        }
        push({
          role: "bot",
          text: 'Onaylıyorsanız "Onaylıyorum", vazgeçmek istiyorsanız "Vazgeç" yazın (ya da butonlara basın).',
        });
        return;
      }

      const step = PURCHASE_STEPS[state.stepIndex];
      const parsed = step.parse(text);

      if (!parsed.ok) {
        push({ role: "bot", text: parsed.error });
        return;
      }

      const nextState: PurchaseState = {
        ...state,
        stepIndex: state.stepIndex + 1,
        form: { ...state.form, ...parsed.patch },
      };
      setPurchase(nextState);
      askStep(nextState);
    },
    [askStep, cancelPurchase, push, submitPurchase]
  );

  // ── Sohbet ─────────────────────────────────────────────────────────────

  const send = useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || busy) return;

      // Satın alma modunda advisor servisine hiç gitmiyoruz.
      if (purchase && !purchase.submitting) {
        answerStep(purchase, text);
        return;
      }

      push({ role: "user", text });
      setInput("");
      setActions([]);
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

        push({ role: "bot", text: reply, recommendation: rec, match, fromAdvisor: res.ok });

        // Sohbetten satın alma teklifi — yalnızca somut bir ürüne
        // bağlanabiliyorsak. Bağlanamıyorsak kart yine de ürün linki gösterir.
        const target = rec ? derivePurchaseTarget(rec, match) : null;
        if (target) {
          push({
            role: "bot",
            text: `Bu ürünü buradan, sohbeti bırakmadan sipariş edebilirsiniz:\n\n${describeTarget(
              target
            )}\n\nSatın almak ister misiniz?`,
          });
          setActions([
            {
              label: "Evet, satın al",
              tone: "primary",
              run: () => startPurchase(target),
            },
            {
              label: "Hayır, sormaya devam",
              run: () => setActions([]),
            },
          ]);
        } else {
          setActions(readOptions(data.next_question).map((label) => ({ label })));
        }
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
    [answerStep, busy, purchase, push, startPurchase]
  );

  const reset = useCallback(async () => {
    const id = sessionRef.current;
    setMessages([{ id: nextId.current++, role: "bot", text: GREETING }]);
    setActions([]);
    setPurchase(null);
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

  const placeholder = useMemo(() => {
    if (!purchase) return "Örn: 27mm makinemde paslanmaz kesiyorum";
    if (purchase.stepIndex < PURCHASE_STEPS.length) {
      return PURCHASE_STEPS[purchase.stepIndex].placeholder;
    }
    return "Onaylıyorum";
  }, [purchase]);

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
                {purchase
                  ? "Sipariş bilgilerinizi alıyorum"
                  : "Yapay zekâ destekli bıçak danışmanı"}
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

          {/* Satın alma modunda ilerleme çubuğu */}
          {purchase && (
            <PurchaseProgress
              stepIndex={purchase.stepIndex}
              target={purchase.target}
            />
          )}

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
                  m.role === "user" ? "flex justify-end" : "flex flex-col items-start"
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
                  {m.role === "user" ? m.text : <AdvisorRichText text={m.text} />}
                  {m.recommendation && (
                    <RecommendationCard
                      rec={m.recommendation}
                      match={m.match ?? null}
                    />
                  )}
                  {m.receipt && (
                    <ReceiptCard
                      result={m.receipt}
                      onCheckout={() =>
                        void goToCheckout(m.receipt?.cart_id as string)
                      }
                    />
                  )}
                </div>
                {m.role === "bot" && m.fromAdvisor && (
                  <div className="mt-1 flex items-center gap-1 pl-1 text-muted-foreground">
                    {ratings[m.id] ? (
                      <span className="text-[11px]">Geri bildiriminiz için teşekkürler.</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => rate(m, "up")}
                          aria-label="Bu cevap faydalı"
                          className="rounded p-1 hover:bg-muted hover:text-foreground cursor-pointer"
                        >
                          <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => rate(m, "down")}
                          aria-label="Bu cevap faydalı değil"
                          className="rounded p-1 hover:bg-muted hover:text-foreground cursor-pointer"
                        >
                          <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-3 py-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  {purchase?.submitting
                    ? "Hesabınız oluşturuluyor…"
                    : "Danışman düşünüyor…"}
                </div>
              </div>
            )}
          </div>

          {/* Hazır cevap butonları */}
          {actions.length > 0 && !busy && (
            <div className="flex flex-wrap gap-1.5 border-t border-border px-3 py-2">
              {actions.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => (a.run ? a.run() : void send(a.label))}
                  className={[
                    "rounded-full border px-3 py-1 text-xs transition-colors cursor-pointer",
                    a.tone === "primary"
                      ? "border-primary bg-primary text-primary-foreground hover:opacity-90"
                      : "border-border bg-background hover:bg-muted",
                  ].join(" ")}
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}

          {/* KVKK bağlantıları — yalnızca onay adımında */}
          {purchase && purchase.stepIndex >= PURCHASE_STEPS.length && (
            <p className="border-t border-border px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              <a
                href="/yasal/uyelik-sozlesmesi"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground"
              >
                Üyelik Sözleşmesi
              </a>
              {" • "}
              <a
                href="/yasal/kvkk-aydinlatma-metni"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground"
              >
                KVKK Aydınlatma Metni
              </a>
            </p>
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
              placeholder={placeholder}
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
          <p className="border-t border-border px-3 py-1.5 text-[10px] leading-snug text-muted-foreground">
            Yapay zekâ asistanıdır; yanıtlar hata içerebilir, siparişten önce ürün sayfasını kontrol edin.
            Kart bilgisi veya TC kimlik numarası yazmayın.{" "}
            <Link href="/yasal/kvkk-aydinlatma-metni" className="underline hover:text-foreground">
              KVKK Aydınlatma Metni
            </Link>
          </p>
        </div>
      )}
    </>
  );
}

/** Satın alma akışında kaçıncı adımdayız — başlığın hemen altında. */
function PurchaseProgress({
  stepIndex,
  target,
}: {
  stepIndex: number;
  target: PurchaseTarget;
}) {
  const total = PURCHASE_STEPS.length + 1; // + onay adımı
  const current = Math.min(stepIndex + 1, total);
  const pct = Math.round((current / total) * 100);

  return (
    <div className="border-b border-border bg-muted/40 px-4 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="truncate text-[11px] font-medium text-foreground">
          {target.title}
        </span>
        <span className="shrink-0 text-[11px] text-muted-foreground">
          {current}/{total}
        </span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-border">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

/** Kayıt tamamlandığında basılan özet + ödemeye geçiş kartı. */
function ReceiptCard({
  result,
  onCheckout,
}: {
  result: SignupResponse;
  onCheckout: () => void;
}) {
  const cartId = result.cart_id;
  const [warnOtherCart] = useState(() => (cartId ? hasOtherCart(cartId) : false));
  if (!cartId) return null;

  const created = result.account === "created";
  const existing = result.account === "existing";

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-background p-2 text-foreground">
      <div className="flex items-start gap-2">
        <CheckCircle2
          className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
          aria-hidden="true"
        />
        <div className="min-w-0 text-xs leading-relaxed">
          <p className="font-semibold">
            {created ? "Hesabınız hazır" : "Sepetiniz hazır"}
          </p>
          {result.product?.title && (
            <p className="text-muted-foreground">
              {result.product.title}
              {result.product.quantity ? ` × ${result.product.quantity}` : ""}
            </p>
          )}
          {result.shipping && (
            <p className="text-muted-foreground">
              Kargo:{" "}
              {result.shipping.free
                ? "ücretsiz"
                : TRY_FMT.format(result.shipping.fee)}
            </p>
          )}
        </div>
      </div>

      {created && result.email_sent === false && (
        <p className="flex items-start gap-1.5 rounded-md bg-amber-500/10 px-2 py-1.5 text-[11px] leading-relaxed text-amber-700 dark:text-amber-400">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Şifre e-postası gönderilemedi. Ödemeyi tamamlayabilirsiniz; şifreniz
          için &ldquo;şifremi unuttum&rdquo; adımını kullanın.
        </p>
      )}

      {warnOtherCart && (
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Not: Tarayıcınızda başka bir sepet vardı. Ödemeye geçerseniz
          buradaki ürünle devam edilecek.
        </p>
      )}

      <button
        type="button"
        onClick={onCheckout}
        className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-3 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90 cursor-pointer"
      >
        <ShoppingCart className="h-3.5 w-3.5" aria-hidden="true" />
        Ödemeye Git
      </button>

      {existing && (
        <a
          href="/giris"
          className="block rounded-md border border-border px-3 py-2 text-center text-xs transition-colors hover:bg-muted"
        >
          Giriş Yap
        </a>
      )}
    </div>
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
