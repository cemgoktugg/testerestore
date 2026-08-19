/**
 * Danışman önerisi → sitedeki ürün eşleştirme.
 *
 * Advisor yapısal alanlar döndürüyor (blade_width_mm, blade_thickness_mm,
 * tooth_pitch, blade_length_mm). Burada onları katalogla eşleştirip ürün
 * linki üretiyoruz.
 *
 * ÖNEMLİ — SKU string'i üzerinden eşleştirme YAPILMIYOR. İki taraf farklı
 * SKU şeması kullanıyor (advisor "27-1.10-6/10-3660", Medusa
 * "BIM42-27mm-0.90mm-610TPI") ve SKU kayıplı bir kodlama. Bunun yerine iki
 * tarafta da bulunan yapısal ölçüler üzerinden eşleştiriyoruz.
 *
 * Bu dosya yeni; mevcut hiçbir route/servis değiştirilmedi. Medusa'daki
 * /store/ready-made-suggestions ucu ve lib/medusa/services/ready-made.ts
 * servisi zaten vardı — olduğu gibi kullanılıyor.
 *
 * NOT: bu route statik segment olduğu için [...path] catch-all'dan önce
 * eşleşir; advisor servisine gitmez, doğrudan Medusa'ya sorar.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  getReadyMadeSuggestions,
  type ReadyMadeSuggestion,
} from "../../../../lib/medusa/services/ready-made";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Advisor'ın bıçak tipi kodları → katalogdaki karşılıkları.
 * Katalogda hazır ürünlerin metadata.blade_type değeri "bi-metal"
 * (bkz. seed-ready-made-blades.ts), ana katalogda ise ayrı handle'lar var.
 */
const TYPE_MAP: Record<string, { readyMade: string; handle: string; label: string }> = {
  BI_METAL_M42_FLEXBACK: {
    readyMade: "bi-metal",
    handle: "bimetal-premium",
    label: "Bi-Metal M42 Premium",
  },
  BI_METAL_M51: {
    readyMade: "bi-metal",
    handle: "bimetal-m51",
    label: "Bi-Metal M51 Endüstriyel",
  },
};

const DEFAULT_TYPE = TYPE_MAP.BI_METAL_M42_FLEXBACK;

interface SuggestBody {
  blade_type?: unknown;
  blade_width_mm?: unknown;
  blade_thickness_mm?: unknown;
  tooth_pitch?: unknown;
  blade_length_mm?: unknown;
}

function num(v: unknown): number | undefined {
  const n = typeof v === "string" ? Number(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as SuggestBody;

  const widthMm = num(body.blade_width_mm);
  const thicknessMm = num(body.blade_thickness_mm);
  const lengthMm = num(body.blade_length_mm);
  const toothPitch =
    typeof body.tooth_pitch === "string" && body.tooth_pitch.trim()
      ? body.tooth_pitch.trim()
      : undefined;

  const typeKey =
    typeof body.blade_type === "string" ? body.blade_type.toUpperCase() : "";
  const mapped = TYPE_MAP[typeKey] ?? DEFAULT_TYPE;

  // Yapılandırılabilir ürün her zaman önerilebilir: özel boy zaten destekleniyor
  // (seed'de custom_length_enabled), müşteri ölçüyü sayfada seçiyor.
  const configurable = {
    handle: mapped.handle,
    label: mapped.label,
    url: `/products/${mapped.handle}`,
  };

  // Hazır ürün ancak ölçü biliniyorsa aranabilir.
  if (!lengthMm) {
    return NextResponse.json({
      ready_made: [],
      exact: false,
      configurable,
    });
  }

  // 1) Tam eşleşme — diş adımı dahil
  let ready: ReadyMadeSuggestion[] = await getReadyMadeSuggestions({
    bladeType: mapped.readyMade,
    lengthMm,
    widthMm,
    thicknessMm,
    toothPitch,
    toleranceMm: 25,
  });
  const exact = ready.length > 0;

  // 2) Yoksa aynı ölçüde farklı diş adımı — "tam bu değil ama yakın" seçeneği.
  //    Yanlış ürüne yönlendirmemek için arayüzde ayrıca etiketleniyor.
  if (!exact && toothPitch) {
    ready = await getReadyMadeSuggestions({
      bladeType: mapped.readyMade,
      lengthMm,
      widthMm,
      thicknessMm,
      toleranceMm: 25,
    });
  }

  return NextResponse.json({
    ready_made: ready.slice(0, 3).map((r) => ({
      handle: r.handle,
      title: r.title,
      price: r.price,
      currency_code: r.currency_code,
      thumbnail: r.thumbnail,
      width_mm: r.width_mm,
      thickness_mm: r.thickness_mm,
      tooth_pitch: r.tooth_pitch,
      length_mm: r.length_mm,
      url: `/products/${r.handle}`,
    })),
    exact,
    configurable,
  });
}
