/**
 * Internal prepareCheckoutForPayment (IMP-021).
 *
 * Freshly validates the active READY snapshot against current truth.
 * Does NOT create Payment or call a payment provider.
 */

import {
  CheckoutError,
  isLogicallyExpired,
  parsePrepareCheckoutForPaymentInput,
  requireCheckoutTtlMs,
  type CheckoutSnapshot,
} from "../../shared/checkout";
import type { Persistence } from "../persistence/types";
import { requireCustomerActor } from "../cart/actor";
import { findCartRowById, loadCartAggregate } from "../cart/repository";
import { collectAssortmentAvailabilityProblems } from "./adapters/assortment-availability";
import {
  loadCatalogLabelsForCart,
  validateCheckoutCartMerchandise,
} from "./adapters/catalog";
import { buildCheckoutCommercialResult } from "./adapters/pricing";
import { resolveCheckoutServiceability } from "./adapters/serviceability";
import { systemCheckoutClock } from "./clock";
import type { CheckoutOperationOptions } from "./operations";
import {
  findCheckoutRowById,
  findDestinationByCheckoutId,
  invalidateReadyToDraft,
  loadActiveSnapshot,
  lockCheckoutForUpdate,
  mapDestinationRow,
} from "./repository";
import { buildSnapshotCandidate } from "./snapshot";
import { checkoutSnapshotsStructurallyEqual } from "./compare-snapshots";

export type PrepareCheckoutForPaymentResult = Readonly<{
  checkoutId: string;
  snapshot: CheckoutSnapshot;
}>;

