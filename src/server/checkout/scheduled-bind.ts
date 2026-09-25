/**
 * Scheduled revalidation inside the payment-binding transaction (IMP-036I).
 *
 * Caller already holds the Checkout row FOR UPDATE. This then locks the
 * parent authorities Scheduled terms depend on, re-reads them, and refuses
 * the bind when they no longer match the active Snapshot.
 *
 * Lock order after Checkout:
 * 1. Brand row (cancellation policy, including the first explicit insert)
 * 2. Catalog content-revision row when it already exists (no insert)
 * 3. Brand Outlet rows in id order (hours, closure, lead, pickup, serviceability)
 *
 * A plain SELECT is not enough: under READ COMMITTED a writer can commit
 * after that read and before the bind. Provider I/O must stay outside this
 * transaction.
 */
import "server-only";

import { eq } from "drizzle-orm";

import { catalogContentRevisionsTable } from "../../platform/database/schema/catalog";
import {
  CheckoutError,
  type CheckoutSnapshot,
  type FulfilmentMode,
} from "../../shared/checkout";
import { findCartRowById, loadCartAggregate } from "../cart/repository";
import type { PersistenceTransactionContext } from "../persistence/types";
import {
  lockBrandOutletsForScheduledFulfilment,
  lockBrandScheduledFulfilmentAuthority,
} from "../scheduled-fulfilment/foundations";
import { evaluateScheduledHorizonServiceabilityInContext } from "../serviceability/evaluate";
import { collectAssortmentAvailabilityProblems } from "./adapters/assortment-availability";
import { validateCheckoutCartMerchandise } from "./adapters/catalog";
import {
  findDestinationByCheckoutId,
  mapDestinationRow,
  type CheckoutRow,
} from "./repository";
import {
  assertScheduledPickupProfile,
  sealEligibleScheduledWindow,
} from "./scheduled-eligibility";

function reconfirm(message: string): never {
  throw new CheckoutError("CHECKOUT_REPRICED", message);
}

export async function assertScheduledSnapshotStillBindable(
  context: PersistenceTransactionContext,
  input: Readonly<{
    checkout: CheckoutRow;
    snapshot: CheckoutSnapshot;
    now: Date;
  }>,
): Promise<void> {
  if ((input.snapshot.fulfilmentTiming ?? "ASAP") !== "SCHEDULED") {
    return;
  }
  if ((input.checkout.fulfilmentTiming ?? "ASAP") !== "SCHEDULED") {
    reconfirm("Checkout fulfilment timing does not match the active Snapshot.");
  }

  const mode = (input.snapshot.fulfilmentMode ?? "DELIVERY") as FulfilmentMode;
  const outletId = input.snapshot.selectedOutletId;
  if (!outletId) {
    reconfirm("Scheduled Checkout is missing its Outlet.");
  }

  await lockBrandScheduledFulfilmentAuthority(context, input.checkout.brandId);
  await context.db
    .select({ brandId: catalogContentRevisionsTable.brandId })
    .from(catalogContentRevisionsTable)
    .where(eq(catalogContentRevisionsTable.brandId, input.checkout.brandId))
    .for("update");
  const lockedOutlets = await lockBrandOutletsForScheduledFulfilment(
    context,
    input.checkout.brandId,
  );
  if (!lockedOutlets.includes(outletId)) {
    reconfirm("Selected Outlet is no longer part of this Brand.");
  }

  let seal;
  try {
    seal = await sealEligibleScheduledWindow(context, {
      brandId: input.checkout.brandId,
      outletId,
      mode,
      now: input.now,
      startAt: input.snapshot.scheduledWindowStartAt,
      endAt: input.snapshot.scheduledWindowEndAt,
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      reconfirm("Scheduled window is no longer eligible; customer must reconfirm.");
    }
    throw error;
  }

  if (
    seal.scheduledCancellationCutoffMinutes !==
      input.snapshot.scheduledCancellationCutoffMinutes ||
    seal.scheduledTimezone !== input.snapshot.scheduledTimezone ||
    seal.scheduledWindowStartAt.getTime() !==
      input.snapshot.scheduledWindowStartAt?.getTime() ||
    seal.scheduledWindowEndAt.getTime() !==
      input.snapshot.scheduledWindowEndAt?.getTime()
  ) {
    reconfirm("Scheduled terms changed; customer must reconfirm.");
  }

  if (mode === "PICKUP") {
    try {
      await assertScheduledPickupProfile(context, {
        brandId: input.checkout.brandId,
        outletId,
      });
    } catch (error) {
      if (error instanceof CheckoutError) {
        reconfirm("Pickup eligibility changed; Checkout must be re-evaluated.");
      }
      throw error;
    }
  } else {
    const destinationRow = await findDestinationByCheckoutId(
      context,
      input.checkout.id,
    );
    const destination = destinationRow ? mapDestinationRow(destinationRow) : null;
    const coordinates = destination?.coordinates ?? null;
    if (!coordinates) {
      reconfirm("Delivery serviceability changed; Checkout must be re-evaluated.");
    }
    const serviceability = await evaluateScheduledHorizonServiceabilityInContext(
      context,
      {
        brandId: input.checkout.brandId,
        coordinates,
        evaluatedAt: input.now,
      },
    );
    if (serviceability.status !== "SERVICEABLE") {
      reconfirm("Delivery serviceability changed; Checkout must be re-evaluated.");
    }
    if (serviceability.selectedOutletId !== outletId) {
      reconfirm("Delivery serviceability changed; Checkout must be re-evaluated.");
    }
  }

  const cartRow = await findCartRowById(context, input.checkout.cartId);
  if (!cartRow || cartRow.revision !== input.checkout.sourceCartRevision) {
    reconfirm("Cart changed; Checkout must be re-evaluated.");
  }
  const cart = await loadCartAggregate(context, cartRow);
  const catalogProblems = await validateCheckoutCartMerchandise(
    context,
    input.checkout.brandId,
    cart,
  );
  if (catalogProblems.length > 0) {
    reconfirm("Merchandise terms changed; Checkout must be re-evaluated.");
  }
  const availabilityProblems = await collectAssortmentAvailabilityProblems(
    context,
    cart,
    outletId,
    input.now,
    { ignoreCurrentScheduleDenial: true },
  );
  if (availabilityProblems.length > 0) {
    reconfirm("Merchandise terms changed; Checkout must be re-evaluated.");
  }
}
