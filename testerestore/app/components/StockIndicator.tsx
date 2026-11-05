"use client";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { getInventory } from "../../lib/inventory";
interface Props {
  quantity?: number | null;
  manageInventory?: boolean;
  allowBackorder?: boolean;
  lowStockThreshold?: number;
  warningThreshold?: number;
}
export default function StockIndicator({ quantity, manageInventory = true, allowBackorder = false }: Props) {
  const inventory = getInventory({ inventory_quantity: quantity, manage_inventory: manageInventory, allow_backorder: allowBackorder });
  const Icon = inventory.status === 'unavailable' ? XCircle
    : inventory.status === 'unknown' || inventory.status === 'backorder' ? AlertTriangle : CheckCircle2;
  const color = inventory.status === 'unavailable' ? 'text-rose-600'
    : inventory.status === 'unknown' ? 'text-muted-foreground'
    : inventory.status === 'backorder' ? 'text-amber-600' : 'text-emerald-600';
  return (
    <span className={'inline-flex items-center gap-1.5 text-xs font-bold ' + color}>
      <Icon className="h-3.5 w-3.5" />{inventory.label}
    </span>
  );
}
