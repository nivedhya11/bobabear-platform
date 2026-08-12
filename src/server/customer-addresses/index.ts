/**
 * Server-only Customer Addresses boundary (IMP-018).
 */
import "server-only";

export { CustomerAddressError } from "../../shared/customer-addresses";
export type {
  CustomerAddress,
  CustomerAddressCreateInput,
  CustomerAddressUpdateInput,
  CustomerAddressCoordinates,
} from "../../shared/customer-addresses";

export {
  createCustomerActorFromTrustedAuthIdentity,
  isCustomerActor,
  requireCustomerActor,
  type CustomerActor,
  type CustomerActorIdentity,
} from "./actor";

export { customerActorFromTrustedCustomerAuthSession } from "./auth-adapter";
export type { TrustedCustomerAuthIdentity } from "./auth-adapter";

export { insertCustomerAddressAuditEvent } from "./audit";
export type { InsertCustomerAddressAuditEventInput } from "./audit";

export {
  listOwnAddresses,
  getOwnAddress,
  createOwnAddress,
  updateOwnAddress,
  deleteOwnAddress,
  setDefaultOwnAddress,
  clearDefaultOwnAddress,
} from "./addresses";

export {
  findAddressByIdAndCustomerAuthUserId,
  listAddressesByCustomerAuthUserId,
  findDefaultAddressByCustomerAuthUserId,
  lockCustomerAuthUserForAddressMutation,
} from "./repository";
