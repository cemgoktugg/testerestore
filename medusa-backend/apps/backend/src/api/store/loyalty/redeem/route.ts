import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import type LoyaltyService from "../../../../modules/loyalty/service";
import { LOYALTY_MODULE } from "../../../../modules/loyalty";
import { redeemPoints } from "../../../../modules/loyalty/redeem";

export async function POST(req: AuthenticatedMedusaRequest<{ points?: unknown; request_key?: unknown }>, res: MedusaResponse) {
  const customerId = req.auth_context?.actor_id;
  if (!customerId) return res.status(401).json({ message: "Giriş yapmalısınız." });
  const { points, request_key: requestKey } = req.body ?? {};
  if (typeof points !== "number" || !Number.isSafeInteger(points) || points < 1 || points > 1_000_000 ||
      typeof requestKey !== "string" || !/^[a-zA-Z0-9-]{16,80}$/.test(requestKey)) {
    return res.status(400).json({ message: "Geçerli puan miktarı ve işlem kimliği gerekli." });
  }
  const loyalty = req.scope.resolve<LoyaltyService>(LOYALTY_MODULE);
  try {
    const redemption = await redeemPoints(loyalty, req.scope.resolve(Modules.PROMOTION), { customerId, points, requestKey });
    return res.json({ redemption });
  } catch {
    // Persisted draft/reserved redemptions are visible on /me and safely retryable.
    return res.status(409).json({ message: "Kupon dönüşümü tamamlanamadı. Bakiyenizi kontrol edip aynı işlemi yeniden deneyin." });
  }
}
