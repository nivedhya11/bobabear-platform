/**
 * Shared fixtures for IMP-011 access-control PostgreSQL integration tests.
 */
import { randomBytes } from "node:crypto";

import { workforceAuthUsers } from "../../../src/platform/database/schema/workforce-auth";
import {
  createWorkforcePrincipalFromTrustedIdentity,
  type WorkforcePrincipal,
} from "../../../src/server/access-control";
import {
  createBrand,
  createLegalEntity,
  createOrganization,
  createOutlet,
  createTerritory,
  type Brand,
  type LegalEntity,
  type Organization,
  type Outlet,
  type Territory,
} from "../../../src/server/organization";
import type { Persistence, PersistenceTransactionContext } from "../../../src/server/persistence/types";

export type SeededBrandTree = Readonly<{
  brand: Brand;
  orgA: Organization;
  orgB: Organization;
  terrA: Territory;
  terrB: Territory;
  leA: LegalEntity;
  leB: LegalEntity;
  outletA: Outlet;
  outletB: Outlet;
}>;

function fixtureId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`;
}

function fixtureEmail(label: string): string {
  return `${label}.${randomBytes(4).toString("hex")}@example.invalid`;
}

export type CreateWorkforceUserInput = Readonly<{
  email?: string;
  name?: string;
}>;

export type WorkforceUserFixture = Readonly<{
  id: string;
  email: string;
  name: string;
}>;

async function insertWorkforceUser(
  persistence: Persistence,
  values: {
    id: string;
    email: string;
    name: string;
    passwordChangeRequired: boolean;
    twoFactorEnabled: boolean | null;
    disabledAt: Date | null;
  },
): Promise<WorkforceUserFixture> {
  const now = new Date();
  await persistence.withContext(async (ctx) => {
    await ctx.db.insert(workforceAuthUsers).values({
      id: values.id,
      name: values.name,
      email: values.email,
      emailVerified: true,
      image: null,
      createdAt: now,
      updatedAt: now,
      twoFactorEnabled: values.twoFactorEnabled,
      passwordChangeRequired: values.passwordChangeRequired,
      disabledAt: values.disabledAt,
    });
  });
  return { id: values.id, email: values.email, name: values.name };
}

/** Eligible workforce user: MFA on, password change cleared, not disabled. */
export async function createEligibleWorkforceUser(
  persistence: Persistence,
  input: CreateWorkforceUserInput = {},
): Promise<WorkforceUserFixture> {
  return insertWorkforceUser(persistence, {
    id: fixtureId("wf"),
    email: input.email ?? fixtureEmail("eligible"),
    name: input.name ?? "Eligible Operator",
    passwordChangeRequired: false,
    twoFactorEnabled: true,
    disabledAt: null,
  });
}

export async function createDisabledWorkforceUser(
  persistence: Persistence,
  input: CreateWorkforceUserInput = {},
): Promise<WorkforceUserFixture> {
  return insertWorkforceUser(persistence, {
    id: fixtureId("wf_dis"),
    email: input.email ?? fixtureEmail("disabled"),
    name: input.name ?? "Disabled Operator",
    passwordChangeRequired: false,
    twoFactorEnabled: true,
    disabledAt: new Date("2024-01-01T00:00:00.000Z"),
  });
}

export async function createPasswordChangeRequiredWorkforceUser(
  persistence: Persistence,
  input: CreateWorkforceUserInput = {},
): Promise<WorkforceUserFixture> {
  return insertWorkforceUser(persistence, {
    id: fixtureId("wf_pcr"),
    email: input.email ?? fixtureEmail("pcr"),
    name: input.name ?? "Password Change Required",
    passwordChangeRequired: true,
    twoFactorEnabled: true,
    disabledAt: null,
  });
}

export async function createMfaDisabledWorkforceUser(
  persistence: Persistence,
  input: CreateWorkforceUserInput = {},
): Promise<WorkforceUserFixture> {
  return insertWorkforceUser(persistence, {
    id: fixtureId("wf_nomfa"),
    email: input.email ?? fixtureEmail("nomfa"),
    name: input.name ?? "No MFA Operator",
    passwordChangeRequired: false,
    twoFactorEnabled: false,
    disabledAt: null,
  });
}

/** Brand + two sibling orgs/territories/legal entities/outlets for isolation tests. */
export async function seedBrandTree(
  tx: PersistenceTransactionContext,
  codePrefix = "ac",
): Promise<SeededBrandTree> {
  const brand = await createBrand(tx, {
    code: `${codePrefix}-brand-${randomBytes(3).toString("hex")}`,
    name: "Access Control Brand",
  });
  const orgA = await createOrganization(tx, {
    brandId: brand.id,
    code: `${codePrefix}-org-a`,
    name: "Organization A",
  });
  const orgB = await createOrganization(tx, {
    brandId: brand.id,
    code: `${codePrefix}-org-b`,
    name: "Organization B",
  });
  const terrA = await createTerritory(tx, {
    brandId: brand.id,
    code: `${codePrefix}-terr-a`,
    name: "Territory A",
  });
  const terrB = await createTerritory(tx, {
    brandId: brand.id,
    code: `${codePrefix}-terr-b`,
    name: "Territory B",
  });
  const leA = await createLegalEntity(tx, {
    brandId: brand.id,
    organizationId: orgA.id,
    code: `${codePrefix}-le-a`,
    name: "Legal Entity A",
  });
  const leB = await createLegalEntity(tx, {
    brandId: brand.id,
    organizationId: orgB.id,
    code: `${codePrefix}-le-b`,
    name: "Legal Entity B",
  });
  const outletA = await createOutlet(tx, {
    brandId: brand.id,
    organizationId: orgA.id,
    territoryId: terrA.id,
    legalEntityId: leA.id,
    code: `${codePrefix}-out-a`,
    name: "Outlet A",
  });
  const outletB = await createOutlet(tx, {
    brandId: brand.id,
    organizationId: orgB.id,
    territoryId: terrB.id,
    legalEntityId: leB.id,
    code: `${codePrefix}-out-b`,
    name: "Outlet B",
  });
  return { brand, orgA, orgB, terrA, terrB, leA, leB, outletA, outletB };
}

export function principalFor(userId: string): WorkforcePrincipal {
  return createWorkforcePrincipalFromTrustedIdentity({
    workforceUserId: userId,
    disabledAt: null,
    passwordChangeRequired: false,
    twoFactorEnabled: true,
  });
}
