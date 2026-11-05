/** Guest storage is separate from each authenticated customer's cache. */
const KEY = "ts_wishlist";
type Changes = Record<string, boolean>;
export interface WishlistPersistence {
  load: () => Promise<unknown>;
  save: (handles: string[]) => Promise<void>;
}
let owner: string | null = null;
let generation = 0;
let persistence: WishlistPersistence | null = null;
let remote: string[] = [];
let ready = false;
let syncing = false;
let syncError: string | null = null;
let pendingGuest: string[] = [];
const memory = new Map<string, unknown>();

export function normalizeWishlist(value: unknown): string[] {
  return Array.isArray(value)
    ? [...new Set(value.filter((v): v is string => typeof v === "string" && v.length > 0 && v.length <= 200))]
    : [];
}
export function applyWishlistChanges(base: string[], changes: Changes): string[] {
  const result = new Set(normalizeWishlist(base));
  for (const [handle, included] of Object.entries(changes)) {
    if (included) result.add(handle); else result.delete(handle);
  }
  return [...result];
}
function storageKey() { return owner ? `${KEY}:${owner}` : KEY; }
function read(key: string): unknown {
  if (typeof window === "undefined") return null;
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return memory.get(key) ?? null; }
}
function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  memory.set(key, value);
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}
function changes(): Changes {
  const value = read(`${storageKey()}:changes`);
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([h, included]) => h.length > 0 && h.length <= 200 && typeof included === "boolean"));
}
function notify() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("wishlist-changed"));
}
function status() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event("wishlist-sync"));
}
export function getWishlistSyncState() { return { syncing, error: syncError, authenticated: !!owner }; }
export function getWishlist(): string[] { return normalizeWishlist(read(storageKey())); }

/** In-flight requests use a persistence object bound to the original JWT. */
export async function connectWishlist(customerId: string | null, adapter?: WishlistPersistence): Promise<void> {
  const current = ++generation;
  owner = customerId;
  persistence = adapter ?? null;
  remote = [];
  ready = false;
  syncing = !!customerId;
  syncError = null;
  pendingGuest = [];
  notify(); status();
  if (!customerId || !adapter) { syncing = false; status(); return; }
  try {
    const saved = normalizeWishlist(await adapter.load());
    if (current !== generation) return;
    remote = saved;
    pendingGuest = normalizeWishlist(read(KEY));
    const pending = changes();
    for (const handle of pendingGuest) if (!Object.hasOwn(pending, handle)) pending[handle] = true;
    write(`${storageKey()}:changes`, pending);
    write(storageKey(), applyWishlistChanges(saved, pending));
    ready = true;
    syncing = false;
    notify(); status();
    await flushWishlist();
  } catch {
    if (current !== generation) return;
    syncing = false;
    syncError = "Favoriler hesabınızla eşitlenemedi. Değişiklikler bu cihazda saklanıyor.";
    status();
  }
}
async function flushWishlist(): Promise<void> {
  if (!ready || !persistence || syncing || !owner) return;
  const current = generation;
  const adapter = persistence;
  syncing = true; syncError = null; status();
  try {
    while (current === generation) {
      const pending = changes();
      if (!Object.keys(pending).length) break;
      const next = applyWishlistChanges(remote, pending);
      await adapter.save(next);
      if (current !== generation) return;
      remote = next;
      const remaining = changes();
      for (const [handle, included] of Object.entries(pending)) {
        if (remaining[handle] === included) delete remaining[handle];
      }
      write(`${storageKey()}:changes`, remaining);
      write(storageKey(), applyWishlistChanges(remote, remaining));
      write(KEY, normalizeWishlist(read(KEY)).filter((h) => !pendingGuest.includes(h)));
      pendingGuest = [];
      notify();
    }
  } catch {
    if (current === generation) syncError = "Favoriler hesabınıza kaydedilemedi. Tekrar deneyebilirsiniz.";
  } finally {
    if (current === generation) { syncing = false; status(); }
  }
}
export async function retryWishlistSync(): Promise<void> {
  if (owner && persistence) await connectWishlist(owner, persistence);
}
function setIncluded(handle: string, included: boolean): string[] {
  if (!normalizeWishlist([handle]).length) return getWishlist();
  const next = applyWishlistChanges(getWishlist(), { [handle]: included });
  write(storageKey(), next);
  if (owner) write(`${storageKey()}:changes`, { ...changes(), [handle]: included });
  notify(); void flushWishlist();
  return next;
}
export function addToWishlist(handle: string): string[] { return setIncluded(handle, true); }
export function removeFromWishlist(handle: string): string[] { return setIncluded(handle, false); }
export function toggleWishlist(handle: string): boolean {
  const included = !getWishlist().includes(handle);
  setIncluded(handle, included);
  return included;
}
export function isInWishlist(handle: string): boolean { return getWishlist().includes(handle); }
export function clearWishlist(): void {
  const current = getWishlist();
  if (owner) write(`${storageKey()}:changes`, { ...changes(), ...Object.fromEntries(current.map((h) => [h, false])) });
  write(storageKey(), []); notify(); void flushWishlist();
}
