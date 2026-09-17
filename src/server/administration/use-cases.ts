/**
 * Authorized administration use-cases (IMP-035 / D-373).
 *
 * Thin orchestration over existing Access Control + Organization authorities.
 * HTTP must not invent domain rules here.
 */
import "server-only";

import { eq, inArray } from "drizzle-orm";

import {
  isRoleKey,
  ROLE_ALLOWED_SCOPES,
  type PermissionKey,
  type RoleKey,
} from "../../shared/access-control";
import { normalizeWorkforceEmail } from "../../shared/workforce-auth/email";
import { workforceAuthUsers } from "../../platform/database/schema/workforce-auth";
import { resolveMemberLabel, resolveSignedInLabel } from "../../lib/workforce-hub/identity";
import type { Persistence, PersistenceQueryContext } from "../persistence/types";
import {
  accessScopeToProtectedResource,
  authorize,
  createMembership,
  createWorkforcePrincipalFromTrustedIdentity,
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
  WorkforcePrincipalError,
  type AccessAuditEvent,
  type AccessMembership,
  type AccessRoleAssignment,
  type AccessScope,
  type MembershipTransitionTarget,
  type ProtectedResource,
  type WorkforcePrincipal,
} from "../access-control";
import { loadEffectiveGrants } from "../access-control/authorize";
import { assignmentCoversResource } from "../access-control/scope";
import { findWorkforceUserByEmail } from "../auth/workforce/operator/lifecycle";
import { actorHasOrderCapability } from "../order/authorize";
import { getMetricsSnapshot } from "../../platform/observability";
import { loadOperationalQueueBacklog } from "../persistence/operational-counts";
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
import {
  pageByNameId,
  pageByTimeIdDesc,
  parseExpectedRevision,
  type AdminContinuationPage,
} from "./continuation";
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

/**
 * Portal session projection for workforce hub / administration navigation affordances.
 * Session flags are navigation-only — server authorization remains authoritative for reads/mutations.
 * IMP-036F F6B: include commercial read/manage keys so Commercial workspace section affordances
 * can reflect coarse capability without inventing client-side authority.
 */
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
  "availability.read",
  "availability.manage",
  "outlet.operating_state.read",
  "outlet.operating_state.pause",
  "outlet.operating_state.suspend",
  "outlet.operating_schedule.read",
  "outlet.operating_schedule.manage",
  "serviceability.read",
  "serviceability.manage",
  "assortment.read",
  "assortment.manage",
  "catalog.read",
  "catalog.manage",
  "menu.read",
  "menu.manage",
  "pricing.read",
  "pricing.manage",
  "promotions.read",
  "promotions.manage",
  "promotions.activate",
  "coupons.read",
  "coupons.manage",
  ...ACCESS_CAPS,
] as const satisfies readonly PermissionKey[];

const LIST_PAGE_DEFAULT = 50;

export type AdministrationListQuery = Readonly<{
  cursor?: string;
}>;

export type AdministrationAuditListQuery = Readonly<{
  cursor?: string;
  actorWorkforceUserId?: string;
  action?: string;
  occurredFrom?: string;
  occurredTo?: string;
}>;

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

async function authorizeEligibleSet<T>(
  context: PersistenceQueryContext,
  actor: WorkforcePrincipal,
  permission: PermissionKey,
  items: readonly T[],
  resourceOf: (item: T) => ProtectedResource | null,
): Promise<T[]> {
  const out: T[] = [];
  for (const item of items) {
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

/** Safe Admin membership projection — human label only after authorization. */
export type AdministrationMembershipProjection = AccessMembership & {
  readonly memberLabel: string;
};

async function enrichMembershipsWithMemberLabel(
  context: PersistenceQueryContext,
  memberships: readonly AccessMembership[],
): Promise<AdministrationMembershipProjection[]> {
  if (memberships.length === 0) return [];
  const ids = [...new Set(memberships.map((membership) => membership.workforceUserId))];
  const rows = await context.db
    .select({
      id: workforceAuthUsers.id,
      name: workforceAuthUsers.name,
      email: workforceAuthUsers.email,
    })
    .from(workforceAuthUsers)
    .where(inArray(workforceAuthUsers.id, ids));
  const byId = new Map(rows.map((row) => [row.id, row]));
  return memberships.map((membership) => {
    const user = byId.get(membership.workforceUserId);
    return {
      ...membership,
      memberLabel: resolveMemberLabel({ name: user?.name, email: user?.email }),
    };
  });
}

async function enrichMembershipWithMemberLabel(
  context: PersistenceQueryContext,
  membership: AccessMembership,
): Promise<AdministrationMembershipProjection> {
  const [enriched] = await enrichMembershipsWithMemberLabel(context, [membership]);
  return enriched!;
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

export async function adminListBrands(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  query: AdministrationListQuery = {},
): Promise<AdminContinuationPage<Brand>> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const eligible = await authorizeEligibleSet(
      context,
      principal,
      "brand.read",
      await listBrands(context),
      (b) => ({ type: "brand", brandId: b.id }),
    );
    return pageByNameId(eligible, (b) => ({ name: b.name, id: b.id }), {
      cursor: query.cursor,
      pageSize: LIST_PAGE_DEFAULT,
    });
  });
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
  const expectedRevision = parseExpectedRevision(body);
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
      expectedRevision,
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
  return authorizeEligibleSet(context, actor, "organization.read", await listOrganizations(context), (o) => ({
    type: "organization",
    brandId: o.brandId,
    organizationId: o.id,
  }));
}

