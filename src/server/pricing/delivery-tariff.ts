/**
 * Pricing-owned customer delivery tariff (IMP-036F F5).
 *
 * Business authority is Pricing. Physical columns remain on the existing
 * serviceability-config row. Geographic eligibility is untouched.
 */
import {
  parseDeliveryFeeBands,
  validateDeliveryFeeBands,
  validateFreeDeliveryThresholdPaise,
  type DeliveryFeeBand,
} from "../../shared/pricing/delivery-fee-policy";
import { requireWorkforcePrincipal } from "../access-control/principal";
import { findOutletById } from "../organization/outlets";
import type { PersistenceQueryContext, PersistenceTransactionContext } from "../persistence/types";
import {
  findOutletDeliveryTariff,
  lockOutletDeliveryTariffForUpdate,
  lockOutletForServiceabilityMutation,
  updateOutletDeliveryTariffFields,
} from "../serviceability/repository";
import { assertApplicationRole, assertTransactionContext, assertUuid } from "./assert-role";
import { insertPricingTaxAuditEvent } from "./audit";
import { requirePricingManage, requirePricingRead } from "./authorize-pricing";
import {
  PricingConflictError,
  PricingNotFoundError,
  PricingValidationError,
} from "./errors";

function staleTariffRevision(): never {
  throw new PricingConflictError({
    code: "TARIFF_STALE_REVISION",
    message:
      "expectedTariffConfigRevision does not match current serviceability config revision; no mutation effect.",
  });
}

export function parseExpectedTariffConfigRevision(
  value: unknown,
  field = "expectedTariffConfigRevision",
): bigint {
  if (typeof value === "bigint") {
    if (value <= BigInt(0)) {
      throw new PricingValidationError({ message: `${field} must be > 0.` });
    }
    return value;
  }
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    return BigInt(value);
  }
  if (typeof value === "string" && /^\d+$/.test(value) && value !== "0" && !/^0\d+/.test(value)) {
    const parsed = BigInt(value);
    if (parsed <= BigInt(0)) {
      throw new PricingValidationError({ message: `${field} must be > 0.` });
    }
    return parsed;
  }
  throw new PricingValidationError({ message: `${field} must be a positive integer.` });
}

export type DeliveryTariffProjection = Readonly<{
  outletId: string;
  brandId: string;
  expectedTariffConfigRevision: string;
  deliveryFeeBands: readonly DeliveryFeeBand[];
  freeDeliverySubtotalThresholdPaise: string | null;
  geographicServiceability: Readonly<{
    routingPriority: number;
    serviceOriginLatitude: string | null;
    serviceOriginLongitude: string | null;
    maxServiceDistanceMeters: number | null;
  }>;
}>;

export type DeliveryTariffConsequencePreview = Readonly<{
  outletId: string;
  brandId: string;
  expectedTariffConfigRevision: string;
  currentBands: readonly DeliveryFeeBand[];
  proposedBands: readonly DeliveryFeeBand[];
  currentFreeDeliverySubtotalThresholdPaise: string | null;
  proposedFreeDeliverySubtotalThresholdPaise: string | null;
  customerMonetaryImplication: string;
  wouldChangeCustomerDeliveryPrice: boolean;
  geographicServiceabilityUnchanged: true;
}>;

async function loadAuthorizedOutlet(
  context: PersistenceQueryContext,
  input: { actor: unknown; outletId: string; pathBrandId?: string },
  permission: "read" | "manage",
) {
  const outletId = assertUuid(input.outletId, "outletId");
  const outlet = await findOutletById(context, outletId);
  if (!outlet) throw new PricingNotFoundError("outlet");
  if (input.pathBrandId && outlet.brandId !== assertUuid(input.pathBrandId, "brandId")) {
    throw new PricingNotFoundError("outlet");
  }
  if (permission === "read") {
    await requirePricingRead(context, input.actor, outlet.brandId);
  } else {
    await requirePricingManage(context, input.actor, outlet.brandId);
  }
  return outlet;
}

function bandsEqual(a: readonly DeliveryFeeBand[], b: readonly DeliveryFeeBand[]): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (band, i) =>
      band.maxDistanceMeters === b[i]!.maxDistanceMeters && band.amountPaise === b[i]!.amountPaise,
  );
}

function thresholdLabel(value: bigint | null): string {
  return value === null ? "null" : value.toString(10);
}

export async function readOutletDeliveryTariff(
  context: PersistenceQueryContext,
  input: { actor: unknown; outletId: string; pathBrandId?: string },
): Promise<DeliveryTariffProjection> {
  assertApplicationRole(context, "readOutletDeliveryTariff");
  const outlet = await loadAuthorizedOutlet(context, input, "read");
  const row = await findOutletDeliveryTariff(context, outlet.id);
  if (!row) {
    throw new PricingValidationError({
      message: "Outlet has no serviceability configuration to hold tariff policy.",
    });
  }
  return {
    outletId: outlet.id,
    brandId: outlet.brandId,
    expectedTariffConfigRevision: row.revision.toString(10),
    deliveryFeeBands: parseDeliveryFeeBands(row.deliveryFeeBands),
    freeDeliverySubtotalThresholdPaise: row.freeDeliverySubtotalThresholdPaise?.toString(10) ?? null,
    geographicServiceability: {
      routingPriority: row.routingPriority,
      serviceOriginLatitude: row.serviceOriginLatitude,
      serviceOriginLongitude: row.serviceOriginLongitude,
      maxServiceDistanceMeters: row.maxServiceDistanceMeters,
    },
  };
}

