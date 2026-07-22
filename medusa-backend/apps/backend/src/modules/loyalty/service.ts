import { MedusaService } from "@medusajs/framework/utils";
import LoyaltyAccount from "./models/loyalty-account";
import LoyaltyTransaction from "./models/loyalty-transaction";

/** Kazanım oranı: her 100 TL = 1 puan. */
export const POINTS_PER_TRY = 1 / 100;
/** Harcama oranı: 1 puan = 0.5 TL indirim. */
export const TRY_PER_POINT = 0.5;

class LoyaltyService extends MedusaService({
  LoyaltyAccount,
  LoyaltyTransaction,
}) {
  /** Müşterinin hesabını getir veya oluştur. */
  async getOrCreateAccount(customerId: string) {
    const list = await this.listLoyaltyAccounts({ customer_id: customerId });
    if (list.length > 0) return list[0];
    const [created] = await this.createLoyaltyAccounts([
      { customer_id: customerId, balance: 0, lifetime_earned: 0 },
    ]);
    return created;
  }

  /**
   * Sipariş için kazanım puanlarını yaz.
   * `idempotencyKey` aynı order_id+customer_id için tekrar çağrılmasını
   * engeller (subscriber retry'larda double-credit önler).
   */
  async creditForOrder(opts: {
    customerId: string;
    orderId: string;
    totalTry: number;
  }) {
    const existing = await this.listLoyaltyTransactions({
      customer_id: opts.customerId,
      order_id: opts.orderId,
    });
    if (existing.length > 0) return existing[0]; // idempotent

    const points = Math.floor(opts.totalTry * POINTS_PER_TRY);
    if (points <= 0) return null;

    const account = await this.getOrCreateAccount(opts.customerId);
    await this.updateLoyaltyAccounts([
      {
        id: account.id,
        balance: Number(account.balance) + points,
        lifetime_earned: Number(account.lifetime_earned) + points,
      },
    ]);

    const [txn] = await this.createLoyaltyTransactions([
      {
        customer_id: opts.customerId,
        order_id: opts.orderId,
        points,
        reason: `Sipariş ${opts.orderId.slice(-8).toUpperCase()} — ${Math.round(opts.totalTry)} TL × %1 = ${points} puan`,
      },
    ]);
    return txn;
  }
}

export default LoyaltyService;
