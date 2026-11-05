/** Inventory facts shared by purchase controls, badges and structured data. */
export interface InventoryVariant {
  manage_inventory?: boolean | null;
  allow_backorder?: boolean | null;
  inventory_quantity?: number | null;
}

export function getInventory(variant?: InventoryVariant | null) {
  const tracked = variant?.manage_inventory !== false;
  const quantity = tracked && typeof variant?.inventory_quantity === 'number' && Number.isFinite(variant.inventory_quantity)
    ? Math.max(0, Math.floor(variant.inventory_quantity)) : null;
  const backorder = variant?.allow_backorder === true;
  const status = !variant ? 'unavailable'
    : !tracked ? 'available'
    : quantity === null ? 'unknown'
    : quantity > 0 ? 'available'
    : backorder ? 'backorder' : 'unavailable';
  return {
    status,
    quantity,
    canPurchase: status !== 'unavailable',
    maxQuantity: tracked && !backorder ? quantity : null,
    label: status === 'unavailable' ? 'Tükendi'
      : status === 'backorder' ? 'Ön siparişe açık'
      : status === 'unknown' ? 'Stok bilgisi doğrulanamadı'
      : quantity === null ? 'Siparişe açık' : `Stokta (${quantity} adet)`,
    schemaAvailability: status === 'unknown' ? undefined
      : `https://schema.org/${status === 'unavailable' ? 'OutOfStock' : status === 'backorder' ? 'BackOrder' : 'InStock'}`,
  };
}

export function canOrderQuantity(variant: InventoryVariant | null | undefined, quantity: number) {
  const inventory = getInventory(variant);
  return Number.isSafeInteger(quantity) && quantity > 0 && inventory.canPurchase &&
    (inventory.maxQuantity === null || quantity <= inventory.maxQuantity);
}
