import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Adds two new band-saw products:
 *   1. Bi-Metal M51 (premium M51 grade, ~30% pricier than M42)
 *   2. Spezial Alman Çeliği (premium German carbon-steel wood blade)
 *
 * Run with:
 *   cd medusa-backend/apps/backend
 *   npx medusa exec ./src/scripts/seed-add-products.ts
 *
 * Skips creation if a product with the same handle already exists, so it's
 * safe to re-run.
 */

const WIDTHS_M51 = ["6mm", "10mm", "13mm", "20mm", "27mm", "34mm", "41mm"];
const THICKNESSES_M51 = ["0.65mm", "0.90mm", "1.10mm", "1.30mm"];
const TPIS_M51 = ["3/4 TPI", "4/6 TPI", "5/8 TPI", "6/10 TPI"];

const PRICE_BY_WIDTH_M51: Record<string, number> = {
  "6mm": 145, "10mm": 165, "13mm": 185, "20mm": 230,
  "27mm": 275, "34mm": 385, "41mm": 510,
};

const WIDTHS_SPEZIAL = ["13mm", "20mm", "27mm", "34mm", "41mm"];
const THICKNESSES_SPEZIAL = ["0.65mm", "0.90mm", "1.10mm"];
const TPIS_SPEZIAL = ["4/6 TPI", "6/10 TPI", "8/12 TPI", "10/14 TPI"];

const PRICE_BY_WIDTH_SPEZIAL: Record<string, number> = {
  "13mm": 95, "20mm": 115, "27mm": 145, "34mm": 195, "41mm": 250,
};

type VariantInput = {
  title: string;
  sku: string;
  manage_inventory: boolean;
  prices: Array<{ amount: number; currency_code: string }>;
  options: Record<string, string>;
  metadata?: Record<string, unknown>;
};

function buildVariants(
  priceMap: Record<string, number>,
  weldingCost: number,
  skuPrefix: string,
  widths: string[],
  thicknesses: string[],
  tpis: string[]
): VariantInput[] {
  const out: VariantInput[] = [];
  for (const w of widths) {
    const price = priceMap[w];
    if (typeof price !== "number") continue;
    for (const t of thicknesses) {
      for (const tpi of tpis) {
        out.push({
          title: `${w} / ${t} / ${tpi}`,
          sku: `${skuPrefix}-${w}-${t}-${tpi}`.replace(/[ /]/g, ""),
          manage_inventory: false,
          prices: [{ amount: price, currency_code: "try" }],
          options: { Genişlik: w, Kalınlık: t, "Diş Adımı": tpi },
          metadata: { welding_cost: weldingCost },
        });
      }
    }
  }
  return out;
}

