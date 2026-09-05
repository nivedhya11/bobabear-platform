/**
 * Authorized administration use-cases (IMP-035 / D-373).
 *
 * Thin orchestration over existing Access Control + Organization authorities.
 * HTTP must not invent domain rules here.
 */
import "server-only";

import { eq } from "drizzle-orm";

import {
  isRoleKey,
  ROLE_ALLOWED_SCOPES,
  type PermissionKey,
  type RoleKey,
} from "../../shared/access-control";
import { workforceAuthUsers } from "../../platform/database/schema/workforce-auth";
import { resolveSignedInLabel } from "../../lib/workforce-hub/identity";
import type { Persistence, PersistenceQueryContext } from "../persistence/types";
import {
  accessScopeToProtectedResource,
  authorize,
  createMembership,
  findMembershipById,
  findRoleAssignmentById,
  getEffectivePermissions,
  grantRole,
  listAccessAuditEvents,
  listMemberships,
  listRoleAssignmentsForMembership,
  membershipToAccessScope,
  requireAuthorization,
  revokeRole,
  transitionMembership,
  type AccessAuditEvent,
  type AccessMembership,
  type AccessRoleAssignment,
  type AccessScope,
  type MembershipTransitionTarget,
  type ProtectedResource,
  type WorkforcePrincipal,
} from "../access-control";
import {
  createBrand,
  createLegalEntity,
  createOrganization,
  createOutlet,
  createTerritory,
  findBrandById,
  findLegalEntityById,
  findOrganizationById,
  findOutletById,
  findTerritoryById,
  listBrands,
  listLegalEntities,
  listOrganizations,
  listOutlets,
  listTerritories,
  updateBrand,
  updateLegalEntity,
  updateOrganization,
  updateOutlet,
  updateTerritory,
  type Brand,
  type LegalEntity,
  type Organization,
  type Outlet,
  type Territory,
} from "../organization";
import { AdministrationError } from "./errors";

const FORBIDDEN_BODY_KEYS = new Set([
  "actor",
  "actorId",
  "principal",
  "permission",
  "permissions",
  "role",
  "roles",
  "scope",
  "scopeApproved",
  "authorized",
  "workforceUserIdAuthority",
]);

const ACCESS_CAPS = [
  "brand.create",
  "brand.read",
  "brand.update",
  "organization.create",
  "organization.read",
  "organization.update",
  "territory.create",
  "territory.read",
  "territory.update",
  "legal_entity.create",
  "legal_entity.read",
  "legal_entity.update",
  "outlet.create",
  "outlet.read",
  "outlet.update",
  "access.membership.read",
  "access.membership.manage",
  "access.role_assignment.read",
  "access.role_assignment.grant",
  "access.role_assignment.revoke",
  "access.effective_permissions.read",
  "access.audit.read",
] as const satisfies readonly PermissionKey[];

/** Portal session projection includes operations permissions for workforce hub navigation. */
const PORTAL_SESSION_CAPS = [
  "order.read",
  "order.accept",
  "order.fulfil",
  "order.cancel",
  "payment.refund",
  "payment.refund.read",
  "notification.resend",
  "delivery.read",
  "delivery.dispatch",
  "delivery.book",
  "delivery.assign",
  "delivery.pickup",
  "delivery.complete",
  "delivery.cancel",
  "delivery.fail",
  "delivery.return",
  "delivery.cost.record",
  ...ACCESS_CAPS,
] as const satisfies readonly PermissionKey[];

const LIST_LIMIT = 200;

export function rejectForgedAuthorityFields(body: Readonly<Record<string, unknown>>): void {
  for (const key of Object.keys(body)) {
    if (FORBIDDEN_BODY_KEYS.has(key)) {
      throw new AdministrationError("ADMIN_REQUEST_INVALID", "Caller-supplied authority fields are not accepted.", {
        field: key,
      });
    }
  }
}

function requirePrincipal(actor: WorkforcePrincipal | null): WorkforcePrincipal {
  if (!actor) throw new AdministrationError("WORKFORCE_AUTH_REQUIRED", "Workforce authentication is required.");
  return actor;
}

