import { ExecArgs } from "@medusajs/framework/types";
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils";
import {
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createTaxRegionsWorkflow,
  deleteProductsWorkflow,
  updateStoresWorkflow,
} from "@medusajs/medusa/core-flows";

/**
 * TestereStore custom seed.
 *
 * Run with:
 *   cd medusa-backend/apps/backend
 *   npx medusa exec ./src/scripts/seed-testere.ts
 *
 * What it does:
 *   1. Adds TRY to the store's supported currencies (keeps EUR for compatibility).
 *   2. Creates a "Türkiye" region (TRY, manual payment, 20% tax).
 *   3. Deletes the default Medusa demo products (t-shirt, sweatshirt, etc.).
 *   4. Creates band-saw categories (Bi-Metal, M42, M51, Wood, Meat&Bone, ...).
 *   5. Creates 4 band-saw products with full metadata + variant matrix.
 *
 * Idempotency: safe-ish — uses "find or create" semantics where possible; if you
 * re-run it after success the second run will throw on uniques (handle/sku).
 */

const WIDTHS = ["6mm", "10mm", "13mm", "20mm", "27mm", "34mm", "41mm"];
const THICKNESSES = ["0.65mm", "0.90mm", "1.10mm", "1.30mm"];
const TPIS = ["3/4 TPI", "4/6 TPI", "5/8 TPI", "6/10 TPI", "8/12 TPI", "10/14 TPI"];

const PRICE_BY_WIDTH_M42: Record<string, number> = {
  "6mm": 110, "10mm": 125, "13mm": 140, "20mm": 175,
  "27mm": 210, "34mm": 295, "41mm": 390,
};
const PRICE_BY_WIDTH_CARBIDE: Record<string, number> = {
  "10mm": 310, "13mm": 350, "20mm": 420, "27mm": 540, "34mm": 710, "41mm": 920,
};
const PRICE_BY_WIDTH_WOOD: Record<string, number> = {
  "13mm": 75, "20mm": 90, "27mm": 110, "34mm": 150,
};

