import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import type BlogService from "../../../modules/blog/service";
import { BLOG_MODULE } from "../../../modules/blog";

const PostSchema = z.object({
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  title: z.string().min(2).max(200),
  excerpt: z.string().max(500).nullable().optional(),
  body_md: z.string().min(10),
  cover_image: z.string().nullable().optional(),
  author: z.string().max(120).nullable().optional(),
  tags: z.string().nullable().optional(),
  is_published: z.boolean().optional().default(false),
  seo_title: z.string().nullable().optional(),
  seo_description: z.string().nullable().optional(),
});

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<BlogService>(BLOG_MODULE);
  const posts = await svc.listBlogPosts(
    {},
    { order: { created_at: "DESC" } }
  );
  res.json({ blog_posts: posts });
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = PostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid", errors: parsed.error.issues });
    return;
  }
  const svc = req.scope.resolve<BlogService>(BLOG_MODULE);
  const data = {
    ...parsed.data,
    published_at:
      parsed.data.is_published === true ? new Date() : null,
  };
  const [created] = await svc.createBlogPosts([data]);
  res.status(201).json({ blog_post: created });
}