async function isAllowed(
  context: PersistenceQueryContext,
  actor: WorkforcePrincipal,
  permission: PermissionKey,
  resource: ProtectedResource,
): Promise<boolean> {
  const decision = await authorize(context, { actor, permission, resource });
  return decision.allowed;
}

async function filterByPermission<T>(
  context: PersistenceQueryContext,
  actor: WorkforcePrincipal,
  permission: PermissionKey,
  items: readonly T[],
  resourceOf: (item: T) => ProtectedResource | null,
): Promise<T[]> {
  const out: T[] = [];
  for (const item of items) {
    if (out.length >= LIST_LIMIT) break;
    const resource = resourceOf(item);
    if (!resource) continue;
    if (await isAllowed(context, actor, permission, resource)) out.push(item);
  }
  return out;
}

function membershipResource(membership: AccessMembership): ProtectedResource | null {
  const scope = membershipToAccessScope(membership);
  return scope ? accessScopeToProtectedResource(scope) : null;
}

function auditResource(event: AccessAuditEvent): ProtectedResource | null {
  if (!event.scopeType) return { type: "platform" };
  const scope = membershipToAccessScope({
    scopeType: event.scopeType,
    brandId: event.brandId,
    organizationId: event.organizationId,
    territoryId: event.territoryId,
    outletId: event.outletId,
  });
  return scope ? accessScopeToProtectedResource(scope) : null;
}

export async function getAdminSession(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
): Promise<{
  workforceUserId: string;
  signedInLabel: string;
  capabilities: Record<(typeof PORTAL_SESSION_CAPS)[number], boolean>;
}> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const effective = new Set(await getEffectivePermissions(context, { actor: principal }));
    const capabilities = {} as Record<(typeof PORTAL_SESSION_CAPS)[number], boolean>;
    for (const permission of PORTAL_SESSION_CAPS) {
      capabilities[permission] = effective.has(permission);
    }
    const rows = await context.db
      .select({ email: workforceAuthUsers.email })
      .from(workforceAuthUsers)
      .where(eq(workforceAuthUsers.id, principal.workforceUserId))
      .limit(1);
    return {
      workforceUserId: principal.workforceUserId,
      signedInLabel: resolveSignedInLabel({
        email: rows[0]?.email,
        workforceUserId: principal.workforceUserId,
      }),
      capabilities,
    };
  });
}

export async function adminListBrands(persistence: Persistence, actor: WorkforcePrincipal | null): Promise<Brand[]> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) =>
    filterByPermission(context, principal, "brand.read", await listBrands(context), (b) => ({
      type: "brand",
      brandId: b.id,
    })),
  );
}

export async function adminGetBrand(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  brandId: string,
): Promise<Brand> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const brand = await findBrandById(context, brandId);
    if (!brand) throw new AdministrationError("ADMIN_NOT_FOUND", "Brand not found.");
    await requireAuthorization(context, {
      actor: principal,
      permission: "brand.read",
      resource: { type: "brand", brandId: brand.id },
    });
    return brand;
  });
}

export async function adminCreateBrand(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  body: Readonly<Record<string, unknown>>,
): Promise<Brand> {
  const principal = requirePrincipal(actor);
  rejectForgedAuthorityFields(body);
  const code = typeof body.code === "string" ? body.code : "";
  const name = typeof body.name === "string" ? body.name : "";
  const status = body.status === "inactive" ? "inactive" : body.status === "active" || body.status === undefined ? "active" : null;
  if (!code || !name || status === null) {
    throw new AdministrationError("ADMIN_REQUEST_INVALID", "Brand create requires code, name, and optional status.");
  }
  return persistence.transaction(async (tx) => {
    await requireAuthorization(tx, {
      actor: principal,
      permission: "brand.create",
      resource: { type: "platform" },
    });
    return createBrand(tx, {
      code,
      name,
      status,
      actorWorkforceUserId: principal.workforceUserId,
    });
  });
}

