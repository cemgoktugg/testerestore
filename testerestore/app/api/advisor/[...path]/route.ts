/**
 * Şerit Testere Danışmanı — sunucu tarafı proxy.
 *
 * Tarayıcı advisor servisine hiç doğrudan konuşmaz. Sebepleri:
 *   1. Servis iç ağda (docker-compose `internal`), internetten erişilemez.
 *   2. Same-origin olduğu için CORS/preflight yok.
 *   3. Rate limit burada uygulanıyor — gerçek istemci IP'sini burada görüyoruz.
 *   4. Advisor'ın yazma uçları (/api/unknown-questions/.../answer) dışarı
 *      açılmıyor; aşağıdaki allowlist dışındaki her yol 404 döner.
 *
 * Bu dosya yeni; mevcut hiçbir route veya bileşen değiştirilmedi.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ADVISOR_URL = process.env.ADVISOR_URL || "http://advisor:5000";

/**
 * Dışarı açılan uçlar. Advisor'daki diğer uçlar (unknown-questions,
 * learned-knowledge, stats) bilerek DIŞARIDA — bunlar bilgi tabanına
 * yazabilen/iç durum sızdıran admin yüzeyi.
 */
const ALLOWED: Record<string, { method: "GET" | "POST"; upstream: string }> = {
  chat: { method: "POST", upstream: "/api/chat" },
  "chat/reset": { method: "POST", upstream: "/api/chat/reset" },
  health: { method: "GET", upstream: "/api/health" },
};

// ── Rate limit ────────────────────────────────────────────────────────────
// Tek storefront instance'ı olduğu için bellek içi yeterli. Çok instance'a
// çıkılırsa Redis'e taşınmalı (backend zaten Redis kullanıyor).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12; // IP başına dakikada mesaj
const MAX_MESSAGE_CHARS = 1000;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);

  if (!b || now >= b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    // Map sınırsız büyümesin: pencere dolmuş kayıtları ara sıra temizle
    if (buckets.size > 5000) {
      for (const [k, v] of buckets) if (now >= v.resetAt) buckets.delete(k);
    }
    return false;
  }

  b.count += 1;
  return b.count > MAX_PER_WINDOW;
}

function clientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

async function forward(
  req: NextRequest,
  pathParts: string[]
): Promise<NextResponse> {
  const key = pathParts.join("/");
  const route = ALLOWED[key];

  if (!route || route.method !== req.method) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (req.method === "POST" && rateLimited(clientIp(req))) {
    return NextResponse.json(
      {
        success: false,
        error: "rate_limited",
        response:
          "Çok hızlı mesaj gönderiyorsunuz. Lütfen biraz bekleyip tekrar deneyin.",
      },
      { status: 429 }
    );
  }

  let body: string | undefined;
  if (req.method === "POST") {
    const raw = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    if (typeof raw.message === "string" && raw.message.length > MAX_MESSAGE_CHARS) {
      raw.message = raw.message.slice(0, MAX_MESSAGE_CHARS);
    }
    body = JSON.stringify(raw);
  }

  // Advisor GPT-4o çağırıyor; uzun düşünme süresi normal.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);

  try {
    const upstream = await fetch(`${ADVISOR_URL}${route.upstream}`, {
      method: req.method,
      headers: { "Content-Type": "application/json" },
      body,
      signal: controller.signal,
      cache: "no-store",
    });

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const aborted = err instanceof Error && err.name === "AbortError";
    return NextResponse.json(
      {
        success: false,
        error: aborted ? "timeout" : "upstream_unavailable",
        response: aborted
          ? "Danışman yanıt vermekte gecikti. Lütfen tekrar deneyin."
          : "Danışman şu anda kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
      },
      { status: 503 }
    );
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  return forward(req, path);
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const { path } = await ctx.params;
  return forward(req, path);
}
