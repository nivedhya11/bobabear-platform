/**
 * Access-control shared types (IMP-011).
 */
import type {
  AccessScopeType,
  MembershipStatus,
  PermissionKey,
  RoleKey,
  SafeAuthorizationDecisionCode,
} from "../../shared/access-control";

/**
 * Authoritative protected-resource descriptor for authorization.
 * Create permissions pass the parent scope as the resource.
 */
export type ProtectedResource =
  | { readonly type: "platform" }
  | { readonly type: "brand"; readonly brandId: string }
  | {
      readonly type: "organization";
      readonly brandId: string;
      readonly organizationId: string;
    }
  | {
      readonly type: "territory";
      readonly brandId: string;
      readonly territoryId: string;
    }
  | {
      readonly type: "legal_entity";
      readonly brandId: string;
      readonly organizationId: string;
      readonly legalEntityId: string;
    }
  | {
      readonly type: "outlet";
      readonly brandId: string;
      readonly organizationId: string;
      readonly territoryId: string;
      readonly outletId: string;
    };

/** Assignment / membership scope shape (legal_entity is not an assignment scope). */
export type AccessScope =
  | { readonly scopeType: "platform" }
  | { readonly scopeType: "brand"; readonly brandId: string }
  | {
      readonly scopeType: "organization";
      readonly brandId: string;
      readonly organizationId: string;
    }
  | {
      readonly scopeType: "territory";
      readonly brandId: string;
      readonly territoryId: string;
    }
  | {
      readonly scopeType: "outlet";
      readonly brandId: string;
      readonly organizationId: string;
      readonly territoryId: string;
      readonly outletId: string;
    };

export type AccessMembership = Readonly<{
  id: string;
  workforceUserId: string;
  scopeType: AccessScopeType;
  brandId: string | null;
  organizationId: string | null;
  territoryId: string | null;
  outletId: string | null;
  status: MembershipStatus;
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type AccessRoleAssignment = Readonly<{
  id: string;
  membershipId: string;
  roleKey: RoleKey;
  startsAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  grantedByWorkforceUserId: string | null;
  revokedByWorkforceUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
}>;

export type AuthorizationDecision = Readonly<{
  allowed: boolean;
  code: SafeAuthorizationDecisionCode;
}>;

export type AuthorizeInput = Readonly<{
  actor: unknown;
  permission: PermissionKey;
  resource: ProtectedResource;
}>;

export type GetEffectivePermissionsInput = Readonly<{
  actor: unknown;
  resource?: ProtectedResource;
}>;

export type MembershipTransitionTarget = "active" | "suspended" | "revoked" | "expired";
