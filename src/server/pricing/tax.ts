/**
 * Tax profiles, policy resolution, and GST calculation (IMP-015).
 *
 * Exact integer arithmetic only. Place of supply for restaurant_service uses
 * Outlet performance location — never the customer delivery address.
 */
import { and, eq, isNull, lte, or, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  legalEntityTaxProfilesTable,
  outletTaxProfilesTable,
  taxCategoriesTable,
  taxPoliciesTable,
  taxPolicyComponentsTable,
} from "../../platform/database/schema/pricing";
import { outletsTable } from "../../platform/database/schema/organizations";
import {
  INDIA_UNION_TERRITORY_STATE_CODES,
  taxExclusivePaise,
  taxInclusiveSplit,
  type TaxApplicability,
  type TaxCalculationResult,
  type TaxComponentAmount,
  type TaxInclusionMode,
  type TaxLineAllocation,
  type TaxType,
} from "../../shared/pricing";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertApplicationRole, assertTransactionContext, assertUuid } from "./assert-role";
import { insertPricingTaxAuditEvent } from "./audit";
import {
  PricingInvalidStateError,
  PricingNotFoundError,
  PricingResolutionError,
  PricingValidationError,
} from "./errors";

const UT_SET = new Set<string>(INDIA_UNION_TERRITORY_STATE_CODES);

/** Structural GSTIN validation (15 chars). Does not call government APIs. */
export function isStructurallyValidGstin(gstin: string): boolean {
  const normalized = gstin.trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(normalized)) {
    return false;
  }
  return true;
}

export function isUnionTerritoryStateCode(stateCode: string): boolean {
  return UT_SET.has(stateCode.trim());
}

export async function createLegalEntityTaxProfile(
  context: PersistenceTransactionContext,
  input: {
    readonly actorWorkforceUserId: string | null;
    readonly legalEntityId: string;
    readonly brandId: string;
    readonly organizationId: string;
    readonly stateCode: string;
    readonly registrationStatus: "registered" | "unregistered";
    readonly gstin: string | null;
    readonly validFrom: Date;
    readonly validTo?: Date | null;
  },
): Promise<{ id: string }> {
  assertTransactionContext(context, "createLegalEntityTaxProfile");
  const stateCode = input.stateCode.trim();
  if (!/^[0-9]{2}$/.test(stateCode)) {
    throw new PricingValidationError({ message: "stateCode must be a 2-digit GST state code." });
  }

  let gstin: string | null = null;
  if (input.registrationStatus === "registered") {
    if (typeof input.gstin !== "string" || !isStructurallyValidGstin(input.gstin)) {
      throw new PricingValidationError({
        message: "registered profiles require a structurally valid GSTIN.",
      });
    }
    gstin = input.gstin.trim().toUpperCase();
  } else if (input.gstin !== null && input.gstin !== undefined) {
    throw new PricingValidationError({
      message: "unregistered profiles require gstin = null.",
    });
  }

  const id = randomUUID();
  const now = new Date();
  await context.db.insert(legalEntityTaxProfilesTable).values({
    id,
    brandId: input.brandId,
    organizationId: input.organizationId,
    legalEntityId: input.legalEntityId,
    stateCode,
    registrationStatus: input.registrationStatus,
    gstin,
    validFrom: input.validFrom,
    validTo: input.validTo ?? null,
    lifecycleStatus: "active",
    createdByWorkforceUserId: input.actorWorkforceUserId,
    retiredByWorkforceUserId: null,
    createdAt: now,
    updatedAt: now,
    retiredAt: null,
  });

  await insertPricingTaxAuditEvent(context, {
    actorWorkforceUserId: input.actorWorkforceUserId,
    action: "tax_profile.created",
    brandId: input.brandId,
    organizationId: input.organizationId,
    targetType: "legal_entity_tax_profile",
    targetId: id,
    metadata: { registrationStatus: input.registrationStatus, stateCode },
  });

  return { id };
}

