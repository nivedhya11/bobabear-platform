/**
 * Non-authoritative Assortment consequence preview (IMP-036F F4).
 *
 * Read/validate only. Returns the reviewed expectedRuleRevision for the
 * subsequent effect. Does not persist a review record.
 */
import { and, eq } from "drizzle-orm";

import type { AssortmentScopeType } from "../../shared/assortment";
import {
  catalogModifierGroupOptionsTable,
  catalogModifierOptionsTable,
  catalogProductsTable,
  catalogVariantModifierGroupsTable,
  catalogVariantsTable,
} from "../../platform/database/schema/catalog";
import { outletsTable } from "../../platform/database/schema/organizations";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole, assertUuid } from "./assert-role";
import {
  getEffectiveModifierOptionAssortment,
  getEffectiveVariantAssortment,
  type AssortmentRuleEvaluationOverride,
} from "./assortment-reads";
import { requireAssortmentManage } from "./authorize-assortment";
import {
  AssortmentNotFoundError,
  AssortmentValidationError,
} from "./errors";
import {
  findActiveEquivalentAssortmentRule,
  findBrandAssortmentRuleById,
  resolveExcludeScope,
} from "./rules";
import type { AssortmentRule } from "./types";

export type AssortmentPreviewMutationType = "include_variant" | "exclude" | "retire_rule";

export type AssortmentConsequencePreviewInput = Readonly<{
  actor: unknown;
  brandId: string;
  mutationType: AssortmentPreviewMutationType;
  variantId?: string | null;
  productId?: string | null;
  modifierOptionId?: string | null;
  scopeType?: AssortmentScopeType | null;
  territoryId?: string | null;
  organizationId?: string | null;
  outletId?: string | null;
  ruleId?: string | null;
}>;

export type AssortmentPreviewBlocker = Readonly<{
  code: string;
  message: string;
}>;

export type AssortmentConsequencePreview = Readonly<{
  mutationType: AssortmentPreviewMutationType;
  brandId: string;
  targetType: AssortmentRule["targetType"] | null;
  productId: string | null;
  variantId: string | null;
  modifierOptionId: string | null;
  scopeType: AssortmentScopeType | null;
  territoryId: string | null;
  organizationId: string | null;
  outletId: string | null;
  currentRule: AssortmentRule | null;
  proposed: Readonly<{
    decision: AssortmentRule["decision"] | "retire";
    status: AssortmentRule["status"] | "absent";
  }>;
  expectedRuleRevision: string | null;
  availabilityRemainsSeparate: true;
  affectedVariantIds: readonly string[];
  outletConsequences: readonly Readonly<{
    outletId: string;
    variantId: string | null;
    modifierOptionId: string | null;
    currentIntended: boolean;
    currentCode: string;
    proposedIntended: boolean;
    proposedCode: string;
  }>[];
  customerOrderabilityImplication: string;
  validationBlockers: readonly AssortmentPreviewBlocker[];
  wouldChangeAssortmentIntent: boolean;
}>;

function ruleRevisionJson(rule: AssortmentRule | null): string | null {
  return rule ? rule.revision.toString(10) : null;
}

function evaluationForPreview(args: {
  mutationType: AssortmentPreviewMutationType;
  currentRule: AssortmentRule | null;
  extraExclude: AssortmentRuleEvaluationOverride["extraExclude"];
}): AssortmentRuleEvaluationOverride | undefined {
  if (args.mutationType === "include_variant") {
    return { assumeBrandInclude: true };
  }
  if (args.mutationType === "exclude" && args.extraExclude) {
    return { extraExclude: args.extraExclude };
  }
  if (args.mutationType === "retire_rule" && args.currentRule) {
    return { ignoreRuleId: args.currentRule.id };
  }
  return undefined;
}

