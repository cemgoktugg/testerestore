import { cache } from "react";
import { getProductBySlug } from "../services/products";

/**
 * Request-scoped memoized product fetch (React `cache`).
 *
 * page.tsx + layout.tsx (generateMetadata + body) all resolve the same
 * product per request; wrapping the fetch in `cache()` collapses these into
 * a single Medusa call within one server render.
 *
 * Server-only — do NOT import from client components.
 */
export const getProductBySlugCached = cache(getProductBySlug);
