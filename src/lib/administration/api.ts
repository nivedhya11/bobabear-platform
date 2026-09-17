import { adminRequest } from "./http";

export type AdminContinuation<T> = Readonly<{
  ok: true;
  items: T[];
  nextCursor: string | null;
  more: boolean;
}>;

export type AdministrationResource = Readonly<{
  id: string;
  code: string;
  name: string;
  status: string;
  revision?: string | number;
  brandId?: string;
  organizationId?: string;
  territoryId?: string;
  legalEntityId?: string;
}>;

export type AdministrationMembership = Readonly<{
  id: string;
  workforceUserId: string;
  memberLabel: string;
  scopeType: string;
  status: string;
  brandId: string | null;
  organizationId: string | null;
  territoryId: string | null;
  outletId: string | null;
  createdAt?: string;
}>;

export type AdministrationSession = Readonly<{
  workforceUserId: string;
  signedInLabel?: string;
  permissions: readonly string[];
}>;

export function fetchAdminSession() {
  return adminRequest<{
    ok: true;
    session: {
      workforceUserId: string;
      signedInLabel?: string;
      capabilities: Record<string, boolean>;
    };
  }>("/api/admin/v1/session");
}

export function fetchAdminOverview() {
  return adminRequest<{ ok: true; overview: Record<string, unknown> }>("/api/admin/v1/overview");
}

export function listAdminMemberships(query?: Readonly<{ outletId?: string; cursor?: string }>) {
  return adminRequest<AdminContinuation<AdministrationMembership>>("/api/admin/v1/memberships", {
    query,
  });
}

/** Authorized outlets for Store outlet selection (IMP-036E). */
export function listAdminOutlets(query?: Readonly<{ cursor?: string }>) {
  return adminRequest<AdminContinuation<AdministrationResource>>(
    "/api/admin/v1/resources/outlets",
    { query },
  );
}

/** Outlet-narrowed membership list (filter after authorization; outletId is not authority). */
export function listAdminMembershipsFiltered(outletId: string, cursor?: string) {
  return adminRequest<AdminContinuation<AdministrationMembership>>("/api/admin/v1/memberships", {
    query: { outletId, cursor },
  });
}

export function createAdminMembership(
  body: Readonly<{
    workforceUserId?: string;
    workforceEmail?: string;
    scopeType: string;
    brandId?: string;
    organizationId?: string;
    territoryId?: string;
    outletId?: string;
    status?: string;
  }>,
) {
  return adminRequest<{ ok: true; membership: AdministrationMembership }>(
    "/api/admin/v1/memberships",
    { method: "POST", body },
  );
}

export function listAdminBrands(query?: Readonly<{ cursor?: string }>) {
  return adminRequest<AdminContinuation<AdministrationResource>>(
    "/api/admin/v1/resources/brands",
    { query },
  );
}

export function listAdminAuditEvents(
  query?: Readonly<{
    cursor?: string;
    actorWorkforceUserId?: string;
    action?: string;
    occurredFrom?: string;
    occurredTo?: string;
  }>,
) {
  return adminRequest<
    AdminContinuation<{
      id: string;
      occurredAt: string;
      action: string;
      targetType: string;
      targetId: string;
      actorWorkforceUserId?: string | null;
    }>
  >("/api/admin/v1/audit-events", { query });
}

export function getAdminMembership(membershipId: string) {
  return adminRequest<{ ok: true; membership: Record<string, unknown> }>(
    `/api/admin/v1/memberships/${membershipId}`,
  );
}

export function listMembershipRoleAssignments(membershipId: string) {
  return adminRequest<{ ok: true; items: unknown[] }>(
    `/api/admin/v1/memberships/${membershipId}/role-assignments`,
  );
}

export function transitionMembership(membershipId: string, toStatus: string) {
  return adminRequest<{ ok: true; membership: Record<string, unknown> }>(
    `/api/admin/v1/memberships/${membershipId}/transition`,
    { method: "POST", body: { toStatus } },
  );
}

export function grantMembershipRole(membershipId: string, roleKey: string) {
  return adminRequest<{ ok: true; assignment: Record<string, unknown> }>(
    `/api/admin/v1/memberships/${membershipId}/role-assignments`,
    { method: "POST", body: { roleKey } },
  );
}

export function revokeRoleAssignment(assignmentId: string) {
  return adminRequest<{ ok: true; assignment: Record<string, unknown> }>(
    `/api/admin/v1/role-assignments/${assignmentId}/revoke`,
    { method: "POST", body: {} },
  );
}

export function fetchEffectivePermissions(query: Record<string, string>) {
  return adminRequest<{
    ok: true;
    permissions: string[];
    subject?: Readonly<{
      membershipId: string;
      workforceUserId: string;
      memberLabel: string;
    }>;
    resource?: Record<string, unknown>;
  }>("/api/admin/v1/effective-permissions", { query });
}

export async function getAdministrationSession() {
  const result = await fetchAdminSession();
  if (!result.ok) return result;
  return {
    ...result,
    data: {
      ok: true as const,
      session: {
        workforceUserId: result.data.session.workforceUserId,
        signedInLabel: result.data.session.signedInLabel,
        permissions: Object.entries(result.data.session.capabilities)
          .filter(([, allowed]) => allowed)
          .map(([permission]) => permission),
      },
    },
  };
}

export const listAdministrationResourceClient = (
  kind: string,
  query?: Readonly<{ cursor?: string }>,
) =>
  adminRequest<AdminContinuation<AdministrationResource>>(
    `/api/admin/v1/resources/${kind}`,
    { query },
  );

export function createAdministrationResource(
  kind: string,
  body: Readonly<Record<string, unknown>>,
) {
  return adminRequest<{ ok: true; item: AdministrationResource }>(
    `/api/admin/v1/resources/${kind}`,
    { method: "POST", body },
  );
}

export function updateAdministrationResource(
  kind: string,
  id: string,
  body: Readonly<Record<string, unknown>>,
) {
  return adminRequest<{ ok: true; item: AdministrationResource }>(
    `/api/admin/v1/resources/${kind}/${encodeURIComponent(id)}`,
    { method: "PATCH", body },
  );
}

export const listAdministrationMembershipsClient = (query?: Readonly<{ cursor?: string }>) =>
  adminRequest<AdminContinuation<AdministrationMembership>>("/api/admin/v1/memberships", {
    query,
  });

export const getAdministrationMembershipClient = (id: string) =>
  adminRequest<{ ok: true; membership: AdministrationMembership }>(
    `/api/admin/v1/memberships/${encodeURIComponent(id)}`,
  );

export const listAdministrationRoleAssignmentsClient = (id: string) =>
  adminRequest<{
    ok: true;
    items: Array<{ id: string; roleKey: string; revokedAt: string | null }>;
  }>(`/api/admin/v1/memberships/${encodeURIComponent(id)}/role-assignments`);

export const listAdministrationAuditEventsClient = (
  query?: Readonly<{
    cursor?: string;
    actorWorkforceUserId?: string;
    action?: string;
    occurredFrom?: string;
    occurredTo?: string;
  }>,
) =>
  adminRequest<
    AdminContinuation<{
      id: string;
      occurredAt: string;
      action: string;
      targetType: string;
      targetId: string;
      actorWorkforceUserId?: string | null;
    }>
  >("/api/admin/v1/audit-events", { query });
