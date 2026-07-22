import { MedusaService } from "@medusajs/framework/utils";
import HeroSlide from "./models/hero-slide";

/**
 * HeroSliderService — extends Medusa's auto-generated CRUD service for the
 * HeroSlide entity. Exposes listHeroSlides / createHeroSlides / updateHeroSlides
 * / deleteHeroSlides / retrieveHeroSlide via the standard MedusaService API.
 */
class HeroSliderService extends MedusaService({
  HeroSlide,
}) {}

export default HeroSliderService;
