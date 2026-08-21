import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * `auth.password_reset` → şifre sıfırlama bağlantısı e-postası.
 *
 * BU SUBSCRIBER OLMADAN "ŞİFREMİ UNUTTUM" ÇALIŞMAZ. Medusa token'ı üretip
 * bu event'i atmakla yetinir, e-postayı göndermek uygulamanın işidir. Bu dosya
 * eklenene kadar /sifremi-unuttum sayfası "bağlantı gönderildi" diyordu ama
 * kimseye bir şey ulaşmıyordu.
 *
 * Event datası: { entity_id (e-posta), actor_type, token, metadata }.
 * Token 15 DAKİKA geçerli (core-flows/generate-reset-password-token: expiresIn "15m").
 * Bu süreyi e-posta metninde de, storefront'taki bilgilendirmede de aynı yazın.
 *
 * actor_type ayrımı önemli: "customer" müşteri, "user" admin panelidir. İkisi
 * farklı sayfaya gitmeli — müşteriye admin linki göndermek işe yaramaz.
 */
export default async function passwordResetHandler({
  event: { data },
  container,
}: SubscriberArgs<{
  entity_id: string;
  actor_type: string;
  token: string;
}>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const notificationModule = container.resolve(Modules.NOTIFICATION);

  const email = data.entity_id;
  const token = data.token;

  if (!email || !token) {
    logger.warn("[password-reset] entity_id veya token yok — mail atlandı");
    return;
  }

  const storefront = process.env.STOREFRONT_URL || "http://localhost:3001";
  const backend = process.env.MEDUSA_BACKEND_URL || "http://localhost:9000";

  const resetUrl =
    data.actor_type === "user"
      ? `${backend}/app/reset-password?token=${encodeURIComponent(
          token
        )}&email=${encodeURIComponent(email)}`
      : `${storefront}/sifre-sifirla?token=${encodeURIComponent(token)}`;

  try {
    await notificationModule.createNotifications([
      {
        to: email,
        channel: "email",
        template: "auth.password_reset",
        data: {
          email,
          reset_url: resetUrl,
          is_admin: data.actor_type === "user",
        },
      },
    ]);
    // Token'ı LOG'A YAZMA — log'u gören hesabı ele geçirebilir.
    logger.info(`[password-reset] sıfırlama maili kuyruğa alındı → ${email}`);
  } catch (e) {
    logger.error(
      `[password-reset] mail gönderilemedi (${email}): ${
        e instanceof Error ? e.message : String(e)
      }`
    );
  }
}

export const config: SubscriberConfig = {
  event: "auth.password_reset",
};
