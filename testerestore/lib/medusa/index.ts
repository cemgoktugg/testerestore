/**
 * Public barrel for Medusa integration.
 * Components import from here, never from individual files inside services/.
 */

export { medusa } from "./client";
export {
  MEDUSA_BACKEND_URL,
  MEDUSA_PUBLISHABLE_KEY,
  MEDUSA_READY,
  DEFAULT_REGION,
  DEFAULT_CURRENCY,
} from "./config";

export * from "./types";
export * from "./format";
export * from "./pricing";

// Services
export * as productService from "./services/products";
export * as categoryService from "./services/categories";
export * as cartService from "./services/cart";
export * as regionService from "./services/region";

// Hooks
export * from "./hooks/useProducts";
export * from "./hooks/useCategories";
export { useAsync } from "./hooks/useAsync";