export async function adminListOrganizations(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  query: AdministrationListQuery = {},
): Promise<AdminContinuationPage<Organization>> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const eligible = await listFilteredOrganizations(context, principal);
    return pageByNameId(eligible, (o) => ({ name: o.name, id: o.id }), {
      cursor: query.cursor,
      pageSize: LIST_PAGE_DEFAULT,
    });
  });
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
      expectedRevision: parseExpectedRevision(body),
      ...(name !== undefined ? { name } : {}),
      ...(status !== undefined ? { status } : {}),
      actorWorkforceUserId: principal.workforceUserId,
    });
  });
}

export async function adminListTerritories(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  query: AdministrationListQuery = {},
): Promise<AdminContinuationPage<Territory>> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const eligible = await authorizeEligibleSet(
      context,
      principal,
      "territory.read",
      await listTerritories(context),
      (t) => ({
        type: "territory",
        brandId: t.brandId,
        territoryId: t.id,
      }),
    );
    return pageByNameId(eligible, (t) => ({ name: t.name, id: t.id }), {
      cursor: query.cursor,
      pageSize: LIST_PAGE_DEFAULT,
    });
  });
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
      expectedRevision: parseExpectedRevision(body),
      ...(name !== undefined ? { name } : {}),
      ...(status !== undefined ? { status } : {}),
      actorWorkforceUserId: principal.workforceUserId,
    });
  });
}

export async function adminListLegalEntities(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  query: AdministrationListQuery = {},
): Promise<AdminContinuationPage<LegalEntity>> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const eligible = await authorizeEligibleSet(
      context,
      principal,
      "legal_entity.read",
      await listLegalEntities(context),
      (e) => ({
        type: "legal_entity",
        brandId: e.brandId,
        organizationId: e.organizationId,
        legalEntityId: e.id,
      }),
    );
    return pageByNameId(eligible, (e) => ({ name: e.name, id: e.id }), {
      cursor: query.cursor,
      pageSize: LIST_PAGE_DEFAULT,
    });
  });
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
      expectedRevision: parseExpectedRevision(body),
      ...(name !== undefined ? { name } : {}),
      ...(status !== undefined ? { status } : {}),
      actorWorkforceUserId: principal.workforceUserId,
    });
  });
}

export async function adminListOutlets(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  query: AdministrationListQuery = {},
): Promise<AdminContinuationPage<Outlet>> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const eligible = await authorizeEligibleSet(
      context,
      principal,
      "outlet.read",
      await listOutlets(context),
      (o) => ({
        type: "outlet",
        brandId: o.brandId,
        organizationId: o.organizationId,
        territoryId: o.territoryId,
        outletId: o.id,
      }),
    );
    return pageByNameId(eligible, (o) => ({ name: o.name, id: o.id }), {
      cursor: query.cursor,
      pageSize: LIST_PAGE_DEFAULT,
    });
  });
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
      expectedRevision: parseExpectedRevision(body),
      ...(name !== undefined ? { name } : {}),
      ...(status !== undefined ? { status } : {}),
      actorWorkforceUserId: principal.workforceUserId,
    });
  });
}

