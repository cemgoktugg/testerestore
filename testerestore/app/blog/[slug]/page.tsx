import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import NewsletterSignup from "../../components/NewsletterSignup";
import { getBlogPost } from "../../../lib/medusa/services/blog";
import { ArrowLeft, Calendar, User, Tag } from "lucide-react";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// ISR: yazı statik render edilir, 5 dakikada bir arka planda yenilenir.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Yazı Bulunamadı" };
  return {
    title: post.seo_title || post.title,
    description: post.seo_description || post.excerpt || undefined,
    openGraph: {
      type: "article",
      title: post.seo_title || post.title,
      description: post.seo_description || post.excerpt || undefined,
      images: post.cover_image ? [{ url: post.cover_image }] : undefined,
      publishedTime: post.published_at || undefined,
      authors: post.author ? [post.author] : undefined,
    },
  };
}

function renderMd(md: string) {
  const lines = md.split("\n");
  const blocks: React.ReactNode[] = [];
  let buf: string[] = [];
  let key = 0;
  const flush = () => {
    if (buf.length) {
      blocks.push(
        <ul
          key={`ul-${key++}`}
          className="list-disc pl-6 space-y-1.5 text-base text-muted-foreground my-4"
        >
          {buf.map((it, i) => (
            <li key={i} dangerouslySetInnerHTML={{ __html: inline(it) }} />
          ))}
        </ul>
      );
      buf = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("- ")) {
      buf.push(line.slice(2));
      continue;
    }
    flush();
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`h3-${key++}`} className="text-lg font-bold mt-6 mb-2">
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith("## ")) {
      blocks.push(
        <h2
          key={`h2-${key++}`}
          className="text-2xl font-extrabold mt-8 mb-3 tracking-tight"
        >
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith("# ")) {
      blocks.push(
        <h1
          key={`h1-${key++}`}
          className="text-3xl font-black mt-6 mb-4 tracking-tight"
        >
          {line.slice(2)}
        </h1>
      );
    } else if (line.trim() === "") {
      blocks.push(<div key={`sp-${key++}`} className="h-2" />);
    } else if (line.startsWith("> ")) {
      blocks.push(
        <blockquote
          key={`q-${key++}`}
          className="border-l-4 border-accent bg-accent/5 pl-4 py-2 my-4 italic text-sm"
          dangerouslySetInnerHTML={{ __html: inline(line.slice(2)) }}
        />
      );
    } else {
      blocks.push(
        <p
          key={`p-${key++}`}
          className="text-base text-muted-foreground leading-relaxed my-3"
          dangerouslySetInnerHTML={{ __html: inline(line) }}
        />
      );
    }
  }
  flush();
  return blocks;
}

function inline(s: string): string {
  const esc = s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  let out = esc.replace(
    /\*\*([^*]+)\*\*/g,
    '<strong class="text-foreground font-semibold">$1</strong>'
  );
  out = out.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  out = out.replace(
    /\[([^\]]+)\]\((https?:[^\s)]+|\/[^\s)]*)\)/g,
    '<a href="$2" class="text-accent hover:underline">$1</a>'
  );
  return out;
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

  const tags = post.tags
    ? post.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <>
      <Header />
      <main className="flex-1 py-10 md:py-16 bg-background">
        <article className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-muted-foreground hover:text-primary mb-6"
          >
            <ArrowLeft className="h-4 w-4" /> Tüm Yazılar
          </Link>

          <header className="space-y-4 mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {post.author && (
                <span className="inline-flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-accent" /> {post.author}
                </span>
              )}
              {post.published_at && (
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-accent" />
                  {new Date(post.published_at).toLocaleDateString("tr-TR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              )}
              {tags.length > 0 && (
                <span className="inline-flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-accent" />
                  {tags.join(", ")}
                </span>
              )}
            </div>
          </header>

          {post.cover_image && (
            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-8 bg-premium-image-bg">
              <Image
                src={post.cover_image}
                alt={post.title}
                fill
                className="object-cover"
                priority
                sizes="(max-width:768px) 100vw, 800px"
              />
            </div>
          )}

          <div className="prose-content">{renderMd(post.body_md)}</div>

          <div className="mt-12">
            <NewsletterSignup source="blog-post" />
          </div>
        </article>
      </main>
      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.title,
            datePublished: post.published_at,
            author: post.author
              ? { "@type": "Person", name: post.author }
              : undefined,
            image: post.cover_image || undefined,
            description: post.seo_description || post.excerpt,
          }),
        }}
      />
    </>
  );
}
