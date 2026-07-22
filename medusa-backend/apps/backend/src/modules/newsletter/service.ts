import { MedusaService } from "@medusajs/framework/utils";
import NewsletterSubscription from "./models/newsletter-subscription";

class NewsletterService extends MedusaService({
  NewsletterSubscription,
}) {}

export default NewsletterService;
