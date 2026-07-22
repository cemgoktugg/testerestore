import { model } from "@medusajs/framework/utils";

/**
 * Singleton settings row for the footer. The seed creates exactly one row;
 * the admin tool updates this single record. `legal_links` is a JSON
 * array of `{ label, href }` for the bottom-right links.
 */
const FooterSetting = model.define("footer_setting", {
  id: model.id().primaryKey(),
  company_description: model.text(),
  contact_phone: model.text().nullable(),
  contact_email: model.text().nullable(),
  contact_address: model.text().nullable(),
  copyright_text: model.text().nullable(),
  /** Array<{ label: string; href?: string }> */
  legal_links: model.json().default([]),
});

export default FooterSetting;
