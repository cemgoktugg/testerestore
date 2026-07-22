import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { Modules } from "@medusajs/framework/utils";
import type NewsletterService from "../../../../modules/newsletter/service";
import { NEWSLETTER_MODULE } from "../../../../modules/newsletter";

const Schema = z.object({
  email: z.string().email(),
  source: z.string().max(50).optional(),
});

/**
 * POST /store/newsletter/subscribe
 *
 * Aboneliği oluşturur (zaten varsa re-activate eder) ve welcome e-postası
 * gönderir. İkinci aynı email çağrısı idempotent — duplicate welcome
 * göndermez.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = Schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid email",
      errors: parsed.error.issues,
    });
    return;
  }
  const email = parsed.data.email.toLowerCase().trim();
  const source = parsed.data.source ?? "footer-form";

  const svc = req.scope.resolve<NewsletterService>(NEWSLETTER_MODULE);
  const existing = await svc.listNewsletterSubscriptions({ email });

  let sub;
  let alreadySubscribed = false;
  if (existing.length > 0) {
    alreadySubscribed = !!existing[0].welcome_sent_at;
    [sub] = await svc.updateNewsletterSubscriptions([
      {
        id: existing[0].id,
        is_active: true,
        source: existing[0].source ?? source,
      },
    ]);
  } else {
    [sub] = await svc.createNewsletterSubscriptions([
      { email, source, is_active: true, is_confirmed: true },
    ]);
  }

  // Welcome maili gönder (sadece daha önce gönderilmediyse)
  if (!alreadySubscribed) {
    try {
      const notif = req.scope.resolve(Modules.NOTIFICATION);
      await notif.createNotifications([
        {
          to: email,
          channel: "email",
          template: "newsletter.welcome",
          data: {
            email,
            coupon_code: "HOSGELDIN5", // Admin'de bu kodu manuel açmalı
          },
        },
      ]);
      await svc.updateNewsletterSubscriptions([
        { id: sub.id, welcome_sent_at: new Date() },
      ]);
    } catch (e) {
      // Welcome mail gönderilemezse abonelik yine de geçerli kabul edilir
      req.scope
        .resolve("logger")
        .warn(
          `[newsletter] welcome email failed: ${
            e instanceof Error ? e.message : String(e)
          }`
        );
    }
  }

  res.status(201).json({
    ok: true,
    alreadySubscribed,
    subscription: { id: sub.id, email: sub.email },
  });
}
