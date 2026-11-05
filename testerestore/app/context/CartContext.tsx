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
  useRef,
} from 'react';
import { MEDUSA_READY } from '../../lib/medusa/config';
import {
  addBladeMatrixLine as svcAddBladeMatrix,
  addLineItem as svcAddLine,
  clearStoredCartId,
  removeLineItem as svcRemoveLine,
  retrieveCart,
  updateBladeMatrixLine as svcUpdateBladeMatrix,
  updateLineItem as svcUpdateLine,
} from '../../lib/medusa/services/cart';
import type { StoreCart, StoreCartLineItem } from '../../lib/medusa/types';
import { createMutationQueue } from '../../lib/commerce-state';
import { trackEvent } from '../components/Analytics';

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
  mutating: boolean;

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
      // Ölçüye göre ürünlerde etiketler (width/thickness/tpi/custom_length_mm),
      // hazır boy ürünlerde sayısal alanlar (width_mm/thickness_mm/tooth_pitch/
      // length_mm) tutulur — ikisi de desteklenir (eskiden hazır boyda sepette
      // ve ödeme özetinde "undefined" görünüyordu).
      specs: {
        width:
          (meta.width as string) ||
          (typeof meta.width_mm === 'number' ? `${meta.width_mm}mm` : undefined),
        thickness:
          (meta.thickness as string) ||
          (typeof meta.thickness_mm === 'number' ? `${meta.thickness_mm}mm` : undefined),
        tpi: (meta.tpi as string) || (meta.tooth_pitch ? `${meta.tooth_pitch} TPI` : undefined),
        length:
          typeof meta.custom_length_mm === 'number'
            ? (meta.custom_length_mm as number)
            : typeof meta.length_mm === 'number'
            ? (meta.length_mm as number)
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
  const [pendingMutations, setPendingMutations] = useState(0);
  const enqueue = useRef(createMutationQueue());
  const cartRef = useRef(cart);
  const medusaCartRef = useRef(medusaCart);

  const commitCart = useCallback((next: StoreCart | null) => {
    medusaCartRef.current = next;
    cartRef.current = next ? legacyFromMedusa(next) : [];
    setMedusaCart(next);
    setCart(cartRef.current);
  }, []);

  const runMutation = useCallback(async (operation: () => Promise<void>) => {
    setPendingMutations((count) => count + 1);
    try {
      await enqueue.current(async () => {
        const previousItems = cartRef.current;
        const previousCart = medusaCartRef.current;
        setError(null);
        try {
          await operation();
        } catch (cause) {
          // Reconcile if the server accepted a write but its response was lost.
          const fresh = MEDUSA_READY ? await retrieveCart().catch(() => null) : null;
          if (fresh) commitCart(fresh);
          else {
            cartRef.current = previousItems;
            medusaCartRef.current = previousCart;
            setCart(previousItems);
            setMedusaCart(previousCart);
          }
          const failure = cause instanceof Error ? cause : new Error('Sepet güncellenemedi. Lütfen tekrar deneyin.');
          setError(failure);
          throw failure;
        }
      });
    } finally {
      setPendingMutations((count) => count - 1);
    }
  }, [commitCart]);

  // Initial load — Medusa first, then legacy localStorage as fallback.
  useEffect(() => {
    let cancelled = false;
    void enqueue.current(async () => {
      try {
        if (MEDUSA_READY) {
          const c = await retrieveCart();
          if (!cancelled) {
            // Medusa is the source of truth when ready: if there is no live
            // cart (e.g. the previous one was completed/discarded), start
            // clean instead of resurrecting stale localStorage line items.
            commitCart(c);
          }
        } else {
          if (!cancelled) {
            cartRef.current = loadLegacy();
            setCart(cartRef.current);
          }
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
    });
    return () => {
      cancelled = true;
    };
  }, [commitCart]);

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
    await runMutation(async () => commitCart(await retrieveCart()));
  }, [runMutation, commitCart]);

  // ---------- Legacy local-only addToCart ----------
  const addToCart = useCallback(
    (newItem: Omit<CartItem, 'quantity'>, quantity: number) => {
      const previous = cartRef.current;
      const found = previous.some((item) => item.id === newItem.id);
      const next = found ? previous.map((item) => item.id === newItem.id ? { ...item, quantity: item.quantity + quantity } : item)
        : [...previous, { ...newItem, quantity }];
      cartRef.current = next;
      setCart(next);
    },
    []
  );

  const addToMedusaCart = useCallback(async (payload: AddToMedusaCartPayload) => {
    const { variantId, quantity, metadata, legacy, bladeMatrix } = payload;
    await runMutation(async () => {
      if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('Geçerli bir adet seçin.');
      if (!MEDUSA_READY) {
        if (legacy) addToCart(legacy, quantity);
        return;
      }
      if (!variantId) throw new Error('Ürün seçimi doğrulanamadı.');
      const updated = bladeMatrix
        ? await svcAddBladeMatrix({ variantId, quantity, ...bladeMatrix })
        : await svcAddLine({ variantId, quantity, metadata });
      if (!updated) throw new Error('Ürün sepete eklenemedi. Lütfen sepetinizi kontrol edin.');
      commitCart(updated);
      trackEvent('add_to_cart', {
        currency: updated.currency_code?.toUpperCase(),
        items: [{ item_id: legacy?.productId || variantId, quantity }],
      });
    });
  }, [addToCart, runMutation, commitCart]);

  const updateQuantity = useCallback(async (itemId: string, quantity: number) => {
    await runMutation(async () => {
      if (!Number.isSafeInteger(quantity) || quantity < 0) throw new Error('Geçerli bir adet seçin.');
      const previous = cartRef.current.find((item) => item.id === itemId);
      if (!previous) throw new Error('Sepet değişti. Lütfen tekrar deneyin.');
      cartRef.current = cartRef.current.map((item) => item.id === itemId ? { ...item, quantity } : item).filter((item) => item.quantity > 0);
      setCart(cartRef.current);
      if (!MEDUSA_READY) return;
      const line = medusaCartRef.current?.items?.find((item) => item.id === itemId);
      if (!line) throw new Error('Sepet değişti. Lütfen sayfayı yenileyin.');
      const meta = (line.metadata || {}) as Record<string, unknown>;
      const isMatrix = !!meta.blade_type && !!meta.width_mm && !!meta.length_mm;
      const updated = isMatrix ? await svcUpdateBladeMatrix(line.id, quantity) : await svcUpdateLine(line.id, quantity);
      if (!updated) throw new Error('Adet güncellenemedi. Lütfen tekrar deneyin.');
      commitCart(updated);
      const change = quantity - previous.quantity;
      if (change) trackEvent(change > 0 ? 'add_to_cart' : 'remove_from_cart', {
        currency: updated.currency_code?.toUpperCase(),
        items: [{ item_id: previous.productId, quantity: Math.abs(change) }],
      });
    });
  }, [runMutation, commitCart]);

  const removeFromCart = useCallback(async (itemId: string) => {
    await runMutation(async () => {
      const previous = cartRef.current.find((item) => item.id === itemId);
      if (!previous) return;
      cartRef.current = cartRef.current.filter((item) => item.id !== itemId);
      setCart(cartRef.current);
      if (!MEDUSA_READY) return;
      const updated = await svcRemoveLine(itemId);
      if (!updated) throw new Error('Ürün sepetten çıkarılamadı. Lütfen tekrar deneyin.');
      commitCart(updated);
      trackEvent('remove_from_cart', {
        currency: updated.currency_code?.toUpperCase(),
        items: [{ item_id: previous.productId, quantity: previous.quantity }],
      });
    });
  }, [runMutation, commitCart]);

  const clearCart = useCallback(async () => {
    await runMutation(async () => {
      if (MEDUSA_READY) clearStoredCartId();
      commitCart(null);
    });
  }, [runMutation, commitCart]);

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
        mutating: pendingMutations > 0,
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
