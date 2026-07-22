import { model } from "@medusajs/framework/utils";

/**
 * Blade price matrix entry — drives dynamic per-meter pricing for band-saw
 * blades. One row = one valid combination of (blade_type, width_mm,
 * thickness_mm, tooth_pitch?). Frontend asks the store API for the option
 * tree and calls /calculate to price a customer's length.
 *
 * tooth_pitch is optional: blades like "Spezial Alman Çeliği" (wood) skip
 * TPI, while bi-metal/carbide blades require it.
 */
const BladePrice = model.define("blade_price", {
  id: model.id().primaryKey(),

  /** Logical blade family — matches the storefront filter pills.
   *  e.g. "bi-metal" | "carbide" | "woodcut" | "meat-bone" */
  blade_type: model.text(),

  // Stored as bigNumber so decimal widths (e.g. 0.9, 1.3) survive a round
  // trip. model.number() maps to an integer column and silently rounds.
  width_mm: model.bigNumber(),
  thickness_mm: model.bigNumber(),
  /** "3/4", "4/6", "6/10" — null for non-toothed blades. */
  tooth_pitch: model.text().nullable(),

  price_per_meter: model.bigNumber(),
  /** Flat per-blade welding/assembly fee. */
  welding_fee: model.bigNumber().default(0),

  currency_code: model.text().default("try"),

  is_active: model.boolean().default(true),
});

export default BladePrice;