export async function adminUpdateBrand(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  brandId: string,
  body: Readonly<Record<string, unknown>>,
): Promise<Brand> {
  const principal = requirePrincipal(actor);
  rejectForgedAuthorityFields(body);
  const name = body.name === undefined ? undefined : typeof body.name === "string" ? body.name : null;
  const status =
    body.status === undefined
      ? undefined
      : body.status === "active" || body.status === "inactive"
        ? body.status
        : null;
  if (name === null || status === null || (name === undefined && status === undefined)) {
    throw new AdministrationError("ADMIN_REQUEST_INVALID", "Brand update requires name and/or status.");
  }
  return persistence.transaction(async (tx) => {
    await requireAuthorization(tx, {
      actor: principal,
      permission: "brand.update",
      resource: { type: "brand", brandId },
    });
    return updateBrand(tx, {
      brandId,
      ...(name !== undefined ? { name } : {}),
      ...(status !== undefined ? { status } : {}),
      actorWorkforceUserId: principal.workforceUserId,
    });
  });
}

async function listFilteredOrganizations(
  context: PersistenceQueryContext,
  actor: WorkforcePrincipal,
): Promise<Organization[]> {
  return filterByPermission(context, actor, "organization.read", await listOrganizations(context), (o) => ({
    type: "organization",
    brandId: o.brandId,
    organizationId: o.id,
  }));
}

export async function adminListOrganizations(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
): Promise<Organization[]> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => listFilteredOrganizations(context, principal));
}

export async function adminGetOrganization(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  organizationId: string,
): Promise<Organization> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const organization = await findOrganizationById(context, organizationId);
    if (!organization) throw new AdministrationError("ADMIN_NOT_FOUND", "Organization not found.");
    await requireAuthorization(context, {
      actor: principal,
      permission: "organization.read",
      resource: {
        type: "organization",
        brandId: organization.brandId,
        organizationId: organization.id,
      },
    });
    return organization;
  });
}

export async function adminCreateOrganization(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  body: Readonly<Record<string, unknown>>,
): Promise<Organization> {
  const principal = requirePrincipal(actor);
  rejectForgedAuthorityFields(body);
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const code = typeof body.code === "string" ? body.code : "";
  const name = typeof body.name === "string" ? body.name : "";
  if (!brandId || !code || !name) {
    throw new AdministrationError("ADMIN_REQUEST_INVALID", "Organization create requires brandId, code, and name.");
  }
  return persistence.transaction(async (tx) => {
    await requireAuthorization(tx, {
      actor: principal,
      permission: "organization.create",
      resource: { type: "brand", brandId },
    });
    return createOrganization(tx, {
      brandId,
      code,
      name,
      actorWorkforceUserId: principal.workforceUserId,
    });
  });
}

export async function adminUpdateOrganization(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  organizationId: string,
  body: Readonly<Record<string, unknown>>,
): Promise<Organization> {
  const principal = requirePrincipal(actor);
  rejectForgedAuthorityFields(body);
  return persistence.transaction(async (tx) => {
    const existing = await findOrganizationById(tx, organizationId);
    if (!existing) throw new AdministrationError("ADMIN_NOT_FOUND", "Organization not found.");
    await requireAuthorization(tx, {
      actor: principal,
      permission: "organization.update",
      resource: {
        type: "organization",
        brandId: existing.brandId,
        organizationId: existing.id,
      },
    });
    const name = body.name === undefined ? undefined : typeof body.name === "string" ? body.name : null;
    const status =
      body.status === undefined
        ? undefined
        : body.status === "active" || body.status === "inactive"
          ? body.status
          : null;
    if (name === null || status === null || (name === undefined && status === undefined)) {
      throw new AdministrationError("ADMIN_REQUEST_INVALID", "Organization update requires name and/or status.");
    }
    return updateOrganization(tx, {
      organizationId,
      ...(name !== undefined ? { name } : {}),
      ...(status !== undefined ? { status } : {}),
      actorWorkforceUserId: principal.workforceUserId,
    });
  });
}

export async function adminListTerritories(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
): Promise<Territory[]> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) =>
    filterByPermission(context, principal, "territory.read", await listTerritories(context), (t) => ({
      type: "territory",
      brandId: t.brandId,
      territoryId: t.id,
    })),
  );
}

