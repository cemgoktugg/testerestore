import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { NEWSLETTER_MODULE } from "../../../../modules/newsletter";
import type NewsletterService from "../../../../modules/newsletter/service";
import { verifyNewsletterToken } from "../../../../lib/newsletter-token";
const Schema = z.object({ token: z.string().min(1).max(2048) }).strict();
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body);
  const token = parsed.success ? verifyNewsletterToken(parsed.data.token, "unsubscribe") : null;
  if (!token) { res.status(400).json({ message: "Abonelikten ayrılma bağlantısı geçersiz." }); return; }
  const service = req.scope.resolve<NewsletterService>(NEWSLETTER_MODULE);
  const [sub] = await service.listNewsletterSubscriptions({ id: token.sub });
  if (!sub || sub.confirmation_nonce !== token.nonce) { res.status(400).json({ message: "Bu bağlantı artık geçerli değil." }); return; }
  await service.updateNewsletterSubscriptions([{ id: sub.id, is_active: false, is_confirmed: false, unsubscribed_at: sub.unsubscribed_at || new Date() }]);
  res.json({ ok: true, message: "Bülten aboneliğiniz kapatıldı." });
}
