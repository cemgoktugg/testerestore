import { defineRouteConfig } from "@medusajs/admin-sdk";
import { CurrencyDollar, Plus, PencilSquare, Trash } from "@medusajs/icons";
import {
  Container, Heading, Text, Button, Input, Label, Switch, Select,
  Badge, Drawer, Table, toast,
} from "@medusajs/ui";
import { useEffect, useMemo, useState } from "react";

interface BladePrice {
  id: string;
  blade_type: string;
  width_mm: number;
  thickness_mm: number;
  tooth_pitch: string | null;
  price_per_meter: number | string;
  welding_fee: number | string;
  currency_code: string;
  is_active: boolean;
}

type Form = {
  blade_type: string;
  width_mm: string;
  thickness_mm: string;
  tooth_pitch: string;
  price_per_meter: string;
  welding_fee: string;
  currency_code: string;
  is_active: boolean;
};

const BLADE_TYPES = [
  { value: "bi-metal", label: "Bi-Metal" },
  { value: "carbide", label: "Karbür Uçlu" },
  { value: "woodcut", label: "Ahşap Kesim" },
  { value: "meat-bone", label: "Et ve Kemik" },
  { value: "textile", label: "Sünger / Tekstil" },
];

const EMPTY_FORM: Form = {
  blade_type: "bi-metal",
  width_mm: "",
  thickness_mm: "",
  tooth_pitch: "",
  price_per_meter: "",
  welding_fee: "0",
  currency_code: "try",
  is_active: true,
};

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
    // Surface the backend's validation message when present so the user
    // sees *what's wrong*, not just a status code.
    const text = await res.text();
    let nice = `${res.status}`;
    try {
      const json = JSON.parse(text) as {
        message?: string;
        errors?: Array<{ path?: (string | number)[]; message?: string }>;
      };
      if (json.errors?.length) {
        nice = json.errors
          .map((e) => `${e.path?.join(".") || "?"}: ${e.message}`)
          .join(" | ");
      } else if (json.message) {
        nice = json.message;
      } else {
        nice = text;
      }
    } catch {
      nice = text || nice;
    }
    throw new Error(nice);
  }
  return res.json() as Promise<T>;
}

/** Parses a user-entered number that may use either "." or "," as decimal
 *  separator (Turkish input common). Returns NaN if the string isn't numeric. */
function parseDecimal(raw: string): number {
  if (raw == null) return NaN;
  const cleaned = String(raw).replace(",", ".").trim();
  if (cleaned === "") return NaN;
  return Number(cleaned);
}

const fmtMoney = (n: number | string, ccy: string) =>
  `${Number(n).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${ccy.toUpperCase()}`;

