import type { NextConfig } from "next";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
  openAnalyzer: true,
});

const medusaBackend =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:9000";

let backendHost: string | undefined;
let backendProtocol: "http" | "https" = "http";
try {
  const u = new URL(medusaBackend);
  backendHost = u.hostname;
  backendProtocol = u.protocol === "https:" ? "https" : "http";
} catch {
  backendHost = "localhost";
}

// Varsayılan portlarda (443/80) port'u UNDEFINED bırak → remotePattern her
// portu kabul eder. "443" yazarsak, portsuz URL (https://host/...) eşleşmez
// ve next/image "url not allowed" (400) verir; resimler görünmez.
const backendPort: string | undefined = (() => {
  try {
    const u = new URL(medusaBackend);
    return u.port || undefined;
  } catch {
    return "9000";
  }
})();

const isProd = process.env.NODE_ENV === "production";

/**
 * Content-Security-Policy. Yalnızca gerçekten kullanılan kökenler; analitik /
 * Sentry kökenleri ancak ilgili ID build anında tanımlıysa eklenir (ID'yi
 * Dokploy env'ine ekleyip yeniden build edince CSP kendiliğinden genişler).
 * 'unsafe-inline' script: App Router satır içi `self.__next_f` betikleri
 * üretir; nonce ise ISR/önbelleği bozar. Yine de dış kökenlere veri kaçırma,
 * <base> ele geçirme, eklenti ve çerçeveleme engellenir.
 */
function buildCsp(): string {
  const script = ["'self'", "'unsafe-inline'"];
  const img = ["'self'", "data:", "blob:"];
  const connect = ["'self'"];
  const frame: string[] = [];
  if (backendHost) {
    const origin = `${backendProtocol}://${backendHost}${backendPort ? ":" + backendPort : ""}`;
    img.push(origin);
    connect.push(origin);
  }
  if (process.env.NEXT_PUBLIC_GTM_ID || process.env.NEXT_PUBLIC_GA_ID) {
    script.push("https://*.googletagmanager.com");
    img.push("https://*.google-analytics.com", "https://*.googletagmanager.com");
    connect.push(
      "https://*.google-analytics.com",
      "https://*.analytics.google.com",
      "https://*.googletagmanager.com"
    );
    frame.push("https://www.googletagmanager.com");
  }
  if (process.env.NEXT_PUBLIC_META_PIXEL_ID) {
    script.push("https://connect.facebook.net");
    img.push("https://www.facebook.com");
    connect.push("https://www.facebook.com", "https://connect.facebook.net");
  }
  if (process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID) {
    script.push("https://mc.yandex.ru", "https://yastatic.net");
    img.push("https://mc.yandex.ru", "https://mc.yandex.com");
    connect.push("https://mc.yandex.ru", "https://mc.yandex.com", "wss://mc.yandex.ru");
    frame.push("https://mc.yandex.ru", "https://mc.yandex.com", "blob:");
  }
  if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    connect.push("https://*.ingest.sentry.io", "https://*.ingest.de.sentry.io");
  }
  return [
    "default-src 'self'",
    `script-src ${script.join(" ")}`,
    "style-src 'self' 'unsafe-inline'",
    `img-src ${img.join(" ")}`,
    "font-src 'self' data:",
    `connect-src ${connect.join(" ")}`,
    `frame-src ${frame.length ? frame.join(" ") : "'none'"}`,
    "frame-ancestors 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
    "upgrade-insecure-requests",
  ].join("; ");
}

const nextConfig: NextConfig = {
  // Docker/VPS dağıtımı için yalın, kendi kendine yeten çıktı. Sadece
  // `next build` çıktısını etkiler (.next/standalone üretir); `next dev` ve
  // `next start` davranışı değişmez. Vercel'de yok sayılır.
  output: "standalone",
  // "X-Powered-By: Next.js" başlığını gönderme (gereksiz parmak izi).
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // includeSubDomains BİLEREK yok: www alt alan adı henüz DNS/sertifika
          // almadı; eklenirse tarayıcı www'yi zorla https'e çevirip hata verir.
          { key: "Strict-Transport-Security", value: "max-age=31536000" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // Geliştirmede HMR/eval gerektiği için yalnızca üretim build'inde.
          ...(isProd ? [{ key: "Content-Security-Policy", value: buildCsp() }] : []),
        ],
      },
      {
        // public/images ve ikonlar varsayılan olarak max-age=0 ile gidiyordu.
        source: "/images/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" },
        ],
      },
    ];
  },
  images: {
    // AVIF (WebP'den ~%20-30 daha küçük) + WebP fallback. LCP/bandwidth kazancı.
    formats: ["image/avif", "image/webp"],
    // Optimize edilmiş resimleri 30 gün cache'le (default 60sn → sık sık soğuk
    // yeniden optimize ediyordu). İlk optimize sonrası tekrar hızlı.
    minimumCacheTTL: 2592000,
    // Next 16 blocks upstream URLs that resolve to private IPs (localhost,
    // 127.0.0.1) as SSRF protection. The Medusa local file provider serves
    // images from http://localhost:9000/static/* so in DEV we bypass the
    // optimizer. In PRODUCTION images must be served from a public host
    // (S3 / Cloudflare R2 / public backend domain — see remotePatterns) so
    // optimization (resize, WebP/AVIF, responsive srcset) is re-enabled.
    unoptimized: process.env.NODE_ENV !== "production",
    // YALNIZCA kendi backend'imiz. Eskiden *.s3.amazonaws.com, *.cloudfront.net
    // gibi joker alan adları vardı: herkes oralara dosya koyabildiği için
    // optimizer'ımız başkalarının resimlerini işleyen açık bir vekile
    // dönüşüyordu (CPU/bant genişliği + resim işleme açıkları). Yeni bir
    // depolama (S3/R2) eklenirse buraya TAM alan adıyla eklenmeli.
    remotePatterns: [
      {
        protocol: backendProtocol,
        hostname: backendHost ?? "localhost",
        port: backendPort,
        pathname: "/**",
      },
    ],
  },
};

// Bundle analyzer'ı ANALYZE=true ile aktif olur: npm run analyze
export default withBundleAnalyzer(nextConfig);
