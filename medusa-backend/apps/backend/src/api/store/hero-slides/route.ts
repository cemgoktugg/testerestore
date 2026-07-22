import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type HeroSliderService from "../../../modules/hero-slider/service";
import { HERO_SLIDER_MODULE } from "../../../modules/hero-slider";

/**
 * Public GET /store/hero-slides — returns active slides only.
 * Consumed by the storefront's <HeroSlider> component on the home page.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<HeroSliderService>(HERO_SLIDER_MODULE);
  const slides = await service.listHeroSlides(
    { is_active: true },
    { order: { sort_order: "ASC" } }
  );
  res.json({ hero_slides: slides, count: slides.length });
}