export async function adminGetTerritory(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  territoryId: string,
): Promise<Territory> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const territory = await findTerritoryById(context, territoryId);
    if (!territory) throw new AdministrationError("ADMIN_NOT_FOUND", "Territory not found.");
    await requireAuthorization(context, {
      actor: principal,
      permission: "territory.read",
      resource: { type: "territory", brandId: territory.brandId, territoryId: territory.id },
    });
    return territory;
  });
}

export async function adminCreateTerritory(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  body: Readonly<Record<string, unknown>>,
): Promise<Territory> {
  const principal = requirePrincipal(actor);
  rejectForgedAuthorityFields(body);
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const code = typeof body.code === "string" ? body.code : "";
  const name = typeof body.name === "string" ? body.name : "";
  if (!brandId || !code || !name) {
    throw new AdministrationError("ADMIN_REQUEST_INVALID", "Territory create requires brandId, code, and name.");
  }
  return persistence.transaction(async (tx) => {
    await requireAuthorization(tx, {
      actor: principal,
      permission: "territory.create",
      resource: { type: "brand", brandId },
    });
    return createTerritory(tx, {
      brandId,
      code,
      name,
      actorWorkforceUserId: principal.workforceUserId,
    });
  });
}

export async function adminUpdateTerritory(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  territoryId: string,
  body: Readonly<Record<string, unknown>>,
): Promise<Territory> {
  const principal = requirePrincipal(actor);
  rejectForgedAuthorityFields(body);
  return persistence.transaction(async (tx) => {
    const existing = await findTerritoryById(tx, territoryId);
    if (!existing) throw new AdministrationError("ADMIN_NOT_FOUND", "Territory not found.");
    await requireAuthorization(tx, {
      actor: principal,
      permission: "territory.update",
      resource: { type: "territory", brandId: existing.brandId, territoryId: existing.id },
    });
    const name = body.name === undefined ? undefined : typeof body.name === "string" ? body.name : null;
    const status =
      body.status === undefined
        ? undefined
        : body.status === "active" || body.status === "inactive"
          ? body.status
          : null;
    if (name === null || status === null || (name === undefined && status === undefined)) {
      throw new AdministrationError("ADMIN_REQUEST_INVALID", "Territory update requires name and/or status.");
    }
    return updateTerritory(tx, {
      territoryId,
      ...(name !== undefined ? { name } : {}),
      ...(status !== undefined ? { status } : {}),
      actorWorkforceUserId: principal.workforceUserId,
    });
  });
}

export async function adminListLegalEntities(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
): Promise<LegalEntity[]> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) =>
    filterByPermission(context, principal, "legal_entity.read", await listLegalEntities(context), (e) => ({
      type: "legal_entity",
      brandId: e.brandId,
      organizationId: e.organizationId,
      legalEntityId: e.id,
    })),
  );
}

export async function adminGetLegalEntity(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  legalEntityId: string,
): Promise<LegalEntity> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const entity = await findLegalEntityById(context, legalEntityId);
    if (!entity) throw new AdministrationError("ADMIN_NOT_FOUND", "Legal entity not found.");
    await requireAuthorization(context, {
      actor: principal,
      permission: "legal_entity.read",
      resource: {
        type: "legal_entity",
        brandId: entity.brandId,
        organizationId: entity.organizationId,
        legalEntityId: entity.id,
      },
    });
    return entity;
  });
}

export async function adminCreateLegalEntity(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  body: Readonly<Record<string, unknown>>,
): Promise<LegalEntity> {
  const principal = requirePrincipal(actor);
  rejectForgedAuthorityFields(body);
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  const code = typeof body.code === "string" ? body.code : "";
  const name = typeof body.name === "string" ? body.name : "";
  if (!brandId || !organizationId || !code || !name) {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      "Legal entity create requires brandId, organizationId, code, and name.",
    );
  }
  return persistence.transaction(async (tx) => {
    await requireAuthorization(tx, {
      actor: principal,
      permission: "legal_entity.create",
      resource: { type: "organization", brandId, organizationId },
    });
    return createLegalEntity(tx, {
      brandId,
      organizationId,
      code,
      name,
      actorWorkforceUserId: principal.workforceUserId,
    });
  });
}

