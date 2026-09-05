/**
 * Payment domain operations (IMP-022).
 *
 * Public surface is narrow — no generic create/update/setStatus.
 * Provider I/O never runs under PostgreSQL row locks.
 */

import { CheckoutError, type CheckoutPolicy } from "../../shared/checkout";
import {
  parseCancelPaymentInput,
  parseCompleteZeroPayableInput,
  parseGetPaymentInput,
  parseReconcilePaymentAttemptInput,
  parseRetryPaymentInput,
  parseStartPaymentInput,
  parseSubmitPaymentClientEvidenceInput,
  requirePaymentPolicy,
  retryPaymentFingerprint,
  startPaymentFingerprint,
  zeroPayableFingerprint,
  PaymentError,
  PAYMENT_SECONDARY_RECONCILE_MIN_INTERVAL_MS,
  type NormalizedProviderEvidence,
  type Payment,
  type PaymentAttempt,
  type PaymentPolicy,
  RAZORPAY_ORDER_REFERENCE_KIND,
  type PaymentStartResult,
  type PaymentStateView,
  type ZeroPayableResult,
} from "../../shared/payment";
import { requireCustomerActor } from "../cart/actor";
import {
  findCheckoutRowById,
  lockCheckoutForUpdate,
} from "../checkout/repository";
import { prepareCheckoutForPayment } from "../checkout/prepare";
import type { Persistence } from "../persistence/types";
import { systemPaymentClock, type PaymentClock } from "./clock";
import { bindInitiationIdempotency, lookupInitiationIdempotency } from "./idempotency";
import { disabledPaymentProvider, type PaymentProvider } from "./provider";
import {
  acquireConsumedClaimsForZeroPayable,
  acquireReservedClaimsForAttempt,
} from "./redemption";
import {
  findAttemptByExecutionIdentity,
  findAttemptById,
  findAttemptByProviderReference,
  listProviderReferencesForAttempt,
  findCheckoutAndSnapshotForPayment,
  findIdempotencyRecord,
  findLatestQueryObservationForAttempt,
  findPaymentById,
  findPaymentBySnapshotId,
  findUnresolvedAttempt,
  insertAttempt,
  insertPayment,
  listAttemptsForPayment,
  lockPaymentForUpdate,
  mapAttemptRow,
  mapPaymentRow,
  obligationFromSnapshot,
  newPaymentAttemptId,
  newPaymentId,
  newProviderExecutionIdentity,
  nextAttemptOrdinal,
  updateCheckoutStatus,
  updatePaymentRow,
  type PaymentRow,
} from "./repository";
import {
  applyProviderEvidence,
  cancelPaymentAggregate,
  markAttemptIndeterminateAfterProviderUncertainty,
  supersedePaymentAggregate,
} from "./transitions";
import {
  requireVerifiedProviderEvent,
} from "./verified-event";
import { tryMaterializeOrderAfterPaymentCompletion } from "./order-materialize-hook";
import { afterPaymentSucceeded } from "./after-payment-succeeded";

export type PaymentOperationOptions = Readonly<{
  clock?: PaymentClock;
  policy?: PaymentPolicy;
  provider?: PaymentProvider;
  /**
   * Forwarded to {@link prepareCheckoutForPayment} (checkout TTL gate).
   * Required for start / retry / zero-payable paths that re-validate Checkout.
   */
  checkoutPolicy?: CheckoutPolicy;
}>;

function requirePolicy(options: PaymentOperationOptions): void {
  requirePaymentPolicy(options.policy);
}

function requireCheckoutPolicy(
  options: PaymentOperationOptions,
): CheckoutPolicy {
  if (!options.checkoutPolicy) {
    throw new PaymentError(
      "PAYMENT_POLICY_INVALID",
      "checkoutPolicy is required for Checkout preparation.",
      { field: "checkoutPolicy" },
    );
  }
  return options.checkoutPolicy;
}

function providerOf(options: PaymentOperationOptions): PaymentProvider {
  return options.provider ?? disabledPaymentProvider;
}

function clockOf(options: PaymentOperationOptions): PaymentClock {
  return options.clock ?? systemPaymentClock;
}

function isCheckoutError(error: unknown): error is CheckoutError {
  return error instanceof CheckoutError;
}

async function buildPaymentStateView(
  persistence: Persistence,
  payment: PaymentRow,
  actorAuthUserId: string,
): Promise<PaymentStateView> {
  return persistence.withContext(async (ctx) => {
    const linked = await findCheckoutAndSnapshotForPayment(ctx, payment);
    if (!linked || linked.checkout.customerAuthUserId !== actorAuthUserId) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    const attempts = await listAttemptsForPayment(ctx, payment.id);
    const latest = attempts[attempts.length - 1] ?? null;
    return Object.freeze({
      payment: mapPaymentRow(payment, linked.obligation),
      attempt: latest ? mapAttemptRow(latest) : null,
      attempts: Object.freeze(attempts.map(mapAttemptRow)),
      checkoutId: linked.checkout.id,
      checkoutStatus: linked.checkout.status,
      checkoutRevision: linked.checkout.revision,
      zeroPayableCompleted: false,
    });
  });
}

