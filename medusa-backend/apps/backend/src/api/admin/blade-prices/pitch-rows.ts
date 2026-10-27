import type BladePriceMatrixService from "../../../modules/blade-price-matrix/service";
import { normalizeToothPitch, splitToothPitches } from "../../../lib/tooth-pitch";

/**
 * Fiyat matrisi satırı ekleme/düzenleme yardımcıları.
 *
 * Panelde diş alanına "6/10 , 8/12" yazılırsa her diş ölçüsü AYRI satır olur
 * (sitede ayrı seçenek; fiyat hesaplayıcı diş değerini tam eşleşmeyle arar).
 * Aynı tip × genişlik × kalınlık × diş zaten varsa ikinci kez eklenmez.
 */

type Row = {
  id: string;
  blade_type: string;
  width_mm: number | string;
  thickness_mm: number | string;
  tooth_pitch: string | null;
};

export type PitchList = { ok: true; pitches: (string | null)[] } | { ok: false; message: string };

/** Girişten diş listesi: boş → [null] (dişsiz bıçak), anlaşılmayan kısım → hata. */
export function parsePitchInput(raw: string | null | undefined): PitchList {
  if (raw == null || raw.trim() === "") return { ok: true, pitches: [null] };
  const { pitches, invalid } = splitToothPitches(raw);
  if (invalid.length || !pitches.length) {
    return {
      ok: false,
      message:
        `Diş ölçüsü anlaşılamadı: "${invalid.join(", ") || raw}". Birden fazla dişi virgülle ayırın ` +
        `(ör. 6/10, 8/12); ondalık için virgül ya da nokta kullanabilirsiniz (ör. 1,4/2).`,
    };
  }
  return { ok: true, pitches };
}

const key = (p: string | null | undefined) => (p ? normalizeToothPitch(p) ?? p.trim() : "");

/** Aynı tip × genişlik × kalınlıktaki (verilen satır hariç) mevcut dişler. */
export async function takenPitches(
  service: BladePriceMatrixService,
  dims: { blade_type: string; width_mm: number; thickness_mm: number },
  exceptId?: string
): Promise<Set<string>> {
  const rows = (await service.listBladePrices({ blade_type: dims.blade_type })) as Row[];
  return new Set(
    rows
      .filter(
        (r) =>
          r.id !== exceptId &&
          Number(r.width_mm) === Number(dims.width_mm) &&
          Number(r.thickness_mm) === Number(dims.thickness_mm)
      )
      .map((r) => key(r.tooth_pitch))
  );
}

export function pitchLabel(p: string | null): string {
  return p ?? "dişsiz";
}