export async function assignOutletTaxProfile(
  context: PersistenceTransactionContext,
  input: {
    readonly actorWorkforceUserId: string | null;
    readonly outletId: string;
    readonly legalEntityTaxProfileId: string;
    readonly effectiveFrom: Date;
    readonly effectiveTo?: Date | null;
  },
): Promise<{ id: string }> {
  assertTransactionContext(context, "assignOutletTaxProfile");
  const outletRows = await context.db
    .select()
    .from(outletsTable)
    .where(eq(outletsTable.id, input.outletId))
    .limit(1);
  const outlet = outletRows[0];
  if (!outlet) throw new PricingNotFoundError("outlet");

  const profileRows = await context.db
    .select()
    .from(legalEntityTaxProfilesTable)
    .where(eq(legalEntityTaxProfilesTable.id, input.legalEntityTaxProfileId))
    .limit(1);
  const profile = profileRows[0];
  if (!profile || profile.lifecycleStatus !== "active") {
    throw new PricingNotFoundError("legal_entity_tax_profile");
  }
  if (profile.legalEntityId !== outlet.legalEntityId) {
    throw new PricingValidationError({
      message: "Outlet tax profile Legal Entity must match the Outlet Legal Entity.",
    });
  }

  const id = randomUUID();
  const now = new Date();
  await context.db.insert(outletTaxProfilesTable).values({
    id,
    brandId: outlet.brandId,
    organizationId: outlet.organizationId,
    territoryId: outlet.territoryId,
    outletId: outlet.id,
    legalEntityId: outlet.legalEntityId,
    legalEntityTaxProfileId: profile.id,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo ?? null,
    lifecycleStatus: "active",
    assignedByWorkforceUserId: input.actorWorkforceUserId,
    createdAt: now,
    updatedAt: now,
    retiredAt: null,
  });

  await insertPricingTaxAuditEvent(context, {
    actorWorkforceUserId: input.actorWorkforceUserId,
    action: "outlet_tax_profile.assigned",
    brandId: outlet.brandId,
    organizationId: outlet.organizationId,
    territoryId: outlet.territoryId,
    outletId: outlet.id,
    targetType: "outlet_tax_profile",
    targetId: id,
  });

  return { id };
}

type OutletTaxContext = Readonly<{
  registrationStatus: "registered" | "unregistered";
  stateCode: string;
  taxProfileId: string;
}>;

async function resolveOutletTaxContext(
  context: PersistenceQueryContext,
  outletId: string,
  at: Date,
): Promise<OutletTaxContext> {
  const outletRows = await context.db
    .select()
    .from(outletsTable)
    .where(eq(outletsTable.id, outletId))
    .limit(1);
  const outlet = outletRows[0];
  if (!outlet) throw new PricingNotFoundError("outlet");

  const mappingRows = await context.db
    .select()
    .from(outletTaxProfilesTable)
    .where(
      and(
        eq(outletTaxProfilesTable.outletId, outlet.id),
        eq(outletTaxProfilesTable.lifecycleStatus, "active"),
        lte(outletTaxProfilesTable.effectiveFrom, at),
        or(
          isNull(outletTaxProfilesTable.effectiveTo),
          sql`${outletTaxProfilesTable.effectiveTo} > ${at}`,
        ),
      ),
    );
  if (mappingRows.length === 0) {
    throw new PricingResolutionError(
      "TAX_CONFIGURATION_MISSING",
      "Outlet has no effective tax profile mapping.",
    );
  }
  if (mappingRows.length > 1) {
    throw new PricingInvalidStateError({
      message: "Multiple overlapping outlet tax profile mappings.",
    });
  }
  const mapping = mappingRows[0]!;
  const profileRows = await context.db
    .select()
    .from(legalEntityTaxProfilesTable)
    .where(eq(legalEntityTaxProfilesTable.id, mapping.legalEntityTaxProfileId))
    .limit(1);
  const profile = profileRows[0];
  if (!profile || profile.lifecycleStatus !== "active") {
    throw new PricingResolutionError(
      "TAX_CONFIGURATION_MISSING",
      "Mapped legal entity tax profile is missing or inactive.",
    );
  }
  return {
    registrationStatus: profile.registrationStatus as "registered" | "unregistered",
    stateCode: profile.stateCode,
    taxProfileId: profile.id,
  };
}

async function resolveEffectiveTaxPolicy(
  context: PersistenceQueryContext,
  taxCategoryId: string,
  at: Date,
) {
  const rows = await context.db
    .select()
    .from(taxPoliciesTable)
    .where(
      and(
        eq(taxPoliciesTable.taxCategoryId, taxCategoryId),
        eq(taxPoliciesTable.jurisdiction, "IN"),
        eq(taxPoliciesTable.salesChannel, "direct"),
        eq(taxPoliciesTable.lifecycleStatus, "active"),
        lte(taxPoliciesTable.effectiveFrom, at),
        or(isNull(taxPoliciesTable.effectiveTo), sql`${taxPoliciesTable.effectiveTo} > ${at}`),
      ),
    );
  if (rows.length === 0) {
    throw new PricingResolutionError(
      "TAX_CONFIGURATION_MISSING",
      "No effective tax policy for category/jurisdiction/channel.",
    );
  }
  if (rows.length > 1) {
    throw new PricingInvalidStateError({ message: "Overlapping active tax policies." });
  }
  return rows[0]!;
}

