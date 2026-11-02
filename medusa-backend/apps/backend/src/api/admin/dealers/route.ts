import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import {
  createCustomerGroupsWorkflow,
  createPriceListsWorkflow,
  deleteCustomerGroupsWorkflow,
  linkCustomerGroupsToCustomerWorkflow,
} from "@medusajs/medusa/core-flows";
import { z } from "zod";
import { dealerService } from "../../../lib/dealer-pricing";

const CreateSchema = z.object({
  customer_id: z.string().min(1),
  company_name: z.string().trim().min(1, "Firma adı gerekli."),
  note: z.string().trim().nullable().optional(),
});

/** GET /admin/dealers — bayiler ve müşteri bilgileri. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const dealers = await dealerService(req.scope).listDealers(
    {},
    { order: { company_name: "ASC" }, take: 1000 }
  );
  const customers = dealers.length
    ? await req.scope
        .resolve(Modules.CUSTOMER)
        .listCustomers(
          { id: dealers.map((d) => d.customer_id) },
          { select: ["id", "email", "first_name", "last_name"], take: dealers.length }
        )
    : [];
  const byId = new Map(customers.map((c) => [c.id, c]));
  res.json({
    dealers: dealers.map((d) => ({ ...d, customer: byId.get(d.customer_id) ?? null })),
  });
}

/**
 * POST /admin/dealers — kayıtlı bir müşteriyi bayi yapar: müşteri grubu ve
 * gruba özel fiyat listesi oluşturur. Liste boş başlar; fiyat girilmeyen
 * ürünler genel fiyatla satılır.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Geçersiz bilgi", errors: parsed.error.issues });
    return;
  }
  const { customer_id, company_name, note } = parsed.data;

  const [customer] = await req.scope
    .resolve(Modules.CUSTOMER)
    .listCustomers({ id: customer_id }, { select: ["id", "has_account"], take: 1 });
  if (!customer?.has_account) {
    res.status(400).json({
      message: "Bayi yalnızca kayıtlı (şifreli) bir müşteri hesabına tanımlanabilir.",
    });
    return;
  }

  const service = dealerService(req.scope);
  const [existing] = await service.listDealers({ customer_id }, { take: 1 });
  if (existing) {
    res.status(409).json({ message: "Bu müşteri zaten bayi." });
    return;
  }

  // Grup adları benzersiz olmalı; aynı adlı iki firma ayrılabilsin.
  const label = `${company_name} (${customer_id.slice(-6)})`;
  const { result: groups } = await createCustomerGroupsWorkflow(req.scope).run({
    input: { customersData: [{ name: `Bayi: ${label}` }] },
  });
  const groupId = groups[0].id;

  try {
    await linkCustomerGroupsToCustomerWorkflow(req.scope).run({
      input: { id: customer_id, add: [groupId] },
    });
    const { result: lists } = await createPriceListsWorkflow(req.scope).run({
      input: {
        price_lists_data: [
          {
            title: `Bayi Fiyat Listesi: ${label}`,
            description: "Bayiler sayfasından yönetilir.",
            // Genel fiyattan yüksek olsa bile girilen fiyat geçerli olsun
            // (varsayılan "sale" türü en düşük fiyatı seçer).
            type: "override",
            status: "active",
            rules: { "customer.groups.id": [groupId] },
            prices: [],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        ],
      },
    });
    const dealer = await service.createDealers({
      customer_id,
      company_name,
      note: note ?? null,
      customer_group_id: groupId,
      price_list_id: lists[0].id,
    });
    res.status(201).json({ dealer });
  } catch (e) {
    await deleteCustomerGroupsWorkflow(req.scope)
      .run({ input: { ids: [groupId] } })
      .catch(() => undefined);
    throw e;
  }
}