export async function adminUpdateLegalEntity(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  legalEntityId: string,
  body: Readonly<Record<string, unknown>>,
): Promise<LegalEntity> {
  const principal = requirePrincipal(actor);
  rejectForgedAuthorityFields(body);
  return persistence.transaction(async (tx) => {
    const existing = await findLegalEntityById(tx, legalEntityId);
    if (!existing) throw new AdministrationError("ADMIN_NOT_FOUND", "Legal entity not found.");
    await requireAuthorization(tx, {
      actor: principal,
      permission: "legal_entity.update",
      resource: {
        type: "legal_entity",
        brandId: existing.brandId,
        organizationId: existing.organizationId,
        legalEntityId: existing.id,
      },
    });
    const name = body.name === undefined ? undefined : typeof body.name === "string" ? body.name : null;
    const status =
      body.status === undefined
        ? undefined
        : body.status === "active" || body.status === "inactive"
          ? body.status
          : null;
    if (name === null || status === null || (name === undefined && status === undefined)) {
      throw new AdministrationError("ADMIN_REQUEST_INVALID", "Legal entity update requires name and/or status.");
    }
    return updateLegalEntity(tx, {
      legalEntityId,
      ...(name !== undefined ? { name } : {}),
      ...(status !== undefined ? { status } : {}),
      actorWorkforceUserId: principal.workforceUserId,
    });
  });
}

export async function adminListOutlets(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
): Promise<Outlet[]> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) =>
    filterByPermission(context, principal, "outlet.read", await listOutlets(context), (o) => ({
      type: "outlet",
      brandId: o.brandId,
      organizationId: o.organizationId,
      territoryId: o.territoryId,
      outletId: o.id,
    })),
  );
}

export async function adminGetOutlet(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  outletId: string,
): Promise<Outlet> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const outlet = await findOutletById(context, outletId);
    if (!outlet) throw new AdministrationError("ADMIN_NOT_FOUND", "Outlet not found.");
    await requireAuthorization(context, {
      actor: principal,
      permission: "outlet.read",
      resource: {
        type: "outlet",
        brandId: outlet.brandId,
        organizationId: outlet.organizationId,
        territoryId: outlet.territoryId,
        outletId: outlet.id,
      },
    });
    return outlet;
  });
}

export async function adminCreateOutlet(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  body: Readonly<Record<string, unknown>>,
): Promise<Outlet> {
  const principal = requirePrincipal(actor);
  rejectForgedAuthorityFields(body);
  const brandId = typeof body.brandId === "string" ? body.brandId : "";
  const organizationId = typeof body.organizationId === "string" ? body.organizationId : "";
  const territoryId = typeof body.territoryId === "string" ? body.territoryId : "";
  const legalEntityId = typeof body.legalEntityId === "string" ? body.legalEntityId : "";
  const code = typeof body.code === "string" ? body.code : "";
  const name = typeof body.name === "string" ? body.name : "";
  if (!brandId || !organizationId || !territoryId || !legalEntityId || !code || !name) {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      "Outlet create requires brandId, organizationId, territoryId, legalEntityId, code, and name.",
    );
  }
  return persistence.transaction(async (tx) => {
    await requireAuthorization(tx, {
      actor: principal,
      permission: "outlet.create",
      resource: { type: "brand", brandId },
    });
    return createOutlet(tx, {
      brandId,
      organizationId,
      territoryId,
      legalEntityId,
      code,
      name,
      actorWorkforceUserId: principal.workforceUserId,
    });
  });
}

