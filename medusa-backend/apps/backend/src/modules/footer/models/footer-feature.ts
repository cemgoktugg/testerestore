import { model } from "@medusajs/framework/utils";

/**
 * Footer feature card — shown in the top "Hızlı Kargo / Üstün Çelik" bar.
 */
const FooterFeature = model.define("footer_feature", {
  id: model.id().primaryKey(),
  /** lucide-react icon name: truck | shield | refresh | award | etc. */
  icon: model.text().default("truck"),
  title: model.text(),
  description: model.text(),
  sort_order: model.number().default(0),
  is_active: model.boolean().default(true),
});

export default FooterFeature;