export async function adminListMemberships(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  filter?: Readonly<{ outletId?: string; cursor?: string }>,
): Promise<AdminContinuationPage<AdministrationMembershipProjection>> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const all = await listMemberships(context);
    let authorized: AccessMembership[];
    if (!filter?.outletId) {
      authorized = await authorizeEligibleSet(
        context,
        principal,
        "access.membership.read",
        all,
        membershipResource,
      );
    } else {
      const outlet = await findOutletById(context, filter.outletId);
      if (!outlet) {
        throw new AdministrationError("ADMIN_NOT_FOUND", "Outlet not found.");
      }
      await requireAuthorization(context, {
        actor: principal,
        permission: "access.membership.read",
        resource: {
          type: "outlet",
          brandId: outlet.brandId,
          organizationId: outlet.organizationId,
          territoryId: outlet.territoryId,
          outletId: outlet.id,
        },
      });
      const narrowed = all.filter(
        (membership) =>
          membership.scopeType === "outlet" && membership.outletId === outlet.id,
      );
      authorized = await authorizeEligibleSet(
        context,
        principal,
        "access.membership.read",
        narrowed,
        membershipResource,
      );
    }
    const enriched = await enrichMembershipsWithMemberLabel(context, authorized);
    return pageByTimeIdDesc(enriched, (m) => ({ at: m.createdAt, id: m.id }), {
      cursor: filter?.cursor,
      pageSize: LIST_PAGE_DEFAULT,
    });
  });
}

export async function adminGetMembership(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  membershipId: string,
): Promise<AdministrationMembershipProjection> {
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
    return enrichMembershipWithMemberLabel(context, membership);
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
): Promise<AdministrationMembershipProjection> {
  const principal = requirePrincipal(actor);
  rejectForgedAuthorityFields(body);
  const hasUserId =
    typeof body.workforceUserId === "string" && body.workforceUserId.trim().length > 0;
  const hasEmail =
    typeof body.workforceEmail === "string" && body.workforceEmail.trim().length > 0;
  if (hasUserId && hasEmail) {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      "Provide workforceUserId or workforceEmail, not both.",
    );
  }
  if (!hasUserId && !hasEmail) {
    throw new AdministrationError(
      "ADMIN_REQUEST_INVALID",
      "workforceUserId or workforceEmail is required.",
    );
  }
  const scope = parseScope(body);
  const status = body.status === "active" ? "active" : "invited";
  return persistence.transaction(async (tx) => {
    let workforceUserId: string;
    if (hasEmail) {
      // Authorize the exact requested scope BEFORE resolving identity (no enumeration).
      await requireAuthorization(tx, {
        actor: principal,
        permission: "access.membership.manage",
        resource: accessScopeToProtectedResource(scope),
      });
      const normalized = normalizeWorkforceEmail(body.workforceEmail);
      if (!normalized.ok) {
        throw new AdministrationError("ADMIN_REQUEST_INVALID", "workforceEmail is invalid.", {
          field: "workforceEmail",
        });
      }
      const user = await findWorkforceUserByEmail(tx, normalized.email);
      if (!user || user.disabledAt) {
        throw new AdministrationError("ADMIN_NOT_FOUND", "Workforce user not found.");
      }
      workforceUserId = user.id;
    } else {
      workforceUserId = (body.workforceUserId as string).trim();
    }

    const created = await createMembership(tx, {
      actor: principal,
      workforceUserId,
      scope,
      status,
    });
    return enrichMembershipWithMemberLabel(tx, created);
  });
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

export type AdministrationEffectivePermissionsProjection = Readonly<{
  subject: Readonly<{
    membershipId: string;
    workforceUserId: string;
    memberLabel: string;
  }> | null;
  resource: ProtectedResource;
  permissions: PermissionKey[];
}>;

