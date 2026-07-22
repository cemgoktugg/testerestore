"use client";

import React, { useState } from "react";
import { Mail, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
  MEDUSA_READY,
} from "../../lib/medusa/config";

interface Props {
  source?: string;
  compact?: boolean;
}

/**
 * Newsletter abone formu. Footer'da compact varyant, blog/içerik sayfalarında
 * dolu varyant. Welcome maili otomatik gönderir.
 */
export default function NewsletterSignup({
  source = "footer-form",
  compact = false,
}: Props) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string>("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setState("error");
      setMessage("Geçerli bir e-posta girin");
      return;
    }
    if (!MEDUSA_READY) {
      setState("error");
      setMessage("Sistem hazır değil. Lütfen daha sonra deneyin.");
      return;
    }
    setState("loading");
    try {
      const res = await fetch(
        `${MEDUSA_BACKEND_URL}/store/newsletter/subscribe`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ email, source }),
        }
      );
      if (!res.ok) throw new Error(`${res.status}`);
      const data = (await res.json()) as { alreadySubscribed: boolean };
      setState("success");
      setMessage(
        data.alreadySubscribed
          ? "Zaten abonesiniz, teşekkürler!"
          : "Hoş geldiniz! İndirim kodu e-posta adresinize gönderildi."
      );
      setEmail("");
    } catch {
      setState("error");
      setMessage("Bir sorun oluştu. Lütfen tekrar deneyin.");
    }
  }

  if (compact) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <h4 className="text-sm font-bold uppercase tracking-wider">
            Bültene Abone Ol
          </h4>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          İlk siparişinize özel <strong className="text-foreground">%5 indirim</strong>{" "}
          kuponu hediye!
        </p>
        <form onSubmit={submit} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@adresiniz.com"
              required
              disabled={state === "loading" || state === "success"}
              className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-xs focus:outline-none focus:border-accent disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={state === "loading" || state === "success"}
              className={`h-9 px-4 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${
                state === "loading" || state === "success"
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-molten-grad text-white cursor-pointer"
              }`}
            >
              {state === "loading"
                ? "..."
                : state === "success"
                ? "✓"
                : "Abone Ol"}
            </button>
          </div>
          {message && (
            <div
              className={`flex items-start gap-1.5 text-[11px] ${
                state === "success"
                  ? "text-emerald-600"
                  : state === "error"
                  ? "text-rose-600"
                  : "text-muted-foreground"
              }`}
            >
              {state === "success" ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              ) : state === "error" ? (
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              ) : null}
              <span>{message}</span>
            </div>
          )}
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-gradient-to-br from-accent/10 to-orange-500/5 border border-accent/30 p-6 max-w-xl mx-auto text-center">
      <Mail className="h-10 w-10 text-accent mx-auto mb-3" />
      <h3 className="text-xl font-extrabold mb-2">
        İlk siparişinize özel %5 indirim
      </h3>
      <p className="text-sm text-muted-foreground mb-5">
        E-posta adresinizi bırakın, kupon kodunuzu hemen gönderelim.
      </p>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2 max-w-md mx-auto">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@adresiniz.com"
          required
          disabled={state === "loading" || state === "success"}
          className="flex-1 h-11 rounded-xl border border-border bg-background px-4 text-sm focus:outline-none focus:border-accent disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={state === "loading" || state === "success"}
          className={`h-11 px-6 rounded-xl text-sm font-bold whitespace-nowrap transition-colors ${
            state === "loading" || state === "success"
              ? "bg-muted text-muted-foreground cursor-not-allowed"
              : "bg-molten-grad text-white glow-orange cursor-pointer"
          }`}
        >
          {state === "loading"
            ? "Gönderiliyor..."
            : state === "success"
            ? "✓ Abone olundu"
            : "Kuponumu Al"}
        </button>
      </form>
      {message && (
        <div
          className={`mt-3 text-xs font-semibold ${
            state === "success"
              ? "text-emerald-600"
              : "text-rose-600"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
