import { TRY_PER_POINT } from "./ledger";
import type { CreatePromotionDTO, IPromotionModuleService } from "@medusajs/framework/types";
import type LoyaltyService from "./service";

export function loyaltyPromotion(customerId: string, code: string, points: number): CreatePromotionDTO {
  return {
    code, type: "standard", status: "draft", is_automatic: false, limit: 1,
    application_method: { type: "fixed", target_type: "order", allocation: "across", value: points * TRY_PER_POINT, currency_code: "try" },
    rules: [{ attribute: "customer_id", operator: "eq", values: [customerId] }],
  };
}

/** Create an unusable draft before debiting; activate only after the durable debit commits.
 * A retry resumes the same request/code and never spends the points twice. */
export async function redeemPoints(
  loyalty: Pick<LoyaltyService, "prepareRedemption" | "reserveRedemption" | "completeRedemption">,
  promotions: Pick<IPromotionModuleService, "listPromotions" | "createPromotions" | "updatePromotions">,
  input: { customerId: string; requestKey: string; points: number }
) {
  const redemption = await loyalty.prepareRedemption(input);
  if (redemption.status === "ready") return redemption;
  let [promotion] = await promotions.listPromotions({ code: redemption.code });
  if (!promotion) {
    try {
      [promotion] = await promotions.createPromotions([loyaltyPromotion(input.customerId, redemption.code, input.points)]);
    } catch (error) {
      // Concurrent retries can race on the unique code; recover the same draft.
      [promotion] = await promotions.listPromotions({ code: redemption.code });
      if (!promotion) throw error;
    }
  }
  if (!promotion) throw new Error("Kupon oluşturulamadı; puanlarınız düşülmedi.");
  await loyalty.reserveRedemption({ customerId: input.customerId, redemptionId: redemption.id, promotionId: promotion.id });
  await promotions.updatePromotions([{ id: promotion.id, status: "active" }]);
  return loyalty.completeRedemption({ customerId: input.customerId, redemptionId: redemption.id });
}
