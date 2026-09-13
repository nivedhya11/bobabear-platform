/**
 * Assortment rule mutations (IMP-014 / IMP-036F F4).
 *
 * Material mutations consume reviewed expectedRuleRevision (rule CAS).
 * Reviewed absence is represented as expectedRuleRevision = null; unique
 * active-key constraints plus a locked equivalent-row check bind concurrent
 * creates. Stored revisions start at 1 and are always > 0.
 */
import { randomUUID } from "node:crypto";

import { and, eq, isNull } from "drizzle-orm";

import type { AssortmentScopeType } from "../../shared/assortment";
import { assortmentRulesTable } from "../../platform/database/schema/assortment";
import { catalogModifierOptionsTable } from "../../platform/database/schema/catalog";
import { catalogProductsTable } from "../../platform/database/schema/catalog";
import { catalogVariantsTable } from "../../platform/database/schema/catalog";
import {
  organizationsTable,
  outletsTable,
  territoriesTable,
} from "../../platform/database/schema/organizations";
import { requireWorkforcePrincipal } from "../access-control/principal";
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
  ExpectedRuleRevisionInput,
  IncludeBrandVariantInput,
  RetireAssortmentRuleInput,
} from "./types";

function staleAssortmentRevision(): never {
  throw new AssortmentConflictError({
    code: "ASSORTMENT_STALE_REVISION",
    message:
      "expectedRuleRevision does not match current assortment rule state; no mutation effect.",
  });
}

export function parseExpectedRuleRevision(
  value: unknown,
  field = "expectedRuleRevision",
): bigint | null {
  if (value === null) return null;
  if (typeof value === "bigint") {
    if (value <= BigInt(0)) {
      throw new AssortmentValidationError({ message: `${field} must be > 0 when set.` });
    }
    return value;
  }
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value)) {
    const parsed = BigInt(value);
    if (parsed <= BigInt(0)) {
      throw new AssortmentValidationError({ message: `${field} must be > 0 when set.` });
    }
    return parsed;
  }
  throw new AssortmentValidationError({
    message: `${field} must be null (reviewed absence) or a positive integer.`,
  });
}

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
    revision: row.revision,
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

type EquivalentKey = ResolvedScope &
  Readonly<{
    brandId: string;
    targetType: AssortmentRule["targetType"];
    productId: string | null;
    variantId: string | null;
    modifierOptionId: string | null;
    decision: AssortmentRule["decision"];
  }>;