export default async function seedAddProducts({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
  });
  const defaultSalesChannel = salesChannels[0];

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const defaultShippingProfile = shippingProfiles[0];

  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
  });
  const catByHandle = new Map(categories.map((c) => [c.handle, c.id]));

  async function productExists(handle: string): Promise<boolean> {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id"],
      filters: { handle },
    });
    return data.length > 0;
  }

  // ---------- 1. Bi-Metal M51 ----------
  if (await productExists("bimetal-m51")) {
    logger.info("bimetal-m51 already exists — skipping.");
  } else {
    logger.info("Creating Bi-Metal M51 Premium...");
    const m51Variants = buildVariants(
      PRICE_BY_WIDTH_M51, 110, "BIM51",
      WIDTHS_M51, THICKNESSES_M51, TPIS_M51
    );
    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: "Bi-Metal M51 Endüstriyel Şerit Testere Bıçağı",
            handle: "bimetal-m51",
            subtitle:
              "Sert alaşımlar ve yoğun sanayi kullanımı için üst seviye M51 kalite. M42'den %35 daha uzun ömür.",
            description:
              "M51 kalite şerit testerelerimiz, HSS-Co %10 diş uçları ve özel yay çeliği gövdesi ile en zorlu metal kesim koşullarında üstün performans sağlar. Sert alaşımlı çelikler, paslanmaz dolu profiller ve yoğun seri üretim atölyeleri için optimum çözüm.",
            status: ProductStatus.PUBLISHED,
            weight: 850,
            shipping_profile_id: defaultShippingProfile.id,
            category_ids: [
              catByHandle.get("bimetal-m51")!,
              catByHandle.get("bimetal")!,
            ].filter(Boolean),
            sales_channels: defaultSalesChannel ? [{ id: defaultSalesChannel.id }] : [],
            options: [
              { title: "Genişlik", values: WIDTHS_M51 },
              { title: "Kalınlık", values: THICKNESSES_M51 },
              { title: "Diş Adımı", values: TPIS_M51 },
            ],
            variants: m51Variants,
            metadata: {
              blade_type: "M51",
              material_usage: ["metal", "stainless", "alloy", "heavy_industry"],
              tooth_pitch: TPIS_M51,
              custom_length_enabled: true,
              min_length_mm: 1500,
              max_length_mm: 15000,
              price_calculation_type: "per_meter",
              welding_cost: 110,
              product_type: "blade",
              applications: [
                "Sert ve alaşımlı çelikler (4140, 4340, 8620)",
                "Paslanmaz çelik dolu profiller",
                "Yüksek karbonlu yaylık çelikler",
                "Yoğun seri üretim atölye uygulamaları",
              ],
              technical_features: [
                "HSS-Co %10 diş uçları — M42'ye göre %35 daha uzun ömür",
                "Üst düzey ısıl işlemli yay çeliği gövde, yüksek yorulma dayanımı",
                "Variable Pitch (Vario) diş geometrisi — titreşim ve gürültüde belirgin azalma",
              ],
              is_best_seller: true,
              best_seller_rank: 4,
              rating: 4.9,
              reviews_count: 156,
              sold_count: "1.900",
              seo_title: "M51 Bi-Metal Şerit Testere | Endüstriyel Premium",
              seo_description:
                "Sert alaşımlar ve yoğun sanayi kesim için M51 bi-metal şerit testere. M42'den %35 daha uzun ömür.",
            },
          },
        ],
      },
    });
    logger.info("Bi-Metal M51 created ✓");
  }

  // ---------- 2. Spezial Alman Çeliği (premium wood blade) ----------
  if (await productExists("spezial-alman-celigi")) {
    logger.info("spezial-alman-celigi already exists — skipping.");
  } else {
    logger.info("Creating Spezial Alman Çeliği...");
    const spezialVariants = buildVariants(
      PRICE_BY_WIDTH_SPEZIAL, 80, "SPEZ",
      WIDTHS_SPEZIAL, THICKNESSES_SPEZIAL, TPIS_SPEZIAL
    );
    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: "Spezial Alman Çeliği Ahşap Şerit Testere",
            handle: "spezial-alman-celigi",
            subtitle:
              "Premium Alman karbon çeliği — sert ve egzotik ağaçların hassas dilimlenmesi için profesyonel marangoz seçimi.",
            description:
              "Almanya'da üretilen C75S karbon çeliği gövde ve özel tavlamalı diş yapısıyla, en sert tropikal ağaçlardan ince mobilya kaplama dilimlerine kadar geniş bir yelpazede kusursuz kesim performansı. Yüksek gerilim mukavemeti sayesinde küçük kasnaklı makinelerde dahi çatlamadan uzun süre çalışır.",
            status: ProductStatus.PUBLISHED,
            weight: 720,
            shipping_profile_id: defaultShippingProfile.id,
            category_ids: [catByHandle.get("wood")!].filter(Boolean),
            sales_channels: defaultSalesChannel ? [{ id: defaultSalesChannel.id }] : [],
            options: [
              { title: "Genişlik", values: WIDTHS_SPEZIAL },
              { title: "Kalınlık", values: THICKNESSES_SPEZIAL },
              { title: "Diş Adımı", values: TPIS_SPEZIAL },
            ],
            variants: spezialVariants,
            metadata: {
              blade_type: "C75S — Alman Karbon Çeliği",
              material_usage: ["wood", "hardwood", "exotic_wood"],
              tooth_pitch: TPIS_SPEZIAL,
              custom_length_enabled: true,
              min_length_mm: 1000,
              max_length_mm: 10000,
              price_calculation_type: "per_meter",
              welding_cost: 80,
              product_type: "blade",
              applications: [
                "Tropikal sert ağaçlar (Iroko, Wenge, Sapele, Meşe)",
                "İnce mobilya kaplama dilimleme",
                "Hassas marangozluk ve enstrüman yapımı",
                "Yaş, kuru ve donmuş ağaç bloklarının dilimlenmesi",
              ],
              technical_features: [
                "Alman C75S premium karbon çeliği — endüstri standardı",
                "Özel tavlamalı diş — uzun süreli keskinlik ve kolay bileme",
                "Yüksek gövde esnekliği — küçük kasnaklarda dahi çatlama yapmaz",
                "Geniş diş aralığı (gullet) ile hızlı talaş tahliyesi",
              ],
              is_best_seller: true,
              best_seller_rank: 5,
              rating: 4.8,
              reviews_count: 112,
              sold_count: "1.450",
              seo_title: "Spezial Alman Çeliği Ahşap Şerit Testere | Premium C75S",
              seo_description:
                "Alman C75S karbon çeliğinden üretilmiş premium ahşap şerit testere. Sert ve egzotik ağaçlar için ideal.",
            },
          },
        ],
      },
    });
    logger.info("Spezial Alman Çeliği created ✓");
  }

  logger.info("=== Done ===");
}
