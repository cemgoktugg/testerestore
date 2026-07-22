import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import type ProductReviewService from "../../../../../modules/product-review/service";
import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-review";

const PostSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().min(1).max(120).optional(),
  body: z.string().min(3).max(2000),
  author_name: z.string().min(2).max(120),
  customer_id: z.string().nullable().optional(),
});

/** GET /store/products/:id/reviews — onaylı yorumlar + özet istatistik. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id as string;
  const svc = req.scope.resolve<ProductReviewService>(PRODUCT_REVIEW_MODULE);
  const list = await svc.listProductReviews(
    { product_id: productId, is_approved: true },
    { order: { created_at: "DESC" } }
  );
  const count = list.length;
  const avg =
    count > 0
      ? Math.round(
          (list.reduce((s, r) => s + Number(r.rating), 0) / count) * 10
        ) / 10
      : 0;
  // 1..5 dağılım
  const distribution = [1, 2, 3, 4, 5].map((star) => ({
    stars: star,
    count: list.filter((r) => Number(r.rating) === star).length,
  }));
  res.json({
    reviews: list,
    stats: { count, average: avg, distribution },
  });
}

/** POST /store/products/:id/reviews — yeni yorum (default: onay bekliyor). */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const productId = req.params.id as string;
  const parsed = PostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid review",
      errors: parsed.error.issues,
    });
    return;
  }
  const svc = req.scope.resolve<ProductReviewService>(PRODUCT_REVIEW_MODULE);
  const [created] = await svc.createProductReviews([
    {
      product_id: productId,
      author_name: parsed.data.author_name.trim(),
      rating: parsed.data.rating,
      title: parsed.data.title?.trim() ?? null,
      body: parsed.data.body.trim(),
      customer_id: parsed.data.customer_id ?? null,
      is_verified_purchase: false,
      is_approved: false, // admin approve etmeli
    },
  ]);
  res.status(201).json({ review: created });
}
