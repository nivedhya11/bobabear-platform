/**
 * Promotion draft administration + activation (IMP-016).
 */
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";

import {
  catalogProductsTable,
  catalogVariantsTable,
} from "../../platform/database/schema/catalog";
import {
  promotionBenefitsTable,
  promotionsTable,
  promotionTargetsTable,
} from "../../platform/database/schema/promotions";
import { chargeDefinitionsTable } from "../../platform/database/schema/pricing";
import {
  computePromotionConfigurationFingerprint,
  type PromotionBenefitConfig,
  type PromotionScopeType,
  type PromotionTargetConfig,
  type PromotionTriggerType,
  type PromotionStackingPolicy,
  type PromotionBenefitType,
  type PromotionTargetType,
  type PromotionTargetRole,
  validateBogoConfiguration,
  assertNoAmbiguousMerchandiseTargets,
  assertBogoTargetRelationship,
} from "../../shared/promotions";
import { requireWorkforcePrincipal } from "../access-control/principal";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext, assertUuid, isUniqueViolation } from "./assert-role";
import { insertPromotionAuditEvent } from "./audit";
import {
  requirePromotionManageForScope,
  requirePromotionsActivate,
  requirePromotionsRead,
} from "./authorize-promotions";
import { PromotionAdminError, PromotionNotFoundError, PromotionValidationError } from "./errors";

async function loadPromotionRow(context: PersistenceQueryContext, id: string) {
  const rows = await context.db
    .select()
    .from(promotionsTable)
    .where(eq(promotionsTable.id, id))
    .limit(1);
  return rows[0] ?? null;
}

function assertDraft(row: { status: string; activatedAt: Date | null }) {
  if (row.status !== "draft" || row.activatedAt !== null) {
    throw new PromotionAdminError("PROMOTION_NOT_DRAFT", "Promotion is not a mutable draft.");
  }
}

function validateScopeShape(input: {
  scopeType: PromotionScopeType;
  territoryId?: string | null;
  organizationId?: string | null;
  outletId?: string | null;
}) {
  const t = input.territoryId ?? null;
  const o = input.organizationId ?? null;
  const out = input.outletId ?? null;
  const ok =
    (input.scopeType === "brand" && !t && !o && !out) ||
    (input.scopeType === "territory" && t && !o && !out) ||
    (input.scopeType === "organization" && o && !t && !out) ||
    (input.scopeType === "outlet" && out && !t && !o);
  if (!ok) {
    throw new PromotionAdminError("PROMOTION_SCOPE_INVALID", "Promotion scope shape is invalid.");
  }
}

export async function createPromotionDraft(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    brandId: string;
    code: string;
    displayName: string;
    scopeType: PromotionScopeType;
    territoryId?: string | null;
    organizationId?: string | null;
    outletId?: string | null;
    triggerType: PromotionTriggerType;
    stackingPolicy?: PromotionStackingPolicy;
    priority?: number;
    startsAt: Date;
    endsAt?: Date | null;
    minimumQualifyingAmountPaise?: bigint | null;
    minimumItemQuantity?: number | null;
  },
): Promise<{ id: string }> {
  assertTransactionContext(context, "createPromotionDraft");
  const brandId = assertUuid(input.brandId, "brandId");
  validateScopeShape(input);
  if (input.endsAt && input.endsAt <= input.startsAt) {
    throw new PromotionAdminError("PROMOTION_TIME_WINDOW_INVALID", "endsAt must be after startsAt.");
  }
  await requirePromotionManageForScope(context, input.actor, {
    brandId,
    scopeType: input.scopeType,
    territoryId: input.territoryId,
    organizationId: input.organizationId,
    outletId: input.outletId,
  });
  const principal = requireWorkforcePrincipal(input.actor);
  const id = randomUUID();
  const now = new Date();
  try {
    await context.db.insert(promotionsTable).values({
      id,
      brandId,
      code: input.code,
      displayName: input.displayName,
      scopeType: input.scopeType,
      territoryId: input.territoryId ?? null,
      organizationId: input.organizationId ?? null,
      outletId: input.outletId ?? null,
      salesChannel: "direct",
      status: "draft",
      triggerType: input.triggerType,
      stackingPolicy: input.stackingPolicy ?? "exclusive",
      priority: input.priority ?? 0,
      startsAt: input.startsAt,
      endsAt: input.endsAt ?? null,
      minimumQualifyingAmountPaise: input.minimumQualifyingAmountPaise ?? null,
      minimumItemQuantity: input.minimumItemQuantity ?? null,
      configurationFingerprint: null,
      activatedAt: null,
      activatedByWorkforceUserId: null,
      retiredAt: null,
      retiredByWorkforceUserId: null,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new PromotionAdminError("conflict", "Promotion code already exists for brand.");
    }
    throw error;
  }

  await insertPromotionAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    permissionKey: "promotions.manage",
    action: "promotion.created",
    resourceType: "promotion",
    resourceId: id,
    brandId,
    territoryId: input.territoryId ?? null,
    organizationId: input.organizationId ?? null,
    outletId: input.outletId ?? null,
    metadata: { code: input.code, scopeType: input.scopeType },
  });
  return { id };
}

