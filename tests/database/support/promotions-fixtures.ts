/**
 * Shared fixtures for IMP-016 promotions PostgreSQL integration tests.
 */
import { randomBytes } from "node:crypto";

import type { WebConfig } from "../../../src/platform/config";
import {
  bootstrapPlatformSuperAdmin,
  createMembership,
  grantRole,
} from "../../../src/server/access-control";
import { createProduct } from "../../../src/server/catalog/products";
import { createVariant } from "../../../src/server/catalog/variants";
import { getApplicationPersistence } from "../../../src/server/persistence";
import type { Persistence } from "../../../src/server/persistence/types";
import {
  activatePromotion,
  createPromotionDraft,
  setPromotionBenefit,
  setPromotionTargets,
  updateBrandPromotionPolicy,
} from "../../../src/server/promotions";
import {
  createEligibleWorkforceUser,
  principalFor,
  seedBrandTree,
  type SeededBrandTree,
  type WorkforceUserFixture,
} from "./access-control-fixtures";

export function applicationConfig(databaseUrl: string): WebConfig {
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

export function uniqueCode(prefix: string): string {
  return `${prefix}-${randomBytes(3).toString("hex")}`;
}

export type PromotionsHarness = Readonly<{
  persistence: Persistence;
  tree: SeededBrandTree;
  brandAdmin: WorkforceUserFixture;
  brandAdminPrincipal: ReturnType<typeof principalFor>;
}>;

export async function seedPromotionsHarness(
  databaseUrl: string,
  openHandles: Array<{ close(): Promise<void> }>,
): Promise<PromotionsHarness> {
  const persistence = getApplicationPersistence(applicationConfig(databaseUrl));
  openHandles.push(persistence);

  const psa = await createEligibleWorkforceUser(persistence);
  await bootstrapPlatformSuperAdmin({ persistence, workforceUserId: psa.id });

  const tree = await persistence.transaction((tx) => seedBrandTree(tx, "p16"));
  const brandAdmin = await createEligibleWorkforceUser(persistence);
  await persistence.transaction(async (tx) => {
    const membership = await createMembership(tx, {
      workforceUserId: brandAdmin.id,
      scope: { scopeType: "brand", brandId: tree.brand.id },
      status: "active",
    });
    await grantRole(tx, { membershipId: membership.id, roleKey: "brand_admin" });
  });

  return {
    persistence,
    tree,
    brandAdmin,
    brandAdminPrincipal: principalFor(brandAdmin.id),
  };
}

export async function createReadyDraftPromotion(
  harness: PromotionsHarness,
  input: {
    code?: string;
    scopeType?: "brand" | "territory" | "organization" | "outlet";
    territoryId?: string | null;
    organizationId?: string | null;
    outletId?: string | null;
    triggerType?: "automatic" | "coupon";
    stackingPolicy?: "exclusive" | "combinable";
    startsAt?: Date;
    endsAt?: Date | null;
    actor?: ReturnType<typeof principalFor>;
  } = {},
): Promise<{ id: string }> {
  const actor = input.actor ?? harness.brandAdminPrincipal;
  const scopeType = input.scopeType ?? "brand";
  return harness.persistence.transaction(async (tx) => {
    const created = await createPromotionDraft(tx, {
      actor,
      brandId: harness.tree.brand.id,
      code: input.code ?? uniqueCode("promo"),
      displayName: "Test Promo",
      scopeType,
      territoryId: input.territoryId ?? null,
      organizationId: input.organizationId ?? null,
      outletId: input.outletId ?? null,
      triggerType: input.triggerType ?? "automatic",
      stackingPolicy: input.stackingPolicy ?? "exclusive",
      startsAt: input.startsAt ?? new Date("2026-01-01T00:00:00Z"),
      endsAt: input.endsAt ?? null,
    });
    await setPromotionBenefit(tx, {
      actor,
      promotionId: created.id,
      benefit: {
        benefitType: "percentage_discount",
        percentageBps: 1000,
        fixedAmountPaise: null,
        maximumDiscountPaise: null,
        buyQuantity: null,
        getQuantity: null,
        repeatable: null,
        maximumRewardQuantity: null,
        includeModifiers: false,
        includeBundleDeltas: false,
      },
    });
    await setPromotionTargets(tx, {
      actor,
      promotionId: created.id,
      targetRole: "qualifier",
      targets: [
        {
          targetRole: "qualifier",
          targetType: "all_merchandise",
          productId: null,
          variantId: null,
          chargeDefinitionId: null,
        },
      ],
    });
    await setPromotionTargets(tx, {
      actor,
      promotionId: created.id,
      targetRole: "benefit",
      targets: [
        {
          targetRole: "benefit",
          targetType: "all_merchandise",
          productId: null,
          variantId: null,
          chargeDefinitionId: null,
        },
      ],
    });
    return created;
  });
}

export async function createAndActivatePromotion(
  harness: PromotionsHarness,
  input: Parameters<typeof createReadyDraftPromotion>[1] = {},
): Promise<{ id: string }> {
  const draft = await createReadyDraftPromotion(harness, input);
  await harness.persistence.transaction(async (tx) => {
    await activatePromotion(tx, {
      actor: harness.brandAdminPrincipal,
      promotionId: draft.id,
    });
  });
  return draft;
}

export async function enableOutletDelegation(harness: PromotionsHarness): Promise<void> {
  await harness.persistence.transaction(async (tx) => {
    await updateBrandPromotionPolicy(tx, {
      actor: harness.brandAdminPrincipal,
      brandId: harness.tree.brand.id,
      allowTerritoryPromotions: false,
      allowOrganizationPromotions: false,
      allowOutletPromotions: true,
    });
  });
}

export async function createCatalogProductVariant(
  harness: PromotionsHarness,
  brandId: string,
  codePrefix: string,
): Promise<{ productId: string; variantId: string }> {
  return harness.persistence.transaction(async (tx) => {
    const product = await createProduct(tx, {
      actor: harness.brandAdminPrincipal,
      brandId,
      code: uniqueCode(codePrefix),
      name: "Promo Product",
      productKind: "standard",
    });
    const variant = await createVariant(tx, {
      actor: harness.brandAdminPrincipal,
      productId: product.id,
      code: "default",
      name: "Default",
      isDefault: true,
      isSelectorVisible: false,
    });
    return { productId: product.id, variantId: variant.id };
  });
}
