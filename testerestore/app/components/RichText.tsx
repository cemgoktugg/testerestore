"use client";

import React from "react";
import { CheckCircle2 } from "lucide-react";

/**
 * Lightweight markdown renderer with premium product-detail styling.
 *
 * Destekler:
 *   # H1         → büyük bölüm başlığı (orange-grad altı çizgi)
 *   ## H2        → orta başlık (sol accent çubuk)
 *   ### H3       → küçük başlık
 *   **bold**     → kalın
 *   *italic*     → italik
 *   [text](url)  → link
 *   - madde      → ikonlu liste (CheckCircle yeşil)
 *   * madde      → aynı liste
 *   > callout    → premium uyarı/spotlight kutusu
 *   ---          → ayırıcı çizgi
 *   `kod`        → inline kod
 *   düz paragraf → modern okuma boyutu
 *
 * Mevcut "Genel Açıklama" alanına bunu bağlamak için sadece admin'in
 * description / long_description / metadata.long_description alanına
 * markdown yazması yeterli.
 */
interface Props {
  body: string;
  className?: string;
  /** Liste maddelerinin önündeki ikon. Varsayılan ✓ (CheckCircle). */
  bulletIcon?: "check" | "dot";
}

export default function RichText({
  body,
  className = "",
  bulletIcon = "check",
}: Props) {
  // Önce markdown markeri olmayan düz metni heuristikle markdown'a dönüştür,
  // sonra parser çalışsın. Admin "# " yazmasa bile "Öne Çıkan Özellikler"
  // gibi kısa standalone satırlar otomatik başlığa, ardı ardına gelen kısa
  // satırlar otomatik listeye döner.
  const normalized = autoMarkdown(body || "");
  const blocks = renderMarkdown(normalized, bulletIcon);
  return <div className={`space-y-3 ${className}`}>{blocks}</div>;
}

/**
 * Düz metni markdown'a normalize eder. Eğer satır zaten markdown marker
 * içeriyorsa (`# `, `- `, `> `, `---`) dokunmaz; aksi halde:
 *   - Tek satırlık, kısa (≤80), nokta/soru/ünlem ile bitmeyen blok → ## başlık
 *   - 2+ satır, hepsi kısa ve çoğu noktasız → her satır listeye (- prefix)
 *   - Diğer her şey paragraf olarak kalır
 */
function autoMarkdown(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let i = 0;

  while (i < lines.length) {
    if (lines[i].trim() === "") {
      out.push("");
      i++;
      continue;
    }
    const block: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      block.push(lines[i]);
      i++;
    }

    // Zaten markdown markerlı satır varsa dokunma
    const hasMarker = block.some((l) =>
      /^(#{1,3}\s|-\s|\*\s|>\s|---|\*\*\*)/.test(l.trim())
    );
    if (hasMarker) {
      out.push(...block);
      continue;
    }

    // Tek satır → potansiyel başlık
    if (block.length === 1) {
      const t = block[0].trim();
      if (t.length <= 80 && !/[.!?:]$/.test(t)) {
        out.push("## " + t);
      } else {
        out.push(block[0]);
      }
      continue;
    }

    // Çok satırlı blok → ya hepsi kısa+noktasız ise liste, yoksa paragraflar
    const shortNoPunct = block.filter((l) => {
      const t = l.trim();
      return t.length <= 80 && !/[.!?]$/.test(t);
    }).length;

    if (shortNoPunct >= block.length - 1 && shortNoPunct >= 2) {
      for (const l of block) out.push("- " + l.trim());
    } else {
      out.push(...block);
    }
  }

  return out.join("\n");
}

function renderMarkdown(
  md: string,
  bulletIcon: "check" | "dot"
): React.ReactNode[] {
  if (!md) return [];
  const lines = md.split("\n");
  const blocks: React.ReactNode[] = [];
  let listBuf: string[] = [];
  let quoteBuf: string[] = [];
  let key = 0;

  const flushList = () => {
    if (!listBuf.length) return;
    blocks.push(
      <ul
        key={`ul-${key++}`}
        className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 my-4"
      >
        {listBuf.map((item, i) => (
          <li
            key={i}
            className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed"
          >
            {bulletIcon === "check" ? (
              <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            ) : (
              <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
            )}
            <span dangerouslySetInnerHTML={{ __html: inlineMd(item) }} />
          </li>
        ))}
      </ul>
    );
    listBuf = [];
  };

  const flushQuote = () => {
    if (!quoteBuf.length) return;
    blocks.push(
      <blockquote
        key={`q-${key++}`}
        className="relative my-5 rounded-xl border-l-4 border-accent bg-gradient-to-br from-accent/8 to-transparent p-4 pl-5"
      >
        <div
          className="text-sm text-foreground leading-relaxed font-medium"
          dangerouslySetInnerHTML={{ __html: inlineMd(quoteBuf.join(" ")) }}
        />
      </blockquote>
    );
    quoteBuf = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("- ") || line.startsWith("* ")) {
      flushQuote();
      listBuf.push(line.slice(2));
      continue;
    }
    if (line.startsWith("> ")) {
      flushList();
      quoteBuf.push(line.slice(2));
      continue;
    }
    flushList();
    flushQuote();

    if (line === "---" || line === "***") {
      blocks.push(
        <hr
          key={`hr-${key++}`}
          className="my-6 border-t border-border/80"
        />
      );
    } else if (line.startsWith("### ")) {
      blocks.push(
        <h3
          key={`h3-${key++}`}
          className="text-base font-bold tracking-tight text-foreground mt-5 mb-2"
        >
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      blocks.push(
        <h2
          key={`h2-${key++}`}
          className="text-lg font-extrabold tracking-tight text-foreground mt-6 mb-2 flex items-center gap-2"
        >
          <span className="h-5 w-1 rounded-full bg-molten-grad" />
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      blocks.push(
        <div key={`h1-${key++}`} className="mt-2 mb-3 pb-3 border-b border-border">
          <h2 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
            <span className="text-orange-grad">{line.slice(2)}</span>
          </h2>
        </div>
      );
    } else if (line.trim() === "") {
      blocks.push(<div key={`sp-${key++}`} className="h-1" />);
    } else {
      blocks.push(
        <p
          key={`p-${key++}`}
          className="text-sm text-muted-foreground leading-relaxed"
          dangerouslySetInnerHTML={{ __html: inlineMd(line) }}
        />
      );
    }
  }
  flushList();
  flushQuote();
  return blocks;
}

/** Inline markdown: **bold**, *italic*, `code`, [link](url). HTML escape edilir. */
function inlineMd(s: string): string {
  const esc = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  let out = esc;
  // **bold**
  out = out.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong class="text-foreground font-semibold">$1</strong>'
  );
  // *italic*  (bold'tan sonra, kalanı yakala)
  out = out.replace(/(^|[^\*])\*([^*]+)\*(?!\*)/g, '$1<em class="italic">$2</em>');
  // `kod`
  out = out.replace(
    /`([^`]+)`/g,
    '<code class="px-1.5 py-0.5 rounded bg-muted text-foreground text-[12px] font-mono">$1</code>'
  );
  // [text](url) — yalnızca http(s) ve root-relative kabul et
  out = out.replace(
    /\[([^\]]+)\]\((https?:[^\s)]+|\/[^\s)]*)\)/g,
    '<a href="$2" class="text-accent hover:underline font-semibold">$1</a>'
  );
  return out;
}
