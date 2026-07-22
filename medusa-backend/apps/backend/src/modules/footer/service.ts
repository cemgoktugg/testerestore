import { MedusaService } from "@medusajs/framework/utils";
import FooterFeature from "./models/footer-feature";
import FooterLinkGroup from "./models/footer-link-group";
import FooterSetting from "./models/footer-setting";

class FooterService extends MedusaService({
  FooterFeature,
  FooterLinkGroup,
  FooterSetting,
}) {}

export default FooterService;
