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
  createMembership,
  createWorkforcePrincipalFromTrustedIdentity,
  findMembershipById,
  findRoleAssignmentById,
  getEffectivePermissions,
  grantRole,
  listRoleAssignmentsForMembership,
  membershipToAccessScope,
  requireAuthorization,
  revokeRole,
  transitionMembership,
  AuthorizationError,
  WorkforcePrincipalError,
  type AccessAuditEvent,
  type AccessMembership,
  type AccessRoleAssignment,
  type AccessScope,
  type MembershipTransitionTarget,
  type ProtectedResource,
  type WorkforcePrincipal,
} from "../access-control";
import { loadEffectiveGrants, type EffectiveGrant } from "../access-control/authorize";
import { assignmentCoversResource } from "../access-control/scope";
import { findWorkforceUserByEmail } from "../auth/workforce/operator/lifecycle";
import { actorHasOrderCapability } from "../order/authorize";
import { loadOperationalStatusProjection } from "../operations/operational-status";
import type { WorkerHealthReporter } from "../../platform/observability/worker-health";
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
  continuationFromOverflowPage,
  decodeNameIdCursor,
  decodeTimeIdCursor,
  encodeNameIdCursor,
  encodeTimeIdCursor,
  parseExpectedRevision,
  type AdminContinuationPage,
} from "./continuation";
import {
  countEligibleBrands,
  countEligibleLegalEntities,
  countEligibleMembershipsByStatus,
  countEligibleOrganizations,
  countEligibleOutlets,
  countEligibleTerritories,
  listEligibleAuditEventsPage,
  listEligibleBrandsPage,
  listEligibleLegalEntitiesPage,
  listEligibleMembershipsPage,
  listEligibleOrganizationsPage,
  listEligibleOutletsPage,
  listEligibleTerritoriesPage,
  sampleEligibleBrands,
  sampleEligibleLegalEntities,
  sampleEligibleOrganizations,
  sampleEligibleOutlets,
  sampleEligibleTerritories,
} from "./eligible-queries";
import {
  compileEligibleScopePlan,
  filterEligibleByGrants,
  type EligibleScopePlan,
} from "./eligible-set";
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

/** Load the actor's grant snapshot once and compile the eligible-set plan for one permission. */
async function eligiblePlanFor(
  context: PersistenceQueryContext,
  actor: WorkforcePrincipal,
  permission: PermissionKey,
): Promise<{ grants: EffectiveGrant[]; plan: EligibleScopePlan }> {
  const grants = await loadEffectiveGrants(context, actor);
  return { grants, plan: compileEligibleScopePlan(grants, permission) };
}

/**
 * Defence in depth over the compiled SQL predicate: re-check the already-fetched
 * page against the same grant snapshot. Cursor and `more` stay derived from the
 * fetched rows so a dropped row can never make the set look exhausted.
 */
function defendPage<T>(
  page: AdminContinuationPage<T>,
  grants: readonly EffectiveGrant[],
  permission: PermissionKey,
  resourceOf: (item: T) => ProtectedResource | null,
): AdminContinuationPage<T> {
  const items = filterEligibleByGrants(grants, permission, page.items, resourceOf);
  return items.length === page.items.length ? page : { ...page, items };
}

function nameIdPage<T extends { name: string; id: string }>(
  rows: readonly T[],
): AdminContinuationPage<T> {
  return continuationFromOverflowPage(rows, LIST_PAGE_DEFAULT, (last) =>
    encodeNameIdCursor({ name: last.name, id: last.id }),
  );
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
    const { grants, plan } = await eligiblePlanFor(context, principal, "brand.read");
    const rows = await listEligibleBrandsPage(context, {
      plan,
      ...(query.cursor ? { after: decodeNameIdCursor(query.cursor) } : {}),
      limit: LIST_PAGE_DEFAULT + 1,
    });
    return defendPage(nameIdPage(rows), grants, "brand.read", brandResource);
  });
}

