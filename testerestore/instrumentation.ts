/**
 * Next.js'in resmi instrumentation hook'u. Süreç boot olurken ilk çalışan
 * dosyalardan biri — Sentry init'i runtime'a göre buradan yönlendirir.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export const onRequestError = async (
  err: unknown,
  request: unknown,
  context: unknown
) => {
  if (!process.env.SENTRY_DSN && !process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(err, request as never, context as never);
};
