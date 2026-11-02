import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MedusaError, Modules } from "@medusajs/framework/utils";
import {
  createCustomerGroupsWorkflow,
  createPriceListsWorkflow,
  deleteCustomerGroupsWorkflow,
  linkCustomerGroupsToCustomerWorkflow,
  setAuthAppMetadataWorkflow,
} from "@medusajs/medusa/core-flows";
import { z } from "zod";
import { dealerService } from "../../../lib/dealer-pricing";
import { generateTempPassword } from "../../store/advisor-signup/route";

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
  const pending = dealers.length
    ? await dealerService(req.scope).listDealerQuotes(
        { status: "revision_requested", dealer_id: dealers.map((d) => d.id) },
        { select: ["dealer_id"], take: 10000 }
      )
    : [];
  res.json({
    dealers: dealers.map((d) => ({
      ...d,
      customer: byId.get(d.customer_id) ?? null,
      pending_revisions: pending.filter((q) => q.dealer_id === d.id).length,
    })),
  });
}

/**
 * Bayiliğin bağlanacağı giriş yapabilen hesabı bulur.
 *
 * Panelden eklenen müşterinin şifresi yoktur (has_account=false) ve aynı
 * e-postayla siteye üye olunursa Medusa ikinci, ayrı bir kayıt açar. Bu yüzden:
 * şifreli kayıt varsa o kullanılır; yoksa bu kayda giriş hesabı açılır, adresi
 * ve geçmiş siparişleri korunur. Geçici şifre yalnız bu yanıtta döner, ilk
 * girişte değiştirilmesi zorunludur.
 */
async function resolveLoginAccount(
  req: MedusaRequest,
  customerId: string
): Promise<{ id: string; temp_password?: string } | null> {
  const customers = req.scope.resolve(Modules.CUSTOMER);
  const [customer] = await customers.listCustomers(
    { id: customerId },
    { select: ["id", "email", "has_account", "metadata"], take: 1 }
  );
  if (!customer) return null;
  if (customer.has_account) return { id: customer.id };

  const [account] = await customers.listCustomers(
    { email: customer.email, has_account: true },
    { select: ["id"], take: 1 }
  );
  if (account) return { id: account.id };

  const temp_password = generateTempPassword();
  const registration = await req.scope
    .resolve(Modules.AUTH)
    .register("emailpass", { body: { email: customer.email, password: temp_password } });
  if (!registration.success || !registration.authIdentity) {
    throw new MedusaError(
      MedusaError.Types.CONFLICT,
      "Bu e-posta için giriş hesabı açılamadı. Müşteriden şifre sıfırlamasını isteyip tekrar deneyin."
    );
  }
  await setAuthAppMetadataWorkflow(req.scope).run({
    input: {
      authIdentityId: registration.authIdentity.id,
      actorType: "customer",
      value: customer.id,
    },
  });
  await customers.updateCustomers(customer.id, {
    has_account: true,
    metadata: { ...(customer.metadata ?? {}), must_change_password: true },
    // has_account türlerde yok ama modül kabul eder; çekirdek de böyle günceller.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  return { id: customer.id, temp_password };
}

/**
 * POST /admin/dealers — müşteriyi bayi yapar: müşteri grubu ve gruba özel fiyat
 * listesi oluşturur. Liste boş başlar; fiyat girilmeyen ürünler genel fiyatla
 * satılır. Müşterinin giriş hesabı yoksa açılır (bkz. resolveLoginAccount).
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = CreateSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Geçersiz bilgi", errors: parsed.error.issues });
    return;
  }
  const { company_name, note } = parsed.data;

  const service = dealerService(req.scope);
  const [known] = await req.scope
    .resolve(Modules.CUSTOMER)
    .listCustomers({ id: parsed.data.customer_id }, { select: ["email"], take: 1 });
  if (!known) {
    res.status(404).json({ message: "Müşteri bulunamadı." });
    return;
  }
  const sameEmail = await req.scope
    .resolve(Modules.CUSTOMER)
    .listCustomers({ email: known.email }, { select: ["id"], take: 10 });
  const [existing] = await service.listDealers(
    { customer_id: sameEmail.map((c) => c.id) },
    { take: 1 }
  );
  if (existing) {
    res.status(409).json({ message: "Bu müşteri zaten bayi." });
    return;
  }

  const account = await resolveLoginAccount(req, parsed.data.customer_id);
  if (!account) {
    res.status(404).json({ message: "Müşteri bulunamadı." });
    return;
  }
  const customer_id = account.id;

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
    res.status(201).json({
      dealer,
      ...(account.temp_password ? { temp_password: account.temp_password } : {}),
    });
  } catch (e) {
    await deleteCustomerGroupsWorkflow(req.scope)
      .run({ input: { ids: [groupId] } })
      .catch(() => undefined);
    throw e;
  }
}
