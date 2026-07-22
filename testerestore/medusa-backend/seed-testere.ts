/**
 * Custom Medusa v2 seed script for TestereStore.
 *
 * USAGE — copy this file into the Medusa backend's src/scripts/ directory
 * after running `create-medusa-app`, then run:
 *
 *   npx medusa exec ./src/scripts/seed-testere.ts
 *
 * It creates: categories, options matrix products with variants, prices in
 * TRY, and the full BladeProductMetadata structure the frontend expects.
 *
 * Requires:
 *   - At least one Region in the database (TR + TRY recommended)
 *   - Default sales channel
 *   - A publishable API key linked to that channel
 */

import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
} from "@medusajs/medusa/core-flows";
import { ExecArgs } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

const CATEGORIES = [
  { name: "Bi-Metal", handle: "bimetal" },
  { name: "Bi-Metal M42", handle: "bimetal-m42", parent: "bimetal" },
  { name: "Bi-Metal M51", handle: "bimetal-m51", parent: "bimetal" },
  { name: "Ahşap", handle: "wood" },
  { name: "Et ve Kemik", handle: "meat-bone" },
  { name: "Sünger / Tekstil", handle: "sponge-textile" },
  { name: "Karbür Uçlu", handle: "carbide-tipped" },
  { name: "Makineler", handle: "machines" },
];

const WIDTHS = ["6mm", "10mm", "13mm", "20mm", "27mm", "34mm", "41mm"];
const THICKNESSES = ["0.65mm", "0.90mm", "1.10mm", "1.30mm"];
const TPIS = ["3/4 TPI", "4/6 TPI", "5/8 TPI", "6/10 TPI", "8/12 TPI", "10/14 TPI"];

// Per-meter price (TRY) per width — overridden by product if needed
const PRICE_BY_WIDTH: Record<string, number> = {
  "6mm": 110, "10mm": 125, "13mm": 140, "20mm": 175,
  "27mm": 210, "34mm": 295, "41mm": 390,
};

export default async function seedTestere({ container }: ExecArgs) {
  const logger = container.resolve("logger");
  const link = container.resolve("link");
  const salesChannelModule = container.resolve(Modules.SALES_CHANNEL);
  const regionModule = container.resolve(Modules.REGION);

  // 1. Region check
  const [region] = await regionModule.listRegions({ name: "Türkiye" });
  if (!region) {
    throw new Error(
      "Önce admin panelinden 'Türkiye' bölgesini TRY currency ile oluşturun."
    );
  }
  logger.info(`Region resolved: ${region.id}`);

  const [salesChannel] = await salesChannelModule.listSalesChannels({
    name: "Default Sales Channel",
  });

  // 2. Categories
  logger.info("Creating categories...");
  const categoryMap = new Map<string, string>();
  for (const cat of CATEGORIES) {
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: [
          {
            name: cat.name,
            handle: cat.handle,
            is_active: true,
            parent_category_id: cat.parent
              ? categoryMap.get(cat.parent) ?? null
              : null,
          },
        ],
      },
    });
    categoryMap.set(cat.handle, result[0].id);
  }

  // 3. Products — Bi-Metal M42 with full variant matrix
  logger.info("Creating M42 Premium product (matrix variants)...");
  const variants = WIDTHS.flatMap((w) =>
    THICKNESSES.filter((t) => parseFloat(t) >= parseFloat(w) / 50).flatMap((t) =>
      TPIS.slice(0, 4).map((tpi) => ({
        title: `${w} / ${t} / ${tpi}`,
        sku: `BIM42-${w}-${t}-${tpi}`.replace(/[ /]/g, ""),
        manage_inventory: false,
        prices: [
          { amount: PRICE_BY_WIDTH[w], currency_code: "try", region_id: region.id },
        ],
        options: { Genişlik: w, Kalınlık: t, "Diş Adımı": tpi },
        metadata: { welding_cost: 90 },
      }))
    )
  );

  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Bi-Metal M42 Premium Şerit Testere Bıçağı",
          handle: "bimetal-premium",
          subtitle:
            "Yüksek hız çeliği dişleri ve yay çeliği gövdesi ile genel metal, profil ve boru kesimlerinde mükemmel ömür ve yüksek aşınma direnci.",
          description:
            "M42 kalite şerit testerelerimiz, yüksek kaliteli HSS (Co %8) diş uçları ve esnek yay çeliği gövdesi sayesinde her türlü çelik kesiminde üstün performans sunar.",
          status: "published" as const,
          category_ids: [
            categoryMap.get("bimetal-m42")!,
            categoryMap.get("bimetal")!,
          ].filter(Boolean),
          sales_channels: salesChannel ? [{ id: salesChannel.id }] : [],
          options: [
            { title: "Genişlik", values: WIDTHS },
            { title: "Kalınlık", values: THICKNESSES },
            { title: "Diş Adımı", values: TPIS },
          ],
          variants,
          metadata: {
            blade_type: "M42",
            material_usage: ["metal", "profile", "solid"],
            tooth_pitch: TPIS.slice(0, 4),
            custom_length_enabled: true,
            min_length_mm: 1000,
            max_length_mm: 15000,
            price_calculation_type: "per_meter",
            welding_cost: 90,
            product_type: "blade",
            applications: [
              "Yapısal çelikler ve profiller",
              "İnce ve kalın etli çelik borular",
              "Düşük alaşımlı dolu çelik malzemeler",
            ],
            technical_features: [
              "IDEAL marka makinelerde kusursuz kaynak garantisi",
              "Isıl işlemli HSS M42 dişler ile maksimum körelme mukavemeti",
              "Gelişmiş değişken diş adımı (Vario) tasarımı",
            ],
            is_best_seller: true,
            best_seller_rank: 1,
            rating: 4.9,
            reviews_count: 312,
            sold_count: "5.200",
            seo_title: "M42 Bi-Metal Şerit Testere | Premium Kalite",
            seo_description:
              "Metal kesimi için yüksek performanslı M42 bi-metal şerit testere.",
          },
        },
      ],
    },
  });

  // 4. Machine product (single variant)
  logger.info("Creating Kraken machine...");
  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Kraken Professional Şerit Testere Makinesi",
          handle: "kraken-machine",
          subtitle:
            "Profesyonel atölyeler için tasarlanmış, güçlü motorlu, hassas kılavuz rulmanlı ve döküm gövde yapılı şerit testere makinesi.",
          status: "published" as const,
          category_ids: [categoryMap.get("machines")!].filter(Boolean),
          sales_channels: salesChannel ? [{ id: salesChannel.id }] : [],
          options: [{ title: "Konfigürasyon", values: ["Standart"] }],
          variants: [
            {
              title: "Kraken Standart",
              sku: "KRAKEN-STD",
              manage_inventory: false,
              prices: [
                { amount: 48500, currency_code: "try", region_id: region.id },
              ],
              options: { Konfigürasyon: "Standart" },
            },
          ],
          metadata: {
            product_type: "machine",
            custom_length_enabled: false,
            price_calculation_type: "fixed",
            is_best_seller: true,
            best_seller_rank: 3,
            rating: 5.0,
            reviews_count: 94,
            sold_count: "320",
            technical_features: [
              "2.2 kW yüksek torklu bakır sargı elektrik motoru",
              "Hassas optik lazer kesim çizgi kılavuzu",
              "Acil stop anahtarı",
            ],
          },
        },
      ],
    },
  });

  logger.info("✅ TestereStore seed completed.");
  void link; // reserved for future product↔channel link operations
}
