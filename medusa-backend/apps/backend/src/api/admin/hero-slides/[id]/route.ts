import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type HeroSliderService from "../../../../modules/hero-slider/service";
import { HERO_SLIDER_MODULE } from "../../../../modules/hero-slider";
import { PatchHeroSlideSchema } from "../validators";

/** GET /admin/hero-slides/:id */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id as string;
  const service = req.scope.resolve<HeroSliderService>(HERO_SLIDER_MODULE);
  try {
    const slide = await service.retrieveHeroSlide(id);
    res.json({ hero_slide: slide });
  } catch {
    res.status(404).json({ message: "Hero slide not found" });
  }
}

/** PATCH /admin/hero-slides/:id */
export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id as string;
  const parsed = PatchHeroSlideSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid request body",
      errors: parsed.error.issues,
    });
    return;
  }
  const service = req.scope.resolve<HeroSliderService>(HERO_SLIDER_MODULE);
  const [slide] = await service.updateHeroSlides([{ id, ...parsed.data }]);
  res.json({ hero_slide: slide });
}

/** DELETE /admin/hero-slides/:id */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const id = req.params.id as string;
  const service = req.scope.resolve<HeroSliderService>(HERO_SLIDER_MODULE);
  await service.deleteHeroSlides([id]);
  res.json({ id, deleted: true });
}
