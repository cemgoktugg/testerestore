import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
  MEDUSA_READY,
} from "../config";

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  body_md: string;
  cover_image: string | null;
  author: string | null;
  tags: string | null;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
}

const HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
};

export async function listBlogPosts(limit = 20): Promise<BlogPost[]> {
  if (!MEDUSA_READY) return [];
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/blog-posts?limit=${limit}`,
      { headers: HEADERS, next: { revalidate: 300 } }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { blog_posts: BlogPost[] };
    return data.blog_posts ?? [];
  } catch {
    return [];
  }
}

export async function getBlogPost(slug: string): Promise<BlogPost | null> {
  if (!MEDUSA_READY) return null;
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/blog-posts/${encodeURIComponent(slug)}`,
      { headers: HEADERS, next: { revalidate: 300 } }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { blog_post: BlogPost };
    return data.blog_post;
  } catch {
    return null;
  }
}
