/**
 * Non-authoritative Assortment consequence preview (IMP-036F F4).
 *
 * Read/validate only. Returns the reviewed expectedRuleRevision for the
 * subsequent effect. Does not persist a review record.
 */
import { and, eq } from "drizzle-orm";

import type { AssortmentScopeType, EligibilityDecisionCode } from "../../shared/assortment";
import {
  catalogModifierOptionsTable,
  catalogProductsTable,
  catalogVariantsTable,
} from "../../platform/database/schema/catalog";
import { outletsTable } from "../../platform/database/schema/organizations";
import type { PersistenceQueryContext } from "../persistence/types";
import { assertApplicationRole, assertUuid } from "./assert-role";
import { getEffectiveVariantAssortment } from "./assortment-reads";
import { requireAssortmentManage } from "./authorize-assortment";
import {
  AssortmentNotFoundError,
  AssortmentValidationError,
} from "./errors";
import { findActiveEquivalentAssortmentRule, findBrandAssortmentRuleById } from "./rules";
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
  outletConsequences: readonly Readonly<{
    outletId: string;
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

function proposedIncludeEligible(current: {
  eligible: boolean;
  code: EligibilityDecisionCode;
}): { eligible: boolean; code: EligibilityDecisionCode } {
  if (current.code === "ASSORTMENT_NOT_INCLUDED") {
    return { eligible: true, code: "AVAILABLE" };
  }
  return current;
}

function proposedExcludeAtOutlet(
  current: { eligible: boolean; code: EligibilityDecisionCode },
  outletId: string,
  previewOutletId: string | null,
  scopeType: AssortmentScopeType | null,
): { eligible: boolean; code: EligibilityDecisionCode } {
  if (!current.eligible) return current;
  if (scopeType === "brand") {
    return { eligible: false, code: "ASSORTMENT_EXCLUDED_BRAND" };
  }
  if (scopeType === "outlet" && previewOutletId === outletId) {
    return { eligible: false, code: "ASSORTMENT_EXCLUDED_OUTLET" };
  }
  if (scopeType === "territory" || scopeType === "organization") {
    // Conservative: narrower-scope preview reports the named outlet when matched;
    // other outlets keep current evaluation (inheritance applied at effect).
    if (previewOutletId === outletId) {
      return {
        eligible: false,
        code:
          scopeType === "territory"
            ? "ASSORTMENT_EXCLUDED_TERRITORY"
            : "ASSORTMENT_EXCLUDED_ORGANIZATION",
      };
    }
  }
  return current;
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
  const territoryId = input.territoryId ?? null;
  const organizationId = input.organizationId ?? null;
  const outletId = input.outletId ?? null;
  let proposedDecision: AssortmentRule["decision"] | "retire" = "include";
  let proposedStatus: AssortmentRule["status"] | "absent" = "active";
  let inspectVariantId: string | null = variantId;

  if (input.mutationType === "include_variant") {
    proposedDecision = "include";
    proposedStatus = "active";
    targetType = "variant";
    scopeType = "brand";
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
    inspectVariantId = id;
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
    if (variantId) {
      targetType = "variant";
      const id = assertUuid(variantId, "variantId");
      const rows = await context.db
        .select({ id: catalogVariantsTable.id })
        .from(catalogVariantsTable)
        .where(and(eq(catalogVariantsTable.id, id), eq(catalogVariantsTable.brandId, brandId)))
        .limit(1);
      if (!rows[0]) throw new AssortmentNotFoundError("variant");
      inspectVariantId = id;
      variantId = id;
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
    } else {
      throw new AssortmentValidationError({
        message: "exclude requires productId, variantId, or modifierOptionId.",
      });
    }
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
    inspectVariantId = currentRule.variantId;
    if (currentRule.status === "retired") {
      blockers.push({
        code: "invalid_state",
        message: "Assortment rule is already retired.",
      });
    }
  } else {
    throw new AssortmentValidationError({ message: "Unsupported assortment preview mutationType." });
  }

  const outletRows = inspectVariantId
    ? await context.db
        .select({ id: outletsTable.id })
        .from(outletsTable)
        .where(eq(outletsTable.brandId, brandId))
    : [];

  const outletConsequences: Array<
    AssortmentConsequencePreview["outletConsequences"][number]
  > = [];
  for (const outlet of outletRows) {
    const current = await getEffectiveVariantAssortment(context, {
      actor: input.actor,
      outletId: outlet.id,
      variantId: inspectVariantId!,
      authorize: false,
    });
    let proposed = { eligible: current.eligible, code: current.code };
    if (input.mutationType === "include_variant") {
      proposed = proposedIncludeEligible(current);
    } else if (input.mutationType === "exclude") {
      proposed = proposedExcludeAtOutlet(current, outlet.id, outletId, scopeType);
    } else if (input.mutationType === "retire_rule" && currentRule?.decision === "include") {
      proposed = { eligible: false, code: "ASSORTMENT_NOT_INCLUDED" };
    } else if (input.mutationType === "retire_rule" && currentRule?.decision === "exclude") {
      if (!current.eligible && current.code.startsWith("ASSORTMENT_EXCLUDED")) {
        proposed = { eligible: true, code: "AVAILABLE" };
      }
    }
    outletConsequences.push({
      outletId: outlet.id,
      currentIntended: current.eligible,
      currentCode: current.code,
      proposedIntended: proposed.eligible,
      proposedCode: proposed.code,
    });
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
    territoryId: input.mutationType === "retire_rule" ? currentRule?.territoryId ?? null : territoryId,
    organizationId:
      input.mutationType === "retire_rule" ? currentRule?.organizationId ?? null : organizationId,
    outletId: input.mutationType === "retire_rule" ? currentRule?.outletId ?? null : outletId,
    currentRule,
    proposed: { decision: proposedDecision, status: proposedStatus },
    expectedRuleRevision: ruleRevisionJson(currentRule),
    availabilityRemainsSeparate: true,
    outletConsequences,
    customerOrderabilityImplication,
    validationBlockers: blockers,
    wouldChangeAssortmentIntent,
  };
}