/**
 * Largest-remainder allocation of `total` across `weights`.
 * Tie-break: earlier index wins (caller must pre-sort by line sequence then entity id).
 */
export function allocateLargestRemainder(
  total: bigint,
  weights: readonly bigint[],
): bigint[] {
  if (weights.length === 0) return [];
  const weightSum = weights.reduce((a, b) => a + b, BigInt(0));
  if (weightSum === BigInt(0)) {
    return weights.map(() => BigInt(0));
  }
  const exact: { index: number; floor: bigint; frac: bigint }[] = weights.map((w, index) => {
    const product = total * w;
    const floor = product / weightSum;
    const frac = product % weightSum;
    return { index, floor, frac };
  });
  const assigned = exact.reduce((a, r) => a + r.floor, BigInt(0));
  let remaining = total - assigned;
  const order = [...exact].sort((a, b) => {
    if (a.frac !== b.frac) return a.frac > b.frac ? -1 : 1;
    return a.index - b.index;
  });
  const result = exact.map((r) => r.floor);
  for (const entry of order) {
    if (remaining <= BigInt(0)) break;
    result[entry.index]! += BigInt(1);
    remaining -= BigInt(1);
  }
  return result;
}

export async function calculateTax(
  context: PersistenceQueryContext,
  input: {
    readonly outletId: string;
    readonly at: Date;
    readonly taxCategoryId: string;
    readonly taxInclusionMode: TaxInclusionMode;
    /** Already-discounted taxable (exclusive) or gross (inclusive) line amounts. */
    readonly lines: readonly Readonly<{
      lineId: string;
      amountPaise: bigint;
      entityId: string;
    }>[];
    /**
     * Test/future escape hatch. Restaurant V1 with outlet performance location
     * always resolves intra_state (supplier state = POS state).
     */
    readonly forceApplicability?: TaxApplicability;
  },
): Promise<TaxCalculationResult> {
  assertApplicationRole(context, "calculateTax");
  assertUuid(input.outletId, "outletId");
  assertUuid(input.taxCategoryId, "taxCategoryId");

  const sortedLines = [...input.lines].sort((a, b) => {
    const byLine = a.lineId.localeCompare(b.lineId);
    if (byLine !== 0) return byLine;
    return a.entityId.localeCompare(b.entityId);
  });

  const outletTax = await resolveOutletTaxContext(context, input.outletId, input.at);
  if (outletTax.registrationStatus === "unregistered") {
    return {
      applicability: "intra_state",
      taxPolicyId: "",
      taxCategoryId: input.taxCategoryId,
      totalRateBps: 0,
      taxablePaise: sortedLines.reduce((a, l) => a + l.amountPaise, BigInt(0)),
      taxPaise: BigInt(0),
      components: [],
      lineAllocations: sortedLines.map((l) => ({
        lineId: l.lineId,
        taxablePaise: l.amountPaise,
        taxPaise: BigInt(0),
        components: [],
      })),
    };
  }

  const categoryRows = await context.db
    .select()
    .from(taxCategoriesTable)
    .where(eq(taxCategoriesTable.id, input.taxCategoryId))
    .limit(1);
  const category = categoryRows[0];
  if (!category || category.lifecycleStatus !== "active") {
    throw new PricingResolutionError("TAX_CONFIGURATION_MISSING", "Tax category missing.");
  }
  if (category.placeOfSupplyMethod !== "outlet_performance_location") {
    throw new PricingInvalidStateError({ message: "Unsupported place-of-supply method." });
  }

  // Restaurant V1: supplier jurisdiction and POS are both the outlet profile state.
  const applicability: TaxApplicability = input.forceApplicability ?? "intra_state";
  const policy = await resolveEffectiveTaxPolicy(context, input.taxCategoryId, input.at);

  const componentRows = await context.db
    .select()
    .from(taxPolicyComponentsTable)
    .where(
      and(
        eq(taxPolicyComponentsTable.taxPolicyId, policy.id),
        eq(taxPolicyComponentsTable.applicability, applicability),
      ),
    );

  let selected = componentRows;
  if (applicability === "intra_state") {
    const useUt = isUnionTerritoryStateCode(outletTax.stateCode);
    selected = componentRows.filter((c) => {
      if (c.taxType === "cgst") return true;
      if (useUt) return c.taxType === "utgst";
      return c.taxType === "sgst";
    });
  }

  const componentRateSum = selected.reduce((a, c) => a + c.rateBps, 0);
  if (componentRateSum !== policy.totalRateBps) {
    throw new PricingInvalidStateError({
      message: "Tax component rates do not sum to policy total_rate_bps.",
    });
  }

  // Per-line taxable/gross preparation
  const lineTaxables: bigint[] = [];
  const lineTaxes: bigint[] = [];
  for (const line of sortedLines) {
    if (input.taxInclusionMode === "exclusive") {
      lineTaxables.push(line.amountPaise);
      lineTaxes.push(taxExclusivePaise(line.amountPaise, policy.totalRateBps));
    } else {
      const split = taxInclusiveSplit(line.amountPaise, policy.totalRateBps);
      lineTaxables.push(split.taxablePaise);
      lineTaxes.push(split.taxPaise);
    }
  }

  // Bucket totals — authoritative tax from bucket taxable (exclusive path)
  const bucketTaxable = lineTaxables.reduce((a, b) => a + b, BigInt(0));
  let bucketTax: bigint;
  if (input.taxInclusionMode === "exclusive") {
    bucketTax = taxExclusivePaise(bucketTaxable, policy.totalRateBps);
  } else {
    const bucketGross = sortedLines.reduce((a, l) => a + l.amountPaise, BigInt(0));
    bucketTax = taxInclusiveSplit(bucketGross, policy.totalRateBps).taxPaise;
  }

  // Re-allocate bucket tax to lines via largest remainder on taxable weights
  const allocatedLineTax = allocateLargestRemainder(bucketTax, lineTaxables);

  // Component bucket amounts
  const componentBucketAmounts = selected.map((c) =>
    taxExclusivePaise(bucketTaxable, c.rateBps),
  );
  // Adjust last component so sum equals bucketTax (deterministic)
  let componentSum = componentBucketAmounts.reduce((a, b) => a + b, BigInt(0));
  if (componentSum !== bucketTax && componentBucketAmounts.length > 0) {
    const last = componentBucketAmounts.length - 1;
    componentBucketAmounts[last] = componentBucketAmounts[last]! + (bucketTax - componentSum);
    componentSum = bucketTax;
  }

  const lineAllocations: TaxLineAllocation[] = sortedLines.map((line, i) => {
    const lineTax = allocatedLineTax[i]!;
    const lineTaxable = lineTaxables[i]!;
    const componentShares = allocateLargestRemainder(
      lineTax,
      selected.map((c) => BigInt(c.rateBps)),
    );
    const components: TaxComponentAmount[] = selected.map((c, j) => ({
      taxType: c.taxType as TaxType,
      rateBps: c.rateBps,
      amountPaise: componentShares[j]!,
    }));
    return {
      lineId: line.lineId,
      taxablePaise: lineTaxable,
      taxPaise: lineTax,
      components,
    };
  });

  // Align component totals to bucket component amounts via residual on last line
  for (let j = 0; j < selected.length; j++) {
    let sum = BigInt(0);
    for (const alloc of lineAllocations) {
      sum += alloc.components[j]!.amountPaise;
    }
    const target = componentBucketAmounts[j]!;
    const drift = target - sum;
    if (drift !== BigInt(0) && lineAllocations.length > 0) {
      const last = lineAllocations[lineAllocations.length - 1]!;
      const comps = [...last.components];
      comps[j] = {
        ...comps[j]!,
        amountPaise: comps[j]!.amountPaise + drift,
      };
      lineAllocations[lineAllocations.length - 1] = {
        ...last,
        taxPaise: last.taxPaise + drift,
        components: comps,
      };
    }
  }

  const totalTax = lineAllocations.reduce((a, l) => a + l.taxPaise, BigInt(0));
  const totalTaxable = lineAllocations.reduce((a, l) => a + l.taxablePaise, BigInt(0));

  const aggregateComponents: TaxComponentAmount[] = selected.map((c, j) => ({
    taxType: c.taxType as TaxType,
    rateBps: c.rateBps,
    amountPaise: lineAllocations.reduce((a, l) => a + l.components[j]!.amountPaise, BigInt(0)),
  }));

  return {
    applicability,
    taxPolicyId: policy.id,
    taxCategoryId: input.taxCategoryId,
    totalRateBps: policy.totalRateBps,
    taxablePaise: totalTaxable,
    taxPaise: totalTax,
    components: aggregateComponents,
    lineAllocations,
  };
}
