/**
 * Public barrel for customer-commerce (IMP-024).
 */
import "server-only";

export { CustomerCommerceService } from "./service";
export type { CustomerCommerceServiceOptions } from "./service";
export {
  loadCustomerCommerceServiceConfig,
  CUSTOMER_COMMERCE_CART_POLICY,
  CUSTOMER_COMMERCE_CHECKOUT_POLICY,
} from "./config";
export type { CustomerCommerceServiceConfig } from "./config";
export { CustomerCommerceConfigurationError } from "./errors";
