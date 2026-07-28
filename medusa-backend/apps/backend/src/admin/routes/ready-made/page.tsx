import { defineRouteConfig } from "@medusajs/admin-sdk";
import { SquaresPlus } from "@medusajs/icons";
import {
  Container, Heading, Text, Button, Input, Label, Select, Badge, toast,
} from "@medusajs/ui";
import { useEffect, useMemo, useState } from "react";

/** Fiyat matrisi ailesi — /admin/blade-prices ile aynı slug'lar. */
const BLADE_TYPES = [
  { value: "bi-metal", label: "Bi-Metal" },
  { value: "carbide", label: "Karbür Uçlu" },
  { value: "woodcut", label: "Ahşap Kesim" },
  { value: "meat-bone", label: "Et ve Kemik" },
  { value: "textile", label: "Sünger / Tekstil" },
];

interface BaseProduct {
  id: string;
  title: string;
  thumbnail: string | null;
  image_count: number;
  has_description: boolean;
  guessed_blade_type: string;
}
interface MatrixRow {
  blade_type: string;
  width_mm: number | string;
  thickness_mm: number | string;
  tooth_pitch: string | null;
  price_per_meter: number | string;
  welding_fee: number | string;
  is_active: boolean;
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  if (!res.ok) {
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
      } else if (json.message) nice = json.message;
      else nice = text;
    } catch {
      nice = text || nice;
    }
    throw new Error(nice);
  }
  return res.json() as Promise<T>;
}

const fmtNum = (n: number) =>
  Number.isInteger(n) ? String(n) : String(n).replace(/\.?0+$/, "");
const fmtMoney = (n: number) =>
  `${n.toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`;

