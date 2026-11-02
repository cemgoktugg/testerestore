/**
 * Bayi fiyatları — TEK KAYNAK.
 *
 * İki fiyat sistemi var, ikisi de aynı bayi kaydına bağlıdır:
 *  - Ölçüye göre bıçaklar: `dealer_blade_price`. Bu satırlar sepette elle
 *    fiyatlıdır (is_custom_price), Medusa'nın fiyat listesi onları görmez.
 *  - Hazır boy, makine ve diğer ürünler: Medusa fiyat listesi (kural: bayinin
 *    müşteri grubu). Sepet ve mağaza API'si bu fiyatı kendisi uygular.
 *
 * Kurallar:
 *  - Sepet fiyatının dayanağı `cart.customer_id`'dir. Bu yüzden bir sepet
 *    yalnızca giriş yapmış bayinin kendisi tarafından bayiye bağlanabilir
 *    (bkz. workflows/hooks/guard-dealer-cart-binding.ts).
 *  - Bayi fiyatı girilmiş satıra adet indirimi uygulanmaz; fiyat zaten
 *    pazarlıklıdır. Bayi fiyatı girilmemiş satır genel fiyat ve genel adet
 *    indirimiyle satılır.
 */
import type { MedusaContainer } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules, QueryContext } from "@medusajs/framework/utils";
import { isConfigurableBlade, matrixBladeTypeFor } from "./blade-guard";
import { DEALER_PRICING_MODULE } from "../modules/dealer-pricing";
import type DealerPricingService from "../modules/dealer-pricing/service";

export type DealerRecord = {
  id: string;
  customer_id: string;
  company_name: string;
  is_active: boolean;
  customer_group_id: string;
  price_list_id: string;
  note?: string | null;
};

type Amount = number | string | null | undefined;

export const DEALER_LOGIN_REQUIRED =
  "Bu e-posta ile kayıtlı bir hesap var. Devam etmek için lütfen giriş yapın.";

export interface BladeRates {
  pricePerMeter: number;
  weldingFee: number;
  dealerPrice: boolean;
}

export const dealerService = (container: MedusaContainer) =>
  container.resolve<DealerPricingService>(DEALER_PRICING_MODULE);

const isSet = (v: Amount) => v !== null && v !== undefined && v !== "";

/** Matris satırı ile bayi fiyatını birleştirir; boş alan genel fiyatı kullanır. */
export function mergeBladeRates(
  row: { price_per_meter: Amount; welding_fee: Amount },
  override?: { price_per_meter?: Amount; welding_fee?: Amount } | null
): BladeRates {
  const hasMeter = isSet(override?.price_per_meter);
  const hasWeld = isSet(override?.welding_fee);
  return {
    pricePerMeter: Number(hasMeter ? override?.price_per_meter : row.price_per_meter),
    weldingFee: Number((hasWeld ? override?.welding_fee : row.welding_fee) ?? 0),
    dealerPrice: hasMeter || hasWeld,
  };
}

export async function findActiveDealer(
  container: MedusaContainer,
  customerId?: string | null
): Promise<DealerRecord | null> {
  if (!customerId) return null;
  const [dealer] = await dealerService(container).listDealers(
    { customer_id: customerId, is_active: true },
    { take: 1 }
  );
  return (dealer as unknown as DealerRecord) ?? null;
}

/** E-posta aktif bir bayinin hesabına mı ait? */
export async function isDealerEmail(
  container: MedusaContainer,
  email?: string | null
): Promise<boolean> {
  if (!email) return false;
  const customers = await container
    .resolve(Modules.CUSTOMER)
    .listCustomers(
      { email: email.trim().toLowerCase(), has_account: true },
      { select: ["id"], take: 1 }
    );
  return !!(await findActiveDealer(container, customers[0]?.id));
}

/** Müşteri aktif bayiyse o matris satırındaki kendi fiyatını, değilse genel fiyatı verir. */
export async function resolveBladeRates(
  container: MedusaContainer,
  row: { id: string; price_per_meter: Amount; welding_fee: Amount },
  customerId?: string | null
): Promise<BladeRates> {
  const dealer = await findActiveDealer(container, customerId);
  if (!dealer) return mergeBladeRates(row);
  const [override] = await dealerService(container).listDealerBladePrices(
    { dealer_id: dealer.id, blade_price_id: row.id },
    { take: 1 }
  );
  return mergeBladeRates(row, override as never);
}

/** Bayinin fiyat listesindeki varyant fiyatları (variant_id → fiyat). */
export async function listDealerVariantPrices(
  container: MedusaContainer,
  priceListId: string
): Promise<Map<string, { price_id: string; amount: number }>> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "price_list",
    fields: ["id", "prices.id", "prices.amount", "prices.price_set.variant.id"],
    filters: { id: priceListId },
  });
  const map = new Map<string, { price_id: string; amount: number }>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of ((data?.[0] as any)?.prices ?? []) as any[]) {
    const variantId = p?.price_set?.variant?.id;
    if (variantId) map.set(variantId, { price_id: p.id, amount: Number(p.amount) });
  }
  return map;
}

/**
 * Ölçüye göre satılan ürünler. Aynı matrisi birden çok ürün kullanabilir
 * (Bi-Metal: M42 ve M51), bu yüzden teklifte hangisi olduğu ayrıca seçilir.
 */
export async function listConfigurableProducts(container: MedusaContainer) {
  const { data } = await container.resolve(ContainerRegistrationKeys.QUERY).graph({
    entity: "product",
    fields: ["id", "title", "handle", "status", "metadata", "created_at", "variants.id"],
    filters: { status: "published" } as never,
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[])
    .filter((p) => isConfigurableBlade(p) && p.variants?.[0]?.id)
    .map((p) => ({
      blade_type: matrixBladeTypeFor(p),
      variant_id: p.variants[0].id as string,
      title: p.title as string,
    }))
    .sort((a, b) => a.title.localeCompare(b.title, "tr"));
}

/**
 * Satılabilir tüm varyantlar ve genel fiyatları. Ölçüye göre ürünler hariç:
 * onların fiyatı varyanttan değil matristen gelir.
 */
export async function listSellableVariants(container: MedusaContainer) {
  const [region] = await container
    .resolve(Modules.REGION)
    .listRegions({ currency_code: "try" }, { select: ["id"], take: 1 });
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "product_variant",
    fields: [
      "id",
      "title",
      "sku",
      "product.id",
      "product.title",
      "product.status",
      "product.handle",
      "product.metadata",
      "calculated_price.calculated_amount",
    ],
    context: {
      calculated_price: QueryContext({
        currency_code: "try",
        ...(region ? { region_id: region.id } : {}),
      }),
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).filter(
    (v) => v.product?.status === "published" && !isConfigurableBlade(v.product)
  );
}
