import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type BlogService from "../../../../modules/blog/service";
import { BLOG_MODULE } from "../../../../modules/blog";

/** GET /store/blog-posts/:slug — slug ile tek yazıyı getir. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const slug = req.params.slug as string;
  const svc = req.scope.resolve<BlogService>(BLOG_MODULE);
  const list = await svc.listBlogPosts({ slug, is_published: true });
  if (list.length === 0) {
    res.status(404).json({ message: "Not found" });
    return;
  }
  res.json({ blog_post: list[0] });
}
