/**
 * Sipariş tamamlanmadan ÖNCE son kontrol: matris fiyatlı her satırın fiyatı,
 * satırdaki ölçü ve güncel adetten yeniden hesaplanır; ürün-tür eşleşmesi
 * doğrulanır. Tutmazsa sipariş oluşmaz (ayrıntı: src/lib/blade-guard.ts).
 *
 * Bu kanca çekirdekteki ödeme yetkilendirmesinden önce çalışır. Ara
 * katmanlar (src/api/middlewares.ts) kurcalamayı baştan engeller; bu, onları
 * aşan herhangi bir yol için son savunma hattıdır.
 */
import { completeCartWorkflow } from "@medusajs/medusa/core-flows";
import { assertCartBladeLinesValid } from "../../lib/blade-guard";

completeCartWorkflow.hooks.validate(async ({ cart }, { container }) => {
  // Zaten tamamlanmış sepet (tekrar çağrı) — sipariş var, yeniden doğrulama yok.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = cart as any;
  if (c?.completed_at) return;
  await assertCartBladeLinesValid(container, c?.items || []);
});
