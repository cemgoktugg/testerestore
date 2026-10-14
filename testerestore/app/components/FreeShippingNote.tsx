import { Truck } from 'lucide-react';
import { formatMoney } from '../../lib/medusa/format';
import { FREE_SHIPPING_THRESHOLD } from '../../lib/shipping';

/** Satın alma kutularında ücretsiz kargo koşulu (kural: lib/shipping.ts). */
export default function FreeShippingNote({ className = '' }: { className?: string }) {
  return (
    <p className={`flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground ${className}`}>
      <Truck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
      KDV dahil {formatMoney(FREE_SHIPPING_THRESHOLD, 'try')} ve üzeri siparişlerde kargo ücretsiz
    </p>
  );
}
