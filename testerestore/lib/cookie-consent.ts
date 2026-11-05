export const CONSENT_KEY = "ts_cookie_consent";
export const CONSENT_EVENT = "cookie-consent-changed";
export const OPEN_CONSENT_EVENT = "open-cookie-preferences";

export interface CookiePreferences {
  version: 2;
  analytics: boolean;
  marketing: boolean;
  updatedAt: string;
}

export function parseCookiePreferences(raw: string | null): CookiePreferences | null {
  if (!raw) return null;
  // Keep a previous refusal; ask again before upgrading old bundled consent.
  if (raw === "necessary") return { version: 2, analytics: false, marketing: false, updatedAt: "" };
  try {
    const value = JSON.parse(raw);
    if (value?.version !== 2 || typeof value.analytics !== "boolean" || typeof value.marketing !== "boolean" || typeof value.updatedAt !== "string") return null;
    return value;
  } catch { return null; }
}

let memoryPreferences: CookiePreferences | null = null;

export function getCookiePreferences(): CookiePreferences | null {
  if (typeof window === "undefined") return null;
  try { return parseCookiePreferences(window.localStorage.getItem(CONSENT_KEY)) ?? memoryPreferences; }
  catch { return memoryPreferences; }
}

export function saveCookiePreferences(analytics: boolean, marketing: boolean): CookiePreferences {
  const preferences: CookiePreferences = { version: 2, analytics, marketing, updatedAt: new Date().toISOString() };
  memoryPreferences = preferences;
  try { window.localStorage.setItem(CONSENT_KEY, JSON.stringify(preferences)); } catch { /* Apply for this session. */ }
  window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: preferences }));
  return preferences;
}

export function openCookiePreferences() { window.dispatchEvent(new Event(OPEN_CONSENT_EVENT)); }

/** Remove known optional tracking cookies, never cart or authentication cookies. */
export function clearTrackingCookies() {
  if (typeof document === "undefined") return;
  const parts = window.location.hostname.split(".");
  const domains = ["", ...parts.map((_, i) => parts.slice(i).join("."))];
  for (const item of document.cookie.split(";")) {
    const name = item.split("=")[0].trim();
    if (!/^(_ga(?:_|$)|_gid$|_gat|_gcl_|_fbp$|_fbc$|_ym_)/.test(name)) continue;
    for (const domain of domains) {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax${domain ? `; domain=${domain}` : ""}`;
    }
  }
}
