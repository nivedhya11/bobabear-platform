/**
 * Candidate construction and best-price selection helpers (IMP-016).
 */
import {
  allocateCombinablePromotions,
  allocateSinglePromotion,
  applyAllocationsToComponents,
  type PromoNominal,
} from "./allocate";
import { calculateBenefit } from "./benefit";
import type {
  AppliedPromotion,
  MonetaryComponent,
  PrePromotionSnapshot,
  PromotionAllocation,
  PromotionCandidateResult,
  PromotionDefinition,
} from "./types";

export type EligiblePromotion = Readonly<{
  promotion: PromotionDefinition;
  couponId?: string | null;
}>;

function toApplied(
  promotion: PromotionDefinition,
  realized: bigint,
  couponId?: string | null,
): AppliedPromotion | null {
  if (realized <= BigInt(0)) return null;
  return {
    promotionId: promotion.id,
    code: promotion.code,
    displayName: promotion.displayName,
    triggerType: promotion.triggerType,
    stackingPolicy: promotion.stackingPolicy,
    realizedDiscountPaise: realized,
    couponId: couponId ?? null,
  };
}

function candidateFromAllocations(
  promotions: readonly EligiblePromotion[],
  allocations: readonly PromotionAllocation[],
  components: readonly MonetaryComponent[],
): PromotionCandidateResult {
  const byPromo = new Map<string, bigint>();
  for (const a of allocations) {
    byPromo.set(a.promotionId, (byPromo.get(a.promotionId) ?? BigInt(0)) + a.amountPaise);
  }
  const applied: AppliedPromotion[] = [];
  const promotionIds: string[] = [];
  for (const ep of promotions) {
    const realized = byPromo.get(ep.promotion.id) ?? BigInt(0);
    const app = toApplied(ep.promotion, realized, ep.couponId);
    if (app) {
      applied.push(app);
      promotionIds.push(ep.promotion.id);
    }
  }
  const discount = allocations.reduce((a, x) => a + x.amountPaise, BigInt(0));
  return {
    promotionIds,
    allocations,
    promotionDiscountTotalPaise: discount,
    postPromotionComponents: applyAllocationsToComponents(components, allocations),
    appliedPromotions: applied,
  };
}

export function buildPromotionCandidates(
  eligible: readonly EligiblePromotion[],
  snapshot: PrePromotionSnapshot,
): PromotionCandidateResult[] {
  const baseline: PromotionCandidateResult = {
    promotionIds: [],
    allocations: [],
    promotionDiscountTotalPaise: BigInt(0),
    postPromotionComponents: snapshot.components.map((c) => ({ ...c })),
    appliedPromotions: [],
  };

  const exclusives = eligible.filter((e) => e.promotion.stackingPolicy === "exclusive");
  const combinables = eligible.filter((e) => e.promotion.stackingPolicy === "combinable");

  const candidates: PromotionCandidateResult[] = [baseline];

  for (const ep of exclusives) {
    const benefit = calculateBenefit(ep.promotion, snapshot);
    if (benefit.nominalBenefitPaise <= BigInt(0)) {
      candidates.push(
        candidateFromAllocations([ep], [], snapshot.components),
      );
      continue;
    }
    const comps = snapshot.components.filter((c) =>
      benefit.eligibleComponentIds.includes(c.componentId),
    );
    const allocations = allocateSinglePromotion(
      ep.promotion.id,
      benefit.nominalBenefitPaise,
      comps,
    );
    candidates.push(candidateFromAllocations([ep], allocations, snapshot.components));
  }

  if (combinables.length > 0) {
    const nominals: PromoNominal[] = combinables.map((ep) => {
      const benefit = calculateBenefit(ep.promotion, snapshot);
      return {
        promotion: ep.promotion,
        nominalBenefitPaise: benefit.nominalBenefitPaise,
        eligibleComponentIds: benefit.eligibleComponentIds,
      };
    });
    const { allocations } = allocateCombinablePromotions(nominals, snapshot.components);
    candidates.push(candidateFromAllocations(combinables, allocations, snapshot.components));
  }

  return candidates;
}

/**
 * Select winning candidate after caller attaches post-tax grand totals.
 * Safety: winner.grandTotal must be <= baseline.grandTotal.
 */
export function selectBestCandidate<
  T extends {
    promotionDiscountTotalPaise: bigint;
    promotionIds: readonly string[];
    grandTotalPaise: bigint;
  },
>(
  candidates: readonly T[],
  promotionsById: ReadonlyMap<string, PromotionDefinition>,
): T {
  if (candidates.length === 0) {
    throw new Error("selectBestCandidate requires at least baseline candidate");
  }
  const baseline = candidates[0]!;
  let best = baseline;
  for (const c of candidates) {
    if (c.grandTotalPaise > baseline.grandTotalPaise) continue; // safety
    if (c.grandTotalPaise < best.grandTotalPaise) {
      best = c;
      continue;
    }
    if (c.grandTotalPaise > best.grandTotalPaise) continue;
    // tie: higher realized discount
    if (c.promotionDiscountTotalPaise !== best.promotionDiscountTotalPaise) {
      if (c.promotionDiscountTotalPaise > best.promotionDiscountTotalPaise) best = c;
      continue;
    }
    const pri = (ids: readonly string[]) =>
      ids.reduce((m, id) => Math.max(m, promotionsById.get(id)?.priority ?? 0), Number.NEGATIVE_INFINITY);
    const pBest = pri(best.promotionIds);
    const pCand = pri(c.promotionIds);
    if (pCand !== pBest) {
      if (pCand > pBest) best = c;
      continue;
    }
    const earliest = (ids: readonly string[]) =>
      ids.reduce(
        (m, id) => Math.min(m, promotionsById.get(id)?.startsAt.getTime() ?? Number.POSITIVE_INFINITY),
        Number.POSITIVE_INFINITY,
      );
    const eBest = earliest(best.promotionIds);
    const eCand = earliest(c.promotionIds);
    if (eCand !== eBest) {
      if (eCand < eBest) best = c;
      continue;
    }
    const key = (ids: readonly string[]) => [...ids].sort().join(",");
    if (key(c.promotionIds).localeCompare(key(best.promotionIds)) < 0) best = c;
  }
  return best;
}
