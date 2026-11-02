import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { addToCartWorkflow, transferCartCustomerWorkflow } from "@medusajs/medusa/core-flows";
import { z } from "zod";
import { computeBladeLine } from "../../../../../../lib/blade-line";
import { dealerService, findActiveDealer } from "../../../../../../lib/dealer-pricing";
import { BLADE_PRICE_MATRIX_MODULE } from "../../../../../../modules/blade-price-matrix";
import type BladePriceMatrixService from "../../../../../../modules/blade-price-matrix/service";
import { loadQuotes } from "../../../../../../lib/dealer-quote";

const Schema = z.object({ cart_id: z.string().min(1) });

/**
 * POST /store/dealer/quotes/:id/accept
 *
 * Teklifi kabul eder ve kalemleri teklifteki fiyat ve adetle bayinin sepetine
 * ekler. Tekrar çağrılırsa yalnız sepette olmayan kalemler eklenir. Fiyatlar
 * istemciden alınmaz; son kontrol sipariş tamamlanırken yapılır.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Sepet bilgisi eksik." });
    return;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customerId = (req as any).auth_context?.actor_id as string;
  const dealer = await findActiveDealer(req.scope, customerId);
  const [quote] = dealer
    ? await loadQuotes(req.scope, { id: req.params.id, dealer_id: dealer.id })
    : [];
  if (!quote || quote.status === "draft") {
    res.status(404).json({ message: "Teklif bulunamadı." });
    return;
  }
  if (quote.status === "ordered") {
    res.status(409).json({ message: "Bu teklif için sipariş zaten verildi." });
    return;
  }
  if (quote.status === "revision_requested") {
    res.status(409).json({ message: "Revize talebiniz inceleniyor; yanıtlandıktan sonra kabul edebilirsiniz." });
    return;
  }

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data } = await query.graph({
    entity: "cart",
    fields: ["id", "customer_id", "completed_at", "customer.has_account", "items.id", "items.metadata"],
    filters: { id: parsed.data.cart_id },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cart = data?.[0] as any;
  if (!cart || cart.completed_at) {
    res.status(404).json({ message: "Sepet bulunamadı." });
    return;
  }
  if (cart.customer_id && cart.customer_id !== customerId && cart.customer?.has_account) {
    res.status(409).json({ message: "Bu sepet başka bir hesaba ait.", code: "CART_OTHER_CUSTOMER" });
    return;
  }

  const inCart = new Set(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (cart.items ?? []).map((i: any) => i?.metadata?.quote_item_id).filter(Boolean)
  );
  const missing = quote.items.filter((i) => !inCart.has(i.id));

  const matrix = req.scope.resolve<BladePriceMatrixService>(BLADE_PRICE_MATRIX_MODULE);
  const lines: {
    variant_id: string;
    quantity: number;
    unit_price: number;
    metadata: Record<string, unknown>;
  }[] = [];
  for (const item of missing) {
    if (!item.variant_id) {
      res.status(409).json({
        message: "Bu teklifte ürün türü belirtilmemiş. Lütfen revize isteyin ya da bizimle iletişime geçin.",
      });
      return;
    }
    const quoteMeta = {
      quote_id: quote.id,
      quote_item_id: item.id,
      quote_number: quote.number,
      dealer_price: true,
      unit_price_at_add: item.unit_price,
    };
    let metadata: Record<string, unknown> = quoteMeta;
    if (item.kind === "blade") {
      const [row] = await matrix.listBladePrices({ id: item.ref_id, is_active: true }, { take: 1 });
      const pricing = row
        ? await computeBladeLine(req.scope, {
            blade_type: row.blade_type,
            width_mm: Number(row.width_mm),
            thickness_mm: Number(row.thickness_mm),
            tooth_pitch: row.tooth_pitch,
            length_mm: item.length_mm as number,
            quantity: item.quantity,
            customer_id: customerId,
          })
        : null;
      if (!pricing) {
        res.status(409).json({
          message: `${item.detail ?? item.title} artık satışta değil. Lütfen revize isteyin.`,
        });
        return;
      }
      const total = Math.round(item.unit_price * item.quantity * 100) / 100;
      metadata = {
        ...pricing.metadata,
        ...quoteMeta,
        unit_price: item.unit_price,
        discount_percent: 0,
        total_price: total,
        total_before_discount: total,
      };
    }
    lines.push({ variant_id: item.variant_id, quantity: item.quantity, unit_price: item.unit_price, metadata });
  }

  try {
    if (cart.customer_id !== customerId) {
      await transferCartCustomerWorkflow(req.scope).run({
        input: { id: cart.id, customer_id: customerId },
      });
    }
    if (lines.length) {
      await addToCartWorkflow(req.scope).run({ input: { cart_id: cart.id, items: lines } });
    }
  } catch (e) {
    req.scope
      .resolve("logger")
      .error(`[dealer-quote/accept] ${quote.id}: ${e instanceof Error ? e.message : String(e)}`);
    res.status(409).json({
      message: "Ürünler sepete eklenemedi. Stok durumu değişmiş olabilir; lütfen bizimle iletişime geçin.",
    });
    return;
  }

  const service = dealerService(req.scope);
  await service.updateDealerQuotes({ id: quote.id, status: "accepted", accepted_at: new Date() });
  res.json({ ok: true, added: lines.length });
}
