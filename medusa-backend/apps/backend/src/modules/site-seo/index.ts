import { Module } from "@medusajs/framework/utils";
import SiteSeoService from "./service";

export const SITE_SEO_MODULE = "siteSeo";

export default Module(SITE_SEO_MODULE, {
  service: SiteSeoService,
});
