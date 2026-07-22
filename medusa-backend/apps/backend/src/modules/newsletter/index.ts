import { Module } from "@medusajs/framework/utils";
import NewsletterService from "./service";

export const NEWSLETTER_MODULE = "newsletter";

export default Module(NEWSLETTER_MODULE, {
  service: NewsletterService,
});
