import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils";
import type { MedusaContainer } from "@medusajs/framework/types";
import { cartRecoveryUrl } from "../lib/cart-recovery-token";
import { newsletterLink } from "../lib/newsletter-token";
import { NEWSLETTER_MODULE } from "../modules/newsletter";
import type NewsletterService from "../modules/newsletter/service";

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
  const newsletter = container.resolve<NewsletterService>(NEWSLETTER_MODULE);

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
    // Snapshot all pages before updating metadata (which changes updated_at).
    for (let skip = 0; ; skip += 100) {
      const page = await cartModule.listCarts(
        { updated_at: { $lt: oneHourAgo.toISOString(), $gt: sixHoursAgo.toISOString() } },
        { take: 100, skip, relations: ["items"], order: { id: "ASC" } }
      );
      carts.push(...page.filter(cart => !cart.completed_at) as typeof carts);
      if (page.length < 100) break;
    }
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
      // A cart email is not a marketing subscription. Use confirmed preferences.
      const [subscription] = await newsletter.listNewsletterSubscriptions({ email: email.toLowerCase(), is_active: true, is_confirmed: true });
      if (!subscription?.confirmed_at || !subscription.confirmation_nonce) continue;
      await notificationModule.createNotifications([
        {
          to: email,
          channel: "email",
          template: "cart.abandoned",
          idempotency_key: `cart-abandoned:${cart.id}`,
          data: {
            cart_id: cart.id,
            recovery_url: cartRecoveryUrl(cart.id, email),
            unsubscribe_url: newsletterLink("unsubscribe", subscription.id, subscription.confirmation_nonce),
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
      await cartModule.updateCarts(cart.id, {
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
