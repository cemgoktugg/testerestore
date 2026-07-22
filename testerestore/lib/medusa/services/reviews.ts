import {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
  MEDUSA_READY,
} from "../config";

export interface ProductReview {
  id: string;
  product_id: string;
  customer_id: string | null;
  author_name: string;
  is_verified_purchase: boolean;
  rating: number;
  title: string | null;
  body: string;
  is_approved: boolean;
  created_at: string;
}

export interface ReviewStats {
  count: number;
  average: number;
  distribution: Array<{ stars: number; count: number }>;
}

const HEADERS: HeadersInit = {
  "Content-Type": "application/json",
  "x-publishable-api-key": MEDUSA_PUBLISHABLE_KEY,
};

export async function listProductReviews(
  productId: string
): Promise<{ reviews: ProductReview[]; stats: ReviewStats }> {
  const empty = {
    reviews: [],
    stats: { count: 0, average: 0, distribution: [] },
  };
  if (!MEDUSA_READY) return empty;
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/products/${encodeURIComponent(
        productId
      )}/reviews`,
      { headers: HEADERS, next: { revalidate: 300 } }
    );
    if (!res.ok) return empty;
    return (await res.json()) as {
      reviews: ProductReview[];
      stats: ReviewStats;
    };
  } catch {
    return empty;
  }
}

export interface SubmitReviewInput {
  productId: string;
  rating: number;
  title?: string;
  body: string;
  authorName: string;
  customerId?: string | null;
}

export async function submitProductReview(
  input: SubmitReviewInput
): Promise<{ ok: boolean; error?: string }> {
  if (!MEDUSA_READY) return { ok: false, error: "Medusa not ready" };
  try {
    const res = await fetch(
      `${MEDUSA_BACKEND_URL}/store/products/${encodeURIComponent(
        input.productId
      )}/reviews`,
      {
        method: "POST",
        headers: HEADERS,
        body: JSON.stringify({
          rating: input.rating,
          title: input.title,
          body: input.body,
          author_name: input.authorName,
          customer_id: input.customerId ?? null,
        }),
      }
    );
    if (!res.ok) {
      return { ok: false, error: `${res.status}: ${await res.text()}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
