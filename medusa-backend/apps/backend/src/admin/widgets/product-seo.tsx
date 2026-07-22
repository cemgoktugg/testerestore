import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { DetailWidgetProps } from "@medusajs/framework/types";
import { GlobeEurope } from "@medusajs/icons";
import {
  Container,
  Heading,
  Text,
  Input,
  Label,
  Textarea,
  Button,
  Badge,
  toast,
} from "@medusajs/ui";
import { useEffect, useState } from "react";

interface ProductLite {
  id: string;
  handle?: string | null;
  title?: string;
  metadata?: Record<string, unknown> | null;
}

interface SeoFields {
  seo_title: string;
  seo_description: string;
  seo_keywords: string;
  og_image: string;
  robots: string;
  canonical: string;
}

const EMPTY: SeoFields = {
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  og_image: "",
  robots: "",
  canonical: "",
};

async function uploadImage(file: File): Promise<string> {
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

const ProductSeoWidget = ({ data: product }: DetailWidgetProps<ProductLite>) => {
  const meta = (product.metadata || {}) as Record<string, unknown>;
  const [form, setForm] = useState<SeoFields>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setForm({
      seo_title: (meta.seo_title as string) || "",
      seo_description: (meta.seo_description as string) || "",
      seo_keywords: (meta.seo_keywords as string) || "",
      og_image: (meta.og_image as string) || "",
      robots: (meta.robots as string) || "",
      canonical: (meta.canonical as string) || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product.id]);

  function update<K extends keyof SeoFields>(key: K, value: SeoFields[K]) {
    setForm((s) => ({ ...s, [key]: value }));
  }

  async function save() {
    setSaving(true);
    try {
      // Mevcut metadata'yı koru, sadece SEO alanlarını set et / temizle
      const next: Record<string, unknown> = { ...(product.metadata || {}) };
      next.seo_title = form.seo_title.trim() || null;
      next.seo_description = form.seo_description.trim() || null;
      next.seo_keywords = form.seo_keywords.trim() || null;
      next.og_image = form.og_image.trim() || null;
      next.robots = form.robots.trim() || null;
      next.canonical = form.canonical.trim() || null;

      const res = await fetch(`/admin/products/${product.id}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.success("SEO ayarları kaydedildi");
    } catch (e) {
      toast.error("Kaydedilemedi", { description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadImage(f);
      update("og_image", url);
      toast.success("OG resmi yüklendi");
    } catch (err) {
      toast.error("Yükleme başarısız", { description: String(err) });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  const titleLen = form.seo_title.length;
  const descLen = form.seo_description.length;
  const fallbackTitle = product.title || "—";
  const previewTitle = form.seo_title || fallbackTitle;
  const productUrl =
    (process.env.STOREFRONT_URL || "https://www.testerestore.com") +
    "/products/" +
    (product.handle || product.id);

  return (
    <Container className="p-6 space-y-5">
      <div className="flex items-center gap-2">
        <GlobeEurope className="text-ui-fg-subtle" />
        <Heading level="h2">SEO Ayarları</Heading>
        <Badge color="grey" size="xsmall">Bu ürüne özel</Badge>
      </div>

      <Text size="small" className="text-ui-fg-subtle">
        Bu alanlar boşsa, ürün başlığı + site-genel SEO ayarları kullanılır.
        Burada doldurursanız <strong>sadece bu ürün sayfasında</strong>{" "}
        geçerli olur.
      </Text>

      {/* Google önizleme */}
      <div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
        <Text size="xsmall" className="text-ui-fg-subtle mb-2 font-semibold uppercase tracking-wide">
          Google önizleme
        </Text>
        <div className="space-y-1">
          <div className="text-xs text-emerald-700 truncate">{productUrl}</div>
          <div className="text-lg text-blue-700 font-medium leading-tight line-clamp-1">
            {previewTitle}
          </div>
          <div className="text-sm text-ui-fg-base line-clamp-2">
            {form.seo_description || "Açıklama girilmedi — site varsayılan açıklaması kullanılır."}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>SEO Başlığı</Label>
        <Input
          value={form.seo_title}
          onChange={(e) => update("seo_title", e.target.value)}
          placeholder={`Boşsa: "${fallbackTitle}" kullanılır`}
        />
        <Text size="xsmall" className={titleLen > 60 ? "text-rose-600" : "text-ui-fg-subtle"}>
          {titleLen} / 60 karakter
          {titleLen > 60 && " — Çok uzun, Google kesebilir"}
          {titleLen > 0 && titleLen < 30 && " — Çok kısa olabilir"}
        </Text>
      </div>

      <div className="space-y-2">
        <Label>SEO Açıklaması (meta description)</Label>
        <Textarea
          value={form.seo_description}
          onChange={(e) => update("seo_description", e.target.value)}
          rows={3}
          placeholder="Bu ürünü Google sonuçlarında özetleyen 1-2 cümle..."
        />
        <Text
          size="xsmall"
          className={
            descLen > 160 || (descLen > 0 && descLen < 100)
              ? "text-amber-600"
              : "text-ui-fg-subtle"
          }
        >
          {descLen} / 160 karakter
          {descLen > 160 && " — Çok uzun"}
          {descLen > 0 && descLen < 100 && " — Çok kısa olabilir"}
        </Text>
      </div>

      <div className="space-y-2">
        <Label>Anahtar Kelimeler (virgülle ayrılmış)</Label>
        <Input
          value={form.seo_keywords}
          onChange={(e) => update("seo_keywords", e.target.value)}
          placeholder="bi-metal şerit, M42, 27mm şerit testere"
        />
        <Text size="xsmall" className="text-ui-fg-subtle">
          Google çoğunlukla görmezden gelir, ama Yandex/Bing için faydalı.
        </Text>
      </div>

      <div className="space-y-2">
        <Label>OG / Sosyal Medya Görseli</Label>
        <div className="flex gap-3 items-start">
          <div className="w-24 h-16 shrink-0 rounded-md border border-ui-border-base overflow-hidden bg-ui-bg-base flex items-center justify-center">
            {form.og_image ? (
              <img src={form.og_image} alt="" className="w-full h-full object-cover" />
            ) : (
              <Text size="xsmall" className="text-ui-fg-subtle">yok</Text>
            )}
          </div>
          <div className="flex-1 space-y-2">
            <label className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-ui-button-neutral hover:bg-ui-button-neutral-hover text-xs font-medium border border-ui-border-base cursor-pointer w-full">
              {uploading ? "Yükleniyor..." : "📤 Dosya Seç"}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploading}
                onChange={pickFile}
              />
            </label>
            <Input
              value={form.og_image}
              onChange={(e) => update("og_image", e.target.value)}
              placeholder="veya URL — 1200×630 önerilen"
              size="small"
            />
          </div>
        </div>
        <Text size="xsmall" className="text-ui-fg-subtle">
          Boşsa ürünün ana resmi kullanılır.
        </Text>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Robots</Label>
          <Input
            value={form.robots}
            onChange={(e) => update("robots", e.target.value)}
            placeholder="index, follow"
          />
          <Text size="xsmall" className="text-ui-fg-subtle">
            Tükenmiş ürünü gizlemek için <code>noindex, follow</code>.
          </Text>
        </div>
        <div className="space-y-2">
          <Label>Canonical URL (override)</Label>
          <Input
            value={form.canonical}
            onChange={(e) => update("canonical", e.target.value)}
            placeholder="/products/handle (varsayılan)"
          />
        </div>
      </div>

      <div className="flex justify-end pt-2 border-t border-ui-border-base">
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? "Kaydediliyor..." : "SEO Ayarlarını Kaydet"}
        </Button>
      </div>
    </Container>
  );
};

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
});

export default ProductSeoWidget;
