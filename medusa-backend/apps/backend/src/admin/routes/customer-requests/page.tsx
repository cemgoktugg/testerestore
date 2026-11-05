import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ChatBubble } from "@medusajs/icons";
import { Button, Container, Heading, Text, toast } from "@medusajs/ui";
import { useCallback, useEffect, useState } from "react";

const statuses: Record<string, string> = { new: "Yeni", in_progress: "İnceleniyor", awaiting_customer: "Müşteri yanıtı bekleniyor", resolved: "Sonuçlandırıldı" };
const kinds: Record<string, string> = { contact: "İletişim / teklif", return: "İade talebi", exchange: "Değişim talebi" };
interface RequestRow {
  id: string; request_number: string; kind: string; status: string;
  name: string; email: string; phone?: string; topic?: string;
  order_id?: string; message: string; created_at: string;
  public_reply: string | null; internal_note: string | null;
  items?: { lines?: Array<{ item_id: string; title: string; quantity: number }> };
}
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: "include", headers: { "Content-Type": "application/json" } });
  if (!response.ok) throw new Error("İşlem tamamlanamadı (" + response.status + ").");
  return response.json();
}
function RequestCard({ row, onSaved }: { row: RequestRow; onSaved: () => void }) {
  const [status, setStatus] = useState(row.status);
  const [reply, setReply] = useState(row.public_reply || "");
  const [note, setNote] = useState(row.internal_note || "");
  const [saving, setSaving] = useState(false);
  async function save() {
    setSaving(true);
    try {
      await api("/admin/customer-requests/" + row.id, { method: "PATCH", body: JSON.stringify({ status, public_reply: reply, internal_note: note }) });
      toast.success("Talep güncellendi"); onSaved();
    } catch (error) { toast.error(String(error)); } finally { setSaving(false); }
  }
  return <article className="rounded-lg border border-ui-border-base p-4 space-y-3">
    <div className="flex flex-wrap justify-between gap-2">
      <strong>{row.request_number} · {kinds[row.kind]}</strong>
      <span className="text-xs">{new Date(row.created_at).toLocaleString("tr-TR")}</span>
    </div>
    <Text>{row.name} · <a href={"mailto:" + row.email}>{row.email}</a>{row.phone ? " · " + row.phone : ""}</Text>
    {row.order_id && <a className="text-ui-fg-interactive" href={"/app/orders/" + row.order_id}>Siparişi görüntüle</a>}
    {row.topic && <Text size="small">Konu: {row.topic}</Text>}
    <p className="whitespace-pre-wrap text-sm">{row.message}</p>
    {row.items?.lines?.map((item) => <div key={item.item_id} className="text-sm">{item.title} × {item.quantity}</div>)}
    <label className="block text-sm">Durum
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="ml-3 rounded border p-2 bg-ui-bg-base">
        {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
    </label>
    <label className="block text-sm">{row.kind === "contact" ? "Yanıt kaydı (müşteriye e-postayla ayrıca iletin)" : "Müşterinin sipariş ekranında göreceği yanıt"}
      <textarea value={reply} onChange={(event) => setReply(event.target.value)} maxLength={4000} rows={3} className="mt-1 w-full rounded border p-2 bg-ui-bg-base" />
    </label>
    <label className="block text-sm">Yalnızca ekip içi not
      <textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={4000} rows={2} className="mt-1 w-full rounded border p-2 bg-ui-bg-base" />
    </label>
    <Button onClick={save} disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
  </article>;
}
export default function CustomerRequestsAdmin() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ requests: RequestRow[]; count: number }>("/admin/customer-requests?limit=30&offset=" + offset + (status ? "&status=" + status : ""));
      setRows(data.requests); setCount(data.count);
    } catch (error) { toast.error(String(error)); } finally { setLoading(false); }
  }, [status, offset]);
  useEffect(() => { void load(); }, [load]);
  return <Container className="space-y-5">
    <Heading level="h1">Müşteri Talepleri</Heading>
    <Text>İletişim, teklif, iade ve değişim taleplerini takip edin. Talep durumunu değiştirmek siparişi veya iadeyi otomatik işleme almaz.</Text>
    <select aria-label="Talep durumu filtresi" value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }} className="rounded border p-2 bg-ui-bg-base">
      <option value="">Tüm durumlar</option>
      {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select>
    {loading ? <Text>Yükleniyor...</Text> : rows.length === 0 ? <Text>Talep bulunamadı.</Text> : rows.map((row) => <RequestCard key={row.id + row.status + row.public_reply} row={row} onSaved={() => void load()} />)}
    <div className="flex gap-3 items-center">
      <Button disabled={!offset || loading} onClick={() => setOffset(Math.max(0, offset - 30))}>Önceki</Button>
      <Text>{count} talep · Sayfa {Math.floor(offset / 30) + 1}</Text>
      <Button disabled={offset + 30 >= count || loading} onClick={() => setOffset(offset + 30)}>Sonraki</Button>
    </div>
  </Container>;
}
export const config = defineRouteConfig({ label: "Müşteri Talepleri", icon: ChatBubble });
