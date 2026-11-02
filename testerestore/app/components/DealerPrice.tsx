'use client';

import { useDealer } from '../context/DealerContext';
import { formatTL } from '../../lib/ready-made';

/** Sunucuda üretilen kartlarda fiyat: bayi girişliyse kendi fiyatı görünür. */
export default function DealerPrice({
  variantId,
  price,
  className,
}: {
  variantId?: string;
  price: number;
  className?: string;
}) {
  const { variantPrices } = useDealer();
  const dealerPrice = variantId ? variantPrices?.[variantId] : undefined;
  return <span className={className}>{formatTL(dealerPrice ?? price)}</span>;
}
