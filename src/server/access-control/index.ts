/**
 * Public entry point for the Access Control module (IMP-011).
 *
 * Owns memberships, role assignments, authorization evaluation, audit, and
 * platform-admin bootstrap. Never imports Catalog/Orders/Payments/Delivery.
 */
import "server-only";

export {
  AccessControlConflictError,
  AccessControlInvalidTransitionError,
  AccessControlNotFoundError,
  AccessControlValidationError,
  AuthorizationError,
  BootstrapClosedError,
  BootstrapIneligibleError,
  DelegationCeilingError,
  LastPlatformAdminError,
  SelfElevationError,
} from "./errors";
export type { AccessControlErrorCode } from "./errors";

export type {
  AccessMembership,
  AccessRoleAssignment,
  AccessScope,
  AuthorizationDecision,
  AuthorizeInput,
  GetEffectivePermissionsInput,
  MembershipTransitionTarget,
  ProtectedResource,
} from "./types";

export {
  createWorkforcePrincipalFromTrustedIdentity,
  isWorkforcePrincipal,
  requireWorkforcePrincipal,
  WorkforcePrincipalError,
} from "./principal";
export type { WorkforcePrincipal, WorkforcePrincipalIdentity } from "./principal";

export {
  accessScopeToProtectedResource,
  assignmentCoversResource,
  membershipToAccessScope,
  resourceHomeScope,
  scopeIsAncestorOrEqual,
} from "./scope";
export type { AssignmentScopeRef } from "./scope";

export {
  authorize,
  getEffectivePermissions,
  requireAuthorization,
} from "./authorize";

export { insertAccessAuditEvent } from "./audit";
export type { InsertAccessAuditEventInput } from "./audit";

export {
  listAccessAuditEvents,
  listMemberships,
  listRoleAssignmentsForMembership,
} from "./queries";
export type { AccessAuditEvent } from "./queries";

export {
  createMembership,
  findMembershipById,
  transitionMembership,
} from "./membership";
export type { CreateMembershipInput, TransitionMembershipInput } from "./membership";

export {
  findRoleAssignmentById,
  grantRole,
  revokeRole,
} from "./assignments";
export type { GrantRoleInput, RevokeRoleInput } from "./assignments";

export { bootstrapPlatformSuperAdmin } from "./bootstrap";
export type {
  BootstrapPlatformSuperAdminInput,
  BootstrapPlatformSuperAdminResult,
} from "./bootstrap";
