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

const backendPort = (() => {
  try {
    const u = new URL(medusaBackend);
    return u.port || (u.protocol === "https:" ? "443" : "80");
  } catch {
    return "9000";
  }
})();

const nextConfig: NextConfig = {
  // Docker/VPS dağıtımı için yalın, kendi kendine yeten çıktı. Sadece
  // `next build` çıktısını etkiler (.next/standalone üretir); `next dev` ve
  // `next start` davranışı değişmez. Vercel'de yok sayılır.
  output: "standalone",
  images: {
    // AVIF (WebP'den ~%20-30 daha küçük) + WebP fallback. LCP/bandwidth kazancı.
    formats: ["image/avif", "image/webp"],
    // Next 16 blocks upstream URLs that resolve to private IPs (localhost,
    // 127.0.0.1) as SSRF protection. The Medusa local file provider serves
    // images from http://localhost:9000/static/* so in DEV we bypass the
    // optimizer. In PRODUCTION images must be served from a public host
    // (S3 / Cloudflare R2 / public backend domain — see remotePatterns) so
    // optimization (resize, WebP/AVIF, responsive srcset) is re-enabled.
    unoptimized: process.env.NODE_ENV !== "production",
    remotePatterns: [
      // Medusa local file provider (current backend)
      {
        protocol: backendProtocol,
        hostname: backendHost ?? "localhost",
        port: backendPort,
        pathname: "/**",
      },
      // Localhost fallback (covers any port mismatch in env)
      { protocol: "http", hostname: "localhost", port: "9000", pathname: "/**" },
      { protocol: "http", hostname: "127.0.0.1", port: "9000", pathname: "/**" },
      // Common cloud storage CDNs Medusa file providers use
      { protocol: "https", hostname: "**.medusajs.app", pathname: "/**" },
      { protocol: "https", hostname: "**.s3.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "**.s3.eu-west-1.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "**.s3.us-east-1.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com", pathname: "/**" },
      { protocol: "https", hostname: "**.cloudfront.net", pathname: "/**" },
      { protocol: "https", hostname: "**.r2.dev", pathname: "/**" },
      { protocol: "https", hostname: "**.cloudinary.com", pathname: "/**" },
    ],
  },
};

// Bundle analyzer'ı ANALYZE=true ile aktif olur: npm run analyze
export default withBundleAnalyzer(nextConfig);
