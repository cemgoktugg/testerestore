/**
 * Wishlist (favoriler) — localStorage backed, SSR-safe.
 *
 * Üyeliksiz çalışır. İleride Medusa customer metadata'sına sync edilebilir
 * (login sonrası merge), ama bu sürümde sadece tarayıcıda tutulur.
 */
const KEY = "ts_wishlist";

export function getWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function emit(next: string[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("wishlist-changed", { detail: next })
    );
  }
}

export function addToWishlist(handle: string): string[] {
  if (!handle) return getWishlist();
  const cur = getWishlist();
  if (cur.includes(handle)) return cur;
  const next = [handle, ...cur];
  emit(next);
  return next;
}

export function removeFromWishlist(handle: string): string[] {
  const next = getWishlist().filter((h) => h !== handle);
  emit(next);
  return next;
}

export function toggleWishlist(handle: string): boolean {
  const cur = getWishlist();
  if (cur.includes(handle)) {
    removeFromWishlist(handle);
    return false;
  }
  addToWishlist(handle);
  return true;
}

export function isInWishlist(handle: string): boolean {
  return getWishlist().includes(handle);
}

export function clearWishlist(): void {
  emit([]);
}