async function replayStartFromIdempotency(
  persistence: Persistence,
  record: {
    paymentId: string | null;
    paymentAttemptId: string | null;
    checkoutId: string | null;
  },
  actorAuthUserId: string,
): Promise<PaymentStartResult> {
  if (!record.paymentId || !record.paymentAttemptId) {
    throw new PaymentError(
      "PAYMENT_IDEMPOTENCY_CONFLICT",
      "Idempotency record is incomplete for start_payment replay.",
    );
  }
  return persistence.withContext(async (ctx) => {
    const payment = await findPaymentById(ctx, record.paymentId!);
    const attempt = await findAttemptById(ctx, record.paymentAttemptId!);
    if (!payment || !attempt) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    const linked = await findCheckoutAndSnapshotForPayment(ctx, payment);
    if (!linked || linked.checkout.customerAuthUserId !== actorAuthUserId) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    return Object.freeze({
      kind: "payment_started" as const,
      payment: mapPaymentRow(payment, linked.obligation),
      attempt: mapAttemptRow(attempt),
      checkoutId: linked.checkout.id,
      checkoutRevision: linked.checkout.revision,
    });
  });
}

async function executeProviderAfterCommit(
  persistence: Persistence,
  options: PaymentOperationOptions,
  input: {
    payment: Payment;
    attempt: PaymentAttempt;
    observationSource: "sync";
  },
): Promise<{
  payment: Payment;
  attempt: PaymentAttempt;
  checkoutRevision: bigint;
  clientAction?: NormalizedProviderEvidence["clientAction"];
}> {
  const provider = providerOf(options);
  const clock = clockOf(options);
  let evidence: NormalizedProviderEvidence;
  try {
    evidence = await provider.createExecution({
      executionIdentity: input.attempt.providerExecutionIdentity,
      amountPaise: input.payment.expectedAmountPaise,
      currency: "INR",
      methodIntent: input.attempt.methodIntent,
      paymentId: input.payment.id,
      attemptId: input.attempt.id,
    });
  } catch (error) {
    const now = clock.now();
    // Disabled provider never transmits — definitive failure.
    // Any other throw after local commit may have reached the provider.
    const definitiveLocalMiss =
      provider.name === "disabled" ||
      (error instanceof PaymentError &&
        error.code === "PAYMENT_PROVIDER_INDETERMINATE" &&
        provider.name === "disabled");

    if (definitiveLocalMiss) {
      const result = await persistence.transaction((tx) =>
        applyProviderEvidence(tx, {
          paymentId: input.payment.id,
          attemptId: input.attempt.id,
          observationSource: "sync",
          now,
          evidence: {
            outcome: "DEFINITIVE_FAILURE",
            provider: provider.name,
            providerExecutionIdentity: input.attempt.providerExecutionIdentity,
            observedAmountPaise: null,
            observedCurrency: null,
            providerStatusCode: "PROVIDER_DISABLED",
            providerTimestamp: now,
            providerEventId: null,
            payloadDigest: null,
          },
        }),
      );
      return {
        payment: result.payment,
        attempt: result.attempt,
        checkoutRevision: result.checkout.revision,
      };
    }

    const result = await persistence.transaction((tx) =>
      markAttemptIndeterminateAfterProviderUncertainty(tx, {
        paymentId: input.payment.id,
        attemptId: input.attempt.id,
        providerExecutionIdentity: input.attempt.providerExecutionIdentity,
        provider: provider.name,
        now,
      }),
    );
    return {
      payment: result.payment,
      attempt: result.attempt,
      checkoutRevision: result.checkout.revision,
    };
  }

  const now = clock.now();
  const result = await persistence.transaction((tx) =>
    applyProviderEvidence(tx, {
      paymentId: input.payment.id,
      attemptId: input.attempt.id,
      evidence,
      observationSource: input.observationSource,
      now,
    }),
  );

  if (result.payment.status === "SUCCEEDED") {
    await afterPaymentSucceeded(persistence, {
      checkoutId: result.checkout.id,
      paymentId: result.payment.id,
    });
  }

  return {
    payment: result.payment,
    attempt: result.attempt,
    checkoutRevision: result.checkout.revision,
    clientAction: result.clientAction,
  };
}

/**
 * Start a positive Payment against a READY_FOR_PAYMENT Checkout.
 * Zero payable must use {@link completeZeroPayableCheckout}.
 */
