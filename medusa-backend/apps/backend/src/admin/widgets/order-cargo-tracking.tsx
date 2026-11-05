import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { DetailWidgetProps } from "@medusajs/framework/types";
import { Container, Heading, Text, Button, toast } from "@medusajs/ui";
import { useCallback, useEffect, useState } from "react";
interface OrderLite { id: string; metadata?: Record<string, unknown> | null; }
interface Fulfillment { id: string; canceled_at?: string | null; shipped_at?: string | null; delivered_at?: string | null; labels?: Array<{ tracking_number?: string; tracking_url?: string }>; }
export default function OrderCargoTrackingWidget({ data }: DetailWidgetProps<OrderLite>) {
  const [fulfillments, setFulfillments] = useState<Fulfillment[]>([]);
  const [fulfillmentId, setFulfillmentId] = useState("");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [url, setUrl] = useState("");
  const [notify, setNotify] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/admin/orders/" + data.id + "?fields=id,*fulfillments,*fulfillments.labels", { credentials: "include" });
      if (!response.ok) throw new Error("Hazırlık kayıtları yüklenemedi.");
      const body = await response.json() as { order: { fulfillments?: Fulfillment[] } };
      const rows = body.order.fulfillments || [];
      setFulfillments(rows);
      setFulfillmentId(rows.find((row) => !row.shipped_at && !row.canceled_at)?.id || "");
    } catch (error) { toast.error(String(error)); } finally { setLoading(false); }
  }, [data.id]);
  useEffect(() => { void load(); }, [load]);
  const available = fulfillments.filter((row) => !row.shipped_at && !row.canceled_at);
  async function save(event: React.FormEvent) {
    event.preventDefault(); setSaving(true);
    try {
      const response = await fetch("/admin/orders/" + data.id + "/ship", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fulfillment_id: fulfillmentId, carrier_name: carrier, tracking_number: tracking, tracking_url: url || undefined, notify }),
      });
      const body = await response.json() as { message?: string };
      if (!response.ok) throw new Error(body.message || "Gönderim oluşturulamadı.");
      toast.success("Hazırlık kaydı kargoya verildi olarak güncellendi.");
      setTracking(""); setUrl(""); await load();
    } catch (error) { toast.error("Gönderim tamamlanamadı", { description: String(error) }); } finally { setSaving(false); }
  }
  return <Container className="space-y-4 p-6">
    <Heading level="h2">Kargo Gönderimi</Heading>
    <Text size="small">Hazırlanan gönderiyi seçin. Kargo kaydı, sipariş durumu ve müşteri bildirimi birlikte güncellenir.</Text>
    {fulfillments.filter((row) => row.shipped_at && !row.canceled_at).map((row) => <div key={row.id} className="rounded border border-ui-border-base p-3 text-sm">
      <strong>{row.delivered_at ? "Teslim edildi" : "Kargoya verildi"}</strong> · {row.id}
      {row.labels?.map((label, index) => <div key={index}>{label.tracking_number} {label.tracking_url?.startsWith("https://") && <a href={label.tracking_url} target="_blank" rel="noopener noreferrer" className="text-ui-fg-interactive">Takip et</a>}</div>)}
    </div>)}
    {!!data.metadata?.tracking_number && <Text size="small">Eski takip kaydı: {String(data.metadata.tracking_number)}. Gönderim durumu için yukarıdaki hazırlık kayıtları esas alınır.</Text>}
    {loading ? <Text>Yükleniyor...</Text> : available.length === 0 ? <Text size="small">Gönderilmeyi bekleyen hazırlık kaydı yok. Yeni gönderim için önce siparişin standart hazırlama işlemini tamamlayın.</Text> : <form onSubmit={save} className="space-y-3">
      <label className="block text-sm">Gönderilecek hazırlık kaydı<select required value={fulfillmentId} onChange={(event) => setFulfillmentId(event.target.value)} className="mt-1 block w-full rounded border p-2 bg-ui-bg-base">{available.map((row) => <option key={row.id} value={row.id}>{row.id}</option>)}</select></label>
      <label className="block text-sm">Kargo firması<input required maxLength={100} value={carrier} onChange={(event) => setCarrier(event.target.value)} className="mt-1 block w-full rounded border p-2 bg-ui-bg-base" /></label>
      <label className="block text-sm">Takip numarası<input required maxLength={150} value={tracking} onChange={(event) => setTracking(event.target.value)} className="mt-1 block w-full rounded border p-2 bg-ui-bg-base" /></label>
      <label className="block text-sm">Kargo firmasının takip bağlantısı (isteğe bağlı)<input type="url" pattern="https://.*" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://" className="mt-1 block w-full rounded border p-2 bg-ui-bg-base" /></label>
      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={notify} onChange={(event) => setNotify(event.target.checked)} />Müşteriye kargo e-postası gönder</label>
      <Button type="submit" disabled={saving || !fulfillmentId}>{saving ? "Kaydediliyor..." : "Kargoya verildi olarak kaydet"}</Button>
    </form>}
  </Container>;
}
export const config = defineWidgetConfig({ zone: "order.details.after" });
