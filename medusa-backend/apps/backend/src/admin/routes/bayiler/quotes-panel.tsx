import { Trash } from "@medusajs/icons";
import { Badge, Button, Heading, Input, Label, Select, Table, Text, Textarea, toast, usePrompt } from "@medusajs/ui";
import { useEffect, useMemo, useState } from "react";

export interface QuoteProduct {
  key: string;
  kind: "blade" | "variant";
  group: string;
  title: string;
  detail: string;
  /** Teklifte bu ürün bayi fiyatıyla mı çıkacak (bilgi amaçlı). */
  dealerPriced: boolean;
}

/** Ölçüye göre satılan ürün; aynı matrisi birden çok ürün kullanabilir (M42/M51). */
export interface BladeProduct {
  blade_type: string;
  variant_id: string;
  title: string;
}

interface QuoteItem {
  id: string;
  kind: "blade" | "variant";
  ref_id: string;
  variant_id: string | null;
  requested_unit_price: number | null;
  title: string;
  detail: string | null;
  length_mm: number | null;
  quantity: number;
  unit_price: number;
}

interface Quote {
  id: string;
  number: string;
  status: "draft" | "sent" | "revision_requested" | "accepted" | "ordered";
  note: string | null;
  revision_note: string | null;
  created_at: string;
  sent_at: string | null;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  total: number;
}

const STATUS: Record<Quote["status"], { label: string; color: "grey" | "blue" | "orange" | "green" | "purple" }> = {
  draft: { label: "Taslak", color: "grey" },
  sent: { label: "Gönderildi", color: "blue" },
  revision_requested: { label: "Revize istendi", color: "orange" },
  accepted: { label: "Kabul edildi", color: "green" },
  ordered: { label: "Sipariş verildi", color: "purple" },
};

/** "." veya "," ondalıklı girişi okur; boş ya da sayısal değilse NaN. */
const parseDecimal = (raw: string) => {
  const cleaned = raw.replace(",", ".").trim();
  return cleaned === "" ? NaN : Number(cleaned);
};

type DraftItem = {
  key: string;
  variantId: string | null;
  kind: "blade" | "variant";
  title: string;
  detail: string;
  length: string;
  quantity: string;
};

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