export async function startPayment(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: PaymentOperationOptions = {},
): Promise<PaymentStartResult> {
  const customer = requireCustomerActor(actor);
  const clock = clockOf(options);
  requirePolicy(options);
  const checkoutPolicy = requireCheckoutPolicy(options);
  const parsed = parseStartPaymentInput(input);
  const fingerprint = startPaymentFingerprint(parsed);
  const provider = providerOf(options);

  // Fast idempotent replay without re-preparing Checkout.
  const existingIdem = await persistence.withContext((ctx) =>
    findIdempotencyRecord(ctx, {
      customerAuthUserId: customer.authUserId,
      operationKind: "start_payment",
      idempotencyKey: parsed.idempotencyKey,
    }),
  );
  if (existingIdem) {
    if (existingIdem.requestFingerprint !== fingerprint) {
      throw new PaymentError(
        "PAYMENT_IDEMPOTENCY_CONFLICT",
        "Idempotency key was reused with a different payment request.",
        { field: "idempotencyKey" },
      );
    }
    if (existingIdem.paymentId && existingIdem.paymentAttemptId) {
      const replayed = await replayStartFromIdempotency(
        persistence,
        existingIdem,
        customer.authUserId,
      );
      return replayed;
    }
  }

  let prepared;
  try {
    prepared = await prepareCheckoutForPayment(
      persistence,
      customer,
      {
        checkoutId: parsed.checkoutId,
        expectedCheckoutRevision: parsed.expectedCheckoutRevision,
      },
      { clock, policy: checkoutPolicy },
    );
  } catch (error) {
    if (isCheckoutError(error)) throw error;
    throw error;
  }

  if (prepared.snapshot.grandTotalPaise < BigInt(0)) {
    throw new PaymentError(
      "PAYMENT_NEGATIVE_PAYABLE",
      "Checkout grand total cannot be negative.",
    );
  }
  if (prepared.snapshot.grandTotalPaise === BigInt(0)) {
    throw new PaymentError(
      "PAYMENT_ZERO_PAYABLE_INVALID",
      "Use completeZeroPayableCheckout for a zero-payable Checkout.",
    );
  }

  const now = clock.now();
  const freeze = await persistence.transaction(async (tx) => {
    const lookup = await lookupInitiationIdempotency(tx, {
      customerAuthUserId: customer.authUserId,
      operationKind: "start_payment",
      idempotencyKey: parsed.idempotencyKey,
      requestFingerprint: fingerprint,
    });
    if (lookup.kind === "conflict") {
      throw new PaymentError(
        "PAYMENT_IDEMPOTENCY_CONFLICT",
        "Idempotency key was reused with a different payment request.",
        { field: "idempotencyKey" },
      );
    }
    if (
      lookup.kind === "replay" &&
      lookup.record.paymentId &&
      lookup.record.paymentAttemptId
    ) {
      const payment = await findPaymentById(tx, lookup.record.paymentId);
      const attempt = await findAttemptById(tx, lookup.record.paymentAttemptId);
      const checkout = await findCheckoutRowById(tx, parsed.checkoutId);
      if (!payment || !attempt || !checkout) {
        throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
      }
      return Object.freeze({
        replay: true as const,
        payment: mapPaymentRow(
          payment,
          obligationFromSnapshot(prepared.snapshot),
        ),
        attempt: mapAttemptRow(attempt),
        checkoutId: checkout.id,
        checkoutRevision: checkout.revision,
      });
    }

    const checkout = await lockCheckoutForUpdate(tx, parsed.checkoutId);
    if (!checkout || checkout.customerAuthUserId !== customer.authUserId) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    if (checkout.status !== "READY_FOR_PAYMENT") {
      throw new PaymentError(
        "PAYMENT_CHECKOUT_NOT_READY",
        "Checkout is not ready for payment.",
      );
    }
    if (checkout.revision !== parsed.expectedCheckoutRevision) {
      throw new PaymentError(
        "PAYMENT_CONFLICT",
        "Checkout revision does not match expectedCheckoutRevision.",
        { field: "expectedCheckoutRevision" },
      );
    }
    if (checkout.activeSnapshotId !== prepared.snapshot.id) {
      throw new PaymentError(
        "PAYMENT_CHECKOUT_NOT_READY",
        "Checkout active snapshot changed; re-prepare required.",
      );
    }

    const existingPayment = await findPaymentBySnapshotId(
      tx,
      prepared.snapshot.id,
    );
    if (existingPayment) {
      throw new PaymentError(
        "PAYMENT_STATE_CONFLICT",
        "A Payment already exists for this Checkout snapshot.",
      );
    }

    const paymentId = newPaymentId();
    const attemptId = newPaymentAttemptId();
    const executionIdentity = newProviderExecutionIdentity();

    const paymentRow = await insertPayment(tx, {
      id: paymentId,
      checkoutId: checkout.id,
      checkoutSnapshotId: prepared.snapshot.id,
      now,
      status: "OPEN",
    });

    const attemptRow = await insertAttempt(tx, {
      id: attemptId,
      paymentId,
      attemptOrdinal: BigInt(1),
      provider: provider.name,
      methodIntent: parsed.paymentMethodIntent,
      providerExecutionIdentity: executionIdentity,
      now,
      status: "CREATED",
    });

    await acquireReservedClaimsForAttempt(tx, {
      snapshotId: prepared.snapshot.id,
      paymentId,
      paymentAttemptId: attemptId,
      customerAuthUserId: customer.authUserId,
      now,
    });

    await updatePaymentRow(tx, paymentId, {
      status: "PROCESSING",
      updatedAt: now,
    });

    const updatedCheckout = await updateCheckoutStatus(tx, checkout, {
      status: "PAYMENT_PENDING",
      activeSnapshotId: checkout.activeSnapshotId,
      now,
    });

    await bindInitiationIdempotency(tx, {
      customerAuthUserId: customer.authUserId,
      operationKind: "start_payment",
      idempotencyKey: parsed.idempotencyKey,
      requestFingerprint: fingerprint,
      now,
      paymentId,
      paymentAttemptId: attemptId,
      checkoutId: checkout.id,
      zeroPayableCheckoutId: null,
    });

    return Object.freeze({
      replay: false as const,
      payment: mapPaymentRow(
        { ...paymentRow, status: "PROCESSING", updatedAt: now },
        obligationFromSnapshot(prepared.snapshot),
      ),
      attempt: mapAttemptRow(attemptRow),
      checkoutId: updatedCheckout.id,
      checkoutRevision: updatedCheckout.revision,
    });
  });

  if (freeze.replay) {
    return Object.freeze({
      kind: "payment_started" as const,
      payment: freeze.payment,
      attempt: freeze.attempt,
      checkoutId: freeze.checkoutId,
      checkoutRevision: freeze.checkoutRevision,
    });
  }

  const afterProvider = await executeProviderAfterCommit(persistence, options, {
    payment: freeze.payment,
    attempt: freeze.attempt,
    observationSource: "sync",
  });

  return Object.freeze({
    kind: "payment_started" as const,
    payment: afterProvider.payment,
    attempt: afterProvider.attempt,
    checkoutId: freeze.checkoutId,
    checkoutRevision: afterProvider.checkoutRevision,
    ...(afterProvider.clientAction
      ? { clientAction: afterProvider.clientAction }
      : {}),
  });
}

