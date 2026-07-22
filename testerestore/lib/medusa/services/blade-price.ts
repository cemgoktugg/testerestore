import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
  MEDUSA_READY,
} from "../config";

/**
 * Cascading option tree returned by GET /store/blade-price/options.
 * Empty branches are pruned by the backend so the UI can never offer an
 * unpriced combination.
 */
export interface BladePriceOptions {
  blade_types: string[];
  widths: Record<string, number[]>;
  thicknesses_by_width: Record<string, Record<string, number[]>>;
  /** type → width → thickness → tooth_pitch[] */
  tree: Record<string, Record<string, Record<string, string[]>>>;
}

export interface BladePriceCalc {
  blade_type: string;
  width_mm: number;
  thickness_mm: number;
  tooth_pitch: string | null;
  length_mm: number;
  length_meter: number;
  quantity: number;
  price_per_meter: number;
  welding_fee: number;
  /** Per-blade price WITHOUT welding (blade only). */
  unit_price: number;
  /** unit_price × quantity (blades only, no welding). */
  subtotal: number;
  /** subtotal + welding_fee — welding is charged once per cart line. */
  total_price: number;
  currency_code: string;
}

const HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
};

const EMPTY_OPTIONS: BladePriceOptions = {
  blade_types: [],
  widths: {},
  thicknesses_by_width: {},
  tree: {},
};

/** Fetches the full cascading option tree. Optionally scoped to one type. */
export async function getBladePriceOptions(
  bladeType?: string
): Promise<BladePriceOptions> {
  if (!MEDUSA_READY) return EMPTY_OPTIONS;
  try {
    const qs = bladeType ? `?blade_type=${encodeURIComponent(bladeType)}` : "";
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/blade-price/options${qs}`,
      { headers: HEADERS, next: { revalidate: 300 } }
    );
    if (!res.ok) return EMPTY_OPTIONS;
    return (await res.json()) as BladePriceOptions;
  } catch (e) {
    console.error("[medusa] getBladePriceOptions failed", e);
    return EMPTY_OPTIONS;
  }
}

export interface CalculateInput {
  blade_type: string;
  width_mm: number;
  thickness_mm: number;
  tooth_pitch?: string | null;
  length_mm: number;
  quantity?: number;
}

/**
 * Asks the backend to price a specific (type, width, thickness, pitch?,
 * length, quantity) combination. Returns `null` when the combination has
 * no matrix row — caller should render "Bu ölçü için fiyat tanımlı değil".
 */
export async function calculateBladePrice(
  input: CalculateInput
): Promise<BladePriceCalc | null> {
  if (!MEDUSA_READY) return null;
  try {
    const res = await fetch(`${MEDUSA_BACKEND_URL}/store/blade-price/calculate`, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify(input),
      cache: "no-store",
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return (await res.json()) as BladePriceCalc;
  } catch (e) {
    console.error("[medusa] calculateBladePrice failed", e);
    return null;
  }
}
