import { defineRouteConfig } from "@medusajs/admin-sdk";
import {
  LayoutBottom, Plus, PencilSquare, Trash, ChevronUpMini, ChevronDownMini,
} from "@medusajs/icons";
import {
  Container, Heading, Text, Button, Input, Label, Textarea, Switch,
  Select, Badge, Drawer, Tabs, toast,
} from "@medusajs/ui";
import { useCallback, useEffect, useState } from "react";

interface Feature {
  id: string;
  icon: string; title: string; description: string;
  sort_order: number; is_active: boolean;
}
interface LinkItem { label: string; href: string }
interface LinkGroup {
  id: string; title: string; links: LinkItem[];
  sort_order: number; is_active: boolean;
}
interface Settings {
  id?: string;
  company_description: string;
  contact_phone: string | null;
  contact_email: string | null;
  contact_address: string | null;
  copyright_text: string | null;
  legal_links: Array<{ label: string; href?: string }>;
}

const ICON_OPTIONS = [
  { value: "truck", label: "Truck (Kamyon)" },
  { value: "shield", label: "Shield (Kalkan)" },
  { value: "refresh", label: "Refresh (Yenile)" },
  { value: "award", label: "Award (Ödül)" },
  { value: "sparkles", label: "Sparkles (Parıltı)" },
  { value: "zap", label: "Zap (Şimşek)" },
  { value: "settings", label: "Settings (Ayar)" },
  { value: "package", label: "Package (Paket)" },
];

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json() as Promise<T>;
}

const FooterAdminPage = () => {
  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h1">Footer Yönetimi</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          Sitenin alt kısmındaki özellik kartlarını, link gruplarını ve şirket
          bilgilerini buradan yönetin.
        </Text>
      </div>
      <Tabs defaultValue="features" className="px-6 pb-6">
        <Tabs.List>
          <Tabs.Trigger value="features">Özellik Kartları</Tabs.Trigger>
          <Tabs.Trigger value="groups">Link Grupları</Tabs.Trigger>
          <Tabs.Trigger value="settings">Genel Ayarlar</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="features" className="pt-4"><FeaturesTab /></Tabs.Content>
        <Tabs.Content value="groups" className="pt-4"><LinkGroupsTab /></Tabs.Content>
        <Tabs.Content value="settings" className="pt-4"><SettingsTab /></Tabs.Content>
      </Tabs>
    </Container>
  );
};

// ============== Features ==============

