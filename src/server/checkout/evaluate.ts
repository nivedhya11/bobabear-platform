/**
 * evaluateCheckout orchestration (IMP-021 / IMP-036H-B).
 *
 * Preferred flow: read coherent state → evaluate outside long lock →
 * short commit transaction with rechecks.
 *
 * DELIVERY: destination + serviceability (unchanged).
 * PICKUP: eligible pickup outlet; MUST NOT call resolveCheckoutServiceability;
 * destination is not sealed into the snapshot.
 */

import {
  CheckoutError,
  isLogicallyExpired,
  parseEvaluateCheckoutInput,
  requireCheckoutTtlMs,
  type Checkout,
  type CheckoutEvaluationSuccess,
  type CheckoutMerchandiseProblem,
  type FulfilmentMode,
} from "../../shared/checkout";
import type { Persistence } from "../persistence/types";
import { requireCustomerActor } from "../cart/actor";
import {
  findCartRowById,
  loadCartAggregate,
  lockCartForUpdate,
} from "../cart/repository";
import { collectAssortmentAvailabilityProblems } from "./adapters/assortment-availability";
import {
  loadCatalogLabelsForCart,
  validateCheckoutCartMerchandise,
} from "./adapters/catalog";
import { buildCheckoutCommercialResult } from "./adapters/pricing";
import { resolveCheckoutServiceability } from "./adapters/serviceability";
import { systemCheckoutClock } from "./clock";
import { checkoutSnapshotsStructurallyEqual } from "./compare-snapshots";
import type { CheckoutOperationOptions } from "./operations";
import {
  assertPickupOutletEligible,
  pickupLocationFromProfile,
} from "./pickup-eligibility";
import { loadOutletPickupProfileByOutletId } from "../outlet-pickup-profile/repository";
import {
  commitReadySnapshot,
  findCheckoutRowById,
  findDestinationByCheckoutId,
  loadCheckoutAggregate,
  lockCheckoutForUpdate,
  mapDestinationRow,
  newSnapshotId,
} from "./repository";
import { buildSnapshotCandidate } from "./snapshot";

function primaryMerchandiseCode(
  problems: readonly CheckoutMerchandiseProblem[],
): CheckoutMerchandiseProblem["code"] {
  return problems[0]!.code;
}