export async function updatePromotionDraft(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    promotionId: string;
    displayName?: string;
    stackingPolicy?: PromotionStackingPolicy;
    priority?: number;
    startsAt?: Date;
    endsAt?: Date | null;
    minimumQualifyingAmountPaise?: bigint | null;
    minimumItemQuantity?: number | null;
  },
): Promise<void> {
  assertTransactionContext(context, "updatePromotionDraft");
  const row = await loadPromotionRow(context, assertUuid(input.promotionId, "promotionId"));
  if (!row) throw new PromotionNotFoundError("promotion");
  assertDraft(row);
  await requirePromotionManageForScope(context, input.actor, {
    brandId: row.brandId,
    scopeType: row.scopeType as PromotionScopeType,
    territoryId: row.territoryId,
    organizationId: row.organizationId,
    outletId: row.outletId,
  });
  const principal = requireWorkforcePrincipal(input.actor);
  const startsAt = input.startsAt ?? row.startsAt;
  const endsAt = input.endsAt !== undefined ? input.endsAt : row.endsAt;
  if (endsAt && endsAt <= startsAt) {
    throw new PromotionAdminError("PROMOTION_TIME_WINDOW_INVALID", "endsAt must be after startsAt.");
  }
  await context.db
    .update(promotionsTable)
    .set({
      displayName: input.displayName ?? row.displayName,
      stackingPolicy: input.stackingPolicy ?? row.stackingPolicy,
      priority: input.priority ?? row.priority,
      startsAt,
      endsAt,
      minimumQualifyingAmountPaise:
        input.minimumQualifyingAmountPaise !== undefined
          ? input.minimumQualifyingAmountPaise
          : row.minimumQualifyingAmountPaise,
      minimumItemQuantity:
        input.minimumItemQuantity !== undefined
          ? input.minimumItemQuantity
          : row.minimumItemQuantity,
      updatedAt: new Date(),
    })
    .where(eq(promotionsTable.id, row.id));

  await insertPromotionAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    permissionKey: "promotions.manage",
    action: "promotion.updated",
    resourceType: "promotion",
    resourceId: row.id,
    brandId: row.brandId,
    metadata: { updated: true },
  });
}

export async function deletePromotionDraft(
  context: PersistenceTransactionContext,
  input: { actor: unknown; promotionId: string },
): Promise<void> {
  assertTransactionContext(context, "deletePromotionDraft");
  const row = await loadPromotionRow(context, assertUuid(input.promotionId, "promotionId"));
  if (!row) throw new PromotionNotFoundError("promotion");
  if (row.activatedAt !== null || row.status !== "draft") {
    throw new PromotionAdminError("PROMOTION_NOT_DRAFT", "Ever-active promotions cannot be deleted.");
  }
  await requirePromotionManageForScope(context, input.actor, {
    brandId: row.brandId,
    scopeType: row.scopeType as PromotionScopeType,
    territoryId: row.territoryId,
    organizationId: row.organizationId,
    outletId: row.outletId,
  });
  const principal = requireWorkforcePrincipal(input.actor);
  await context.db.delete(promotionsTable).where(eq(promotionsTable.id, row.id));
  await insertPromotionAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    permissionKey: "promotions.manage",
    action: "promotion.deleted",
    resourceType: "promotion",
    resourceId: row.id,
    brandId: row.brandId,
    metadata: { deleted: true },
  });
}