function FeaturesTab() {
  const [list, setList] = useState<Feature[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Feature | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ features: Feature[] }>("/admin/footer-features");
      setList((data.features || []).sort((a, b) => a.sort_order - b.sort_order));
    } catch (e) { toast.error("Yüklenemedi", { description: String(e) }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(f: Feature) {
    try {
      if (f.id.startsWith("new-")) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...body } = f;
        await api("/admin/footer-features", { method: "POST", body: JSON.stringify(body) });
      } else {
        await api(`/admin/footer-features/${f.id}`, { method: "PATCH", body: JSON.stringify(f) });
      }
      toast.success("Kaydedildi");
      setEditing(null); setCreating(false); await load();
    } catch (e) { toast.error("Hata", { description: String(e) }); }
  }
  async function remove(id: string) {
    if (!confirm("Silmek istediğinize emin misiniz?")) return;
    try {
      await api(`/admin/footer-features/${id}`, { method: "DELETE" });
      toast.success("Silindi"); await load();
    } catch (e) { toast.error("Silinemedi", { description: String(e) }); }
  }
  async function move(f: Feature, dir: -1 | 1) {
    const swap = list.find((x) => x.sort_order === f.sort_order + dir);
    try {
      await api(`/admin/footer-features/${f.id}`, {
        method: "PATCH", body: JSON.stringify({ sort_order: f.sort_order + dir }),
      });
      if (swap) {
        await api(`/admin/footer-features/${swap.id}`, {
          method: "PATCH", body: JSON.stringify({ sort_order: f.sort_order }),
        });
      }
      await load();
    } catch (e) { toast.error("Sıra hatası", { description: String(e) }); }
  }
  async function toggle(f: Feature) {
    await api(`/admin/footer-features/${f.id}`, {
      method: "PATCH", body: JSON.stringify({ is_active: !f.is_active }),
    });
    await load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Heading level="h3">Özellik Kartları ({list.length})</Heading>
        <Button variant="primary" size="small" onClick={() => setCreating(true)}>
          <Plus /> <span>Yeni Kart</span>
        </Button>
      </div>
      {loading ? <Text className="text-ui-fg-subtle">Yükleniyor...</Text> : (
        <div className="space-y-3">
          {list.map((f, idx) => (
            <div key={f.id} className="flex items-start gap-4 p-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge size="2xsmall" color={f.is_active ? "green" : "grey"}>{f.is_active ? "Aktif" : "Pasif"}</Badge>
                  <Badge size="2xsmall">#{f.sort_order}</Badge>
                  <Text size="xsmall" className="text-ui-fg-subtle">{f.icon}</Text>
                </div>
                <Heading level="h3" className="truncate">{f.title}</Heading>
                <Text size="small" className="text-ui-fg-subtle line-clamp-2">{f.description}</Text>
              </div>
              <div className="flex flex-col gap-1 shrink-0">
                <div className="flex gap-1">
                  <Button size="small" variant="transparent" onClick={() => move(f, -1)} disabled={idx === 0}><ChevronUpMini /></Button>
                  <Button size="small" variant="transparent" onClick={() => move(f, 1)} disabled={idx === list.length - 1}><ChevronDownMini /></Button>
                </div>
                <Switch checked={f.is_active} onCheckedChange={() => toggle(f)} />
                <div className="flex gap-1">
                  <Button size="small" variant="secondary" onClick={() => setEditing(f)}><PencilSquare /></Button>
                  <Button size="small" variant="danger" onClick={() => remove(f.id)}><Trash /></Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {(editing || creating) && (
        <FeatureForm
          initial={editing || {
            id: "new-" + Date.now(), icon: "truck", title: "", description: "",
            sort_order: list.length, is_active: true,
          }}
          onSave={save}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
}

function FeatureForm({ initial, onSave, onClose }: {
  initial: Feature; onSave: (f: Feature) => Promise<void>; onClose: () => void;
}) {
  const [f, setF] = useState<Feature>(initial);
  const [saving, setSaving] = useState(false);
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{initial.id.startsWith("new-") ? "Yeni Özellik" : "Düzenle"}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto space-y-4">
          <div>
            <Label>İkon</Label>
            <Select value={f.icon} onValueChange={(v) => setF({ ...f, icon: v })}>
              <Select.Trigger><Select.Value /></Select.Trigger>
              <Select.Content>
                {ICON_OPTIONS.map((i) => <Select.Item key={i.value} value={i.value}>{i.label}</Select.Item>)}
              </Select.Content>
            </Select>
          </div>
          <div><Label>Başlık</Label><Input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} /></div>
          <div><Label>Açıklama</Label><Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Sıra</Label><Input type="number" min={0} value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: parseInt(e.target.value) || 0 })} /></div>
            <div className="flex items-end gap-2 pb-2">
              <Switch checked={f.is_active} onCheckedChange={(v) => setF({ ...f, is_active: v })} />
              <Label>Aktif</Label>
            </div>
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild><Button variant="secondary">İptal</Button></Drawer.Close>
          <Button variant="primary" isLoading={saving} onClick={async () => { setSaving(true); try { await onSave(f); } finally { setSaving(false); } }}>
            Kaydet
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

// ============== Link Groups ==============

function LinkGroupsTab() {
  const [list, setList] = useState<LinkGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<LinkGroup | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api<{ link_groups: LinkGroup[] }>("/admin/footer-link-groups");
      setList((data.link_groups || []).sort((a, b) => a.sort_order - b.sort_order));
    } catch (e) { toast.error("Yüklenemedi", { description: String(e) }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  async function save(g: LinkGroup) {
    try {
      if (g.id.startsWith("new-")) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...body } = g;
        await api("/admin/footer-link-groups", { method: "POST", body: JSON.stringify(body) });
      } else {
        await api(`/admin/footer-link-groups/${g.id}`, { method: "PATCH", body: JSON.stringify(g) });
      }
      toast.success("Kaydedildi");
      setEditing(null); setCreating(false); await load();
    } catch (e) { toast.error("Hata", { description: String(e) }); }
  }
  async function remove(id: string) {
    if (!confirm("Bu grubu silmek istediğinize emin misiniz?")) return;
    try {
      await api(`/admin/footer-link-groups/${id}`, { method: "DELETE" });
      toast.success("Silindi"); await load();
    } catch (e) { toast.error("Silinemedi", { description: String(e) }); }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <Heading level="h3">Link Grupları ({list.length})</Heading>
        <Button variant="primary" size="small" onClick={() => setCreating(true)}>
          <Plus /> <span>Yeni Grup</span>
        </Button>
      </div>
      {loading ? <Text className="text-ui-fg-subtle">Yükleniyor...</Text> : (
        <div className="space-y-3">
          {list.map((g) => (
            <div key={g.id} className="p-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle">
              <div className="flex items-start justify-between mb-2">
                <Heading level="h3">
                  {g.title} <Text size="xsmall" className="inline text-ui-fg-subtle">({g.links?.length || 0} link)</Text>
                </Heading>
                <div className="flex gap-1">
                  <Button size="small" variant="secondary" onClick={() => setEditing(g)}><PencilSquare /></Button>
                  <Button size="small" variant="danger" onClick={() => remove(g.id)}><Trash /></Button>
                </div>
              </div>
              <ul>
                {(g.links || []).map((l, i) => (
                  <li key={i}><Text size="xsmall" className="text-ui-fg-subtle">→ {l.label} ({l.href})</Text></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
      {(editing || creating) && (
        <LinkGroupForm
          initial={editing || { id: "new-" + Date.now(), title: "", links: [], sort_order: list.length, is_active: true }}
          onSave={save}
          onClose={() => { setEditing(null); setCreating(false); }}
        />
      )}
    </div>
  );
}

function LinkGroupForm({ initial, onSave, onClose }: {
  initial: LinkGroup; onSave: (g: LinkGroup) => Promise<void>; onClose: () => void;
}) {
  const [g, setG] = useState<LinkGroup>(initial);
  const [saving, setSaving] = useState(false);
  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{initial.id.startsWith("new-") ? "Yeni Link Grubu" : "Düzenle"}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto space-y-4">
          <div><Label>Başlık</Label><Input value={g.title} onChange={(e) => setG({ ...g, title: e.target.value })} /></div>
          <div className="space-y-2">
            <Label>Linkler</Label>
            {g.links.map((l, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Görünen ad" value={l.label} onChange={(e) => {
                  const next = [...g.links]; next[i] = { ...next[i], label: e.target.value }; setG({ ...g, links: next });
                }} />
                <Input placeholder="/url" value={l.href} onChange={(e) => {
                  const next = [...g.links]; next[i] = { ...next[i], href: e.target.value }; setG({ ...g, links: next });
                }} />
                <Button size="small" variant="danger" onClick={() => setG({ ...g, links: g.links.filter((_, x) => x !== i) })}><Trash /></Button>
              </div>
            ))}
            <Button size="small" variant="secondary" onClick={() => setG({ ...g, links: [...g.links, { label: "", href: "" }] })}>
              + Link Ekle
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Sıra</Label><Input type="number" min={0} value={g.sort_order} onChange={(e) => setG({ ...g, sort_order: parseInt(e.target.value) || 0 })} /></div>
            <div className="flex items-end gap-2 pb-2">
              <Switch checked={g.is_active} onCheckedChange={(v) => setG({ ...g, is_active: v })} />
              <Label>Aktif</Label>
            </div>
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Drawer.Close asChild><Button variant="secondary">İptal</Button></Drawer.Close>
          <Button variant="primary" isLoading={saving} onClick={async () => { setSaving(true); try { await onSave(g); } finally { setSaving(false); } }}>
            Kaydet
          </Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}

// ============== Settings ==============

function SettingsTab() {
  const [s, setS] = useState<Settings>({
    company_description: "", contact_phone: "", contact_email: "", contact_address: "",
    copyright_text: "", legal_links: [],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ settings: Settings | null }>("/admin/footer-settings");
        if (data.settings) setS({ ...data.settings, legal_links: data.settings.legal_links || [] });
      } catch (e) { toast.error("Yüklenemedi", { description: String(e) }); }
      finally { setLoading(false); }
    })();
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api("/admin/footer-settings", { method: "PATCH", body: JSON.stringify(s) });
      toast.success("Ayarlar kaydedildi");
    } catch (e) { toast.error("Hata", { description: String(e) }); }
    finally { setSaving(false); }
  }

  if (loading) return <Text className="text-ui-fg-subtle">Yükleniyor...</Text>;

  return (
    <div className="space-y-4">
      <div><Label>Şirket Açıklaması</Label><Textarea rows={4} value={s.company_description} onChange={(e) => setS({ ...s, company_description: e.target.value })} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Telefon</Label><Input value={s.contact_phone || ""} onChange={(e) => setS({ ...s, contact_phone: e.target.value || null })} /></div>
        <div><Label>E-Posta</Label><Input type="email" value={s.contact_email || ""} onChange={(e) => setS({ ...s, contact_email: e.target.value || null })} /></div>
      </div>
      <div><Label>Adres</Label><Textarea rows={2} value={s.contact_address || ""} onChange={(e) => setS({ ...s, contact_address: e.target.value || null })} /></div>
      <div>
        <Label>Copyright Metni</Label>
        <Input value={s.copyright_text || ""} onChange={(e) => setS({ ...s, copyright_text: e.target.value || null })} placeholder="© {year} Şirket. Tüm hakları saklıdır." />
        <Text size="xsmall" className="text-ui-fg-subtle mt-1">{"{year}"} otomatik mevcut yıla dönüşür.</Text>
      </div>
      <div className="space-y-2">
        <Label>Yasal Linkler</Label>
        {s.legal_links.map((l, i) => (
          <div key={i} className="flex gap-2">
            <Input placeholder="Görünen ad" value={l.label} onChange={(e) => {
              const next = [...s.legal_links]; next[i] = { ...next[i], label: e.target.value }; setS({ ...s, legal_links: next });
            }} />
            <Input placeholder="/url (opsiyonel)" value={l.href || ""} onChange={(e) => {
              const next = [...s.legal_links]; next[i] = { ...next[i], href: e.target.value }; setS({ ...s, legal_links: next });
            }} />
            <Button size="small" variant="danger" onClick={() => setS({ ...s, legal_links: s.legal_links.filter((_, x) => x !== i) })}><Trash /></Button>
          </div>
        ))}
        <Button size="small" variant="secondary" onClick={() => setS({ ...s, legal_links: [...s.legal_links, { label: "", href: "" }] })}>
          + Link Ekle
        </Button>
      </div>
      <div className="pt-4 border-t border-ui-border-base">
        <Button variant="primary" isLoading={saving} onClick={save}>Ayarları Kaydet</Button>
      </div>
    </div>
  );
}

export const config = defineRouteConfig({
  label: "Footer",
  icon: LayoutBottom,
});

export default FooterAdminPage;
