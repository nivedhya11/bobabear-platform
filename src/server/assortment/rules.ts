/**
 * Assortment rule mutations (IMP-014).
 */
import { randomUUID } from "node:crypto";

import { and, eq } from "drizzle-orm";

import type { AssortmentScopeType } from "../../shared/assortment";
import { assortmentRulesTable } from "../../platform/database/schema/assortment";
import { requireWorkforcePrincipal } from "../access-control/principal";
import { findModifierOptionById } from "../catalog/modifiers";
import { findProductById } from "../catalog/products";
import { findVariantById } from "../catalog/variants";
import { findOrganizationById } from "../organization/organizations";
import { findOutletById } from "../organization/outlets";
import { findTerritoryById } from "../organization/territories";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import {
  assertApplicationRole,
  assertTransactionContext,
  assertUuid,
  isUniqueViolation,
  normalizeOptionalReasonCode,
} from "./assert-role";
import { insertAssortmentAuditEvent } from "./audit";
import { requireAssortmentManage } from "./authorize-assortment";
import {
  AssortmentConflictError,
  AssortmentInvalidStateError,
  AssortmentNotFoundError,
  AssortmentValidationError,
} from "./errors";
import type {
  AssortmentRule,
  ExcludeModifierOptionAtScopeInput,
  ExcludeProductAtScopeInput,
  ExcludeVariantAtScopeInput,
  IncludeBrandVariantInput,
  RetireAssortmentRuleInput,
} from "./types";

function rowToRule(row: typeof assortmentRulesTable.$inferSelect): AssortmentRule {
  return {
    id: row.id,
    brandId: row.brandId,
    scopeType: row.scopeType as AssortmentRule["scopeType"],
    territoryId: row.territoryId,
    organizationId: row.organizationId,
    outletId: row.outletId,
    targetType: row.targetType as AssortmentRule["targetType"],
    productId: row.productId,
    variantId: row.variantId,
    modifierOptionId: row.modifierOptionId,
    decision: row.decision as AssortmentRule["decision"],
    status: row.status as AssortmentRule["status"],
    reasonCode: row.reasonCode,
    createdByWorkforceUserId: row.createdByWorkforceUserId,
    retiredByWorkforceUserId: row.retiredByWorkforceUserId,
    createdAt: new Date(row.createdAt),
    retiredAt: row.retiredAt ? new Date(row.retiredAt) : null,
  };
}

type ResolvedScope = Readonly<{
  scopeType: AssortmentScopeType;
  territoryId: string | null;
  organizationId: string | null;
  outletId: string | null;
}>;

async function resolveExcludeScope(
  context: PersistenceTransactionContext,
  brandId: string,
  input: {
    scopeType: AssortmentScopeType;
    territoryId?: string | null;
    organizationId?: string | null;
    outletId?: string | null;
  },
): Promise<ResolvedScope> {
  if (input.scopeType === "brand") {
    if (input.territoryId || input.organizationId || input.outletId) {
      throw new AssortmentValidationError({
        message: "brand scope must not include territory, organization, or outlet ids.",
      });
    }
    return {
      scopeType: "brand",
      territoryId: null,
      organizationId: null,
      outletId: null,
    };
  }

  if (input.scopeType === "territory") {
    const territoryId = assertUuid(input.territoryId, "territoryId");
    if (input.organizationId || input.outletId) {
      throw new AssortmentValidationError({
        message: "territory scope must not include organization or outlet ids.",
      });
    }
    const territory = await findTerritoryById(context, territoryId);
    if (!territory) throw new AssortmentNotFoundError("territory");
    if (territory.brandId !== brandId) {
      throw new AssortmentValidationError({
        message: "territory must belong to the assortment brand.",
      });
    }
    return {
      scopeType: "territory",
      territoryId: territory.id,
      organizationId: null,
      outletId: null,
    };
  }

  if (input.scopeType === "organization") {
    const organizationId = assertUuid(input.organizationId, "organizationId");
    if (input.territoryId || input.outletId) {
      throw new AssortmentValidationError({
        message: "organization scope must not include territory or outlet ids.",
      });
    }
    const organization = await findOrganizationById(context, organizationId);
    if (!organization) throw new AssortmentNotFoundError("organization");
    if (organization.brandId !== brandId) {
      throw new AssortmentValidationError({
        message: "organization must belong to the assortment brand.",
      });
    }
    return {
      scopeType: "organization",
      territoryId: null,
      organizationId: organization.id,
      outletId: null,
    };
  }

  if (input.scopeType === "outlet") {
    const outletId = assertUuid(input.outletId, "outletId");
    const outlet = await findOutletById(context, outletId);
    if (!outlet) throw new AssortmentNotFoundError("outlet");
    if (outlet.brandId !== brandId) {
      throw new AssortmentValidationError({
        message: "outlet must belong to the assortment brand.",
      });
    }
    return {
      scopeType: "outlet",
      territoryId: outlet.territoryId,
      organizationId: outlet.organizationId,
      outletId: outlet.id,
    };
  }

  throw new AssortmentValidationError({ message: "Invalid assortment scopeType." });
}

