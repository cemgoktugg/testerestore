import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type BladePriceMatrixService from "../../../../modules/blade-price-matrix/service";
import { BLADE_PRICE_MATRIX_MODULE } from "../../../../modules/blade-price-matrix";

type BladePriceRow = {
  blade_type: string;
  width_mm: number;
  thickness_mm: number;
  tooth_pitch: string | null;
};

/**
 * GET /store/blade-price/options
 *
 * Returns the cascading option tree the storefront needs to render the
 * width → thickness → tooth-pitch dropdowns. Empty combinations are
 * omitted so users can never pick an unpriced configuration.
 *
 * Query: ?blade_type=<slug>   (optional filter — when present only that
 *                              family's options are returned)
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<BladePriceMatrixService>(
    BLADE_PRICE_MATRIX_MODULE
  );

  const bladeType = (req.query.blade_type as string | undefined)?.trim();
  const filter: Record<string, unknown> = { is_active: true };
  if (bladeType) filter.blade_type = bladeType;

  const rows = (await service.listBladePrices(filter)) as BladePriceRow[];

  // Build: { [type]: { [width]: { [thickness]: tooth_pitch[] } } }
  const tree: Record<
    string,
    Record<string, Record<string, string[]>>
  > = {};
  const widthSet: Record<string, Set<number>> = {};
  const thicknessSet: Record<string, Record<number, Set<number>>> = {};

  for (const r of rows) {
    const type = r.blade_type;
    const width = Number(r.width_mm);
    const thickness = Number(r.thickness_mm);
    const pitch = r.tooth_pitch;

    tree[type] ??= {};
    tree[type][width] ??= {};
    tree[type][width][thickness] ??= [];
    if (pitch && !tree[type][width][thickness].includes(pitch)) {
      tree[type][width][thickness].push(pitch);
    }

    widthSet[type] ??= new Set();
    widthSet[type].add(width);

    thicknessSet[type] ??= {};
    thicknessSet[type][width] ??= new Set();
    thicknessSet[type][width].add(thickness);
  }

  const widths: Record<string, number[]> = {};
  for (const t of Object.keys(widthSet)) {
    widths[t] = Array.from(widthSet[t]).sort((a, b) => a - b);
  }

  const thicknessesByWidth: Record<string, Record<string, number[]>> = {};
  for (const t of Object.keys(thicknessSet)) {
    thicknessesByWidth[t] = {};
    for (const w of Object.keys(thicknessSet[t])) {
      thicknessesByWidth[t][w] = Array.from(thicknessSet[t][Number(w)]).sort(
        (a, b) => a - b
      );
    }
  }

  res.json({
    blade_types: Object.keys(tree).sort(),
    widths,
    thicknesses_by_width: thicknessesByWidth,
    /** Full cascade: type → width → thickness → tooth-pitch[] */
    tree,
  });
}