function brandResource(brand: Brand): ProtectedResource {
  return { type: "brand", brandId: brand.id };
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

function organizationResource(organization: Organization): ProtectedResource {
  return {
    type: "organization",
    brandId: organization.brandId,
    organizationId: organization.id,
  };
}

export async function adminListOrganizations(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  query: AdministrationListQuery = {},
): Promise<AdminContinuationPage<Organization>> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const { grants, plan } = await eligiblePlanFor(context, principal, "organization.read");
    const rows = await listEligibleOrganizationsPage(context, {
      plan,
      ...(query.cursor ? { after: decodeNameIdCursor(query.cursor) } : {}),
      limit: LIST_PAGE_DEFAULT + 1,
    });
    return defendPage(nameIdPage(rows), grants, "organization.read", organizationResource);
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
    const { grants, plan } = await eligiblePlanFor(context, principal, "territory.read");
    const rows = await listEligibleTerritoriesPage(context, {
      plan,
      ...(query.cursor ? { after: decodeNameIdCursor(query.cursor) } : {}),
      limit: LIST_PAGE_DEFAULT + 1,
    });
    return defendPage(nameIdPage(rows), grants, "territory.read", territoryResource);
  });
}

function territoryResource(territory: Territory): ProtectedResource {
  return { type: "territory", brandId: territory.brandId, territoryId: territory.id };
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
    const { grants, plan } = await eligiblePlanFor(context, principal, "legal_entity.read");
    const rows = await listEligibleLegalEntitiesPage(context, {
      plan,
      ...(query.cursor ? { after: decodeNameIdCursor(query.cursor) } : {}),
      limit: LIST_PAGE_DEFAULT + 1,
    });
    return defendPage(nameIdPage(rows), grants, "legal_entity.read", legalEntityResource);
  });
}

function legalEntityResource(entity: LegalEntity): ProtectedResource {
  return {
    type: "legal_entity",
    brandId: entity.brandId,
    organizationId: entity.organizationId,
    legalEntityId: entity.id,
  };
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
    const { grants, plan } = await eligiblePlanFor(context, principal, "outlet.read");
    const rows = await listEligibleOutletsPage(context, {
      plan,
      ...(query.cursor ? { after: decodeNameIdCursor(query.cursor) } : {}),
      limit: LIST_PAGE_DEFAULT + 1,
    });
    return defendPage(nameIdPage(rows), grants, "outlet.read", outletResource);
  });
}

function outletResource(outlet: Outlet): ProtectedResource {
  return {
    type: "outlet",
    brandId: outlet.brandId,
    organizationId: outlet.organizationId,
    territoryId: outlet.territoryId,
    outletId: outlet.id,
  };
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
    const { grants, plan } = await eligiblePlanFor(context, principal, "access.membership.read");
    let outletId: string | undefined;
    if (filter?.outletId) {
      const outlet = await findOutletById(context, filter.outletId);
      if (!outlet) {
        throw new AdministrationError("ADMIN_NOT_FOUND", "Outlet not found.");
      }
      await requireAuthorization(context, {
        actor: principal,
        permission: "access.membership.read",
        resource: outletResource(outlet),
      });
      outletId = outlet.id;
    }
    const rows = await listEligibleMembershipsPage(context, {
      plan,
      ...(outletId !== undefined ? { outletId } : {}),
      ...(filter?.cursor ? { after: decodeTimeIdCursor(filter.cursor) } : {}),
      limit: LIST_PAGE_DEFAULT + 1,
    });
    const page = defendPage(
      membershipPage(rows),
      grants,
      "access.membership.read",
      membershipResource,
    );
    return {
      items: await enrichMembershipsWithMemberLabel(context, page.items),
      nextCursor: page.nextCursor,
      more: page.more,
    };
  });
}