export async function adminGetEffectivePermissions(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  query: Readonly<Record<string, string>>,
): Promise<AdministrationEffectivePermissionsProjection | PermissionKey[]> {
  const principal = requirePrincipal(actor);
  const membershipId =
    typeof query.membershipId === "string" && query.membershipId.length > 0
      ? query.membershipId
      : undefined;

  return persistence.withContext(async (context) => {
    const resource = parseResourceQuery(query);

    if (!membershipId) {
      // Caller-scoped compatibility (IMP-035).
      await requireAuthorization(context, {
        actor: principal,
        permission: "access.effective_permissions.read",
        resource,
      });
      const permissions = await getEffectivePermissions(context, { actor: principal, resource });
      return permissions;
    }

    const membership = await findMembershipById(context, membershipId);
    if (!membership) throw new AdministrationError("ADMIN_NOT_FOUND", "Membership not found.");
    const membershipRes = membershipResource(membership);
    if (!membershipRes) {
      throw new AdministrationError("ADMIN_REQUEST_INVALID", "Membership scope is invalid.");
    }

    await requireAuthorization(context, {
      actor: principal,
      permission: "access.effective_permissions.read",
      resource,
    });
    await requireAuthorization(context, {
      actor: principal,
      permission: "access.membership.read",
      resource: membershipRes,
    });

    const userRows = await context.db
      .select({
        id: workforceAuthUsers.id,
        name: workforceAuthUsers.name,
        email: workforceAuthUsers.email,
        disabledAt: workforceAuthUsers.disabledAt,
        passwordChangeRequired: workforceAuthUsers.passwordChangeRequired,
        twoFactorEnabled: workforceAuthUsers.twoFactorEnabled,
      })
      .from(workforceAuthUsers)
      .where(eq(workforceAuthUsers.id, membership.workforceUserId))
      .limit(1);
    const user = userRows[0];
    if (!user) throw new AdministrationError("ADMIN_NOT_FOUND", "Workforce user not found.");

    const subject = {
      membershipId: membership.id,
      workforceUserId: membership.workforceUserId,
      memberLabel: resolveMemberLabel({ name: user.name, email: user.email }),
    };

    let permissions: PermissionKey[] = [];
    try {
      const subjectPrincipal = createWorkforcePrincipalFromTrustedIdentity({
        workforceUserId: user.id,
        disabledAt: user.disabledAt ? new Date(user.disabledAt) : null,
        passwordChangeRequired: user.passwordChangeRequired,
        twoFactorEnabled: user.twoFactorEnabled ?? false,
      });
      permissions = await getEffectivePermissions(context, {
        actor: subjectPrincipal,
        resource,
      });
    } catch (error) {
      if (!(error instanceof WorkforcePrincipalError)) throw error;
      // Prefer grant-load path when identity flags block a login principal.
      const grants = await loadEffectiveGrants(context, {
        workforceUserId: user.id,
        disabledAt: null,
        passwordChangeRequired: false,
        twoFactorEnabled: true,
      } as WorkforcePrincipal);
      permissions = [
        ...new Set(
          grants
            .filter((grant) => assignmentCoversResource(grant.scope, grant.inheritanceMode, resource))
            .map((grant) => grant.permissionKey),
        ),
      ].sort();
    }

    return { subject, resource, permissions };
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

function parseOptionalIsoDate(value: string | undefined, field: string): Date | undefined {
  if (value === undefined) return undefined;
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) {
    throw new AdministrationError("ADMIN_REQUEST_INVALID", `${field} must be an ISO date-time.`, {
      field,
    });
  }
  return new Date(ms);
}

export async function adminListAuditEvents(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  query: AdministrationAuditListQuery = {},
): Promise<AdminContinuationPage<AccessAuditEvent>> {
  const principal = requirePrincipal(actor);
  const occurredFrom = parseOptionalIsoDate(query.occurredFrom, "occurredFrom");
  const occurredTo = parseOptionalIsoDate(query.occurredTo, "occurredTo");
  if (occurredFrom && occurredTo && occurredFrom.getTime() > occurredTo.getTime()) {
    throw new AdministrationError("ADMIN_REQUEST_INVALID", "occurredFrom must be <= occurredTo.");
  }

  return persistence.withContext(async (context) => {
    const all = await listAccessAuditEvents(context);
    let eligible = await authorizeEligibleSet(
      context,
      principal,
      "access.audit.read",
      all,
      auditResource,
    );
    if (query.actorWorkforceUserId) {
      eligible = eligible.filter((event) => event.actorWorkforceUserId === query.actorWorkforceUserId);
    }
    if (query.action) {
      eligible = eligible.filter((event) => event.action === query.action);
    }
    if (occurredFrom) {
      eligible = eligible.filter((event) => event.occurredAt.getTime() >= occurredFrom.getTime());
    }
    if (occurredTo) {
      eligible = eligible.filter((event) => event.occurredAt.getTime() <= occurredTo.getTime());
    }
    return pageByTimeIdDesc(eligible, (event) => ({ at: event.occurredAt, id: event.id }), {
      cursor: query.cursor,
      pageSize: LIST_PAGE_DEFAULT,
    });
  });
}

export type AdministrationOverview = Readonly<{
  hierarchy: Readonly<{
    brands: Readonly<{ count: number; sample: Brand[]; more: boolean }>;
    organizations: Readonly<{ count: number; sample: Organization[]; more: boolean }>;
    territories: Readonly<{ count: number; sample: Territory[]; more: boolean }>;
    legalEntities: Readonly<{ count: number; sample: LegalEntity[]; more: boolean }>;
    outlets: Readonly<{ count: number; sample: Outlet[]; more: boolean }>;
  }>;
  membershipAttention: Readonly<{
    invited: number;
    suspended: number;
    active: number;
    revoked: number;
    expired: number;
    sample: AdministrationMembershipProjection[];
    more: boolean;
  }>;
  recentAudit: Readonly<{
    items: AccessAuditEvent[];
    more: boolean;
  }>;
  operationalHealth:
    | Readonly<{ available: true; status: Readonly<Record<string, unknown>> }>
    | Readonly<{ available: false; reason: "unauthorized" }>;
}>;

const OVERVIEW_SAMPLE = 5;

export async function adminGetOverview(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
): Promise<AdministrationOverview> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const [brands, organizations, territories, legalEntities, outlets, memberships, audit] =
      await Promise.all([
        authorizeEligibleSet(
          context,
          principal,
          "brand.read",
          await listBrands(context),
          (b) => ({ type: "brand", brandId: b.id }),
        ),
        listFilteredOrganizations(context, principal),
        authorizeEligibleSet(
          context,
          principal,
          "territory.read",
          await listTerritories(context),
          (t) => ({ type: "territory", brandId: t.brandId, territoryId: t.id }),
        ),
        authorizeEligibleSet(
          context,
          principal,
          "legal_entity.read",
          await listLegalEntities(context),
          (e) => ({
            type: "legal_entity",
            brandId: e.brandId,
            organizationId: e.organizationId,
            legalEntityId: e.id,
          }),
        ),
        authorizeEligibleSet(
          context,
          principal,
          "outlet.read",
          await listOutlets(context),
          (o) => ({
            type: "outlet",
            brandId: o.brandId,
            organizationId: o.organizationId,
            territoryId: o.territoryId,
            outletId: o.id,
          }),
        ),
        authorizeEligibleSet(
          context,
          principal,
          "access.membership.read",
          await listMemberships(context),
          membershipResource,
        ),
        authorizeEligibleSet(
          context,
          principal,
          "access.audit.read",
          await listAccessAuditEvents(context),
          auditResource,
        ),
      ]);

    const attentionStatuses = ["invited", "suspended"] as const;
    const attention = memberships.filter((m) =>
      (attentionStatuses as readonly string[]).includes(m.status),
    );
    const enrichedAttention = await enrichMembershipsWithMemberLabel(
      context,
      attention.slice(0, OVERVIEW_SAMPLE),
    );

    const canReadOps = await actorHasOrderCapability(context, principal, "order.read");
    let operationalHealth: AdministrationOverview["operationalHealth"];
    if (!canReadOps) {
      operationalHealth = { available: false, reason: "unauthorized" };
    } else {
      const [queues, metrics] = await Promise.all([
        loadOperationalQueueBacklog(persistence),
        Promise.resolve(getMetricsSnapshot()),
      ]);
      operationalHealth = {
        available: true,
        status: {
          service: "operations",
          metrics,
          queues,
        },
      };
    }

    const sortName = <T extends { name: string; id: string }>(items: T[]) =>
      [...items].sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));

    const hierarchySlice = <T extends { name: string; id: string }>(items: T[]) => {
      const sorted = sortName(items);
      return {
        count: sorted.length,
        sample: sorted.slice(0, OVERVIEW_SAMPLE),
        more: sorted.length > OVERVIEW_SAMPLE,
      };
    };

    const recentAuditSorted = [...audit].sort(
      (a, b) => b.occurredAt.getTime() - a.occurredAt.getTime() || b.id.localeCompare(a.id),
    );

    return {
      hierarchy: {
        brands: hierarchySlice(brands),
        organizations: hierarchySlice(organizations),
        territories: hierarchySlice(territories),
        legalEntities: hierarchySlice(legalEntities),
        outlets: hierarchySlice(outlets),
      },
      membershipAttention: {
        invited: memberships.filter((m) => m.status === "invited").length,
        suspended: memberships.filter((m) => m.status === "suspended").length,
        active: memberships.filter((m) => m.status === "active").length,
        revoked: memberships.filter((m) => m.status === "revoked").length,
        expired: memberships.filter((m) => m.status === "expired").length,
        sample: enrichedAttention,
        more: attention.length > OVERVIEW_SAMPLE,
      },
      recentAudit: {
        items: recentAuditSorted.slice(0, OVERVIEW_SAMPLE),
        more: recentAuditSorted.length > OVERVIEW_SAMPLE,
      },
      operationalHealth,
    };
  });
}