export async function setPromotionBenefit(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    promotionId: string;
    benefit: PromotionBenefitConfig;
  },
): Promise<void> {
  assertTransactionContext(context, "setPromotionBenefit");
  const row = await loadPromotionRow(context, assertUuid(input.promotionId, "promotionId"));
  if (!row) throw new PromotionNotFoundError("promotion");
  assertDraft(row);
  await requirePromotionManageForScope(context, input.actor, {
    brandId: row.brandId,
    scopeType: row.scopeType as PromotionScopeType,
    territoryId: row.territoryId,
    organizationId: row.organizationId,
    outletId: row.outletId,
  });
  const b = input.benefit;
  if (b.benefitType === "percentage_discount") {
    if (b.percentageBps === null || b.percentageBps <= 0 || b.percentageBps > 10000) {
      throw new PromotionAdminError("PROMOTION_BENEFIT_INVALID", "Invalid percentage_bps.");
    }
  } else if (b.benefitType === "fixed_amount_discount") {
    if (b.fixedAmountPaise === null || b.fixedAmountPaise <= BigInt(0)) {
      throw new PromotionAdminError("PROMOTION_BENEFIT_INVALID", "Invalid fixed_amount_paise.");
    }
  } else if (b.benefitType === "buy_x_get_y") {
    if (!b.buyQuantity || !b.getQuantity || b.repeatable === null) {
      throw new PromotionAdminError("PROMOTION_BENEFIT_INVALID", "Invalid BOGO fields.");
    }
  }
  const now = new Date();
  const existing = await context.db
    .select()
    .from(promotionBenefitsTable)
    .where(eq(promotionBenefitsTable.promotionId, row.id))
    .limit(1);
  const values = {
    benefitType: b.benefitType,
    percentageBps: b.percentageBps,
    fixedAmountPaise: b.fixedAmountPaise,
    maximumDiscountPaise: b.maximumDiscountPaise,
    buyQuantity: b.buyQuantity,
    getQuantity: b.getQuantity,
    repeatable: b.repeatable,
    maximumRewardQuantity: b.maximumRewardQuantity,
    includeModifiers: b.includeModifiers,
    includeBundleDeltas: b.includeBundleDeltas,
    updatedAt: now,
  };
  if (existing[0]) {
    await context.db
      .update(promotionBenefitsTable)
      .set(values)
      .where(eq(promotionBenefitsTable.id, existing[0].id));
  } else {
    await context.db.insert(promotionBenefitsTable).values({
      id: randomUUID(),
      promotionId: row.id,
      ...values,
      createdAt: now,
    });
  }
}

export async function setPromotionTargets(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    promotionId: string;
    targetRole: PromotionTargetRole;
    targets: readonly PromotionTargetConfig[];
  },
): Promise<void> {
  assertTransactionContext(context, "setPromotionTargets");
  const row = await loadPromotionRow(context, assertUuid(input.promotionId, "promotionId"));
  if (!row) throw new PromotionNotFoundError("promotion");
  assertDraft(row);
  await requirePromotionManageForScope(context, input.actor, {
    brandId: row.brandId,
    scopeType: row.scopeType as PromotionScopeType,
    territoryId: row.territoryId,
    organizationId: row.organizationId,
    outletId: row.outletId,
  });
  assertNoAmbiguousMerchandiseTargets(input.targets, input.targetRole);
  await context.db
    .delete(promotionTargetsTable)
    .where(
      and(
        eq(promotionTargetsTable.promotionId, row.id),
        eq(promotionTargetsTable.targetRole, input.targetRole),
      ),
    );
  const now = new Date();
  for (const t of input.targets) {
    await context.db.insert(promotionTargetsTable).values({
      id: randomUUID(),
      promotionId: row.id,
      targetRole: input.targetRole,
      targetType: t.targetType,
      productId: t.productId,
      variantId: t.variantId,
      chargeDefinitionId: t.chargeDefinitionId,
      createdAt: now,
    });
  }
}

async function assertTargetBrandOwnership(
  context: PersistenceTransactionContext,
  brandId: string,
  targets: readonly PromotionTargetConfig[],
) {
  for (const t of targets) {
    if (t.targetType === "product" && t.productId) {
      const rows = await context.db
        .select()
        .from(catalogProductsTable)
        .where(eq(catalogProductsTable.id, t.productId))
        .limit(1);
      if (!rows[0] || rows[0].brandId !== brandId) {
        throw new PromotionAdminError(
          "PROMOTION_TARGET_BRAND_MISMATCH",
          "Product target does not belong to promotion brand.",
        );
      }
    }
    if (t.targetType === "variant" && t.variantId) {
      const rows = await context.db
        .select()
        .from(catalogVariantsTable)
        .where(eq(catalogVariantsTable.id, t.variantId))
        .limit(1);
      if (!rows[0] || rows[0].brandId !== brandId) {
        throw new PromotionAdminError(
          "PROMOTION_TARGET_BRAND_MISMATCH",
          "Variant target does not belong to promotion brand.",
        );
      }
    }
    if (t.targetType === "charge" && t.chargeDefinitionId) {
      const rows = await context.db
        .select()
        .from(chargeDefinitionsTable)
        .where(eq(chargeDefinitionsTable.id, t.chargeDefinitionId))
        .limit(1);
      if (!rows[0]) {
        throw new PromotionValidationError("Charge definition not found.");
      }
    }
  }
}