/**
 * Complete a zero-payable Checkout without creating a Payment row.
 */
export async function completeZeroPayableCheckout(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: PaymentOperationOptions = {},
): Promise<ZeroPayableResult> {
  const customer = requireCustomerActor(actor);
  const clock = clockOf(options);
  requirePolicy(options);
  const checkoutPolicy = requireCheckoutPolicy(options);
  const parsed = parseCompleteZeroPayableInput(input);
  const fingerprint = zeroPayableFingerprint(parsed);

  const existingIdem = await persistence.withContext((ctx) =>
    findIdempotencyRecord(ctx, {
      customerAuthUserId: customer.authUserId,
      operationKind: "complete_zero_payable",
      idempotencyKey: parsed.idempotencyKey,
    }),
  );
  if (existingIdem) {
    if (existingIdem.requestFingerprint !== fingerprint) {
      throw new PaymentError(
        "PAYMENT_IDEMPOTENCY_CONFLICT",
        "Idempotency key was reused with a different payment request.",
        { field: "idempotencyKey" },
      );
    }
    if (existingIdem.zeroPayableCheckoutId) {
      const checkout = await persistence.withContext((ctx) =>
        findCheckoutRowById(ctx, existingIdem.zeroPayableCheckoutId!),
      );
      if (
        checkout &&
        checkout.customerAuthUserId === customer.authUserId &&
        checkout.activeSnapshotId
      ) {
        return Object.freeze({
          kind: "zero_payable_completed" as const,
          checkoutId: checkout.id,
          checkoutRevision: checkout.revision,
          snapshotId: checkout.activeSnapshotId,
        });
      }
    }
  }

  let prepared;
  try {
    prepared = await prepareCheckoutForPayment(
      persistence,
      customer,
      {
        checkoutId: parsed.checkoutId,
        expectedCheckoutRevision: parsed.expectedCheckoutRevision,
      },
      { clock, policy: checkoutPolicy },
    );
  } catch (error) {
    if (isCheckoutError(error)) throw error;
    throw error;
  }

  if (prepared.snapshot.grandTotalPaise < BigInt(0)) {
    throw new PaymentError(
      "PAYMENT_NEGATIVE_PAYABLE",
      "Checkout grand total cannot be negative.",
    );
  }
  if (prepared.snapshot.grandTotalPaise !== BigInt(0)) {
    throw new PaymentError(
      "PAYMENT_ZERO_PAYABLE_INVALID",
      "Checkout grand total is not zero; use startPayment.",
    );
  }

  const now = clock.now();
  const zeroResult = await persistence.transaction(async (tx) => {
    const lookup = await lookupInitiationIdempotency(tx, {
      customerAuthUserId: customer.authUserId,
      operationKind: "complete_zero_payable",
      idempotencyKey: parsed.idempotencyKey,
      requestFingerprint: fingerprint,
    });
    if (lookup.kind === "conflict") {
      throw new PaymentError(
        "PAYMENT_IDEMPOTENCY_CONFLICT",
        "Idempotency key was reused with a different payment request.",
        { field: "idempotencyKey" },
      );
    }
    if (lookup.kind === "replay" && lookup.record.zeroPayableCheckoutId) {
      const checkout = await findCheckoutRowById(
        tx,
        lookup.record.zeroPayableCheckoutId,
      );
      if (!checkout || !checkout.activeSnapshotId) {
        throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
      }
      return Object.freeze({
        kind: "zero_payable_completed" as const,
        checkoutId: checkout.id,
        checkoutRevision: checkout.revision,
        snapshotId: checkout.activeSnapshotId,
      });
    }

    const checkout = await lockCheckoutForUpdate(tx, parsed.checkoutId);
    if (!checkout || checkout.customerAuthUserId !== customer.authUserId) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    if (checkout.status !== "READY_FOR_PAYMENT") {
      throw new PaymentError(
        "PAYMENT_CHECKOUT_NOT_READY",
        "Checkout is not ready for payment.",
      );
    }
    if (checkout.revision !== parsed.expectedCheckoutRevision) {
      throw new PaymentError(
        "PAYMENT_CONFLICT",
        "Checkout revision does not match expectedCheckoutRevision.",
        { field: "expectedCheckoutRevision" },
      );
    }
    if (checkout.activeSnapshotId !== prepared.snapshot.id) {
      throw new PaymentError(
        "PAYMENT_CHECKOUT_NOT_READY",
        "Checkout active snapshot changed; re-prepare required.",
      );
    }

    await acquireConsumedClaimsForZeroPayable(tx, {
      snapshotId: prepared.snapshot.id,
      customerAuthUserId: customer.authUserId,
      now,
    });

    const updated = await updateCheckoutStatus(tx, checkout, {
      status: "COMPLETED",
      activeSnapshotId: checkout.activeSnapshotId,
      now,
    });

    await bindInitiationIdempotency(tx, {
      customerAuthUserId: customer.authUserId,
      operationKind: "complete_zero_payable",
      idempotencyKey: parsed.idempotencyKey,
      requestFingerprint: fingerprint,
      now,
      paymentId: null,
      paymentAttemptId: null,
      checkoutId: checkout.id,
      zeroPayableCheckoutId: checkout.id,
    });

    return Object.freeze({
      kind: "zero_payable_completed" as const,
      checkoutId: updated.id,
      checkoutRevision: updated.revision,
      snapshotId: prepared.snapshot.id,
    });
  });

  await tryMaterializeOrderAfterPaymentCompletion(
    persistence,
    zeroResult.checkoutId,
  );
  return zeroResult;
}

