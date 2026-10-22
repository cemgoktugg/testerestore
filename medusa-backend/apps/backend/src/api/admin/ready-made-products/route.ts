import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  ProductStatus,
} from "@medusajs/framework/utils";
import { createProductsWorkflow } from "@medusajs/medusa/core-flows";
import type BladePriceMatrixService from "../../../modules/blade-price-matrix/service";
import { BLADE_PRICE_MATRIX_MODULE } from "../../../modules/blade-price-matrix";
import { PostReadyMadeSchema } from "./validators";

const HAZIR_CATEGORY_HANDLE = "hazir-uirunler";

/** Türkçe karakterleri sadeleştiren slug — handle/SKU üretimi için. */
function slugify(input: string): string {
  const map: Record<string, string> = {
    ç: "c", ğ: "g", ı: "i", İ: "i", ö: "o", ş: "s", ü: "u",
    Ç: "c", Ğ: "g", Ö: "o", Ş: "s", Ü: "u",
  };
  return input
    .replace(/[çğıİöşüÇĞÖŞÜ]/g, (c) => map[c] ?? c)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

/** Ondalık ölçüyü kısa gösterir: 0.9 → "0.9", 27 → "27". */
const fmtNum = (n: number) =>
  Number.isInteger(n) ? String(n) : String(n).replace(/\.?0+$/, "");

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Ana üründen hazır ürüne AYNEN geçen tanıtım/teknik alanlar (ürün sayfasındaki
 * Teknik Bilgiler, Özellikler, Kullanım Alanları, Kesim Hızları, Dokümanlar).
 * Bilerek KOPYALANMAYANLAR: is_best_seller / best_seller_rank (hazır ürün
 * kendiliğinden "çok satan" olmasın), min/max_length_mm (hazır üründe
 * "Üretilebilir Boy Aralığı" satırı çıkmasın), blade_type / tooth_pitch /
 * custom_length_enabled / seo_* / fiyat alanları (hazır ürünün kendi değerleri).
 */
const INHERITED_METADATA_KEYS = [
  "technical_specs",
  "technical_features",
  "applications",
  "material_usage",
  "cutting_speeds",
  "documents",
] as const;

/**
 * Ölçüye göre ürüne özgü teknik satırlar ("Genişlik seçenekleri: 6, 10, 13…",
 * "Diş adımı (TPI): 2/3, 3/4…", boy aralığı). Hazır üründe tek bir ölçü var ve
 * genişlik/kalınlık/diş adımı tabloda zaten kendi değerleriyle gösteriliyor;
 * bu satırlar kalsa ürünle çelişen bilgi verirdi.
 */
const CONFIGURABLE_ONLY_SPEC_LABEL = /seçenek|aralı[gğ]|diş adımı/i;

function inheritedMetadata(
  parentMeta: Record<string, unknown> | null | undefined,
  copyDescription: boolean
): Record<string, unknown> {
  const meta = parentMeta || {};
  const out: Record<string, unknown> = {};
  for (const key of INHERITED_METADATA_KEYS) {
    const v = meta[key];
    if (Array.isArray(v) ? v.length > 0 : v != null && v !== "") out[key] = v;
  }
  if (Array.isArray(out.technical_specs)) {
    const specs = (out.technical_specs as Array<{ label?: unknown }>).filter(
      (s) => !CONFIGURABLE_ONLY_SPEC_LABEL.test(String(s?.label ?? ""))
    );
    if (specs.length) out.technical_specs = specs;
    else delete out.technical_specs;
  }
  // Uzun açıklama (ürün sayfası "Açıklama" sekmesi) açıklamayla aynı kurala uyar.
  if (copyDescription && typeof meta.long_description === "string" && meta.long_description) {
    out.long_description = meta.long_description;
  }
  return out;
}

/** Diş adımı karşılaştırması için sade biçim: "6/10 TPI" → "6/10", boş → "". */
const normTooth = (t: unknown) =>
  String(t ?? "")
    .replace(/tpi/i, "")
    .replace(/\s+/g, "")
    .toLowerCase();

const sameNum = (a: unknown, b: unknown) =>
  Math.abs(Number(a) - Number(b)) < 1e-6;

type ReadyMadeSibling = {
  id: string;
  title: string;
  handle: string;
  status: string;
  width_mm: number;
  thickness_mm: number;
  tooth_pitch: string | null;
  length_mm: number;
};

/**
 * Bu ana üründen daha önce oluşturulmuş hazır ürünler (silinmemiş; taslaklar
 * dahil). Aynı ölçü + uzunluğun ikinci kez eklenmesini önlemek için.
 */
async function readyMadeSiblings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  parentId: string
): Promise<ReadyMadeSibling[]> {
  const { data } = await query.graph({
    entity: "product",
    fields: ["id", "title", "handle", "status", "metadata"],
  });
  return (data as Array<{ id: string; title: string; handle: string; status: string; metadata?: Record<string, unknown> | null }>)
    .filter((p) => {
      const m = p.metadata || {};
      return (m.is_ready_made === true || m.is_ready_made === "true") && m.source_product_id === parentId;
    })
    .map((p) => {
      const m = p.metadata || {};
      return {
        id: p.id,
        title: p.title,
        handle: p.handle,
        status: p.status,
        width_mm: Number(m.width_mm),
        thickness_mm: Number(m.thickness_mm),
        tooth_pitch: (m.tooth_pitch as string | null) ?? null,
        length_mm: Number(m.length_mm),
      };
    });
}

