import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { z } from "zod";

const QuerySchema = z.object({
  blade_type: z.string().min(1),
  length_mm: z.coerce.number().positive(),
  width_mm: z.coerce.number().positive().optional(),
  thickness_mm: z.coerce.number().positive().optional(),
  tooth_pitch: z.string().optional(),
  tolerance_mm: z.coerce.number().nonnegative().optional().default(25),
});

/**
 * GET /store/ready-made-suggestions
 *
 * Müşterinin girdiği konfigürasyona uygun, önceden kaynaklanmış ve stoğumuzda
 * bulunan ürünleri döner. Metadata bazlı filtreleme:
 *   - is_ready_made === true
 *   - blade_type eşleşmeli
 *   - length_mm ± tolerance_mm aralığında
 *   - (verilmişse) width_mm / thickness_mm tam eşleşmeli
 *   - (verilmişse) tooth_pitch tam eşleşmeli
 *
 * Sonuçlar fiyat, görsel, stok bilgisiyle birlikte döner.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parsed = QuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid query",
      errors: parsed.error.issues,
    });
    return;
  }
  const {
    blade_type,
    length_mm,
    width_mm,
    thickness_mm,
    tooth_pitch,
    tolerance_mm,
  } = parsed.data;

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  // Tüm yayındaki ürünlerin metadata + temel alanlarını çek
  // (Medusa Query metadata içinde nested filtreyi desteklemediği için
  // burada in-memory eleme yapıyoruz.)
  // calculated_price region context gerektirir; ham fiyat setine düşeriz
  // ve TRY fiyatını filterleriz.
  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "handle",
      "title",
      "subtitle",
      "thumbnail",
      "metadata",
      "variants.id",
      "variants.prices.amount",
      "variants.prices.currency_code",
    ],
    filters: { status: "published" } as never,
  });

  const lowerLength = length_mm - tolerance_mm;
  const upperLength = length_mm + tolerance_mm;

  const matches = products
    .filter((p) => {
      const m = (p.metadata || {}) as Record<string, unknown>;
      if (m.is_ready_made !== true) return false;
      if (m.blade_type !== blade_type) return false;
      const len = Number(m.length_mm);
      if (!Number.isFinite(len)) return false;
      if (len < lowerLength || len > upperLength) return false;
      if (width_mm !== undefined && Number(m.width_mm) !== width_mm) return false;
      if (
        thickness_mm !== undefined &&
        Number(m.thickness_mm) !== thickness_mm
      )
        return false;
      if (tooth_pitch && m.tooth_pitch !== tooth_pitch) return false;
      return true;
    })
    .map((p) => {
      const m = (p.metadata || {}) as Record<string, unknown>;
      const v = p.variants?.[0];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const tryPrice = ((v as any)?.prices || []).find(
        (pr: { currency_code?: string }) =>
          (pr.currency_code || "").toLowerCase() === "try"
      );
      return {
        id: p.id,
        handle: p.handle,
        title: p.title,
        subtitle: p.subtitle,
        thumbnail: p.thumbnail,
        price: typeof tryPrice?.amount === "number" ? tryPrice.amount : null,
        currency_code: tryPrice?.currency_code ?? "try",
        blade_type: m.blade_type,
        width_mm: m.width_mm,
        thickness_mm: m.thickness_mm,
        tooth_pitch: m.tooth_pitch,
        length_mm: m.length_mm,
        inventory_quantity_display: m.inventory_quantity_display ?? null,
      };
    })
    .sort((a, b) => {
      // En yakın uzunluk önce
      const da = Math.abs(Number(a.length_mm) - length_mm);
      const db = Math.abs(Number(b.length_mm) - length_mm);
      return da - db;
    });

  res.json({
    suggestions: matches,
    count: matches.length,
    query: { blade_type, length_mm, width_mm, thickness_mm, tooth_pitch, tolerance_mm },
  });
}
