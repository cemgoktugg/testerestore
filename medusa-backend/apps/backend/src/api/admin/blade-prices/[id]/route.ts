import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type BladePriceMatrixService from "../../../../modules/blade-price-matrix/service";
import { BLADE_PRICE_MATRIX_MODULE } from "../../../../modules/blade-price-matrix";
import { PatchBladePriceSchema } from "../validators";
import { parsePitchInput, pitchLabel, takenPitches } from "../pitch-rows";

type Row = {
  id: string;
  blade_type: string;
  width_mm: number | string;
  thickness_mm: number | string;
  tooth_pitch: string | null;
  price_per_meter: number | string;
  welding_fee: number | string;
  currency_code: string;
  is_active: boolean;
};

/** GET /admin/blade-prices/:id */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id as string;
  const service = req.scope.resolve<BladePriceMatrixService>(
    BLADE_PRICE_MATRIX_MODULE
  );
  try {
    const row = await service.retrieveBladePrice(id);
    res.json({ blade_price: row });
  } catch {
    res.status(404).json({ message: "Blade price not found" });
  }
}

/**
 * PATCH /admin/blade-prices/:id
 *
 * Diş alanı birden fazla diş içeriyorsa ("6/10 , 8/12") bu satır ilk diş olur,
 * diğerleri aynı ölçü ve fiyatla yeni satır olarak eklenir — eskiden tek alana
 * yazılmış birleşik değerler de böyle düzeltilir. Aynı ölçüde zaten var olan diş atlanır.
 * Yanıt: { blade_price, created (yeni satırlar), skipped (atlanan dişler) }
 */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id as string;
  const parsed = PatchBladePriceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.issues,
    });
    return;
  }
  const service = req.scope.resolve<BladePriceMatrixService>(
    BLADE_PRICE_MATRIX_MODULE
  );
  let current: Row;
  try {
    current = (await service.retrieveBladePrice(id)) as Row;
  } catch {
    res.status(404).json({ message: "Blade price not found" });
    return;
  }

  const { tooth_pitch, ...rest } = parsed.data;
  let pitches: (string | null)[] | undefined;
  if (tooth_pitch !== undefined) {
    const input = parsePitchInput(tooth_pitch);
    if (!input.ok) {
      res.status(400).json({ message: input.message });
      return;
    }
    pitches = input.pitches;
  }

  const merged = {
    blade_type: rest.blade_type ?? current.blade_type,
    width_mm: rest.width_mm ?? Number(current.width_mm),
    thickness_mm: rest.thickness_mm ?? Number(current.thickness_mm),
  };
  const taken = await takenPitches(service, merged, id);

  // Bu satırın alacağı diş: girişteki ilk diş ya da (diş değişmiyorsa) mevcut diş
  const own = pitches ? pitches[0] : current.tooth_pitch;
  if (taken.has(own ?? "")) {
    res.status(409).json({
      message: `Bu genişlik × kalınlık için "${pitchLabel(own)}" dişi başka bir satırda zaten var.`,
    });
    return;
  }

  const [row] = await service.updateBladePrices([
    { id, ...rest, ...(pitches ? { tooth_pitch: own } : {}) },
  ]);

  let created: unknown[] = [];
  let skipped: string[] = [];
  if (pitches && pitches.length > 1) {
    const extra = pitches.slice(1);
    skipped = extra.filter((p) => taken.has(p ?? "")).map(pitchLabel);
    const toCreate = extra.filter((p) => !taken.has(p ?? ""));
    if (toCreate.length) {
      created = await service.createBladePrices(
        toCreate.map((p) => ({
          blade_type: merged.blade_type,
          width_mm: merged.width_mm,
          thickness_mm: merged.thickness_mm,
          tooth_pitch: p,
          price_per_meter: rest.price_per_meter ?? Number(current.price_per_meter),
          welding_fee: rest.welding_fee ?? Number(current.welding_fee ?? 0),
          currency_code: rest.currency_code ?? current.currency_code,
          is_active: rest.is_active ?? current.is_active,
        }))
      );
    }
  }
  res.json({ blade_price: row, created, skipped });
}

/** DELETE /admin/blade-prices/:id */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id as string;
  const service = req.scope.resolve<BladePriceMatrixService>(
    BLADE_PRICE_MATRIX_MODULE
  );
  await service.deleteBladePrices([id]);
  res.json({ id, deleted: true });
}
