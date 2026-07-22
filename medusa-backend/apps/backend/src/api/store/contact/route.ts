import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils";

const Schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email(),
  phone: z.string().max(40).optional().nullable(),
  topic: z.enum(["quote", "support", "partnership", "other"]).optional(),
  message: z.string().min(5).max(4000),
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

  // 1) Lead'i her durumda kalıcı log'a düş — e-posta sağlayıcısı kapalı olsa bile kaybolmaz.
  logger.info(
    `[contact] Yeni mesaj | Konu: ${topicLabel} | Ad: ${name} | E-posta: ${email} | Tel: ${
      phone || "-"
    } | Mesaj: ${message.replace(/\s+/g, " ").slice(0, 500)}`
  );

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
          subject: `Yeni iletişim formu — ${topicLabel} (${name})`,
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

  res.status(201).json({ ok: true });
}
