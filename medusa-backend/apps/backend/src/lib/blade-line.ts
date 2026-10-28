/**
 * Matris fiyatlı şerit bıçak satır hesabı — TEK KAYNAK.
 *
 * Bu matematik daha önce yalnızca /store/blade-price/cart-add içindeydi.
 * Danışman sohbetinden de sepete ekleme yapılacağı için buraya çıkarıldı;
 * iki uç da aynı fonksiyonu çağırır. Para hesabının iki kopyası olması
 * uzun vadede fiyat farkı üretir — o yüzden kopyalamak yerine paylaşıyoruz.
 *
 * Formül (cart-add'deki davranışla birebir aynı):
 *   blade_unit_price      = price_per_meter × length_mm / 1000
 *   subtotal              = blade_unit_price × quantity
 *   total_before_discount = (blade_unit_price + welding_fee) × quantity
 *                           (her bıçak ayrı kaynatılır → kaynak ücreti ADET BAŞINA)
 *   total_price           = total_before_discount × (100 - indirim) / 100
 *   unit_price            = total_price / quantity     (indirim amortize)
 */
import type { MedusaContainer } from "@medusajs/framework/types";
import type BladePriceMatrixService from "../modules/blade-price-matrix/service";
import { BLADE_PRICE_MATRIX_MODULE } from "../modules/blade-price-matrix";

export interface BladeLineInput {
  blade_type: string;
  width_mm: number;
  thickness_mm: number;
  tooth_pitch?: string | null;
  length_mm: number;
  quantity: number;
}

export interface BladeLinePricing {
  /** Kaynak dahil, adet indirimi amortize edilmiş birim fiyat. */
  unit_price: number;
  total_price: number;
  total_before_discount: number;
  discount_percent: number;
  welding_fee: number;
  currency_code: string;
  /** Sepet satırına yazılacak metadata (sepet/sipariş ekranları bunu okur). */
  metadata: Record<string, unknown>;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Adet kademesi indirimi — storefront'taki BladeConfigurator tablosuyla
 * birebir aynı. Sunucuda uygulanır ki sepette ve checkout'ta da görünsün.
 */
export function qtyDiscountPercent(quantity: number): number {
  if (quantity >= 10) return 15;
  if (quantity >= 5) return 10;
  if (quantity >= 3) return 5;
  return 0;
}

/**
 * Matristen fiyatı okur ve sepete eklenebilir satır verisini üretir.
 * Kombinasyon için tanımlı satır yoksa `null` döner (çağıran 404 vermeli).
 */
export async function computeBladeLine(
  container: MedusaContainer,
  input: BladeLineInput
): Promise<BladeLinePricing | null> {
  const svc = container.resolve<BladePriceMatrixService>(
    BLADE_PRICE_MATRIX_MODULE
  );

  const rows = await svc.listBladePrices({
    is_active: true,
    blade_type: input.blade_type,
    width_mm: input.width_mm,
    thickness_mm: input.thickness_mm,
    tooth_pitch: input.tooth_pitch ?? null,
  });
  if (rows.length === 0) return null;

  const row = rows[0] as {
    price_per_meter: number | string;
    welding_fee: number | string;
    currency_code: string;
  };

  const pricePerMeter = Number(row.price_per_meter);
  const weldingFee = Number(row.welding_fee ?? 0);
  const lengthMeter = input.length_mm / 1000;
  const quantity = Math.max(1, input.quantity);

  const bladeUnitPrice = pricePerMeter * lengthMeter;
  const subtotal = bladeUnitPrice * quantity;
  const totalBeforeDiscount = (bladeUnitPrice + weldingFee) * quantity;

  const discountPercent = qtyDiscountPercent(quantity);
  const totalPrice =
    discountPercent > 0
      ? (totalBeforeDiscount * (100 - discountPercent)) / 100
      : totalBeforeDiscount;

  const amortizedUnitPrice = round2(totalPrice / quantity);

  return {
    unit_price: amortizedUnitPrice,
    total_price: round2(totalPrice),
    total_before_discount: round2(totalBeforeDiscount),
    discount_percent: discountPercent,
    welding_fee: round2(weldingFee),
    currency_code: row.currency_code,
    metadata: {
      product_type: "blade",
      blade_type: input.blade_type,
      width_mm: input.width_mm,
      thickness_mm: input.thickness_mm,
      tooth_pitch: input.tooth_pitch ?? null,
      length_mm: input.length_mm,
      length_meter: round2(lengthMeter),
      price_per_meter: round2(pricePerMeter),
      welding_fee: round2(weldingFee),
      blade_unit_price: round2(bladeUnitPrice),
      unit_price: amortizedUnitPrice,
      subtotal: round2(subtotal),
      total_before_discount: round2(totalBeforeDiscount),
      discount_percent: discountPercent,
      total_price: round2(totalPrice),
      currency_code: row.currency_code,
      // Sepet/sipariş ekranlarının beklediği eski anahtarlar
      width: `${input.width_mm}mm`,
      thickness: `${input.thickness_mm}mm`,
      tpi: input.tooth_pitch ? `${input.tooth_pitch} TPI` : "—",
      custom_length_mm: input.length_mm,
      welding: weldingFee > 0,
      unit_price_at_add: amortizedUnitPrice,
    },
  };
}
