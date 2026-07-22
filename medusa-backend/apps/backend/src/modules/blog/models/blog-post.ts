import { model } from "@medusajs/framework/utils";

/**
 * Blog yazısı modeli. İçerik markdown olarak tutulur — storefront
 * render aşamasında basit MD parser kullanır.
 *
 * `slug` URL'de kullanılır: /blog/[slug]. Manuel girilir, unique olmalı.
 * `is_published=false` ise storefront listesinde görünmez.
 */
const BlogPost = model.define("blog_post", {
  id: model.id().primaryKey(),
  slug: model.text(),
  title: model.text(),
  excerpt: model.text().nullable(),
  body_md: model.text(),
  cover_image: model.text().nullable(),
  author: model.text().nullable(),
  /** Virgül ayrılmış etiketler, basit tutuldu. */
  tags: model.text().nullable(),
  is_published: model.boolean().default(false),
  published_at: model.dateTime().nullable(),
  /** SEO başlık ve meta açıklama (boşsa title/excerpt fallback). */
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
});

export default BlogPost;