function membershipPage(
  rows: readonly AccessMembership[],
): AdminContinuationPage<AccessMembership> {
  return continuationFromOverflowPage(rows, LIST_PAGE_DEFAULT, (last) =>
    encodeTimeIdCursor({ at: last.createdAt, id: last.id }),
  );
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
    const { grants, plan } = await eligiblePlanFor(context, principal, "access.audit.read");
    if (plan.kind === "none") {
      throw new AuthorizationError();
    }

    const rows = await listEligibleAuditEventsPage(context, {
      plan,
      ...(query.cursor ? { after: decodeTimeIdCursor(query.cursor) } : {}),
      ...(query.actorWorkforceUserId
        ? { actorWorkforceUserId: query.actorWorkforceUserId }
        : {}),
      ...(query.action ? { action: query.action } : {}),
      ...(occurredFrom ? { occurredFrom } : {}),
      ...(occurredTo ? { occurredTo } : {}),
      limit: LIST_PAGE_DEFAULT + 1,
    });
    const page = continuationFromOverflowPage(rows, LIST_PAGE_DEFAULT, (last) =>
      encodeTimeIdCursor({ at: last.occurredAt, id: last.id }),
    );
    return defendPage(page, grants, "access.audit.read", auditResource);
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

const MEMBERSHIP_ATTENTION_STATUSES = ["invited", "suspended"] as const satisfies readonly AccessMembership["status"][];

export type AdministrationOpsRuntime = Readonly<{
  serviceName?: string;
  startedAt?: Date;
  workers?: readonly WorkerHealthReporter[];
}>;

/** Count + first-page sample over the actor's eligible set for one collection. */
function hierarchySlice<T>(
  count: number,
  sample: readonly T[],
): Readonly<{ count: number; sample: T[]; more: boolean }> {
  return { count, sample: [...sample], more: count > OVERVIEW_SAMPLE };
}

export async function adminGetOverview(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  opsRuntime?: AdministrationOpsRuntime,
): Promise<AdministrationOverview> {
  const principal = requirePrincipal(actor);
  return persistence.withContext(async (context) => {
    const grants = await loadEffectiveGrants(context, principal);
    const brandPlan = compileEligibleScopePlan(grants, "brand.read");
    const organizationPlan = compileEligibleScopePlan(grants, "organization.read");
    const territoryPlan = compileEligibleScopePlan(grants, "territory.read");
    const legalEntityPlan = compileEligibleScopePlan(grants, "legal_entity.read");
    const outletPlan = compileEligibleScopePlan(grants, "outlet.read");
    const membershipPlan = compileEligibleScopePlan(grants, "access.membership.read");
    const auditPlan = compileEligibleScopePlan(grants, "access.audit.read");

    const [
      brandCount,
      brandSample,
      organizationCount,
      organizationSample,
      territoryCount,
      territorySample,
      legalEntityCount,
      legalEntitySample,
      outletCount,
      outletSample,
      membershipCounts,
      attentionRows,
      auditRows,
    ] = await Promise.all([
      countEligibleBrands(context, brandPlan),
      sampleEligibleBrands(context, brandPlan, OVERVIEW_SAMPLE),
      countEligibleOrganizations(context, organizationPlan),
      sampleEligibleOrganizations(context, organizationPlan, OVERVIEW_SAMPLE),
      countEligibleTerritories(context, territoryPlan),
      sampleEligibleTerritories(context, territoryPlan, OVERVIEW_SAMPLE),
      countEligibleLegalEntities(context, legalEntityPlan),
      sampleEligibleLegalEntities(context, legalEntityPlan, OVERVIEW_SAMPLE),
      countEligibleOutlets(context, outletPlan),
      sampleEligibleOutlets(context, outletPlan, OVERVIEW_SAMPLE),
      countEligibleMembershipsByStatus(context, membershipPlan),
      listEligibleMembershipsPage(context, {
        plan: membershipPlan,
        statuses: MEMBERSHIP_ATTENTION_STATUSES,
        limit: OVERVIEW_SAMPLE,
      }),
      listEligibleAuditEventsPage(context, { plan: auditPlan, limit: OVERVIEW_SAMPLE + 1 }),
    ]);

    const attentionCount = MEMBERSHIP_ATTENTION_STATUSES.reduce(
      (total, status) => total + membershipCounts[status],
      0,
    );
    const enrichedAttention = await enrichMembershipsWithMemberLabel(
      context,
      filterEligibleByGrants(
        grants,
        "access.membership.read",
        attentionRows,
        membershipResource,
      ),
    );
    const recentAudit = filterEligibleByGrants(
      grants,
      "access.audit.read",
      auditRows,
      auditResource,
    );

    const canReadOps = await actorHasOrderCapability(context, principal, "order.read");
    let operationalHealth: AdministrationOverview["operationalHealth"];
    if (!canReadOps) {
      operationalHealth = { available: false, reason: "unauthorized" };
    } else {
      const status = await loadOperationalStatusProjection({
        persistence,
        serviceName: opsRuntime?.serviceName ?? "operations",
        ...(opsRuntime?.startedAt ? { startedAt: opsRuntime.startedAt } : {}),
        ...(opsRuntime?.workers ? { workers: opsRuntime.workers } : {}),
      });
      operationalHealth = {
        available: true,
        status: {
          service: status.service,
          uptimeSeconds: status.uptimeSeconds,
          metrics: status.metrics,
          workers: status.workers,
          queues: status.queues,
        },
      };
    }

    return {
      hierarchy: {
        brands: hierarchySlice(brandCount, brandSample),
        organizations: hierarchySlice(organizationCount, organizationSample),
        territories: hierarchySlice(territoryCount, territorySample),
        legalEntities: hierarchySlice(legalEntityCount, legalEntitySample),
        outlets: hierarchySlice(outletCount, outletSample),
      },
      membershipAttention: {
        invited: membershipCounts.invited,
        suspended: membershipCounts.suspended,
        active: membershipCounts.active,
        revoked: membershipCounts.revoked,
        expired: membershipCounts.expired,
        sample: enrichedAttention,
        more: attentionCount > OVERVIEW_SAMPLE,
      },
      recentAudit: {
        items: recentAudit.slice(0, OVERVIEW_SAMPLE),
        more: auditRows.length > OVERVIEW_SAMPLE,
      },
      operationalHealth,
    };
  });
}

/**
 * Exhaustive eligible-set traversal for trusted server callers (bootstrap /
 * reconciliation). HTTP callers must keep using the continuation pages.
 */
async function drainPages<T>(
  loadPage: (cursor: string | undefined) => Promise<AdminContinuationPage<T>>,
): Promise<T[]> {
  const all: T[] = [];
  let cursor: string | undefined;
  for (;;) {
    const page = await loadPage(cursor);
    all.push(...page.items);
    if (!page.more || !page.nextCursor) return all;
    cursor = page.nextCursor;
  }
}

export async function adminListAllBrands(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
): Promise<Brand[]> {
  return drainPages((cursor) => adminListBrands(persistence, actor, { ...(cursor ? { cursor } : {}) }));
}

export async function adminListAllOrganizations(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
): Promise<Organization[]> {
  return drainPages((cursor) =>
    adminListOrganizations(persistence, actor, { ...(cursor ? { cursor } : {}) }),
  );
}

export async function adminListAllTerritories(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
): Promise<Territory[]> {
  return drainPages((cursor) =>
    adminListTerritories(persistence, actor, { ...(cursor ? { cursor } : {}) }),
  );
}

export async function adminListAllLegalEntities(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
): Promise<LegalEntity[]> {
  return drainPages((cursor) =>
    adminListLegalEntities(persistence, actor, { ...(cursor ? { cursor } : {}) }),
  );
}

export async function adminListAllOutlets(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
): Promise<Outlet[]> {
  return drainPages((cursor) =>
    adminListOutlets(persistence, actor, { ...(cursor ? { cursor } : {}) }),
  );
}

export async function adminListAllMemberships(
  persistence: Persistence,
  actor: WorkforcePrincipal | null,
  filter?: Readonly<{ outletId?: string }>,
): Promise<AdministrationMembershipProjection[]> {
  return drainPages((cursor) =>
    adminListMemberships(persistence, actor, {
      ...(filter?.outletId ? { outletId: filter.outletId } : {}),
      ...(cursor ? { cursor } : {}),
    }),
  );
}