export async function activatePromotion(
  context: PersistenceTransactionContext,
  input: { actor: unknown; promotionId: string },
): Promise<void> {
  assertTransactionContext(context, "activatePromotion");
  const row = await loadPromotionRow(context, assertUuid(input.promotionId, "promotionId"));
  if (!row) throw new PromotionNotFoundError("promotion");
  if (row.status === "active") {
    throw new PromotionAdminError("PROMOTION_ALREADY_ACTIVE", "Promotion is already active.");
  }
  if (row.status === "retired") {
    throw new PromotionAdminError("PROMOTION_RETIRED", "Retired promotions cannot activate.");
  }
  assertDraft(row);
  await requirePromotionsActivate(context, input.actor, row.brandId);
  // Still require manage scope for lower-scope governance visibility
  await requirePromotionManageForScope(context, input.actor, {
    brandId: row.brandId,
    scopeType: row.scopeType as PromotionScopeType,
    territoryId: row.territoryId,
    organizationId: row.organizationId,
    outletId: row.outletId,
  });

  const benefits = await context.db
    .select()
    .from(promotionBenefitsTable)
    .where(eq(promotionBenefitsTable.promotionId, row.id))
    .limit(1);
  const benefitRow = benefits[0];
  if (!benefitRow) {
    throw new PromotionAdminError("PROMOTION_BENEFIT_INVALID", "Benefit required before activation.");
  }
  const targets = await context.db
    .select()
    .from(promotionTargetsTable)
    .where(eq(promotionTargetsTable.promotionId, row.id));
  const qualifierTargets = targets.filter((t) => t.targetRole === "qualifier");
  const benefitTargets = targets.filter((t) => t.targetRole === "benefit");
  if (qualifierTargets.length < 1) {
    throw new PromotionAdminError(
      "PROMOTION_QUALIFIER_TARGET_REQUIRED",
      "At least one qualifier target is required.",
    );
  }
  if (benefitTargets.length < 1) {
    throw new PromotionAdminError(
      "PROMOTION_BENEFIT_TARGET_REQUIRED",
      "At least one benefit target is required.",
    );
  }

  const toConfig = (t: (typeof targets)[number]): PromotionTargetConfig => ({
    targetRole: t.targetRole as PromotionTargetRole,
    targetType: t.targetType as PromotionTargetType,
    productId: t.productId,
    variantId: t.variantId,
    chargeDefinitionId: t.chargeDefinitionId,
  });
  const qConfigs = qualifierTargets.map(toConfig);
  const bConfigs = benefitTargets.map(toConfig);
  assertNoAmbiguousMerchandiseTargets(qConfigs, "qualifier");
  assertNoAmbiguousMerchandiseTargets(bConfigs, "benefit");
  await assertTargetBrandOwnership(context, row.brandId, [...qConfigs, ...bConfigs]);

  const benefit: PromotionBenefitConfig = {
    benefitType: benefitRow.benefitType as PromotionBenefitType,
    percentageBps: benefitRow.percentageBps,
    fixedAmountPaise: benefitRow.fixedAmountPaise,
    maximumDiscountPaise: benefitRow.maximumDiscountPaise,
    buyQuantity: benefitRow.buyQuantity,
    getQuantity: benefitRow.getQuantity,
    repeatable: benefitRow.repeatable,
    maximumRewardQuantity: benefitRow.maximumRewardQuantity,
    includeModifiers: benefitRow.includeModifiers,
    includeBundleDeltas: benefitRow.includeBundleDeltas,
  };

  if (benefit.benefitType === "buy_x_get_y") {
    assertBogoTargetRelationship(qConfigs, bConfigs);
    validateBogoConfiguration({
      id: row.id,
      brandId: row.brandId,
      code: row.code,
      displayName: row.displayName,
      scopeType: row.scopeType as PromotionScopeType,
      territoryId: row.territoryId,
      organizationId: row.organizationId,
      outletId: row.outletId,
      salesChannel: "direct",
      status: "draft",
      triggerType: row.triggerType as PromotionTriggerType,
      stackingPolicy: row.stackingPolicy as PromotionStackingPolicy,
      priority: row.priority,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      minimumQualifyingAmountPaise: row.minimumQualifyingAmountPaise,
      minimumItemQuantity: row.minimumItemQuantity,
      configurationFingerprint: null,
      benefit,
      qualifierTargets: qConfigs,
      benefitTargets: bConfigs,
    });
  }

  const fingerprint = computePromotionConfigurationFingerprint({
    brandId: row.brandId,
    code: row.code,
    displayName: row.displayName,
    scopeType: row.scopeType,
    territoryId: row.territoryId,
    organizationId: row.organizationId,
    outletId: row.outletId,
    salesChannel: row.salesChannel,
    triggerType: row.triggerType,
    stackingPolicy: row.stackingPolicy,
    priority: row.priority,
    startsAt: row.startsAt.toISOString(),
    endsAt: row.endsAt ? row.endsAt.toISOString() : null,
    minimumQualifyingAmountPaise:
      row.minimumQualifyingAmountPaise === null
        ? null
        : row.minimumQualifyingAmountPaise.toString(),
    minimumItemQuantity: row.minimumItemQuantity,
    benefit,
    qualifierTargets: qConfigs,
    benefitTargets: bConfigs,
  });

  const principal = requireWorkforcePrincipal(input.actor);
  const now = new Date();
  await context.db
    .update(promotionsTable)
    .set({
      status: "active",
      activatedAt: now,
      activatedByWorkforceUserId: principal.workforceUserId,
      configurationFingerprint: fingerprint,
      updatedAt: now,
    })
    .where(eq(promotionsTable.id, row.id));

  await insertPromotionAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    permissionKey: "promotions.activate",
    action: "promotion.activated",
    resourceType: "promotion",
    resourceId: row.id,
    brandId: row.brandId,
    territoryId: row.territoryId,
    organizationId: row.organizationId,
    outletId: row.outletId,
    configurationFingerprint: fingerprint,
    metadata: { activated: true },
  });
}

