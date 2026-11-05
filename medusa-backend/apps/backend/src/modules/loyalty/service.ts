import { InjectManager, InjectTransactionManager, MedusaContext, MedusaService } from "@medusajs/framework/utils";
import type { Context } from "@medusajs/framework/types";
import type { EntityManager } from "@medusajs/framework/mikro-orm/knex";
import LoyaltyAccount from "./models/loyalty-account";
import LoyaltyTransaction from "./models/loyalty-transaction";
import LoyaltyRedemption from "./models/loyalty-redemption";
import { applyLedgerAction, type LedgerAction } from "./ledger";

/** Kazanım oranı: her 100 TL = 1 puan. */
export { POINTS_PER_TRY, TRY_PER_POINT } from "./ledger";
/** Harcama oranı: 1 puan = 0.5 TL indirim. */

class LoyaltyService extends MedusaService({
  LoyaltyAccount,
  LoyaltyTransaction,
  LoyaltyRedemption,
}) {
  /** Müşterinin hesabını getir veya oluştur. */
  @InjectManager()
  async getOrCreateAccount(customerId: string, @MedusaContext() context?: Context<EntityManager>) {
    return this.apply_({ type: "account", customerId }, context);
  }

  /**
   * Sipariş için kazanım puanlarını yaz.
   * `idempotencyKey` aynı order_id+customer_id için tekrar çağrılmasını
   * engeller (subscriber retry'larda double-credit önler).
   */
  @InjectManager()
  async creditForOrder(opts: {
    customerId: string;
    orderId: string;
    totalTry: number;
  }, @MedusaContext() context?: Context<EntityManager>) {
    return this.apply_({ type: "credit", ...opts }, context);
  }

  @InjectManager()
  async reverseForOrder(opts: { customerId: string; orderId: string; eventKey: string; totalTry: number }, @MedusaContext() context?: Context<EntityManager>) {
    return this.apply_({ type: "reverse", ...opts }, context);
  }

  @InjectManager()
  async prepareRedemption(opts: { customerId: string; requestKey: string; points: number }, @MedusaContext() context?: Context<EntityManager>) {
    return this.apply_({ type: "prepare", ...opts }, context);
  }

  @InjectManager()
  async reserveRedemption(opts: { customerId: string; redemptionId: string; promotionId: string }, @MedusaContext() context?: Context<EntityManager>) {
    return this.apply_({ type: "reserve", ...opts }, context);
  }

  @InjectManager()
  async completeRedemption(opts: { customerId: string; redemptionId: string }, @MedusaContext() context?: Context<EntityManager>) {
    return this.apply_({ type: "ready", ...opts }, context);
  }

  @InjectTransactionManager()
  protected async apply_(action: LedgerAction, @MedusaContext() context?: Context<EntityManager>) {
    if (!context?.transactionManager) throw new Error("Puan işlemi transaction gerektirir.");
    return applyLedgerAction(context.transactionManager, action);
  }
}

export default LoyaltyService;
