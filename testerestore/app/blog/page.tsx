import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { listBlogPosts } from "../../lib/medusa/services/blog";
import { ArrowRight, Calendar, User } from "lucide-react";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Şerit testere seçimi, kullanım ipuçları, sektör haberleri ve teknik makaleler.",
};

// ISR: sayfa statik render edilir, 5 dakikada bir arka planda yenilenir.
export const revalidate = 300;

export default async function BlogIndexPage() {
  const posts = await listBlogPosts(50);

  return (
    <>
      <Header />
      <main className="flex-1 py-10 md:py-16 bg-background">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <header className="mb-10 text-center space-y-3">
            <p className="text-[10px] font-bold tracking-[0.36em] uppercase text-accent">
              Blog
            </p>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
              Şerit Testere <span className="text-orange-grad">Rehberi</span>
            </h1>
            <p className="text-sm text-muted-foreground max-w-xl mx-auto">
              Doğru bıçak seçimi, kullanım önerileri ve endüstriyel kesim
              ipuçları.
            </p>
          </header>

          {posts.length === 0 ? (
            <div className="text-center py-20 rounded-2xl border border-dashed border-border bg-metallic-card p-10">
              <p className="text-sm text-muted-foreground">
                Henüz yayınlanmış blog yazısı yok. Yakında!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {posts.map((p) => (
                <Link
                  key={p.id}
                  href={`/blog/${p.slug}`}
                  className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-accent/40 hover:-translate-y-1 transition-all duration-300"
                >
                  {p.cover_image && (
                    <div className="relative aspect-[16/10] bg-premium-image-bg">
                      <Image
                        src={p.cover_image}
                        alt={p.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-500"
                        sizes="(max-width:768px) 100vw, 33vw"
                      />
                    </div>
                  )}
                  <div className="p-5 space-y-3">
                    <h2 className="text-lg font-bold tracking-tight group-hover:text-accent transition-colors line-clamp-2">
                      {p.title}
                    </h2>
                    {p.excerpt && (
                      <p className="text-xs text-muted-foreground line-clamp-3">
                        {p.excerpt}
                      </p>
                    )}
                    <div className="flex items-center gap-3 pt-2 text-[10px] text-muted-foreground">
                      {p.author && (
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3 w-3" /> {p.author}
                        </span>
                      )}
                      {p.published_at && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(p.published_at).toLocaleDateString("tr-TR")}
                        </span>
                      )}
                    </div>
                    <div className="pt-2 inline-flex items-center gap-1 text-xs font-bold text-accent">
                      Devamını Oku <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