/**
 * Retry an OPEN Payment with a new Attempt against the same frozen snapshot.
 */
export async function retryPayment(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: PaymentOperationOptions = {},
): Promise<PaymentStartResult> {
  const customer = requireCustomerActor(actor);
  const clock = clockOf(options);
  requirePolicy(options);
  const checkoutPolicy = requireCheckoutPolicy(options);
  const parsed = parseRetryPaymentInput(input);
  const fingerprint = retryPaymentFingerprint(parsed);
  const provider = providerOf(options);

  const existingIdem = await persistence.withContext((ctx) =>
    findIdempotencyRecord(ctx, {
      customerAuthUserId: customer.authUserId,
      operationKind: "retry_payment",
      idempotencyKey: parsed.idempotencyKey,
    }),
  );
  if (existingIdem) {
    if (existingIdem.requestFingerprint !== fingerprint) {
      throw new PaymentError(
        "PAYMENT_IDEMPOTENCY_CONFLICT",
        "Idempotency key was reused with a different payment request.",
        { field: "idempotencyKey" },
      );
    }
    if (existingIdem.paymentId && existingIdem.paymentAttemptId) {
      return replayStartFromIdempotency(
        persistence,
        existingIdem,
        customer.authUserId,
      );
    }
  }

  // Ownership + OPEN check before prepare (prepare needs READY checkout).
  const preload = await persistence.withContext(async (ctx) => {
    const payment = await findPaymentById(ctx, parsed.paymentId);
    if (!payment) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    const linked = await findCheckoutAndSnapshotForPayment(ctx, payment);
    if (!linked || linked.checkout.customerAuthUserId !== customer.authUserId) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    return Object.freeze({ payment, linked });
  });

  if (preload.payment.status !== "OPEN") {
    if (preload.payment.status === "PROCESSING") {
      throw new PaymentError(
        "PAYMENT_ALREADY_PROCESSING",
        "Payment already has an in-flight attempt.",
      );
    }
    if (preload.payment.status === "EXPIRED") {
      throw new PaymentError(
        "PAYMENT_EXPIRED",
        "Checkout commercial validity has elapsed.",
      );
    }
    throw new PaymentError(
      "PAYMENT_TERMINAL",
      "Payment cannot be retried from its current status.",
    );
  }

  const nowProbe = clock.now();
  if (nowProbe.getTime() >= preload.linked.checkout.expiresAt.getTime()) {
    throw new PaymentError(
      "PAYMENT_EXPIRED",
      "Checkout commercial validity has elapsed.",
    );
  }

  // Re-validate commercial terms still match the frozen snapshot.
  try {
    await prepareCheckoutForPayment(
      persistence,
      customer,
      {
        checkoutId: preload.linked.checkout.id,
        expectedCheckoutRevision: parsed.expectedCheckoutRevision,
      },
      { clock, policy: checkoutPolicy },
    );
  } catch (error) {
    if (isCheckoutError(error)) throw error;
    throw error;
  }

  const now = clock.now();
  const freeze = await persistence.transaction(async (tx) => {
    const lookup = await lookupInitiationIdempotency(tx, {
      customerAuthUserId: customer.authUserId,
      operationKind: "retry_payment",
      idempotencyKey: parsed.idempotencyKey,
      requestFingerprint: fingerprint,
    });
    if (lookup.kind === "conflict") {
      throw new PaymentError(
        "PAYMENT_IDEMPOTENCY_CONFLICT",
        "Idempotency key was reused with a different payment request.",
        { field: "idempotencyKey" },
      );
    }
    if (
      lookup.kind === "replay" &&
      lookup.record.paymentId &&
      lookup.record.paymentAttemptId
    ) {
      const payment = await findPaymentById(tx, lookup.record.paymentId);
      const attempt = await findAttemptById(tx, lookup.record.paymentAttemptId);
      const linked = payment
        ? await findCheckoutAndSnapshotForPayment(tx, payment)
        : null;
      if (!payment || !attempt || !linked) {
        throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
      }
      return Object.freeze({
        replay: true as const,
        payment: mapPaymentRow(payment, linked.obligation),
        attempt: mapAttemptRow(attempt),
        checkoutId: linked.checkout.id,
        checkoutRevision: linked.checkout.revision,
      });
    }

    const paymentProbe = await findPaymentById(tx, parsed.paymentId);
    if (!paymentProbe) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    const linked = await findCheckoutAndSnapshotForPayment(tx, paymentProbe);
    if (!linked || linked.checkout.customerAuthUserId !== customer.authUserId) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }

    const checkout = await lockCheckoutForUpdate(tx, linked.checkout.id);
    if (!checkout) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    const payment = await lockPaymentForUpdate(tx, parsed.paymentId);
    if (!payment) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }

    if (checkout.revision !== parsed.expectedCheckoutRevision) {
      throw new PaymentError(
        "PAYMENT_CONFLICT",
        "Checkout revision does not match expectedCheckoutRevision.",
        { field: "expectedCheckoutRevision" },
      );
    }
    if (checkout.status !== "READY_FOR_PAYMENT") {
      throw new PaymentError(
        "PAYMENT_CHECKOUT_NOT_READY",
        "Checkout is not ready for payment retry.",
      );
    }
    if (checkout.activeSnapshotId !== payment.checkoutSnapshotId) {
      throw new PaymentError(
        "PAYMENT_STATE_CONFLICT",
        "Checkout snapshot no longer matches this Payment.",
      );
    }
    if (payment.status !== "OPEN") {
      throw new PaymentError(
        "PAYMENT_STATE_CONFLICT",
        "Payment is not OPEN for retry.",
      );
    }
    if (now.getTime() >= checkout.expiresAt.getTime()) {
      throw new PaymentError(
        "PAYMENT_EXPIRED",
        "Checkout commercial validity has elapsed.",
      );
    }

    const unresolved = await findUnresolvedAttempt(tx, payment.id);
    if (unresolved) {
      throw new PaymentError(
        "PAYMENT_UNRESOLVED_ATTEMPT",
        "Payment already has an unresolved attempt.",
      );
    }

    const attemptId = newPaymentAttemptId();
    const executionIdentity = newProviderExecutionIdentity();
    const ordinal = await nextAttemptOrdinal(tx, payment.id);

    const attemptRow = await insertAttempt(tx, {
      id: attemptId,
      paymentId: payment.id,
      attemptOrdinal: ordinal,
      provider: provider.name,
      methodIntent: parsed.paymentMethodIntent,
      providerExecutionIdentity: executionIdentity,
      now,
      status: "CREATED",
    });

    await acquireReservedClaimsForAttempt(tx, {
      snapshotId: payment.checkoutSnapshotId,
      paymentId: payment.id,
      paymentAttemptId: attemptId,
      customerAuthUserId: customer.authUserId,
      now,
    });

    const updatedPayment = await updatePaymentRow(tx, payment.id, {
      status: "PROCESSING",
      updatedAt: now,
    });

    const updatedCheckout = await updateCheckoutStatus(tx, checkout, {
      status: "PAYMENT_PENDING",
      activeSnapshotId: checkout.activeSnapshotId,
      now,
    });

    await bindInitiationIdempotency(tx, {
      customerAuthUserId: customer.authUserId,
      operationKind: "retry_payment",
      idempotencyKey: parsed.idempotencyKey,
      requestFingerprint: fingerprint,
      now,
      paymentId: payment.id,
      paymentAttemptId: attemptId,
      checkoutId: checkout.id,
      zeroPayableCheckoutId: null,
    });

    return Object.freeze({
      replay: false as const,
      payment: mapPaymentRow(updatedPayment, linked.obligation),
      attempt: mapAttemptRow(attemptRow),
      checkoutId: updatedCheckout.id,
      checkoutRevision: updatedCheckout.revision,
    });
  });

  if (freeze.replay) {
    return Object.freeze({
      kind: "payment_started" as const,
      payment: freeze.payment,
      attempt: freeze.attempt,
      checkoutId: freeze.checkoutId,
      checkoutRevision: freeze.checkoutRevision,
    });
  }

  const afterProvider = await executeProviderAfterCommit(persistence, options, {
    payment: freeze.payment,
    attempt: freeze.attempt,
    observationSource: "sync",
  });

  return Object.freeze({
    kind: "payment_started" as const,
    payment: afterProvider.payment,
    attempt: afterProvider.attempt,
    checkoutId: freeze.checkoutId,
    checkoutRevision: afterProvider.checkoutRevision,
    ...(afterProvider.clientAction
      ? { clientAction: afterProvider.clientAction }
      : {}),
  });
}

