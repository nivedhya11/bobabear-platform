/**
 * Shared, browser-safe access-control constants (IMP-011).
 * No database, secrets, or server-only imports.
 */
export {
  ACCESS_AUDIT_ACTIONS,
  ACCESS_SCOPE_TYPES,
  INHERITANCE_MODES,
  MEMBERSHIP_STATUSES,
  NON_TERMINAL_MEMBERSHIP_STATUSES,
  PERMISSION_KEYS,
  PERMISSION_TARGET_KIND,
  RESOURCE_LIFECYCLE_STATUSES,
  ROLE_ALLOWED_SCOPES,
  ROLE_DISPLAY_NAMES,
  ROLE_KEYS,
  ROLE_PERMISSION_MAPPINGS,
  SAFE_AUTHORIZATION_DECISION_CODES,
  isPermissionKey,
  isRoleKey,
  permissionsForRole,
} from "./catalog";
export type {
  AccessAuditAction,
  AccessScopeType,
  InheritanceMode,
  MembershipStatus,
  PermissionKey,
  ResourceLifecycleStatus,
  RoleKey,
  RolePermissionMapping,
  SafeAuthorizationDecisionCode,
} from "./catalog";
