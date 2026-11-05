import { model } from "@medusajs/framework/utils";

/**
 * Bülten abonelik ve izin kaydı. Yeni akışın e-postaları migration'daki
 * koşullu unique index ile korunur; eski kayıtlar silinmez ve otomatik
 * olarak doğrulanmış izin sayılmaz.
 *
 * `source` örn. "footer-form" | "checkout-opt-in" | "blog-signup" — analytics
 * için kanal ayrımı.
 */
const NewsletterSubscription = model.define("newsletter_subscription", {
  id: model.id().primaryKey(),
  email: model.text(),
  /** E-posta sahibi bağlantıyla onay verdi mi? */
  is_confirmed: model.boolean().default(false),
  /** Yalnızca onaylanan ve çıkış yapmayan abonelik aktiftir. */
  is_active: model.boolean().default(false),
  source: model.text().nullable(),
  /** Welcome e-postası gönderildi mi? */
  welcome_sent_at: model.dateTime().nullable(),
  confirmation_nonce: model.text().nullable(),
  consent_requested_at: model.dateTime().nullable(),
  confirmation_sent_at: model.dateTime().nullable(),
  confirmed_at: model.dateTime().nullable(),
  unsubscribed_at: model.dateTime().nullable(),
  consent_text_version: model.text().nullable(),
});

export default NewsletterSubscription;