/**
 * Cancel a Payment that has no unresolved Attempt.
 */
export async function cancelPayment(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: PaymentOperationOptions = {},
): Promise<PaymentStateView> {
  const customer = requireCustomerActor(actor);
  const clock = clockOf(options);
  requirePolicy(options);
  const parsed = parseCancelPaymentInput(input);
  const now = clock.now();

  const result = await persistence.transaction(async (tx) => {
    const paymentProbe = await findPaymentById(tx, parsed.paymentId);
    if (!paymentProbe) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    const linked = await findCheckoutAndSnapshotForPayment(tx, paymentProbe);
    if (!linked || linked.checkout.customerAuthUserId !== customer.authUserId) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    if (linked.checkout.revision !== parsed.expectedCheckoutRevision) {
      throw new PaymentError(
        "PAYMENT_CONFLICT",
        "Checkout revision does not match expectedCheckoutRevision.",
        { field: "expectedCheckoutRevision" },
      );
    }
    return cancelPaymentAggregate(tx, parsed.paymentId, now);
  });

  return buildPaymentStateView(persistence, result.payment, customer.authUserId);
}

export async function getPayment(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  _options: PaymentOperationOptions = {},
): Promise<Payment> {
  const customer = requireCustomerActor(actor);
  const parsed = parseGetPaymentInput(input);
  return persistence.withContext(async (ctx) => {
    const payment = await findPaymentById(ctx, parsed.paymentId);
    if (!payment) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    const linked = await findCheckoutAndSnapshotForPayment(ctx, payment);
    if (!linked || linked.checkout.customerAuthUserId !== customer.authUserId) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    return mapPaymentRow(payment, linked.obligation);
  });
}

