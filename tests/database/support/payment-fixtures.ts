/**
 * Shared fixtures for Payment tests (IMP-022).
 */
import { randomUUID } from "node:crypto";

import {
  applyCartCoupon,
  type CustomerActor,
} from "../../../src/server/cart";
import {
  evaluateCheckout,
  setCheckoutDestination,
  startCheckout,
} from "../../../src/server/checkout";
import {
  createFakePaymentProvider,
  FAKE_PAYMENT_SIGNATURE_HEADER,
  FAKE_PAYMENT_WEBHOOK_SECRET,
  type FakePaymentOutcome,
  type FakePaymentProvider,
} from "../../../src/server/payment/provider";
import type { PaymentClock } from "../../../src/server/payment";
import type { PaymentOperationOptions } from "../../../src/server/payment/operations";
import type { Persistence } from "../../../src/server/persistence/types";
import {
  activateCoupon,
  activatePromotion,
  createCouponDraft,
  createPromotionDraft,
  setPromotionBenefit,
  setPromotionTargets,
} from "../../../src/server/promotions";
import { uniqueCode } from "./cart-fixtures";
import {
  CHECKOUT_POLICY,
  FIXED_NOW,
  checkoutOpts,
  closeTrackedPersistenceHandles,
  mutableCheckoutClock,
  withCheckoutReadyHarness,
  type CheckoutReadyHarness,
} from "./checkout-fixtures";

export {
  CHECKOUT_POLICY,
  FIXED_NOW,
  closeTrackedPersistenceHandles,
  mutableCheckoutClock,
  withCheckoutReadyHarness,
  createFakePaymentProvider,
  FAKE_PAYMENT_SIGNATURE_HEADER,
  FAKE_PAYMENT_WEBHOOK_SECRET,
};

export const PAYMENT_POLICY = Object.freeze({});

export function paymentOpts(
  provider: FakePaymentProvider,
  clock: PaymentClock = { now: () => new Date(FIXED_NOW.getTime()) },
): PaymentOperationOptions {
  return {
    clock,
    policy: PAYMENT_POLICY,
    checkoutPolicy: CHECKOUT_POLICY,
    provider,
  };
}

export type ReadyCheckout = Readonly<{
  checkoutId: string;
  revision: bigint;
  snapshotId: string;
  grandTotalPaise: bigint;
  status: string;
}>;

/**
 * Bring an owned cart through start → destination → evaluate to READY_FOR_PAYMENT.
 */
export async function bringCheckoutToReady(
  persistence: Persistence,
  actor: CustomerActor,
  cartId: string,
  addressId: string,
  clock: PaymentClock = { now: () => new Date(FIXED_NOW.getTime()) },
): Promise<ReadyCheckout> {
  const opts = checkoutOpts(clock);
  const started = await startCheckout(persistence, actor, { cartId }, opts);
  const withDest = await setCheckoutDestination(
    persistence,
    actor,
    {
      checkoutId: started.id,
      expectedCheckoutRevision: started.revision,
      destination: { kind: "SAVED_ADDRESS", savedAddressId: addressId },
    },
    opts,
  );
  const ready = await evaluateCheckout(
    persistence,
    actor,
    {
      checkoutId: withDest.id,
      expectedCheckoutRevision: withDest.revision,
    },
    opts,
  );
  if (ready.checkout.status !== "READY_FOR_PAYMENT") {
    throw new Error(
      `Expected READY_FOR_PAYMENT, got ${ready.checkout.status}`,
    );
  }
  if (!ready.checkout.activeSnapshotId || !ready.snapshot) {
    throw new Error("READY Checkout missing active snapshot.");
  }
  return Object.freeze({
    checkoutId: ready.checkout.id,
    revision: ready.checkout.revision,
    snapshotId: ready.checkout.activeSnapshotId,
    grandTotalPaise: ready.snapshot.grandTotalPaise,
    status: ready.checkout.status,
  });
}

export type PaymentReadyHarness = CheckoutReadyHarness &
  Readonly<{
    actor: CustomerActor;
    checkoutId: string;
    revision: bigint;
    snapshotId: string;
    grandTotalPaise: bigint;
    brandId: string;
    outletId: string;
    connectionString: string;
  }>;

/**
 * Commercial-ready harness with a READY_FOR_PAYMENT Checkout (positive total).
 */
export async function withPaymentReadyHarness<T>(
  fn: (harness: PaymentReadyHarness) => Promise<T>,
): Promise<T> {
  return withCheckoutReadyHarness(async (harness) => {
    const ready = await bringCheckoutToReady(
      harness.persistence,
      harness.actors.customerA,
      harness.cartId,
      harness.addressId,
    );
    if (ready.grandTotalPaise <= BigInt(0)) {
      throw new Error(
        `Expected positive grand total for payment harness, got ${ready.grandTotalPaise}`,
      );
    }
    return fn({
      ...harness,
      actor: harness.actors.customerA,
      checkoutId: ready.checkoutId,
      revision: ready.revision,
      snapshotId: ready.snapshotId,
      grandTotalPaise: ready.grandTotalPaise,
      brandId: harness.actors.tree.brand.id,
      outletId: harness.actors.tree.outletA.id,
      connectionString: harness.database.connectionString,
    });
  });
}

export function newIdempotencyKey(prefix = "pay"): string {
  return `${prefix}-${randomUUID()}`;
}

