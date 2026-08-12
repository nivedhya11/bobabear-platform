/**
 * Build immutable Checkout snapshot candidate (IMP-021).
 */

import { randomUUID } from "node:crypto";

import type {
  CheckoutDestination,
  CheckoutSnapshot,
} from "../../shared/checkout";
import type { CheckoutCommercialResult } from "./adapters/pricing";
import type { SnapshotCommitPayload } from "./repository";

export type SnapshotCandidate = Readonly<{
  commercial: CheckoutSnapshot;
  commit: SnapshotCommitPayload;
}>;

export function buildSnapshotCandidate(input: {
  checkoutId: string;
  checkoutRevision: bigint;
  sourceCartRevision: bigint;
  selectedOutletId: string;
  evaluatedAt: Date;
  serviceabilityEvaluatedAt: Date;
  manualCouponCode: string | null;
  destination: CheckoutDestination;
  commercial: CheckoutCommercialResult;
  expiresAt: Date;
  updatedAt: Date;
}): SnapshotCandidate {
  const snapshotId = randomUUID();
  const createdAt = input.evaluatedAt;

  const lines = input.commercial.lines.map((line) => {
    const lineId = randomUUID();
    return Object.freeze({
      id: lineId,
      sourceCartLineId: line.sourceCartLineId,
      productId: line.productId,
      variantId: line.variantId,
      productName: line.productName,
      variantName: line.variantName,
      quantity: line.quantity,
      lineBasePaise: line.lineBasePaise,
      lineModifierAdjustmentsPaise: line.lineModifierAdjustmentsPaise,
      lineBundleAdjustmentsPaise: line.lineBundleAdjustmentsPaise,
      lineSubtotalPaise: line.lineSubtotalPaise,
      linePromotionDiscountPaise: line.linePromotionDiscountPaise,
      lineTaxablePaise: line.lineTaxablePaise,
      lineTaxPaise: line.lineTaxPaise,
      lineTotalPaise: line.lineTotalPaise,
      sequence: line.sequence,
      modifiers: line.modifiers.map((m) => Object.freeze({ ...m })),
      bundleSelections: line.bundleSelections.map((b) =>
        Object.freeze({
          id: randomUUID(),
          ...b,
          modifiers: b.modifiers.map((m) => Object.freeze({ ...m })),
        }),
      ),
    });
  });

  const charges = input.commercial.charges.map((c) =>
    Object.freeze({
      id: randomUUID(),
      ...c,
    }),
  );

  const promotionEffects = input.commercial.promotionEffects.map((e) =>
    Object.freeze({
      id: randomUUID(),
      ...e,
    }),
  );

  const taxComponents = input.commercial.taxComponents.map((t) =>
    Object.freeze({
      id: randomUUID(),
      ...t,
    }),
  );

  const q = input.commercial.quote;
  const commercial: CheckoutSnapshot = Object.freeze({
    id: snapshotId,
    checkoutId: input.checkoutId,
    checkoutRevision: input.checkoutRevision,
    sourceCartRevision: input.sourceCartRevision,
    selectedOutletId: input.selectedOutletId,
    evaluatedAt: input.evaluatedAt,
    serviceabilityEvaluatedAt: input.serviceabilityEvaluatedAt,
    currency: "INR",
    manualCouponCode: input.manualCouponCode,
    destination: input.destination,
    basePaise: q.basePaise,
    modifierAdjustmentsPaise: q.modifierAdjustmentsPaise,
    bundleAdjustmentsPaise: q.bundleAdjustmentsPaise,
    chargesPaise: q.chargesPaise,
    prePromotionSubtotalPaise: q.prePromotionSubtotalPaise,
    promotionDiscountPaise: q.promotionDiscountPaise,
    taxablePaise: q.taxablePaise,
    taxPaise: q.taxPaise,
    grandTotalPaise: q.grandTotalPaise,
    taxInclusionMode: q.taxInclusionMode,
    createdAt,
    lines: Object.freeze(lines),
    charges: Object.freeze(charges),
    promotionEffects: Object.freeze(promotionEffects),
    taxComponents: Object.freeze(taxComponents),
  });

  const commit: SnapshotCommitPayload = Object.freeze({
    snapshotId,
    checkoutRevision: input.checkoutRevision,
    sourceCartRevision: input.sourceCartRevision,
    selectedOutletId: input.selectedOutletId,
    evaluatedAt: input.evaluatedAt,
    serviceabilityEvaluatedAt: input.serviceabilityEvaluatedAt,
    currency: "INR",
    manualCouponCode: input.manualCouponCode,
    destination: input.destination,
    basePaise: q.basePaise,
    modifierAdjustmentsPaise: q.modifierAdjustmentsPaise,
    bundleAdjustmentsPaise: q.bundleAdjustmentsPaise,
    chargesPaise: q.chargesPaise,
    prePromotionSubtotalPaise: q.prePromotionSubtotalPaise,
    promotionDiscountPaise: q.promotionDiscountPaise,
    taxablePaise: q.taxablePaise,
    taxPaise: q.taxPaise,
    grandTotalPaise: q.grandTotalPaise,
    taxInclusionMode: q.taxInclusionMode,
    createdAt,
    lines,
    charges,
    promotionEffects,
    taxComponents,
    expiresAt: input.expiresAt,
    updatedAt: input.updatedAt,
  });

  return Object.freeze({ commercial, commit });
}
