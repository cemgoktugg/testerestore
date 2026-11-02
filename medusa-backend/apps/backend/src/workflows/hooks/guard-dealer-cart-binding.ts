/**
 * Sepetin bayiye yalnızca bayinin kendi oturumuyla bağlanmasını sağlar.
 *
 * Medusa, misafir sepetine kayıtlı bir hesabın e-postası yazıldığında sepeti o
 * hesaba bağlar (find-or-create-customer). Önlem olmasa bayinin e-postasını
 * bilen biri, giriş yapmadan onun fiyat listesinden alışveriş edebilirdi.
 * Giriş yapmış bayinin misafir sepeti /store/dealer/sync-cart ile devredilir;
 * o yol bu kancadan geçmez.
 *
 * Sepet oluşturma tarafı src/api/middlewares.ts ve /store/advisor-signup'ta
 * korunur: oluşturma kancasında oturum ile e-posta eşleşmesi ayırt edilemiyor.
 */
import { MedusaError } from "@medusajs/framework/utils";
import { updateCartWorkflow } from "@medusajs/medusa/core-flows";
import { DEALER_LOGIN_REQUIRED, findActiveDealer } from "../../lib/dealer-pricing";

updateCartWorkflow.hooks.validate(async ({ input, cart }, { container }) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nextCustomer = (input as any)?.customer_id as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!nextCustomer || nextCustomer === (cart as any)?.customer_id) return;
  if (await findActiveDealer(container, nextCustomer)) {
    throw new MedusaError(MedusaError.Types.NOT_ALLOWED, DEALER_LOGIN_REQUIRED);
  }
});
