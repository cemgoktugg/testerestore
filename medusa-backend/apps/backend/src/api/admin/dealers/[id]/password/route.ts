import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { dealerService } from "../../../../../lib/dealer-pricing";
import { generateTempPassword } from "../../../../store/advisor-signup/route";

/**
 * POST /admin/dealers/:id/password — bayiye yeni geçici şifre üretir.
 *
 * Şifreler geri okunamaz; yönetici unutulan ya da kaçırılan şifreyi ancak
 * yenisiyle değiştirebilir. Mevcut şifre çalışmaz olur, yeni şifre yalnız bu
 * yanıtta döner ve ilk girişte değiştirilmesi zorunludur.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const [dealer] = await dealerService(req.scope).listDealers(
    { id: req.params.id },
    { take: 1 }
  );
  if (!dealer) {
    res.status(404).json({ message: "Bayi bulunamadı." });
    return;
  }

  const customers = req.scope.resolve(Modules.CUSTOMER);
  const customer = await customers.retrieveCustomer(dealer.customer_id, {
    select: ["id", "email", "metadata"],
  });

  const temp_password = generateTempPassword();
  const updated = await req.scope
    .resolve(Modules.AUTH)
    .updateProvider("emailpass", { entity_id: customer.email, password: temp_password });
  if (!updated.success) {
    req.scope
      .resolve("logger")
      .error(`[dealer-password] güncellenemedi (${dealer.id}): ${updated.error ?? "bilinmiyor"}`);
    res.status(500).json({ message: "Şifre oluşturulamadı. Lütfen tekrar deneyin." });
    return;
  }

  await customers.updateCustomers(customer.id, {
    metadata: { ...(customer.metadata ?? {}), must_change_password: true },
  });

  res.setHeader("Cache-Control", "no-store");
  res.json({ email: customer.email, temp_password });
}
