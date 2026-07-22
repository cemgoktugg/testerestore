/**
 * Sentry browser-side init. Sadece NEXT_PUBLIC_SENTRY_DSN set olduğunda
 * init eder; aksi halde no-op. Production'da daha düşük sampling önerilir.
 */
import * as Sentry from "@sentry/nextjs";

const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (DSN) {
  Sentry.init({
    dsn: DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    /** Çerez izni yoksa kişisel veri toplamaktan kaçın. */
    sendDefaultPii: false,
    integrations: [
      Sentry.replayIntegration({
        maskAllText: true,
        blockAllMedia: true,
      }),
    ],
    /** Bilinen, davranışa etki etmeyen hataları filtrele. */
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications.",
      "Non-Error promise rejection captured",
    ],
  });
}
