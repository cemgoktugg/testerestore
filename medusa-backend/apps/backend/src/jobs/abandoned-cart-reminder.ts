import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import type { MedusaContainer } from "@medusajs/framework/types";

/**
 * Abandoned cart hatırlatma job'ı.
 *
 * Çalışma: her 30 dakikada bir, son 1 saat içinde güncellenmiş ancak
 * tamamlanmamış (completed_at = null) ve email'i olan cart'ları
 * tarar, her birine **bir defaya mahsus** hatırlatma e-postası gönderir.
 *
 * "Bir defaya mahsus" garantisi: cart.metadata.abandoned_reminder_sent
 * flag'i. Sıfırdan göndermek için bu metadata'yı silebilirsiniz.
 *
 * Schedule formatı: cron string. Medusa job runner'ı her boot'ta otomatik
 * kayıt eder.
 */
export default async function abandonedCartReminderJob(
  container: MedusaContainer
) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const cartModule = container.resolve(Modules.CART);
  const notificationModule = container.resolve(Modules.NOTIFICATION);

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);

  let carts: Array<{
    id: string;
    email: string | null;
    metadata?: Record<string, unknown> | null;
    items?: Array<{ title?: string; quantity?: number }> | null;
    total?: number | null;
    currency_code?: string | null;
    completed_at?: Date | null;
    updated_at?: Date | null;
  }> = [];

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    carts = (await (cartModule as any).listCarts(
      {
        completed_at: null,
        updated_at: { $lt: oneHourAgo, $gt: sixHoursAgo },
      },
      { take: 100 }
    )) as typeof carts;
  } catch (e) {
    logger.error(
      `[abandoned-cart-reminder] listCarts failed: ${e instanceof Error ? e.message : String(e)}`
    );
    return;
  }

  let sent = 0;
  for (const cart of carts) {
    const email = cart.email?.trim();
    if (!email) continue;
    if (!cart.items?.length) continue;
    const meta = (cart.metadata || {}) as Record<string, unknown>;
    if (meta.abandoned_reminder_sent) continue;

    try {
      await notificationModule.createNotifications([
        {
          to: email,
          channel: "email",
          template: "cart.abandoned",
          data: {
            cart_id: cart.id,
            item_count: cart.items.length,
            total: cart.total ?? 0,
            currency_code: cart.currency_code ?? "try",
            items: cart.items.slice(0, 3).map((it) => ({
              title: it.title || "Ürün",
              quantity: it.quantity ?? 1,
            })),
          },
        },
      ]);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (cartModule as any).updateCarts(cart.id, {
        metadata: { ...meta, abandoned_reminder_sent: new Date().toISOString() },
      });
      sent++;
    } catch (e) {
      logger.error(
        `[abandoned-cart-reminder] failed for ${cart.id}: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  }

  if (sent > 0) {
    logger.info(`[abandoned-cart-reminder] sent ${sent} reminders.`);
  }
}

export const config = {
  // Her 30 dakikada bir
  name: "abandoned-cart-reminder",
  schedule: "*/30 * * * *",
};