export async function retirePromotion(
  context: PersistenceTransactionContext,
  input: { actor: unknown; promotionId: string },
): Promise<void> {
  assertTransactionContext(context, "retirePromotion");
  const row = await loadPromotionRow(context, assertUuid(input.promotionId, "promotionId"));
  if (!row) throw new PromotionNotFoundError("promotion");
  if (row.status !== "active") {
    throw new PromotionAdminError("invalid_state", "Only active promotions can be retired.");
  }
  await requirePromotionsActivate(context, input.actor, row.brandId);
  const principal = requireWorkforcePrincipal(input.actor);
  const now = new Date();
  await context.db
    .update(promotionsTable)
    .set({
      status: "retired",
      retiredAt: now,
      retiredByWorkforceUserId: principal.workforceUserId,
      updatedAt: now,
    })
    .where(eq(promotionsTable.id, row.id));
  await insertPromotionAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    permissionKey: "promotions.activate",
    action: "promotion.retired",
    resourceType: "promotion",
    resourceId: row.id,
    brandId: row.brandId,
    configurationFingerprint: row.configurationFingerprint,
    metadata: { retired: true },
  });
}

export async function getPromotion(context: PersistenceQueryContext, promotionId: string) {
  return loadPromotionRow(context, assertUuid(promotionId, "promotionId"));
}

export async function getPromotionForActor(
  context: PersistenceQueryContext,
  actor: unknown,
  promotionId: string,
) {
  const row = await loadPromotionRow(context, assertUuid(promotionId, "promotionId"));
  if (!row) return null;
  await requirePromotionsRead(context, actor, row.brandId);
  const [benefit] = await context.db
    .select()
    .from(promotionBenefitsTable)
    .where(eq(promotionBenefitsTable.promotionId, row.id))
    .limit(1);
  const targets = await context.db
    .select()
    .from(promotionTargetsTable)
    .where(eq(promotionTargetsTable.promotionId, row.id));
  return { promotion: row, benefit: benefit ?? null, targets };
}

export async function listPromotions(
  context: PersistenceQueryContext,
  actor: unknown,
  brandId: string,
) {
  await requirePromotionsRead(context, actor, brandId);
  return context.db
    .select()
    .from(promotionsTable)
    .where(eq(promotionsTable.brandId, assertUuid(brandId, "brandId")));
}

export async function loadPromotionDefinitionByIds(
  context: PersistenceQueryContext,
  ids: readonly string[],
) {
  if (ids.length === 0) return [];
  const rows = await context.db
    .select()
    .from(promotionsTable)
    .where(inArray(promotionsTable.id, [...ids]));
  return rows;
}