export async function evaluateCheckout(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: CheckoutOperationOptions = {},
): Promise<CheckoutEvaluationSuccess> {
  const customer = requireCustomerActor(actor);
  const clock = options.clock ?? systemCheckoutClock;
  const now = clock.now();
  const ttlMs = requireCheckoutTtlMs(options.policy);
  const parsed = parseEvaluateCheckoutInput(input);

  // Phase 1: coherent read (no long locks).
  const preload = await persistence.withContext(async (ctx) => {
    const row = await findCheckoutRowById(ctx, parsed.checkoutId);
    if (!row || row.customerAuthUserId !== customer.authUserId) {
      throw new CheckoutError("CHECKOUT_NOT_FOUND", "Checkout not found.");
    }
    if (row.status === "PAYMENT_PENDING") {
      throw new CheckoutError(
        "CHECKOUT_STATE_CONFLICT",
        "Cannot evaluate a PAYMENT_PENDING Checkout.",
      );
    }
    if (
      row.status === "COMPLETED" ||
      row.status === "CANCELLED" ||
      row.status === "EXPIRED"
    ) {
      throw new CheckoutError(
        "CHECKOUT_STATE_CONFLICT",
        "Cannot evaluate a terminal Checkout.",
      );
    }
    if (isLogicallyExpired(row.expiresAt, now)) {
      throw new CheckoutError("CHECKOUT_EXPIRED", "Checkout has expired.");
    }
    if (row.revision !== parsed.expectedCheckoutRevision) {
      throw new CheckoutError(
        "CHECKOUT_CONFLICT",
        "Checkout revision does not match expectedCheckoutRevision.",
        { field: "expectedCheckoutRevision" },
      );
    }
    // Tranche 2 owns scheduled eligibility and snapshot sealing. Until that
    // path exists, a SCHEDULED Checkout must not be evaluated into an ASAP Snapshot.
    if ((row.fulfilmentTiming ?? "ASAP") === "SCHEDULED") {
      throw new CheckoutError(
        "CHECKOUT_STATE_CONFLICT",
        "Cannot evaluate a SCHEDULED Checkout.",
      );
    }

    const fulfilmentMode = (row.fulfilmentMode ?? "DELIVERY") as FulfilmentMode;
    const pickupOutletId = row.pickupOutletId ?? null;

    const destRow = await findDestinationByCheckoutId(ctx, row.id);
    const destination = destRow ? mapDestinationRow(destRow) : null;
    if (fulfilmentMode === "DELIVERY" && !destination) {
      throw new CheckoutError(
        "CHECKOUT_DESTINATION_REQUIRED",
        "Checkout destination is required before evaluation.",
      );
    }
    if (fulfilmentMode === "PICKUP" && !pickupOutletId) {
      throw new CheckoutError(
        "PICKUP_OUTLET_REQUIRED",
        "Pickup outlet is required before evaluation.",
        { field: "pickupOutletId" },
      );
    }

    const cartRow = await findCartRowById(ctx, row.cartId);
    if (!cartRow || cartRow.customerAuthUserId !== customer.authUserId) {
      throw new CheckoutError("CHECKOUT_NOT_FOUND", "Checkout not found.");
    }
    const cart = await loadCartAggregate(ctx, cartRow);
    if (cart.lines.length === 0) {
      throw new CheckoutError(
        "CHECKOUT_EMPTY_CART",
        "Checkout requires a non-empty Cart.",
      );
    }
    if (cart.revision !== row.sourceCartRevision) {
      if (row.status === "READY_FOR_PAYMENT") {
        throw new CheckoutError(
          "CHECKOUT_CART_CHANGED",
          "Cart revision changed since this Checkout was prepared.",
        );
      }
    }

    const checkout = await loadCheckoutAggregate(ctx, row);
    return Object.freeze({
      row,
      fulfilmentMode,
      pickupOutletId,
      destination,
      cart,
      checkout,
    });
  });

  let selectedOutletId: string;
  let serviceabilityEvaluatedAt: Date | null = null;

  if (preload.fulfilmentMode === "DELIVERY") {
    const serviceability = await resolveCheckoutServiceability(
      persistence,
      preload.row.brandId,
      preload.destination!,
      clock,
    );
    selectedOutletId = serviceability.selectedOutletId;
    serviceabilityEvaluatedAt = serviceability.evaluatedAt;
  } else {
    // PICKUP MUST NOT call resolveCheckoutServiceability.
    selectedOutletId = preload.pickupOutletId!;
  }

  const merchandiseProblems: CheckoutMerchandiseProblem[] = [];
  let pickupLocation = null as ReturnType<typeof pickupLocationFromProfile> | null;

  await persistence.withContext(async (ctx) => {
    if (preload.fulfilmentMode === "PICKUP") {
      const eligible = await assertPickupOutletEligible(ctx, {
        brandId: preload.row.brandId,
        outletId: selectedOutletId,
        cart: preload.cart,
        now,
      });
      void eligible;
      const profile = await loadOutletPickupProfileByOutletId(
        ctx,
        selectedOutletId,
      );
      if (!profile) {
        throw new CheckoutError(
          "PICKUP_OUTLET_NOT_ELIGIBLE",
          "Pickup profile is missing.",
          { field: "pickupOutletId" },
        );
      }
      pickupLocation = pickupLocationFromProfile(profile);
    }

    merchandiseProblems.push(
      ...(await validateCheckoutCartMerchandise(
        ctx,
        preload.row.brandId,
        preload.cart,
      )),
    );
    merchandiseProblems.push(
      ...(await collectAssortmentAvailabilityProblems(
        ctx,
        preload.cart,
        selectedOutletId,
        now,
      )),
    );
  });

  if (merchandiseProblems.length > 0) {
    throw new CheckoutError(
      primaryMerchandiseCode(merchandiseProblems),
      "Checkout merchandise validation failed.",
      { problems: Object.freeze(merchandiseProblems) },
    );
  }

  const labels = await persistence.withContext((ctx) =>
    loadCatalogLabelsForCart(ctx, preload.cart),
  );

  const commercial = await persistence.withContext((ctx) =>
    buildCheckoutCommercialResult(ctx, {
      brandId: preload.row.brandId,
      outletId: selectedOutletId,
      at: now,
      cart: preload.cart,
      customerAuthUserId: customer.authUserId,
      labels,
      destination:
        preload.fulfilmentMode === "DELIVERY"
          ? preload.destination ?? undefined
          : undefined,
      fulfilmentMode: preload.fulfilmentMode,
    }),
  );

  const nextRevision = preload.row.revision + BigInt(1);
  const candidate = buildSnapshotCandidate({
    checkoutId: preload.row.id,
    checkoutRevision: nextRevision,
    sourceCartRevision: preload.cart.revision,
    selectedOutletId,
    evaluatedAt: now,
    fulfilmentMode: preload.fulfilmentMode,
    serviceabilityEvaluatedAt,
    manualCouponCode: preload.cart.manualCouponCode,
    destination:
      preload.fulfilmentMode === "DELIVERY" ? preload.destination : null,
    pickupLocation:
      preload.fulfilmentMode === "PICKUP" ? pickupLocation : null,
    commercial,
    expiresAt: new Date(now.getTime() + ttlMs),
    updatedAt: now,
  });

  // Equivalent revalidation: already READY with identical commercial terms.
  if (
    preload.checkout.status === "READY_FOR_PAYMENT" &&
    preload.checkout.activeSnapshot &&
    snapshotsEquivalentIgnoringIds(
      preload.checkout.activeSnapshot,
      candidate.commercial,
    )
  ) {
    return Object.freeze({
      checkout: preload.checkout,
      snapshot: preload.checkout.activeSnapshot,
    });
  }

  // Phase 2: short commit with rechecks. Lock order: Cart then Checkout.
  const committed = await persistence.transaction(async (tx) => {
    const cartLocked = await lockCartForUpdate(tx, preload.row.cartId);
    if (!cartLocked || cartLocked.customerAuthUserId !== customer.authUserId) {
      throw new CheckoutError("CHECKOUT_NOT_FOUND", "Checkout not found.");
    }
    const cart = await loadCartAggregate(tx, cartLocked);
    if (cart.revision !== preload.cart.revision) {
      throw new CheckoutError(
        "CHECKOUT_CART_CHANGED",
        "Cart changed during Checkout evaluation.",
      );
    }

    const row = await lockCheckoutForUpdate(tx, preload.row.id);
    if (!row || row.customerAuthUserId !== customer.authUserId) {
      throw new CheckoutError("CHECKOUT_NOT_FOUND", "Checkout not found.");
    }
    if (row.revision !== parsed.expectedCheckoutRevision) {
      throw new CheckoutError(
        "CHECKOUT_CONFLICT",
        "Checkout revision does not match expectedCheckoutRevision.",
        { field: "expectedCheckoutRevision" },
      );
    }
    const commitNow = clock.now();
    if (isLogicallyExpired(row.expiresAt, commitNow)) {
      throw new CheckoutError("CHECKOUT_EXPIRED", "Checkout has expired.");
    }
    if (row.status === "PAYMENT_PENDING" || row.status === "COMPLETED") {
      throw new CheckoutError(
        "CHECKOUT_STATE_CONFLICT",
        "Checkout status changed during evaluation.",
      );
    }

    const commitMode = (row.fulfilmentMode ?? "DELIVERY") as FulfilmentMode;
    if (commitMode !== preload.fulfilmentMode) {
      throw new CheckoutError(
        "CHECKOUT_CONFLICT",
        "Fulfilment mode changed during evaluation.",
      );
    }
    if (commitMode === "DELIVERY") {
      const destRow = await findDestinationByCheckoutId(tx, row.id);
      if (!destRow) {
        throw new CheckoutError(
          "CHECKOUT_DESTINATION_REQUIRED",
          "Checkout destination is required before evaluation.",
        );
      }
    } else if ((row.pickupOutletId ?? null) !== preload.pickupOutletId) {
      throw new CheckoutError(
        "CHECKOUT_CONFLICT",
        "Pickup outlet changed during evaluation.",
      );
    }
    if ((row.fulfilmentTiming ?? "ASAP") === "SCHEDULED") {
      throw new CheckoutError(
        "CHECKOUT_STATE_CONFLICT",
        "Cannot evaluate a SCHEDULED Checkout.",
      );
    }

    const commitPayload = {
      ...candidate.commit,
      snapshotId: newSnapshotId(),
      sourceCartRevision: cart.revision,
      lines: candidate.commit.lines.map((line) => ({
        ...line,
        id: newSnapshotId(),
        bundleSelections: line.bundleSelections.map((b) => ({
          ...b,
          id: newSnapshotId(),
        })),
      })),
      charges: candidate.commit.charges.map((c) => ({
        ...c,
        id: newSnapshotId(),
      })),
      promotionEffects: candidate.commit.promotionEffects.map((e) => ({
        ...e,
        id: newSnapshotId(),
      })),
      taxComponents: candidate.commit.taxComponents.map((t) => ({
        ...t,
        id: newSnapshotId(),
      })),
    };

    const updated = await commitReadySnapshot(tx, row, commitPayload);
    return loadCheckoutAggregate(tx, updated);
  });

  if (!committed.activeSnapshot) {
    throw new CheckoutError(
      "CHECKOUT_DEPENDENCY_INDETERMINATE",
      "READY snapshot was not activated.",
    );
  }

  return Object.freeze({
    checkout: committed,
    snapshot: committed.activeSnapshot,
  });
}