/** "1650, 2000  2500\n3000" → [1650, 2000, 2500, 3000] (tekilleştirilmiş). */
function parseLengths(raw: string): number[] {
  const nums = raw
    .split(/[\s,;]+/)
    .map((s) => Number(s.replace(",", ".").trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return Array.from(new Set(nums));
}

export default function ReadyMadePage() {
  const [bases, setBases] = useState<BaseProduct[]>([]);
  const [matrix, setMatrix] = useState<MatrixRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [parentId, setParentId] = useState("");
  const [titlePrefix, setTitlePrefix] = useState("");
  const [bladeType, setBladeType] = useState("bi-metal");
  const [width, setWidth] = useState("");
  const [thickness, setThickness] = useState("");
  const [tooth, setTooth] = useState("");
  const [lengthsRaw, setLengthsRaw] = useState("");
  const [inventory, setInventory] = useState("10");
  const [copyDesc, setCopyDesc] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [b, m] = await Promise.all([
          api<{ base_products: BaseProduct[] }>(
            "/admin/ready-made-products/base-products"
          ),
          api<{ blade_prices: MatrixRow[] }>("/admin/blade-prices"),
        ]);
        setBases(b.base_products);
        setMatrix(m.blade_prices.filter((r) => r.is_active));
      } catch (e) {
        toast.error("Yüklenemedi", { description: String(e) });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Ana ürün seçilince başlık öneki + tahmini tip otomatik dolsun.
  function pickParent(id: string) {
    setParentId(id);
    const p = bases.find((x) => x.id === id);
    if (p) {
      setTitlePrefix(p.title.replace(/\s*şerit testere.*/i, "").trim() || p.title);
      setBladeType(p.guessed_blade_type);
      setWidth("");
      setThickness("");
      setTooth("");
    }
  }

  // Cascading seçenekler — sadece fiyatı tanımlı kombinasyonlar.
  const widths = useMemo(() => {
    const s = new Set<number>();
    matrix
      .filter((r) => r.blade_type === bladeType)
      .forEach((r) => s.add(Number(r.width_mm)));
    return Array.from(s).sort((a, b) => a - b);
  }, [matrix, bladeType]);

  const thicknesses = useMemo(() => {
    const s = new Set<number>();
    matrix
      .filter(
        (r) => r.blade_type === bladeType && Number(r.width_mm) === Number(width)
      )
      .forEach((r) => s.add(Number(r.thickness_mm)));
    return Array.from(s).sort((a, b) => a - b);
  }, [matrix, bladeType, width]);

  const tooths = useMemo(() => {
    const s = new Set<string>();
    matrix
      .filter(
        (r) =>
          r.blade_type === bladeType &&
          Number(r.width_mm) === Number(width) &&
          Number(r.thickness_mm) === Number(thickness) &&
          r.tooth_pitch
      )
      .forEach((r) => s.add(r.tooth_pitch as string));
    return Array.from(s).sort();
  }, [matrix, bladeType, width, thickness]);

  const matchedRow = useMemo(() => {
    return matrix.find(
      (r) =>
        r.blade_type === bladeType &&
        Number(r.width_mm) === Number(width) &&
        Number(r.thickness_mm) === Number(thickness) &&
        (tooths.length === 0 ? true : r.tooth_pitch === tooth)
    );
  }, [matrix, bladeType, width, thickness, tooth, tooths.length]);

  const lengths = useMemo(() => parseLengths(lengthsRaw), [lengthsRaw]);

  const preview = useMemo(() => {
    if (!matchedRow) return [];
    const perMeter = Number(matchedRow.price_per_meter);
    const welding = Number(matchedRow.welding_fee ?? 0);
    return lengths.map((len) => ({
      len,
      price: Math.round((perMeter * (len / 1000) + welding) * 100) / 100,
    }));
  }, [matchedRow, lengths]);

  const canSubmit =
    !!parentId &&
    titlePrefix.trim().length >= 2 &&
    !!width &&
    !!thickness &&
    (tooths.length === 0 || !!tooth) &&
    !!matchedRow &&
    lengths.length > 0 &&
    !saving;

  async function submit() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const body = {
        parent_id: parentId,
        title_prefix: titlePrefix.trim(),
        blade_type: bladeType,
        width_mm: Number(width),
        thickness_mm: Number(thickness),
        tooth_pitch: tooths.length === 0 ? null : tooth,
        lengths_mm: lengths,
        inventory: Number(inventory) || 0,
        copy_description: copyDesc,
      };
      const r = await api<{
        created_count: number;
        skipped: Array<{ length_mm: number; reason: string }>;
      }>("/admin/ready-made-products", {
        method: "POST",
        body: JSON.stringify(body),
      });
      toast.success(`${r.created_count} hazır ürün oluşturuldu`, {
        description:
          r.skipped.length > 0
            ? `${r.skipped.length} tanesi atlandı (${r.skipped
                .map((s) => s.length_mm)
                .join(", ")} mm)`
            : "Resimler ve açıklama ana üründen kopyalandı.",
      });
      setLengthsRaw("");
    } catch (e) {
      toast.error("Oluşturulamadı", { description: String(e) });
    } finally {
      setSaving(false);
    }
  }

  const selectedParent = bases.find((x) => x.id === parentId);

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Hazır Ürün Oluştur</Heading>
          <Text className="text-ui-fg-subtle" size="small">
            Bir ana ürün seç, ölçü ve uzunlukları gir; resim + açıklama otomatik
            kopyalanır, fiyat matristen hesaplanır.
          </Text>
        </div>
      </div>

      {loading ? (
        <div className="px-6 py-10 text-ui-fg-subtle">Yükleniyor…</div>
      ) : (
        <div className="grid grid-cols-1 gap-6 px-6 py-6 lg:grid-cols-2">
          {/* SOL: Form */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <Label>Ana ürün</Label>
              <Select value={parentId} onValueChange={pickParent}>
                <Select.Trigger>
                  <Select.Value placeholder="Ana ürünü seç…" />
                </Select.Trigger>
                <Select.Content>
                  {bases.map((b) => (
                    <Select.Item key={b.id} value={b.id}>
                      {b.title} ({b.image_count} resim)
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              {selectedParent && (
                <Text size="xsmall" className="text-ui-fg-subtle">
                  {selectedParent.image_count} resim ·{" "}
                  {selectedParent.has_description
                    ? "açıklama var"
                    : "açıklama YOK"}{" "}
                  → hazır ürüne kopyalanacak
                </Text>
              )}
            </div>

            <div className="flex flex-col gap-1">
              <Label>Başlık öneki</Label>
              <Input
                value={titlePrefix}
                onChange={(e) => setTitlePrefix(e.target.value)}
                placeholder="örn. Bi-Metal M42"
              />
              <Text size="xsmall" className="text-ui-fg-subtle">
                Başlık: “{titlePrefix || "…"} Hazır — {fmtNum(Number(width) || 0)}{" "}
                × {fmtNum(Number(thickness) || 0)} × {tooth || "—"} × [uzunluk] mm”
              </Text>
            </div>

            <div className="flex flex-col gap-1">
              <Label>Bıçak tipi (fiyat matrisi)</Label>
              <Select
                value={bladeType}
                onValueChange={(v) => {
                  setBladeType(v);
                  setWidth("");
                  setThickness("");
                  setTooth("");
                }}
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

            <div className="grid grid-cols-3 gap-3">
              <div className="flex flex-col gap-1">
                <Label>Genişlik (mm)</Label>
                <Select
                  value={width}
                  onValueChange={(v) => {
                    setWidth(v);
                    setThickness("");
                    setTooth("");
                  }}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="—" />
                  </Select.Trigger>
                  <Select.Content>
                    {widths.map((w) => (
                      <Select.Item key={w} value={String(w)}>
                        {fmtNum(w)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Kalınlık (mm)</Label>
                <Select
                  value={thickness}
                  onValueChange={(v) => {
                    setThickness(v);
                    setTooth("");
                  }}
                  disabled={!width}
                >
                  <Select.Trigger>
                    <Select.Value placeholder="—" />
                  </Select.Trigger>
                  <Select.Content>
                    {thicknesses.map((t) => (
                      <Select.Item key={t} value={String(t)}>
                        {fmtNum(t)}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Diş (TPI)</Label>
                <Select
                  value={tooth}
                  onValueChange={setTooth}
                  disabled={!thickness || tooths.length === 0}
                >
                  <Select.Trigger>
                    <Select.Value
                      placeholder={tooths.length === 0 ? "yok" : "—"}
                    />
                  </Select.Trigger>
                  <Select.Content>
                    {tooths.map((t) => (
                      <Select.Item key={t} value={t}>
                        {t}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <Label>Uzunluk(lar) — mm</Label>
                <Input
                  value={lengthsRaw}
                  onChange={(e) => setLengthsRaw(e.target.value)}
                  placeholder="1650, 2000, 2500, 3000"
                />
                <Text size="xsmall" className="text-ui-fg-subtle">
                  Virgülle birden fazla gir → hepsi tek seferde oluşur.
                </Text>
              </div>
              <div className="flex flex-col gap-1">
                <Label>Stok (adet)</Label>
                <Input
                  type="number"
                  value={inventory}
                  onChange={(e) => setInventory(e.target.value)}
                />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={copyDesc}
                onChange={(e) => setCopyDesc(e.target.checked)}
              />
              <Text size="small">Ana ürünün açıklamasını aynen kopyala</Text>
            </label>
          </div>

          {/* SAĞ: Önizleme */}
          <div className="flex flex-col gap-3 rounded-lg bg-ui-bg-subtle p-4">
            <Text weight="plus">Önizleme</Text>
            {!matchedRow ? (
              <Text size="small" className="text-ui-fg-subtle">
                Ölçüleri seçince (ve fiyat matrisinde satır varsa) fiyatlar burada
                görünür.
              </Text>
            ) : lengths.length === 0 ? (
              <Text size="small" className="text-ui-fg-subtle">
                Uzunluk gir → oluşturulacak hazır ürünler listelenir.
              </Text>
            ) : (
              <>
                <Text size="small" className="text-ui-fg-subtle">
                  Metre fiyatı {fmtMoney(Number(matchedRow.price_per_meter))} ·
                  kaynak {fmtMoney(Number(matchedRow.welding_fee ?? 0))}
                </Text>
                <div className="flex flex-col divide-y">
                  {preview.map((p) => (
                    <div
                      key={p.len}
                      className="flex items-center justify-between py-2"
                    >
                      <Text size="small">
                        {titlePrefix} · {fmtNum(Number(width))} ×{" "}
                        {fmtNum(Number(thickness))}
                        {tooth ? ` × ${tooth}` : ""} ×{" "}
                        <span className="font-medium">{p.len} mm</span>
                      </Text>
                      <Badge size="small">{fmtMoney(p.price)}</Badge>
                    </div>
                  ))}
                </div>
                <Text size="small" weight="plus">
                  Toplam {preview.length} ürün oluşturulacak
                </Text>
              </>
            )}

            <Button
              className="mt-2"
              onClick={submit}
              disabled={!canSubmit}
              isLoading={saving}
            >
              {lengths.length > 1
                ? `${lengths.length} Hazır Ürün Oluştur`
                : "Hazır Ürün Oluştur"}
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}

export const config = defineRouteConfig({
  label: "Hazır Ürün Oluştur",
  icon: SquaresPlus,
});
