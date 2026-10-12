import type { StoreProduct } from "./medusa/types";
import { getProductImage } from "./medusa/format";

/**
 * Hazır (ready-made) boy ürün yardımcıları.
 *
 * Hazır ürün = önceden kaynaklı, tek SKU, sabit fiyat; `metadata.is_ready_made`
 * ile işaretli (veya başlığında "Hazır"). Yapılandırılabilir ana ürünlerden
 * ayrı sunulur: ana katalogdan ÇIKARILIR, kendi bölümünde/sayfasında listelenir.
 */

export interface ReadyMadeCard {
  id: string;
  handle: string;
  /** Ürün ailesi — başlığın "Hazır" öncesi kısmı (örn. "Bi-Metal M42"). */
  family: string;
  /** Fiyat matrisi ailesi slug'ı (bi-metal / carbide …) — filtreleme için. */
  bladeType: string;
  width: number | null;
  thickness: number | null;
  tooth: string | null;
  length: number | null;
  /** "27 × 0.9 × 4/6 · 2000 mm" gibi tek satır ölçü etiketi. */
  sizeLabel: string;
  price: number;
  currency: string;
  image: string;
  /** Gerçek stok adedi (manage_inventory açıksa); bilinmiyorsa null. */
  stock: number | null;
  href: string;
}

const asPositive = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

const fmtDim = (n: number | null): string =>
  n == null ? "" : Number.isInteger(n) ? String(n) : String(n);

/** Türk Lirası biçimi — tam sayıysa ondalıksız, değilse 2 hane. */
export function formatTL(n: number): string {
  const hasFraction = !Number.isInteger(n);
  return `${n.toLocaleString("tr-TR", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: hasFraction ? 2 : 0,
  })} ₺`;
}

/** Bir ürün hazır boy mu? (metadata veya başlıktan.) */
export function isReadyMade(p: StoreProduct): boolean {
  const m = (p.metadata || {}) as Record<string, unknown>;
  return m.is_ready_made === true || /hazır/i.test(p.title || "");
}

/** Store ürününü hazır-boy kart verisine dönüştürür. */
export function mapReadyMadeCard(p: StoreProduct): ReadyMadeCard {
  const m = (p.metadata || {}) as Record<string, unknown>;
  const width = asPositive(m.width_mm);
  const thickness = asPositive(m.thickness_mm);
  const tooth = typeof m.tooth_pitch === "string" && m.tooth_pitch ? m.tooth_pitch : null;
  const length = asPositive(m.length_mm);

  // Aile adı — başlığın "Hazır"dan önceki kısmı, sondaki tire/uzun tire atılır.
  const family =
    String(p.title || "")
      .split(/hazır/i)[0]
      .replace(/[—–-]\s*$/, "")
      .trim() || (p.title ?? "");

  const prices =
    p.variants
      ?.map((v) => v.calculated_price?.calculated_amount)
      .filter((x): x is number => typeof x === "number" && x > 0) ?? [];
  const price = prices.length ? Math.min(...prices) : 0;
  const currency = p.variants?.[0]?.calculated_price?.currency_code || "try";

  // Stok adedi YALNIZCA Medusa envanter takibi açıksa (manage_inventory) gerçek
  // inventory_quantity'den gösterilir. metadata.inventory_quantity_display elle
  // yazılmış statik bir sayıydı ("10 adet", "Son 8") → sahte aciliyet; artık okunmaz.
  const v0 = p.variants?.[0] as { manage_inventory?: boolean | null; inventory_quantity?: number | null } | undefined;
  const stock =
    v0?.manage_inventory && typeof v0.inventory_quantity === "number"
      ? Math.max(0, v0.inventory_quantity)
      : null;

  const wtt = [fmtDim(width), fmtDim(thickness), tooth].filter(Boolean).join(" × ");
  const sizeLabel = length ? (wtt ? `${wtt} · ${length} mm` : `${length} mm`) : wtt;

  return {
    id: p.id,
    handle: p.handle || p.id,
    family,
    bladeType: typeof m.blade_type === "string" ? m.blade_type : "",
    width,
    thickness,
    tooth,
    length,
    sizeLabel,
    price,
    currency,
    image: getProductImage(p),
    stock,
    href: `/products/${p.handle || p.id}`,
  };
}
