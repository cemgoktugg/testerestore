import { Module } from "@medusajs/framework/utils";
import DealerPricingService from "./service";

export const DEALER_PRICING_MODULE = "dealerPricing";

export default Module(DEALER_PRICING_MODULE, {
  service: DealerPricingService,
});