/**
 * Whether D-362 secondary reconcile may run for this unresolved Attempt.
 * Bounds provider.queryExecution so payment-state polling cannot storm Razorpay.
 */
async function isSecondaryReconcileDue(
  persistence: Persistence,
  attemptId: string,
  now: Date,
): Promise<boolean> {
  const latestQuery = await persistence.withContext((ctx) =>
    findLatestQueryObservationForAttempt(ctx, attemptId),
  );
  if (!latestQuery) return true;
  const elapsedMs = now.getTime() - latestQuery.observedAt.getTime();
  return elapsedMs >= PAYMENT_SECONDARY_RECONCILE_MIN_INTERVAL_MS;
}

/**
 * Read Payment state for the owning customer.
 *
 * When a configured provider is available and the Payment still has an
 * unresolved Attempt, performs bounded secondary reconciliation
 * (`reconcilePaymentAttempt` → `provider.queryExecution`) before returning.
 * Browser callbacks remain non-authoritative; this path converges provider
 * truth into Payment authority when webhooks are absent or delayed (D-362).
 */
export async function getPaymentState(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: PaymentOperationOptions = {},
): Promise<PaymentStateView> {
  const customer = requireCustomerActor(actor);
  const parsed = parseGetPaymentInput(input);
  const payment = await persistence.withContext((ctx) =>
    findPaymentById(ctx, parsed.paymentId),
  );
  if (!payment) {
    throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
  }

  const provider = options.provider;
  if (provider && provider.name !== "disabled" && payment.status === "PROCESSING") {
    const unresolved = await persistence.withContext((ctx) =>
      findUnresolvedAttempt(ctx, payment.id),
    );
    if (unresolved) {
      const linked = await persistence.withContext((ctx) =>
        findCheckoutAndSnapshotForPayment(ctx, payment),
      );
      if (linked && linked.checkout.customerAuthUserId === customer.authUserId) {
        const due = await isSecondaryReconcileDue(
          persistence,
          unresolved.id,
          clockOf(options).now(),
        );
        if (due) {
          try {
            return await reconcilePaymentAttempt(
              persistence,
              customer,
              {
                paymentId: payment.id,
                attemptId: unresolved.id,
              },
              options,
            );
          } catch (error) {
            // State reads must remain available when provider query is uncertain.
            // Authoritative transitions only occur inside reconcilePaymentAttempt.
            if (error instanceof PaymentError && error.code === "PAYMENT_NOT_FOUND") {
              throw error;
            }
          }
        }
      }
    }
  }

  return buildPaymentStateView(persistence, payment, customer.authUserId);
}

/**
 * Authenticated customer client-evidence submission (IMP-026A).
 * Browser payload is never Payment transition authority.
 */
export async function submitPaymentClientEvidence(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: PaymentOperationOptions = {},
): Promise<PaymentStateView> {
  const customer = requireCustomerActor(actor);
  const clock = clockOf(options);
  const provider = providerOf(options);
  const parsed = parseSubmitPaymentClientEvidenceInput(input);

  if (typeof provider.verifyClientEvidence !== "function") {
    throw new PaymentError(
      "PAYMENT_PROVIDER_INDETERMINATE",
      "Configured payment provider does not support client evidence.",
    );
  }

  const loaded = await persistence.withContext(async (ctx) => {
    const payment = await findPaymentById(ctx, parsed.paymentId);
    if (!payment) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    const linked = await findCheckoutAndSnapshotForPayment(ctx, payment);
    if (!linked || linked.checkout.customerAuthUserId !== customer.authUserId) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    const attempts = await listAttemptsForPayment(ctx, payment.id);
    const attempt = attempts[attempts.length - 1] ?? null;
    if (!attempt) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    const providerReferences = await listProviderReferencesForAttempt(ctx, attempt.id);
    return Object.freeze({ payment, attempt, linked, providerReferences });
  });

  const evidence = await provider.verifyClientEvidence({
    paymentId: loaded.payment.id,
    attemptId: loaded.attempt.id,
    providerExecutionIdentity: loaded.attempt.providerExecutionIdentity,
    kind: parsed.kind,
    payload: parsed.payload,
    providerReferences: loaded.providerReferences,
  });

  const now = clock.now();
  await persistence.transaction((tx) =>
    applyProviderEvidence(tx, {
      paymentId: loaded.payment.id,
      attemptId: loaded.attempt.id,
      evidence,
      observationSource: "sync",
      now,
    }),
  );

  const paymentAfter = await persistence.withContext((ctx) =>
    findPaymentById(ctx, loaded.payment.id),
  );
  if (paymentAfter?.status === "SUCCEEDED") {
    const linked = await persistence.withContext((ctx) =>
      findCheckoutAndSnapshotForPayment(ctx, paymentAfter),
    );
    if (linked?.checkout.status === "COMPLETED") {
      await afterPaymentSucceeded(persistence, {
        checkoutId: linked.checkout.id,
        paymentId: paymentAfter.id,
      });
    }
  }

  return getPaymentState(persistence, customer, { paymentId: parsed.paymentId });
}

