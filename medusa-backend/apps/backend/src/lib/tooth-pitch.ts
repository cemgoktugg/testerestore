/**
 * Fiyat matrisi diş ölçüsü (TPI) girişi ayrıştırıcısı — sunucu ve admin paneli ortak kullanır.
 *
 * Panelde "6/10 , 8/12" yazılınca bu İKİ ayrı diş ölçüsüdür; her biri matriste ayrı satır
 * olmalı (müşteri sitede ayrı ayrı seçer, fiyat hesaplayıcı tam eşleşme arar). Türkçede
 * virgül ondalık ayırıcı da olduğu için düz "virgülden böl" yanlış olur: "1,4/2" TEK diştir.
 *
 * Kural: ondalıklı diş değerlerinin tam kısmı 0–2'dir (0,75 · 0,85 · 1,1 · 1,4 · 1,9 · 2,1 …).
 * "14,18" → 14 ve 18; "6/10,8/12" → 6/10 ve 8/12; "1,4/2" → 1.4/2; "1,4/1,8" → 1.4/1.8.
 * Çıktı matristeki yazımla aynıdır: ondalık nokta, boşluksuz, küçük değer önce ("10/6" → "6/10").
 */

// Ondalık sayı (tam kısmı 0–2) ya da 1–2 haneli tam sayı
const NUM = String.raw`(?:[0-2][.,]\d{1,2}(?!\d)|\d{1,2}(?!\d))`;
// İkinci sayının ondalığı, ardından bir sonraki dişin "/" işareti geliyorsa ondalık sayılmaz
// ("6/10,8/12" → 6/10 ve 8/12)
const NUM2 = String.raw`(?:[0-2][.,]\d{1,2}(?!\d)(?!\s*\/)|\d{1,2}(?!\d))`;
// Rakam ya da noktadan hemen sonra başlamaz (sayının ortası); virgülden sonra başlayabilir
// ("14,18" → 14 ve 18). "3.5" gibi tanınmayan ondalık kalıntı bırakır → geçersiz sayılır.
const PITCH = new RegExp(String.raw`(?<![\d.])(${NUM})(?:\s*\/\s*(${NUM2}))?`, "g");
// Değerler arasında kabul edilen ayırıcılar ve dolgu sözcükleri
const FILLER = /[\s,;|+]+|\bve\b|\btpi\b|\bdiş\b|\bdis\b/gi;

export type ToothPitchParse = {
  /** Normalize edilmiş, tekrarsız diş ölçüleri (giriş sırasıyla) */
  pitches: string[];
  /** Tanınmayan kısımlar (boş değilse giriş reddedilmeli) */
  invalid: string[];
};

function num(raw: string): number {
  return Number(raw.replace(",", "."));
}

function fmt(n: number): string {
  return String(Number(n.toFixed(2)));
}

export function splitToothPitches(raw: string | null | undefined): ToothPitchParse {
  const text = (raw ?? "").trim();
  if (!text) return { pitches: [], invalid: [] };

  const pitches: string[] = [];
  const invalid: string[] = [];
  let leftover = "";
  let last = 0;

  for (const m of text.matchAll(PITCH)) {
    leftover += text.slice(last, m.index) + " ";
    last = (m.index ?? 0) + m[0].length;
    const a = num(m[1]);
    const b = m[2] !== undefined ? num(m[2]) : undefined;
    if (!(a > 0) || (b !== undefined && !(b > 0))) {
      invalid.push(m[0]);
      continue;
    }
    const value = b === undefined || a === b
      ? fmt(a)
      : `${fmt(Math.min(a, b))}/${fmt(Math.max(a, b))}`;
    if (!pitches.includes(value)) pitches.push(value);
  }
  leftover += text.slice(last);

  for (const rest of leftover.split(FILLER)) {
    if (rest && rest.trim()) invalid.push(rest.trim());
  }
  return { pitches, invalid };
}

/** Tek diş ölçüsünü matris yazımına çevirir ("1,4 / 2" → "1.4/2"); tanınmazsa null. */
export function normalizeToothPitch(raw: string | null | undefined): string | null {
  const { pitches, invalid } = splitToothPitches(raw);
  return pitches.length === 1 && invalid.length === 0 ? pitches[0] : null;
}
