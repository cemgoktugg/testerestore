"use client";
import { useEffect, useRef, useState } from "react";
import { createOrderRequest, listOrderRequests, type CustomerRequest } from "../../lib/medusa/services/customer-requests";

const statusLabels: Record<string, string> = { new: "Talep alındı", in_progress: "İnceleniyor", awaiting_customer: "Yanıtınız bekleniyor", resolved: "Sonuçlandırıldı" };
export default function OrderRequests({ orderId, items, canceled }: {
  orderId: string; items: Array<{ id: string; quantity: number; title?: string | null; product_title?: string | null }>; canceled: boolean;
}) {
  const [requests, setRequests] = useState<CustomerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"return" | "exchange">("return");
  const [message, setMessage] = useState("");
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [saving, setSaving] = useState(false);
  const requestKey = useRef<string | null>(null);
  useEffect(() => {
    let active = true;
    listOrderRequests(orderId).then((data) => { if (active) setRequests(data.requests); })
      .catch(() => { if (active) setError("Talepler yüklenemedi. Lütfen sayfayı yenileyin."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId]);
  const hasOpen = requests.some((row) => row.status !== "resolved");
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const lines = Object.entries(selected).filter(([, quantity]) => quantity > 0).map(([item_id, quantity]) => ({ item_id, quantity }));
    if (!lines.length) { setError("En az bir ürün seçin."); return; }
    setSaving(true); setError("");
    requestKey.current ||= crypto.randomUUID();
    try {
      const data = await createOrderRequest(orderId, { request_key: requestKey.current, kind, message, items: lines });
      setRequests((previous) => [data.request, ...previous.filter((row) => row.id !== data.request.id)]);
      setOpen(false); setMessage(""); setSelected({}); requestKey.current = null;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Talep kaydedilemedi. Lütfen tekrar deneyin.");
    } finally { setSaving(false); }
  }
  return <section className="mt-8 rounded-2xl border border-border p-5 space-y-4" aria-labelledby="order-requests-title">
    <h2 id="order-requests-title" className="font-bold">İade ve değişim taleplerim</h2>
    <p className="text-sm text-muted-foreground">Ürünlerinizi seçerek talebinizi iletebilirsiniz. Talebiniz incelendikten sonra size bilgi verilir; kayıt oluşturulması iade veya değişim onayı anlamına gelmez.</p>
    {loading && <p role="status" className="text-sm">Talepler yükleniyor...</p>}
    {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
    {requests.map((row) => <article key={row.id} className="rounded-lg bg-muted/50 p-4 space-y-2 text-sm">
      <div className="font-semibold">{row.request_number} · {row.kind === "return" ? "İade" : "Değişim"} · {statusLabels[row.status] || row.status}</div>
      <p className="whitespace-pre-wrap">{row.message}</p>
      {row.items?.lines?.map((item) => <p key={item.item_id}>{item.title} × {item.quantity}</p>)}
      {row.public_reply && <p className="whitespace-pre-wrap border-t border-border pt-2"><strong>Mağaza yanıtı:</strong> {row.public_reply}</p>}
    </article>)}
    {!loading && !canceled && !hasOpen && !open && <button type="button" onClick={() => { setOpen(true); setError(""); }} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">İade / değişim talebi oluştur</button>}
    {hasOpen && <p className="text-sm text-muted-foreground">Açık talebiniz yukarıda listeleniyor. Ek bilgi için talep numaranızla <a href="/iletisim" className="underline">bizimle iletişime geçin</a>.</p>}
    {open && <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm">Talep türü
        <select value={kind} onChange={(event) => setKind(event.target.value as "return" | "exchange")} className="ml-3 rounded-lg border border-border bg-background p-2">
          <option value="return">İade</option><option value="exchange">Değişim</option>
        </select>
      </label>
      <fieldset className="space-y-2"><legend className="text-sm font-semibold mb-2">Ürün ve adet</legend>
        {items.map((item) => <div key={item.id} className="flex items-center justify-between gap-3 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={!!selected[item.id]} onChange={(event) => setSelected((old) => ({ ...old, [item.id]: event.target.checked ? 1 : 0 }))} />{item.product_title || item.title || "Ürün"}</label>
          {!!selected[item.id] && <input aria-label={(item.product_title || item.title || "Ürün") + " talep adedi"} type="number" required min={1} max={item.quantity} value={selected[item.id]} onChange={(event) => setSelected((old) => ({ ...old, [item.id]: Number(event.target.value) }))} className="w-20 rounded border border-border bg-background p-2" />}
        </div>)}
      </fieldset>
      <label className="block text-sm">Talebinizin nedeni
        <textarea required minLength={10} maxLength={4000} rows={4} value={message} onChange={(event) => setMessage(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-3" />
      </label>
      <div className="flex gap-3"><button disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">{saving ? "Kaydediliyor..." : "Talebi gönder"}</button><button type="button" disabled={saving} onClick={() => setOpen(false)} className="text-sm">Vazgeç</button></div>
    </form>}
  </section>;
}
