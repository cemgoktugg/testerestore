import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

/**
 * Iyzico 3DS callback target — store dışı, public.
 *
 * ÖNEMLİ: Bu route bilerek `/store` ALTINDA DEĞİL. Medusa tüm `/store/*`
 * isteklerinde `x-publishable-api-key` header'ı zorunlu kılar; iyzico ise
 * ödeme bittikten sonra tarayıcıdan callback'e POST ederken bu header'ı
 * göndermez → istek handler'a ulaşmadan 400 ile reddedilirdi. Bu yüzden
 * callback'i public `/iyzico/callback` yoluna taşıdık.
 *
 * Akış:
 *   1. iyzico, ödeme sonrası buraya `token` ile (form-urlencoded) POST eder.
 *   2. Token'ı storefront'a iletip 302 redirect ederiz.
 *   3. Storefront `cart.complete` çağırır → payment provider'ın
 *      authorizePayment'i token'ı iyzico'dan retrieve ederek doğrular ve
 *      order'ı oluşturur.
 */
function extractToken(req: MedusaRequest): string {
  const body = (req.body as Record<string, unknown>) || {};
  return (
    (body.token as string) ||
    (req.query.token as string) ||
    ""
  ).trim();
}

async function handle(req: MedusaRequest, res: MedusaResponse) {
  const storefront = process.env.STOREFRONT_URL || "http://localhost:3001";
  const token = extractToken(req);

  // eslint-disable-next-line @typescript-eslint/no-console
  console.log(
    `[iyzico-callback] ${req.method} token=${token ? token.slice(0, 12) + "…" : "(YOK)"}`
  );

  if (!token) {
    res.redirect(302, `${storefront}/checkout?payment=error&reason=missing_token`);
    return;
  }

  res.redirect(
    302,
    `${storefront}/checkout/iyzico-callback?token=${encodeURIComponent(token)}`
  );
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  return handle(req, res);
}

// iyzico bazı durumlarda GET ile de döner
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  return handle(req, res);
}
