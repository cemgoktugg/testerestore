import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type HeroSliderService from "../../../modules/hero-slider/service";
import { HERO_SLIDER_MODULE } from "../../../modules/hero-slider";
import { PostHeroSlideSchema } from "./validators";

/** GET /admin/hero-slides — list every slide regardless of `is_active`. */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service = req.scope.resolve<HeroSliderService>(HERO_SLIDER_MODULE);
  const slides = await service.listHeroSlides(
    {},
    { order: { sort_order: "ASC" } }
  );
  res.json({ hero_slides: slides, count: slides.length });
}

/** POST /admin/hero-slides — create a new slide. */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const parsed = PostHeroSlideSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.issues,
    });
    return;
  }
  const service = req.scope.resolve<HeroSliderService>(HERO_SLIDER_MODULE);
  const [slide] = await service.createHeroSlides([parsed.data]);
  res.status(201).json({ hero_slide: slide });
}
