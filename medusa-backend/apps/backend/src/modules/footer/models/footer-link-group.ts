import { model } from "@medusajs/framework/utils";

/**
 * Footer column with a list of links — e.g. "Ürünler" / "Hızlı Menü".
 * `links` is a JSON array of `{ label, href }` objects.
 */
const FooterLinkGroup = model.define("footer_link_group", {
  id: model.id().primaryKey(),
  title: model.text(),
  /** Array<{ label: string; href: string }> */
  links: model.json().default([] as unknown as Record<string, unknown>),
  sort_order: model.number().default(0),
  is_active: model.boolean().default(true),
});

export default FooterLinkGroup;
