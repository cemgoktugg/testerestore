/**
 * Centralized Medusa configuration.
 *
 * Reads from environment variables and exposes typed constants used by
 * the SDK client, server-side fetchers, and price formatters.
 */

const isServer = typeof window === "undefined";

function readEnv(serverKey: string, publicKey: string, fallback = ""): string {
  if (isServer) {
    return process.env[serverKey] || process.env[publicKey] || fallback;
  }
  return process.env[publicKey] || fallback;
}

export const MEDUSA_BACKEND_URL = readEnv(
  "MEDUSA_BACKEND_URL",
  "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
  "http://localhost:9000"
);

export const MEDUSA_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "";

export const DEFAULT_REGION = (
  process.env.NEXT_PUBLIC_DEFAULT_REGION || "tr"
).toLowerCase();

export const DEFAULT_CURRENCY = (
  process.env.NEXT_PUBLIC_DEFAULT_CURRENCY || "try"
).toLowerCase();

export const HAS_PUBLISHABLE_KEY =
  !!MEDUSA_PUBLISHABLE_KEY && MEDUSA_PUBLISHABLE_KEY !== "pk_replace_me";

export const HAS_BACKEND = (() => {
  try {
    const u = new URL(MEDUSA_BACKEND_URL);
    return !!u.hostname;
  } catch {
    return false;
  }
})();

/** Truthy only when a real backend + key combo is configured. */
export const MEDUSA_READY = HAS_BACKEND && HAS_PUBLISHABLE_KEY;
