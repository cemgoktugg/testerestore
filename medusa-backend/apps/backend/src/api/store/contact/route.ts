import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { randomUUID } from "node:crypto";
import { CUSTOMER_REQUEST_MODULE } from "../../../modules/customer-request";
import type CustomerRequestService from "../../../modules/customer-request/service";
import { requestNumber } from "../../../lib/customer-request";

const Schema = z.object({
  request_key: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().toLowerCase(),
  phone: z.string().max(40).optional().nullable(),
  topic: z.enum(["quote", "support", "partnership", "other"]).optional(),
  message: z.string().trim().min(5).max(4000),
});

const TOPIC_LABEL: Record<string, string> = {
  quote: "Fiyat Teklifi",
  support: "Teknik Destek",
  partnership: "İş Birliği",
  other: "Diğer",
};

/**
 * POST /store/contact
 *
 * İletişim formu gönderimini alır. Mesaj HER DURUMDA log'a yazılır (e-posta
 * yapılandırılmamış olsa bile lead kaybolmaz) ve mağaza e-postasına bildirim
 * denemesi yapılır.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Geçersiz form", errors: parsed.error.issues });
    return;
  }
  const { name, email, phone, topic, message } = parsed.data;
  const logger = req.scope.resolve(ContainerRegistrationKeys.LOGGER);
  const topicLabel = TOPIC_LABEL[topic ?? "other"];

  const service = req.scope.resolve<CustomerRequestService>(CUSTOMER_REQUEST_MODULE);
  const requestKey = parsed.data.request_key || randomUUID();
  const [existing] = await service.listCustomerRequests({ request_key: requestKey, kind: "contact" });
  if (existing) {
    if (existing.email !== email) { res.status(409).json({ message: "Bu talep anahtarı kullanılmış." }); return; }
    res.json({ ok: true, request_number: existing.request_number });
    return;
  }
  let saved;
  try {
    [saved] = await service.createCustomerRequests([{
      request_key: requestKey, request_number: requestNumber(), kind: "contact",
      name, email, phone: phone || null, topic: topic || "other", message,
    }]);
  } catch (error) {
    const [retry] = await service.listCustomerRequests({ request_key: requestKey, kind: "contact", email });
    if (!retry) throw error;
    res.json({ ok: true, request_number: retry.request_number });
    return;
  }
  logger.info(`[contact] Talep kaydedildi: ${saved.request_number}`);

  // 2) Mağaza e-postasına bildirim dene (varsa).
  const to =
    process.env.CONTACT_TO_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    "onboarding@resend.dev";
  try {
    const notif = req.scope.resolve(Modules.NOTIFICATION);
    await notif.createNotifications([
      {
        to,
        channel: "email",
        template: "contact.received",
        data: {
          subject: `Yeni talep ${saved.request_number} — ${topicLabel}`,
          body:
            `Konu: ${topicLabel}\n` +
            `Ad Soyad: ${name}\n` +
            `E-posta: ${email}\n` +
            `Telefon: ${phone || "-"}\n\n` +
            `Mesaj:\n${message}`,
          name,
          email,
          phone: phone || "",
          topic: topicLabel,
          message,
        },
      },
    ]);
  } catch (e) {
    logger.warn(
      `[contact] bildirim e-postası gönderilemedi: ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }

  res.status(201).json({ ok: true, request_number: saved.request_number });
}