async function requireBrandVariant(
  context: PersistenceQueryContext,
  brandId: string,
  variantId: string,
): Promise<typeof catalogVariantsTable.$inferSelect> {
  const id = assertUuid(variantId, "variantId");
  const rows = await context.db
    .select()
    .from(catalogVariantsTable)
    .where(and(eq(catalogVariantsTable.id, id), eq(catalogVariantsTable.brandId, brandId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new AssortmentNotFoundError("variant");
  return row;
}

async function requireBrandProduct(
  context: PersistenceQueryContext,
  brandId: string,
  productId: string,
): Promise<typeof catalogProductsTable.$inferSelect> {
  const id = assertUuid(productId, "productId");
  const rows = await context.db
    .select()
    .from(catalogProductsTable)
    .where(and(eq(catalogProductsTable.id, id), eq(catalogProductsTable.brandId, brandId)))
    .limit(1);
  const row = rows[0];
  if (!row) throw new AssortmentNotFoundError("product");
  return row;
}

async function requireBrandModifierOption(
  context: PersistenceQueryContext,
  brandId: string,
  modifierOptionId: string,
): Promise<typeof catalogModifierOptionsTable.$inferSelect> {
  const id = assertUuid(modifierOptionId, "modifierOptionId");
  const rows = await context.db
    .select()
    .from(catalogModifierOptionsTable)
    .where(
      and(eq(catalogModifierOptionsTable.id, id), eq(catalogModifierOptionsTable.brandId, brandId)),
    )
    .limit(1);
  const row = rows[0];
  if (!row) throw new AssortmentNotFoundError("modifier_option");
  return row;
}

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
    const rows = await context.db
      .select({ id: territoriesTable.id })
      .from(territoriesTable)
      .where(and(eq(territoriesTable.id, territoryId), eq(territoriesTable.brandId, brandId)))
      .limit(1);
    if (!rows[0]) throw new AssortmentNotFoundError("territory");
    return {
      scopeType: "territory",
      territoryId: rows[0].id,
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
    const rows = await context.db
      .select({ id: organizationsTable.id })
      .from(organizationsTable)
      .where(
        and(eq(organizationsTable.id, organizationId), eq(organizationsTable.brandId, brandId)),
      )
      .limit(1);
    if (!rows[0]) throw new AssortmentNotFoundError("organization");
    return {
      scopeType: "organization",
      territoryId: null,
      organizationId: rows[0].id,
      outletId: null,
    };
  }

  if (input.scopeType === "outlet") {
    const outletId = assertUuid(input.outletId, "outletId");
    const rows = await context.db
      .select()
      .from(outletsTable)
      .where(and(eq(outletsTable.id, outletId), eq(outletsTable.brandId, brandId)))
      .limit(1);
    const outlet = rows[0];
    if (!outlet) throw new AssortmentNotFoundError("outlet");
    return {
      scopeType: "outlet",
      territoryId: outlet.territoryId,
      organizationId: outlet.organizationId,
      outletId: outlet.id,
    };
  }

  throw new AssortmentValidationError({ message: "Invalid assortment scopeType." });
}

function equivalentWhere(key: EquivalentKey) {
  const scopeId =
    key.scopeType === "territory"
      ? eq(assortmentRulesTable.territoryId, key.territoryId!)
      : key.scopeType === "organization"
        ? eq(assortmentRulesTable.organizationId, key.organizationId!)
        : key.scopeType === "outlet"
          ? eq(assortmentRulesTable.outletId, key.outletId!)
          : and(
              isNull(assortmentRulesTable.territoryId),
              isNull(assortmentRulesTable.organizationId),
              isNull(assortmentRulesTable.outletId),
            );
  const targetId =
    key.targetType === "product"
      ? eq(assortmentRulesTable.productId, key.productId!)
      : key.targetType === "variant"
        ? eq(assortmentRulesTable.variantId, key.variantId!)
        : eq(assortmentRulesTable.modifierOptionId, key.modifierOptionId!);
  return and(
    eq(assortmentRulesTable.brandId, key.brandId),
    eq(assortmentRulesTable.scopeType, key.scopeType),
    eq(assortmentRulesTable.targetType, key.targetType),
    eq(assortmentRulesTable.decision, key.decision),
    eq(assortmentRulesTable.status, "active"),
    scopeId,
    targetId,
  );
}

export async function findActiveEquivalentAssortmentRule(
  context: PersistenceQueryContext,
  key: EquivalentKey,
  options: { forUpdate?: boolean } = {},
): Promise<AssortmentRule | null> {
  assertApplicationRole(context, "findActiveEquivalentAssortmentRule");
  let query = context.db
    .select()
    .from(assortmentRulesTable)
    .where(equivalentWhere(key))
    .limit(1);
  if (options.forUpdate) {
    query = query.for("update") as typeof query;
  }
  const rows = await query;
  const row = rows[0];
  return row ? rowToRule(row) : null;
}

function assertReviewedState(
  current: AssortmentRule | null,
  expected: bigint | null,
): void {
  if (expected === null) {
    if (current) staleAssortmentRevision();
    return;
  }
  if (!current || current.revision !== expected) staleAssortmentRevision();
}

async function insertAssortmentRuleRow(
  context: PersistenceTransactionContext,
  values: typeof assortmentRulesTable.$inferInsert,
): Promise<AssortmentRule> {
  try {
    await context.db.insert(assortmentRulesTable).values(values);
  } catch (error) {
    if (isUniqueViolation(error)) staleAssortmentRevision();
    throw error;
  }
  const rows = await context.db
    .select()
    .from(assortmentRulesTable)
    .where(eq(assortmentRulesTable.id, values.id))
    .limit(1);
  const row = rows[0];
  if (!row) throw new AssortmentNotFoundError("assortment_rule");
  return rowToRule(row);
}

export async function includeBrandVariant(
  context: PersistenceTransactionContext,
  input: IncludeBrandVariantInput,
): Promise<AssortmentRule> {
  assertTransactionContext(context, "includeBrandVariant");
  const brandId = assertUuid(input.brandId, "brandId");
  const variantId = assertUuid(input.variantId, "variantId");
  const expected = parseExpectedRuleRevision(input.expectedRuleRevision);
  await requireAssortmentManage(context, input.actor, brandId);
  const principal = requireWorkforcePrincipal(input.actor);

  await requireBrandVariant(context, brandId, variantId);

  const key: EquivalentKey = {
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
  };
  const current = await findActiveEquivalentAssortmentRule(context, key, { forUpdate: true });
  assertReviewedState(current, expected);
  if (current) {
    throw new AssortmentConflictError({
      message: "An active brand include rule already exists for this variant.",
    });
  }

  const reasonCode = normalizeOptionalReasonCode(input.reasonCode);
  const now = new Date();
  const id = randomUUID();
  const created = await insertAssortmentRuleRow(context, {
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
    revision: BigInt(1),
    createdByWorkforceUserId: principal.workforceUserId,
    retiredByWorkforceUserId: null,
    createdAt: now,
    retiredAt: null,
  });

  await insertAssortmentAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "assortment.brand_variant_included",
    brandId,
    targetType: "variant",
    targetId: variantId,
    metadata: { ruleId: id, revision: "1" },
    occurredAt: now,
  });

  return created;
}

