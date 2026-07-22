"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";

/**
 * Stok durumu rozeti. Sayı bilinmiyorsa "manage_inventory=false" anlamına
 * geldiği için "Stokta" gösterilir. Sayı düşükse aciliyet rozetiyle
 * konversiyonu yükseltir.
 *
 * Eşikler:
 *   = 0 → Tükendi
 *   < 5 → "Son N adet" (sıcak)
 *   < 20 → "Az kaldı" (uyarı)
 *   ≥ 20 → "Stokta" (normal)
 */
interface Props {
  quantity?: number | null;
  manageInventory?: boolean;
  /** Düşük stok eşiği — varsayılan 5 */
  lowStockThreshold?: number;
  /** Az-kalmış uyarı eşiği — varsayılan 20 */
  warningThreshold?: number;
}

export default function StockIndicator({
  quantity,
  manageInventory = true,
  lowStockThreshold = 5,
  warningThreshold = 20,
}: Props) {
  // Inventory takip edilmiyorsa varsayılan "stokta" göster
  if (!manageInventory) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Stokta
      </span>
    );
  }

  const q = typeof quantity === "number" ? quantity : null;

  if (q === null) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Stokta
      </span>
    );
  }

  if (q <= 0) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600">
        <XCircle className="h-3.5 w-3.5" />
        Tükendi
      </span>
    );
  }

  if (q <= lowStockThreshold) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-orange-600 animate-pulse">
        <AlertTriangle className="h-3.5 w-3.5" />
        Son {q} adet!
      </span>
    );
  }

  if (q <= warningThreshold) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600">
        <AlertTriangle className="h-3.5 w-3.5" />
        Az kaldı ({q} adet)
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
      <CheckCircle2 className="h-3.5 w-3.5" />
      Stokta ({q}+ adet)
    </span>
  );
}
