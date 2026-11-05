import { Module } from "@medusajs/framework/utils";
import CustomerRequestService from "./service";
export const CUSTOMER_REQUEST_MODULE = "customerRequest";
export default Module(CUSTOMER_REQUEST_MODULE, { service: CustomerRequestService });
