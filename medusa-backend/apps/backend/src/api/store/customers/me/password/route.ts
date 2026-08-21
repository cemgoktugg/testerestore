/**
 * POST /store/customers/me/password
 *
 * Giriş yapmış müşterinin kendi şifresini değiştirmesi.
 *
 * NEDEN ÖZEL BİR UÇ: Medusa v2'nin hazır ucu (/auth/customer/emailpass/update)
 * token içinde `entity_id` arıyor (validate-token middleware). Bu alan yalnızca
 * "şifre sıfırlama" token'ında var; normal oturum JWT'sinde YOK. Yani giriş
 * yapmış bir müşteri o uçla şifresini değiştiremiyor — e-posta linki almadan
 * şifre değiştirmenin başka yolu kalmıyordu. Danışman sohbetinden açılan
 * hesaplar geçici şifreyle geldiği için "ilk girişte değiştir" akışı şart.
 *
 * Auth: `/store/customers/me*` yolu Medusa'nın kendi middleware'i tarafından
 * korunuyor — buraya yalnızca doğrulanmış müşteri isteği ulaşır.
 *
 * Mevcut şifre HER DURUMDA doğrulanıyor: oturum çerezi/JWT'si çalınmış olsa
 * bile saldırgan şifreyi değiştirip hesabı kalıcı ele geçiremesin.
 */
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { updateCustomersWorkflow } from "@medusajs/medusa/core-flows";

const Schema = z.object({
  current_password: z.string().min(1, "Mevcut şifrenizi girin."),
  new_password: z
    .string()
    .min(8, "Yeni şifre en az 8 karakter olmalı.")
    .max(128),
});

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const customerId = (req as any).auth_context?.actor_id as string | undefined;
  if (!customerId) {
    res.status(401).json({ message: "Giriş yapmanız gerekiyor." });
    return;
  }

  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: parsed.error.issues[0]?.message ?? "Geçersiz istek",
      code: "VALIDATION_FAILED",
    });
    return;
  }
  const { current_password, new_password } = parsed.data;

  if (current_password === new_password) {
    res.status(400).json({
      message: "Yeni şifre mevcut şifrenizden farklı olmalı.",
      code: "SAME_PASSWORD",
    });
    return;
  }

  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  const customerModule = req.scope.resolve(Modules.CUSTOMER);
  const authModule = req.scope.resolve(Modules.AUTH);

  const customer = await customerModule.retrieveCustomer(customerId);
  const email = customer?.email;
  if (!email) {
    res.status(409).json({
      message: "Hesabınızda e-posta tanımlı değil.",
      code: "NO_EMAIL",
    });
    return;
  }

  // 1) Mevcut şifreyi doğrula.
  const check = await authModule.authenticate("emailpass", {
    body: { email, password: current_password },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any);
  if (!check.success) {
    res.status(401).json({
      message: "Mevcut şifreniz hatalı.",
      code: "INVALID_CURRENT_PASSWORD",
    });
    return;
  }

  // 2) Yeni şifreyi yaz.
  const updated = await authModule.updateProvider("emailpass", {
    entity_id: email,
    password: new_password,
  });
  if (!updated.success) {
    logger.error(
      `[password-change] güncellenemedi (${email}): ${updated.error ?? "bilinmiyor"}`
    );
    res.status(500).json({
      message: "Şifre güncellenemedi. Lütfen tekrar deneyin.",
      code: "UPDATE_FAILED",
    });
    return;
  }

  // 3) Zorunlu değişim bayrağını kaldır. Şifre zaten değişti; bayrak
  //    silinemezse müşteri ekranı tekrar görür ama hesabı çalışır durumda —
  //    bu yüzden hatası akışı bozmuyor.
  try {
    const metadata = { ...(customer.metadata || {}) } as Record<string, unknown>;
    delete metadata.must_change_password;
    await updateCustomersWorkflow(req.scope).run({
      input: { selector: { id: customerId }, update: { metadata } },
    });
  } catch (e) {
    logger.warn(
      `[password-change] must_change_password bayrağı silinemedi (${email}): ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }

  logger.info(`[password-change] şifre güncellendi | ${email}`);
  res.json({ ok: true });
}
