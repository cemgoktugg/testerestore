import { MedusaService } from "@medusajs/framework/utils";
import BlogPost from "./models/blog-post";

class BlogService extends MedusaService({
  BlogPost,
}) {}

export default BlogService;
