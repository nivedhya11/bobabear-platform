/**
 * Server-only Customer Profiles boundary (IMP-017).
 */
import "server-only";

export { CustomerProfileError } from "../../shared/customer-profiles";
export type {
  CustomerProfile,
  CustomerProfileCreateInput,
  CustomerProfileUpdateInput,
} from "../../shared/customer-profiles";

export {
  createCustomerActorFromTrustedAuthIdentity,
  isCustomerActor,
  requireCustomerActor,
  type CustomerActor,
  type CustomerActorIdentity,
} from "./actor";

export { customerActorFromTrustedCustomerAuthSession } from "./auth-adapter";
export type { TrustedCustomerAuthIdentity } from "./auth-adapter";

export { insertCustomerProfileAuditEvent } from "./audit";
export type { InsertCustomerProfileAuditEventInput } from "./audit";

export {
  getOwnCustomerProfile,
  createOwnCustomerProfile,
  updateOwnCustomerProfile,
  deleteOwnCustomerProfile,
} from "./profiles";

export {
  findProfileByCustomerAuthUserId,
} from "./repository";
