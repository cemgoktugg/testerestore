/**
 * Danışman sohbetinden satın alma — sunucu tarafı proxy.
 *
 * Tarayıcı Medusa'nın /store/advisor-signup ucuna doğrudan konuşmaz; istek
 * buradan geçer. Sebebi hız sınırı: o uç hesap açıyor ve e-posta gönderiyor,
 * yani serbest bırakılırsa spam hesap + fatura üretir. Gerçek istemci IP'si
 * yalnızca burada görünüyor.
 *
 * Sınır, sohbet ucundan (dakikada 12 mesaj) kasıtlı olarak çok daha dar:
 * bir kullanıcının normal akışta bunu birden fazla kez tetiklemesi gerekmez.
 *
 * Bu dosya yeni; mevcut hiçbir route değiştirilmedi. Advisor (Python) servisi
 * bu akışa hiç karışmıyor — kişisel veri OpenAI'ye gitmiyor.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
  MEDUSA_READY,
} from "../../../../lib/medusa/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ── Hız sınırı ────────────────────────────────────────────────────────────
// Tek storefront instance'ı olduğu için bellek içi yeterli (sohbet proxy'siyle
// aynı gerekçe). Çok instance'a çıkılırsa Redis'e taşınmalı.
const WINDOW_MS = 10 * 60_000;
const MAX_PER_WINDOW = 3;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip);

  if (!b || now >= b.resetAt) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
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

export async function POST(req: NextRequest) {
  if (!MEDUSA_READY) {
    return NextResponse.json(
      { ok: false, message: "Mağaza şu anda kullanılamıyor." },
      { status: 503 }
    );
  }

  if (rateLimited(clientIp(req))) {
    return NextResponse.json(
      {
        ok: false,
        code: "rate_limited",
        message:
          "Çok fazla kayıt denemesi yapıldı. Lütfen biraz bekleyip tekrar deneyin.",
      },
      { status: 429 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { ok: false, message: "Geçersiz istek." },
      { status: 400 }
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const upstream = await fetch(`${MEDUSA_BACKEND_URL}/store/advisor-signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
      },
      body: JSON.stringify(body),
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
        ok: false,
        code: aborted ? "timeout" : "upstream_unavailable",
        message: aborted
          ? "İşlem zaman aşımına uğradı. Lütfen tekrar deneyin."
          : "Kayıt tamamlanamadı. Lütfen daha sonra tekrar deneyin.",
      },
      { status: 503 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
