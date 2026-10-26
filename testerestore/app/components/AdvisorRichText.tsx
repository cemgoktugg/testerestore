"use client";

import Link from "next/link";
import React from "react";

/**
 * Danışman mesajlarındaki sınırlı biçimlendirme: **kalın**, [etiket](bağlantı)
 * ve tüm satırı kaplayan _italik_ not. Eskiden metin düz basılıyordu; müşteri
 * "**KESMAK**" gibi yıldızları ve çıplak markdown bağlantılarını görüyordu.
 *
 * Güvenlik: HTML hiç yorumlanmaz (dangerouslySetInnerHTML yok) — her şey
 * React metin düğümü. Bağlantıya yalnızca kendi sitemiz için izin verilir
 * (göreli yol ya da https://testerestore.com); başka adresler düz metin kalır.
 */

const SITE_HOSTS = new Set(["testerestore.com", "www.testerestore.com"]);

function internalHref(url: string): string | null {
  if (url.startsWith("/") && !url.startsWith("//")) return url;
  try {
    const u = new URL(url);
    if (u.protocol === "https:" && SITE_HOSTS.has(u.hostname)) {
      return `${u.pathname}${u.search}${u.hash}`;
    }
  } catch {
    /* geçersiz adres → düz metin */
  }
  return null;
}

// Lookbehind kullanılmadı: eski Safari sürümlerinde sözdizimi hatası verir.
const INLINE = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g;

function renderInline(line: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of line.matchAll(INLINE)) {
    const start = m.index ?? 0;
    if (start > last) out.push(line.slice(last, start));
    if (m[1] !== undefined) {
      out.push(<strong key={`${keyBase}-b${i++}`}>{m[1]}</strong>);
    } else {
      const href = internalHref(m[3]);
      out.push(
        href ? (
          <Link
            key={`${keyBase}-a${i++}`}
            href={href}
            className="font-medium text-accent underline underline-offset-2 hover:opacity-80"
          >
            {m[2]}
          </Link>
        ) : (
          m[2]
        )
      );
    }
    last = start + m[0].length;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export default function AdvisorRichText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((raw, idx) => {
        const line = raw.trim();
        const italic = line.length > 2 && line.startsWith("_") && line.endsWith("_");
        const content = italic ? (
          <em className="text-muted-foreground">{renderInline(line.slice(1, -1), `l${idx}`)}</em>
        ) : (
          renderInline(raw, `l${idx}`)
        );
        return (
          <React.Fragment key={idx}>
            {content}
            {idx < lines.length - 1 ? "\n" : null}
          </React.Fragment>
        );
      })}
    </>
  );
}
