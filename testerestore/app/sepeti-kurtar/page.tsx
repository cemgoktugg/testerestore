"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { medusa } from "../../lib/medusa/client";
import { setStoredCartId } from "../../lib/medusa/services/cart";

const KEY = "ts_cart_recovery";
export default function CartRecoveryPage() {
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loginRequired, setLoginRequired] = useState(false);
  useEffect(() => {
    const incoming = new URLSearchParams(window.location.hash.slice(1)).get("token");
    let current = incoming || "";
    try {
      if (incoming) sessionStorage.setItem(KEY, incoming);
      else current = sessionStorage.getItem(KEY) || "";
    } catch { /* The fragment still works when storage is unavailable. */ }
    setToken(current);
    if (incoming) window.history.replaceState(null, "", window.location.pathname);
    if (!current) setError("Sepet bağlantısı bulunamadı. E-postanızdaki bağlantıyı yeniden açabilirsiniz.");
  }, []);

  async function recover() {
    if (busy || !token) return;
    setBusy(true); setError(""); setLoginRequired(false);
    try {
      const result = await medusa.client.fetch<{ cart_id: string }>("/store/cart-recovery", { method: "POST", body: { token } });
      setStoredCartId(result.cart_id);
      try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
      window.location.assign("/cart");
    } catch (e) {
      setLoginRequired((e as { status?: number })?.status === 401);
      setError(e instanceof Error ? e.message : "Sepet yüklenemedi. Lütfen yeniden deneyin.");
      setBusy(false);
    }
  }

  return <><Header /><main className="flex-1 mx-auto w-full max-w-xl px-4 py-16">
    <h1 className="text-2xl font-bold mb-4">Sepetinize devam edin</h1>
    <p className="text-sm text-muted-foreground mb-6">E-postadaki sepeti bu cihazda açabilirsiniz. Bu işlem, bu tarayıcıdaki mevcut sepetin yerine e-postadaki sepeti getirir. Güncel fiyat ve stok bilgileri yeniden kontrol edilir.</p>
    {error && <p role="alert" className="rounded-xl border border-rose-400 p-3 mb-4 text-sm">{error}</p>}
    {loginRequired ? <Link href="/giris?next=/sepeti-kurtar" className="inline-flex rounded-xl bg-accent px-5 py-3 font-semibold">Hesabıma giriş yap</Link> :
      <button onClick={recover} disabled={busy || !token} className="rounded-xl bg-molten-grad px-5 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Sepet yükleniyor…" : "E-postadaki sepeti aç"}</button>}
  </main><Footer /></>;
}