async function insertExcludeRule(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    brandId: string;
    expectedRuleRevision: ExpectedRuleRevisionInput;
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
  const expected = parseExpectedRuleRevision(input.expectedRuleRevision);
  await requireAssortmentManage(context, input.actor, brandId);
  const principal = requireWorkforcePrincipal(input.actor);
  const scope = await resolveExcludeScope(context, brandId, input);
  const reasonCode = normalizeOptionalReasonCode(input.reasonCode);

  const key: EquivalentKey = {
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
  };
  const current = await findActiveEquivalentAssortmentRule(context, key, { forUpdate: true });
  assertReviewedState(current, expected);
  if (current) {
    throw new AssortmentConflictError({
      message: "An active equivalent exclude rule already exists.",
    });
  }

  const now = new Date();
  const id = randomUUID();
  const created = await insertAssortmentRuleRow(context, {
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
    revision: BigInt(1),
    createdByWorkforceUserId: principal.workforceUserId,
    retiredByWorkforceUserId: null,
    createdAt: now,
    retiredAt: null,
  });

  await insertAssortmentAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "assortment.rule_excluded",
    brandId,
    territoryId: scope.territoryId,
    organizationId: scope.organizationId,
    outletId: scope.outletId,
    targetType: input.targetType,
    targetId: input.productId ?? input.variantId ?? input.modifierOptionId ?? null,
    metadata: { ruleId: id, scopeType: scope.scopeType, revision: "1" },
    occurredAt: now,
  });

  return created;
}

export async function excludeProductAtScope(
  context: PersistenceTransactionContext,
  input: ExcludeProductAtScopeInput,
): Promise<AssortmentRule> {
  assertTransactionContext(context, "excludeProductAtScope");
  const brandId = assertUuid(input.brandId, "brandId");
  await requireAssortmentManage(context, input.actor, brandId);
  const product = await requireBrandProduct(context, brandId, input.productId);
  return insertExcludeRule(context, {
    ...input,
    targetType: "product",
    productId: product.id,
    variantId: null,
    modifierOptionId: null,
  });
}

