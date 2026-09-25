/**
 * Build immutable Checkout snapshot candidate (IMP-021 / IMP-036H-B).
 */

import { randomUUID } from "node:crypto";

import type {
  CheckoutDestination,
  CheckoutPickupLocation,
  CheckoutSnapshot,
  FulfilmentMode,
} from "../../shared/checkout";
import type { CheckoutCommercialResult } from "./adapters/pricing";
import type { SnapshotCommitPayload } from "./repository";
import type { ScheduledSnapshotSeal } from "./scheduled-eligibility";

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
  fulfilmentMode: FulfilmentMode;
  /** Required for DELIVERY; null for PICKUP. */
  serviceabilityEvaluatedAt: Date | null;
  manualCouponCode: string | null;
  /** Required for DELIVERY; null for PICKUP. */
  destination: CheckoutDestination | null;
  /** Required for PICKUP; null for DELIVERY. */
  pickupLocation: CheckoutPickupLocation | null;
  commercial: CheckoutCommercialResult;
  expiresAt: Date;
  updatedAt: Date;
  scheduledSeal?: ScheduledSnapshotSeal | null;
}): SnapshotCandidate {
  const snapshotId = randomUUID();
  const createdAt = input.evaluatedAt;
  const fulfilmentMode = input.fulfilmentMode;
  const destination =
    fulfilmentMode === "DELIVERY" ? input.destination : null;
  const pickupLocation =
    fulfilmentMode === "PICKUP" ? input.pickupLocation : null;
  const serviceabilityEvaluatedAt =
    fulfilmentMode === "DELIVERY" ? input.serviceabilityEvaluatedAt : null;

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
  const seal = input.scheduledSeal ?? null;
  const commercial: CheckoutSnapshot = Object.freeze({
    id: snapshotId,
    checkoutId: input.checkoutId,
    checkoutRevision: input.checkoutRevision,
    sourceCartRevision: input.sourceCartRevision,
    selectedOutletId: input.selectedOutletId,
    evaluatedAt: input.evaluatedAt,
    fulfilmentMode,
    fulfilmentTiming: seal ? "SCHEDULED" : "ASAP",
    scheduledWindowStartAt: seal?.scheduledWindowStartAt ?? null,
    scheduledWindowEndAt: seal?.scheduledWindowEndAt ?? null,
    scheduledTimezone: seal?.scheduledTimezone ?? null,
    scheduledCancellationCutoffMinutes:
      seal?.scheduledCancellationCutoffMinutes ?? null,
    serviceabilityEvaluatedAt,
    currency: "INR",
    manualCouponCode: input.manualCouponCode,
    destination,
    pickupLocation,
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
    fulfilmentMode,
    fulfilmentTiming: seal ? "SCHEDULED" : "ASAP",
    scheduledWindowStartAt: seal?.scheduledWindowStartAt ?? null,
    scheduledWindowEndAt: seal?.scheduledWindowEndAt ?? null,
    scheduledTimezone: seal?.scheduledTimezone ?? null,
    scheduledCancellationCutoffMinutes:
      seal?.scheduledCancellationCutoffMinutes ?? null,
    serviceabilityEvaluatedAt,
    currency: "INR",
    manualCouponCode: input.manualCouponCode,
    destination,
    pickupLocation,
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
