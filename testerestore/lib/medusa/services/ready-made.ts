import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
  MEDUSA_READY,
} from "../config";

export interface ReadyMadeSuggestion {
  id: string;
  handle: string;
  title: string;
  subtitle: string | null;
  thumbnail: string | null;
  price: number | null;
  currency_code: string;
  blade_type: string;
  width_mm: number;
  thickness_mm: number;
  tooth_pitch: string | null;
  length_mm: number;
  inventory_quantity_display: number | null;
}

export interface QueryReadyMade {
  bladeType: string;
  lengthMm: number;
  widthMm?: number;
  thicknessMm?: number;
  toothPitch?: string | null;
  toleranceMm?: number;
}

/**
 * Müşterinin girdiği konfigürasyon için hazır stok ürünleri sorgular.
 * Boş array dönüyorsa öneri yok → popup açılmaz.
 */
export async function getReadyMadeSuggestions(
  q: QueryReadyMade
): Promise<ReadyMadeSuggestion[]> {
  if (!MEDUSA_READY) return [];
  const params = new URLSearchParams();
  params.set("blade_type", q.bladeType);
  params.set("length_mm", String(q.lengthMm));
  if (q.widthMm !== undefined) params.set("width_mm", String(q.widthMm));
  if (q.thicknessMm !== undefined)
    params.set("thickness_mm", String(q.thicknessMm));
  if (q.toothPitch) params.set("tooth_pitch", q.toothPitch);
  if (q.toleranceMm !== undefined)
    params.set("tolerance_mm", String(q.toleranceMm));

  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/ready-made-suggestions?${params.toString()}`,
      {
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
        },
        next: { revalidate: 300 },
      }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { suggestions: ReadyMadeSuggestion[] };
    return data.suggestions ?? [];
  } catch {
    return [];
  }
}
