/**
 * Sentry server-side (Next.js Node runtime) init.
 * SENTRY_DSN veya NEXT_PUBLIC_SENTRY_DSN'den okur.
 */
import * as Sentry from "@sentry/nextjs";

const DSN = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,
    sendDefaultPii: false,
  });
}
