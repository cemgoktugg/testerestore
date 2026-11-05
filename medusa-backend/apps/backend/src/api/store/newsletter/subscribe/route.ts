import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { Modules } from "@medusajs/framework/utils";
import type NewsletterService from "../../../../modules/newsletter/service";
import { NEWSLETTER_MODULE } from "../../../../modules/newsletter";
import { newsletterLink } from "../../../../lib/newsletter-token";

const Schema = z.object({
  email: z.string().trim().email().toLowerCase(),
  source: z.string().trim().max(50).optional(),
  consent: z.literal(true),
}).strict();
const response = { ok: true, message: "Aboneliğinizi tamamlamak için e-postanızdaki onay bağlantısını kullanın. Aboneliğiniz zaten onaylıysa yeniden işlem gerekmez." };

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Geçerli bir e-posta ve bülten izni gerekli." }); return; }
  // Validate signing and URL configuration before changing subscription state.
  try { newsletterLink("confirm", "configuration-check", "configuration-check"); }
  catch { res.status(503).json({ message: "Bülten kaydı şu anda kullanılamıyor. Lütfen daha sonra deneyin." }); return; }
  const service = req.scope.resolve<NewsletterService>(NEWSLETTER_MODULE);
  const subscriptions = await service.listNewsletterSubscriptions({ email: parsed.data.email }, { order: { created_at: "DESC" } });
  let sub = subscriptions[0];
  if (sub?.is_active && sub.is_confirmed && sub.confirmed_at) { res.json(response); return; }
  if (sub?.confirmation_sent_at && !sub.unsubscribed_at && Date.now() - new Date(sub.confirmation_sent_at).getTime() < 60_000) {
    res.json(response); return;
  }
  const nonce = randomUUID();
  const update = {
    is_active: false, is_confirmed: false, confirmation_nonce: nonce,
    source: parsed.data.source || "footer-form", consent_requested_at: new Date(),
    consent_text_version: "newsletter-2026-10-19", unsubscribed_at: null,
    confirmed_at: null, welcome_sent_at: null,
  };
  try {
    if (sub) [sub] = await service.updateNewsletterSubscriptions([{ id: sub.id, ...update }]);
    else [sub] = await service.createNewsletterSubscriptions([{ email: parsed.data.email, ...update }]);
  } catch (error) {
    const retries = await service.listNewsletterSubscriptions({ email: parsed.data.email });
    if (!retries.some((row) => row.confirmation_nonce)) throw error;
    res.status(202).json(response);
    return;
  }
  try {
    const notifications = req.scope.resolve(Modules.NOTIFICATION);
    await notifications.createNotifications([{
      to: sub.email, channel: "email", template: "newsletter.confirm",
      data: { confirm_url: newsletterLink("confirm", sub.id, nonce), unsubscribe_url: newsletterLink("unsubscribe", sub.id, nonce) },
    }]);
    await service.updateNewsletterSubscriptions([{ id: sub.id, confirmation_sent_at: new Date() }]);
  } catch {
    req.scope.resolve("logger").warn("[newsletter] Onay bildirimi gönderilemedi; abonelik etkinleştirilmedi.");
    res.status(503).json({ message: "Onay e-postası şu anda gönderilemedi. Lütfen daha sonra tekrar deneyin." });
    return;
  }
  res.status(202).json(response);
}
