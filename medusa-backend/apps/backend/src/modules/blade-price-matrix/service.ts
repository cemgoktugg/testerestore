import { MedusaService } from "@medusajs/framework/utils";
import BladePrice from "./models/blade-price";

class BladePriceMatrixService extends MedusaService({
  BladePrice,
}) {}

export default BladePriceMatrixService;