async function loadBrandOutlets(
  context: PersistenceQueryContext,
  brandId: string,
): Promise<ReadonlyArray<{ id: string; territoryId: string; organizationId: string }>> {
  return context.db
    .select({
      id: outletsTable.id,
      territoryId: outletsTable.territoryId,
      organizationId: outletsTable.organizationId,
    })
    .from(outletsTable)
    .where(eq(outletsTable.brandId, brandId));
}

async function loadProductVariantIds(
  context: PersistenceQueryContext,
  brandId: string,
  productId: string,
): Promise<string[]> {
  const rows = await context.db
    .select({ id: catalogVariantsTable.id })
    .from(catalogVariantsTable)
    .where(
      and(eq(catalogVariantsTable.brandId, brandId), eq(catalogVariantsTable.productId, productId)),
    );
  return rows.map((row) => row.id);
}

async function loadModifierOptionConsumerVariantIds(
  context: PersistenceQueryContext,
  brandId: string,
  modifierOptionId: string,
): Promise<string[]> {
  const rows = await context.db
    .select({ variantId: catalogVariantModifierGroupsTable.variantId })
    .from(catalogVariantModifierGroupsTable)
    .innerJoin(
      catalogModifierGroupOptionsTable,
      and(
        eq(
          catalogModifierGroupOptionsTable.modifierGroupId,
          catalogVariantModifierGroupsTable.modifierGroupId,
        ),
        eq(catalogModifierGroupOptionsTable.brandId, catalogVariantModifierGroupsTable.brandId),
      ),
    )
    .where(
      and(
        eq(catalogVariantModifierGroupsTable.brandId, brandId),
        eq(catalogModifierGroupOptionsTable.modifierOptionId, modifierOptionId),
      ),
    );
  return [...new Set(rows.map((row) => row.variantId))];
}

