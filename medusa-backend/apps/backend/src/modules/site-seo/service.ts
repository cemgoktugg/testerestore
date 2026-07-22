import { MedusaService } from "@medusajs/framework/utils";
import SiteSeo from "./models/site-seo";

class SiteSeoService extends MedusaService({
  SiteSeo,
}) {}

export default SiteSeoService;
