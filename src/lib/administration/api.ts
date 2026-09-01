import { adminRequest } from "./http";

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

export function listAdminMemberships() {
  return adminRequest<{ ok: true; items: unknown[] }>("/api/admin/v1/memberships");
}

export function listAdminBrands() {
  return adminRequest<{ ok: true; items: unknown[] }>("/api/admin/v1/resources/brands");
}

export function listAdminAuditEvents() {
  return adminRequest<{ ok: true; items: unknown[] }>("/api/admin/v1/audit-events");
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
  return adminRequest<{ ok: true; permissions: string[] }>("/api/admin/v1/effective-permissions", {
    query,
  });
}

export type AdministrationSession = Readonly<{
  workforceUserId: string;
  signedInLabel?: string;
  permissions: readonly string[];
}>;

export type AdministrationResource = Readonly<{
  id: string;
  code: string;
  name: string;
  status: string;
  brandId?: string;
  organizationId?: string;
  territoryId?: string;
}>;

export type AdministrationMembership = Readonly<{
  id: string;
  workforceUserId: string;
  scopeType: string;
  status: string;
  brandId: string | null;
  organizationId: string | null;
  territoryId: string | null;
  outletId: string | null;
}>;

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

export const listAdministrationResourceClient = (kind: string) =>
  adminRequest<{ ok: true; items: AdministrationResource[] }>(`/api/admin/v1/resources/${kind}`);
export const listAdministrationMembershipsClient = () =>
  adminRequest<{ ok: true; items: AdministrationMembership[] }>("/api/admin/v1/memberships");
export const getAdministrationMembershipClient = (id: string) =>
  adminRequest<{ ok: true; membership: AdministrationMembership }>(`/api/admin/v1/memberships/${encodeURIComponent(id)}`);
export const listAdministrationRoleAssignmentsClient = (id: string) =>
  adminRequest<{ ok: true; items: Array<{ id: string; roleKey: string; revokedAt: string | null }> }>(`/api/admin/v1/memberships/${encodeURIComponent(id)}/role-assignments`);
export const listAdministrationAuditEventsClient = () =>
  adminRequest<{ ok: true; items: Array<{ id: string; occurredAt: string; action: string; targetType: string; targetId: string }> }>("/api/admin/v1/audit-events");
