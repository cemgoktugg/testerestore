import { MedusaService } from "@medusajs/framework/utils";
import Dealer from "./models/dealer";
import DealerBladePrice from "./models/dealer-blade-price";

class DealerPricingService extends MedusaService({
  Dealer,
  DealerBladePrice,
}) {}

export default DealerPricingService;