export async function includeBrandVariant(
  context: PersistenceTransactionContext,
  input: IncludeBrandVariantInput,
): Promise<AssortmentRule> {
  assertTransactionContext(context, "includeBrandVariant");
  const brandId = assertUuid(input.brandId, "brandId");
  const variantId = assertUuid(input.variantId, "variantId");
  await requireAssortmentManage(context, input.actor, brandId);
  const principal = requireWorkforcePrincipal(input.actor);

  const variant = await findVariantById(context, variantId);
  if (!variant) throw new AssortmentNotFoundError("variant");
  if (variant.brandId !== brandId) {
    throw new AssortmentValidationError({
      message: "variant must belong to the assortment brand.",
    });
  }

  const reasonCode = normalizeOptionalReasonCode(input.reasonCode);
  const now = new Date();
  const id = randomUUID();

  try {
    await context.db.insert(assortmentRulesTable).values({
      id,
      brandId,
      scopeType: "brand",
      territoryId: null,
      organizationId: null,
      outletId: null,
      targetType: "variant",
      productId: null,
      variantId,
      modifierOptionId: null,
      decision: "include",
      status: "active",
      reasonCode,
      createdByWorkforceUserId: principal.workforceUserId,
      retiredByWorkforceUserId: null,
      createdAt: now,
      retiredAt: null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AssortmentConflictError({
        message: "An active brand include rule already exists for this variant.",
      });
    }
    throw error;
  }

  await insertAssortmentAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "assortment.brand_variant_included",
    brandId,
    targetType: "variant",
    targetId: variantId,
    metadata: { ruleId: id },
    occurredAt: now,
  });

  const rows = await context.db
    .select()
    .from(assortmentRulesTable)
    .where(eq(assortmentRulesTable.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) throw new AssortmentNotFoundError("assortment_rule");
  return rowToRule(row);
}

async function insertExcludeRule(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    brandId: string;
    scopeType: AssortmentScopeType;
    territoryId?: string | null;
    organizationId?: string | null;
    outletId?: string | null;
    reasonCode?: string | null;
    targetType: AssortmentRule["targetType"];
    productId?: string | null;
    variantId?: string | null;
    modifierOptionId?: string | null;
  },
): Promise<AssortmentRule> {
  assertTransactionContext(context, "excludeAssortmentRule");
  const brandId = assertUuid(input.brandId, "brandId");
  await requireAssortmentManage(context, input.actor, brandId);
  const principal = requireWorkforcePrincipal(input.actor);
  const scope = await resolveExcludeScope(context, brandId, input);
  const reasonCode = normalizeOptionalReasonCode(input.reasonCode);
  const now = new Date();
  const id = randomUUID();

  try {
    await context.db.insert(assortmentRulesTable).values({
      id,
      brandId,
      scopeType: scope.scopeType,
      territoryId: scope.territoryId,
      organizationId: scope.organizationId,
      outletId: scope.outletId,
      targetType: input.targetType,
      productId: input.productId ?? null,
      variantId: input.variantId ?? null,
      modifierOptionId: input.modifierOptionId ?? null,
      decision: "exclude",
      status: "active",
      reasonCode,
      createdByWorkforceUserId: principal.workforceUserId,
      retiredByWorkforceUserId: null,
      createdAt: now,
      retiredAt: null,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AssortmentConflictError({
        message: "An active equivalent exclude rule already exists.",
      });
    }
    throw error;
  }

  await insertAssortmentAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "assortment.rule_excluded",
    brandId,
    territoryId: scope.territoryId,
    organizationId: scope.organizationId,
    outletId: scope.outletId,
    targetType: input.targetType,
    targetId: input.productId ?? input.variantId ?? input.modifierOptionId ?? null,
    metadata: { ruleId: id, scopeType: scope.scopeType },
    occurredAt: now,
  });

  const rows = await context.db
    .select()
    .from(assortmentRulesTable)
    .where(eq(assortmentRulesTable.id, id))
    .limit(1);
  const row = rows[0];
  if (!row) throw new AssortmentNotFoundError("assortment_rule");
  return rowToRule(row);
}

