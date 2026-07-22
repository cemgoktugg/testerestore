import { defineRouteConfig } from "@medusajs/admin-sdk";
import { GlobeEurope, InformationCircle } from "@medusajs/icons";
import {
  Container,
  Heading,
  Text,
  Button,
  Input,
  Label,
  Textarea,
  Tabs,
  toast,
} from "@medusajs/ui";
import { useEffect, useState } from "react";

interface SiteSeo {
  id: string;
  site_name: string;
  default_title: string;
  title_template: string;
  default_description: string;
  default_keywords: string | null;
  default_og_image: string | null;
  twitter_handle: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  linkedin_url: string | null;
  youtube_url: string | null;
  google_site_verification: string | null;
  yandex_site_verification: string | null;
  bing_site_verification: string | null;
  robots_default: string;
  canonical_base_url: string | null;
  default_locale: string;
  page_overrides: Record<string, PageOverride> | null;
}

interface PageOverride {
  title?: string;
  description?: string;
  og_image?: string;
  keywords?: string;
  robots?: string;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

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

const PAGE_KEYS: Array<{ key: string; label: string; defaultPath: string }> = [
  { key: "home", label: "Ana Sayfa", defaultPath: "/" },
  { key: "katalog", label: "Dijital Katalog", defaultPath: "/katalog" },
  { key: "blog", label: "Blog Listesi", defaultPath: "/blog" },
  { key: "iletisim", label: "İletişim", defaultPath: "/iletisim" },
  { key: "arama", label: "Arama Sonuçları", defaultPath: "/arama" },
];

export default function SiteSeoAdmin() {
  const [data, setData] = useState<SiteSeo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api<{ site_seo: SiteSeo }>("/admin/site-seo");
      setData(res.site_seo);
    } catch (e) {
      toast.error("Yüklenemedi", { description: String(e) });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  async function save() {
    if (!data) return;
    setSaving(true);
    try {
      const body = {
        site_name: data.site_name,
        default_title: data.default_title,
        title_template: data.title_template,
        default_description: data.default_description,
        default_keywords: data.default_keywords,
        default_og_image: data.default_og_image,
        twitter_handle: data.twitter_handle,
        facebook_url: data.facebook_url,
        instagram_url: data.instagram_url,
        linkedin_url: data.linkedin_url,
        youtube_url: data.youtube_url,
        google_site_verification: data.google_site_verification,
        yandex_site_verification: data.yandex_site_verification,
        bing_site_verification: data.bing_site_verification,
        robots_default: data.robots_default,
        canonical_base_url: data.canonical_base_url,
        default_locale: data.default_locale,
        page_overrides: data.page_overrides,
      };
      const res = await api<{ site_seo: SiteSeo }>("/admin/site-seo", {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setData(res.site_seo);
      toast.success("SEO ayarları kaydedildi");
    } catch (e) {
      toast.error("Kayıt başarısız", { description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f || !data) return;
    setUploading(true);
    try {
      const url = await uploadImage(f);
      setData({ ...data, default_og_image: url });
      toast.success("OG resmi yüklendi");
    } catch (err) {
      toast.error("Yükleme başarısız", { description: String(err) });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  function updateField<K extends keyof SiteSeo>(key: K, value: SiteSeo[K]) {
    if (!data) return;
    setData({ ...data, [key]: value });
  }

  function updateOverride(pageKey: string, field: keyof PageOverride, value: string) {
    if (!data) return;
    const overrides = { ...(data.page_overrides || {}) };
    overrides[pageKey] = { ...(overrides[pageKey] || {}), [field]: value || undefined };
    setData({ ...data, page_overrides: overrides });
  }

  if (loading || !data) {
    return (
      <Container className="p-6">
        <Text>Yükleniyor...</Text>
      </Container>
    );
  }

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
        <div>
          <Heading level="h1">SEO Ayarları</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Site adı, meta açıklamaları, OG, sosyal medya ve arama motoru
            doğrulama kodları.
          </Text>
        </div>
        <Button variant="primary" onClick={save} disabled={saving}>
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </Button>
      </div>

      <div className="px-6 py-4">
        <Tabs defaultValue="general">
          <Tabs.List className="mb-6">
            <Tabs.Trigger value="general">Genel</Tabs.Trigger>
            <Tabs.Trigger value="social">Sosyal Medya & OG</Tabs.Trigger>
            <Tabs.Trigger value="verification">Doğrulama</Tabs.Trigger>
            <Tabs.Trigger value="pages">Sayfa Override</Tabs.Trigger>
            <Tabs.Trigger value="advanced">Gelişmiş</Tabs.Trigger>
          </Tabs.List>

          {/* GENEL */}
          <Tabs.Content value="general" className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <Label>Site Adı</Label>
              <Input
                value={data.site_name}
                onChange={(e) => updateField("site_name", e.target.value)}
                placeholder="Testere Store"
              />
              <Text size="xsmall" className="text-ui-fg-subtle">
                Tüm sayfalarda &lt;title&gt; ve OG site_name'de görünür.
              </Text>
            </div>

            <div className="space-y-2">
              <Label>Varsayılan Başlık (Ana Sayfa için)</Label>
              <Input
                value={data.default_title}
                onChange={(e) => updateField("default_title", e.target.value)}
                placeholder="Testere Store — Endüstriyel Şerit Testere"
              />
              <Text size="xsmall" className="text-ui-fg-subtle">
                Önerilen uzunluk: 50-60 karakter. Şu an: {data.default_title.length} karakter
                {data.default_title.length > 60 && " ⚠️ Çok uzun"}
              </Text>
            </div>

            <div className="space-y-2">
              <Label>Başlık Şablonu</Label>
              <Input
                value={data.title_template}
                onChange={(e) => updateField("title_template", e.target.value)}
                placeholder="%s | Testere Store"
              />
              <Text size="xsmall" className="text-ui-fg-subtle">
                Diğer sayfaların başlığına eklenir. <code>%s</code> sayfa
                başlığıyla değiştirilir.
              </Text>
            </div>

            <div className="space-y-2">
              <Label>Varsayılan Açıklama</Label>
              <Textarea
                value={data.default_description}
                onChange={(e) =>
                  updateField("default_description", e.target.value)
                }
                rows={3}
                placeholder="Sitenizin genel açıklaması..."
              />
              <Text size="xsmall" className="text-ui-fg-subtle">
                Önerilen: 120-160 karakter. Şu an:{" "}
                {data.default_description.length} karakter
                {data.default_description.length > 160 && " ⚠️ Çok uzun"}
                {data.default_description.length < 120 && " ⚠️ Çok kısa"}
              </Text>
            </div>

            <div className="space-y-2">
              <Label>Anahtar Kelimeler (virgülle ayrılmış)</Label>
              <Textarea
                value={data.default_keywords ?? ""}
                onChange={(e) =>
                  updateField("default_keywords", e.target.value || null)
                }
                rows={2}
                placeholder="şerit testere, bi-metal, karbür uçlu..."
              />
              <Text size="xsmall" className="text-ui-fg-subtle">
                Google bunu çoğunlukla görmezden gelir ama Yandex/Bing için
                hâlâ faydalı.
              </Text>
            </div>
          </Tabs.Content>

          {/* SOSYAL & OG */}
          <Tabs.Content value="social" className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <Label>Varsayılan OG Görseli</Label>
              <div className="flex gap-3 items-start">
                <div className="w-24 h-16 shrink-0 rounded-md border border-ui-border-base overflow-hidden bg-ui-bg-base flex items-center justify-center">
                  {data.default_og_image ? (
                    <img
                      src={data.default_og_image}
                      alt=""
                      className="w-full h-full object-cover"
                    />
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
                    value={data.default_og_image ?? ""}
                    onChange={(e) =>
                      updateField("default_og_image", e.target.value || null)
                    }
                    placeholder="veya URL — önerilen 1200×630 px"
                    size="small"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Twitter Handle</Label>
              <Input
                value={data.twitter_handle ?? ""}
                onChange={(e) =>
                  updateField("twitter_handle", e.target.value || null)
                }
                placeholder="@testerestore"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Facebook</Label>
                <Input
                  value={data.facebook_url ?? ""}
                  onChange={(e) =>
                    updateField("facebook_url", e.target.value || null)
                  }
                  placeholder="https://facebook.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label>Instagram</Label>
                <Input
                  value={data.instagram_url ?? ""}
                  onChange={(e) =>
                    updateField("instagram_url", e.target.value || null)
                  }
                  placeholder="https://instagram.com/..."
                />
              </div>
              <div className="space-y-2">
                <Label>LinkedIn</Label>
                <Input
                  value={data.linkedin_url ?? ""}
                  onChange={(e) =>
                    updateField("linkedin_url", e.target.value || null)
                  }
                  placeholder="https://linkedin.com/company/..."
                />
              </div>
              <div className="space-y-2">
                <Label>YouTube</Label>
                <Input
                  value={data.youtube_url ?? ""}
                  onChange={(e) =>
                    updateField("youtube_url", e.target.value || null)
                  }
                  placeholder="https://youtube.com/@..."
                />
              </div>
            </div>
          </Tabs.Content>

          {/* DOĞRULAMA */}
          <Tabs.Content value="verification" className="space-y-4 max-w-2xl">
            <div className="flex items-start gap-2 rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3 text-xs">
              <InformationCircle className="text-ui-fg-subtle shrink-0 mt-0.5" />
              <div>
                <Text size="xsmall" weight="plus">
                  Doğrulama kodları nereden alınır?
                </Text>
                <ul className="list-disc pl-4 mt-1 space-y-0.5 text-ui-fg-subtle">
                  <li>Google: Search Console → Mülk Ekle → HTML etiketi yöntemi</li>
                  <li>Yandex: Yandex Webmaster → Mülk Ekle → Meta tag</li>
                  <li>Bing: Bing Webmaster Tools → Site Ekle → HTML Meta tag</li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Google Site Verification</Label>
              <Input
                value={data.google_site_verification ?? ""}
                onChange={(e) =>
                  updateField(
                    "google_site_verification",
                    e.target.value || null
                  )
                }
                placeholder="ABC123..."
              />
              <Text size="xsmall" className="text-ui-fg-subtle">
                Sadece <code>content=&quot;...&quot;</code> kısmındaki kodu girin,
                tüm meta tag'i değil.
              </Text>
            </div>

            <div className="space-y-2">
              <Label>Yandex Site Verification</Label>
              <Input
                value={data.yandex_site_verification ?? ""}
                onChange={(e) =>
                  updateField(
                    "yandex_site_verification",
                    e.target.value || null
                  )
                }
                placeholder="abcdef123..."
              />
            </div>

            <div className="space-y-2">
              <Label>Bing Site Verification</Label>
              <Input
                value={data.bing_site_verification ?? ""}
                onChange={(e) =>
                  updateField("bing_site_verification", e.target.value || null)
                }
                placeholder="ABC123..."
              />
            </div>
          </Tabs.Content>

          {/* SAYFA OVERRIDE */}
          <Tabs.Content value="pages" className="space-y-6 max-w-2xl">
            <Text size="small" className="text-ui-fg-subtle">
              Belirli sayfalarda farklı başlık/açıklama kullanmak için. Boş
              bırakırsanız genel ayar geçerli olur.
            </Text>

            {PAGE_KEYS.map(({ key, label, defaultPath }) => {
              const ov = (data.page_overrides ?? {})[key] || {};
              return (
                <div
                  key={key}
                  className="rounded-lg border border-ui-border-base p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <Text weight="plus">{label}</Text>
                    <Text size="xsmall" className="text-ui-fg-subtle font-mono">
                      {defaultPath}
                    </Text>
                  </div>
                  <div className="space-y-2">
                    <Label>Başlık</Label>
                    <Input
                      value={ov.title ?? ""}
                      onChange={(e) =>
                        updateOverride(key, "title", e.target.value)
                      }
                      placeholder="Genel başlık kullanılacak"
                      size="small"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Açıklama</Label>
                    <Textarea
                      value={ov.description ?? ""}
                      onChange={(e) =>
                        updateOverride(key, "description", e.target.value)
                      }
                      rows={2}
                      placeholder="Genel açıklama kullanılacak"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label>Anahtar Kelimeler</Label>
                      <Input
                        value={ov.keywords ?? ""}
                        onChange={(e) =>
                          updateOverride(key, "keywords", e.target.value)
                        }
                        placeholder="—"
                        size="small"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Robots</Label>
                      <Input
                        value={ov.robots ?? ""}
                        onChange={(e) =>
                          updateOverride(key, "robots", e.target.value)
                        }
                        placeholder="index, follow"
                        size="small"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </Tabs.Content>

          {/* GELİŞMİŞ */}
          <Tabs.Content value="advanced" className="space-y-4 max-w-2xl">
            <div className="space-y-2">
              <Label>Canonical Base URL</Label>
              <Input
                value={data.canonical_base_url ?? ""}
                onChange={(e) =>
                  updateField("canonical_base_url", e.target.value || null)
                }
                placeholder="https://www.testerestore.com"
              />
              <Text size="xsmall" className="text-ui-fg-subtle">
                Canonical link'lerinde kullanılır. Boşsa env'den{" "}
                <code>NEXT_PUBLIC_SITE_URL</code> okunur.
              </Text>
            </div>

            <div className="space-y-2">
              <Label>Varsayılan Robots Direktifi</Label>
              <Input
                value={data.robots_default}
                onChange={(e) => updateField("robots_default", e.target.value)}
                placeholder="index, follow"
              />
              <Text size="xsmall" className="text-ui-fg-subtle">
                Tüm public sayfaların &lt;meta name=&quot;robots&quot;&gt;{" "}
                değeri. Geliştirme sırasında <code>noindex, nofollow</code>{" "}
                yapabilirsiniz.
              </Text>
            </div>

            <div className="space-y-2">
              <Label>Varsayılan Locale</Label>
              <Input
                value={data.default_locale}
                onChange={(e) => updateField("default_locale", e.target.value)}
                placeholder="tr_TR"
              />
            </div>
          </Tabs.Content>
        </Tabs>
      </div>
    </Container>
  );
}

export const config = defineRouteConfig({
  label: "SEO Ayarları",
  icon: GlobeEurope,
});
