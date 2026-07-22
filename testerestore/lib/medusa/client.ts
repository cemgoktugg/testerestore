import Medusa from "@medusajs/js-sdk";
import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
  MEDUSA_READY,
} from "./config";

/**
 * Singleton Medusa JS SDK client.
 *
 * Used by both server (App Router fetchers) and client (React hooks).
 * The publishable key is attached automatically to every Store API request.
 */
export const medusa = new Medusa({
  baseUrl: MEDUSA_BACKEND_URL,
  publishableKey: MEDUSA_PUBLISHABLE_KEY,
  debug: process.env.NODE_ENV === "development",
});

export { MEDUSA_READY };
