import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { Modules } from "@medusajs/framework/utils";

/**
 * POST /admin/orders/:id/notify-shipped
 * Body: { carrier_name, tracking_number, tracking_url }
 *
 * Manuel olarak müşteriye "siparişiniz kargoya verildi" e-postası gönderir.
 * Admin widget'tan "kargo bilgisini kaydet + e-posta gönder" akışı için.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id as string;
  const body = (req.body || {}) as {
    carrier_name?: string;
    tracking_number?: string;
    tracking_url?: string;
  };

  const orderModule = req.scope.resolve(Modules.ORDER);
  const notificationModule = req.scope.resolve(Modules.NOTIFICATION);

  try {
    const order = await orderModule.retrieveOrder(id);
    if (!order.email) {
      res.status(400).json({ message: "Order has no email" });
      return;
    }

    await notificationModule.createNotifications([
      {
        to: order.email,
        channel: "email",
        template: "order.shipped",
        data: {
          order_no: order.display_id
            ? `#${order.display_id}`
            : id.slice(-8).toUpperCase(),
          carrier: body.carrier_name || "Kargo",
          tracking_number: body.tracking_number || "",
          tracking_url: body.tracking_url || "",
        },
      },
    ]);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({
      message: "notify failed",
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
