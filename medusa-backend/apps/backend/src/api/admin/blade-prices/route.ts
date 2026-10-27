import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type BladePriceMatrixService from "../../../modules/blade-price-matrix/service";
import { BLADE_PRICE_MATRIX_MODULE } from "../../../modules/blade-price-matrix";
import { PostBladePriceSchema } from "./validators";
import { parsePitchInput, pitchLabel, takenPitches } from "./pitch-rows";

/** GET /admin/blade-prices — list every row regardless of `is_active`. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<BladePriceMatrixService>(
    BLADE_PRICE_MATRIX_MODULE
  );
  const rows = await service.listBladePrices(
    {},
    {
      order: {
        blade_type: "ASC",
        width_mm: "ASC",
        thickness_mm: "ASC",
        tooth_pitch: "ASC",
      },
    }
  );
  res.json({ blade_prices: rows, count: rows.length });
}

/**
 * POST /admin/blade-prices — yeni satır(lar).
 *
 * Diş alanında birden fazla diş varsa ("6/10 , 8/12") her biri aynı ölçü ve
 * fiyatla ayrı satır olarak eklenir; zaten var olan kombinasyon atlanır.
 * Yanıt: { blade_price (ilk satır), blade_prices (eklenenler), skipped (atlanan dişler) }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = PostBladePriceSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.issues,
    });
    return;
  }
  const { tooth_pitch, ...rest } = parsed.data;
  const pitchInput = parsePitchInput(tooth_pitch);
  if (!pitchInput.ok) {
    res.status(400).json({ message: pitchInput.message });
    return;
  }
  const service = req.scope.resolve<BladePriceMatrixService>(
    BLADE_PRICE_MATRIX_MODULE
  );
  const taken = await takenPitches(service, rest);
  const toCreate = pitchInput.pitches.filter((p) => !taken.has(p ?? ""));
  const skipped = pitchInput.pitches.filter((p) => taken.has(p ?? "")).map(pitchLabel);
  if (!toCreate.length) {
    res.status(409).json({
      message: `Bu genişlik × kalınlık için şu diş(ler) zaten var: ${skipped.join(", ")}.`,
      skipped,
    });
    return;
  }
  const rows = await service.createBladePrices(
    toCreate.map((p) => ({ ...rest, tooth_pitch: p }))
  );
  res.status(201).json({ blade_price: rows[0], blade_prices: rows, skipped });
}