export async function verifyAndProcessWebhook(
  persistence: Persistence,
  provider: FakePaymentProvider,
  body: Readonly<{
    executionIdentity: string;
    outcome?: FakePaymentOutcome;
    providerEventId?: string;
    amountPaise?: string | number | bigint;
  }>,
  options: PaymentOperationOptions,
): Promise<Awaited<
  ReturnType<
    typeof import("../../../src/server/payment").processVerifiedProviderEvent
  >
>> {
  const { processVerifiedProviderEvent } = await import(
    "../../../src/server/payment"
  );
  const rawBody = new TextEncoder().encode(
    JSON.stringify(body, (_key, value) =>
      typeof value === "bigint" ? value.toString() : value,
    ),
  );
  const signature = provider.computeWebhookSignature(rawBody);
  const headers = Object.freeze({
    [FAKE_PAYMENT_SIGNATURE_HEADER]: signature,
  });
  const evidence = await provider.verifyWebhook({ rawBody, headers });
  if ("family" in evidence) {
    throw new Error("Payment fixture received refund webhook evidence.");
  }
  const { sealVerifiedProviderEvent } = await import(
    "../../../src/server/payment/verified-event"
  );
  return processVerifiedProviderEvent(
    persistence,
    sealVerifiedProviderEvent({
      provider: provider.name,
      rawBody,
      headers,
      evidence,
    }),
    options,
  );
}

/**
 * Limited-redemption coupon for capacity / final-slot tests.
 */
export async function seedLimitedCoupon(
  persistence: Persistence,
  brandId: string,
  actor: unknown,
  args: {
    canonicalCode?: string;
    maximumRedemptions?: number | null;
    maximumRedemptionsPerCustomer?: number | null;
    percentageBps?: number;
    fixedAmountPaise?: bigint | null;
  } = {},
): Promise<{ promotionId: string; couponId: string; canonicalCode: string }> {
  const canonicalCode = args.canonicalCode ?? uniqueCode("LIM");
  const percentageBps = args.percentageBps ?? 1000;
  return persistence.transaction(async (tx) => {
    const created = await createPromotionDraft(tx, {
      actor,
      brandId,
      code: uniqueCode("paypromo"),
      displayName: "Payment limited coupon",
      scopeType: "brand",
      territoryId: null,
      organizationId: null,
      outletId: null,
      triggerType: "coupon",
      stackingPolicy: "exclusive",
      startsAt: new Date("2026-01-01T00:00:00Z"),
      endsAt: null,
    });
    await setPromotionBenefit(tx, {
      actor,
      promotionId: created.id,
      benefit: {
        benefitType:
          args.fixedAmountPaise != null
            ? "fixed_amount_discount"
            : "percentage_discount",
        percentageBps:
          args.fixedAmountPaise != null ? null : percentageBps,
        fixedAmountPaise: args.fixedAmountPaise ?? null,
        maximumDiscountPaise: null,
        buyQuantity: null,
        getQuantity: null,
        repeatable: null,
        maximumRewardQuantity: null,
        includeModifiers: false,
        includeBundleDeltas: false,
      },
    });
    for (const role of ["qualifier", "benefit"] as const) {
      await setPromotionTargets(tx, {
        actor,
        promotionId: created.id,
        targetRole: role,
        targets: [
          {
            targetRole: role,
            targetType: "all_merchandise",
            productId: null,
            variantId: null,
            chargeDefinitionId: null,
          },
        ],
      });
    }
    await activatePromotion(tx, { actor, promotionId: created.id });
    const coupon = await createCouponDraft(tx, {
      actor,
      promotionId: created.id,
      origin: "manual",
      canonicalCode,
      maximumRedemptions: args.maximumRedemptions ?? 1,
      maximumRedemptionsPerCustomer:
        args.maximumRedemptionsPerCustomer ?? null,
    });
    await activateCoupon(tx, { actor, couponId: coupon.id });
    return {
      promotionId: created.id,
      couponId: coupon.id,
      canonicalCode: coupon.canonicalCode,
    };
  });
}

/** 100% merchandise discount → zero grand total (no charges seeded). */
export async function seedFullDiscountCoupon(
  persistence: Persistence,
  brandId: string,
  actor: unknown,
  canonicalCode?: string,
): Promise<{ promotionId: string; couponId: string; canonicalCode: string }> {
  return seedLimitedCoupon(persistence, brandId, actor, {
    canonicalCode: canonicalCode ?? uniqueCode("FULL"),
    maximumRedemptions: null,
    percentageBps: 10_000,
  });
}

/** Oversized fixed discount — may produce negative grand total for defensive path. */
export async function seedOversizedFixedDiscountCoupon(
  persistence: Persistence,
  brandId: string,
  actor: unknown,
  fixedAmountPaise: bigint,
  canonicalCode?: string,
): Promise<{ promotionId: string; couponId: string; canonicalCode: string }> {
  return seedLimitedCoupon(persistence, brandId, actor, {
    canonicalCode: canonicalCode ?? uniqueCode("NEG"),
    maximumRedemptions: null,
    fixedAmountPaise,
  });
}

export async function applyCouponToCustomerCart(
  persistence: Persistence,
  actor: CustomerActor,
  brandId: string,
  cartRevision: bigint,
  couponCode: string,
) {
  return applyCartCoupon(
    persistence,
    { kind: "customer", actor, brandId },
    {
      couponCode,
      expectedRevision: cartRevision,
    },
  );
}