export async function previewAssortmentConsequence(
  context: PersistenceQueryContext,
  input: AssortmentConsequencePreviewInput,
): Promise<AssortmentConsequencePreview> {
  assertApplicationRole(context, "previewAssortmentConsequence");
  const brandId = assertUuid(input.brandId, "brandId");
  await requireAssortmentManage(context, input.actor, brandId);

  const blockers: AssortmentPreviewBlocker[] = [];
  let currentRule: AssortmentRule | null = null;
  let targetType: AssortmentRule["targetType"] | null = null;
  let productId: string | null = input.productId ?? null;
  let variantId: string | null = input.variantId ?? null;
  let modifierOptionId: string | null = input.modifierOptionId ?? null;
  let scopeType: AssortmentScopeType | null = input.scopeType ?? null;
  let territoryId = input.territoryId ?? null;
  let organizationId = input.organizationId ?? null;
  let outletId = input.outletId ?? null;
  let proposedDecision: AssortmentRule["decision"] | "retire" = "include";
  let proposedStatus: AssortmentRule["status"] | "absent" = "active";
  const inspectVariantIds: string[] = [];
  let extraExclude: AssortmentRuleEvaluationOverride["extraExclude"] = null;
  let inspectModifierOptionId: string | null = null;

  if (input.mutationType === "include_variant") {
    proposedDecision = "include";
    proposedStatus = "active";
    targetType = "variant";
    scopeType = "brand";
    territoryId = null;
    organizationId = null;
    outletId = null;
    if (!variantId) {
      throw new AssortmentValidationError({ message: "variantId is required for include_variant." });
    }
    const id = assertUuid(variantId, "variantId");
    const rows = await context.db
      .select({ id: catalogVariantsTable.id })
      .from(catalogVariantsTable)
      .where(and(eq(catalogVariantsTable.id, id), eq(catalogVariantsTable.brandId, brandId)))
      .limit(1);
    if (!rows[0]) throw new AssortmentNotFoundError("variant");
    inspectVariantIds.push(id);
    variantId = id;
    currentRule = await findActiveEquivalentAssortmentRule(context, {
      brandId,
      scopeType: "brand",
      territoryId: null,
      organizationId: null,
      outletId: null,
      targetType: "variant",
      productId: null,
      variantId: id,
      modifierOptionId: null,
      decision: "include",
    });
  } else if (input.mutationType === "exclude") {
    proposedDecision = "exclude";
    proposedStatus = "active";
    if (!scopeType) {
      throw new AssortmentValidationError({ message: "scopeType is required for exclude." });
    }
    const scope = await resolveExcludeScope(context, brandId, {
      scopeType,
      territoryId,
      organizationId,
      outletId,
    });
    scopeType = scope.scopeType;
    territoryId = scope.territoryId;
    organizationId = scope.organizationId;
    outletId = scope.outletId;
    if (variantId) {
      targetType = "variant";
      const id = assertUuid(variantId, "variantId");
      const rows = await context.db
        .select({ id: catalogVariantsTable.id })
        .from(catalogVariantsTable)
        .where(and(eq(catalogVariantsTable.id, id), eq(catalogVariantsTable.brandId, brandId)))
        .limit(1);
      if (!rows[0]) throw new AssortmentNotFoundError("variant");
      inspectVariantIds.push(id);
      variantId = id;
      productId = null;
      modifierOptionId = null;
    } else if (productId) {
      targetType = "product";
      const id = assertUuid(productId, "productId");
      const rows = await context.db
        .select({ id: catalogProductsTable.id })
        .from(catalogProductsTable)
        .where(and(eq(catalogProductsTable.id, id), eq(catalogProductsTable.brandId, brandId)))
        .limit(1);
      if (!rows[0]) throw new AssortmentNotFoundError("product");
      productId = id;
      variantId = null;
      modifierOptionId = null;
      inspectVariantIds.push(...(await loadProductVariantIds(context, brandId, id)));
    } else if (modifierOptionId) {
      targetType = "modifier_option";
      const id = assertUuid(modifierOptionId, "modifierOptionId");
      const rows = await context.db
        .select({ id: catalogModifierOptionsTable.id })
        .from(catalogModifierOptionsTable)
        .where(
          and(
            eq(catalogModifierOptionsTable.id, id),
            eq(catalogModifierOptionsTable.brandId, brandId),
          ),
        )
        .limit(1);
      if (!rows[0]) throw new AssortmentNotFoundError("modifier_option");
      modifierOptionId = id;
      inspectModifierOptionId = id;
      productId = null;
      variantId = null;
      inspectVariantIds.push(...(await loadModifierOptionConsumerVariantIds(context, brandId, id)));
    } else {
      throw new AssortmentValidationError({
        message: "exclude requires productId, variantId, or modifierOptionId.",
      });
    }
    extraExclude = {
      scopeType,
      territoryId,
      organizationId,
      outletId,
      targetType,
      productId,
      variantId,
      modifierOptionId,
    };
    currentRule = await findActiveEquivalentAssortmentRule(context, {
      brandId,
      scopeType,
      territoryId,
      organizationId,
      outletId,
      targetType,
      productId,
      variantId,
      modifierOptionId,
      decision: "exclude",
    });
  } else if (input.mutationType === "retire_rule") {
    proposedDecision = "retire";
    proposedStatus = "retired";
    if (!input.ruleId) {
      throw new AssortmentValidationError({ message: "ruleId is required for retire_rule." });
    }
    currentRule = await findBrandAssortmentRuleById(context, brandId, input.ruleId);
    if (!currentRule) throw new AssortmentNotFoundError("assortment_rule");
    targetType = currentRule.targetType;
    productId = currentRule.productId;
    variantId = currentRule.variantId;
    modifierOptionId = currentRule.modifierOptionId;
    scopeType = currentRule.scopeType;
    territoryId = currentRule.territoryId;
    organizationId = currentRule.organizationId;
    outletId = currentRule.outletId;
    if (currentRule.targetType === "variant" && currentRule.variantId) {
      inspectVariantIds.push(currentRule.variantId);
    } else if (currentRule.targetType === "product" && currentRule.productId) {
      inspectVariantIds.push(
        ...(await loadProductVariantIds(context, brandId, currentRule.productId)),
      );
    } else if (currentRule.targetType === "modifier_option" && currentRule.modifierOptionId) {
      inspectModifierOptionId = currentRule.modifierOptionId;
      inspectVariantIds.push(
        ...(await loadModifierOptionConsumerVariantIds(
          context,
          brandId,
          currentRule.modifierOptionId,
        )),
      );
    }
    if (currentRule.status === "retired") {
      blockers.push({
        code: "invalid_state",
        message: "Assortment rule is already retired.",
      });
    }
  } else {
    throw new AssortmentValidationError({ message: "Unsupported assortment preview mutationType." });
  }

  const evaluation = evaluationForPreview({
    mutationType: input.mutationType,
    currentRule,
    extraExclude,
  });
  const outletRows = await loadBrandOutlets(context, brandId);
  const outletConsequences: Array<
    AssortmentConsequencePreview["outletConsequences"][number]
  > = [];

  if (inspectModifierOptionId) {
    for (const outlet of outletRows) {
      const current = await getEffectiveModifierOptionAssortment(context, {
        actor: input.actor,
        outletId: outlet.id,
        modifierOptionId: inspectModifierOptionId,
        authorize: false,
      });
      const proposed = await getEffectiveModifierOptionAssortment(context, {
        actor: input.actor,
        outletId: outlet.id,
        modifierOptionId: inspectModifierOptionId,
        authorize: false,
        evaluation,
      });
      outletConsequences.push({
        outletId: outlet.id,
        variantId: null,
        modifierOptionId: inspectModifierOptionId,
        currentIntended: current.eligible,
        currentCode: current.code,
        proposedIntended: proposed.eligible,
        proposedCode: proposed.code,
      });
    }
  } else {
    for (const inspectId of inspectVariantIds) {
      for (const outlet of outletRows) {
        const current = await getEffectiveVariantAssortment(context, {
          actor: input.actor,
          outletId: outlet.id,
          variantId: inspectId,
          authorize: false,
        });
        const proposed = await getEffectiveVariantAssortment(context, {
          actor: input.actor,
          outletId: outlet.id,
          variantId: inspectId,
          authorize: false,
          evaluation,
        });
        outletConsequences.push({
          outletId: outlet.id,
          variantId: inspectId,
          modifierOptionId: null,
          currentIntended: current.eligible,
          currentCode: current.code,
          proposedIntended: proposed.eligible,
          proposedCode: proposed.code,
        });
      }
    }
  }

  const wouldChangeAssortmentIntent =
    blockers.length === 0 &&
    (input.mutationType === "retire_rule"
      ? currentRule?.status === "active"
      : currentRule === null);

  const customerOrderabilityImplication = wouldChangeAssortmentIntent
    ? input.mutationType === "include_variant"
      ? "Variant becomes commercially intended at Brand scope; Availability remains independent."
      : input.mutationType === "exclude"
        ? "Named scope is no longer commercially intended to offer the target; Availability remains independent."
        : currentRule?.decision === "include"
          ? "Retiring the include rule removes Brand Assortment intent; Availability remains independent."
          : "Retiring the exclude rule restores inherited Assortment intent where still included; Availability remains independent."
    : "No Assortment intent change; operator reload/review if state already matches.";

  return {
    mutationType: input.mutationType,
    brandId,
    targetType,
    productId,
    variantId,
    modifierOptionId,
    scopeType,
    territoryId,
    organizationId,
    outletId,
    currentRule,
    proposed: { decision: proposedDecision, status: proposedStatus },
    expectedRuleRevision: ruleRevisionJson(currentRule),
    availabilityRemainsSeparate: true,
    affectedVariantIds: inspectVariantIds,
    outletConsequences,
    customerOrderabilityImplication,
    validationBlockers: blockers,
    wouldChangeAssortmentIntent,
  };
}
