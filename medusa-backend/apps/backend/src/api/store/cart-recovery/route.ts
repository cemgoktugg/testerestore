import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";
import { recoveryEmailFingerprint, verifyCartRecovery } from "../../../lib/cart-recovery-token";

export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store");
  const input = req.body as { token?: unknown } | undefined;
  const token = typeof input?.token === "string" ? verifyCartRecovery(input.token) : null;
  if (!token) return res.status(400).json({ message: "Sepet bağlantısı geçersiz veya süresi dolmuş." });
  let cart;
  try {
    cart = await req.scope.resolve(Modules.CART).retrieveCart(token.cart);
  } catch (error) {
    if ((error as { type?: string }).type !== "not_found") {
      return res.status(503).json({ message: "Sepet şu anda yüklenemiyor. Lütfen tekrar deneyin." });
    }
  }
  if (!cart || cart.completed_at || !cart.email || recoveryEmailFingerprint(cart.email) !== token.email) {
    return res.status(410).json({ message: "Bu sepet artık geri yüklenemiyor." });
  }
  const customerId = req.auth_context?.actor_id;
  if (cart.customer_id && !customerId) return res.status(401).json({ message: "Sepetinizi açmak için hesabınıza giriş yapın." });
  if (cart.customer_id && cart.customer_id !== customerId) return res.status(403).json({ message: "Bu sepet başka bir hesaba ait." });
  return res.json({ cart_id: cart.id });
}
