import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";

/**
 * Hazır boy şerit testere ürünleri.
 *
 * Müşteri konfiguratörde bir uzunluk girdiğinde, eğer aynı ölçülerde
 * "hazır" bir ürünümüz varsa popup ile önereceğiz. Bu script Bi-Metal
 * M42 için 2000 mm boyunda üç farklı kombinasyon oluşturur.
 *
 * Metadata anahtarları:
 *   - is_ready_made: true        (suggestion endpoint bunu arar)
 *   - blade_type: "bi-metal"     (matrix slug ile uyumlu)
 *   - width_mm, thickness_mm, tooth_pitch, length_mm
 *
 * Run:
 *   npx medusa exec ./src/scripts/seed-ready-made-blades.ts
 */
export default async function seedReadyMadeBlades({ container }: ExecArgs) {
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

  // Bi-Metal M42 için 2000 mm hazır ürünler.
  // (width_mm × thickness_mm × tooth_pitch × length_mm × price TRY)
  const READY: Array<{
    handle: string;
    title: string;
    width_mm: number;
    thickness_mm: number;
    tooth_pitch: string;
    length_mm: number;
    price: number;
    inventory: number;
  }> = [
    {
      handle: "bimetal-m42-27-09-46-2000-hazir",
      title: "Bi-Metal M42 Hazır — 27 × 0.9 × 4/6 TPI × 2000 mm",
      width_mm: 27, thickness_mm: 0.9, tooth_pitch: "4/6", length_mm: 2000,
      price: 1090, inventory: 12,
    },
    {
      handle: "bimetal-m42-27-09-34-2000-hazir",
      title: "Bi-Metal M42 Hazır — 27 × 0.9 × 3/4 TPI × 2000 mm",
      width_mm: 27, thickness_mm: 0.9, tooth_pitch: "3/4", length_mm: 2000,
      price: 1090, inventory: 8,
    },
    {
      handle: "bimetal-m42-34-11-46-2000-hazir",
      title: "Bi-Metal M42 Hazır — 34 × 1.1 × 4/6 TPI × 2000 mm",
      width_mm: 34, thickness_mm: 1.1, tooth_pitch: "4/6", length_mm: 2000,
      price: 1480, inventory: 5,
    },
  ];

  let created = 0;
  for (const r of READY) {
    if (await productExists(r.handle)) {
      logger.info(`${r.handle} — zaten var, atlandı.`);
      continue;
    }
    await createProductsWorkflow(container).run({
      input: {
        products: [
          {
            title: r.title,
            handle: r.handle,
            subtitle: `${r.length_mm} mm hazır kaynaklı — aynı gün kargoda`,
            description: `Bi-Metal M42 ${r.width_mm} mm genişlik, ${r.thickness_mm} mm kalınlık, ${r.tooth_pitch} TPI hatve, ${r.length_mm} mm boy. Önceden kaynaklı, hazır stoğumuzda — aynı gün kargolanır.`,
            status: ProductStatus.PUBLISHED,
            weight: 600,
            shipping_profile_id: defaultShippingProfile.id,
            category_ids: [
              catByHandle.get("bimetal-m42"),
              catByHandle.get("bimetal"),
              catByHandle.get("hazir-uirunler"),
            ].filter(Boolean) as string[],
            sales_channels: defaultSalesChannel
              ? [{ id: defaultSalesChannel.id }]
              : [],
            // Hazır ürün — opsiyon/variant matrisi yok, tek SKU
            options: [{ title: "Hazır Boy", values: ["Tek Beden"] }],
            variants: [
              {
                title: "Tek Beden",
                sku: r.handle.toUpperCase().replace(/-/g, ""),
                manage_inventory: false,
                prices: [{ amount: r.price, currency_code: "try" }],
                options: { "Hazır Boy": "Tek Beden" },
              },
            ],
            metadata: {
              // Suggestion endpoint'in aradığı anahtarlar
              is_ready_made: true,
              blade_type: "bi-metal",
              width_mm: r.width_mm,
              thickness_mm: r.thickness_mm,
              tooth_pitch: r.tooth_pitch,
              length_mm: r.length_mm,
              inventory_quantity_display: r.inventory,
              // Genel
              product_type: "blade",
              custom_length_enabled: false,
              applications: [
                "Hızlı teslimat gerektiren acil kesim işleri",
                "Standart 2000 mm bant boyu olan makineler",
              ],
              technical_features: [
                "Önceden alın kaynaklı — montaja hazır",
                "Stoktan, aynı gün kargoda",
                "Bi-Metal M42 (Co %8) — yüksek aşınma direnci",
              ],
              seo_title: `Bi-Metal M42 ${r.width_mm}×${r.thickness_mm} ${r.tooth_pitch} TPI ${r.length_mm}mm Hazır Şerit Testere`,
              seo_description: `${r.length_mm} mm boy, ${r.width_mm} mm genişlik bi-metal şerit testere. Stoğumuzda, aynı gün kargoda. ${r.price.toLocaleString("tr-TR")} TL.`,
              seo_keywords: `hazır şerit testere, ${r.length_mm}mm bi-metal, ${r.width_mm}mm bant`,
            },
          },
        ],
      },
    });
    logger.info(`✓ ${r.handle} oluşturuldu.`);
    created++;
  }

  logger.info(
    `=== Hazır ürün seed bitti: ${created} yeni / ${READY.length} toplam ===`
  );
}
