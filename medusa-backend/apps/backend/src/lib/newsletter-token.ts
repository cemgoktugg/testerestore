import { createHmac, timingSafeEqual } from "node:crypto";
export type NewsletterToken = { sub: string; nonce: string; action: "confirm" | "unsubscribe"; exp: number };
function key() {
  const value = process.env.COOKIE_SECRET || process.env.JWT_SECRET;
  if (!value || value.length < 32 || /^supersecret/i.test(value)) throw new Error("Bülten bağlantıları için güvenli imza anahtarı yapılandırılmalı.");
  return value;
}
export function signNewsletterToken(payload: NewsletterToken, secret = key()) {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return data + "." + createHmac("sha256", secret).update("newsletter:" + data).digest("base64url");
}
export function verifyNewsletterToken(token: string, action: NewsletterToken["action"], secret = key(), now = Date.now()): NewsletterToken | null {
  if (token.length > 2048) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const expected = createHmac("sha256", secret).update("newsletter:" + parts[0]).digest();
  const actual = Buffer.from(parts[1], "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8")) as NewsletterToken;
    if (payload.action !== action || typeof payload.sub !== "string" || typeof payload.nonce !== "string" ||
        !Number.isFinite(payload.exp) || payload.exp <= now) return null;
    return payload;
  } catch { return null; }
}
export function newsletterLink(action: NewsletterToken["action"], sub: string, nonce: string) {
  const base = process.env.STOREFRONT_URL || (process.env.NODE_ENV !== "production" ? "http://localhost:3001" : "");
  const url = new URL("/bulten", base);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("STOREFRONT_URL HTTPS olmalı.");
  url.searchParams.set("islem", action === "confirm" ? "onay" : "ayril");
  url.hash = new URLSearchParams({ token: signNewsletterToken({ sub, nonce, action, exp: Date.now() + (action === "confirm" ? 48 * 60 * 60 * 1000 : 10 * 365 * 24 * 60 * 60 * 1000) }) }).toString();
  return url.toString();
}
