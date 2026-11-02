/**
 * Bayi teklifleri: kalem fiyatlama, kayıt ve yanıt biçimi.
 *
 * Kalem fiyatı sepetle aynı kaynaktan gelir (bıçakta `computeBladeLine`,
 * ürünlerde bayi fiyat listesi); teklifte elle fiyat yazılmaz, yoksa bayi
 * teklifteki fiyatı sepette göremezdi. Fiyatlar KDV hariçtir.
 */
import type { MedusaContainer } from "@medusajs/framework/types";
import { MedusaError } from "@medusajs/framework/utils";
import { z } from "zod";
import { BLADE_PRICE_MATRIX_MODULE } from "../modules/blade-price-matrix";
import type BladePriceMatrixService from "../modules/blade-price-matrix/service";
import { MAX_LENGTH_MM, MIN_LENGTH_MM } from "../api/store/blade-price/calculate/route";
import { assertMatrixAllowedForProduct, productForVariant } from "./blade-guard";
import { computeBladeLine } from "./blade-line";
import {
  dealerService,
  listConfigurableProducts,
  listDealerVariantPrices,
  listSellableVariants,
  type DealerRecord,
} from "./dealer-pricing";

export const KDV_RATE = 0.2;
/** Bayinin hesabında görünen durumlar; taslak yalnız panelde. */
export const VISIBLE_QUOTE_STATUSES = ["sent", "revision_requested", "accepted", "ordered"];

export const QuoteBodySchema = z.object({
  note: z.string().trim().max(1000).nullable().optional(),
  items: z
    .array(
      z.object({
        kind: z.enum(["blade", "variant"]),
        ref_id: z.string().min(1),
        /** Bıçakta hangi ürün (M42/M51); o türde tek ürün varsa boş bırakılabilir. */
        variant_id: z.string().min(1).nullable().optional(),
        length_mm: z.coerce.number().int().min(MIN_LENGTH_MM).max(MAX_LENGTH_MM).nullable().optional(),
        quantity: z.coerce.number().int().positive(),
      })
    )
    .min(1, "En az bir ürün ekleyin."),
});
export type QuoteItemInput = z.infer<typeof QuoteBodySchema>["items"][number];

const round2 = (n: number) => Math.round(n * 100) / 100;
const invalid = (msg: string) => new MedusaError(MedusaError.Types.INVALID_DATA, msg);

/** Kalemleri bayinin güncel fiyatlarıyla fiyatlar. */
export async function priceQuoteItems(
  container: MedusaContainer,
  dealer: DealerRecord,
  items: QuoteItemInput[]
) {
  const matrix = container.resolve<BladePriceMatrixService>(BLADE_PRICE_MATRIX_MODULE);
  const configurable = items.some((i) => i.kind === "blade")
    ? await listConfigurableProducts(container)
    : [];
  const hasVariants = items.some((i) => i.kind === "variant");
  const variants = hasVariants ? await listSellableVariants(container) : [];
  const variantById = new Map(variants.map((v) => [v.id, v]));
  const dealerPrices = hasVariants
    ? await listDealerVariantPrices(container, dealer.price_list_id)
    : new Map<string, { amount: number }>();

  const priced: {
    position: number;
    kind: string;
    ref_id: string;
    variant_id: string;
    title: string;
    detail: string | null;
    length_mm: number | null;
    quantity: number;
    unit_price: number;
  }[] = [];

  for (const [position, item] of items.entries()) {
    if (item.kind === "blade") {
      if (!item.length_mm) {
        throw invalid(`Bıçak için boy girin (${MIN_LENGTH_MM}-${MAX_LENGTH_MM} mm).`);
      }
      const [row] = await matrix.listBladePrices({ id: item.ref_id, is_active: true }, { take: 1 });
      if (!row) throw invalid("Fiyat matrisinde olmayan bir ölçü seçildi.");
      const candidates = configurable.filter((p) => p.blade_type === row.blade_type);
      const product =
        candidates.find((p) => p.variant_id === item.variant_id) ??
        (!item.variant_id && candidates.length === 1 ? candidates[0] : null);
      if (!product) {
        throw invalid(
          candidates.length
            ? `Hangi ürün olduğunu seçin: ${candidates.map((p) => p.title).join(" / ")}.`
            : "Bu ölçü için satışta ürün bulunamadı."
        );
      }
      assertMatrixAllowedForProduct(
        await productForVariant(container, product.variant_id),
        row.blade_type,
        item.length_mm
      );
      const width = Number(row.width_mm);
      const thickness = Number(row.thickness_mm);
      const pricing = await computeBladeLine(container, {
        blade_type: row.blade_type,
        width_mm: width,
        thickness_mm: thickness,
        tooth_pitch: row.tooth_pitch,
        length_mm: item.length_mm,
        quantity: item.quantity,
        customer_id: dealer.customer_id,
      });
      if (!pricing) throw invalid("Seçilen ölçünün fiyatı bulunamadı.");
      priced.push({
        position,
        kind: "blade",
        ref_id: row.id,
        variant_id: product.variant_id,
        title: product.title,
        detail: [
          `${width} × ${thickness} mm`,
          row.tooth_pitch ? `${row.tooth_pitch} TPI` : null,
          `Boy ${item.length_mm} mm`,
        ]
          .filter(Boolean)
          .join(" · "),
        length_mm: item.length_mm,
        quantity: item.quantity,
        unit_price: pricing.unit_price,
      });
    } else {
      const variant = variantById.get(item.ref_id);
      const amount =
        dealerPrices.get(item.ref_id)?.amount ?? variant?.calculated_price?.calculated_amount;
      if (!variant || typeof amount !== "number") {
        throw invalid("Seçilen ürün satışta değil ya da fiyatı yok.");
      }
      priced.push({
        position,
        kind: "variant",
        ref_id: variant.id,
        variant_id: variant.id,
        title: variant.product.title,
        detail:
          [variant.title, variant.sku].filter((x) => x && x !== "Default").join(" · ") || null,
        length_mm: null,
        quantity: item.quantity,
        unit_price: amount,
      });
    }
  }
  return priced;
}

