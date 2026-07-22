import { Module } from "@medusajs/framework/utils";
import BlogService from "./service";

export const BLOG_MODULE = "blog";

export default Module(BLOG_MODULE, {
  service: BlogService,
});
