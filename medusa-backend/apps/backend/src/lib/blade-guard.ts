/**
 * Matris fiyatlı satırların sunucu tarafı bekçisi — TEK KAYNAK.
 *
 * Neden var: matris fiyatı (`computeBladeLine`) yalnızca blade_type/genişlik/
 * kalınlık/diş/uzunluktan hesaplanır; hangi ÜRÜNE uygulanacağını istemci
 * söylüyordu. Böylece pahalı bir ürün (hazır boy, makine, karbür) en ucuz
 * matris satırının fiyatıyla sepete konabiliyordu. Ayrıca Medusa'nın standart
 * satır uçlarıyla fiyatlandıktan sonra adet/metadata değiştirilebiliyordu.
 *
 * Kurallar:
 *  1. Matris fiyatı yalnızca "ölçüye göre" (custom_length_enabled) şerit
 *     ürünlerine uygulanır; hazır boy ürünlere asla.
 *  2. Ürünün matris türü, storefront BladeConfigurator'daki
 *     `deriveBladeTypeSlug` ile birebir aynı kuralla üründen türetilir ve
 *     istemcinin gönderdiği blade_type ile eşleşmelidir.
 *  3. Uzunluk ürünün min/max sınırları içinde olmalıdır (tanımlıysa).
 *  4. Sipariş tamamlanırken her matris satırının fiyatı, satırdaki ölçü ve
 *     adetten YENİDEN hesaplanır; tutmazsa sipariş oluşmaz.
 */
import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, MedusaError } from "@medusajs/framework/utils";
import { computeBladeLine } from "./blade-line";

type ProductLike = {
  id?: string;
  handle?: string | null;
  status?: string | null;
  metadata?: Record<string, unknown> | null;
};

/** Storefront `deriveBladeTypeSlug` ile aynı eşleme (değişirse ikisi birlikte). */
export function matrixBladeTypeFor(product: ProductLike): string {
  const meta = product.metadata || {};
  if (typeof meta.blade_type_slug === "string" && meta.blade_type_slug) {
    return meta.blade_type_slug;
  }
  const slug = String(product.handle || "").toLowerCase();
  if (/m51|m42|bimetal|bi-metal/.test(slug)) return "bi-metal";
  if (/carb(i|ü)de|karbur|karb[uü]r/.test(slug)) return "carbide";
  if (/wood|ah[sş]ap|spezial/.test(slug)) return "woodcut";
  if (/meat|kemik|hijyenik|et-/.test(slug)) return "meat-bone";
  if (/textile|s[uü]nger|tekstil/.test(slug)) return "textile";
  return "bi-metal";
}

/** Ürün ölçüye göre (matris fiyatlı) satılabilir mi? */
export function isConfigurableBlade(product: ProductLike): boolean {
  const meta = product.metadata || {};
  const readyMade = meta.is_ready_made === true || meta.is_ready_made === "true";
  const custom =
    meta.custom_length_enabled === true || meta.custom_length_enabled === "true";
  return !readyMade && custom;
}

const invalid = (msg: string) =>
  new MedusaError(MedusaError.Types.INVALID_DATA, msg);

/**
 * Matris fiyatının bu ürüne uygulanabileceğini doğrular; değilse
 * INVALID_DATA fırlatır. Ürün yayında olmalıdır.
 */
export function assertMatrixAllowedForProduct(
  product: ProductLike | null | undefined,
  bladeType: string,
  lengthMm: number
): void {
  if (!product || product.status !== "published") {
    throw invalid("Ürün bulunamadı.");
  }
  if (!isConfigurableBlade(product)) {
    throw invalid("Bu ürün ölçüye göre fiyatlandırılamaz.");
  }
  if (matrixBladeTypeFor(product) !== bladeType) {
    throw invalid("Seçilen bıçak türü bu ürünle uyuşmuyor.");
  }
  const meta = product.metadata || {};
  const min = Number(meta.min_length_mm);
  const max = Number(meta.max_length_mm);
  if (Number.isFinite(min) && min > 0 && lengthMm < min) {
    throw invalid(`Bu ürün için minimum uzunluk ${min} mm.`);
  }
  if (Number.isFinite(max) && max > 0 && lengthMm > max) {
    throw invalid(`Bu ürün için maksimum uzunluk ${max} mm.`);
  }
}

/** Varyantın ürününü (handle/status/metadata) getirir. */
export async function productForVariant(
  container: MedusaContainer,
  variantId: string
): Promise<ProductLike | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "product_variant",
    fields: ["id", "product.id", "product.handle", "product.status", "product.metadata"],
    filters: { id: variantId },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data?.[0] as any)?.product as ProductLike) ?? null;
}

/** Satır metadata'sı matris satırı mı? (cart-update ile aynı ölçüt) */
export function isMatrixLineMetadata(md: Record<string, unknown> | null | undefined): boolean {
  const m = md || {};
  return !!m.blade_type && !!Number(m.width_mm) && !!Number(m.thickness_mm) && !!Number(m.length_mm);
}

type CartItemLike = {
  id: string;
  variant_id?: string | null;
  quantity: number | string | { valueOf(): unknown };
  unit_price: number | string | { valueOf(): unknown };
  is_custom_price?: boolean | null;
  metadata?: Record<string, unknown> | null;
};

/**
 * Sepetteki her satırı doğrular (sipariş tamamlanmadan önce son kontrol):
 *  - Ölçüye göre ürün satırları matris fiyatıyla eklenmiş olmalı ve fiyatı,
 *    satırdaki ölçü + GÜNCEL adetten yeniden hesaplanan fiyatla aynı olmalı.
 *  - Matris metadata'sı taşıyan ama ölçüye göre olmayan ürün satırı reddedilir.
 */
export async function assertCartBladeLinesValid(
  container: MedusaContainer,
  items: CartItemLike[]
): Promise<void> {
  for (const it of items || []) {
    if (!it?.variant_id) continue;
    const md = (it.metadata || {}) as Record<string, unknown>;
    const product = await productForVariant(container, it.variant_id);
    const configurable = product ? isConfigurableBlade(product) : false;
    const matrixMeta = isMatrixLineMetadata(md);

    if (!configurable && !matrixMeta) continue; // sıradan ürün (hazır boy, makine…)

    if (configurable && !matrixMeta) {
      // Ölçüye göre ürün, matris dışından (standart uçla, katalog fiyatıyla)
      // eklenmiş — ölçü bilgisi olmadan üretilemez, fiyat da güvenilmez.
      throw invalid(
        "Sepetinizdeki ölçüye göre ürün geçersiz. Lütfen ürünü sepetten çıkarıp yeniden ekleyin."
      );
    }

    const bladeType = String(md.blade_type);
    const lengthMm = Number(md.length_mm);
    assertMatrixAllowedForProduct(product, bladeType, lengthMm);

    const quantity = Number(it.quantity?.valueOf?.() ?? it.quantity);
    const pricing = await computeBladeLine(container, {
      blade_type: bladeType,
      width_mm: Number(md.width_mm),
      thickness_mm: Number(md.thickness_mm),
      tooth_pitch: (md.tooth_pitch as string | null) ?? null,
      length_mm: lengthMm,
      quantity,
    });
    const unitPrice = Number(it.unit_price?.valueOf?.() ?? it.unit_price);
    if (!pricing || Math.abs(pricing.unit_price - unitPrice) > 0.01) {
      throw invalid(
        "Sepetinizdeki fiyatlar güncellendi. Lütfen sepetinizi yenileyip tekrar deneyin."
      );
    }
  }
}