const money = (n: number) =>
  `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;

const refId = (key: string) => key.slice(key.indexOf(":") + 1);

export default function QuotesPanel({
  dealerId,
  products,
  groups,
  bladeProducts,
  onQuotesChanged,
}: {
  dealerId: string;
  products: QuoteProduct[];
  groups: { value: string; label: string }[];
  bladeProducts: BladeProduct[];
  onQuotesChanged: () => void;
}) {
  const prompt = usePrompt();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [items, setItems] = useState<DraftItem[]>([]);
  const [note, setNote] = useState("");
  const [group, setGroup] = useState("");
  const [productVariant, setProductVariant] = useState("");
  const [responding, setResponding] = useState<Quote | null>(null);
  const [responsePrices, setResponsePrices] = useState<Record<string, string>>({});
  const [responseNote, setResponseNote] = useState("");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const data = await api<{ quotes: Quote[] }>(`/admin/dealers/${dealerId}/quotes`);
      setQuotes(data.quotes);
    } catch (e) {
      toast.error("Teklifler yüklenemedi", { description: String(e) });
    }
  }

  useEffect(() => {
    setEditing(null);
    setResponding(null);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dealerId]);

  const availableGroups = useMemo(
    () => groups.filter((g) => products.some((p) => p.group === g.value)),
    [groups, products]
  );

  const groupProducts = useMemo(
    () => bladeProducts.filter((p) => p.blade_type === group),
    [bladeProducts, group]
  );
  const isBladeGroup = useMemo(
    () => products.some((p) => p.group === group && p.kind === "blade"),
    [products, group]
  );
  // Aynı matrisi kullanan birden çok ürün varsa (M42/M51) önce hangisi seçilir.
  const bladeProduct =
    groupProducts.length === 1
      ? groupProducts[0]
      : groupProducts.find((p) => p.variant_id === productVariant) ?? null;
  const productMissing = isBladeGroup && !bladeProduct;

  // Grup seçilince o grubun tamamı listelenir; arama yalnız daraltır.
  const results = useMemo(() => {
    const words = search.trim().toLocaleLowerCase("tr").split(/\s+/).filter(Boolean);
    if (!group || productMissing) return [];
    return products.filter((p) => {
      if (p.group !== group) return false;
      const text = `${p.title} ${p.detail}`.toLocaleLowerCase("tr");
      return words.every((w) => text.includes(w));
    });
  }, [products, group, search, productMissing]);

  const addedCount = useMemo(() => {
    const counts = new Map<string, number>();
    for (const it of items) {
      if (it.kind === "blade" && it.variantId !== bladeProduct?.variant_id) continue;
      counts.set(it.key, (counts.get(it.key) ?? 0) + 1);
    }
    return counts;
  }, [items, bladeProduct]);

  function startNew() {
    setEditing("new");
    setItems([]);
    setNote("");
    setResponding(null);
    setGroup("");
    setProductVariant("");
    setSearch("");
  }

  function startEdit(q: Quote) {
    setEditing(q.id);
    setNote(q.note ?? "");
    setResponding(null);
    setGroup("");
    setProductVariant("");
    setSearch("");
    setItems(
      q.items.map((i) => {
        const key = `${i.kind}:${i.ref_id}`;
        const known = products.find((p) => p.key === key);
        return {
          key,
          variantId: i.variant_id,
          kind: i.kind,
          title: i.title,
          detail: known?.detail ?? i.detail ?? "",
          length: i.length_mm ? String(i.length_mm) : "",
          quantity: String(i.quantity),
        };
      })
    );
  }

  function addItem(p: QuoteProduct) {
    setItems((list) => [
      ...list,
      {
        key: p.key,
        variantId: p.kind === "blade" ? bladeProduct?.variant_id ?? null : null,
        kind: p.kind,
        title: p.kind === "blade" ? bladeProduct?.title ?? p.title : p.title,
        detail: p.detail,
        length: "",
        quantity: "1",
      },
    ]);
  }

  const patchItem = (index: number, patch: Partial<DraftItem>) =>
    setItems((list) => list.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  async function saveDraft() {
    if (!items.length) {
      toast.error("En az bir ürün ekleyin");
      return;
    }
    for (const it of items) {
      const label = `${it.title} ${it.detail}`.trim();
      if (it.kind === "blade" && !/^\d+$/.test(it.length.trim())) {
        toast.error("Boy girin", { description: `${label}: boyu mm olarak yazın.` });
        return;
      }
      if (!/^[1-9]\d*$/.test(it.quantity.trim())) {
        toast.error("Adet girin", { description: label });
        return;
      }
    }
    setSaving(true);
    try {
      const body = JSON.stringify({
        note: note.trim() || null,
        items: items.map((it) => ({
          kind: it.kind,
          ref_id: refId(it.key),
          variant_id: it.kind === "blade" ? it.variantId : null,
          length_mm: it.kind === "blade" ? Number(it.length) : null,
          quantity: Number(it.quantity),
        })),
      });
      await api(
        editing === "new"
          ? `/admin/dealers/${dealerId}/quotes`
          : `/admin/dealers/${dealerId}/quotes/${editing}`,
        { method: "POST", body }
      );
      toast.success("Taslak kaydedildi", {
        description: "PDF'e bakıp “Bayiye Gönder” ile gönderebilirsiniz.",
      });
      setEditing(null);
      await load();
    } catch (e) {
      toast.error("Kaydedilemedi", { description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  function startResponse(q: Quote) {
    setEditing(null);
    setResponding(q);
    setResponseNote(q.note ?? "");
    setResponsePrices(
      Object.fromEntries(
        q.items.map((i) => [i.id, String(i.requested_unit_price ?? i.unit_price)])
      )
    );
  }

  async function sendResponse() {
    if (!responding) return;
    const items: { id: string; unit_price: number }[] = [];
    for (const i of responding.items) {
      const price = parseDecimal(responsePrices[i.id] ?? "");
      if (!Number.isFinite(price) || price <= 0) {
        toast.error("Geçersiz fiyat", { description: `${i.title} ${i.detail ?? ""}`.trim() });
        return;
      }
      items.push({ id: i.id, unit_price: price });
    }
    setSaving(true);
    try {
      await api(`/admin/dealers/${dealerId}/quotes/${responding.id}`, {
        method: "POST",
        body: JSON.stringify({ action: "respond", items, note: responseNote.trim() || null }),
      });
      toast.success("Revize yanıtı bayiye gönderildi");
      setResponding(null);
      await load();
      onQuotesChanged();
    } catch (e) {
      toast.error("Gönderilemedi", { description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function send(q: Quote) {
    const ok = await prompt({
      title: `${q.number} bayiye gönderilsin mi?`,
      description:
        "Teklif bayinin hesabında görünür. Fiyatlar güncel listeden yeniden hesaplanır ve gönderildikten sonra değiştirilemez.",
      confirmText: "Gönder",
      cancelText: "Vazgeç",
    });
    if (!ok) return;
    try {
      await api(`/admin/dealers/${dealerId}/quotes/${q.id}`, {
        method: "POST",
        body: JSON.stringify({ action: "send" }),
      });
      toast.success(`${q.number} bayiye gönderildi`);
      await load();
      onQuotesChanged();
    } catch (e) {
      toast.error("Gönderilemedi", { description: String(e) });
    }
  }

  async function remove(q: Quote) {
    const ok = await prompt({
      title: `${q.number} silinsin mi?`,
      description:
        q.status === "sent"
          ? "Teklif bayinin hesabından da kalkar."
          : "Taslak silinir.",
      confirmText: "Sil",
      cancelText: "Vazgeç",
    });
    if (!ok) return;
    try {
      await api(`/admin/dealers/${dealerId}/quotes/${q.id}`, { method: "DELETE" });
      if (responding?.id === q.id) setResponding(null);
      await load();
      onQuotesChanged();
    } catch (e) {
      toast.error("Silinemedi", { description: String(e) });
    }
  }

  async function downloadPdf(q: Quote) {
    try {
      const res = await fetch(`/admin/dealers/${dealerId}/quotes/${q.id}/pdf`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const url = URL.createObjectURL(await res.blob());
      const a = document.createElement("a");
      a.href = url;
      a.download = `${q.number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error("PDF indirilemedi", { description: String(e) });
    }
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Heading level="h2">Teklifler</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Bayinin istediği ölçüleri ve adetleri ekleyin. Fiyatlar bu bayinin fiyat listesinden gelir.
          </Text>
        </div>
        {!editing && (
          <Button size="small" variant="secondary" onClick={startNew}>
            Yeni Teklif
          </Button>
        )}
      </div>

      {editing && (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <div>
            <div className="flex flex-wrap items-end gap-3">
              <div className="w-72">
                <Label size="small">Ürün grubu</Label>
                <Select
                  value={group}
                  onValueChange={(v) => {
                    setGroup(v);
                    setProductVariant("");
                  }}
                >
                  <Select.Trigger aria-label="Teklif ürün grubu">
                    <Select.Value placeholder="Ürün grubu seçin" />
                  </Select.Trigger>
                  <Select.Content>
                    {availableGroups.map((g) => (
                      <Select.Item key={g.value} value={g.value}>
                        {g.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              {groupProducts.length > 1 && (
                <div className="w-80">
                  <Label size="small">Ürün</Label>
                  <Select value={productVariant} onValueChange={setProductVariant}>
                    <Select.Trigger aria-label="Teklif ürünü">
                      <Select.Value placeholder="Hangi ürün?" />
                    </Select.Trigger>
                    <Select.Content>
                      {groupProducts.map((p) => (
                        <Select.Item key={p.variant_id} value={p.variant_id}>
                          {p.title}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                </div>
              )}
              <div className="w-64">
                <Label size="small">Ölçü ara (isteğe bağlı)</Label>
                <Input
                  placeholder="Örn: 27 4/6"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              {results.length > 0 && (
                <Text size="xsmall" className="pb-2 text-ui-fg-subtle">
                  {results.length} ölçü · eklemek için tıklayın
                </Text>
              )}
            </div>
            {results.length > 0 && (
              <div
                role="list"
                aria-label="Eklenebilir ölçüler"
                className="mt-2 flex max-h-80 flex-col divide-y overflow-y-auto rounded-md border"
              >
                {results.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    role="listitem"
                    className="flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-ui-bg-base-hover"
                    onClick={() => addItem(p)}
                  >
                    <Text size="small">
                      {p.kind === "blade" ? p.detail : p.title}
                      {p.kind === "variant" && p.detail ? ` · ${p.detail}` : ""}
                    </Text>
                    <span className="flex shrink-0 items-center gap-1">
                      {addedCount.get(p.key) ? (
                        <Badge size="2xsmall" color="blue">Eklendi × {addedCount.get(p.key)}</Badge>
                      ) : null}
                      {p.dealerPriced && (
                        <Badge size="2xsmall" color="green">Bayi fiyatlı</Badge>
                      )}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {productMissing && groupProducts.length > 1 && (
              <Text size="xsmall" className="mt-2 text-ui-fg-subtle">
                Ölçülerin gelmesi için ürünü seçin.
              </Text>
            )}
            {group && !productMissing && results.length === 0 && (
              <Text size="xsmall" className="mt-2 text-ui-fg-subtle">Ürün bulunamadı.</Text>
            )}
          </div>

          {items.length > 0 && (
            <div className="flex flex-col gap-2">
              {items.map((it, i) => (
                <div key={`${it.key}-${i}`} className="flex flex-wrap items-end gap-3 border-b pb-2">
                  <div className="min-w-[240px] flex-1">
                    <Text size="small" weight="plus">{it.title}</Text>
                    <Text size="xsmall" className="text-ui-fg-subtle">{it.detail || "—"}</Text>
                  </div>
                  {it.kind === "blade" && (
                    <div className="w-28">
                      <Label size="xsmall">Boy (mm)</Label>
                      <Input
                        size="small"
                        aria-label={`${it.title} ${it.detail} boy`}
                        value={it.length}
                        onChange={(e) => patchItem(i, { length: e.target.value })}
                      />
                    </div>
                  )}
                  <div className="w-20">
                    <Label size="xsmall">Adet</Label>
                    <Input
                      size="small"
                      aria-label={`${it.title} ${it.detail} adet`}
                      value={it.quantity}
                      onChange={(e) => patchItem(i, { quantity: e.target.value })}
                    />
                  </div>
                  <Button
                    size="small"
                    variant="transparent"
                    aria-label="Satırı kaldır"
                    onClick={() => setItems((list) => list.filter((_, x) => x !== i))}
                  >
                    <Trash />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <div>
            <Label size="small">Not (PDF'te görünür, isteğe bağlı)</Label>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="small" variant="secondary" onClick={() => setEditing(null)}>Vazgeç</Button>
            <Button size="small" onClick={saveDraft} disabled={saving} isLoading={saving}>
              Taslağı Kaydet
            </Button>
          </div>
        </div>
      )}

      {responding && (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <div>
            <Text weight="plus">{responding.number} için revize yanıtı</Text>
            <Text size="small" className="text-ui-fg-subtle">
              Uygun gördüğünüz fiyatları yazın. Gönderince bayi bu fiyatlarla kabul edebilir; sepette de
              bu fiyatlar geçerli olur.
            </Text>
          </div>
          {responding.revision_note && (
            <div className="rounded-md border p-3">
              <Text size="xsmall" className="text-ui-fg-subtle">Bayinin notu</Text>
              <Text size="small">{responding.revision_note}</Text>
            </div>
          )}
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Ürün</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Adet</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Teklif Fiyatı</Table.HeaderCell>
                <Table.HeaderCell className="text-right">Bayinin İstediği</Table.HeaderCell>
                <Table.HeaderCell>Yeni Fiyat</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {responding.items.map((i) => (
                <Table.Row key={i.id}>
                  <Table.Cell>
                    <div className="py-1">
                      <Text size="small" weight="plus">{i.title}</Text>
                      <Text size="xsmall" className="text-ui-fg-subtle">{i.detail ?? "—"}</Text>
                    </div>
                  </Table.Cell>
                  <Table.Cell className="text-right">{i.quantity}</Table.Cell>
                  <Table.Cell className="text-right">{money(i.unit_price)}</Table.Cell>
                  <Table.Cell className="text-right">
                    {i.requested_unit_price === null ? "—" : money(i.requested_unit_price)}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="w-28 py-1">
                      <Input
                        size="small"
                        aria-label={`${i.title} ${i.detail ?? ""} yeni fiyat`}
                        value={responsePrices[i.id] ?? ""}
                        onChange={(e) =>
                          setResponsePrices((prev) => ({ ...prev, [i.id]: e.target.value }))
                        }
                      />
                    </div>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
          <div>
            <Label size="small">Not (PDF'te görünür, isteğe bağlı)</Label>
            <Textarea value={responseNote} onChange={(e) => setResponseNote(e.target.value)} />
          </div>
          <div className="flex justify-end gap-2">
            <Button size="small" variant="secondary" onClick={() => setResponding(null)}>Vazgeç</Button>
            <Button size="small" onClick={sendResponse} disabled={saving} isLoading={saving}>
              Yanıtı Bayiye Gönder
            </Button>
          </div>
        </div>
      )}

      {quotes.length > 0 ? (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Teklif</Table.HeaderCell>
              <Table.HeaderCell>Durum</Table.HeaderCell>
              <Table.HeaderCell className="text-right">Kalem</Table.HeaderCell>
              <Table.HeaderCell className="text-right">KDV Hariç</Table.HeaderCell>
              <Table.HeaderCell className="text-right">KDV Dahil</Table.HeaderCell>
              <Table.HeaderCell />
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {quotes.map((q) => (
              <Table.Row key={q.id}>
                <Table.Cell>
                  {q.number}
                  <span className="text-ui-fg-subtle">
                    {" · "}
                    {new Date(q.sent_at ?? q.created_at).toLocaleDateString("tr-TR")}
                  </span>
                </Table.Cell>
                <Table.Cell>
                  <Badge size="2xsmall" color={STATUS[q.status].color}>
                    {STATUS[q.status].label}
                  </Badge>
                </Table.Cell>
                <Table.Cell className="text-right">{q.items.length}</Table.Cell>
                <Table.Cell className="text-right">{money(q.subtotal)}</Table.Cell>
                <Table.Cell className="text-right">{money(q.total)}</Table.Cell>
                <Table.Cell>
                  <div className="flex justify-end gap-1 py-1">
                    <Button size="small" variant="secondary" onClick={() => downloadPdf(q)}>PDF</Button>
                    {q.status === "revision_requested" && (
                      <Button size="small" onClick={() => startResponse(q)}>Revizeyi Yanıtla</Button>
                    )}
                    {q.status === "draft" && (
                      <>
                        <Button size="small" variant="secondary" onClick={() => startEdit(q)}>Düzenle</Button>
                        <Button size="small" onClick={() => send(q)}>Bayiye Gönder</Button>
                      </>
                    )}
                    <Button size="small" variant="transparent" aria-label="Teklifi sil" onClick={() => remove(q)}>
                      <Trash />
                    </Button>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      ) : (
        !editing && <Text size="small" className="text-ui-fg-subtle">Bu bayiye henüz teklif hazırlanmadı.</Text>
      )}
    </div>
  );
}
