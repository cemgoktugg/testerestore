import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type ProductReviewService from "../../../../modules/product-review/service";
import { PRODUCT_REVIEW_MODULE } from "../../../../modules/product-review";

/** PATCH /admin/product-reviews/:id — approve / reject / edit */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id as string;
  const body = (req.body || {}) as {
    is_approved?: boolean;
    rating?: number;
    title?: string | null;
    body?: string;
    is_verified_purchase?: boolean;
  };
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
