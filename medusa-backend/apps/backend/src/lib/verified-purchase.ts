interface PurchaseOrder {
  status?: string | null;
  items?: Array<{ id: string; product_id?: string | null }> | null;
  fulfillments?: Array<{
    canceled_at?: unknown; shipped_at?: unknown; delivered_at?: unknown;
    items?: Array<{ line_item_id?: string | null } | null> | null;
  } | null> | null;
}
export function hasVerifiedPurchase(orders: PurchaseOrder[], productId: string): boolean {
  return orders.some((order) => {
    if (order.status === "canceled") return false;
    const itemIds = (order.items || []).filter((item) => item.product_id === productId).map((item) => item.id);
    if (!itemIds.length) return false;
    if (order.status === "completed") return true;
    return (order.fulfillments || []).some((fulfillment) =>
      fulfillment && !fulfillment.canceled_at && (fulfillment.shipped_at || fulfillment.delivered_at) &&
      fulfillment.items?.some((item) => item?.line_item_id && itemIds.includes(item.line_item_id))
    );
  });
}
