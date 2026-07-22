import { model } from "@medusajs/framework/utils";

/**
 * Ürün yorumu — müşterilerin verdiği yıldız puan + yazılı yorum.
 *
 * `is_approved=false` ise listelemelerde görünmez; admin onaylaması
 * gerekir. `customer_id` opsiyonel (misafir yorumlara da izin verilebilir
 * ama varsayılan akış sipariş veren müşteri içindir).
 */
const ProductReview = model.define("product_review", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  customer_id: model.text().nullable(),
  /** İsim göstermek için — guest yorum / takma ad. */
  author_name: model.text(),
  /** Doğrulanmış müşteri rozetleri için. */
  is_verified_purchase: model.boolean().default(false),
  /** 1-5 arası. */
  rating: model.number(),
  title: model.text().nullable(),
  body: model.text(),
  is_approved: model.boolean().default(false),
});

export default ProductReview;
