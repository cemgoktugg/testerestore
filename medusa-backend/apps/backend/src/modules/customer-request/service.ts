import { MedusaService } from "@medusajs/framework/utils";
import CustomerRequest from "./models/customer-request";
class CustomerRequestService extends MedusaService({ CustomerRequest }) {}
export default CustomerRequestService;
