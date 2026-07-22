import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import { getLegalPage, LEGAL_PAGES } from "../../../lib/legal-content";
import { ArrowLeft } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return LEGAL_PAGES.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getLegalPage(slug);
  if (!page) return { title: "Sayfa Bulunamadı" };
  return {
    title: page.title,
    description: `${page.title} — yasal bilgilendirme metni.`,
    robots: { index: true, follow: true },
  };
}

/** Lightweight Markdown renderer — sadece bizim formatlarımızı destekler. */
function renderBody(body: string) {
  const blocks: React.ReactNode[] = [];
  const lines = body.split("\n");
  let listBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length) {
      blocks.push(
        <ul
          key={`ul-${key++}`}
          className="list-disc pl-6 space-y-1.5 text-sm text-muted-foreground"
        >
          {listBuffer.map((item, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inlineMd(item) }} />
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (line.startsWith("- ")) {
      listBuffer.push(line.slice(2));
      continue;
    }
    flushList();

    if (line.startsWith("### ")) {
      blocks.push(
        <h3
          key={`h3-${key++}`}
          className="text-base font-bold text-foreground mt-6 mb-2"
        >
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      blocks.push(
        <h2
          key={`h2-${key++}`}
          className="text-lg font-bold text-foreground mt-8 mb-3 border-l-4 border-accent pl-3"
        >
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      blocks.push(
        <h1
          key={`h1-${key++}`}
          className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground mb-4"
        >
          {line.slice(2)}
        </h1>
      );
    } else if (line.trim() === "") {
      blocks.push(<div key={`sp-${key++}`} className="h-2" />);
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
  return blocks;
}

/** Inline markdown: **bold**, [text](url) → safe HTML */
function inlineMd(s: string): string {
  // Escape HTML
  const esc = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  // **bold**
  let out = esc.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong class="text-foreground font-semibold">$1</strong>'
  );
  // [text](url) — only allow http(s) and root-relative
  out = out.replace(
    /\[([^\]]+)\]\((https?:[^\s)]+|\/[^\s)]*)\)/g,
    '<a href="$2" class="text-accent hover:underline">$1</a>'
  );
  return out;
}

export default async function LegalPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getLegalPage(slug);
  if (!page) notFound();

  return (
    <>
      <Header />
      <main className="flex-1 py-8 md:py-16 bg-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Ana Sayfaya Dön</span>
          </Link>

          <div className="rounded-2xl bg-metallic-card p-6 md:p-10 shadow-sm space-y-3">
            {renderBody(page.body)}
          </div>

          {/* Diğer yasal sayfalar */}
          <div className="mt-10 rounded-xl border border-border bg-muted/20 p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
              Diğer Yasal Bilgilendirme
            </h3>
            <div className="flex flex-wrap gap-2">
              {LEGAL_PAGES.filter((p) => p.slug !== slug).map((p) => (
                <Link
                  key={p.slug}
                  href={`/yasal/${p.slug}`}
                  className="inline-flex items-center rounded-full bg-background border border-border px-3 py-1.5 text-[11px] font-semibold text-muted-foreground hover:text-accent hover:border-accent/40 transition-colors"
                >
                  {p.shortTitle}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
