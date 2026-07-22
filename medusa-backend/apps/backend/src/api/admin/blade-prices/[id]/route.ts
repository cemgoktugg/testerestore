import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type BladePriceMatrixService from "../../../../modules/blade-price-matrix/service";
import { BLADE_PRICE_MATRIX_MODULE } from "../../../../modules/blade-price-matrix";
import { PatchBladePriceSchema } from "../validators";

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

/** PATCH /admin/blade-prices/:id */
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
  const [row] = await service.updateBladePrices([{ id, ...parsed.data }]);
  res.json({ blade_price: row });
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
