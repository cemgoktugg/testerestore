"use client";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY } from "../../lib/medusa/config";
function NewsletterAction() {
  const search = useSearchParams();
  const action = search.get("islem") === "ayril" ? "unsubscribe" : "confirm";
  const [token, setToken] = useState("");
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const storageKey = "newsletter-action-" + action;
    // Fragments stay out of HTTP access logs. Retain the token only in this tab.
    const incoming = new URLSearchParams(window.location.hash.slice(1)).get("token") || search.get("token") || "";
    let saved = "";
    try {
      saved = sessionStorage.getItem(storageKey) || "";
      if (incoming) sessionStorage.setItem(storageKey, incoming);
    } catch { /* The action also works when browser storage is unavailable. */ }
    setToken(incoming || saved);
    setLoaded(true);
    if (incoming) {
      const clean = new URL(window.location.href);
      clean.searchParams.delete("token");
      clean.hash = "";
      window.history.replaceState(window.history.state, "", clean.pathname + clean.search);
    }
  }, [action, search]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function submit() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch(MEDUSA_BACKEND_URL + "/store/newsletter/" + action, {
        method: "POST", headers: { "Content-Type": "application/json", "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY },
        body: JSON.stringify({ token }),
      });
      const data = await response.json() as { message?: string };
      if (!response.ok) throw new Error(data.message || "İşlem tamamlanamadı.");
      setDone(true); setMessage(data.message || "İşleminiz tamamlandı.");
      try { sessionStorage.removeItem("newsletter-action-" + action); } catch { /* optional storage */ }
    } catch (error) { setMessage(error instanceof Error ? error.message : "Lütfen tekrar deneyin."); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto w-full max-w-lg px-4 py-24 space-y-5">
    <h1 className="text-2xl font-bold">{action === "confirm" ? "Bülten aboneliğini onayla" : "Bülten aboneliğinden ayrıl"}</h1>
    <p className="text-sm text-muted-foreground">{action === "confirm" ? "Yeni ürünler, teknik rehberler ve kampanyalar hakkında e-posta almak için aboneliğinizi onaylayın." : "Bülten e-postalarını almak istemiyorsanız aşağıdaki düğmeyle aboneliğinizi kapatabilirsiniz."}</p>
    {!done && <button type="button" disabled={busy || !token} onClick={submit} className="rounded-lg bg-primary px-5 py-3 font-semibold text-primary-foreground disabled:opacity-50">{busy ? "İşleniyor..." : action === "confirm" ? "Aboneliğimi onayla" : "Abonelikten ayrıl"}</button>}
    {loaded && !token && <p role="alert">Bağlantı eksik. E-postanızdaki bağlantıyı kullanın.</p>}
    {message && <p role="status" className="text-sm">{message}</p>}
    <Link href="/" className="block text-sm underline">Mağazaya dön</Link>
  </main>;
}
export default function NewsletterPage() { return <Suspense fallback={<p className="p-12">Yükleniyor...</p>}><NewsletterAction /></Suspense>; }
