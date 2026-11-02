import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  Modules,
  QueryContext,
} from "@medusajs/framework/utils";
import { batchPriceListPricesWorkflow } from "@medusajs/medusa/core-flows";
import { z } from "zod";
import { isConfigurableBlade } from "../../../../../lib/blade-guard";
import { BLADE_PRICE_MATRIX_MODULE } from "../../../../../modules/blade-price-matrix";
import type BladePriceMatrixService from "../../../../../modules/blade-price-matrix/service";
import { dealerService, listDealerVariantPrices } from "../../../../../lib/dealer-pricing";

const CURRENCY = "try";

const SaveSchema = z.object({
  blade: z
    .array(
      z.object({
        blade_price_id: z.string().min(1),
        price_per_meter: z.number().positive().nullable(),
        welding_fee: z.number().nonnegative().nullable(),
      })
    )
    .default([]),
  variants: z
    .array(
      z.object({
        variant_id: z.string().min(1),
        amount: z.number().positive().nullable(),
      })
    )
    .default([]),
});

async function findDealer(req: MedusaRequest) {
  const [dealer] = await dealerService(req.scope).listDealers(
    { id: req.params.id },
    { take: 1 }
  );
  return dealer ?? null;
}

/**
 * Satılabilir tüm varyantlar ve genel fiyatları. Ölçüye göre ürünler hariç:
 * onların fiyatı varyanttan değil matristen gelir.
 */
async function listSellableVariants(req: MedusaRequest) {
  const [region] = await req.scope
    .resolve(Modules.REGION)
    .listRegions({ currency_code: CURRENCY }, { select: ["id"], take: 1 });
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
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
        currency_code: CURRENCY,
        ...(region ? { region_id: region.id } : {}),
      }),
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data ?? []) as any[]).filter(
    (v) => v.product?.status === "published" && !isConfigurableBlade(v.product)
  );
}

/** GET /admin/dealers/:id/prices — tüm ürünler, genel ve bayi fiyatlarıyla. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const dealer = await findDealer(req);
  if (!dealer) {
    res.status(404).json({ message: "Bayi bulunamadı." });
    return;
  }
  const rows = await req.scope
    .resolve<BladePriceMatrixService>(BLADE_PRICE_MATRIX_MODULE)
    .listBladePrices({ is_active: true }, { take: 100000 });
  const overrides = await dealerService(req.scope).listDealerBladePrices(
    { dealer_id: dealer.id },
    { take: 100000 }
  );
  const overrideByRow = new Map(overrides.map((o) => [o.blade_price_id, o]));
  const [variants, variantPrices] = await Promise.all([
    listSellableVariants(req),
    listDealerVariantPrices(req.scope, dealer.price_list_id),
  ]);

  const num = (v: unknown) => (v === null || v === undefined ? null : Number(v));
  res.json({
    blade: rows.map((r) => {
      const o = overrideByRow.get(r.id);
      return {
        blade_price_id: r.id,
        blade_type: r.blade_type,
        width_mm: Number(r.width_mm),
        thickness_mm: Number(r.thickness_mm),
        tooth_pitch: r.tooth_pitch,
        list_price_per_meter: Number(r.price_per_meter),
        list_welding_fee: Number(r.welding_fee ?? 0),
        price_per_meter: num(o?.price_per_meter),
        welding_fee: num(o?.welding_fee),
      };
    }),
    variants: variants.map((v) => ({
      variant_id: v.id,
      product_title: v.product.title,
      variant_title: v.title,
      sku: v.sku,
      is_ready_made:
        v.product.metadata?.is_ready_made === true ||
        v.product.metadata?.is_ready_made === "true",
      list_amount: num(v.calculated_price?.calculated_amount),
      amount: variantPrices.get(v.id)?.amount ?? null,
    })),
  });
}

/**
 * POST /admin/dealers/:id/prices — yalnız değişen satırlar gönderilir.
 * Boş (null) fiyat bayi fiyatını kaldırır; ürün genel fiyata döner.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const dealer = await findDealer(req);
  if (!dealer) {
    res.status(404).json({ message: "Bayi bulunamadı." });
    return;
  }
  const parsed = SaveSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Geçersiz fiyat", errors: parsed.error.issues });
    return;
  }
  const { blade, variants } = parsed.data;
  const service = dealerService(req.scope);

  if (variants.length) {
    const sellable = new Set((await listSellableVariants(req)).map((v) => v.id));
    const unknown = variants.find((v) => !sellable.has(v.variant_id));
    if (unknown) {
      res.status(400).json({
        message: `Bu ürüne bayi fiyatı girilemez: ${unknown.variant_id}`,
      });
      return;
    }
    const current = await listDealerVariantPrices(req.scope, dealer.price_list_id);
    const create: { variant_id: string; amount: number; currency_code: string }[] = [];
    const update: { id: string; variant_id: string; amount: number; currency_code: string }[] = [];
    const remove: string[] = [];
    for (const { variant_id, amount } of variants) {
      const existing = current.get(variant_id);
      if (amount === null) {
        if (existing) remove.push(existing.price_id);
      } else if (existing) {
        update.push({ id: existing.price_id, variant_id, amount, currency_code: CURRENCY });
      } else {
        create.push({ variant_id, amount, currency_code: CURRENCY });
      }
    }
    await batchPriceListPricesWorkflow(req.scope).run({
      input: { data: { id: dealer.price_list_id, create, update, delete: remove } },
    });
  }

  if (blade.length) {
    const matrix = req.scope.resolve<BladePriceMatrixService>(BLADE_PRICE_MATRIX_MODULE);
    const ids = blade.map((b) => b.blade_price_id);
    const known = await matrix.listBladePrices({ id: ids }, { select: ["id"], take: ids.length });
    if (known.length !== new Set(ids).size) {
      res.status(400).json({ message: "Fiyat matrisinde olmayan satır gönderildi." });
      return;
    }
    const existing = await service.listDealerBladePrices(
      { dealer_id: dealer.id, blade_price_id: ids },
      { take: ids.length }
    );
    const byRow = new Map(existing.map((o) => [o.blade_price_id, o]));
    for (const b of blade) {
      const current = byRow.get(b.blade_price_id);
      if (b.price_per_meter === null && b.welding_fee === null) {
        if (current) await service.softDeleteDealerBladePrices(current.id);
      } else if (current) {
        await service.updateDealerBladePrices({
          id: current.id,
          price_per_meter: b.price_per_meter,
          welding_fee: b.welding_fee,
        });
      } else {
        await service.createDealerBladePrices({ dealer_id: dealer.id, ...b });
      }
    }
  }

  res.json({ ok: true, saved: blade.length + variants.length });
}
