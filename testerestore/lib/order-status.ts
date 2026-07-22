/**
 * Müşteriye gösterilecek TEK, Türkçe sipariş durumu.
 *
 * Medusa'nın ham statüleri (authorized, captured, shipped, canceled…) asla
 * kullanıcıya gösterilmez; bunun yerine siparişin yaşam döngüsünü anlatan
 * anlaşılır bir etiket üretilir.
 *
 * Öncelik sırası: iptal/iade > teslimat/kargo > hazırlık > ödeme.
 */
export interface OrderStatusInput {
  status?: string | null;
  payment_status?: string | null;
  fulfillment_status?: string | null;
}

export interface OrderStatusBadge {
  label: string;
  /** Rozet için Tailwind renk sınıfları (bg + text + border). */
  className: string;
}

const TONE = {
  success:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25",
  warning:
    "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25",
  danger:
    "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/25",
  neutral: "bg-muted text-muted-foreground border border-border",
} as const;

export function getOrderStatus(o: OrderStatusInput): OrderStatusBadge {
  const status = (o.status || "").toLowerCase();
  const fulfillment = (o.fulfillment_status || "").toLowerCase();
  const payment = (o.payment_status || "").toLowerCase();

  // 1) İptal / iade
  if (status === "canceled" || fulfillment === "canceled" || payment === "canceled")
    return { label: "İptal Edildi", className: TONE.danger };
  if (payment === "refunded")
    return { label: "İade Edildi", className: TONE.info };
  if (payment === "partially_refunded")
    return { label: "Kısmen İade Edildi", className: TONE.info };

  // 2) Teslimat / kargo (müşteri için en anlamlı aşama)
  if (fulfillment === "delivered" || fulfillment === "partially_delivered")
    return { label: "Teslim Edildi", className: TONE.success };
  if (fulfillment === "shipped" || fulfillment === "partially_shipped")
    return { label: "Kargoya Verildi", className: TONE.info };

  // 3) Hazırlık
  if (fulfillment === "fulfilled" || fulfillment === "partially_fulfilled")
    return { label: "Hazırlanıyor", className: TONE.warning };

  // 4) Ödeme
  if (payment === "not_paid" || payment === "awaiting" || payment === "requires_action")
    return { label: "Ödeme Bekleniyor", className: TONE.warning };
  if (
    payment === "authorized" ||
    payment === "captured" ||
    payment === "partially_captured" ||
    payment === "partially_authorized"
  )
    return { label: "Sipariş Alındı", className: TONE.success };

  // 5) Genel durum yedeği
  if (status === "completed") return { label: "Tamamlandı", className: TONE.success };

  return { label: "Sipariş Alındı", className: TONE.neutral };
}
