import { Module } from "@medusajs/framework/utils";
import HeroSliderService from "./service";

export const HERO_SLIDER_MODULE = "heroSlider";

export default Module(HERO_SLIDER_MODULE, {
  service: HeroSliderService,
});
