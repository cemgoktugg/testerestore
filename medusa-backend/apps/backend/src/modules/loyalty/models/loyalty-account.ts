import { model } from "@medusajs/framework/utils";

/**
 * Müşteri puan hesabı — her customer için 1 satır.
 * Hareketler `LoyaltyTransaction` tablosunda; bu sadece hızlı bakiye için.
 */
const LoyaltyAccount = model.define("loyalty_account", {
  id: model.id().primaryKey(),
  customer_id: model.text(),
  /** Kullanılabilir puan bakiyesi. */
  balance: model.number().default(0),
  /** Yaşam boyu kazanılan toplam puan (raporlama için). */
  lifetime_earned: model.number().default(0),
});

export default LoyaltyAccount;