function snapshotsEquivalentIgnoringIds(
  a: NonNullable<Checkout["activeSnapshot"]>,
  b: NonNullable<Checkout["activeSnapshot"]>,
): boolean {
  return checkoutSnapshotsStructurallyEqual(
    Object.freeze({
      ...a,
      id: "x",
      checkoutRevision: BigInt(1),
      evaluatedAt: b.evaluatedAt,
      serviceabilityEvaluatedAt: b.serviceabilityEvaluatedAt,
      createdAt: b.createdAt,
      lines: a.lines.map((line, i) =>
        Object.freeze({
          ...line,
          id: "x",
          bundleSelections: line.bundleSelections.map((bundle, j) =>
            Object.freeze({
              ...bundle,
              id: b.lines[i]?.bundleSelections[j]?.id ?? "x",
            }),
          ),
        }),
      ),
      charges: a.charges.map((c) => Object.freeze({ ...c, id: "x" })),
      promotionEffects: a.promotionEffects.map((e) =>
        Object.freeze({ ...e, id: "x" }),
      ),
      taxComponents: a.taxComponents.map((t) => Object.freeze({ ...t, id: "x" })),
    }),
    Object.freeze({
      ...b,
      id: "x",
      checkoutRevision: BigInt(1),
      lines: b.lines.map((line) =>
        Object.freeze({
          ...line,
          id: "x",
          bundleSelections: line.bundleSelections.map((bundle) =>
            Object.freeze({ ...bundle, id: "x" }),
          ),
        }),
      ),
      charges: b.charges.map((c) => Object.freeze({ ...c, id: "x" })),
      promotionEffects: b.promotionEffects.map((e) =>
        Object.freeze({ ...e, id: "x" }),
      ),
      taxComponents: b.taxComponents.map((t) => Object.freeze({ ...t, id: "x" })),
    }),
  );
}
