import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { DetailWidgetProps } from "@medusajs/framework/types";
import { DocumentText } from "@medusajs/icons";
import {
  Container,
  Heading,
  Text,
  Input,
  Label,
  Textarea,
  Button,
  toast,
} from "@medusajs/ui";
import { useEffect, useState } from "react";

interface ProductLite {
  id: string;
  metadata?: Record<string, unknown> | null;
}

type SpecRow = { label: string; value: string };
type SpeedRow = { material: string; speed: string };
type DocRow = { name: string; desc: string; size: string; url: string };

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

async function uploadFile(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("files", file);
  const res = await fetch("/admin/uploads", {
    method: "POST",
    credentials: "include",
    body: fd,
  });
  if (!res.ok) throw new Error(`Upload failed (${res.status})`);
  const data = (await res.json()) as { files: Array<{ url: string }> };
  return data.files[0]?.url ?? "";
}

const ProductTechSpecsWidget = ({ data: product }: DetailWidgetProps<ProductLite>) => {
  const [specs, setSpecs] = useState<SpecRow[]>([]);
  const [apps, setApps] = useState<string[]>([]);
  const [speeds, setSpeeds] = useState<SpeedRow[]>([]);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null);

  useEffect(() => {
    const m = (product.metadata || {}) as Record<string, unknown>;
    setSpecs(asArray<SpecRow>(m.technical_specs).map((s) => ({ label: s.label ?? "", value: s.value ?? "" })));
    setApps(asArray<string>(m.applications).map(String));
    setSpeeds(asArray<SpeedRow>(m.cutting_speeds).map((s) => ({ material: s.material ?? "", speed: s.speed ?? "" })));
    setDocs(
      asArray<Partial<DocRow>>(m.documents).map((d) => ({
        name: d.name ?? "",
        desc: d.desc ?? "",
        size: d.size ?? "",
        url: d.url ?? "",
      }))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  async function save() {
    setSaving(true);
    try {
      const next: Record<string, unknown> = { ...(product.metadata || {}) };
      next.technical_specs = specs
        .map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
        .filter((s) => s.label && s.value);
      next.applications = apps.map((a) => a.trim()).filter(Boolean);
      next.cutting_speeds = speeds
        .map((s) => ({ material: s.material.trim(), speed: s.speed.trim() }))
        .filter((s) => s.material && s.speed);
      next.documents = docs
        .map((d) => ({
          name: d.name.trim(),
          desc: d.desc.trim(),
          size: d.size.trim(),
          url: d.url.trim(),
        }))
        .filter((d) => d.name);

      const res = await fetch(`/admin/products/${product.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("Teknik özellikler kaydedildi");
    } catch (e) {
      toast.error("Kaydedilemedi", { description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function pickDocFile(idx: number, e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploadingIdx(idx);
    try {
      const url = await uploadFile(f);
      setDocs((rows) =>
        rows.map((r, i) =>
          i === idx
            ? {
                ...r,
                url,
                name: r.name || f.name.replace(/\.[^.]+$/, ""),
                size: r.size || `${(f.size / 1024 / 1024).toFixed(1)} MB`,
              }
            : r
        )
      );
      toast.success("Dosya yüklendi");
    } catch (err) {
      toast.error("Yükleme başarısız", { description: String(err) });
    } finally {
      setUploadingIdx(null);
      e.target.value = "";
    }
  }

  return (
    <Container className="p-6 space-y-8">
      <div className="flex items-center gap-2">
        <DocumentText className="text-ui-fg-subtle" />
        <Heading level="h2">Teknik Özellikler & İçerik</Heading>
      </div>
      <Text size="small" className="text-ui-fg-subtle">
        Bu alanlar ürün sayfasındaki <strong>Teknik Özellikler</strong>,{" "}
        <strong>Kullanım Alanları</strong> ve <strong>Dökümanlar</strong>{" "}
        sekmelerini doldurur. Boş bırakılan bölüm sayfada gösterilmez.
      </Text>

      {/* ---- Teknik Özellikler ---- */}
      <section className="space-y-3">
        <Label className="text-base font-semibold">Teknik Özellikler (tablo satırları)</Label>
        {specs.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              placeholder="Parametre (örn. Diş Sertliği)"
              value={row.label}
              onChange={(e) =>
                setSpecs((r) => r.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))
              }
            />
            <Input
              placeholder="Değer (örn. 950 HV)"
              value={row.value}
              onChange={(e) =>
                setSpecs((r) => r.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))
              }
            />
            <Button variant="secondary" size="small" onClick={() => setSpecs((r) => r.filter((_, j) => j !== i))}>
              Sil
            </Button>
          </div>
        ))}
        <Button variant="transparent" size="small" onClick={() => setSpecs((r) => [...r, { label: "", value: "" }])}>
          + Satır ekle
        </Button>
        <Text size="xsmall" className="text-ui-fg-subtle">
          Not: Çelik sınıfı, genişlik, kalınlık, TPI ve boy aralığı ürün metadata'sından
          otomatik eklenir — burada yalnızca ek satırları (sertlik, kaynak vb.) girin.
        </Text>
      </section>

      {/* ---- Kullanım Alanları ---- */}
      <section className="space-y-3">
        <Label className="text-base font-semibold">Kullanım Alanları (tavsiye edilen malzemeler)</Label>
        {apps.map((a, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              placeholder="örn. Yapısal çelikler ve profiller"
              value={a}
              onChange={(e) => setApps((r) => r.map((x, j) => (j === i ? e.target.value : x)))}
            />
            <Button variant="secondary" size="small" onClick={() => setApps((r) => r.filter((_, j) => j !== i))}>
              Sil
            </Button>
          </div>
        ))}
        <Button variant="transparent" size="small" onClick={() => setApps((r) => [...r, ""])}>
          + Madde ekle
        </Button>
      </section>

      {/* ---- Kesim Hızları ---- */}
      <section className="space-y-3">
        <Label className="text-base font-semibold">Tavsiye Edilen Kesme Hızları</Label>
        {speeds.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            <Input
              placeholder="Malzeme (örn. Yumuşak çelik St37)"
              value={row.material}
              onChange={(e) =>
                setSpeeds((r) => r.map((x, j) => (j === i ? { ...x, material: e.target.value } : x)))
              }
            />
            <Input
              placeholder="Hız (örn. 70-90 m/dk)"
              value={row.speed}
              onChange={(e) =>
                setSpeeds((r) => r.map((x, j) => (j === i ? { ...x, speed: e.target.value } : x)))
              }
            />
            <Button variant="secondary" size="small" onClick={() => setSpeeds((r) => r.filter((_, j) => j !== i))}>
              Sil
            </Button>
          </div>
        ))}
        <Button variant="transparent" size="small" onClick={() => setSpeeds((r) => [...r, { material: "", speed: "" }])}>
          + Satır ekle
        </Button>
      </section>

      {/* ---- Dökümanlar ---- */}
      <section className="space-y-3">
        <Label className="text-base font-semibold">Dökümanlar (PDF / belgeler)</Label>
        {docs.map((row, i) => (
          <div key={i} className="rounded-lg border border-ui-border-base p-3 space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Belge adı"
                value={row.name}
                onChange={(e) => setDocs((r) => r.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
              />
              <Input
                placeholder="Boyut (örn. 1.2 MB)"
                value={row.size}
                onChange={(e) => setDocs((r) => r.map((x, j) => (j === i ? { ...x, size: e.target.value } : x)))}
                className="max-w-[140px]"
              />
              <Button variant="secondary" size="small" onClick={() => setDocs((r) => r.filter((_, j) => j !== i))}>
                Sil
              </Button>
            </div>
            <Textarea
              placeholder="Kısa açıklama (opsiyonel)"
              rows={2}
              value={row.desc}
              onChange={(e) => setDocs((r) => r.map((x, j) => (j === i ? { ...x, desc: e.target.value } : x)))}
            />
            <div className="flex gap-2 items-center">
              <Input
                placeholder="Dosya URL'i veya yükleyin →"
                value={row.url}
                onChange={(e) => setDocs((r) => r.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))}
              />
              <label className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-ui-button-neutral hover:bg-ui-button-neutral-hover text-xs font-medium border border-ui-border-base cursor-pointer whitespace-nowrap">
                {uploadingIdx === i ? "Yükleniyor..." : "📤 Yükle"}
                <input
                  type="file"
                  accept=".pdf,application/pdf,image/*"
                  className="hidden"
                  disabled={uploadingIdx !== null}
                  onChange={(e) => pickDocFile(i, e)}
                />
              </label>
            </div>
          </div>
        ))}
        <Button
          variant="transparent"
          size="small"
          onClick={() => setDocs((r) => [...r, { name: "", desc: "", size: "", url: "" }])}
        >
          + Doküman ekle
        </Button>
      </section>

      <div className="flex justify-end pt-3 border-t border-ui-border-base">
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.details.after",
});

export default ProductTechSpecsWidget;
