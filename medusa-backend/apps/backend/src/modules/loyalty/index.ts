import { Module } from "@medusajs/framework/utils";
import LoyaltyService from "./service";

export const LOYALTY_MODULE = "loyalty";

export default Module(LOYALTY_MODULE, {
  service: LoyaltyService,
});