export async function adminUpdateOutlet(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  outletId: string,
  body: Readonly<Record<string, unknown>>,
): Promise<Outlet> {
  const principal = requirePrincipal(actor);
  rejectForgedAuthorityFields(body);
  return persistence.transaction(async (tx) => {
    const existing = await findOutletById(tx, outletId);
    if (!existing) throw new AdministrationError("ADMIN_NOT_FOUND", "Outlet not found.");
    await requireAuthorization(tx, {
      actor: principal,
      permission: "outlet.update",
      resource: {
        type: "outlet",
        brandId: existing.brandId,
        organizationId: existing.organizationId,
        territoryId: existing.territoryId,
        outletId: existing.id,
      },
    });
    const name = body.name === undefined ? undefined : typeof body.name === "string" ? body.name : null;
    const status =
      body.status === undefined
        ? undefined
        : body.status === "active" || body.status === "inactive"
          ? body.status
          : null;
    if (name === null || status === null || (name === undefined && status === undefined)) {
      throw new AdministrationError("ADMIN_REQUEST_INVALID", "Outlet update requires name and/or status.");
    }
    return updateOutlet(tx, {
      outletId,
      ...(name !== undefined ? { name } : {}),
      ...(status !== undefined ? { status } : {}),
      actorWorkforceUserId: principal.workforceUserId,
    });
  });
}

export async function adminListMemberships(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
): Promise<AccessMembership[]> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) =>
    filterByPermission(context, principal, "access.membership.read", await listMemberships(context), membershipResource),
  );
}

export async function adminGetMembership(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  membershipId: string,
): Promise<AccessMembership> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const membership = await findMembershipById(context, membershipId);
    if (!membership) throw new AdministrationError("ADMIN_NOT_FOUND", "Membership not found.");
    const resource = membershipResource(membership);
    if (!resource) throw new AdministrationError("ADMIN_REQUEST_INVALID", "Membership scope is invalid.");
    await requireAuthorization(context, {
      actor: principal,
      permission: "access.membership.read",
      resource,
    });
    return membership;
  });
}

function parseScope(body: Readonly<Record<string, unknown>>): AccessScope {
  const scopeType = body.scopeType;
  if (scopeType === "platform") return { scopeType: "platform" };
  if (scopeType === "brand" && typeof body.brandId === "string") {
    return { scopeType: "brand", brandId: body.brandId };
  }
  if (
    scopeType === "organization" &&
    typeof body.brandId === "string" &&
    typeof body.organizationId === "string"
  ) {
    return {
      scopeType: "organization",
      brandId: body.brandId,
      organizationId: body.organizationId,
    };
  }
  if (scopeType === "territory" && typeof body.brandId === "string" && typeof body.territoryId === "string") {
    return { scopeType: "territory", brandId: body.brandId, territoryId: body.territoryId };
  }
  if (
    scopeType === "outlet" &&
    typeof body.brandId === "string" &&
    typeof body.organizationId === "string" &&
    typeof body.territoryId === "string" &&
    typeof body.outletId === "string"
  ) {
    return {
      scopeType: "outlet",
      brandId: body.brandId,
      organizationId: body.organizationId,
      territoryId: body.territoryId,
      outletId: body.outletId,
    };
  }
  throw new AdministrationError("ADMIN_REQUEST_INVALID", "Membership scope is invalid.");
}

export async function adminCreateMembership(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  body: Readonly<Record<string, unknown>>,
): Promise<AccessMembership> {
  const principal = requirePrincipal(actor);
  rejectForgedAuthorityFields(body);
  const workforceUserId = typeof body.workforceUserId === "string" ? body.workforceUserId : "";
  if (!workforceUserId) {
    throw new AdministrationError("ADMIN_REQUEST_INVALID", "workforceUserId is required.");
  }
  const scope = parseScope(body);
  const status = body.status === "active" ? "active" : "invited";
  return persistence.transaction(async (tx) =>
    createMembership(tx, {
      actor: principal,
      workforceUserId,
      scope,
      status,
    }),
  );
}

export async function adminTransitionMembership(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  membershipId: string,
  body: Readonly<Record<string, unknown>>,
): Promise<AccessMembership> {
  const principal = requirePrincipal(actor);
  rejectForgedAuthorityFields(body);
  const toStatus = body.toStatus;
  if (
    toStatus !== "active" &&
    toStatus !== "suspended" &&
    toStatus !== "revoked" &&
    toStatus !== "expired"
  ) {
    throw new AdministrationError("ADMIN_REQUEST_INVALID", "toStatus is invalid.");
  }
  return persistence.transaction(async (tx) =>
    transitionMembership(tx, {
      actor: principal,
      membershipId,
      toStatus: toStatus as MembershipTransitionTarget,
    }),
  );
}

