/**
 * Assessment role provisioning — hierarchy-by-code + idempotent grants (IMP-038).
 */
import { afterEach, describe, expect, inject, it } from "vitest";

import { brandsTable } from "../../../src/platform/database/schema/organizations";
import type { WebConfig } from "../../../src/platform/config";
import { bootstrapPlatformSuperAdmin } from "../../../src/server/access-control";
import {
  adminCreateLegalEntity,
  adminCreateMembership,
  adminCreateOrganization,
  adminCreateOutlet,
  adminCreateTerritory,
  adminGrantRole,
  adminTransitionMembership,
} from "../../../src/server/administration/use-cases";
import { getApplicationPersistence } from "../../../src/server/persistence";
import {
  ASSESSMENT_ORG,
  ASSESSMENT_OUTLET,
  ASSESSMENT_TERRITORY,
  CANONICAL_BRAND_ID,
  ensureAssessmentGrant,
  resolveAssessmentHierarchy,
  type AssessmentHierarchy,
} from "../../../scripts/access/assessment-role-provisioning";
import {
  createEligibleWorkforceUser,
  principalFor,
} from "../../database/support/access-control-fixtures";
import { applyMigrations, withIsolatedTestDatabase } from "../../database/support/test-database";

function adminConnectionInfo() {
  return {
    connectionString: inject("bobaBearTestAdminConnectionString"),
    host: inject("bobaBearTestAdminHost"),
    port: inject("bobaBearTestAdminPort"),
  };
}

function applicationConfig(databaseUrl: string): WebConfig {
  return {
    environment: "test",
    processKind: "web",
    publicOrigin: "http://localhost:3000",
    logLevel: "warn",
    release: null,
    allowUnsafeAdapters: true,
    databaseSslMode: "disable",
    port: 3000,
    databaseUrl,
  };
}

const openHandles: Array<{ close(): Promise<void> }> = [];
afterEach(async () => {
  await Promise.all(openHandles.splice(0).map((h) => h.close()));
});

async function withMigratedPersistence<T>(
  fn: (persistence: ReturnType<typeof getApplicationPersistence>) => Promise<T>,
): Promise<T> {
  return withIsolatedTestDatabase(adminConnectionInfo(), async (database) => {
    await applyMigrations(database.connectionString);
    const persistence = getApplicationPersistence(applicationConfig(database.connectionString));
    openHandles.push(persistence);
    return fn(persistence);
  });
}

async function seedCanonicalBrand(
  persistence: ReturnType<typeof getApplicationPersistence>,
): Promise<void> {
  const now = new Date();
  await persistence.withContext(async (ctx) => {
    await ctx.db.insert(brandsTable).values({
      id: CANONICAL_BRAND_ID,
      code: "boba-bear",
      name: "BOBA Bear",
      status: "active",
      createdAt: now,
      updatedAt: now,
    });
  });
}

async function seedDehradunHierarchy(
  persistence: ReturnType<typeof getApplicationPersistence>,
  actorId: string,
): Promise<AssessmentHierarchy> {
  const actor = principalFor(actorId);
  const organization = await adminCreateOrganization(persistence, actor, {
    brandId: CANONICAL_BRAND_ID,
    code: ASSESSMENT_ORG.code,
    name: ASSESSMENT_ORG.name,
  });
  const territory = await adminCreateTerritory(persistence, actor, {
    brandId: CANONICAL_BRAND_ID,
    code: ASSESSMENT_TERRITORY.code,
    name: ASSESSMENT_TERRITORY.name,
  });
  const legalEntity = await adminCreateLegalEntity(persistence, actor, {
    brandId: CANONICAL_BRAND_ID,
    organizationId: organization.id,
    code: "nivedhya11-hospitality",
    name: "Nivedhya11 Hospitality Pvt Ltd",
  });
  const outlet = await adminCreateOutlet(persistence, actor, {
    brandId: CANONICAL_BRAND_ID,
    organizationId: organization.id,
    territoryId: territory.id,
    legalEntityId: legalEntity.id,
    code: ASSESSMENT_OUTLET.code,
    name: ASSESSMENT_OUTLET.name,
  });
  return Object.freeze({
    brandId: CANONICAL_BRAND_ID,
    organizationId: organization.id,
    territoryId: territory.id,
    outletId: outlet.id,
  });
}

async function bootstrapPsa(persistence: ReturnType<typeof getApplicationPersistence>) {
  const user = await createEligibleWorkforceUser(persistence, {
    email: `psa.${Date.now()}@example.invalid`,
  });
  await bootstrapPlatformSuperAdmin({ persistence, workforceUserId: user.id });
  return user;
}

