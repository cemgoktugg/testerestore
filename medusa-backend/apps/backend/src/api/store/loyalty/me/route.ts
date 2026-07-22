import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type LoyaltyService from "../../../../modules/loyalty/service";
import { LOYALTY_MODULE } from "../../../../modules/loyalty";
import { POINTS_PER_TRY, TRY_PER_POINT } from "../../../../modules/loyalty/service";

/**
 * GET /store/loyalty/me
 *
 * Giriş yapmış müşterinin puan bakiyesi + son işlemler.
 * Auth: Medusa'nın store auth middleware'i `req.auth_context.actor_id`
 * üzerinden customer_id verir; login değilse 401.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ctx = (req as any).auth_context;
  const customerId = ctx?.actor_id as string | undefined;
  if (!customerId) {
    res.status(401).json({ message: "Auth required" });
    return;
  }
  const loyalty = req.scope.resolve<LoyaltyService>(LOYALTY_MODULE);
  const account = await loyalty.getOrCreateAccount(customerId);
  const txns = await loyalty.listLoyaltyTransactions(
    { customer_id: customerId },
    { order: { created_at: "DESC" }, take: 20 }
  );

  res.json({
    balance: Number(account.balance),
    lifetime_earned: Number(account.lifetime_earned),
    transactions: txns,
    rates: {
      points_per_try: POINTS_PER_TRY,
      try_per_point: TRY_PER_POINT,
    },
    /** Bakiyenin TL karşılığı (informational). */
    balance_try: Math.floor(Number(account.balance) * TRY_PER_POINT * 100) / 100,
  });
}
