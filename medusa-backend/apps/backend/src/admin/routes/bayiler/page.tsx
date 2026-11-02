import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Buildings, Plus, Trash } from "@medusajs/icons";
import {
  Container, Heading, Text, Button, Input, Label, Switch, Select,
  Badge, Drawer, Table, toast, usePrompt,
} from "@medusajs/ui";
import { useEffect, useMemo, useState } from "react";

interface Customer {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  has_account?: boolean;
}

interface Dealer {
  id: string;
  customer_id: string;
  company_name: string;
  is_active: boolean;
  note?: string | null;
  customer?: Customer | null;
}

interface BladeRow {
  blade_price_id: string;
  blade_type: string;
  width_mm: number;
  thickness_mm: number;
  tooth_pitch: string | null;
  list_price_per_meter: number;
  list_welding_fee: number;
  price_per_meter: number | null;
  welding_fee: number | null;
}

interface VariantRow {
  variant_id: string;
  product_title: string;
  variant_title: string | null;
  sku: string | null;
  is_ready_made: boolean;
  list_amount: number | null;
  amount: number | null;
}

/** Matris satırı ve ürün varyantı tek tabloda aynı biçimde gösterilir. */
interface Row {
  key: string;
  kind: "blade" | "variant";
  group: string;
  title: string;
  detail: string;
  list: number | null;
  listWeld: number | null;
  saved: string;
  savedWeld: string;
}

type Edit = { main: string; weld: string };

const BLADE_TYPES = [
  { value: "bi-metal", label: "Bi-Metal" },
  { value: "carbide", label: "Karbür Uçlu" },
  { value: "woodcut", label: "Ahşap — Uddeholm" },
  { value: "spezialstahl", label: "Ahşap — Spezialstahl Alman Çeliği" },
  { value: "meat-bone", label: "Et ve Kemik" },
  { value: "textile", label: "Sünger / Tekstil" },
];
const READY = "ready";
const OTHER = "other";
const GROUPS = [
  ...BLADE_TYPES,
  { value: READY, label: "Hazır Boy" },
  { value: OTHER, label: "Makine ve Diğer" },
];
const ALL = "all";
const PAGE_SIZE = 100;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    let nice = text || `${res.status}`;
    try {
      nice = (JSON.parse(text) as { message?: string }).message || nice;
    } catch {
      /* düz metin */
    }
    throw new Error(nice);
  }
  return res.json() as Promise<T>;
}

/** "." veya "," ondalıklı girişi okur; boş ya da sayısal değilse NaN. */
function parseDecimal(raw: string): number {
  const cleaned = String(raw).replace(",", ".").trim();
  return cleaned === "" ? NaN : Number(cleaned);
}

const fmt = (n: number | null) =>
  n === null
    ? "—"
    : n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toInput = (n: number | null) => (n === null ? "" : String(n));
const round2 = (n: number) => Math.round(n * 100) / 100;

function toRows(blade: BladeRow[], variants: VariantRow[]): Row[] {
  const order = (g: string) => GROUPS.findIndex((x) => x.value === g);
  const bladeRows: Row[] = blade.map((b) => ({
    key: `blade:${b.blade_price_id}`,
    kind: "blade",
    group: b.blade_type,
    title: BLADE_TYPES.find((t) => t.value === b.blade_type)?.label || b.blade_type,
    detail: `${b.width_mm} × ${b.thickness_mm} mm${b.tooth_pitch ? ` · ${b.tooth_pitch} TPI` : ""}`,
    list: b.list_price_per_meter,
    listWeld: b.list_welding_fee,
    saved: toInput(b.price_per_meter),
    savedWeld: toInput(b.welding_fee),
  }));
  const variantRows: Row[] = variants.map((v) => ({
    key: `variant:${v.variant_id}`,
    kind: "variant",
    group: v.is_ready_made ? READY : OTHER,
    title: v.product_title,
    detail: [v.variant_title, v.sku].filter((x) => x && x !== "Default").join(" · "),
    list: v.list_amount,
    listWeld: null,
    saved: toInput(v.amount),
    savedWeld: "",
  }));
  return [...bladeRows, ...variantRows].sort(
    (a, b) =>
      order(a.group) - order(b.group) ||
      a.title.localeCompare(b.title, "tr") ||
      a.detail.localeCompare(b.detail, "tr", { numeric: true })
  );
}

