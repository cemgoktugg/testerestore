import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type BlogService from "../../../../modules/blog/service";
import { BLOG_MODULE } from "../../../../modules/blog";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id as string;
  const svc = req.scope.resolve<BlogService>(BLOG_MODULE);
  try {
    const post = await svc.retrieveBlogPost(id);
    res.json({ blog_post: post });
  } catch {
    res.status(404).json({ message: "Post not found" });
  }
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id as string;
  const body = (req.body || {}) as Record<string, unknown>;
  const svc = req.scope.resolve<BlogService>(BLOG_MODULE);
  // Publish toggle → published_at otomatik dolduralım
  if (body.is_published === true) {
    body.published_at = body.published_at || new Date();
  }
  const [updated] = await svc.updateBlogPosts([{ id, ...body }]);
  res.json({ blog_post: updated });
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id as string;
  const svc = req.scope.resolve<BlogService>(BLOG_MODULE);
  await svc.deleteBlogPosts([id]);
  res.json({ id, deleted: true });
}
