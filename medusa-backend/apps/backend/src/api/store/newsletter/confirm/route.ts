import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { z } from "zod";
import { NEWSLETTER_MODULE } from "../../../../modules/newsletter";
import type NewsletterService from "../../../../modules/newsletter/service";
import { newsletterLink, verifyNewsletterToken } from "../../../../lib/newsletter-token";
const Schema = z.object({ token: z.string().min(1).max(2048) }).strict();
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body);
  const token = parsed.success ? verifyNewsletterToken(parsed.data.token, "confirm") : null;
  if (!token) { res.status(400).json({ message: "Bağlantı geçersiz veya süresi dolmuş. Lütfen yeniden abone olun." }); return; }
  const service = req.scope.resolve<NewsletterService>(NEWSLETTER_MODULE);
  const [sub] = await service.listNewsletterSubscriptions({ id: token.sub });
  if (!sub || sub.confirmation_nonce !== token.nonce || sub.unsubscribed_at) {
    res.status(400).json({ message: "Bu bağlantı artık geçerli değil. Lütfen yeniden abone olun." }); return;
  }
  if (sub.is_active && sub.is_confirmed && sub.confirmed_at) { res.json({ ok: true, message: "Bülten aboneliğiniz zaten onaylı." }); return; }
  await service.updateNewsletterSubscriptions([{ id: sub.id, is_active: true, is_confirmed: true, confirmed_at: new Date() }]);
  try {
    const notifications = req.scope.resolve(Modules.NOTIFICATION);
    await notifications.createNotifications([{
      to: sub.email, channel: "email", template: "newsletter.welcome",
      data: { unsubscribe_url: newsletterLink("unsubscribe", sub.id, token.nonce) },
    }]);
    await service.updateNewsletterSubscriptions([{ id: sub.id, welcome_sent_at: new Date() }]);
  } catch {
    req.scope.resolve("logger").warn("[newsletter] Onay kaydedildi, hoş geldiniz bildirimi gönderilemedi.");
  }
  res.json({ ok: true, message: "Bülten aboneliğiniz onaylandı. Teşekkürler!" });
}