export default function BladePricesPage() {
  const [rows, setRows] = useState<BladePrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ blade_prices: BladePrice[] }>(
        "/admin/blade-prices"
      );
      setRows(data.blade_prices);
    } catch (e) {
      toast.error("Yüklenemedi", { description: String(e) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (typeFilter === "all") return rows;
    return rows.filter((r) => r.blade_type === typeFilter);
  }, [rows, typeFilter]);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function openEdit(row: BladePrice) {
    setEditingId(row.id);
    setForm({
      blade_type: row.blade_type,
      width_mm: String(row.width_mm),
      thickness_mm: String(row.thickness_mm),
      tooth_pitch: row.tooth_pitch ?? "",
      price_per_meter: String(row.price_per_meter),
      welding_fee: String(row.welding_fee ?? 0),
      currency_code: row.currency_code,
      is_active: row.is_active,
    });
    setOpen(true);
  }

  async function save() {
    const widthNum = parseDecimal(form.width_mm);
    const thicknessNum = parseDecimal(form.thickness_mm);
    const priceNum = parseDecimal(form.price_per_meter);
    const weldingNum = form.welding_fee.trim() === ""
      ? 0
      : parseDecimal(form.welding_fee);

    const body = {
      blade_type: form.blade_type,
      width_mm: widthNum,
      thickness_mm: thicknessNum,
      tooth_pitch:
        form.tooth_pitch.trim() === "" ? null : form.tooth_pitch.trim(),
      price_per_meter: priceNum,
      welding_fee: isNaN(weldingNum) ? 0 : weldingNum,
      currency_code: form.currency_code,
      is_active: form.is_active,
    };

    // Local validation with specific messages so the user knows exactly
    // which field is wrong.
    if (!body.blade_type) {
      toast.error("Şerit tipi seçin");
      return;
    }
    if (isNaN(widthNum) || widthNum <= 0) {
      toast.error("Genişlik geçersiz", {
        description: "Pozitif bir sayı girin (örn. 27 veya 0.9).",
      });
      return;
    }
    if (isNaN(thicknessNum) || thicknessNum <= 0) {
      toast.error("Kalınlık geçersiz", {
        description: "Pozitif bir sayı girin (örn. 0.9 veya 1.3).",
      });
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Metre fiyatı geçersiz", {
        description: "0 veya pozitif bir sayı girin.",
      });
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        await api(`/admin/blade-prices/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        toast.success("Güncellendi");
      } else {
        await api("/admin/blade-prices", {
          method: "POST",
          body: JSON.stringify(body),
        });
        toast.success("Eklendi");
      }
      setOpen(false);
      await load();
    } catch (e) {
      toast.error("Kayıt başarısız", { description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Bu fiyat satırını silmek istediğinize emin misiniz?")) return;
    try {
      await api(`/admin/blade-prices/${id}`, { method: "DELETE" });
      toast.success("Silindi");
      await load();
    } catch (e) {
      toast.error("Silme başarısız", { description: String(e) });
    }
  }

  return (
    <Container className="p-0">
      <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-base">
        <div>
          <Heading level="h1">Şerit Testere Fiyat Matrisi</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Genişlik × Kalınlık × Diş ölçüsü kombinasyonları için metre fiyatı
            tanımlayın. Frontend sadece burada tanımlı seçenekleri gösterir.
          </Text>
        </div>
        <div className="flex items-center gap-3">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <Select.Trigger className="w-44">
              <Select.Value placeholder="Tipe göre filtrele" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">Tüm Tipler</Select.Item>
              {BLADE_TYPES.map((t) => (
                <Select.Item key={t.value} value={t.value}>
                  {t.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
          <Button variant="primary" onClick={openNew}>
            <Plus className="mr-1" /> Yeni Satır
          </Button>
        </div>
      </div>

      <div className="px-6 py-4">
        {loading ? (
          <Text className="text-ui-fg-subtle">Yükleniyor...</Text>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Text className="text-ui-fg-subtle">Henüz fiyat satırı yok.</Text>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Tip</Table.HeaderCell>
                <Table.HeaderCell>Genişlik (mm)</Table.HeaderCell>
                <Table.HeaderCell>Kalınlık (mm)</Table.HeaderCell>
                <Table.HeaderCell>Diş (TPI)</Table.HeaderCell>
                <Table.HeaderCell>Metre Fiyatı</Table.HeaderCell>
                <Table.HeaderCell>Kaynak Ücreti</Table.HeaderCell>
                <Table.HeaderCell>Durum</Table.HeaderCell>
                <Table.HeaderCell></Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {filtered.map((r) => (
                <Table.Row key={r.id}>
                  <Table.Cell>
                    <Badge>
                      {BLADE_TYPES.find((t) => t.value === r.blade_type)?.label ||
                        r.blade_type}
                    </Badge>
                  </Table.Cell>
                  <Table.Cell>{r.width_mm}</Table.Cell>
                  <Table.Cell>{r.thickness_mm}</Table.Cell>
                  <Table.Cell>
                    {r.tooth_pitch || (
                      <Text size="xsmall" className="text-ui-fg-subtle">
                        —
                      </Text>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    {fmtMoney(r.price_per_meter, r.currency_code)}
                  </Table.Cell>
                  <Table.Cell>
                    {fmtMoney(r.welding_fee ?? 0, r.currency_code)}
                  </Table.Cell>
                  <Table.Cell>
                    {r.is_active ? (
                      <Badge color="green">Aktif</Badge>
                    ) : (
                      <Badge color="grey">Pasif</Badge>
                    )}
                  </Table.Cell>
                  <Table.Cell>
                    <div className="flex items-center gap-2 justify-end">
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
              {editingId ? "Fiyat Satırını Düzenle" : "Yeni Fiyat Satırı"}
            </Drawer.Title>
          </Drawer.Header>
          <Drawer.Body className="space-y-4 overflow-y-auto">
            <div className="space-y-2">
              <Label>Şerit Tipi</Label>
              <Select
                value={form.blade_type}
                onValueChange={(v) => setForm({ ...form, blade_type: v })}
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {BLADE_TYPES.map((t) => (
                    <Select.Item key={t.value} value={t.value}>
                      {t.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Genişlik (mm)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  value={form.width_mm}
                  onChange={(e) =>
                    setForm({ ...form, width_mm: e.target.value })
                  }
                  placeholder="27"
                />
              </div>
              <div className="space-y-2">
                <Label>Kalınlık (mm)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={form.thickness_mm}
                  onChange={(e) =>
                    setForm({ ...form, thickness_mm: e.target.value })
                  }
                  placeholder="0.9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Diş Ölçüsü (TPI) — opsiyonel</Label>
              <Input
                value={form.tooth_pitch}
                onChange={(e) =>
                  setForm({ ...form, tooth_pitch: e.target.value })
                }
                placeholder="4/6, 3/4, vs. (boş bırakılabilir)"
              />
              <Text size="xsmall" className="text-ui-fg-subtle">
                Buraya yazdığınız diş ölçüsü, aynı tip + genişlik + kalınlık
                kombinasyonu için ürün sayfasındaki TPI dropdown'una otomatik
                eklenir. Boş bıraktığınızda TPI'siz satır oluşur (ahşap, et
                ve kemik, tekstil için).
              </Text>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Metre Fiyatı</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={form.price_per_meter}
                  onChange={(e) =>
                    setForm({ ...form, price_per_meter: e.target.value })
                  }
                  placeholder="450.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Kaynak Ücreti</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={form.welding_fee}
                  onChange={(e) =>
                    setForm({ ...form, welding_fee: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Para Birimi</Label>
              <Select
                value={form.currency_code}
                onValueChange={(v) =>
                  setForm({ ...form, currency_code: v })
                }
              >
                <Select.Trigger>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value="try">TRY</Select.Item>
                  <Select.Item value="eur">EUR</Select.Item>
                  <Select.Item value="usd">USD</Select.Item>
                </Select.Content>
              </Select>
            </div>

            <div className="flex items-center justify-between pt-2">
              <Label>Aktif</Label>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) =>
                  setForm({ ...form, is_active: Boolean(v) })
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
  label: "Fiyat Matrisi",
  icon: CurrencyDollar,
});
