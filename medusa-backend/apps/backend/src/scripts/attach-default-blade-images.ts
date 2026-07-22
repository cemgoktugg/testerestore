import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Attaches a model-appropriate placeholder image to every product that has no
 * image yet (ready-made blades in particular). The model is read from the
 * title — written at the start, e.g. "Bi-Metal M42 Hazır — …" — and the
 * blade_type / product_type metadata.
 *
 * Images must already exist under the backend `static/` folder (served at
 * <MEDUSA_BACKEND_URL>/static/...). Copy them there first:
 *   bimetal_blade.png, carbide_blade.png, woodworking_blade.png, bandsaw_machine.png
 *
 * Run with:
 *   cd medusa-backend/apps/backend
 *   npx medusa exec ./src/scripts/attach-default-blade-images.ts
 *
 * Idempotent: only touches products that currently have NO thumbnail and NO
 * images, so re-running won't overwrite real uploaded photos.
 */
function modelImageFile(
  title?: string | null,
  bladeType?: string | null,
  productType?: string | null
): string {
  const hay = `${title ?? ""} ${bladeType ?? ""}`.toLowerCase();
  if (productType === "machine" || /makine|machine|kraken/.test(hay)) {
    return "bandsaw_machine.png";
  }
  if (/karb[üu]r|carbide/.test(hay)) return "carbide_blade.png";
  if (/ah[şs]ap|wood|a[ğg]a[çc]/.test(hay)) return "woodworking_blade.png";
  return "bimetal_blade.png";
}

export default async function attachDefaultBladeImages({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve(Modules.PRODUCT);
  const backendUrl = (
    process.env.MEDUSA_BACKEND_URL || "http://localhost:9000"
  ).replace(/\/$/, "");

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "thumbnail", "images.id", "metadata"],
  });

  let updated = 0;
  for (const p of products) {
    const hasImage =
      !!p.thumbnail || (Array.isArray(p.images) && p.images.length > 0);
    if (hasImage) continue;

    const meta = (p.metadata || {}) as {
      blade_type?: string;
      product_type?: string;
    };
    const file = modelImageFile(p.title, meta.blade_type, meta.product_type);
    const url = `${backendUrl}/static/${file}`;

    await productModule.updateProducts(p.id, {
      thumbnail: url,
      images: [{ url }],
    });
    updated++;
    logger.info(`🖼️  "${p.title}" → ${file}`);
  }

  logger.info(
    `✅ ${updated} görselsiz ürüne otomatik model görseli eklendi.`
  );
}