export async function excludeVariantAtScope(
  context: PersistenceTransactionContext,
  input: ExcludeVariantAtScopeInput,
): Promise<AssortmentRule> {
  assertTransactionContext(context, "excludeVariantAtScope");
  const brandId = assertUuid(input.brandId, "brandId");
  await requireAssortmentManage(context, input.actor, brandId);
  const variant = await requireBrandVariant(context, brandId, input.variantId);
  return insertExcludeRule(context, {
    ...input,
    targetType: "variant",
    productId: null,
    variantId: variant.id,
    modifierOptionId: null,
  });
}

export async function excludeModifierOptionAtScope(
  context: PersistenceTransactionContext,
  input: ExcludeModifierOptionAtScopeInput,
): Promise<AssortmentRule> {
  assertTransactionContext(context, "excludeModifierOptionAtScope");
  const brandId = assertUuid(input.brandId, "brandId");
  await requireAssortmentManage(context, input.actor, brandId);
  const option = await requireBrandModifierOption(context, brandId, input.modifierOptionId);
  return insertExcludeRule(context, {
    ...input,
    targetType: "modifier_option",
    productId: null,
    variantId: null,
    modifierOptionId: option.id,
  });
}

export async function retireAssortmentRule(
  context: PersistenceTransactionContext,
  input: RetireAssortmentRuleInput,
): Promise<AssortmentRule> {
  assertTransactionContext(context, "retireAssortmentRule");
  const brandId = assertUuid(input.brandId, "brandId");
  const ruleId = assertUuid(input.ruleId, "ruleId");
  const expected = parseExpectedRuleRevision(input.expectedRuleRevision);
  if (expected === null) {
    throw new AssortmentValidationError({
      message: "expectedRuleRevision is required to retire an existing assortment rule.",
    });
  }
  await requireAssortmentManage(context, input.actor, brandId);
  const principal = requireWorkforcePrincipal(input.actor);

  const rows = await context.db
    .select()
    .from(assortmentRulesTable)
    .where(and(eq(assortmentRulesTable.id, ruleId), eq(assortmentRulesTable.brandId, brandId)))
    .for("update")
    .limit(1);
  const existing = rows[0];
  if (!existing) throw new AssortmentNotFoundError("assortment_rule");

  if (existing.revision !== expected) staleAssortmentRevision();

  if (existing.status === "retired") {
    throw new AssortmentInvalidStateError({
      message: "Assortment rule is already retired.",
    });
  }

  const now = new Date();
  const nextRevision = existing.revision + BigInt(1);
  const updatedRows = await context.db
    .update(assortmentRulesTable)
    .set({
      status: "retired",
      retiredAt: now,
      retiredByWorkforceUserId: principal.workforceUserId,
      revision: nextRevision,
    })
    .where(
      and(
        eq(assortmentRulesTable.id, ruleId),
        eq(assortmentRulesTable.brandId, brandId),
        eq(assortmentRulesTable.status, "active"),
        eq(assortmentRulesTable.revision, expected),
      ),
    )
    .returning();
  const updated = updatedRows[0];
  if (!updated) staleAssortmentRevision();

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
    metadata: {
      ruleId,
      previousRevision: expected.toString(10),
      newRevision: nextRevision.toString(10),
    },
    occurredAt: now,
  });

  return rowToRule(updated);
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

export async function findBrandAssortmentRuleById(
  context: PersistenceQueryContext,
  brandId: string,
  ruleId: string,
): Promise<AssortmentRule | null> {
  assertApplicationRole(context, "findBrandAssortmentRuleById");
  const brand = assertUuid(brandId, "brandId");
  const id = assertUuid(ruleId, "ruleId");
  const rows = await context.db
    .select()
    .from(assortmentRulesTable)
    .where(and(eq(assortmentRulesTable.id, id), eq(assortmentRulesTable.brandId, brand)))
    .limit(1);
  const row = rows[0];
  return row ? rowToRule(row) : null;
}