export async function adminListRoleAssignments(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  membershipId: string,
): Promise<AccessRoleAssignment[]> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const membership = await findMembershipById(context, membershipId);
    if (!membership) throw new AdministrationError("ADMIN_NOT_FOUND", "Membership not found.");
    const resource = membershipResource(membership);
    if (!resource) throw new AdministrationError("ADMIN_REQUEST_INVALID", "Membership scope is invalid.");
    await requireAuthorization(context, {
      actor: principal,
      permission: "access.role_assignment.read",
      resource,
    });
    return listRoleAssignmentsForMembership(context, membershipId);
  });
}

export async function adminGrantRole(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  membershipId: string,
  body: Readonly<Record<string, unknown>>,
): Promise<AccessRoleAssignment> {
  const principal = requirePrincipal(actor);
  rejectForgedAuthorityFields(body);
  const roleKey = typeof body.roleKey === "string" ? body.roleKey : "";
  if (!isRoleKey(roleKey)) throw new AdministrationError("ADMIN_REQUEST_INVALID", "roleKey is invalid.");
  return persistence.transaction(async (tx) => {
    const membership = await findMembershipById(tx, membershipId);
    if (!membership) throw new AdministrationError("ADMIN_NOT_FOUND", "Membership not found.");
    if (!(ROLE_ALLOWED_SCOPES[roleKey] as readonly string[]).includes(membership.scopeType)) {
      throw new AdministrationError("ADMIN_FORBIDDEN", "Role cannot be granted at this scope.");
    }
    return grantRole(tx, {
      actor: principal,
      membershipId,
      roleKey,
    });
  });
}

export async function adminRevokeRole(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  assignmentId: string,
  body: Readonly<Record<string, unknown>>,
): Promise<AccessRoleAssignment> {
  const principal = requirePrincipal(actor);
  rejectForgedAuthorityFields(body);
  return persistence.transaction(async (tx) => {
    const existing = await findRoleAssignmentById(tx, assignmentId);
    if (!existing) throw new AdministrationError("ADMIN_NOT_FOUND", "Role assignment not found.");
    return revokeRole(tx, {
      actor: principal,
      assignmentId,
    });
  });
}

export async function adminGetEffectivePermissions(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  query: Readonly<Record<string, string>>,
): Promise<PermissionKey[]> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const resource = parseResourceQuery(query);
    await requireAuthorization(context, {
      actor: principal,
      permission: "access.effective_permissions.read",
      resource,
    });
    return getEffectivePermissions(context, { actor: principal, resource });
  });
}

function parseResourceQuery(query: Readonly<Record<string, string>>): ProtectedResource {
  const type = query.resourceType;
  if (type === "platform") return { type: "platform" };
  if (type === "brand" && query.brandId) return { type: "brand", brandId: query.brandId };
  if (type === "organization" && query.brandId && query.organizationId) {
    return { type: "organization", brandId: query.brandId, organizationId: query.organizationId };
  }
  if (type === "territory" && query.brandId && query.territoryId) {
    return { type: "territory", brandId: query.brandId, territoryId: query.territoryId };
  }
  if (type === "legal_entity" && query.brandId && query.organizationId && query.legalEntityId) {
    return {
      type: "legal_entity",
      brandId: query.brandId,
      organizationId: query.organizationId,
      legalEntityId: query.legalEntityId,
    };
  }
  if (
    type === "outlet" &&
    query.brandId &&
    query.organizationId &&
    query.territoryId &&
    query.outletId
  ) {
    return {
      type: "outlet",
      brandId: query.brandId,
      organizationId: query.organizationId,
      territoryId: query.territoryId,
      outletId: query.outletId,
    };
  }
  throw new AdministrationError("ADMIN_REQUEST_INVALID", "resourceType / resource ids are invalid.");
}

export async function adminListAuditEvents(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
): Promise<AccessAuditEvent[]> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) =>
    filterByPermission(context, principal, "access.audit.read", await listAccessAuditEvents(context), auditResource),
  );
}