export async function excludeProductAtScope(
  context: PersistenceTransactionContext,
  input: ExcludeProductAtScopeInput,
): Promise<AssortmentRule> {
  assertTransactionContext(context, "excludeProductAtScope");
  const productId = assertUuid(input.productId, "productId");
  const product = await findProductById(context, productId);
  if (!product) throw new AssortmentNotFoundError("product");
  if (product.brandId !== input.brandId) {
    throw new AssortmentValidationError({
      message: "product must belong to the assortment brand.",
    });
  }
  return insertExcludeRule(context, {
    ...input,
    targetType: "product",
    productId,
    variantId: null,
    modifierOptionId: null,
  });
}

export async function excludeVariantAtScope(
  context: PersistenceTransactionContext,
  input: ExcludeVariantAtScopeInput,
): Promise<AssortmentRule> {
  assertTransactionContext(context, "excludeVariantAtScope");
  const variantId = assertUuid(input.variantId, "variantId");
  const variant = await findVariantById(context, variantId);
  if (!variant) throw new AssortmentNotFoundError("variant");
  if (variant.brandId !== input.brandId) {
    throw new AssortmentValidationError({
      message: "variant must belong to the assortment brand.",
    });
  }
  return insertExcludeRule(context, {
    ...input,
    targetType: "variant",
    productId: null,
    variantId,
    modifierOptionId: null,
  });
}

export async function excludeModifierOptionAtScope(
  context: PersistenceTransactionContext,
  input: ExcludeModifierOptionAtScopeInput,
): Promise<AssortmentRule> {
  assertTransactionContext(context, "excludeModifierOptionAtScope");
  const modifierOptionId = assertUuid(input.modifierOptionId, "modifierOptionId");
  const option = await findModifierOptionById(context, modifierOptionId);
  if (!option) throw new AssortmentNotFoundError("modifier_option");
  if (option.brandId !== input.brandId) {
    throw new AssortmentValidationError({
      message: "modifier option must belong to the assortment brand.",
    });
  }
  return insertExcludeRule(context, {
    ...input,
    targetType: "modifier_option",
    productId: null,
    variantId: null,
    modifierOptionId,
  });
}

export async function retireAssortmentRule(
  context: PersistenceTransactionContext,
  input: RetireAssortmentRuleInput,
): Promise<AssortmentRule> {
  assertTransactionContext(context, "retireAssortmentRule");
  const ruleId = assertUuid(input.ruleId, "ruleId");

  const rows = await context.db
    .select()
    .from(assortmentRulesTable)
    .where(eq(assortmentRulesTable.id, ruleId))
    .limit(1);
  const existing = rows[0];
  if (!existing) throw new AssortmentNotFoundError("assortment_rule");

  await requireAssortmentManage(context, input.actor, existing.brandId);
  const principal = requireWorkforcePrincipal(input.actor);

  if (existing.status === "retired") {
    throw new AssortmentInvalidStateError({
      message: "Assortment rule is already retired.",
    });
  }

  const now = new Date();
  await context.db
    .update(assortmentRulesTable)
    .set({
      status: "retired",
      retiredAt: now,
      retiredByWorkforceUserId: principal.workforceUserId,
    })
    .where(
      and(eq(assortmentRulesTable.id, ruleId), eq(assortmentRulesTable.status, "active")),
    );

  await insertAssortmentAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "assortment.rule_retired",
    brandId: existing.brandId,
    territoryId: existing.territoryId,
    organizationId: existing.organizationId,
    outletId: existing.outletId,
    targetType: existing.targetType,
    targetId:
      existing.productId ?? existing.variantId ?? existing.modifierOptionId ?? null,
    metadata: { ruleId },
    occurredAt: now,
  });

  const updated = await context.db
    .select()
    .from(assortmentRulesTable)
    .where(eq(assortmentRulesTable.id, ruleId))
    .limit(1);
  const row = updated[0];
  if (!row) throw new AssortmentNotFoundError("assortment_rule");
  return rowToRule(row);
}

export async function findAssortmentRuleById(
  context: PersistenceQueryContext,
  ruleId: string,
): Promise<AssortmentRule | null> {
  assertApplicationRole(context, "findAssortmentRuleById");
  const id = assertUuid(ruleId, "ruleId");
  const rows = await context.db
    .select()
    .from(assortmentRulesTable)
    .where(eq(assortmentRulesTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? rowToRule(row) : null;
}