/**
 * Query the provider outside the lock, then apply evidence.
 */
export async function reconcilePaymentAttempt(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: PaymentOperationOptions = {},
): Promise<PaymentStateView> {
  const customer = requireCustomerActor(actor);
  const clock = clockOf(options);
  const provider = providerOf(options);
  const parsed = parseReconcilePaymentAttemptInput(input);

  const loaded = await persistence.withContext(async (ctx) => {
    const payment = await findPaymentById(ctx, parsed.paymentId);
    const attempt = await findAttemptById(ctx, parsed.attemptId);
    if (!payment || !attempt || attempt.paymentId !== payment.id) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    const linked = await findCheckoutAndSnapshotForPayment(ctx, payment);
    if (!linked || linked.checkout.customerAuthUserId !== customer.authUserId) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    return Object.freeze({ payment, attempt });
  });

  const evidence = await provider.queryExecution({
    executionIdentity: loaded.attempt.providerExecutionIdentity,
    provider: loaded.attempt.provider,
  });

  const now = clock.now();
  await persistence.transaction((tx) =>
    applyProviderEvidence(tx, {
      paymentId: loaded.payment.id,
      attemptId: loaded.attempt.id,
      evidence,
      observationSource: "query",
      now,
    }),
  );

  const paymentAfter = await persistence.withContext((ctx) =>
    findPaymentById(ctx, loaded.payment.id),
  );
  if (paymentAfter?.status === "SUCCEEDED") {
    const linked = await persistence.withContext((ctx) =>
      findCheckoutAndSnapshotForPayment(ctx, paymentAfter),
    );
    if (linked?.checkout.status === "COMPLETED") {
      await afterPaymentSucceeded(persistence, {
        checkoutId: linked.checkout.id,
        paymentId: paymentAfter.id,
      });
    }
  }

  return getPaymentState(persistence, customer, {
    paymentId: parsed.paymentId,
  });
}

/**
 * Apply already-verified provider webhook evidence.
 */
export async function processVerifiedProviderEvent(
  persistence: Persistence,
  event: unknown,
  options: PaymentOperationOptions = {},
): Promise<PaymentStateView | null> {
  const sealed = requireVerifiedProviderEvent(event);
  const clock = clockOf(options);
  const evidence = sealed.evidence;

  const attempt = await persistence.withContext(async (ctx) => {
    if (evidence.providerExecutionIdentity) {
      const byExecution = await findAttemptByExecutionIdentity(
        ctx,
        evidence.providerExecutionIdentity,
      );
      if (byExecution) return byExecution;
      const byOrderId = await findAttemptByProviderReference(ctx, {
        provider: evidence.provider,
        referenceKind: RAZORPAY_ORDER_REFERENCE_KIND,
        referenceValue: evidence.providerExecutionIdentity,
      });
      if (byOrderId) return byOrderId;
    }
    for (const reference of evidence.references ?? []) {
      if (!reference.value) continue;
      const byReference = await findAttemptByProviderReference(ctx, {
        provider: evidence.provider,
        referenceKind: reference.kind,
        referenceValue: reference.value,
      });
      if (byReference) return byReference;
    }
    return null;
  });
  if (!attempt) {
    return null;
  }

  const now = clock.now();
  await persistence.transaction((tx) =>
    applyProviderEvidence(tx, {
      paymentId: attempt.paymentId,
      attemptId: attempt.id,
      evidence: {
        ...evidence,
        providerExecutionIdentity: attempt.providerExecutionIdentity,
      },
      observationSource: "webhook",
      now,
    }),
  );

  const payment = await persistence.withContext((ctx) =>
    findPaymentById(ctx, attempt.paymentId),
  );
  if (!payment) return null;
  const linked = await persistence.withContext((ctx) =>
    findCheckoutAndSnapshotForPayment(ctx, payment),
  );
  if (!linked) return null;

  if (payment.status === "SUCCEEDED" && linked.checkout.status === "COMPLETED") {
    await afterPaymentSucceeded(persistence, {
      checkoutId: linked.checkout.id,
      paymentId: payment.id,
    });
  }

  return buildPaymentStateView(
    persistence,
    payment,
    linked.checkout.customerAuthUserId,
  );
}

/**
 * Terminalize an OPEN Payment as SUPERSEDED when Checkout commercial terms
 * are rebuilt. Only when no unresolved Attempt exists.
 */
export async function supersedePayment(
  persistence: Persistence,
  actor: unknown,
  paymentId: string,
  options: PaymentOperationOptions = {},
): Promise<Payment> {
  const customer = requireCustomerActor(actor);
  const clock = clockOf(options);
  const now = clock.now();

  const updated = await persistence.transaction(async (tx) => {
    const paymentProbe = await findPaymentById(tx, paymentId);
    if (!paymentProbe) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    const linked = await findCheckoutAndSnapshotForPayment(tx, paymentProbe);
    if (!linked || linked.checkout.customerAuthUserId !== customer.authUserId) {
      throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
    }
    const row = await supersedePaymentAggregate(tx, paymentId, now);
    return Object.freeze({ row, obligation: linked.obligation });
  });

  return mapPaymentRow(updated.row, updated.obligation);
}
