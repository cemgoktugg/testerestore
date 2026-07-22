import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";

/**
 * Hazır (is_ready_made / "… Hazır …") ürün oluşturulduğunda/güncellendiğinde,
 * karşılık gelen ANA ürünün gerçek resimlerini otomatik kopyalar.
 *
 * Eşleştirme: hazır ürün başlığının "Hazır" öncesi kısmı (örn. "Bi-Metal M42")
 * ile başlayan, ready-made OLMAYAN ürün = ana ürün. (blade_type güvenilir
 * değil: hazır="bi-metal", ana="M42".)
 *
 * Sadece resmi olmayan VEYA yalnızca generic placeholder taşıyan hazır ürünlere
 * dokunur → elle yüklenmiş gerçek fotoğrafları ezmez, ve kendi yazdığı gerçek
 * resimler sonraki update event'inde koşulu düşürdüğü için döngü oluşmaz.
 */
const PLACEHOLDER_FILES = [
  "bimetal_blade.png",
  "carbide_blade.png",
  "woodworking_blade.png",
  "bandsaw_machine.png",
];
const isPlaceholder = (url?: string | null): boolean =>
  !!url && PLACEHOLDER_FILES.some((f) => url.includes(f));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isReady = (p: any): boolean =>
  (p?.metadata || {}).is_ready_made === true || /hazır/i.test(p?.title || "");

export default async function readyMadeImagesHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const query = container.resolve(ContainerRegistrationKeys.QUERY);
  const productModule = container.resolve(Modules.PRODUCT);

  try {
    const { data: rows } = await query.graph({
      entity: "product",
      fields: ["id", "title", "thumbnail", "images.url", "metadata"],
      filters: { id: data.id },
    });
    const prod = rows?.[0];
    if (!prod || !isReady(prod)) return;

    const imgs = ((prod as { images?: Array<{ url?: string }> }).images ||
      []) as Array<{ url?: string }>;
    const needsImages =
      imgs.length === 0 || imgs.every((im) => isPlaceholder(im.url));
    if (!needsImages) return; // gerçek resim var → dokunma (döngü de olmaz)

    const model = String(prod.title).split(/hazır/i)[0].trim().toLowerCase();
    if (model.length < 4) return;

    // Ana ürün adayları
    const { data: all } = await query.graph({
      entity: "product",
      fields: ["id", "title", "thumbnail", "images.url", "metadata"],
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const base = all.find((b: any) => {
      if (b.id === prod.id || isReady(b)) return false;
      if (!String(b.title).toLowerCase().startsWith(model)) return false;
      const bimgs = (b.images || []) as Array<{ url?: string }>;
      return (
        bimgs.some((im) => im.url && !isPlaceholder(im.url)) ||
        (b.thumbnail && !isPlaceholder(b.thumbnail))
      );
    });
    if (!base) {
      logger.warn(
        `[ready-made-images] "${prod.title}" için ANA ürün bulunamadı (model: "${model}")`
      );
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseImages = ((base as any).images || [])
      .map((im: { url?: string }) => im.url)
      .filter((u: string | undefined): u is string => !!u && !isPlaceholder(u))
      .map((url: string) => ({ url }));
    if (baseImages.length === 0) return;

    await productModule.updateProducts(prod.id, {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      thumbnail: (base as any).thumbnail || baseImages[0].url,
      images: baseImages,
    });
    logger.info(
      `[ready-made-images] "${prod.title}" ← "${(base as { title: string }).title}" (${baseImages.length} resim kopyalandı)`
    );
  } catch (e) {
    logger.error(
      `[ready-made-images] failed: ${e instanceof Error ? e.message : String(e)}`
    );
  }
}

export const config: SubscriberConfig = {
  event: ["product.created", "product.updated"],
};
