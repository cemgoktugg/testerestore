import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

/** Ana ürün başlık/metadata'sından fiyat matrisi ailesini tahmin eder.
 *  (Ana ürünün metadata.blade_type'ı "M42" gibi olabilir → matris slug'ı değil,
 *   o yüzden anahtar kelimeyle eşleştiriyoruz. UI'da değiştirilebilir.) */
function guessBladeType(title: string, metaType?: string): string {
  const s = `${title} ${metaType || ""}`.toLowerCase();
  // Bi-metal'i ÖNCE kontrol et: "et"/"bone" gibi kısa token'lar "bi-mETal"
  // içine takılıp yanlış eşleşmesin (substring bug'ı).
  if (/bi-?metal|\bm42\b|\bm51\b/.test(s)) return "bi-metal";
  if (/karb(ü|u)r|carbide|flexback/.test(s)) return "carbide";
  if (/ah(ş|s)ap|a(ğ|g)a(ç|c)|wood|spezial/.test(s)) return "woodcut";
  // Kelime sınırı şart: \bet\b "metal" içindeki "et"i yakalamaz.
  if (/\bet\b|kemik|\bmeat\b|\bbone\b/.test(s)) return "meat-bone";
  if (/s(ü|u)nger|tekstil|textile|foam/.test(s)) return "textile";
  return "bi-metal";
}

/**
 * GET /admin/ready-made-products/base-products
 *
 * Hazır ürün ÜRETMEK için seçilebilecek ANA ürünleri döner (yani kendisi hazır
 * OLMAYANlar). Her biri için tahmini matris tipi + resim sayısı gelir.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: products } = await query.graph({
    entity: "product",
    fields: [
      "id", "title", "thumbnail", "description", "status",
      "images.url", "metadata",
    ],
  });

  const isReady = (p: {
    title?: string;
    metadata?: Record<string, unknown> | null;
  }) =>
    (p.metadata || {})["is_ready_made"] === true ||
    /hazır/i.test(p.title || "");

  const base = products
    .filter((p) => !isReady(p))
    .map((p) => {
      const meta = (p.metadata || {}) as Record<string, unknown>;
      return {
        id: p.id,
        title: p.title,
        thumbnail: p.thumbnail,
        status: p.status,
        image_count: ((p.images || []) as unknown[]).length,
        has_description: !!p.description,
        guessed_blade_type: guessBladeType(
          String(p.title || ""),
          typeof meta.blade_type === "string" ? meta.blade_type : undefined
        ),
      };
    })
    .sort((a, b) => String(a.title).localeCompare(String(b.title), "tr"));

  res.json({ base_products: base, count: base.length });
}
