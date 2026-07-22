import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Seeds template products for empty categories (Et ve Kemik, Sünger/Tekstil).
 *
 * Run with:
 *   cd medusa-backend/apps/backend
 *   npx medusa exec ./src/scripts/seed-meat-bone-textile.ts
 *
 * After seeding, in Admin → Products → click any of these → "Clone" to
 * spawn a copy that keeps the same category, options and metadata structure.
 * Skips creation if the product already exists.
 */

const MEAT_WIDTHS = ["13mm", "16mm", "19mm", "20mm", "25mm"];
const MEAT_THICKNESSES = ["0.45mm", "0.55mm", "0.65mm"];
const MEAT_TPIS = ["3 TPI", "4 TPI", "6 TPI"];

const MEAT_PRICE_BY_WIDTH: Record<string, number> = {
  "13mm": 85, "16mm": 95, "19mm": 105, "20mm": 110, "25mm": 135,
};

const TEXTILE_WIDTHS = ["6mm", "10mm", "13mm", "20mm", "27mm"];
const TEXTILE_THICKNESSES = ["0.45mm", "0.55mm"];
const TEXTILE_TPIS = ["Diş Tarağı (Wave)", "Diş Tarağı (Scallop)", "Düz Bıçak"];

const TEXTILE_PRICE_BY_WIDTH: Record<string, number> = {
  "6mm": 70, "10mm": 80, "13mm": 95, "20mm": 120, "27mm": 155,
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
          sku: `${skuPrefix}-${w}-${t}-${tpi}`.replace(/[ /]/g, "").replace(/[()]/g, ""),
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

export default async function seedMeatBoneTextile({ container }: ExecArgs) {
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

  // ---------- 1. Et ve Kemik — Hijyenik Kasap Şerit Testere ----------
  if (await productExists("hijyenik-et-kemik-pro")) {
    logger.info("hijyenik-et-kemik-pro already exists — skipping.");
  } else {
    logger.info("Creating Hijyenik Et & Kemik Pro...");
    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: "Hijyenik Et & Kemik Pro Şerit Testere Bıçağı",
            handle: "hijyenik-et-kemik-pro",
            subtitle:
              "Gıda hattı ve kasap atölyeleri için hijyenik paslanmaz alaşım gövde. Et, kemik ve donmuş ürünlerde temiz, çapaksız kesim.",
            description:
              "AISI 420 paslanmaz çelik gövde ve hassas tavlanmış diş yapısıyla, gıda işleme standartlarına uygun şerit testere bıçağı. Kemik dilimleme, et porsiyonlama ve donmuş gıda kesimi için optimize edilmiştir. Kolay temizlenir, korozyona dayanıklıdır.",
            status: ProductStatus.PUBLISHED,
            weight: 650,
            shipping_profile_id: defaultShippingProfile.id,
            category_ids: [catByHandle.get("meat-bone")!].filter(Boolean),
            sales_channels: defaultSalesChannel ? [{ id: defaultSalesChannel.id }] : [],
            options: [
              { title: "Genişlik", values: MEAT_WIDTHS },
              { title: "Kalınlık", values: MEAT_THICKNESSES },
              { title: "Diş Adımı", values: MEAT_TPIS },
            ],
            variants: buildVariants(MEAT_PRICE_BY_WIDTH, 70, "MEATBONE",
              MEAT_WIDTHS, MEAT_THICKNESSES, MEAT_TPIS),
            metadata: {
              blade_type: "AISI 420 Paslanmaz",
              material_usage: ["meat", "bone", "frozen_food"],
              tooth_pitch: MEAT_TPIS,
              custom_length_enabled: true,
              min_length_mm: 1500,
              max_length_mm: 6000,
              price_calculation_type: "per_meter",
              welding_cost: 70,
              product_type: "blade",
              applications: [
                "Sığır, kuzu, tavuk gövde dilimleme",
                "Kemik kesimi (T-Bone, kotlet, biftek)",
                "Donmuş et ve balık porsiyonlama",
                "Endüstriyel et işleme tesisleri",
              ],
              technical_features: [
                "AISI 420 gıda sınıfı paslanmaz çelik — korozyon ve kimyasal direnci",
                "Hassas hatve dağılımı — temiz, çapaksız kesim yüzeyi",
                "Otomatik bulaşık makinesinde yıkanabilir hijyenik yüzey",
                "Düşük sürtünme — ısınma kaynaklı et bozulmasını önler",
              ],
              is_best_seller: true,
              best_seller_rank: 6,
              rating: 4.8,
              reviews_count: 92,
              sold_count: "780",
              seo_title: "Et ve Kemik Şerit Testere | Hijyenik Paslanmaz Pro",
              seo_description:
                "Gıda işleme tesisleri ve kasaplar için AISI 420 paslanmaz hijyenik şerit testere. Kemik dilimleme ve et porsiyonlama için ideal.",
            },
          },
        ],
      },
    });
    logger.info("Hijyenik Et & Kemik Pro created ✓");
  }

  // ---------- 2. Sünger / Tekstil — Endüstriyel Tekstil Kesim Bıçağı ----------
  if (await productExists("sunger-tekstil-pro")) {
    logger.info("sunger-tekstil-pro already exists — skipping.");
  } else {
    logger.info("Creating Sünger & Tekstil Kesim Pro...");
    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: "Sünger & Tekstil Kesim Bıçağı Pro",
            handle: "sunger-tekstil-pro",
            subtitle:
              "Sünger, köpük, mobilya kumaşı ve teknik tekstil için pürüzsüz kavisli kesim. Ultra ince keskin ağız.",
            description:
              "Yatak ve mobilya endüstrisi için tasarlanmış özel diş profili. Açık hücreli sünger, viskoelastik köpük, döşeme kumaşı ve teknik tekstil katmanlarında temiz, çapaksız kesim sağlar. Düşük titreşim, uzun bilenme ömrü.",
            status: ProductStatus.PUBLISHED,
            weight: 480,
            shipping_profile_id: defaultShippingProfile.id,
            category_ids: [catByHandle.get("sponge-textile")!].filter(Boolean),
            sales_channels: defaultSalesChannel ? [{ id: defaultSalesChannel.id }] : [],
            options: [
              { title: "Genişlik", values: TEXTILE_WIDTHS },
              { title: "Kalınlık", values: TEXTILE_THICKNESSES },
              { title: "Diş Adımı", values: TEXTILE_TPIS },
            ],
            variants: buildVariants(TEXTILE_PRICE_BY_WIDTH, 60, "TEXTILE",
              TEXTILE_WIDTHS, TEXTILE_THICKNESSES, TEXTILE_TPIS),
            metadata: {
              blade_type: "Hassas Tekstil Çeliği",
              material_usage: ["sponge", "foam", "textile", "leather"],
              tooth_pitch: TEXTILE_TPIS,
              custom_length_enabled: true,
              min_length_mm: 1000,
              max_length_mm: 8000,
              price_calculation_type: "per_meter",
              welding_cost: 60,
              product_type: "blade",
              applications: [
                "Yatak ve şilte üretiminde sünger dilimleme",
                "Mobilya döşeme kumaşı kesim hattı",
                "Viskoelastik (memory foam) blok dilimleme",
                "Otomotiv döşeme ve teknik tekstil katmanları",
              ],
              technical_features: [
                "Wave / Scallop diş profili seçenekleri — malzemeye göre optimize",
                "Ultra keskin diş geometrisi — temiz, lifsiz kesim yüzeyi",
                "Yüksek esneklik — geniş kavisli kesimlere uyum",
                "Kolayca bilenebilir, uzun kullanım ömrü",
              ],
              is_best_seller: true,
              best_seller_rank: 7,
              rating: 4.7,
              reviews_count: 64,
              sold_count: "540",
              seo_title: "Sünger ve Tekstil Şerit Testere | Endüstriyel Pro",
              seo_description:
                "Sünger, köpük, mobilya kumaşı ve teknik tekstil için profesyonel şerit testere bıçağı.",
            },
          },
        ],
      },
    });
    logger.info("Sünger & Tekstil Kesim Pro created ✓");
  }

  logger.info("=== Done ===");
}