export function quoteTotals(items: { quantity: number | string; unit_price: number | string }[]) {
  const subtotal = round2(
    items.reduce((sum, i) => sum + Number(i.quantity) * Number(i.unit_price), 0)
  );
  const tax = round2(subtotal * KDV_RATE);
  return { subtotal, tax, total: round2(subtotal + tax) };
}

export const quoteNumberLabel = (quote: {
  number: number;
  revision?: number | null;
  created_at?: Date | string;
}) =>
  `T-${new Date(quote.created_at ?? Date.now()).getFullYear()}-${String(quote.number).padStart(4, "0")}${
    quote.revision ? `-R${quote.revision}` : ""
  }`;

/** Kalemleri değiştirir: eskiler silinir, yeniler sırayla yazılır. */
export async function replaceQuoteItems(
  container: MedusaContainer,
  quoteId: string,
  items: Awaited<ReturnType<typeof priceQuoteItems>>
) {
  const service = dealerService(container);
  const old = await service.listDealerQuoteItems(
    { quote_id: quoteId },
    { select: ["id"], take: 10000 }
  );
  if (old.length) await service.deleteDealerQuoteItems(old.map((i) => i.id));
  await service.createDealerQuoteItems(items.map((i) => ({ ...i, quote_id: quoteId })));
}

export async function createQuote(
  container: MedusaContainer,
  dealer: DealerRecord,
  body: z.infer<typeof QuoteBodySchema>
) {
  const items = await priceQuoteItems(container, dealer, body.items);
  const service = dealerService(container);
  const [last] = await service.listDealerQuotes(
    {},
    { select: ["number"], order: { number: "DESC" }, take: 1, withDeleted: true }
  );
  const quote = await service.createDealerQuotes({
    dealer_id: dealer.id,
    number: Number(last?.number ?? 0) + 1,
    note: body.note ?? null,
  });
  await replaceQuoteItems(container, quote.id, items);
  return quote;
}

/** Teklifi kalemleri ve toplamlarıyla yanıt biçimine getirir. */
export async function loadQuotes(
  container: MedusaContainer,
  filters: { id?: string; dealer_id?: string | string[]; status?: string | string[] }
) {
  const service = dealerService(container);
  const quotes = await service.listDealerQuotes(filters, {
    order: { number: "DESC" },
    take: 1000,
  });
  if (!quotes.length) return [];
  const items = await service.listDealerQuoteItems(
    { quote_id: quotes.map((q) => q.id) },
    { order: { position: "ASC" }, take: 100000 }
  );
  return quotes.map((q) => {
    const own = items
      .filter((i) => i.quote_id === q.id)
      .map((i) => ({
        id: i.id,
        kind: i.kind,
        ref_id: i.ref_id,
        variant_id: i.variant_id,
        title: i.title,
        detail: i.detail,
        length_mm: i.length_mm,
        quantity: Number(i.quantity),
        unit_price: Number(i.unit_price),
        requested_unit_price:
          i.requested_unit_price === null || i.requested_unit_price === undefined
            ? null
            : Number(i.requested_unit_price),
      }));
    return {
      id: q.id,
      dealer_id: q.dealer_id,
      number: quoteNumberLabel(q),
      status: q.status,
      note: q.note,
      revision: q.revision,
      revision_note: q.revision_note,
      revision_requested_at: q.revision_requested_at,
      accepted_at: q.accepted_at,
      ordered_at: q.ordered_at,
      created_at: q.created_at,
      sent_at: q.sent_at,
      items: own,
      ...quoteTotals(own),
    };
  });
}