export async function prepareCheckoutForPayment(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: CheckoutOperationOptions = {},
): Promise<PrepareCheckoutForPaymentResult> {
  const customer = requireCustomerActor(actor);
  const clock = options.clock ?? systemCheckoutClock;
  const now = clock.now();
  requireCheckoutTtlMs(options.policy);
  const parsed = parsePrepareCheckoutForPaymentInput(input);

  const preload = await persistence.withContext(async (ctx) => {
    const row = await findCheckoutRowById(ctx, parsed.checkoutId);
    if (!row || row.customerAuthUserId !== customer.authUserId) {
      throw new CheckoutError("CHECKOUT_NOT_FOUND", "Checkout not found.");
    }
    if (row.status !== "READY_FOR_PAYMENT") {
      throw new CheckoutError(
        "CHECKOUT_STATE_CONFLICT",
        "Checkout must be READY_FOR_PAYMENT before payment preparation.",
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
    if (!row.activeSnapshotId) {
      throw new CheckoutError(
        "CHECKOUT_STATE_CONFLICT",
        "READY Checkout is missing an active snapshot.",
      );
    }
    const snapshot = await loadActiveSnapshot(ctx, row.activeSnapshotId);
    if (!snapshot) {
      throw new CheckoutError(
        "CHECKOUT_STATE_CONFLICT",
        "Active snapshot could not be loaded.",
      );
    }
    const destRow = await findDestinationByCheckoutId(ctx, row.id);
    if (!destRow) {
      throw new CheckoutError(
        "CHECKOUT_DESTINATION_REQUIRED",
        "Checkout destination is required.",
      );
    }
    const cartRow = await findCartRowById(ctx, row.cartId);
    if (!cartRow || cartRow.customerAuthUserId !== customer.authUserId) {
      throw new CheckoutError("CHECKOUT_NOT_FOUND", "Checkout not found.");
    }
    const cart = await loadCartAggregate(ctx, cartRow);
    return Object.freeze({
      row,
      snapshot,
      destination: mapDestinationRow(destRow),
      cart,
    });
  });

  if (preload.cart.revision !== preload.row.sourceCartRevision) {
    await persistence.transaction(async (tx) => {
      const row = await lockCheckoutForUpdate(tx, preload.row.id);
      if (row && row.status === "READY_FOR_PAYMENT") {
        await invalidateReadyToDraft(tx, row, now);
      }
    });
    throw new CheckoutError(
      "CHECKOUT_REPRICED",
      "Cart changed; Checkout must be re-evaluated.",
    );
  }

  const serviceability = await resolveCheckoutServiceability(
    persistence,
    preload.row.brandId,
    preload.destination,
    clock,
  );

  const problems = await persistence.withContext(async (ctx) => {
    const catalogProblems = await validateCheckoutCartMerchandise(
      ctx,
      preload.row.brandId,
      preload.cart,
    );
    if (catalogProblems.length > 0) return catalogProblems;
    return collectAssortmentAvailabilityProblems(
      ctx,
      preload.cart,
      serviceability.selectedOutletId,
      now,
    );
  });

  if (problems.length > 0) {
    await persistence.transaction(async (tx) => {
      const row = await lockCheckoutForUpdate(tx, preload.row.id);
      if (row && row.status === "READY_FOR_PAYMENT") {
        await invalidateReadyToDraft(tx, row, now);
      }
    });
    throw new CheckoutError(
      "CHECKOUT_REPRICED",
      "Merchandise terms changed; Checkout must be re-evaluated.",
      { problems: Object.freeze(problems) },
    );
  }

  const labels = await persistence.withContext((ctx) =>
    loadCatalogLabelsForCart(ctx, preload.cart),
  );
  const commercial = await persistence.withContext((ctx) =>
    buildCheckoutCommercialResult(ctx, {
      brandId: preload.row.brandId,
      outletId: serviceability.selectedOutletId,
      at: now,
      cart: preload.cart,
      customerAuthUserId: customer.authUserId,
      labels,
    }),
  );

  const candidate = buildSnapshotCandidate({
    checkoutId: preload.row.id,
    checkoutRevision: preload.row.revision + BigInt(1),
    sourceCartRevision: preload.cart.revision,
    selectedOutletId: serviceability.selectedOutletId,
    evaluatedAt: now,
    serviceabilityEvaluatedAt: serviceability.evaluatedAt,
    manualCouponCode: preload.cart.manualCouponCode,
    destination: preload.destination,
    commercial,
    expiresAt: preload.row.expiresAt,
    updatedAt: now,
  });

  const equivalent = checkoutSnapshotsStructurallyEqual(
    Object.freeze({
      ...preload.snapshot,
      id: "x",
      checkoutRevision: BigInt(1),
      evaluatedAt: candidate.commercial.evaluatedAt,
      serviceabilityEvaluatedAt: candidate.commercial.serviceabilityEvaluatedAt,
      createdAt: candidate.commercial.createdAt,
      lines: preload.snapshot.lines.map((line) =>
        Object.freeze({
          ...line,
          id: "x",
          bundleSelections: line.bundleSelections.map((b) =>
            Object.freeze({ ...b, id: "x" }),
          ),
        }),
      ),
      charges: preload.snapshot.charges.map((c) =>
        Object.freeze({ ...c, id: "x" }),
      ),
      promotionEffects: preload.snapshot.promotionEffects.map((e) =>
        Object.freeze({ ...e, id: "x" }),
      ),
      taxComponents: preload.snapshot.taxComponents.map((t) =>
        Object.freeze({ ...t, id: "x" }),
      ),
    }),
    Object.freeze({
      ...candidate.commercial,
      id: "x",
      checkoutRevision: BigInt(1),
      lines: candidate.commercial.lines.map((line) =>
        Object.freeze({
          ...line,
          id: "x",
          bundleSelections: line.bundleSelections.map((b) =>
            Object.freeze({ ...b, id: "x" }),
          ),
        }),
      ),
      charges: candidate.commercial.charges.map((c) =>
        Object.freeze({ ...c, id: "x" }),
      ),
      promotionEffects: candidate.commercial.promotionEffects.map((e) =>
        Object.freeze({ ...e, id: "x" }),
      ),
      taxComponents: candidate.commercial.taxComponents.map((t) =>
        Object.freeze({ ...t, id: "x" }),
      ),
    }),
  );

  if (equivalent) {
    return Object.freeze({
      checkoutId: preload.row.id,
      snapshot: preload.snapshot,
    });
  }

  await persistence.transaction(async (tx) => {
    const row = await lockCheckoutForUpdate(tx, preload.row.id);
    if (row && row.status === "READY_FOR_PAYMENT") {
      await invalidateReadyToDraft(tx, row, now);
    }
  });

  throw new CheckoutError(
    "CHECKOUT_REPRICED",
    "Checkout terms changed; customer must reconfirm.",
  );
}
