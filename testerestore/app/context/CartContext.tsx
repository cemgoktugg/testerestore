'use client';

/**
 * Cart context — Medusa-backed when MEDUSA_READY, localStorage fallback otherwise.
 *
 * Public surface intentionally preserved (cart / addToCart / removeFromCart /
 * updateQuantity / clearCart / cartCount / cartTotal) so legacy components keep
 * working while we migrate UI to richer Medusa data via `medusaCart`.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { MEDUSA_READY } from '../../lib/medusa/config';
import {
  addBladeMatrixLine as svcAddBladeMatrix,
  addLineItem as svcAddLine,
  clearStoredCartId,
  getOrCreateCart,
  removeLineItem as svcRemoveLine,
  retrieveCart,
  updateBladeMatrixLine as svcUpdateBladeMatrix,
  updateLineItem as svcUpdateLine,
} from '../../lib/medusa/services/cart';
import type { StoreCart, StoreCartLineItem } from '../../lib/medusa/types';

/** Legacy local-cart item shape. Kept for backwards-compat consumers. */
export interface CartItem {
  id: string;
  productId: string;
  name: string;
  image: string;
  type: 'blade' | 'machine';
  specs: {
    width?: string;
    thickness?: string;
    tpi?: string;
    length?: number;
  };
  price: number;
  quantity: number;
}

/** Payload accepted by the new Medusa-aware addToCart. */
export interface AddToMedusaCartPayload {
  variantId: string;
  quantity: number;
  metadata?: Record<string, unknown>;
  /** Optimistic local-cart shadow (so legacy UI updates instantly). */
  legacy?: Omit<CartItem, 'quantity'>;
  /**
   * When set, the line is added via the server-trusted matrix endpoint so
   * Medusa stores the matrix-derived unit_price (instead of the variant's
   * static calculated_price). Use this for blades priced by the dynamic
   * blade-price-matrix module.
   */
  bladeMatrix?: {
    bladeType: string;
    widthMm: number;
    thicknessMm: number;
    toothPitch: string | null;
    lengthMm: number;
  };
}

interface CartContextType {
  /** Legacy local cart (still backs the badge / cart page). */
  cart: CartItem[];
  /** Medusa cart (rich data: totals, region, addresses). */
  medusaCart: StoreCart | null;
  /** True while initial cart load is in flight. */
  loading: boolean;
  /** Last error from Medusa, or null. */
  error: Error | null;

  /** Legacy local addToCart (kept for non-Medusa flows). */
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity: number) => void;
  /** Medusa-aware addToCart with full variant info. */
  addToMedusaCart: (payload: AddToMedusaCartPayload) => Promise<void>;
  /** Update line item — accepts either legacy id or Medusa line id. */
  updateQuantity: (itemId: string, quantity: number) => Promise<void> | void;
  /** Remove line item — accepts either legacy id or Medusa line id. */
  removeFromCart: (itemId: string) => Promise<void> | void;
  /** Reset both local and Medusa cart. */
  clearCart: () => Promise<void> | void;
  refreshCart: () => Promise<void>;

  cartCount: number;
  cartTotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const LEGACY_KEY = 'cart';

function loadLegacy(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const saved = localStorage.getItem(LEGACY_KEY);
    return saved ? (JSON.parse(saved) as CartItem[]) : [];
  } catch {
    return [];
  }
}

