import { Module } from "@medusajs/framework/utils";
import FooterService from "./service";

export const FOOTER_MODULE = "footer";

export default Module(FOOTER_MODULE, {
  service: FooterService,
});
