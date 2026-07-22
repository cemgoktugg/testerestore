import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type BlogService from "../../../modules/blog/service";
import { BLOG_MODULE } from "../../../modules/blog";

/** GET /store/blog-posts — sadece yayınlanmış yazılar. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<BlogService>(BLOG_MODULE);
  const limit = Math.min(Number(req.query.limit) || 20, 50);
  const posts = await svc.listBlogPosts(
    { is_published: true },
    { order: { published_at: "DESC" }, take: limit }
  );
  res.json({ blog_posts: posts, count: posts.length });
}
