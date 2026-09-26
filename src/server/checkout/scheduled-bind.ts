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
import {
  evaluateCurrentServiceabilityInContext,
  evaluateScheduledHorizonServiceabilityInContext,
} from "../serviceability/evaluate";
import { collectAssortmentAvailabilityProblems } from "./adapters/assortment-availability";
import {
  loadCatalogLabelsForCart,
  validateCheckoutCartMerchandise,
} from "./adapters/catalog";
import { buildCheckoutCommercialResult } from "./adapters/pricing";
import { checkoutSnapshotsStructurallyEqual } from "./compare-snapshots";
import { assertPickupOutletEligible } from "./pickup-eligibility";
import {
  findDestinationByCheckoutId,
  mapDestinationRow,
  type CheckoutRow,
} from "./repository";
import {
  assertScheduledPickupProfile,
  sealEligibleScheduledWindow,
} from "./scheduled-eligibility";
import { buildSnapshotCandidate } from "./snapshot";

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
  const timing = input.snapshot.fulfilmentTiming ?? "ASAP";
  if ((input.checkout.fulfilmentTiming ?? "ASAP") !== timing) {
    reconfirm("Checkout fulfilment timing does not match the active Snapshot.");
  }
  if (timing !== "SCHEDULED") {
    await assertPurchasedMerchandiseStillBindable(context, input, timing);
    return;
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
  await assertCommercialTermsStillAccepted(context, input, cart, outletId);
}

async function assertPurchasedMerchandiseStillBindable(
  context: PersistenceTransactionContext,
  input: Readonly<{
    checkout: CheckoutRow;
    snapshot: CheckoutSnapshot;
    now: Date;
  }>,
  timing: "ASAP" | "SCHEDULED",
): Promise<void> {
  const mode = (input.snapshot.fulfilmentMode ?? "DELIVERY") as FulfilmentMode;
  const outletId = input.snapshot.selectedOutletId;
  if (!outletId) {
    reconfirm("Checkout is missing its Outlet.");
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

  const cartRow = await findCartRowById(context, input.checkout.cartId);
  if (!cartRow || cartRow.revision !== input.checkout.sourceCartRevision) {
    reconfirm("Cart changed; Checkout must be re-evaluated.");
  }
  const cart = await loadCartAggregate(context, cartRow);

  if (mode === "PICKUP") {
    try {
      await assertPickupOutletEligible(context, {
        brandId: input.checkout.brandId,
        outletId,
        cart,
        now: input.now,
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
    const serviceability = await evaluateCurrentServiceabilityInContext(context, {
      brandId: input.checkout.brandId,
      coordinates,
      evaluatedAt: input.now,
    });
    if (serviceability.status !== "SERVICEABLE") {
      reconfirm("Delivery serviceability changed; Checkout must be re-evaluated.");
    }
    if (serviceability.selectedOutletId !== outletId) {
      reconfirm("Delivery serviceability changed; Checkout must be re-evaluated.");
    }
  }

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
    timing === "SCHEDULED" ? { ignoreCurrentScheduleDenial: true } : {},
  );
  if (availabilityProblems.length > 0) {
    reconfirm("Merchandise terms changed; Checkout must be re-evaluated.");
  }
  await assertCommercialTermsStillAccepted(context, input, cart, outletId);
}

async function assertCommercialTermsStillAccepted(
  context: PersistenceTransactionContext,
  input: Readonly<{
    checkout: CheckoutRow;
    snapshot: CheckoutSnapshot;
    now: Date;
  }>,
  cart: Awaited<ReturnType<typeof loadCartAggregate>>,
  outletId: string,
): Promise<void> {
  const mode = (input.snapshot.fulfilmentMode ?? "DELIVERY") as FulfilmentMode;
  const labels = await loadCatalogLabelsForCart(context, cart);
  let commercial;
  try {
    commercial = await buildCheckoutCommercialResult(context, {
      brandId: input.checkout.brandId,
      outletId,
      at: input.now,
      cart,
      customerAuthUserId: input.checkout.customerAuthUserId,
      labels,
      destination:
        mode === "DELIVERY"
          ? (mapDestinationRow(
              (await findDestinationByCheckoutId(context, input.checkout.id))!,
            ) ?? undefined)
          : undefined,
      fulfilmentMode: mode,
    });
  } catch (error) {
    if (error instanceof CheckoutError) {
      reconfirm("Checkout terms changed; customer must reconfirm.");
    }
    throw error;
  }

  const destinationRow =
    mode === "DELIVERY"
      ? await findDestinationByCheckoutId(context, input.checkout.id)
      : null;
  const destination = destinationRow ? mapDestinationRow(destinationRow) : null;
  const seal =
    (input.snapshot.fulfilmentTiming ?? "ASAP") === "SCHEDULED" &&
    input.snapshot.scheduledWindowStartAt &&
    input.snapshot.scheduledWindowEndAt &&
    input.snapshot.scheduledTimezone &&
    input.snapshot.scheduledCancellationCutoffMinutes !== null
      ? {
          fulfilmentTiming: "SCHEDULED" as const,
          scheduledWindowStartAt: input.snapshot.scheduledWindowStartAt,
          scheduledWindowEndAt: input.snapshot.scheduledWindowEndAt,
          scheduledTimezone: input.snapshot.scheduledTimezone,
          scheduledCancellationCutoffMinutes:
            input.snapshot.scheduledCancellationCutoffMinutes,
        }
      : null;

  const candidate = buildSnapshotCandidate({
    checkoutId: input.checkout.id,
    checkoutRevision: input.snapshot.checkoutRevision,
    sourceCartRevision: input.snapshot.sourceCartRevision,
    selectedOutletId: outletId,
    evaluatedAt: input.snapshot.evaluatedAt,
    fulfilmentMode: mode,
    serviceabilityEvaluatedAt: input.snapshot.serviceabilityEvaluatedAt,
    manualCouponCode: input.snapshot.manualCouponCode,
    destination,
    pickupLocation: input.snapshot.pickupLocation,
    commercial,
    expiresAt: input.checkout.expiresAt,
    updatedAt: input.now,
    scheduledSeal: seal,
  });

  if (!checkoutSnapshotsStructurallyEqual(input.snapshot, candidate.commercial)) {
    reconfirm("Checkout terms changed; customer must reconfirm.");
  }
}