export default function DealersPage() {
  const prompt = usePrompt();
  const [dealers, setDealers] = useState<Dealer[]>([]);
  const [dealerId, setDealerId] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [edits, setEdits] = useState<Record<string, Edit>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [groupFilter, setGroupFilter] = useState<string>(ALL);
  const [search, setSearch] = useState("");
  const [onlyPriced, setOnlyPriced] = useState(false);
  const [page, setPage] = useState(0);
  const [percent, setPercent] = useState("");

  const [newOpen, setNewOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [picked, setPicked] = useState<Customer | null>(null);
  const [company, setCompany] = useState("");
  const [note, setNote] = useState("");
  const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);

  const dealer = dealers.find((d) => d.id === dealerId) ?? null;

  async function loadDealers(selectId?: string) {
    const data = await api<{ dealers: Dealer[] }>("/admin/dealers");
    setDealers(data.dealers);
    setDealerId((cur) => selectId ?? (cur || data.dealers[0]?.id || ""));
  }

  async function loadPrices(id: string) {
    setLoading(true);
    try {
      const data = await api<{ blade: BladeRow[]; variants: VariantRow[] }>(
        `/admin/dealers/${id}/prices`
      );
      setRows(toRows(data.blade, data.variants));
      setEdits({});
    } catch (e) {
      toast.error("Fiyatlar yüklenemedi", { description: String(e) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDealers()
      .catch((e) => toast.error("Bayiler yüklenemedi", { description: String(e) }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (dealerId) loadPrices(dealerId);
    else setRows([]);
  }, [dealerId]);

  // Kayıtlı müşteri arama (yalnız şifreli hesaplar bayi olabilir)
  useEffect(() => {
    const q = query.trim();
    if (!newOpen || q.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      try {
        const data = await api<{ customers: Customer[] }>(
          `/admin/customers?q=${encodeURIComponent(q)}&limit=10&fields=id,email,first_name,last_name,company_name,has_account`
        );
        const taken = new Set(dealers.map((d) => d.customer?.email?.toLowerCase()));
        // Aynı e-postanın şifreli ve şifresiz iki kaydı olabilir; bayilik şifreli olana bağlanır.
        const withAccount = new Set(data.customers.filter((c) => c.has_account).map((c) => c.email));
        const found = data.customers.filter(
          (c) =>
            !taken.has(c.email.toLowerCase()) && (c.has_account || !withAccount.has(c.email))
        );
        setResults(found);
        // E-posta tam yazıldıysa ayrıca listeden seçmek gerekmesin.
        const exact = found.find((c) => c.email.toLowerCase() === q.toLowerCase());
        if (exact) pickCustomer(exact);
      } catch (e) {
        toast.error("Müşteri aranamadı", { description: String(e) });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, newOpen, dealers]);

  function pickCustomer(c: Customer) {
    setPicked(c);
    setQuery(c.email);
    setCompany((cur) => cur || c.company_name || "");
  }

  const value = (r: Row): Edit => edits[r.key] ?? { main: r.saved, weld: r.savedWeld };

  const filtered = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("tr");
    return rows.filter((r) => {
      if (groupFilter !== ALL && r.group !== groupFilter) return false;
      if (q && !`${r.title} ${r.detail}`.toLocaleLowerCase("tr").includes(q)) return false;
      if (onlyPriced) {
        const v = edits[r.key] ?? { main: r.saved, weld: r.savedWeld };
        if (!v.main && !v.weld) return false;
      }
      return true;
    });
  }, [rows, groupFilter, search, onlyPriced, edits]);

  useEffect(() => setPage(0), [groupFilter, search, onlyPriced, dealerId]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visible = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const dirty = useMemo(
    () =>
      rows.filter((r) => {
        const e = edits[r.key];
        return e && (e.main.trim() !== r.saved || e.weld.trim() !== r.savedWeld);
      }),
    [rows, edits]
  );
  const pricedCount = useMemo(() => rows.filter((r) => r.saved || r.savedWeld).length, [rows]);

  function setCell(r: Row, patch: Partial<Edit>) {
    setEdits((prev) => ({ ...prev, [r.key]: { ...value(r), ...prev[r.key], ...patch } }));
  }

  function applyPercent() {
    const p = parseDecimal(percent);
    if (!Number.isFinite(p) || p <= 0 || p >= 100) {
      toast.error("İndirim oranı 0 ile 100 arasında olmalı");
      return;
    }
    const targets = filtered.filter((r) => r.list !== null && r.list > 0);
    setEdits((prev) => {
      const next = { ...prev };
      for (const r of targets) {
        const current = prev[r.key] ?? { main: r.saved, weld: r.savedWeld };
        next[r.key] = { ...current, main: String(round2((r.list as number) * (1 - p / 100))) };
      }
      return next;
    });
    toast.info(`${targets.length} satıra %${p} indirimli fiyat yazıldı`, {
      description: "Kaydetmeden müşteriye yansımaz.",
    });
  }

  function clearFiltered() {
    setEdits((prev) => {
      const next = { ...prev };
      for (const r of filtered) next[r.key] = { main: "", weld: "" };
      return next;
    });
  }

  async function save() {
    if (!dealer || !dirty.length) return;
    const blade: { blade_price_id: string; price_per_meter: number | null; welding_fee: number | null }[] = [];
    const variants: { variant_id: string; amount: number | null }[] = [];
    for (const r of dirty) {
      const e = edits[r.key];
      const main = e.main.trim() === "" ? null : parseDecimal(e.main);
      const weld = e.weld.trim() === "" ? null : parseDecimal(e.weld);
      const label = `${r.title} ${r.detail}`.trim();
      if (main !== null && (!Number.isFinite(main) || main <= 0)) {
        toast.error("Geçersiz fiyat", { description: `${label}: fiyat 0'dan büyük bir sayı olmalı.` });
        return;
      }
      if (weld !== null && (!Number.isFinite(weld) || weld < 0)) {
        toast.error("Geçersiz kaynak ücreti", { description: label });
        return;
      }
      const id = r.key.slice(r.key.indexOf(":") + 1);
      if (r.kind === "blade") {
        blade.push({ blade_price_id: id, price_per_meter: main, welding_fee: weld });
      } else {
        variants.push({ variant_id: id, amount: main });
      }
    }
    setSaving(true);
    try {
      await api(`/admin/dealers/${dealer.id}/prices`, {
        method: "POST",
        body: JSON.stringify({ blade, variants }),
      });
      toast.success(`${dealer.company_name}: ${dirty.length} fiyat kaydedildi`);
      await loadPrices(dealer.id);
    } catch (e) {
      toast.error("Kaydedilemedi", { description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function switchDealer(id: string) {
    if (id === dealerId) return;
    if (dirty.length) {
      const ok = await prompt({
        title: "Kaydedilmemiş fiyatlar var",
        description: `${dirty.length} değişiklik kaybolacak. Devam edilsin mi?`,
        confirmText: "Devam et",
        cancelText: "Vazgeç",
      });
      if (!ok) return;
    }
    setDealerId(id);
  }

  async function createDealer() {
    if (!picked) {
      toast.error("Müşteri seçilmedi", {
        description: "E-postayı veya adı yazıp çıkan listeden müşteriye tıklayın.",
      });
      return;
    }
    if (!company.trim()) {
      toast.error("Firma adı girin");
      return;
    }
    setSaving(true);
    try {
      const { dealer: created, temp_password } = await api<{
        dealer: Dealer;
        temp_password?: string;
      }>("/admin/dealers", {
        method: "POST",
        body: JSON.stringify({
          customer_id: picked.id,
          company_name: company.trim(),
          note: note.trim() || null,
        }),
      });
      toast.success(`${created.company_name} bayi olarak eklendi`);
      if (temp_password) setIssued({ email: picked.email, password: temp_password });
      else setNewOpen(false);
      setPicked(null);
      setCompany("");
      setNote("");
      setQuery("");
      await loadDealers(created.id);
    } catch (e) {
      toast.error("Bayi eklenemedi", { description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(next: boolean) {
    if (!dealer) return;
    try {
      await api(`/admin/dealers/${dealer.id}`, {
        method: "POST",
        body: JSON.stringify({ is_active: next }),
      });
      toast.success(next ? "Bayi aktif" : "Bayi pasif: genel fiyatları görecek");
      await loadDealers(dealer.id);
    } catch (e) {
      toast.error("Değiştirilemedi", { description: String(e) });
    }
  }

  async function removeDealer() {
    if (!dealer) return;
    const ok = await prompt({
      title: `${dealer.company_name} silinsin mi?`,
      description:
        "Bayilik ve tüm özel fiyatları silinir, müşteri genel fiyatları görür. Müşteri hesabı ve geçmiş siparişleri kalır.",
      confirmText: "Sil",
      cancelText: "Vazgeç",
    });
    if (!ok) return;
    try {
      await api(`/admin/dealers/${dealer.id}`, { method: "DELETE" });
      toast.success("Bayi silindi");
      setDealerId("");
      setDealers((list) => list.filter((d) => d.id !== dealer.id));
      const rest = dealers.filter((d) => d.id !== dealer.id);
      setDealerId(rest[0]?.id ?? "");
    } catch (e) {
      toast.error("Silinemedi", { description: String(e) });
    }
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-start justify-between gap-4 px-6 py-4">
        <div>
          <Heading>Bayiler ve Fiyat Listesi</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Tüm ürünler burada listelenir. Bayi fiyatı girilen ürün o bayiye bu fiyattan satılır;
            boş bırakılan ürün genel fiyattan satılır.
          </Text>
        </div>
        <Button
          size="small"
          variant="secondary"
          onClick={() => {
            setPicked(null);
            setQuery("");
            setIssued(null);
            setNewOpen(true);
          }}
        >
          <Plus /> Yeni Bayi
        </Button>
      </div>

      {dealers.length === 0 && !loading ? (
        <div className="px-6 py-10 text-center">
          <Text className="text-ui-fg-subtle">
            Henüz bayi yok. “Yeni Bayi” ile bir müşteriyi bayi yapın.
          </Text>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4 px-6 py-4">
            <div className="w-[28rem]">
              <Label size="small">Bayi</Label>
              <Select value={dealerId} onValueChange={switchDealer}>
                <Select.Trigger>
                  <Select.Value placeholder="Bayi seçin" />
                </Select.Trigger>
                <Select.Content>
                  {dealers.map((d) => (
                    <Select.Item key={d.id} value={d.id}>
                      {d.company_name}
                      {d.customer?.email ? ` · ${d.customer.email}` : ""}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            {dealer && (
              <>
                <div>
                  <Text size="small" weight="plus">{dealer.customer?.email ?? "—"}</Text>
                  <Text size="xsmall" className="text-ui-fg-subtle">
                    {pricedCount} üründe özel fiyat{dealer.note ? ` · ${dealer.note}` : ""}
                  </Text>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={dealer.is_active} onCheckedChange={toggleActive} />
                  <Badge size="2xsmall" color={dealer.is_active ? "green" : "grey"}>
                    {dealer.is_active ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
                <Button size="small" variant="transparent" onClick={removeDealer}>
                  <Trash /> Bayiyi sil
                </Button>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-3 px-6 py-4">
            <div className="w-64">
              <Label size="small">Ürün grubu</Label>
              <Select value={groupFilter} onValueChange={setGroupFilter}>
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value={ALL}>Tüm Ürünler</Select.Item>
                  {GROUPS.map((g) => (
                    <Select.Item key={g.value} value={g.value}>
                      {g.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="w-64">
              <Label size="small">Ara</Label>
              <Input
                placeholder="Ürün, ölçü, SKU"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={onlyPriced} onCheckedChange={setOnlyPriced} />
              <Label size="small">Yalnız bayi fiyatlılar</Label>
            </div>
            <div className="ml-auto flex items-end gap-2">
              <div className="w-24">
                <Label size="small">İndirim %</Label>
                <Input placeholder="20" value={percent} onChange={(e) => setPercent(e.target.value)} />
              </div>
              <Button size="small" variant="secondary" onClick={applyPercent}>
                {filtered.length} satıra uygula
              </Button>
              <Button size="small" variant="transparent" onClick={clearFiltered}>
                Temizle
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <Table.Header>
                <Table.Row>
                  <Table.HeaderCell>Ürün</Table.HeaderCell>
                  <Table.HeaderCell>Ölçü / Varyant</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Genel Fiyat</Table.HeaderCell>
                  <Table.HeaderCell>Bayi Fiyatı</Table.HeaderCell>
                  <Table.HeaderCell className="text-right">Genel Kaynak</Table.HeaderCell>
                  <Table.HeaderCell>Bayi Kaynak</Table.HeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {loading ? (
                  <Table.Row>
                    <td colSpan={6} className="py-6 text-center">Yükleniyor…</td>
                  </Table.Row>
                ) : visible.length === 0 ? (
                  <Table.Row>
                    <td colSpan={6} className="py-6 text-center">Satır bulunamadı.</td>
                  </Table.Row>
                ) : (
                  visible.map((r) => {
                    const v = value(r);
                    return (
                      <Table.Row key={r.key}>
                        <Table.Cell className="max-w-[280px] truncate" title={r.title}>
                          {r.title}
                        </Table.Cell>
                        <Table.Cell>{r.detail || "—"}</Table.Cell>
                        <Table.Cell className="text-right">
                          {fmt(r.list)}
                          {r.kind === "blade" ? " /m" : ""}
                        </Table.Cell>
                        <Table.Cell>
                          <div className="w-28 py-1">
                            <Input
                              size="small"
                              aria-label={`${r.title} ${r.detail} bayi fiyatı`}
                              placeholder={fmt(r.list)}
                              value={v.main}
                              onChange={(e) => setCell(r, { main: e.target.value })}
                            />
                          </div>
                        </Table.Cell>
                        <Table.Cell className="text-right">
                          {r.kind === "blade" ? fmt(r.listWeld) : ""}
                        </Table.Cell>
                        <Table.Cell>
                          {r.kind === "blade" && (
                            <div className="w-24 py-1">
                              <Input
                                size="small"
                                aria-label={`${r.title} ${r.detail} bayi kaynak ücreti`}
                                placeholder={fmt(r.listWeld)}
                                value={v.weld}
                                onChange={(e) => setCell(r, { weld: e.target.value })}
                              />
                            </div>
                          )}
                        </Table.Cell>
                      </Table.Row>
                    );
                  })
                )}
              </Table.Body>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
            <Text size="small" className="text-ui-fg-subtle">
              {filtered.length} satır · Sayfa {page + 1}/{pageCount}. Bıçak fiyatları metre başınadır
              ve genel fiyatla aynı KDV esasıyla girilir. Bayi fiyatlı bıçağa adet indirimi uygulanmaz.
            </Text>
            <div className="flex items-center gap-2">
              <Button
                size="small"
                variant="secondary"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Önceki
              </Button>
              <Button
                size="small"
                variant="secondary"
                disabled={page + 1 >= pageCount}
                onClick={() => setPage((p) => p + 1)}
              >
                Sonraki
              </Button>
              <Button size="small" onClick={save} disabled={!dirty.length || saving} isLoading={saving}>
                {dirty.length ? `${dirty.length} değişikliği kaydet` : "Kaydet"}
              </Button>
            </div>
          </div>
        </>
      )}

      <Drawer open={newOpen} onOpenChange={setNewOpen}>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Yeni Bayi</Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="flex flex-col gap-4 p-4">
            {issued ? (
              <div className="flex flex-col gap-3">
                <Text weight="plus">Bayi eklendi, giriş hesabı açıldı</Text>
                <Text size="small" className="text-ui-fg-subtle">
                  Bu bilgileri müşteriye iletin. Şifre bir daha gösterilmez; müşteri ilk girişte
                  kendi şifresini belirler.
                </Text>
                <div className="rounded-md border p-3">
                  <Text size="small">E-posta: {issued.email}</Text>
                  <Text size="small" weight="plus">Geçici şifre: {issued.password}</Text>
                </div>
              </div>
            ) : (
            <>
            <div>
              <Label size="small">Müşteri</Label>
              <Input
                placeholder="E-posta veya ad yazın"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPicked(null);
                }}
              />
              {!picked && results.length > 0 && (
                <div className="mt-2 flex flex-col divide-y rounded-md border">
                  {results.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="px-3 py-2 text-left hover:bg-ui-bg-base-hover"
                      onClick={() => pickCustomer(c)}
                    >
                      <Text size="small" weight="plus">{c.email}</Text>
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        {[c.first_name, c.last_name].filter(Boolean).join(" ") || "—"}
                        {c.has_account ? "" : " · Giriş hesabı yok, açılacak"}
                      </Text>
                    </button>
                  ))}
                </div>
              )}
              {!picked && query.trim().length >= 2 && results.length === 0 && (
                <Text size="xsmall" className="mt-2 text-ui-fg-subtle">
                  Müşteri bulunamadı ya da zaten bayi. Önce Müşteriler sayfasından ekleyin.
                </Text>
              )}
              {picked && (
                <Text size="xsmall" className="mt-2 text-ui-fg-subtle">
                  Seçildi: {picked.email}
                  {picked.has_account
                    ? ""
                    : ". Giriş hesabı açılacak, geçici şifre size gösterilecek."}
                </Text>
              )}
            </div>
            <div>
              <Label size="small">Firma adı</Label>
              <Input value={company} onChange={(e) => setCompany(e.target.value)} />
            </div>
            <div>
              <Label size="small">Not (isteğe bağlı)</Label>
              <Input value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            </>
            )}
          </Drawer.Body>
          <Drawer.Footer>
            <Button size="small" variant="secondary" onClick={() => setNewOpen(false)}>
              {issued ? "Kapat" : "Vazgeç"}
            </Button>
            {!issued && (
              <Button size="small" onClick={createDealer} disabled={saving} isLoading={saving}>
                Bayi Ekle
              </Button>
            )}
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
    </Container>
  );
}

export const config = defineRouteConfig({
  label: "Bayiler",
  icon: Buildings,
});
