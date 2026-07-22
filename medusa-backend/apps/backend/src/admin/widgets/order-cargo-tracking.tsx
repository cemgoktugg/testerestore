import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { DetailWidgetProps } from "@medusajs/framework/types";
import { TruckFast } from "@medusajs/icons";
import {
  Container,
  Heading,
  Text,
  Input,
  Label,
  Select,
  Button,
  Badge,
  toast,
} from "@medusajs/ui";
import { useEffect, useState } from "react";

interface OrderLite {
  id: string;
  metadata?: Record<string, unknown> | null;
  email?: string | null;
  display_id?: number;
}

/** Standart TR kargo firmaları + takip URL kalıbı. {tn} = tracking number. */
const CARRIERS = [
  { code: "aras", name: "Aras Kargo", url: "https://kargotakip.araskargo.com.tr/?code={tn}" },
  { code: "yurtici", name: "Yurtiçi Kargo", url: "https://www.yurticikargo.com/tr/online-servisler/gonderi-sorgula?code={tn}" },
  { code: "mng", name: "MNG Kargo", url: "https://service.mngkargo.com.tr/desi/desihesapla.aspx?BarkodTakipNo={tn}" },
  { code: "ptt", name: "PTT Kargo", url: "https://gonderitakip.ptt.gov.tr/Track/summary?barcode={tn}" },
  { code: "surat", name: "Sürat Kargo", url: "https://www.suratkargo.com.tr/KargoTakip?kargoTakipNo={tn}" },
  { code: "ups", name: "UPS Kargo", url: "https://www.ups.com/track?tracknum={tn}" },
  { code: "hepsijet", name: "HepsiJET", url: "https://www.hepsijet.com/gonderi-takibi?trackingId={tn}" },
  { code: "other", name: "Diğer", url: "" },
];

function buildTrackingUrl(carrierCode: string, trackingNo: string): string {
  if (!trackingNo) return "";
  const c = CARRIERS.find((x) => x.code === carrierCode);
  if (!c || !c.url) return "";
  return c.url.replace("{tn}", encodeURIComponent(trackingNo));
}

const OrderCargoTrackingWidget = ({ data }: DetailWidgetProps<OrderLite>) => {
  const meta = (data.metadata || {}) as Record<string, unknown>;
  const [carrier, setCarrier] = useState<string>(
    (meta.carrier_code as string) || ""
  );
  const [trackingNo, setTrackingNo] = useState<string>(
    (meta.tracking_number as string) || ""
  );
  const [notifyOnSave, setNotifyOnSave] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCarrier((meta.carrier_code as string) || "");
    setTrackingNo((meta.tracking_number as string) || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.id]);

  async function save() {
    if (!carrier || !trackingNo) {
      toast.error("Kargo firmasını ve takip numarasını girin");
      return;
    }
    const trackingUrl = buildTrackingUrl(carrier, trackingNo);
    setSaving(true);
    try {
      const res = await fetch(`/admin/orders/${data.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            ...(data.metadata || {}),
            carrier_code: carrier,
            carrier_name:
              CARRIERS.find((c) => c.code === carrier)?.name || carrier,
            tracking_number: trackingNo,
            tracking_url: trackingUrl,
            shipped_at: new Date().toISOString(),
          },
        }),
      });
      if (!res.ok) throw new Error(await res.text());

      if (notifyOnSave && data.email) {
        // order.shipped notification — tek sefer, opsiyonel
        await fetch(`/admin/orders/${data.id}/notify-shipped`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            carrier_name:
              CARRIERS.find((c) => c.code === carrier)?.name || carrier,
            tracking_number: trackingNo,
            tracking_url: trackingUrl,
          }),
        }).catch(() => {
          // notification opsiyonel, başarısız olursa görmezden gel
        });
      }

      toast.success("Kargo bilgisi kaydedildi");
    } catch (e) {
      toast.error("Kaydedilemedi", { description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  const currentUrl = buildTrackingUrl(carrier, trackingNo);

  return (
    <Container className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <TruckFast className="text-ui-fg-subtle" />
        <Heading level="h2">Kargo Takip Bilgileri</Heading>
      </div>

      {meta.tracking_number && (
        <div className="flex items-center justify-between rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <Badge color="green">Gönderildi</Badge>
              <Text size="small" weight="plus">
                {String(meta.carrier_name || meta.carrier_code || "—")}
              </Text>
            </div>
            <Text size="xsmall" className="text-ui-fg-subtle">
              Takip No: <span className="font-mono">{String(meta.tracking_number)}</span>
            </Text>
          </div>
          {meta.tracking_url && (
            <a
              href={String(meta.tracking_url)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-ui-fg-interactive text-xs font-medium hover:underline"
            >
              Takip Linkini Aç →
            </a>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Kargo Firması</Label>
          <Select value={carrier} onValueChange={setCarrier}>
            <Select.Trigger>
              <Select.Value placeholder="Firma seçin" />
            </Select.Trigger>
            <Select.Content>
              {CARRIERS.map((c) => (
                <Select.Item key={c.code} value={c.code}>
                  {c.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Takip Numarası</Label>
          <Input
            value={trackingNo}
            onChange={(e) => setTrackingNo(e.target.value)}
            placeholder="örn. 12345678901"
          />
        </div>
      </div>

      {currentUrl && (
        <Text size="xsmall" className="text-ui-fg-subtle">
          Müşteriye gösterilecek link:{" "}
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-ui-fg-interactive font-mono break-all"
          >
            {currentUrl}
          </a>
        </Text>
      )}

      <div className="flex items-center justify-between pt-2">
        <label className="flex items-center gap-2 text-xs cursor-pointer">
          <input
            type="checkbox"
            checked={notifyOnSave}
            onChange={(e) => setNotifyOnSave(e.target.checked)}
            className="accent-orange-500"
          />
          <Text size="xsmall">Kaydederken müşteriye e-posta gönder</Text>
        </label>
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "order.details.after",
});

export default OrderCargoTrackingWidget;
