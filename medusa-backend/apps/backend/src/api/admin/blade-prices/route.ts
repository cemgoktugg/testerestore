import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type BladePriceMatrixService from "../../../modules/blade-price-matrix/service";
import { BLADE_PRICE_MATRIX_MODULE } from "../../../modules/blade-price-matrix";
import { PostBladePriceSchema } from "./validators";

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

/** POST /admin/blade-prices — create a new row. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = PostBladePriceSchema.safeParse(req.body);
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
  const [row] = await service.createBladePrices([parsed.data]);
  res.status(201).json({ blade_price: row });
}
