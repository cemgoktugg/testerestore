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
import { clientIp, isCrossSite } from "../../../../lib/request-guard";

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
  // Cevaba 👍/👎 — yalnızca danışmanın olay kaydına yazılır (Faz 0 ölçümü)
  "chat/feedback": { method: "POST", upstream: "/api/chat/feedback" },
  health: { method: "GET", upstream: "/api/health" },
};

// ── Rate limit ────────────────────────────────────────────────────────────
// Tek storefront instance'ı olduğu için bellek içi yeterli. Çok instance'a
// çıkılırsa Redis'e taşınmalı (backend zaten Redis kullanıyor).
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 12; // IP başına dakikada mesaj
const MAX_MESSAGE_CHARS = 1000;
const MAX_BODY_BYTES = 8 * 1024;
const SESSION_ID_RE = /^[A-Za-z0-9_-]{8,64}$/;
// Maliyet tavanı: tüm ziyaretçiler toplamında günlük mesaj sınırı (IP başına
// sınırı çok sayıda IP'yle aşan bir saldırıda OpenAI faturasını sınırlar).
const DAILY_LIMIT = Number(process.env.ADVISOR_DAILY_LIMIT) || 3000;
let daily = { day: "", count: 0 };

function dailyLimitReached(): boolean {
  const today = new Date().toISOString().slice(0, 10);
  if (daily.day !== today) daily = { day: today, count: 0 };
  daily.count += 1;
  return daily.count > DAILY_LIMIT;
}

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


async function forward(
  req: NextRequest,
  pathParts: string[]
): Promise<NextResponse> {
  const key = pathParts.join("/");
  const route = ALLOWED[key];

  if (!route || route.method !== req.method) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (req.method === "POST" && isCrossSite(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
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
    if (Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    const text = await req.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ error: "payload_too_large" }, { status: 413 });
    }
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(text);
    } catch {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    const sessionId = raw?.session_id;
    if (typeof sessionId !== "string" || !SESSION_ID_RE.test(sessionId)) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    // Danışmana YALNIZCA bilinen alanlar gider — eskiden gövde olduğu gibi
    // iletiliyordu; dizi/nesne "message" 1000 karakter sınırını aşıp OpenAI'ye
    // yüzlerce KB olarak gidebiliyordu.
    if (key === "chat") {
      const message = raw.message;
      if (typeof message !== "string" || !message.trim()) {
        return NextResponse.json({ error: "bad_request" }, { status: 400 });
      }
      if (dailyLimitReached()) {
        return NextResponse.json(
          {
            success: false,
            error: "busy",
            response:
              "Danışman şu anda çok yoğun. Lütfen daha sonra tekrar deneyin veya WhatsApp'tan bize yazın.",
          },
          { status: 503 }
        );
      }
      body = JSON.stringify({ message: message.slice(0, MAX_MESSAGE_CHARS), session_id: sessionId });
    } else if (key === "chat/feedback") {
      const rating = raw.rating;
      if (rating !== "up" && rating !== "down") {
        return NextResponse.json({ error: "bad_request" }, { status: 400 });
      }
      const text = (v: unknown, n: number) => (typeof v === "string" ? v.slice(0, n) : "");
      body = JSON.stringify({
        session_id: sessionId,
        rating,
        bot_text: text(raw.bot_text, 300),
        comment: text(raw.comment, 500),
      });
    } else {
      body = JSON.stringify({ session_id: sessionId });
    }
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
    if (upstream.status >= 500) {
      // Python/OpenAI hata ayrıntıları ziyaretçiye gitmesin.
      return NextResponse.json(
        {
          success: false,
          error: "upstream_error",
          response: "Danışman şu anda yanıt veremiyor. Lütfen biraz sonra tekrar deneyin.",
        },
        { status: 502 }
      );
    }
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
