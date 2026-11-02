'use client';

/**
 * Bayi fiyatları mağazada.
 *
 * Sayfalar sunucuda anonim üretilip önbelleğe alınır; bayi fiyatı hiçbir zaman
 * bu HTML'e girmez. Bayi giriş yapınca fiyat listesi tarayıcıda çekilip
 * gösterime uygulanır, sepet de sunucuda bayi fiyatlarıyla yeniden fiyatlanır.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useCustomer } from './CustomerContext';
import { useCart } from './CartContext';
import { clearStoredCartId } from '../../lib/medusa/services/cart';
import {
  getDealerProfile,
  syncDealerCart,
  withDealerPrices,
  type DealerProfile,
} from '../../lib/medusa/services/dealer';
import type { StoreProduct } from '../../lib/medusa/types';

interface DealerContextType {
  isDealer: boolean;
  companyName: string | null;
  variantPrices: Record<string, number> | null;
  /** Ürün varyantlarına bayi fiyatını uygular; bayi değilse ürünü aynen döner. */
  applyDealerPrices: <T extends StoreProduct | null | undefined>(product: T) => T;
}

const DealerContext = createContext<DealerContextType>({
  isDealer: false,
  companyName: null,
  variantPrices: null,
  applyDealerPrices: (product) => product,
});

export function DealerProvider({ children }: { children: React.ReactNode }) {
  const { customer, loading: customerLoading } = useCustomer();
  const { medusaCart, refreshCart } = useCart();
  const [fetchedProfile, setProfile] = useState<DealerProfile | null>(null);
  const wasDealer = useRef(false);

  const customerId = customer?.id ?? null;
  const profile = customerId ? fetchedProfile : null;
  const cartId = medusaCart?.id ?? null;
  const cartHasDealerPrices =
    medusaCart?.metadata?.dealer_cart === true ||
    !!medusaCart?.items?.some((it) => it.metadata?.dealer_price === true);

  useEffect(() => {
    if (customerLoading || !customerId) return;
    let cancelled = false;
    getDealerProfile().then((p) => {
      if (cancelled) return;
      setProfile(p);
      if (p) wasDealer.current = true;
    });
    return () => {
      cancelled = true;
    };
  }, [customerId, customerLoading]);

  // Çıkışta bayi fiyatlı sepet ve bellekteki fiyatlar bu tarayıcıda kalmasın.
  useEffect(() => {
    if (customerLoading || customerId) return;
    if (!wasDealer.current && !cartHasDealerPrices) return;
    wasDealer.current = false;
    clearStoredCartId();
    window.location.reload();
  }, [customerId, customerLoading, cartHasDealerPrices]);

  // Girişte ve her yeni sepette: sepet bu müşteriye bağlanır, fiyatlar tazelenir.
  useEffect(() => {
    if (customerLoading || !customerId || !cartId) return;
    let cancelled = false;
    syncDealerCart(cartId).then(async (result) => {
      if (cancelled) return;
      if (result === 'other_account') {
        clearStoredCartId();
        window.location.reload();
      } else if (result === 'updated') {
        await refreshCart();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [customerId, customerLoading, cartId, refreshCart]);

  const variantPrices = profile?.variant_prices ?? null;
  const applyDealerPrices = useCallback(
    <T extends StoreProduct | null | undefined>(product: T): T =>
      withDealerPrices(product, variantPrices),
    [variantPrices]
  );

  const value = useMemo(
    () => ({
      isDealer: !!profile,
      companyName: profile?.company_name ?? null,
      variantPrices,
      applyDealerPrices,
    }),
    [profile, variantPrices, applyDealerPrices]
  );

  return <DealerContext.Provider value={value}>{children}</DealerContext.Provider>;
}

export const useDealer = () => useContext(DealerContext);