function legacyFromMedusa(cart: StoreCart): CartItem[] {
  return (cart.items || []).map((li: StoreCartLineItem) => {
    const meta = (li.metadata || {}) as Record<string, unknown>;
    const variant = li.variant as (StoreCartLineItem['variant'] & {
      product?: { thumbnail?: string };
    }) | null | undefined;
    return {
      id: li.id,
      productId: (variant?.product_id as string) || (li.product_id as string) || '',
      name: li.product_title || li.title || '',
      image:
        (variant?.product?.thumbnail as string) ||
        (li.thumbnail as string) ||
        '/images/bimetal_blade.png',
      type: (meta.product_type as 'blade' | 'machine') || 'blade',
      specs: {
        width: (meta.width as string) || undefined,
        thickness: (meta.thickness as string) || undefined,
        tpi: (meta.tpi as string) || undefined,
        length:
          typeof meta.custom_length_mm === 'number'
            ? (meta.custom_length_mm as number)
            : undefined,
      },
      price:
        typeof li.unit_price === 'number'
          ? li.unit_price
          : (li.unit_price as unknown as number) || 0,
      quantity: li.quantity,
    };
  });
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [medusaCart, setMedusaCart] = useState<StoreCart | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial load — Medusa first, then legacy localStorage as fallback.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (MEDUSA_READY) {
          const c = await retrieveCart();
          if (!cancelled) {
            setMedusaCart(c);
            // Medusa is the source of truth when ready: if there is no live
            // cart (e.g. the previous one was completed/discarded), start
            // clean instead of resurrecting stale localStorage line items.
            setCart(c ? legacyFromMedusa(c) : []);
          }
        } else {
          if (!cancelled) setCart(loadLegacy());
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        if (!cancelled) {
          setLoading(false);
          setIsLoaded(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Mirror legacy cart to localStorage (so we don't break the demo without backend).
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(LEGACY_KEY, JSON.stringify(cart));
    } catch {
      /* ignore quota errors */
    }
  }, [cart, isLoaded]);

  const refreshCart = useCallback(async () => {
    if (!MEDUSA_READY) return;
    const c = await retrieveCart();
    setMedusaCart(c);
    if (c) setCart(legacyFromMedusa(c));
  }, []);

  // ---------- Legacy local-only addToCart ----------
  const addToCart = useCallback(
    (newItem: Omit<CartItem, 'quantity'>, quantity: number) => {
      setCart((prev) => {
        const idx = prev.findIndex((it) => it.id === newItem.id);
        if (idx > -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], quantity: next[idx].quantity + quantity };
          return next;
        }
        return [...prev, { ...newItem, quantity }];
      });
    },
    []
  );

  /**
   * Resolves a local cart item id to the Medusa line id. Most items have an
   * `li_*` id straight from `legacyFromMedusa`, but during the brief window
   * between an optimistic add and the server response (or after a failed
   * sync) the local id can be the legacy shadow id. In that case we scan
   * the current Medusa cart for a matching line by name+spec fingerprint.
   */
  const resolveMedusaLineId = useCallback(
    (localId: string): string | null => {
      if (localId.startsWith('li_')) return localId;
      const items = medusaCart?.items;
      if (!items?.length) return null;
      const local = cart.find((it) => it.id === localId);
      if (!local) return null;
      const match = items.find((li) => {
        const meta = (li.metadata || {}) as Record<string, unknown>;
        const liLen =
          typeof meta.custom_length_mm === 'number'
            ? meta.custom_length_mm
            : typeof meta.length_mm === 'number'
            ? meta.length_mm
            : undefined;
        return (
          (meta.width as string | undefined) === local.specs.width &&
          (meta.thickness as string | undefined) === local.specs.thickness &&
          (meta.tpi as string | undefined) === local.specs.tpi &&
          liLen === local.specs.length
        );
      });
      return match?.id ?? null;
    },
    [cart, medusaCart]
  );

  // ---------- Medusa-aware addToCart ----------
  const addToMedusaCart = useCallback(
    async ({
      variantId,
      quantity,
      metadata,
      legacy,
      bladeMatrix,
    }: AddToMedusaCartPayload) => {
      if (legacy) addToCart(legacy, quantity);

      if (!MEDUSA_READY || !variantId) return;
      try {
        await getOrCreateCart();
        const updated = bladeMatrix
          ? await svcAddBladeMatrix({
              variantId,
              quantity,
              bladeType: bladeMatrix.bladeType,
              widthMm: bladeMatrix.widthMm,
              thicknessMm: bladeMatrix.thicknessMm,
              toothPitch: bladeMatrix.toothPitch,
              lengthMm: bladeMatrix.lengthMm,
            })
          : await svcAddLine({ variantId, quantity, metadata });
        // Always re-pull from Medusa: even if the add itself succeeded
        // optimistically, the canonical state lives server-side.
        const fresh = updated ?? (await retrieveCart());
        if (fresh) {
          setMedusaCart(fresh);
          setCart(legacyFromMedusa(fresh));
        }
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      }
    },
    [addToCart]
  );

  // ---------- Quantity updates ----------
  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      // Optimistic local update for instant UI feedback
      if (quantity <= 0) {
        setCart((prev) => prev.filter((it) => it.id !== itemId));
      } else {
        setCart((prev) =>
          prev.map((it) => (it.id === itemId ? { ...it, quantity } : it))
        );
      }
      if (!MEDUSA_READY) return;
      const lineId = resolveMedusaLineId(itemId);
      if (!lineId) return;

      // Matrix-fiyatlı item ise yeni qty için server'da fiyat yeniden
      // hesaplanmalı (welding tek seferlik + tier discount). Aksi halde
      // standart Medusa update yeter.
      const medusaLine = medusaCart?.items?.find((li) => li.id === lineId);
      const meta = (medusaLine?.metadata || {}) as Record<string, unknown>;
      const isMatrix =
        !!meta.blade_type && !!meta.width_mm && !!meta.length_mm;

      const updated = isMatrix
        ? await svcUpdateBladeMatrix(lineId, quantity)
        : await svcUpdateLine(lineId, quantity);
      const fresh = updated ?? (await retrieveCart());
      if (fresh) {
        setMedusaCart(fresh);
        setCart(legacyFromMedusa(fresh));
      }
    },
    [resolveMedusaLineId, medusaCart]
  );

  // ---------- Removal ----------
  const removeFromCart = useCallback(
    async (itemId: string) => {
      // Optimistic local removal for instant UI feedback
      setCart((prev) => prev.filter((it) => it.id !== itemId));
      if (!MEDUSA_READY) return;
      const lineId = resolveMedusaLineId(itemId);
      if (!lineId) return;
      const updated = await svcRemoveLine(lineId);
      // Whether or not the delete returned a cart, always re-fetch so a stale
      // Medusa line can never leak into the displayed totals.
      const fresh = updated ?? (await retrieveCart());
      if (fresh) {
        setMedusaCart(fresh);
        setCart(legacyFromMedusa(fresh));
      } else {
        // Cart was deleted entirely
        setMedusaCart(null);
      }
    },
    [resolveMedusaLineId]
  );

  const clearCart = useCallback(async () => {
    setCart([]);
    if (MEDUSA_READY) {
      // Drop the saved cart id so the next add creates a brand-new Medusa
      // cart instead of resurrecting old line items.
      clearStoredCartId();
      setMedusaCart(null);
    }
  }, []);

  const cartCount = useMemo(
    () => cart.reduce((sum, it) => sum + it.quantity, 0),
    [cart]
  );
  const cartTotal = useMemo(() => {
    if (medusaCart && typeof medusaCart.total === 'number') {
      return medusaCart.total as number;
    }
    return cart.reduce((sum, it) => sum + it.price * it.quantity, 0);
  }, [cart, medusaCart]);

  return (
    <CartContext.Provider
      value={{
        cart,
        medusaCart,
        loading,
        error,
        addToCart,
        addToMedusaCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        refreshCart,
        cartCount,
        cartTotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
