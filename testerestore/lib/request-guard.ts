/**
 * Sunucu tarafı API rotaları için ortak istek kontrolleri (yalnızca route
 * handler'larda kullanılır).
 */
import type { NextRequest } from "next/server";

/**
 * Gerçek istemci IP'si: Traefik X-Real-Ip'yi kendisi yazar ve
 * X-Forwarded-For'un SONUNA gerçek IP'yi ekler. İlk halka istemcinin
 * uydurabileceği değerdir (eskiden ona güveniliyordu). IPv6'da tek kullanıcı
 * koca bir /64 bloğuna sahip olduğundan sınır /64 başına uygulanır.
 */
export function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  const ip =
    req.headers.get("x-real-ip") ||
    (fwd ? fwd.split(",").pop()!.trim() : "") ||
    "unknown";
  return ip.includes(":") ? ip.split(":").slice(0, 4).join(":") + "::/64" : ip;
}

/** Tam IP (rate-limit anahtarı değil, backend'e iletmek için). */
export function rawClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (
    req.headers.get("x-real-ip") ||
    (fwd ? fwd.split(",").pop()!.trim() : "") ||
    "unknown"
  );
}

/**
 * Yalnızca kendi sitemizden gelen JSON istekleri kabul edilir. Başka bir
 * sitenin sayfasına gömülü `fetch(..., {mode:"no-cors"})` text/plain gövdeyle
 * preflight'sız istek atabilir — her ziyaretçisini ayrı bir IP olarak bize
 * yükleyebilirdi (OpenAI faturası, hesap/e-posta üretimi).
 */
export function isCrossSite(req: NextRequest): boolean {
  if (!(req.headers.get("content-type") || "").includes("application/json")) return true;
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return true;
  const origin = req.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).host !== req.headers.get("host")) return true;
    } catch {
      return true;
    }
  }
  return false;
}
