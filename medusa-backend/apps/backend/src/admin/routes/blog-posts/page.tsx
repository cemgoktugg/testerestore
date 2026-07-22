import { defineRouteConfig } from "@medusajs/admin-sdk";
import { DocumentText, Plus, PencilSquare, Trash } from "@medusajs/icons";
import {
  Container,
  Heading,
  Text,
  Button,
  Input,
  Label,
  Textarea,
  Switch,
  Badge,
  Drawer,
  Table,
  toast,
} from "@medusajs/ui";
import { useEffect, useMemo, useState } from "react";

interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  cover_image: string | null;
  author: string | null;
  tags: string | null;
  is_published: boolean;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

type Form = {
  slug: string;
  title: string;
  excerpt: string;
  body_md: string;
  cover_image: string;
  author: string;
  tags: string;
  is_published: boolean;
  seo_title: string;
  seo_description: string;
};

const EMPTY: Form = {
  slug: "",
  title: "",
  excerpt: "",
  body_md: "",
  cover_image: "",
  author: "",
  tags: "",
  is_published: false,
  seo_title: "",
  seo_description: "",
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

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[ğ]/g, "g")
    .replace(/[ü]/g, "u")
    .replace(/[ş]/g, "s")
    .replace(/[ı]/g, "i")
    .replace(/[ö]/g, "o")
    .replace(/[ç]/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export default function BlogPostsAdmin() {
  const [rows, setRows] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ blog_posts: BlogPost[] }>("/admin/blog-posts");
      setRows(data.blog_posts);
    } catch (e) {
      toast.error("Yüklenemedi", { description: String(e) });
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  const publishedCount = useMemo(
    () => rows.filter((r) => r.is_published).length,
    [rows]
  );

  function openNew() {
    setEditingId(null);
    setForm(EMPTY);
    setOpen(true);
  }

  function openEdit(r: BlogPost) {
    setEditingId(r.id);
    setForm({
      slug: r.slug,
      title: r.title,
      excerpt: r.excerpt ?? "",
      body_md: r.body_md,
      cover_image: r.cover_image ?? "",
      author: r.author ?? "",
      tags: r.tags ?? "",
      is_published: r.is_published,
      seo_title: r.seo_title ?? "",
      seo_description: r.seo_description ?? "",
    });
    setOpen(true);
  }

  async function save() {
    if (!form.slug || !form.title || form.body_md.length < 10) {
      toast.error("Slug, başlık ve içerik zorunlu (içerik ≥ 10 karakter)");
      return;
    }
    setSaving(true);
    try {
      const body = {
        ...form,
        excerpt: form.excerpt || null,
        cover_image: form.cover_image || null,
        author: form.author || null,
        tags: form.tags || null,
        seo_title: form.seo_title || null,
        seo_description: form.seo_description || null,
      };
      if (editingId) {
        await api(`/admin/blog-posts/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
      } else {
        await api("/admin/blog-posts", {
          method: "POST",
          body: JSON.stringify(body),
        });
      }
      toast.success("Kaydedildi");
      setOpen(false);
      await load();
    } catch (e) {
      toast.error("Kayıt başarısız", { description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Yazıyı silmek istediğinize emin misiniz?")) return;
    try {
      await api(`/admin/blog-posts/${id}`, { method: "DELETE" });
      toast.success("Silindi");
      load();
    } catch (e) {
      toast.error("Silinemedi", { description: String(e) });
    }
  }

  async function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadImage(f);
      setForm((s) => ({ ...s, cover_image: url }));
      toast.success("Kapak resmi yüklendi");
    } catch (err) {
      toast.error("Yükleme başarısız", { description: String(err) });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
        <div>
          <Heading level="h1">Blog Yazıları</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {publishedCount} yayınlanmış, {rows.length - publishedCount} taslak
          </Text>
        </div>
        <Button variant="primary" onClick={openNew}>
          <Plus className="mr-1" /> Yeni Yazı
        </Button>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text>Yükleniyor...</Text>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-ui-fg-subtle">
            Henüz blog yazısı yok.
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Başlık</Table.HeaderCell>
                <Table.HeaderCell>Slug</Table.HeaderCell>
                <Table.HeaderCell>Yazar</Table.HeaderCell>
                <Table.HeaderCell>Durum</Table.HeaderCell>
                <Table.HeaderCell></Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((r) => (
                <Table.Row key={r.id}>
                  <Table.Cell>
                    <div className="font-medium">{r.title}</div>
                    {r.excerpt && (
                      <Text size="xsmall" className="text-ui-fg-subtle line-clamp-1">
                        {r.excerpt}
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="xsmall" className="font-mono text-ui-fg-subtle">
                      /{r.slug}
                    </Text>
                  </Table.Cell>
                  <Table.Cell>
                    <Text size="xsmall">{r.author || "—"}</Text>
                  </Table.Cell>
                  <Table.Cell>
                    {r.is_published ? (
                      <Badge color="green">Yayında</Badge>
                    ) : (
                      <Badge color="grey">Taslak</Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-1 justify-end">
                      <Button
                        variant="transparent"
                        size="small"
                        onClick={() => openEdit(r)}
                      >
                        <PencilSquare />
                      </Button>
                      <Button
                        variant="transparent"
                        size="small"
                        onClick={() => remove(r.id)}
                      >
                        <Trash />
                      </Button>
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        )}
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>
              {editingId ? "Yazıyı Düzenle" : "Yeni Yazı"}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label>Başlık</Label>
              <Input
                value={form.title}
                onChange={(e) => {
                  const t = e.target.value;
                  setForm((s) => ({
                    ...s,
                    title: t,
                    slug: s.slug || slugify(t),
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Slug (URL)</Label>
              <Input
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: slugify(e.target.value) })
                }
                placeholder="serit-testere-secimi"
              />
              <Text size="xsmall" className="text-ui-fg-subtle">
                URL: /blog/{form.slug || "..."}
              </Text>
            </div>
            <div className="space-y-2">
              <Label>Özet (liste sayfasında görünür)</Label>
              <Textarea
                value={form.excerpt}
                onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Kapak Görseli</Label>
              <div className="flex gap-3 items-start">
                <div className="w-20 h-20 shrink-0 rounded-md border border-ui-border-base overflow-hidden bg-ui-bg-base flex items-center justify-center">
                  {form.cover_image ? (
                    <img
                      src={form.cover_image}
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
                    value={form.cover_image}
                    onChange={(e) =>
                      setForm({ ...form, cover_image: e.target.value })
                    }
                    placeholder="veya URL"
                    size="small"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>İçerik (Markdown)</Label>
              <Textarea
                value={form.body_md}
                onChange={(e) => setForm({ ...form, body_md: e.target.value })}
                rows={14}
                placeholder={"# Başlık\n\nParagraf...\n\n## Alt Başlık\n\n- Madde 1\n- Madde 2"}
                className="font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Yazar</Label>
                <Input
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Etiketler (virgülle)</Label>
                <Input
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="bi-metal, kalibre, ipuçları"
                />
              </div>
            </div>
            <div className="border-t border-ui-border-base pt-4 space-y-2">
              <Text size="xsmall" className="text-ui-fg-subtle font-semibold uppercase">
                SEO (opsiyonel)
              </Text>
              <div className="space-y-2">
                <Label>SEO Başlık</Label>
                <Input
                  value={form.seo_title}
                  onChange={(e) => setForm({ ...form, seo_title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>SEO Açıklama</Label>
                <Textarea
                  value={form.seo_description}
                  onChange={(e) =>
                    setForm({ ...form, seo_description: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-ui-border-base">
              <Label>Yayında</Label>
              <Switch
                checked={form.is_published}
                onCheckedChange={(v) =>
                  setForm({ ...form, is_published: Boolean(v) })
                }
              />
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={saving}
            >
              İptal
            </Button>
            <Button variant="primary" onClick={save} disabled={saving}>
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  );
}

export const config = defineRouteConfig({
  label: "Blog Yazıları",
  icon: DocumentText,
});
