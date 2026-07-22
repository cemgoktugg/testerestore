import { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Mevcut hazır (is_ready_made) ürünlere, karşılık gelen ANA ürünün gerçek
 * resimlerini kopyalar. Eşleştirme: hazır ürün başlığının "Hazır" öncesi
 * kısmı ("Bi-Metal M42") ile başlayan, ready-made olmayan ürün = ana ürün.
 *
 * Sadece resmi olmayan VEYA yalnızca /static/ placeholder taşıyan hazır
 * ürünlere dokunur (elle yüklenmiş gerçek fotoğrafları ezmez).
 */
// Generic model placeholder'ları (attach-default-blade-images.ts bunları koyar).
// Gerçek yüklenen fotoğraflar zaman damgalı isimlidir (1780256519147-m2.png).
const PLACEHOLDER_FILES = [
  "bimetal_blade.png",
  "carbide_blade.png",
  "woodworking_blade.png",
  "bandsaw_machine.png",
];
function isPlaceholder(url?: string | null): boolean {
  return !!url && PLACEHOLDER_FILES.some((f) => url.includes(f));
}

export default async function backfillReadyMadeImages({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve(Modules.PRODUCT);

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "title", "thumbnail", "images.url", "metadata"],
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isReady = (p: any) =>
    (p.metadata || {}).is_ready_made === true || /hazır/i.test(p.title || "");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bases = products.filter((p: any) => !isReady(p));

  let updated = 0;
  for (const p of products) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rp = p as any;
    if (!isReady(rp)) continue;

    const imgs = (rp.images || []) as Array<{ url?: string }>;
    const onlyPlaceholderOrEmpty =
      imgs.length === 0 || imgs.every((im) => isPlaceholder(im.url));
    if (!onlyPlaceholderOrEmpty) {
      logger.info(`atlandı (gerçek resim var): ${rp.title}`);
      continue;
    }

    const model = String(rp.title).split(/hazır/i)[0].trim().toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const base = bases.find((b: any) => {
      const bimgs = (b.images || []) as Array<{ url?: string }>;
      const hasReal =
        bimgs.some((im) => im.url && !isPlaceholder(im.url)) ||
        (b.thumbnail && !isPlaceholder(b.thumbnail));
      return (
        model.length > 3 &&
        String(b.title).toLowerCase().startsWith(model) &&
        hasReal
      );
    });

    if (!base) {
      logger.warn(`ANA ürün bulunamadı → "${rp.title}" (model: "${model}")`);
      continue;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseImages = ((base as any).images || [])
      .map((im: { url?: string }) => im.url)
      .filter((u: string | undefined): u is string => !!u && !isPlaceholder(u))
      .map((url: string) => ({ url }));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseThumb = (base as any).thumbnail || baseImages[0]?.url;

    if (baseImages.length === 0) {
      logger.warn(`ANA üründe gerçek resim yok → ${(base as any).title}`);
      continue;
    }

    await productModule.updateProducts(rp.id, {
      thumbnail: baseThumb,
      images: baseImages,
    });
    updated++;
    logger.info(
      `✅ "${rp.title}" ← "${(base as any).title}" (${baseImages.length} resim). ilk: ${baseImages[0].url}`
    );
  }

  logger.info(`Bitti. Güncellenen hazır ürün: ${updated}`);
}
