import { Module } from "@medusajs/framework/utils";
import BladePriceMatrixService from "./service";

export const BLADE_PRICE_MATRIX_MODULE = "bladePriceMatrix";

export default Module(BLADE_PRICE_MATRIX_MODULE, {
  service: BladePriceMatrixService,
});
