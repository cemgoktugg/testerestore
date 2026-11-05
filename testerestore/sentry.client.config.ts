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
    // Error diagnostics only. Do not start session replay or usage profiling.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    sendDefaultPii: false,
    beforeSend(event) {
      delete event.user;
      if (event.request) {
        delete event.request.cookies;
        delete event.request.data;
        delete event.request.headers;
        delete event.request.query_string;
        if (event.request.url) event.request.url = event.request.url.split(/[?#]/)[0];
      }
      // Navigation/fetch breadcrumbs can contain reset or recovery tokens.
      event.breadcrumbs = [];
      return event;
    },
    /** Bilinen, davranışa etki etmeyen hataları filtrele. */
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications.",
      "Non-Error promise rejection captured",
    ],
  });
}
