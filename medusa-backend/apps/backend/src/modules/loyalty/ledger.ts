import { randomUUID } from "node:crypto";

export const POINTS_PER_TRY = 1 / 100;
export const TRY_PER_POINT = 0.5;

export function pointsForTotal(total: number) {
  if (!Number.isFinite(total) || total < 0) throw new Error("Geçersiz sipariş tutarı.");
  return Math.floor(total * POINTS_PER_TRY);
}

export function reversalDelta(credited: number, eligible: number) {
  return Math.min(0, Math.max(0, eligible) - Math.max(0, credited));
}

export interface LedgerManager {
  execute(sql: string, params?: unknown[]): Promise<any>;
}

export type LedgerAction =
  | { type: "account"; customerId: string }
  | { type: "credit"; customerId: string; orderId: string; totalTry: number }
  | { type: "reverse"; customerId: string; orderId: string; eventKey: string; totalTry: number }
  | { type: "prepare"; customerId: string; requestKey: string; points: number }
  | { type: "reserve"; customerId: string; redemptionId: string; promotionId: string }
  | { type: "ready"; customerId: string; redemptionId: string };

/** Must execute inside one database transaction. The customer lock also covers first-account creation. */
export async function applyLedgerAction(db: LedgerManager, action: LedgerAction) {
  const customer = action.customerId;
  await db.execute("select pg_advisory_xact_lock(hashtext(?))", [`loyalty:${customer}`]);
  await db.execute(
    `insert into loyalty_account (id, customer_id, balance, lifetime_earned) values (?, ?, 0, 0)
     on conflict (customer_id) where deleted_at is null do nothing`,
    [`loyacc_${randomUUID()}`, customer]
  );
  const [account] = await db.execute("select * from loyalty_account where customer_id = ? and deleted_at is null for update", [customer]);
  if (!account) throw new Error("Puan hesabı bulunamadı.");
  if (action.type === "account") return account;

  const post = async (points: number, key: string, reason: string, orderId: string | null = null, target: number | null = null) => {
    const [transaction] = await db.execute(
      `insert into loyalty_transaction (id, customer_id, order_id, points, reason, idempotency_key, target_points)
       values (?, ?, ?, ?, ?, ?, ?) returning *`,
      [`loytxn_${randomUUID()}`, customer, orderId, points, reason, key, target]
    );
    await db.execute(
      "update loyalty_account set balance = balance + ?, lifetime_earned = lifetime_earned + ?, updated_at = now() where id = ?",
      [points, action.type === "credit" ? Math.max(0, points) : 0, account.id]
    );
    return transaction;
  };

  if (action.type === "credit" || action.type === "reverse") {
    const key = action.type === "credit" ? `earn:${action.orderId}` : action.eventKey;
    const [existing] = await db.execute("select * from loyalty_transaction where idempotency_key = ? and deleted_at is null", [key]);
    if (existing) return existing;
    const rows = await db.execute("select * from loyalty_transaction where customer_id = ? and order_id = ? and deleted_at is null", [customer, action.orderId]);
    const eligible = pointsForTotal(action.totalTry);
    if (action.type === "credit") {
      // Old ledger entries had no idempotency key; do not credit those orders again.
      const credited = rows.find((row: any) => Number(row.points) > 0);
      if (credited) return credited;
      const caps = rows.filter((row: any) => row.target_points != null).map((row: any) => Number(row.target_points));
      const points = Math.min(eligible, ...caps);
      return post(points, key, "Tamamlanan sipariş puan kazanımı", action.orderId);
    }
    const net = rows.reduce((sum: number, row: any) => sum + Number(row.points), 0);
    // Keep a zero-value cap even when cancellation/return arrives before completion.
    return post(reversalDelta(net, eligible), key, "İptal / iade puan düzeltmesi", action.orderId, eligible);
  }

  if (action.type === "prepare") {
    if (!Number.isSafeInteger(action.points) || action.points < 1) throw new Error("Geçerli bir puan miktarı girin.");
    const [existing] = await db.execute("select * from loyalty_redemption where customer_id = ? and request_key = ? and deleted_at is null", [customer, action.requestKey]);
    if (existing) {
      if (Number(existing.points) !== action.points) throw new Error("Bu işlem kimliği farklı bir puan miktarı için kullanılmış.");
      return existing;
    }
    if (Number(account.balance) < action.points) throw new Error("Puan bakiyeniz yetersiz.");
    const [redemption] = await db.execute(
      `insert into loyalty_redemption (id, customer_id, request_key, points, code, status)
       values (?, ?, ?, ?, ?, 'draft') returning *`,
      [`loyred_${randomUUID()}`, customer, action.requestKey, action.points, `LP-${randomUUID().replaceAll("-", "").toUpperCase()}`]
    );
    return redemption;
  }

  const [redemption] = await db.execute("select * from loyalty_redemption where id = ? and customer_id = ? and deleted_at is null for update", [action.redemptionId, customer]);
  if (!redemption) throw new Error("Puan dönüşümü bulunamadı.");
  if (action.type === "reserve") {
    if (redemption.status !== "draft") return redemption;
    if (Number(account.balance) < Number(redemption.points)) throw new Error("Puan bakiyeniz yetersiz.");
    await post(-Number(redemption.points), `redeem:${redemption.id}`, `${redemption.code} kuponuna dönüştürüldü`);
    const [reserved] = await db.execute("update loyalty_redemption set status = 'reserved', promotion_id = ?, updated_at = now() where id = ? returning *", [action.promotionId, redemption.id]);
    return reserved;
  }
  if (redemption.status === "draft") throw new Error("Kupon puanları henüz ayrılmadı.");
  const [ready] = await db.execute("update loyalty_redemption set status = 'ready', updated_at = now() where id = ? returning *", [redemption.id]);
  return ready;
}
