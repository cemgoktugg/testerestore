import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { findActiveDealer } from "../../../../lib/dealer-pricing";
import { loadQuotes } from "../../../../lib/dealer-quote";

/** GET /store/dealer/quotes — oturumdaki bayiye gönderilmiş teklifler. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dealer = await findActiveDealer(req.scope, (req as any).auth_context?.actor_id);
  if (!dealer) {
    res.status(403).json({ message: "Bu sayfa bayilere özeldir." });
    return;
  }
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ quotes: await loadQuotes(req.scope, { dealer_id: dealer.id, status: "sent" }) });
}
