import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type ProductReviewService from "../../../../modules/product-review/service";
import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-review";
import { z } from "zod";
const UpdateSchema = z.object({
  is_approved: z.boolean().optional(),
  rating: z.number().int().min(1).max(5).optional(),
  title: z.string().trim().min(1).max(120).nullable().optional(),
  body: z.string().trim().min(3).max(2000).optional(),
}).strict();

/** PATCH /admin/product-reviews/:id — approve / reject / edit */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id as string;
  const parsed = UpdateSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ message: "Geçersiz yorum güncellemesi." }); return; }
  const body = parsed.data;
  const svc = req.scope.resolve<ProductReviewService>(PRODUCT_REVIEW_MODULE);
  const [updated] = await svc.updateProductReviews([{ id, ...body }]);
  res.json({ review: updated });
}

/** DELETE /admin/product-reviews/:id */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id as string;
  const svc = req.scope.resolve<ProductReviewService>(PRODUCT_REVIEW_MODULE);
  await svc.deleteProductReviews([id]);
  res.json({ id, deleted: true });
}
