import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { z } from "zod";
import type ProductReviewService from "../../../../../modules/product-review/service";
import { PRODUCT_REVIEW_MODULE } from "../../../../../modules/product-review";
import { hasVerifiedPurchase } from "../../../../../lib/verified-purchase";

const PostSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().min(1).max(120).optional(),
  body: z.string().min(3).max(2000),
  author_name: z.string().min(2).max(120),
});

/** Herkese açık yanıtta gösterilecek alanlar (customer_id vb. gizli kalır). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const publicReview = (r: any) => ({
  id: r.id,
  rating: r.rating,
  title: r.title,
  body: r.body,
  author_name: r.author_name,
  is_verified_purchase: r.is_verified_purchase,
  created_at: r.created_at,
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
    reviews: list.map(publicReview),
    stats: { count, average: avg, distribution },
  });
}

/** POST /store/products/:id/reviews — yeni yorum (default: onay bekliyor). */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const productId = req.params.id as string;
  const parsed = PostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid review",
      errors: parsed.error.issues,
    });
    return;
  }
  // Var olmayan/yayında olmayan ürüne yorum yazılmasın.
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);
  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "status"],
    filters: { id: productId },
  });
  if (products?.[0]?.status !== "published") {
    res.status(404).json({ message: "Ürün bulunamadı." });
    return;
  }

  const svc = req.scope.resolve<ProductReviewService>(PRODUCT_REVIEW_MODULE);
  const customerId = req.auth_context?.actor_type === "customer" ? req.auth_context.actor_id : null;
  let verified = false;
  if (customerId) {
    for (let skip = 0; ; skip += 100) {
      const { data: orders } = await query.graph({
        entity: "order", filters: { customer_id: customerId },
        fields: ["id", "status", "items.id", "items.product_id", "fulfillments.canceled_at", "fulfillments.shipped_at", "fulfillments.delivered_at", "fulfillments.items.line_item_id"],
        pagination: { take: 100, skip },
      });
      verified = hasVerifiedPurchase(orders as Parameters<typeof hasVerifiedPurchase>[0], productId);
      if (verified || orders.length < 100) break;
    }
  }
  const [created] = await svc.createProductReviews([
    {
      product_id: productId,
      author_name: parsed.data.author_name.trim(),
      rating: parsed.data.rating,
      title: parsed.data.title?.trim() ?? null,
      body: parsed.data.body.trim(),
      // Yalnızca oturumdan — istemci başka bir müşterinin kimliğini yazamasın.
      customer_id:
        customerId,
      is_verified_purchase: verified,
      is_approved: false, // admin approve etmeli
    },
  ]);
  res.status(201).json({ review: publicReview(created) });
}
