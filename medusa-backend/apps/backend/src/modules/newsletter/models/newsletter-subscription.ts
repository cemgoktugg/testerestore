import { model } from "@medusajs/framework/utils";

/**
 * Newsletter abonelik kaydı. Email unique, ama unique constraint'i runtime
 * tarafında garanti etmiyoruz — duplicate çağrıda servis aynı email'i
 * günceller (re-subscribe akışı için).
 *
 * `source` örn. "footer-form" | "checkout-opt-in" | "blog-signup" — analytics
 * için kanal ayrımı.
 */
const NewsletterSubscription = model.define("newsletter_subscription", {
  id: model.id().primaryKey(),
  email: model.text(),
  /** Çıft optin başlamış mı? (default false; opsiyonel) */
  is_confirmed: model.boolean().default(true),
  /** Manuel admin unsubscribe için. */
  is_active: model.boolean().default(true),
  source: model.text().nullable(),
  /** Welcome e-postası gönderildi mi? */
  welcome_sent_at: model.dateTime().nullable(),
});

export default NewsletterSubscription;
