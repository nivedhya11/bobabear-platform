/**
 * Request-scoped outlet eligibility composition for Customer Menu projection.
 *
 * Preloads outlet-wide ancestry / operating / assortment / availability /
 * catalog / modifier / bundle feasibility authority once, then reuses IMP-014
 * decision semantics without a second policy engine or nested scalar fanout.
 */
import "server-only";

import type { AvailabilityState } from "../../shared/assortment";
import type { PersistenceQueryContext } from "../persistence/types";
import {
  loadOutletEligibilityComposition,
  type OutletEligibilityComposition,
} from "./eligibility-composition-preload";
import {
  resolveOutletVariantAvailability,
  type OutletVariantEligibilityPreload,
} from "./resolve-eligibility";
import type { EligibilityDecision } from "./types";

export type OutletEligibilitySession = Readonly<{
  ancestry: OutletEligibilityComposition["ancestry"];
  operating: OutletEligibilityComposition["operating"];
  now: Date;
  includedVariantIds: ReadonlySet<string>;
  variantAvailability: ReadonlyMap<string, AvailabilityState>;
  exclusions: OutletEligibilityComposition["exclusions"];
  preload: OutletVariantEligibilityPreload;
  /** Resolve one variant using preloaded composition authority. */
  resolveVariant(variantId: string): Promise<EligibilityDecision>;
  opsAvailability(variantId: string): AvailabilityState;
}>;

function compositionToPreload(
  composition: OutletEligibilityComposition,
): OutletVariantEligibilityPreload {
  return {
    ancestry: composition.ancestry,
    operating: composition.operating,
    includedVariantIds: composition.includedVariantIds,
    variantAvailability: composition.variantAvailability,
    exclusions: composition.exclusions,
    variantsById: composition.variantsById,
    productsById: composition.productsById,
    modifierFeasibilityByVariantId: composition.modifierFeasibilityByVariantId,
    bundleFeasibilityByVariantId: composition.bundleFeasibilityByVariantId,
    modifierOptionAvailability: composition.modifierOptionAvailability,
  };
}

/**
 * Create a menu-projection session that loads outlet composition inputs once.
 */
export async function createOutletEligibilitySession(
  context: PersistenceQueryContext,
  input: Readonly<{
    outletId: string;
    variantIds: readonly string[];
    now: Date;
  }>,
): Promise<OutletEligibilitySession> {
  const composition = await loadOutletEligibilityComposition(context, input);
  const preload = compositionToPreload(composition);
  const decisionCache = new Map<string, Promise<EligibilityDecision>>();

  return {
    ancestry: composition.ancestry,
    operating: composition.operating,
    now: input.now,
    includedVariantIds: composition.includedVariantIds,
    variantAvailability: composition.variantAvailability,
    exclusions: composition.exclusions,
    preload,
    opsAvailability(variantId: string): AvailabilityState {
      return composition.variantAvailability.get(variantId) ?? "available";
    },
    resolveVariant(variantId: string): Promise<EligibilityDecision> {
      const cached = decisionCache.get(variantId);
      if (cached) return cached;

      const pending = resolveOutletVariantAvailability(
        context,
        {
          variantId,
          outletId: input.outletId,
          context: { now: input.now },
        },
        preload,
      );
      decisionCache.set(variantId, pending);
      return pending;
    },
  };
}
