/**
 * Son görüntülenen ürünler — localStorage backed.
 *
 * Her ürün detayına girildiğinde `record(handle)` çağrılır; en güncel en
 * başa gelir, en fazla MAX_ITEMS tutulur. SSR-safe.
 */
const KEY = "ts_recently_viewed";
const MAX_ITEMS = 12;

export function recordRecentlyViewed(handle: string): void {
  if (typeof window === "undefined" || !handle) return;
  try {
    const raw = localStorage.getItem(KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    const without = list.filter((h) => h !== handle);
    const next = [handle, ...without].slice(0, MAX_ITEMS);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / parse hatalarını sessiz geç */
  }
}

export function getRecentlyViewed(excludeHandle?: string): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return excludeHandle ? list.filter((h) => h !== excludeHandle) : list;
  } catch {
    return [];
  }
}

export function clearRecentlyViewed(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