describe("assessment role provisioning", () => {
  it("resolves hierarchy by stable codes across rebuilt UUID sets", async () => {
    const first = await withMigratedPersistence(async (persistence) => {
      const psa = await bootstrapPsa(persistence);
      await seedCanonicalBrand(persistence);
      const seeded = await seedDehradunHierarchy(persistence, psa.id);
      const resolved = await resolveAssessmentHierarchy(persistence, principalFor(psa.id));
      expect(resolved).toEqual(seeded);
      return resolved;
    });

    const second = await withMigratedPersistence(async (persistence) => {
      const psa = await bootstrapPsa(persistence);
      await seedCanonicalBrand(persistence);
      const seeded = await seedDehradunHierarchy(persistence, psa.id);
      const resolved = await resolveAssessmentHierarchy(persistence, principalFor(psa.id));
      expect(resolved).toEqual(seeded);
      return resolved;
    });

    expect(first.organizationId).not.toBe(second.organizationId);
    expect(first.territoryId).not.toBe(second.territoryId);
    expect(first.outletId).not.toBe(second.outletId);
    expect(first.brandId).toBe(second.brandId);
  });

  it("fails closed when the expected outlet code is absent", async () => {
    await withMigratedPersistence(async (persistence) => {
      const psa = await bootstrapPsa(persistence);
      await seedCanonicalBrand(persistence);
      await adminCreateOrganization(persistence, principalFor(psa.id), {
        brandId: CANONICAL_BRAND_ID,
        code: ASSESSMENT_ORG.code,
        name: ASSESSMENT_ORG.name,
      });
      await adminCreateTerritory(persistence, principalFor(psa.id), {
        brandId: CANONICAL_BRAND_ID,
        code: ASSESSMENT_TERRITORY.code,
        name: ASSESSMENT_TERRITORY.name,
      });
      await expect(
        resolveAssessmentHierarchy(persistence, principalFor(psa.id)),
      ).rejects.toThrow(/Assessment hierarchy missing: outlet/);
    });
  });

  it("clean first run + repeat run + membership-exists/role-missing + already-present", async () => {
    await withMigratedPersistence(async (persistence) => {
      const psa = await bootstrapPsa(persistence);
      await seedCanonicalBrand(persistence);
      const hierarchy = await seedDehradunHierarchy(persistence, psa.id);
      const assessor = await createEligibleWorkforceUser(persistence, {
        email: "assessor.ops@bobabear.assessment.test",
      });
      const actor = principalFor(psa.id);
      const grant = {
        email: assessor.email,
        scopeType: "outlet" as const,
        roleKey: "outlet_manager" as const,
      };

      const first = await ensureAssessmentGrant(persistence, actor, hierarchy, grant);
      expect(first.membershipReused).toBe(false);
      expect(first.assignmentReused).toBe(false);
      expect(first.roleKey).toBe("outlet_manager");

      const repeat = await ensureAssessmentGrant(persistence, actor, hierarchy, grant);
      expect(repeat.membershipId).toBe(first.membershipId);
      expect(repeat.assignmentId).toBe(first.assignmentId);
      expect(repeat.membershipReused).toBe(true);
      expect(repeat.assignmentReused).toBe(true);

      // Membership exists / role missing: revoke is out of scope — simulate by
      // creating membership only for a second assessor, then ensuring grant.
      const assessor2 = await createEligibleWorkforceUser(persistence, {
        email: "assessor.refund@bobabear.assessment.test",
      });
      const membershipOnly = await adminCreateMembership(persistence, actor, {
        workforceEmail: assessor2.email,
        scopeType: "outlet",
        status: "active",
        brandId: hierarchy.brandId,
        organizationId: hierarchy.organizationId,
        territoryId: hierarchy.territoryId,
        outletId: hierarchy.outletId,
      });
      const roleFilled = await ensureAssessmentGrant(persistence, actor, hierarchy, {
        email: assessor2.email,
        scopeType: "outlet",
        roleKey: "support_refund_operator",
      });
      expect(roleFilled.membershipId).toBe(membershipOnly.id);
      expect(roleFilled.membershipReused).toBe(true);
      expect(roleFilled.assignmentReused).toBe(false);
      expect(roleFilled.roleKey).toBe("support_refund_operator");

      const alreadyPresent = await ensureAssessmentGrant(persistence, actor, hierarchy, {
        email: assessor2.email,
        scopeType: "outlet",
        roleKey: "support_refund_operator",
      });
      expect(alreadyPresent.assignmentId).toBe(roleFilled.assignmentId);
      expect(alreadyPresent.assignmentReused).toBe(true);
    });
  });

  it("fails clearly on incompatible suspended membership state", async () => {
    await withMigratedPersistence(async (persistence) => {
      const psa = await bootstrapPsa(persistence);
      await seedCanonicalBrand(persistence);
      const hierarchy = await seedDehradunHierarchy(persistence, psa.id);
      const actor = principalFor(psa.id);

      const suspendedUser = await createEligibleWorkforceUser(persistence, {
        email: "assessor.admin@bobabear.assessment.test",
      });
      const suspendedMembership = await adminCreateMembership(persistence, actor, {
        workforceEmail: suspendedUser.email,
        scopeType: "brand",
        status: "active",
        brandId: hierarchy.brandId,
      });
      await adminTransitionMembership(persistence, actor, suspendedMembership.id, {
        toStatus: "suspended",
      });

      await expect(
        ensureAssessmentGrant(persistence, actor, hierarchy, {
          email: suspendedUser.email,
          scopeType: "brand",
          roleKey: "brand_admin",
        }),
      ).rejects.toThrow(/Incompatible assessment state.*status=suspended/);
    });
  });

  it("does not duplicate role when membership+role already granted via admin APIs", async () => {
    await withMigratedPersistence(async (persistence) => {
      const psa = await bootstrapPsa(persistence);
      await seedCanonicalBrand(persistence);
      const hierarchy = await seedDehradunHierarchy(persistence, psa.id);
      const actor = principalFor(psa.id);
      const assessor = await createEligibleWorkforceUser(persistence, {
        email: "assessor.admin@bobabear.assessment.test",
      });
      const membership = await adminCreateMembership(persistence, actor, {
        workforceEmail: assessor.email,
        scopeType: "brand",
        status: "active",
        brandId: hierarchy.brandId,
      });
      const assignment = await adminGrantRole(persistence, actor, membership.id, {
        roleKey: "brand_admin",
      });

      const ensured = await ensureAssessmentGrant(persistence, actor, hierarchy, {
        email: assessor.email,
        scopeType: "brand",
        roleKey: "brand_admin",
      });
      expect(ensured.membershipId).toBe(membership.id);
      expect(ensured.assignmentId).toBe(assignment.id);
      expect(ensured.membershipReused).toBe(true);
      expect(ensured.assignmentReused).toBe(true);
    });
  });
});
