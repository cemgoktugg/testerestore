import { MedusaService } from "@medusajs/framework/utils";
import Dealer from "./models/dealer";
import DealerBladePrice from "./models/dealer-blade-price";
import DealerQuote from "./models/dealer-quote";
import DealerQuoteItem from "./models/dealer-quote-item";

class DealerPricingService extends MedusaService({
  Dealer,
  DealerBladePrice,
  DealerQuote,
  DealerQuoteItem,
}) {}

export default DealerPricingService;
