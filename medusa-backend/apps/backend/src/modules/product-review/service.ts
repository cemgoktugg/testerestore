import { MedusaService } from "@medusajs/framework/utils";
import ProductReview from "./models/product-review";

class ProductReviewService extends MedusaService({
  ProductReview,
}) {}

export default ProductReviewService;