export async function previewOutletDeliveryTariffConsequence(
  context: PersistenceQueryContext,
  input: {
    actor: unknown;
    outletId: string;
    pathBrandId?: string;
    proposedDeliveryFeeBands: unknown;
    proposedFreeDeliverySubtotalThresholdPaise: unknown;
  },
): Promise<DeliveryTariffConsequencePreview> {
  assertApplicationRole(context, "previewOutletDeliveryTariffConsequence");
  const outlet = await loadAuthorizedOutlet(context, input, "manage");
  const row = await findOutletDeliveryTariff(context, outlet.id);
  if (!row) {
    throw new PricingValidationError({
      message: "Outlet has no serviceability configuration to hold tariff policy.",
    });
  }
  const bandsResult = validateDeliveryFeeBands(input.proposedDeliveryFeeBands);
  if (!bandsResult.ok) {
    throw new PricingValidationError({ message: bandsResult.issues.join(" ") });
  }
  const thresholdResult = validateFreeDeliveryThresholdPaise(
    input.proposedFreeDeliverySubtotalThresholdPaise,
  );
  if (!thresholdResult.ok) {
    throw new PricingValidationError({ message: thresholdResult.issues.join(" ") });
  }
  const currentBands = parseDeliveryFeeBands(row.deliveryFeeBands);
  const currentThreshold = row.freeDeliverySubtotalThresholdPaise ?? null;
  const wouldChange =
    !bandsEqual(currentBands, bandsResult.bands) || currentThreshold !== thresholdResult.thresholdPaise;
  return {
    outletId: outlet.id,
    brandId: outlet.brandId,
    expectedTariffConfigRevision: row.revision.toString(10),
    currentBands,
    proposedBands: bandsResult.bands,
    currentFreeDeliverySubtotalThresholdPaise:
      currentThreshold === null ? null : currentThreshold.toString(10),
    proposedFreeDeliverySubtotalThresholdPaise:
      thresholdResult.thresholdPaise === null ? null : thresholdResult.thresholdPaise.toString(10),
    customerMonetaryImplication: wouldChange
      ? "Customer delivery charge evaluation will use the proposed bands and free-delivery threshold after effect."
      : "Proposed tariff matches the current customer delivery-price policy.",
    wouldChangeCustomerDeliveryPrice: wouldChange,
    geographicServiceabilityUnchanged: true,
  };
}

export async function updateOutletDeliveryTariff(
  context: PersistenceTransactionContext,
  input: {
    actor: unknown;
    outletId: string;
    pathBrandId?: string;
    expectedTariffConfigRevision: bigint | number | string;
    deliveryFeeBands: unknown;
    freeDeliverySubtotalThresholdPaise: unknown;
  },
): Promise<{ revision: bigint }> {
  assertTransactionContext(context, "updateOutletDeliveryTariff");
  const expected = parseExpectedTariffConfigRevision(input.expectedTariffConfigRevision);
  const outlet = await loadAuthorizedOutlet(context, input, "manage");
  const principal = requireWorkforcePrincipal(input.actor);

  const bandsResult = validateDeliveryFeeBands(input.deliveryFeeBands);
  if (!bandsResult.ok) {
    throw new PricingValidationError({ message: bandsResult.issues.join(" ") });
  }
  const thresholdResult = validateFreeDeliveryThresholdPaise(
    input.freeDeliverySubtotalThresholdPaise,
  );
  if (!thresholdResult.ok) {
    throw new PricingValidationError({ message: thresholdResult.issues.join(" ") });
  }

  await lockOutletForServiceabilityMutation(context, outlet.id);
  const row = await lockOutletDeliveryTariffForUpdate(context, outlet.id);
  if (!row) {
    throw new PricingValidationError({
      message: "Outlet has no serviceability configuration to hold tariff policy.",
    });
  }
  if (row.revision !== expected) staleTariffRevision();

  const next = row.revision + BigInt(1);
  const persisted = await updateOutletDeliveryTariffFields(context, {
    outletId: outlet.id,
    expectedRevision: expected,
    deliveryFeeBands: bandsResult.bands,
    freeDeliverySubtotalThresholdPaise: thresholdResult.thresholdPaise,
    nextRevision: next,
  });
  if (!persisted) staleTariffRevision();

  await insertPricingTaxAuditEvent(context, {
    actorWorkforceUserId: principal.workforceUserId,
    action: "delivery_tariff.updated",
    brandId: outlet.brandId,
    outletId: outlet.id,
    targetType: "outlet_delivery_tariff",
    targetId: outlet.id,
    metadata: {
      previousRevision: row.revision.toString(10),
      newRevision: next.toString(10),
      bandCount: bandsResult.bands.length,
      freeDeliverySubtotalThresholdPaise: thresholdLabel(thresholdResult.thresholdPaise),
    },
  });

  return { revision: next };
}
