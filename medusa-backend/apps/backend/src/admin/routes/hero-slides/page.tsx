import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Photo, Plus, PencilSquare, Trash, ChevronUpMini, ChevronDownMini } from "@medusajs/icons";
import {
  Container, Heading, Text, Button, Input, Label, Textarea, Switch,
  Select, Badge, Drawer, toast,
} from "@medusajs/ui";
import { useEffect, useState } from "react";

interface HeroSlide {
  id: string;
  badge: string; badge_icon: string;
  title_prefix: string; title_suffix: string | null;
  highlight: string; description: string; image_url: string;
  primary_cta_label: string; primary_cta_href: string;
  secondary_cta_label: string | null; secondary_cta_href: string | null;
  accent: string | null; sort_order: number; is_active: boolean;
}

type SlideFormState = Omit<HeroSlide, "id">;

const BADGE_ICONS = [
  { value: "zap", label: "Zap (Şimşek)" },
  { value: "flame", label: "Flame (Alev)" },
  { value: "wrench", label: "Wrench (Anahtar)" },
  { value: "award", label: "Award (Ödül)" },
];

const EMPTY_FORM: SlideFormState = {
  badge: "", badge_icon: "zap",
  title_prefix: "", title_suffix: null, highlight: "",
  description: "", image_url: "/images/hero_bandsaw.png",
  primary_cta_label: "İncele", primary_cta_href: "/",
  secondary_cta_label: null, secondary_cta_href: null,
  accent: "from-orange-500/30 via-amber-500/10",
  sort_order: 0, is_active: true,
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

/**
 * Upload a single image file via Medusa's admin upload endpoint.
 * Returns the URL of the uploaded file.
 */
async function uploadImage(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("files", file);
  const res = await fetch("/admin/uploads", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Upload failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { files: Array<{ id: string; url: string }> };
  if (!data.files?.[0]?.url) {
    throw new Error("Upload response missing file URL");
  }
  return data.files[0].url;
}

/** File picker + URL fallback for the slide hero image. */
const ImageField = ({ value, onChange }: {
  value: string;
  onChange: (url: string) => void;
}) => {
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadImage(file);
      onChange(url);
      toast.success("Görsel yüklendi");
    } catch (err) {
      toast.error("Yükleme başarısız", { description: String(err) });
    } finally {
      setUploading(false);
      e.target.value = ""; // reset so the same file can be re-picked
    }
  }

  return (
    <div className="space-y-2">
      <Label>Görsel</Label>
      <div className="flex items-start gap-3">
        <div className="w-20 h-20 shrink-0 rounded-md bg-ui-bg-base border border-ui-border-base overflow-hidden flex items-center justify-center">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt="preview"
              className="w-full h-full object-cover"
              onError={(ev) => { (ev.target as HTMLImageElement).style.opacity = "0.2"; }}
            />
          ) : (
            <Text size="xsmall" className="text-ui-fg-subtle">yok</Text>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <label className="inline-flex items-center justify-center h-9 px-4 rounded-md bg-ui-button-neutral hover:bg-ui-button-neutral-hover text-ui-fg-base text-xs font-medium border border-ui-border-base cursor-pointer w-full">
            {uploading ? "Yükleniyor..." : "📤 Dosyadan Yükle"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={handleFile}
            />
          </label>
          <Input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="veya URL yapıştır (/images/...)"
            size="small"
          />
        </div>
      </div>
      <Text size="xsmall" className="text-ui-fg-subtle">
        Dosya yüklediğinizde Medusa'nın upload sistemi kullanılır; alternatif olarak
        manuel URL de girebilirsiniz. Max 5 MB.
      </Text>
    </div>
  );
};

const HeroSlidesAdminPage = () => {
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<SlideFormState>(EMPTY_FORM);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function loadSlides() {
    setLoading(true);
    try {
      const data = await api<{ hero_slides: HeroSlide[] }>("/admin/hero-slides");
      setSlides((data.hero_slides || []).sort((a, b) => a.sort_order - b.sort_order));
    } catch (e) {
      toast.error("Slaytlar yüklenemedi", { description: String(e) });
    } finally { setLoading(false); }
  }

  useEffect(() => { loadSlides(); }, []);

  function openCreate() {
    setEditingId(null);
    setForm({ ...EMPTY_FORM, sort_order: slides.length });
    setDrawerOpen(true);
  }

  function openEdit(slide: HeroSlide) {
    setEditingId(slide.id);
    setForm({
      badge: slide.badge, badge_icon: slide.badge_icon,
      title_prefix: slide.title_prefix, title_suffix: slide.title_suffix,
      highlight: slide.highlight, description: slide.description,
      image_url: slide.image_url,
      primary_cta_label: slide.primary_cta_label, primary_cta_href: slide.primary_cta_href,
      secondary_cta_label: slide.secondary_cta_label, secondary_cta_href: slide.secondary_cta_href,
      accent: slide.accent, sort_order: slide.sort_order, is_active: slide.is_active,
    });
    setDrawerOpen(true);
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      if (editingId) {
        await api(`/admin/hero-slides/${editingId}`, { method: "PATCH", body: JSON.stringify(form) });
        toast.success("Slayt güncellendi");
      } else {
        await api("/admin/hero-slides", { method: "POST", body: JSON.stringify(form) });
        toast.success("Slayt oluşturuldu");
      }
      setDrawerOpen(false); await loadSlides();
    } catch (e) { toast.error("Kaydetme başarısız", { description: String(e) }); }
    finally { setSubmitting(false); }
  }

  async function handleDelete(slide: HeroSlide) {
    if (!confirm(`"${slide.badge}" slaytını silmek istediğinize emin misiniz?`)) return;
    try {
      await api(`/admin/hero-slides/${slide.id}`, { method: "DELETE" });
      toast.success("Slayt silindi"); await loadSlides();
    } catch (e) { toast.error("Silinemedi", { description: String(e) }); }
  }

  async function move(slide: HeroSlide, direction: -1 | 1) {
    const swap = slides.find((s) => s.sort_order === slide.sort_order + direction);
    try {
      await api(`/admin/hero-slides/${slide.id}`, {
        method: "PATCH", body: JSON.stringify({ sort_order: slide.sort_order + direction }),
      });
      if (swap) {
        await api(`/admin/hero-slides/${swap.id}`, {
          method: "PATCH", body: JSON.stringify({ sort_order: slide.sort_order }),
        });
      }
      await loadSlides();
    } catch (e) { toast.error("Sıra değiştirilemedi", { description: String(e) }); }
  }

  async function toggleActive(slide: HeroSlide) {
    try {
      await api(`/admin/hero-slides/${slide.id}`, {
        method: "PATCH", body: JSON.stringify({ is_active: !slide.is_active }),
      });
      await loadSlides();
    } catch (e) { toast.error("Güncellenemedi", { description: String(e) }); }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Anasayfa Slider</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Storefront'taki hero carousel slaytları. Sadece aktif olanlar gösterilir.
          </Text>
        </div>
        <Button variant="primary" onClick={openCreate}>
          <Plus /> <span>Yeni Slayt</span>
        </Button>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text className="text-ui-fg-subtle">Yükleniyor...</Text>
        ) : slides.length === 0 ? (
          <div className="text-center py-12 space-y-3">
            <Text>Henüz slayt yok.</Text>
            <Button onClick={openCreate}><Plus /> <span>İlk Slaytı Oluştur</span></Button>
          </div>
        ) : (
          <div className="space-y-3">
            {slides.map((slide, idx) => (
              <div key={slide.id} className="flex items-start gap-4 p-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle">
                <div className="w-20 h-20 shrink-0 rounded-md bg-ui-bg-base border border-ui-border-base overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={slide.image_url} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge size="2xsmall" color={slide.is_active ? "green" : "grey"}>
                      {slide.is_active ? "Aktif" : "Pasif"}
                    </Badge>
                    <Badge size="2xsmall">#{slide.sort_order}</Badge>
                    <Text size="xsmall" className="text-ui-fg-subtle">{slide.badge}</Text>
                  </div>
                  <Heading level="h3" className="truncate">
                    {slide.title_prefix} <span className="text-ui-fg-interactive">{slide.highlight}</span>
                  </Heading>
                  <Text size="small" className="text-ui-fg-subtle line-clamp-2">{slide.description}</Text>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <div className="flex gap-1">
                    <Button size="small" variant="transparent" onClick={() => move(slide, -1)} disabled={idx === 0} title="Yukarı"><ChevronUpMini /></Button>
                    <Button size="small" variant="transparent" onClick={() => move(slide, 1)} disabled={idx === slides.length - 1} title="Aşağı"><ChevronDownMini /></Button>
                  </div>
                  <div className="flex items-center gap-2 px-2">
                    <Switch checked={slide.is_active} onCheckedChange={() => toggleActive(slide)} />
                  </div>
                  <div className="flex gap-1">
                    <Button size="small" variant="secondary" onClick={() => openEdit(slide)}><PencilSquare /></Button>
                    <Button size="small" variant="danger" onClick={() => handleDelete(slide)}><Trash /></Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>{editingId ? "Slaytı Düzenle" : "Yeni Slayt"}</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="overflow-y-auto space-y-4">
            <div><Label>Üst Etiket</Label><Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} placeholder="Özel Boy Kaynaklı Şerit Testereler" /></div>
            <div>
              <Label>Etiket İkonu</Label>
              <Select value={form.badge_icon} onValueChange={(v) => setForm({ ...form, badge_icon: v })}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Content>
                  {BADGE_ICONS.map((i) => (<Select.Item key={i.value} value={i.value}>{i.label}</Select.Item>))}
                </Select.Content>
              </Select>
            </div>
            <div><Label>Başlık (1. satır)</Label><Input value={form.title_prefix} onChange={(e) => setForm({ ...form, title_prefix: e.target.value })} placeholder="Endüstriyel Kesimde" /></div>
            <div><Label>Başlık (2. satır - opsiyonel)</Label><Input value={form.title_suffix ?? ""} onChange={(e) => setForm({ ...form, title_suffix: e.target.value || null })} /></div>
            <div><Label>Vurgu Kelime (turuncu)</Label><Input value={form.highlight} onChange={(e) => setForm({ ...form, highlight: e.target.value })} placeholder="Premium Standartlar" /></div>
            <div><Label>Açıklama</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <ImageField value={form.image_url} onChange={(v) => setForm({ ...form, image_url: v })} />
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Birincil Buton</Label><Input value={form.primary_cta_label} onChange={(e) => setForm({ ...form, primary_cta_label: e.target.value })} /></div>
              <div><Label>Bağlantı</Label><Input value={form.primary_cta_href} onChange={(e) => setForm({ ...form, primary_cta_href: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>İkincil Buton</Label><Input value={form.secondary_cta_label ?? ""} onChange={(e) => setForm({ ...form, secondary_cta_label: e.target.value || null })} /></div>
              <div><Label>Bağlantı</Label><Input value={form.secondary_cta_href ?? ""} onChange={(e) => setForm({ ...form, secondary_cta_href: e.target.value || null })} /></div>
            </div>
            <div><Label>Accent Tailwind Class</Label><Input value={form.accent ?? ""} onChange={(e) => setForm({ ...form, accent: e.target.value || null })} placeholder="from-orange-500/30 via-amber-500/10" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Sıra</Label><Input type="number" min={0} value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} /></div>
              <div className="flex items-end gap-2 pb-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label>Aktif</Label>
              </div>
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild><Button variant="secondary">İptal</Button></Drawer.Close>
            <Button variant="primary" onClick={handleSubmit} isLoading={submitting}>
              {editingId ? "Kaydet" : "Oluştur"}
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  );
};

export const config = defineRouteConfig({
  label: "Anasayfa Slider",
  icon: Photo,
});

export default HeroSlidesAdminPage;