function findDuplicate(
  siblings: ReadyMadeSibling[],
  spec: { width_mm: number; thickness_mm: number; tooth_pitch?: string | null; length_mm: number }
): ReadyMadeSibling | undefined {
  return siblings.find(
    (s) =>
      sameNum(s.width_mm, spec.width_mm) &&
      sameNum(s.thickness_mm, spec.thickness_mm) &&
      normTooth(s.tooth_pitch) === normTooth(spec.tooth_pitch) &&
      sameNum(s.length_mm, spec.length_mm)
  );
}

/**
 * GET /admin/ready-made-products?parent_id=…
 *
 * Seçilen ana ürünün mevcut hazır ürünleri — panel önizlemesi aynı ölçüyü
 * kaydetmeden önce "Zaten var" diye işaretlesin.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const parentId = String(req.query.parent_id || "");
  if (!parentId) {
    res.status(400).json({ message: "parent_id gerekli" });
    return;
  }
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  res.json({ ready_made: await readyMadeSiblings(query, parentId) });
}

/**
 * POST /admin/ready-made-products
 *
 * Bir ANA üründen (parent_id) ölçü + bir veya birden çok uzunluk vererek toplu
 * "hazır boy" ürünü üretir. Her hazır ürün:
 *   - ana ürünün RESİMLERİNİ ve (istenirse) AÇIKLAMASINI aynen alır
 *   - fiyatı Fiyat Matrisi'nden otomatik hesaplanır (metre × uzunluk + kaynak)
 *   - is_ready_made metadata + "hazir-uirunler" kategorisi ile işaretlenir
 *
 * Ana ürünü ELLE seçtiğimiz için resim eşleştirmesi başlık tahminine gerek
 * kalmadan güvenilir (ready-made-images subscriber'ının kırılgan yanı yok).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = PostReadyMadeSchema.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ message: "Geçersiz istek", errors: parsed.error.issues });
    return;
  }

  const {
    parent_id,
    title_prefix,
    blade_type,
    width_mm,
    thickness_mm,
    tooth_pitch,
    lengths_mm,
    inventory,
    copy_description,
    price_override,
  } = parsed.data;

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const priceService = req.scope.resolve<BladePriceMatrixService>(
    BLADE_PRICE_MATRIX_MODULE
  );

  // 1) Ana ürünü çek (resim + açıklama + kategori kaynağı)
  const { data: parents } = await query.graph({
    entity: "product",
    fields: [
      "id", "title", "subtitle", "description", "thumbnail", "weight",
      "images.url", "categories.id", "categories.handle", "metadata",
    ],
    filters: { id: parent_id },
  });
  const parent = parents?.[0];
  if (!parent) {
    res.status(404).json({ message: "Ana ürün bulunamadı" });
    return;
  }

  // 2) Fiyat: matristen (blade_type + ölçü) veya elle override (metre başı)
  let perMeter = price_override ?? null;
  let weldingFee = 0;
  if (perMeter == null) {
    const filter: Record<string, unknown> = {
      is_active: true,
      blade_type,
      width_mm,
      thickness_mm,
      tooth_pitch: tooth_pitch ? tooth_pitch : null,
    };
    const rows = (await priceService.listBladePrices(filter)) as Array<{
      price_per_meter: number | string;
      welding_fee: number | string;
    }>;
    if (rows.length === 0) {
      res.status(400).json({
        message:
          "Bu ölçü için Fiyat Matrisi'nde satır yok. Önce Fiyat Matrisi'ne ekleyin ya da fiyatı elle girin.",
        code: "BLADE_PRICE_NOT_FOUND",
      });
      return;
    }
    perMeter = Number(rows[0].price_per_meter);
    weldingFee = Number(rows[0].welding_fee ?? 0);
  }

  // 3) Ortak referanslar (satış kanalı, kargo profili, hazır kategorisi)
  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id"],
  });
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  });
  const { data: hazirCats } = await query.graph({
    entity: "product_category",
    fields: ["id"],
    filters: { handle: HAZIR_CATEGORY_HANDLE },
  });
  const defaultSalesChannel = salesChannels[0];
  const defaultShippingProfile = shippingProfiles[0];
  const hazirCategoryId = hazirCats?.[0]?.id as string | undefined;

  // Kategoriler: ana ürünün kategorileri + hazır ürünler kategorisi (tekilleştir)
  const parentCatIds = (
    (parent.categories || []) as Array<{ id: string }>
  ).map((c) => c.id);
  const categoryIds = Array.from(
    new Set([...parentCatIds, hazirCategoryId].filter(Boolean) as string[])
  );

  // Ana ürünün resimleri "olduğu gibi" (kullanıcı ana ürünü bilerek seçti)
  const parentImages = (
    (parent.images || []) as Array<{ url?: string }>
  )
    .map((im) => im.url)
    .filter((u): u is string => !!u)
    .map((url) => ({ url }));

  async function handleFree(base: string): Promise<string> {
    let handle = base;
    for (let i = 2; i < 100; i++) {
      const { data } = await query.graph({
        entity: "product",
        fields: ["id"],
        filters: { handle },
      });
      if (data.length === 0) return handle;
      handle = `${base}-${i}`;
    }
    return `${base}-${Date.now()}`;
  }

  const toothLabel = tooth_pitch ? `${tooth_pitch} TPI ` : "";
  const dimLabel = `${fmtNum(width_mm)} × ${fmtNum(thickness_mm)} × ${toothLabel}`.trim();

  const created: Array<{ id: string; title: string; handle: string; price: number }> = [];
  const skipped: Array<{
    length_mm: number;
    reason: string;
    duplicate?: boolean;
    existing?: { id: string; title: string; handle: string };
  }> = [];

  // Aynı ana üründen aynı ölçü + uzunlukta hazır ürün varsa tekrar ekleme.
  const siblings = await readyMadeSiblings(query, parent.id as string);

  // 4) Her uzunluk için bir hazır ürün oluştur
  for (const length_mm of Array.from(new Set(lengths_mm))) {
    const dup = findDuplicate(siblings, { width_mm, thickness_mm, tooth_pitch, length_mm });
    if (dup) {
      skipped.push({
        length_mm,
        reason: `Bu ölçüde hazır ürün zaten var: "${dup.title}"`,
        duplicate: true,
        existing: { id: dup.id, title: dup.title, handle: dup.handle },
      });
      continue;
    }

    const unitPrice = round2((perMeter as number) * (length_mm / 1000) + weldingFee);

    const title = `${title_prefix} Hazır — ${dimLabel} × ${length_mm} mm`;
    const baseHandle = slugify(
      `${title_prefix}-${fmtNum(width_mm)}-${fmtNum(thickness_mm)}-${(tooth_pitch || "").replace("/", "")}-${length_mm}-hazir`
    );
    const handle = await handleFree(baseHandle);
    const sku = handle.toUpperCase().replace(/-/g, "");

    try {
      const { result } = await createProductsWorkflow(req.scope).run({
        input: {
          products: [
            {
              title,
              handle,
              subtitle: `${length_mm} mm hazır kaynaklı — aynı gün kargoda`,
              description: copy_description
                ? parent.description || ""
                : `${title_prefix} ${dimLabel} × ${length_mm} mm. Önceden kaynaklı, hazır stoğumuzda.`,
              status: ProductStatus.PUBLISHED,
              weight: (parent.weight as number) || 600,
              thumbnail: (parent.thumbnail as string) || parentImages[0]?.url,
              images: parentImages.length ? parentImages : undefined,
              shipping_profile_id: defaultShippingProfile?.id,
              category_ids: categoryIds,
              sales_channels: defaultSalesChannel
                ? [{ id: defaultSalesChannel.id }]
                : [],
              options: [{ title: "Hazır Boy", values: ["Tek Beden"] }],
              variants: [
                {
                  title: "Tek Beden",
                  sku,
                  manage_inventory: false,
                  prices: [{ amount: unitPrice, currency_code: "try" }],
                  options: { "Hazır Boy": "Tek Beden" },
                },
              ],
              metadata: {
                // Önce ana üründen gelenler; aşağıdaki hazır ürüne özgü
                // alanlar her zaman bunların üzerine yazılır.
                ...inheritedMetadata(
                  parent.metadata as Record<string, unknown> | null,
                  !!copy_description
                ),
                is_ready_made: true,
                blade_type,
                width_mm,
                thickness_mm,
                tooth_pitch: tooth_pitch || null,
                length_mm,
                inventory_quantity_display: inventory,
                product_type: "blade",
                custom_length_enabled: false,
                source_product_id: parent.id,
                seo_title: `${title_prefix} ${dimLabel} × ${length_mm} mm Hazır Şerit Testere`,
                seo_description: `${length_mm} mm boy ${dimLabel} hazır şerit testere. Stoğumuzda, aynı gün kargoda. ${unitPrice.toLocaleString("tr-TR")} TL.`,
              },
            },
          ],
        },
      });
      const prod = result[0];
      created.push({ id: prod.id, title, handle, price: unitPrice });
      siblings.push({
        id: prod.id, title, handle, status: "published",
        width_mm, thickness_mm, tooth_pitch: tooth_pitch || null, length_mm,
      });
    } catch (e) {
      skipped.push({
        length_mm,
        reason: e instanceof Error ? e.message : String(e),
      });
    }
  }

  res.status(201).json({
    created_count: created.length,
    created,
    skipped,
    parent: { id: parent.id, title: parent.title },
  });
}
