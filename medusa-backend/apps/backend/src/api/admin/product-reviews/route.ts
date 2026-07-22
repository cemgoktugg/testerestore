import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type ProductReviewService from "../../../modules/product-review/service";
import { PRODUCT_REVIEW_MODULE } from "../../../modules/product-review";

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc = req.scope.resolve<ProductReviewService>(PRODUCT_REVIEW_MODULE);
  const status = req.query.status as string | undefined; // "pending" | "approved" | "all"
  const filter: Record<string, unknown> = {};
  if (status === "pending") filter.is_approved = false;
  else if (status === "approved") filter.is_approved = true;
  const list = await svc.listProductReviews(filter, {
    order: { created_at: "DESC" },
  });
  res.json({ reviews: list, count: list.length });
}
