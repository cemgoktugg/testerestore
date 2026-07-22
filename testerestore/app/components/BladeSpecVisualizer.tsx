'use client';

import React, { useMemo, useState } from 'react';
import { Ruler, Lightbulb, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

/**
 * Hafif, her cihazda çalışan 2D diş profili + diş (Verzahnung) seçim danışmanı.
 *
 * TPI önerileri, Starrett'in resmi "Verzahnempfehlung Rohre und Profile"
 * (boru ve profiller için diş tavsiyesi) çizelgesine göredir. Çizelge
 * 2 BOYUTLUDUR: çap (Durchmesser) × et kalınlığı (Stärke) → diş adımı.
 * Değerler tablodan birebir okunur.
 */

type ToothForm = 'regular' | 'hook' | 'skip';
type SetType = 'raker' | 'wavy' | 'alternate';
type Kesit = 'tube' | 'solid';

interface Props {
  /** "4/6 TPI" | "4/6" | "8 TPI" — configurator'daki canlı seçim */
  toothPitch: string;
  widthMm?: string | number;
  bladeType?: string;
  toothForm?: ToothForm;
  setType?: SetType;
  /** Ürünün sunduğu diş adımları (varsa öneri bunlara "snap" edilir) */
  availablePitches?: string[];
}

const MM_PER_INCH = 25.4;

/* ---- Starrett "Rohre und Profile" (boru/profil) çizelgesi — 2D ---- */
const DIA_COLS = [25, 50, 75, 100, 125, 150, 175, 200, 250, 300, 400, 500]; // Durchmesser (mm)
const STR_ROWS = [2, 4, 6, 8, 10, 15, 25, 35, 50, 65, 75, 100, 130, 150, 200, 250]; // Stärke (mm)
// satır = Stärke, sütun = Durchmesser. null = tabloda boş (geçersiz/uygulanamaz kombinasyon)
const TUBE_TABLE: (string | null)[][] = [
  /* 2   */ ['18', '18', '18', '18', '12/16', '10/14', '10/14', '10/14', '8/11', '8/11', '8/11', '8/11'],
  /* 4   */ ['12/16', '12/16', '10/14', '8/11', '6/9', '6/9', '6/9', '6/9', '5/7', '5/7', '5/7', '5/7'],
  /* 6   */ ['12/16', '8/11', '8/11', '6/9', '5/7', '5/7', '5/7', '5/7', '4/6', '4/6', '4/6', '4/6'],
  /* 8   */ ['12/16', '6/9', '6/9', '5/7', '5/7', '5/7', '4/6', '4/6', '4/6', '4/6', '4/6', '4/6'],
  /* 10  */ ['12/16', '5/7', '5/7', '4/6', '4/6', '4/6', '4/6', '4/6', '3/4', '3/4', '3/4', '3/4'],
  /* 15  */ [null, '5/7', '4/6', '4/6', '4/6', '4/6', '3/4', '3/4', '3/4', '3/4', '3/4', '3/4'],
  /* 25  */ [null, null, '4/6', '4/6', '3/4', '3/4', '3/4', '3/4', '2/3', '2/3', '2/3', '2/3'],
  /* 35  */ [null, null, '3/4', '3/4', '3/4', '3/4', '2/3', '2/3', '2/3', '2/3', '2/3', '2/3'],
  /* 50  */ [null, null, null, null, '2/3', '2/3', '2/3', '2/3', '2/3', '2/3', '2/3', '2/3'],
  /* 65  */ [null, null, null, null, null, '2/3', '2/3', '1,4/2', '1,4/2', '1,4/2', '1,4/2', '1,4/2'],
  /* 75  */ [null, null, null, null, null, null, '2/3', '1,4/2', '1,4/2', '1,4/2', '1,4/2', '1,4/2'],
  /* 100 */ [null, null, null, null, null, null, null, '2/3', '1,4/2', '1,4/2', '1,4/2', '0,75/1,25'],
  /* 130 */ [null, null, null, null, null, null, null, null, '1,4/2', '1,4/2', '1,4/2', '0,75/1,25'],
  /* 150 */ [null, null, null, null, null, null, null, null, null, '1,4/2', '1,4/2', '0,75/1,25'],
  /* 200 */ [null, null, null, null, null, null, null, null, null, null, null, '0,75/1,25'],
  /* 250 */ [null, null, null, null, null, null, null, null, null, null, null, '0,75/1,25'],
];

/** "4/6 TPI" | "1,4/2" | "18" → {fine, coarse, avg}. Virgül ondalık desteklenir. */
function parseTpi(raw: string): { fine: number; coarse: number; avg: number } | null {
  if (!raw) return null;
  const norm = raw.replace(/,/g, '.'); // "1,4/2" → "1.4/2"
  const nums = (norm.match(/[\d.]+/g) || []).map(Number).filter((n) => n > 0);
  if (!nums.length) return null;
  if (nums.length === 1) return { fine: nums[0], coarse: nums[0], avg: nums[0] };
  const coarse = Math.min(nums[0], nums[1]);
  const fine = Math.max(nums[0], nums[1]);
  return { fine, coarse, avg: (fine + coarse) / 2 };
}

function snapIndex(value: number, arr: number[]): number {
  let best = 0;
  let bestD = Infinity;
  for (let i = 0; i < arr.length; i++) {
    const d = Math.abs(arr[i] - value);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

interface TubeLookup {
  pitch: string | null;
  diaUsed: number;
  wallUsed: number;
  exact: boolean; // false → en yakın dolu hücre kullanıldı
}

function lookupTube(diameter: number, wall: number): TubeLookup {
  const ci = snapIndex(diameter, DIA_COLS);
  const ri = snapIndex(wall, STR_ROWS);
  const direct = TUBE_TABLE[ri][ci];
  if (direct) return { pitch: direct, diaUsed: DIA_COLS[ci], wallUsed: STR_ROWS[ri], exact: true };
  // Boş hücre → en yakın dolu hücreyi bul (et kalınlığını önceliklendir).
  let best: string | null = null;
  let bestD = Infinity;
  let br = ri;
  let bc = ci;
  for (let r = 0; r < TUBE_TABLE.length; r++) {
    for (let c = 0; c < DIA_COLS.length; c++) {
      if (TUBE_TABLE[r][c]) {
        const d = Math.abs(r - ri) * 1.5 + Math.abs(c - ci); // satır (Stärke) ağırlıklı
        if (d < bestD) { bestD = d; best = TUBE_TABLE[r][c]; br = r; bc = c; }
      }
    }
  }
  return { pitch: best, diaUsed: DIA_COLS[bc], wallUsed: STR_ROWS[br], exact: false };
}

/* ---- Starrett "Vollmaterial" (dolu malzeme) çizelgesi — tek eksenli ---- */
/* Her diş adımı bir kesit aralığını (mm) kapsar; aralıklar örtüşür.        */
/* En ince → en kaba sıralı. Bar uçları çizelgeden okunmuştur.              */
interface SolidBand { min: number; max: number; label: string }

const VARIABLE_SOLID: SolidBand[] = [
  { min: 3, max: 25, label: '12/16' },
  { min: 10, max: 25, label: '10/14' },
  { min: 15, max: 40, label: '8/12' },
  { min: 15, max: 25, label: '8/11' },
  { min: 25, max: 50, label: '6/10' },
  { min: 25, max: 60, label: '6/9' },
  { min: 40, max: 70, label: '5/8' },
  { min: 40, max: 80, label: '5/7' },
  { min: 50, max: 100, label: '4/6' },
  { min: 70, max: 130, label: '3/4' },
  { min: 100, max: 180, label: '2/3' },
  { min: 150, max: 200, label: '1,9/2,1' },
  { min: 180, max: 300, label: '1,4/2' },
  { min: 200, max: 300, label: '1,4/1,8' },
  { min: 220, max: 400, label: '1,1/1,4' },
  { min: 300, max: 400, label: '0,9/1,1' },
  { min: 400, max: 550, label: '0,75/1,25' },
  { min: 500, max: 600, label: '0,7/0,9' },
];

const CONSTANT_SOLID: SolidBand[] = [
  { min: 3, max: 10, label: '18' },
  { min: 3, max: 25, label: '14' },
  { min: 10, max: 40, label: '10' },
  { min: 25, max: 70, label: '6' },
  { min: 50, max: 90, label: '4' },
  { min: 80, max: 130, label: '3' },
  { min: 130, max: 180, label: '2' },
  { min: 150, max: 300, label: '1,25' },
];

interface SolidPick {
  primary: string;
  finer: string | null;
  coarser: string | null;
  approx: boolean;
}

function pickFromBands(D: number, bands: SolidBand[]): SolidPick {
  const cov = bands.filter((b) => D >= b.min && D <= b.max);
  if (cov.length) {
    const mid = cov[Math.floor((cov.length - 1) / 2)];
    return {
      primary: mid.label,
      finer: cov.length > 1 ? cov[0].label : null,
      coarser: cov.length > 1 ? cov[cov.length - 1].label : null,
      approx: false,
    };
  }
  // Aralık dışı → en yakın bandı seç.
  let best = bands[0];
  let bestD = Infinity;
  for (const b of bands) {
    const d = D < b.min ? b.min - D : D - b.max;
    if (d < bestD) { bestD = d; best = b; }
  }
  return { primary: best.label, finer: null, coarser: null, approx: true };
}

const SET_LABELS: Record<SetType, string> = {
  raker: 'Raker (Standart)',
  wavy: 'Dalga (Wavy)',
  alternate: 'Değişken / Alternatif',
};
const FORM_LABELS: Record<ToothForm, string> = {
  regular: 'Düz Diş (Regular)',
  hook: 'Kanca Diş (Hook)',
  skip: 'Atlamalı Diş (Skip)',
};

function defaultToothForm(bladeType?: string): ToothForm {
  const t = (bladeType || '').toLowerCase();
  if (/ah[şs]ap|wood|a[ğg]a[çc]/.test(t)) return 'hook';
  return 'regular';
}

function pitchMmRange(tpi: { fine: number; coarse: number } | null): string {
  if (!tpi) return '—';
  const fineMm = MM_PER_INCH / tpi.fine;
  const coarseMm = MM_PER_INCH / tpi.coarse;
  if (Math.abs(fineMm - coarseMm) < 0.05) return `${fineMm.toFixed(1)} mm`;
  return `${fineMm.toFixed(1)}–${coarseMm.toFixed(1)} mm`;
}

/** Öneriyi ürünün gerçek diş seçeneklerine yaklaştır (en yakın ort. TPI). */
function snapToAvailable(label: string, available?: string[]): string | null {
  if (!available || !available.length) return null;
  const target = parseTpi(label);
  if (!target) return null;
  let best: string | null = null;
  let bestD = Infinity;
  for (const a of available) {
    const p = parseTpi(a);
    if (!p) continue;
    const d = Math.abs(p.avg - target.avg);
    if (d < bestD) { bestD = d; best = a.replace(/\s*TPI\s*$/i, '').trim(); }
  }
  return best;
}

export default function BladeSpecVisualizer({
  toothPitch,
  widthMm,
  bladeType,
  toothForm,
  setType = 'raker',
  availablePitches,
}: Props) {
  const tpi = useMemo(() => parseTpi(toothPitch), [toothPitch]);
  const form: ToothForm = toothForm ?? defaultToothForm(bladeType);
  const widthVal =
    typeof widthMm === 'number' ? widthMm : parseFloat(String(widthMm || '')) || null;

  const [kesit, setKesit] = useState<Kesit>('tube');
  const [diameter, setDiameter] = useState<number>(100);
  const [wall, setWall] = useState<number>(4);
  const [solidDim, setSolidDim] = useState<number>(30);

  const lookup = useMemo(() => lookupTube(diameter, wall), [diameter, wall]);
  const solidVar = useMemo(() => pickFromBands(solidDim, VARIABLE_SOLID), [solidDim]);
  const solidConst = useMemo(() => pickFromBands(solidDim, CONSTANT_SOLID), [solidDim]);

  // Aktif sekmenin önerdiği (birincil) diş adımı.
  const recPitch = kesit === 'tube' ? lookup.pitch : solidVar.primary;
  const recParsed = useMemo(() => (recPitch ? parseTpi(recPitch) : null), [recPitch]);
  const nearestInStock = useMemo(
    () => (recPitch ? snapToAvailable(recPitch, availablePitches) : null),
    [recPitch, availablePitches]
  );

  // Seçili (configurator) diş, tablo önerisiyle uyumlu mu?
  const verdict = useMemo(() => {
    if (!tpi || !recParsed) return null;
    const r = tpi.avg / recParsed.avg;
    if (r >= 0.8 && r <= 1.2) return 'good';
    return r > 1.2 ? 'too-fine' : 'too-coarse';
  }, [tpi, recParsed]);

  return (
    <div className="w-full h-full overflow-y-auto bg-[#0b0e13] text-zinc-200 p-4 sm:p-5 space-y-4">
      {/* ---- 1. Diş profili ---- */}
      <section className="rounded-xl border border-white/10 bg-black/30 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white">
            <Ruler className="h-4 w-4 text-orange-500" />
            Diş Profili
          </h3>
          <span className="text-[11px] font-bold text-orange-400 tabular-nums">
            {toothPitch || '—'}
          </span>
        </div>

        <ToothProfileSvg form={form} setType={setType} />

        <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <SpecChip label="Diş adımı" value={toothPitch || '—'} />
          <SpecChip label="Diş aralığı" value={pitchMmRange(tpi)} />
          <SpecChip label="Diş formu" value={FORM_LABELS[form]} />
          <SpecChip label="Çapraz (set)" value={SET_LABELS[setType]} />
        </div>
        {widthVal && (
          <p className="mt-2 text-[11px] text-zinc-400">
            Şerit genişliği: <span className="text-white font-semibold">{widthVal} mm</span>
          </p>
        )}
      </section>

      {/* ---- 2. Diş seçim danışmanı (Starrett çizelgesi) ---- */}
      <section className="rounded-xl border border-orange-500/25 bg-orange-500/[0.06] p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-white mb-3">
          <Lightbulb className="h-4 w-4 text-orange-500" />
          Diş (Verzahnung) Seçim Danışmanı
        </h3>

        {/* Kesit tipi */}
        <div className="flex gap-2 mb-4">
          {(['tube', 'solid'] as Kesit[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKesit(k)}
              className={`flex-1 rounded-lg py-2 text-[11px] font-bold border transition-colors cursor-pointer ${
                kesit === k
                  ? 'border-orange-500 bg-orange-500/15 text-orange-300'
                  : 'border-white/10 bg-white/[0.03] text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {k === 'tube' ? 'Boru / Profil' : 'Dolu Malzeme'}
            </button>
          ))}
        </div>

        {kesit === 'tube' ? (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <NumberField
                label="Çap (Ø, dış ölçü)"
                value={diameter}
                min={10}
                max={600}
                onChange={setDiameter}
              />
              <NumberField
                label="Et kalınlığı (Stärke)"
                value={wall}
                min={1}
                max={300}
                onChange={setWall}
              />
            </div>

            <div className="rounded-lg bg-black/40 border border-white/10 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">Önerilen diş (Starrett)</span>
                <span className="text-xl font-black text-orange-400 tabular-nums">
                  {recPitch ?? '—'}
                </span>
              </div>
              <div className="text-[10px] text-zinc-500">
                Tablodan okunan hücre: Ø{lookup.diaUsed} mm × {lookup.wallUsed} mm
                {!lookup.exact && ' (en yakın tanımlı kombinasyon)'}
              </div>

              {nearestInStock && nearestInStock !== recPitch && (
                <div className="flex items-center justify-between text-[11px] border-t border-white/10 pt-2">
                  <span className="text-zinc-400">Ürün gamınızdaki en yakın</span>
                  <span className="font-bold text-zinc-100">{nearestInStock} TPI</span>
                </div>
              )}

              {verdict && (
                <div
                  className={`flex items-start gap-2 rounded-md px-2.5 py-2 text-[11px] leading-snug ${
                    verdict === 'good'
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'bg-amber-500/10 text-amber-300'
                  }`}
                >
                  {verdict === 'good' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  )}
                  <span>
                    {verdict === 'good' &&
                      `Seçtiğiniz ${toothPitch} bu kesit için Starrett çizelgesine uygun.`}
                    {verdict === 'too-fine' &&
                      `Seçtiğiniz ${toothPitch} bu kesit için fazla ince — öneri ${recPitch}.`}
                    {verdict === 'too-coarse' &&
                      `Seçtiğiniz ${toothPitch} bu kesit için fazla kaba — öneri ${recPitch}.`}
                  </span>
                </div>
              )}
            </div>

            <p className="mt-2 flex items-start gap-1.5 text-[10px] text-zinc-500 leading-snug">
              <Info className="h-3 w-3 shrink-0 mt-0.5" />
              Kaynak: Starrett &quot;Verzahnempfehlung Rohre und Profile&quot;. Et kalınlığı diş
              seçimini belirleyen ana etkendir. Emin değilseniz bize ulaşın.
            </p>
          </>
        ) : (
          <>
            <div className="mb-3 max-w-[60%]">
              <NumberField
                label="Kesit (dolu çap / kalınlık)"
                value={solidDim}
                min={3}
                max={2100}
                onChange={setSolidDim}
              />
            </div>

            <div className="rounded-lg bg-black/40 border border-white/10 p-3 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-400">
                  Değişken diş (önerilen)
                </span>
                <span className="text-xl font-black text-orange-400 tabular-nums">
                  {solidVar.primary}
                  {solidVar.approx && ' *'}
                </span>
              </div>

              {(solidVar.finer || solidVar.coarser) && (
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div className="rounded-md bg-white/[0.04] border border-white/10 px-2 py-1.5">
                    <div className="text-zinc-500 uppercase tracking-wider">Daha iyi yüzey</div>
                    <div className="font-bold text-zinc-200">{solidVar.finer ?? solidVar.primary}</div>
                  </div>
                  <div className="rounded-md bg-white/[0.04] border border-white/10 px-2 py-1.5">
                    <div className="text-zinc-500 uppercase tracking-wider">Daha hızlı kesim</div>
                    <div className="font-bold text-zinc-200">{solidVar.coarser ?? solidVar.primary}</div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[11px] border-t border-white/10 pt-2">
                <span className="text-zinc-400">Sabit diş (alternatif)</span>
                <span className="font-bold text-zinc-100 tabular-nums">
                  {solidConst.primary}{solidConst.approx && ' *'}
                </span>
              </div>

              {nearestInStock && nearestInStock !== recPitch && (
                <div className="flex items-center justify-between text-[11px] border-t border-white/10 pt-2">
                  <span className="text-zinc-400">Ürün gamınızdaki en yakın</span>
                  <span className="font-bold text-zinc-100">{nearestInStock} TPI</span>
                </div>
              )}

              {verdict && (
                <div
                  className={`flex items-start gap-2 rounded-md px-2.5 py-2 text-[11px] leading-snug ${
                    verdict === 'good'
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'bg-amber-500/10 text-amber-300'
                  }`}
                >
                  {verdict === 'good' ? (
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  )}
                  <span>
                    {verdict === 'good' &&
                      `Seçtiğiniz ${toothPitch} bu kesit için Starrett çizelgesine uygun.`}
                    {verdict === 'too-fine' &&
                      `Seçtiğiniz ${toothPitch} bu kesit için fazla ince — öneri ${solidVar.primary}.`}
                    {verdict === 'too-coarse' &&
                      `Seçtiğiniz ${toothPitch} bu kesit için fazla kaba — öneri ${solidVar.primary}.`}
                  </span>
                </div>
              )}
            </div>

            <p className="mt-2 flex items-start gap-1.5 text-[10px] text-zinc-500 leading-snug">
              <Info className="h-3 w-3 shrink-0 mt-0.5" />
              Kaynak: Starrett &quot;Verzahnempfehlung Vollmaterial&quot;. Değişken diş genelde
              tercih edilir; hız için kaba, yüzey için ince uçtan seçin.
              {solidVar.approx && ' (*) Kesit çizelge aralığının dışında — en yakın değer.'}
            </p>
          </>
        )}
      </section>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
        {label}
      </span>
      <div className="flex items-center rounded-lg bg-black/40 border border-white/10 px-2.5">
        <input
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (!Number.isNaN(v)) onChange(Math.max(min, Math.min(max, v)));
          }}
          className="w-full bg-transparent py-2 text-sm font-bold text-white focus:outline-none tabular-nums"
        />
        <span className="text-[10px] text-zinc-500 shrink-0">mm</span>
      </div>
    </label>
  );
}

function SpecChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white/[0.04] border border-white/10 px-2.5 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="text-[11px] font-bold text-white truncate">{value}</div>
    </div>
  );
}

/* ----------------------------------------------------------------------- */
/* Diş profili SVG — diş formu + çapraz tipini şematik olarak çizer.        */
/* ----------------------------------------------------------------------- */

function ToothProfileSvg({
  form,
  setType,
}: {
  form: ToothForm;
  setType: SetType;
}) {
  const W = 400;
  const H = 130;
  const baseline = 78;
  const bodyBottom = 118;
  const toothH = 40;

  const teeth = form === 'skip' ? 5 : form === 'hook' ? 6 : 7;
  const pitch = W / teeth;
  const tipFrac = form === 'hook' ? 0.82 : form === 'skip' ? 0.55 : 0.68;

  let d = `M 0 ${baseline}`;
  for (let i = 0; i < teeth; i++) {
    const x0 = i * pitch;
    const tipX = x0 + pitch * tipFrac;
    const tipY = baseline - toothH;
    const nextX = x0 + pitch;
    if (form === 'hook') {
      d += ` Q ${x0 + pitch * 0.35} ${baseline - toothH * 0.5} ${tipX} ${tipY}`;
      d += ` L ${tipX - pitch * 0.06} ${baseline - toothH * 0.18}`;
      d += ` Q ${nextX - pitch * 0.12} ${baseline + 4} ${nextX} ${baseline}`;
    } else if (form === 'skip') {
      d += ` L ${tipX - pitch * 0.18} ${tipY} L ${tipX} ${tipY}`;
      d += ` L ${tipX + pitch * 0.06} ${baseline}`;
      d += ` L ${nextX} ${baseline}`;
    } else {
      d += ` L ${tipX} ${tipY}`;
      d += ` L ${tipX + pitch * 0.06} ${baseline - toothH * 0.12}`;
      d += ` Q ${nextX - pitch * 0.1} ${baseline + 3} ${nextX} ${baseline}`;
    }
  }
  d += ` L ${W} ${bodyBottom} L 0 ${bodyBottom} Z`;

  return (
    <div className="space-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Diş profili">
        <defs>
          <linearGradient id="bladeSteel" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#cfd3d8" />
            <stop offset="45%" stopColor="#9aa0a8" />
            <stop offset="100%" stopColor="#5b616b" />
          </linearGradient>
        </defs>

        <g stroke="#f97316" strokeWidth="1" fill="#f97316">
          <line x1={pitch * tipFrac} y1={baseline - toothH - 10} x2={pitch * (1 + tipFrac)} y2={baseline - toothH - 10} />
          <polygon points={`${pitch * tipFrac},${baseline - toothH - 10} ${pitch * tipFrac + 5},${baseline - toothH - 13} ${pitch * tipFrac + 5},${baseline - toothH - 7}`} />
          <polygon points={`${pitch * (1 + tipFrac)},${baseline - toothH - 10} ${pitch * (1 + tipFrac) - 5},${baseline - toothH - 13} ${pitch * (1 + tipFrac) - 5},${baseline - toothH - 7}`} />
          <text x={pitch * (0.5 + tipFrac)} y={baseline - toothH - 14} fontSize="9" textAnchor="middle" fill="#fdba74" stroke="none" fontWeight="bold">
            diş adımı
          </text>
        </g>

        <path d={d} fill="url(#bladeSteel)" stroke="#3f444c" strokeWidth="1" />

        <g fontSize="9" fill="#a1a1aa">
          <circle cx={pitch * tipFrac} cy={baseline - toothH} r="2.5" fill="#f97316" />
          <text x={pitch * tipFrac + 6} y={baseline - toothH + 3}>Diş ucu</text>
          <circle cx={pitch} cy={baseline} r="2.5" fill="#22c55e" />
          <text x={pitch + 6} y={baseline + 12}>Talaş boşluğu (gullet)</text>
        </g>
      </svg>

      <div>
        <div className="text-[9px] uppercase tracking-wider text-zinc-500 mb-1">
          Çapraz dizilimi — üstten görünüş
        </div>
        <SetDiagram setType={setType} />
      </div>
    </div>
  );
}

function SetDiagram({ setType }: { setType: SetType }) {
  const W = 400;
  const H = 34;
  const mid = H / 2;
  const n = 13;
  const step = W / n;
  const offsets: number[] = [];
  for (let i = 0; i < n; i++) {
    if (setType === 'raker') {
      const m = i % 3;
      offsets.push(m === 0 ? -7 : m === 1 ? 7 : 0);
    } else if (setType === 'wavy') {
      offsets.push(Math.round(Math.sin((i / n) * Math.PI * 4) * 7));
    } else {
      offsets.push(i % 2 === 0 ? -7 : 7);
    }
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="Çapraz dizilimi">
      <line x1="0" y1={mid} x2={W} y2={mid} stroke="#3f444c" strokeWidth="1" strokeDasharray="3 3" />
      {offsets.map((off, i) => (
        <circle
          key={i}
          cx={step * (i + 0.5)}
          cy={mid + off}
          r="4"
          fill={off < 0 ? '#60a5fa' : off > 0 ? '#f97316' : '#a1a1aa'}
        />
      ))}
    </svg>
  );
}
