import { createHash, createHmac, timingSafeEqual } from "node:crypto";

type RecoveryToken = { cart: string; email: string; expires: number };
const key = () => {
  const secret = process.env.COOKIE_SECRET || process.env.JWT_SECRET;
  if (!secret || secret.length < 32) throw new Error("Secure cart recovery signing key is required");
  return secret;
};
export const recoveryEmailFingerprint = (email: string) => createHash("sha256").update(email.trim().toLowerCase()).digest("hex");

export function signCartRecovery(cart: string, email: string, secret = key(), now = Date.now()): string {
  const payload = Buffer.from(JSON.stringify({ cart, email: recoveryEmailFingerprint(email), expires: now + 48 * 60 * 60 * 1000 })).toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(`cart-recovery:${payload}`).digest("base64url")}`;
}

export function verifyCartRecovery(token: string, secret = key(), now = Date.now()): RecoveryToken | null {
  if (typeof token !== "string" || token.length > 2048) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra !== undefined) return null;
  const expected = createHmac("sha256", secret).update(`cart-recovery:${payload}`).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as RecoveryToken;
    if (!/^cart_[\w-]+$/.test(decoded.cart) || !/^[a-f0-9]{64}$/.test(decoded.email) || !Number.isFinite(decoded.expires) || decoded.expires <= now) return null;
    return decoded;
  } catch { return null; }
}

export function cartRecoveryUrl(cart: string, email: string): string {
  const base = process.env.STOREFRONT_URL || (process.env.NODE_ENV === "production" ? "" : "http://localhost:3001");
  const url = new URL("/sepeti-kurtar", base);
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("STOREFRONT_URL must use HTTPS");
  // Fragments do not appear in HTTP access logs or referrer headers.
  url.hash = `token=${signCartRecovery(cart, email)}`;
  return url.toString();
}