export default async function seedTestere({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);

  // ---------- 1. Add TRY currency to store ----------
  logger.info("Adding TRY to store currencies...");
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "name", "supported_currencies.*", "default_sales_channel_id"],
  });
  const store = stores[0];
  const existingCurrencies = (
    store.supported_currencies as Array<{ currency_code: string; is_default: boolean }> | undefined
  ) ?? [];
  if (!existingCurrencies.some((c) => c.currency_code === "try")) {
    await updateStoresWorkflow(container).run({
      input: {
        selector: { id: store.id },
        update: {
          supported_currencies: [
            { currency_code: "try", is_default: true },
            ...existingCurrencies
              .filter((c) => c.currency_code !== "try")
              .map((c) => ({
                currency_code: c.currency_code,
                is_default: false,
              })),
          ],
        },
      },
    });
    logger.info("Added TRY (default) to store.");
  } else {
    logger.info("TRY already in store currencies, skipping.");
  }

  // ---------- 2. Create Türkiye region ----------
  logger.info("Creating Türkiye region...");
  const { data: existingRegions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code"],
  });
  let trRegion = existingRegions.find(
    (r) => r.name === "Türkiye" || r.currency_code === "try"
  );
  if (!trRegion) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Türkiye",
            currency_code: "try",
            countries: ["tr"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    });
    trRegion = result[0];
    logger.info(`Created region: ${trRegion.id}`);
  } else {
    logger.info(`Region already exists: ${trRegion.id}`);
  }

  // Tax region for TR — with the 20% KDV default rate so cart.tax_total is
  // actually computed (prices are KDV-exclusive; 20% is added on top).
  try {
    await createTaxRegionsWorkflow(container).run({
      input: [
        {
          country_code: "tr",
          provider_id: "tp_system",
          default_tax_rate: {
            name: "KDV",
            code: "kdv",
            rate: 20,
          },
        },
      ],
    });
    logger.info("Created tax region for TR with 20% KDV.");
  } catch {
    logger.info("Tax region for TR already exists, skipping.");
  }

  // ---------- 3. Delete default demo products ----------
  logger.info("Removing default demo products...");
  const { data: oldProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: ["t-shirt", "sweatshirt", "sweatpants", "shorts"] },
  });
  if (oldProducts.length) {
    await deleteProductsWorkflow(container).run({
      input: { ids: oldProducts.map((p) => p.id) },
    });
    logger.info(`Deleted ${oldProducts.length} demo products.`);
  }

  // ---------- 4. Categories ----------
  logger.info("Creating categories...");
  const categorySpecs = [
    { name: "Bi-Metal", handle: "bimetal" },
    { name: "M42", handle: "bimetal-m42", parent: "bimetal" },
    { name: "M51", handle: "bimetal-m51", parent: "bimetal" },
    { name: "Ahşap", handle: "wood" },
    { name: "Et ve Kemik", handle: "meat-bone" },
    { name: "Sünger / Tekstil", handle: "sponge-textile" },
    { name: "Karbür Uçlu", handle: "carbide-tipped" },
    { name: "Makineler", handle: "machines" },
  ];

  const categoryMap = new Map<string, string>();
  for (const spec of categorySpecs) {
    const { data: existing } = await query.graph({
      entity: "product_category",
      fields: ["id", "handle"],
      filters: { handle: spec.handle },
    });
    if (existing.length) {
      categoryMap.set(spec.handle, existing[0].id);
      continue;
    }
    const parentId = spec.parent ? categoryMap.get(spec.parent) ?? null : null;
    const { result } = await createProductCategoriesWorkflow(container).run({
      input: {
        product_categories: [
          {
            name: spec.name,
            handle: spec.handle,
            is_active: true,
            parent_category_id: parentId,
          },
        ],
      },
    });
    categoryMap.set(spec.handle, result[0].id);
  }
  logger.info(`Categories ready: ${categoryMap.size}`);

  // Default sales channel + shipping profile
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

  // ---------- 5. Products ----------
  type VariantInput = {
    title: string;
    sku: string;
    manage_inventory: boolean;
    prices: Array<{ amount: number; currency_code: string }>;
    options: Record<string, string>;
    metadata?: Record<string, unknown>;
  };

  const buildVariants = (
    priceMap: Record<string, number>,
    weldingCost: number,
    skuPrefix: string,
    availableWidths: string[],
    availableThicknesses: string[],
    availableTpis: string[]
  ): VariantInput[] => {
    const out: VariantInput[] = [];
    for (const w of availableWidths) {
      const price = priceMap[w];
      if (typeof price !== "number") continue;
      for (const t of availableThicknesses) {
        for (const tpi of availableTpis) {
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
  };

  // 5.1 Bi-Metal M42 Premium
  logger.info("Creating Bi-Metal M42 Premium...");
  const m42Variants = buildVariants(
    PRICE_BY_WIDTH_M42, 90, "BIM42",
    WIDTHS, THICKNESSES, TPIS.slice(0, 4)
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
          status: ProductStatus.PUBLISHED,
          weight: 800,
          shipping_profile_id: defaultShippingProfile.id,
          category_ids: [
            categoryMap.get("bimetal-m42")!,
            categoryMap.get("bimetal")!,
          ],
          sales_channels: [{ id: defaultSalesChannel.id }],
          images: [
            { url: "https://medusa-public-images.s3.eu-west-1.amazonaws.com/coffee-mug.png" },
          ],
          options: [
            { title: "Genişlik", values: WIDTHS },
            { title: "Kalınlık", values: THICKNESSES },
            { title: "Diş Adımı", values: TPIS },
          ],
          variants: m42Variants,
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
              "Demir dışı pirinç, alüminyum ve bronz metaller",
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
              "Metal kesimi için yüksek performanslı M42 bi-metal şerit testere. Özel uzunlukta kaynak garantili.",
          },
        },
      ],
    },
  });

  // 5.2 Carbide Ultimate
  logger.info("Creating Carbide Ultimate...");
  const carbideVariants = buildVariants(
    PRICE_BY_WIDTH_CARBIDE, 190, "CRB",
    Object.keys(PRICE_BY_WIDTH_CARBIDE),
    ["0.90mm", "1.10mm", "1.30mm"],
    ["2/3 TPI", "3/4 TPI", "4/6 TPI", "5/8 TPI"]
  );
  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Carbide Ultimate Karbür Şerit Testere Bıçağı",
          handle: "carbide-ultimate",
          subtitle:
            "Karbür uçlu dişleri sayesinde paslanmaz çelikler, titanyum ve döküm malzemeler gibi zorlu metal kesimlerinde rakipsiz kesim hızı ve ömür.",
          description:
            "Karbür şerit testerelerimiz, diş uçlarına kaynaklanmış sert karbür partikülleri sayesinde en aşındırıcı ve sert malzemeleri kesmek için tasarlanmıştır.",
          status: ProductStatus.PUBLISHED,
          weight: 900,
          shipping_profile_id: defaultShippingProfile.id,
          category_ids: [categoryMap.get("carbide-tipped")!],
          sales_channels: [{ id: defaultSalesChannel.id }],
          options: [
            { title: "Genişlik", values: Object.keys(PRICE_BY_WIDTH_CARBIDE) },
            { title: "Kalınlık", values: ["0.90mm", "1.10mm", "1.30mm"] },
            { title: "Diş Adımı", values: ["2/3 TPI", "3/4 TPI", "4/6 TPI", "5/8 TPI"] },
          ],
          variants: carbideVariants,
          metadata: {
            blade_type: "TCT",
            material_usage: ["metal", "stainless", "titanium"],
            custom_length_enabled: true,
            min_length_mm: 1500,
            max_length_mm: 12000,
            price_calculation_type: "per_meter",
            welding_cost: 190,
            product_type: "blade",
            applications: [
              "Tungsten, Titanyum ve Nikel alaşımları",
              "304/316 Paslanmaz dolu çelikler",
              "Sertleştirilmiş kalıp çelikleri",
            ],
            technical_features: [
              "Karbür uç teknolojisi ile HSS bıçaklara göre 5 kat daha uzun ömür",
              "Minimum talaş sürtünmesi ve pürüzsüz kesim yüzeyleri",
            ],
            is_best_seller: true,
            best_seller_rank: 2,
            rating: 4.8,
            reviews_count: 187,
            sold_count: "2.400",
          },
        },
      ],
    },
  });

  // 5.3 Woodcut Classic
  logger.info("Creating Woodcut Classic...");
  const woodVariants = buildVariants(
    PRICE_BY_WIDTH_WOOD, 60, "WOOD",
    Object.keys(PRICE_BY_WIDTH_WOOD),
    ["0.65mm", "0.90mm"],
    ["4/6 TPI", "6/10 TPI", "10/14 TPI"]
  );
  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Woodcut Classic Ağaç Kesim Şerit Testeresi",
          handle: "woodcut-classic",
          subtitle:
            "Sert ve yumuşak ağaçların hızlı ve düzgün dilimlenmesi için özel karbon çeliğinden üretilmiş yüksek dayanımlı marangoz bıçakları.",
          description:
            "Woodcut serimiz, yüksek karbonlu çelik alaşımından üretilmiştir.",
          status: ProductStatus.PUBLISHED,
          weight: 700,
          shipping_profile_id: defaultShippingProfile.id,
          category_ids: [categoryMap.get("wood")!],
          sales_channels: [{ id: defaultSalesChannel.id }],
          options: [
            { title: "Genişlik", values: Object.keys(PRICE_BY_WIDTH_WOOD) },
            { title: "Kalınlık", values: ["0.65mm", "0.90mm"] },
            { title: "Diş Adımı", values: ["4/6 TPI", "6/10 TPI", "10/14 TPI"] },
          ],
          variants: woodVariants,
          metadata: {
            blade_type: "Karbon Çeliği",
            material_usage: ["wood"],
            custom_length_enabled: true,
            min_length_mm: 1000,
            max_length_mm: 8000,
            price_calculation_type: "per_meter",
            welding_cost: 60,
            product_type: "blade",
            applications: [
              "Sert ve yumuşak tomruk dilimleme",
              "Mobilya atölyeleri için kavisli kesim",
              "MDF, sunta panel kesimi",
            ],
            technical_features: [
              "Yüksek gövde esnekliği — küçük kasnaklı makinelerde çatlamadan çalışır",
              "Geniş diş aralığı ile hızlı talaş tahliyesi",
            ],
            rating: 4.7,
            reviews_count: 248,
            sold_count: "3.800",
          },
        },
      ],
    },
  });

  // 5.4 Kraken Machine
  logger.info("Creating Kraken Machine...");
  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Kraken Professional Şerit Testere Makinesi",
          handle: "kraken-machine",
          subtitle:
            "Profesyonel atölyeler için tasarlanmış, güçlü motorlu, hassas kılavuz rulmanlı ve döküm gövde yapılı şerit testere makinesi.",
          description:
            "Kraken endüstriyel şerit testere makinesi, metal ve ahşap atölyelerinin ağır hizmet ihtiyaçları için tasarlanmıştır.",
          status: ProductStatus.PUBLISHED,
          weight: 85000,
          shipping_profile_id: defaultShippingProfile.id,
          category_ids: [categoryMap.get("machines")!],
          sales_channels: [{ id: defaultSalesChannel.id }],
          options: [{ title: "Konfigürasyon", values: ["Standart"] }],
          variants: [
            {
              title: "Kraken Standart",
              sku: "KRAKEN-STD",
              manage_inventory: false,
              prices: [{ amount: 48500, currency_code: "try" }],
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
            applications: [
              "Profil ve metal lama açılı kesim",
              "Mobilya tomruk ve kalas dilimleme",
              "Plastik ve pleksiglas panel kesimi",
            ],
            technical_features: [
              "2.2 kW yüksek torklu bakır sargı elektrik motoru",
              "Hassas optik lazer kesim çizgi kılavuzu",
              "Acil stop anahtarı ve tekerlek emniyet şalterleri",
            ],
            long_description:
              "Kraken endüstriyel şerit testere makinesi, metal ve ahşap atölyelerinin ağır hizmet ihtiyaçları için tasarlanmıştır. Çift devirli kayış sistemi, hassas rulman yataklı testere kılavuzları ve 45 dereceye kadar yatabilir döküm tablası ile kusursuz açılı kesimlere imkan tanır.",
          },
        },
      ],
    },
  });

  // ---------- 6. Print publishable API key ----------
  const { data: keys } = await query.graph({
    entity: "api_key",
    fields: ["id", "token", "title", "type"],
    filters: { type: "publishable" },
  });
  const pk = keys[0];
  logger.info("==================================================");
  logger.info(`PUBLISHABLE_KEY: ${pk?.token}`);
  logger.info("==================================================");

  void Modules;
}
