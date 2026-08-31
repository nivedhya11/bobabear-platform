/**
 * Payment / Attempt / Checkout / claim transitions (IMP-022).
 *
 * Lock order: Checkout → Payment → Attempt → claims.
 * Never hold locks across provider I/O.
 */

import {
  PAYMENT_ATTEMPT_UNRESOLVED_STATUSES,
  PAYMENT_TERMINAL_STATUSES,
  PaymentError,
  type NormalizedProviderEvidence,
  type PaymentObservationSource,
} from "../../shared/payment";
import {
  findCheckoutRowById,
  lockCheckoutForUpdate,
  type CheckoutRow,
} from "../checkout/repository";
import { enqueuePaymentConfirmedNotification } from "../notifications/enqueue";
import type { PersistenceTransactionContext } from "../persistence/types";
import { assertTransactionContext } from "./assert-role";
import {
  consumeClaimsForAttempt,
  lockClaimsForAttempt,
  releaseClaimsForAttempt,
} from "./redemption";
import {
  findAttemptByExecutionIdentity,
  findCheckoutAndSnapshotForPayment,
  findPaymentById,
  findUnresolvedAttempt,
  insertObservation,
  insertProviderReferences,
  lockAttemptForUpdate,
  lockPaymentForUpdate,
  mapAttemptRow,
  mapPaymentRow,
  updateAttemptRow,
  updateCheckoutStatus,
  updatePaymentRow,
  type PaymentAttemptRow,
  type PaymentObligation,
  type PaymentRow,
} from "./repository";

export type ApplyProviderEvidenceResult = Readonly<{
  payment: ReturnType<typeof mapPaymentRow>;
  attempt: ReturnType<typeof mapAttemptRow>;
  checkout: CheckoutRow;
  clientAction?: NormalizedProviderEvidence["clientAction"];
  anomalyCode?: string;
  noop: boolean;
}>;

function isTerminalPayment(status: string): boolean {
  return (PAYMENT_TERMINAL_STATUSES as readonly string[]).includes(status);
}

function isUnresolvedAttempt(status: string): boolean {
  return (PAYMENT_ATTEMPT_UNRESOLVED_STATUSES as readonly string[]).includes(
    status,
  );
}

function amountsMatch(
  expected: bigint,
  observed: bigint | null,
): boolean {
  if (observed === null) return false;
  return expected === observed;
}

async function lockCheckoutPaymentAttempt(
  context: PersistenceTransactionContext,
  paymentId: string,
  attemptId: string,
): Promise<{
  checkout: CheckoutRow;
  payment: PaymentRow;
  attempt: PaymentAttemptRow;
  obligation: PaymentObligation;
}> {
  assertTransactionContext(context, "lockCheckoutPaymentAttempt");

  // Resolve linkage without locking — then lock in canonical order:
  // Checkout → Payment → Attempt → claims.
  const paymentProbe = await findPaymentById(context, paymentId);
  if (!paymentProbe) {
    throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
  }
  const linked = await findCheckoutAndSnapshotForPayment(context, paymentProbe);
  if (!linked) {
    throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
  }

  const checkout = await lockCheckoutForUpdate(context, linked.checkout.id);
  if (!checkout) {
    throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
  }
  const payment = await lockPaymentForUpdate(context, paymentId);
  if (!payment) {
    throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
  }
  const attempt = await lockAttemptForUpdate(context, attemptId);
  if (!attempt || attempt.paymentId !== paymentId) {
    throw new PaymentError("PAYMENT_NOT_FOUND", "Payment attempt not found.");
  }
  await lockClaimsForAttempt(context, attemptId);

  return {
    checkout,
    payment,
    attempt,
    obligation: linked.obligation,
  };
}

/** Checkout commercial validity — sole expiry source after definitive non-success. */
function checkoutValidityElapsed(checkout: CheckoutRow, now: Date): boolean {
  return now.getTime() >= checkout.expiresAt.getTime();
}

async function recordObservation(
  context: PersistenceTransactionContext,
  paymentId: string,
  attemptId: string,
  source: PaymentObservationSource,
  evidence: NormalizedProviderEvidence,
  now: Date,
  anomalyCode: string | null,
): Promise<void> {
  await insertObservation(context, {
    attemptId,
    observationSource: source,
    provider: evidence.provider,
    providerEventId: evidence.providerEventId,
    normalizedOutcome: evidence.outcome,
    observedAmountPaise: evidence.observedAmountPaise,
    observedCurrency: evidence.observedCurrency,
    providerStatusCode: evidence.providerStatusCode,
    providerTimestamp: evidence.providerTimestamp,
    payloadDigest: evidence.payloadDigest,
    reconciliationAnomaly: anomalyCode,
    observedAt: now,
  });
  if (evidence.references && evidence.references.length > 0) {
    await insertProviderReferences(context, {
      paymentId,
      attemptId,
      provider: evidence.provider,
      references: evidence.references,
      now,
    });
  }
}

async function applySuccess(
  context: PersistenceTransactionContext,
  checkout: CheckoutRow,
  payment: PaymentRow,
  attempt: PaymentAttemptRow,
  obligation: PaymentObligation,
  now: Date,
): Promise<ApplyProviderEvidenceResult> {
  if (attempt.status === "SUCCEEDED" && payment.status === "SUCCEEDED") {
    // Duplicate success — semantic no-op (no second revision).
    const freshCheckout = (await findCheckoutRowById(context, checkout.id))!;
    return Object.freeze({
      payment: mapPaymentRow(payment, obligation),
      attempt: mapAttemptRow(attempt),
      checkout: freshCheckout,
      noop: true,
    });
  }

  if (payment.status === "SUCCEEDED") {
    // Payment already succeeded via another attempt — anomaly, no regress.
    return Object.freeze({
      payment: mapPaymentRow(payment, obligation),
      attempt: mapAttemptRow(attempt),
      checkout,
      anomalyCode: "DUPLICATE_SUCCESS_OTHER_ATTEMPT",
      noop: true,
    });
  }

  if (!isUnresolvedAttempt(attempt.status) && attempt.status !== "CREATED") {
    // Attempt already terminal non-success — contradictory success.
    return Object.freeze({
      payment: mapPaymentRow(payment, obligation),
      attempt: mapAttemptRow(attempt),
      checkout,
      anomalyCode: "CONTRADICTORY_SUCCESS_AFTER_TERMINAL",
      noop: true,
    });
  }

  const updatedAttempt = await updateAttemptRow(context, attempt.id, {
    status: "SUCCEEDED",
    succeededAt: now,
    updatedAt: now,
    pendingAt: attempt.pendingAt,
    indeterminateAt: attempt.indeterminateAt,
    failedAt: null,
    cancelledAt: null,
  });

  const updatedPayment = await updatePaymentRow(context, payment.id, {
    status: "SUCCEEDED",
    succeededAt: now,
    updatedAt: now,
    cancelledAt: null,
    expiredAt: null,
    supersededAt: null,
  });

  await consumeClaimsForAttempt(context, attempt.id, now);

  // IMP-033: notification intent commits with Payment SUCCEEDED authority.
  // Only on the real transition — the duplicate/contradictory paths above
  // return before here, so redelivery never queues a second confirmation.
  await enqueuePaymentConfirmedNotification(context, {
    customerId: checkout.customerAuthUserId,
    paymentId: updatedPayment.id,
    occurredAt: now,
  });

  let updatedCheckout = checkout;
  if (checkout.status === "PAYMENT_PENDING") {
    updatedCheckout = await updateCheckoutStatus(context, checkout, {
      status: "COMPLETED",
      activeSnapshotId: checkout.activeSnapshotId,
      now,
    });
  } else if (checkout.status === "COMPLETED") {
    // Already completed — keep as no extra revision.
    updatedCheckout = checkout;
  }

  return Object.freeze({
    payment: mapPaymentRow(updatedPayment, obligation),
    attempt: mapAttemptRow(updatedAttempt),
    checkout: updatedCheckout,
    noop: false,
  });
}

async function applyDefinitiveNonSuccess(
  context: PersistenceTransactionContext,
  checkout: CheckoutRow,
  payment: PaymentRow,
  attempt: PaymentAttemptRow,
  obligation: PaymentObligation,
  now: Date,
  kind: "FAILED" | "CANCELLED",
): Promise<ApplyProviderEvidenceResult> {
  if (payment.status === "SUCCEEDED" || attempt.status === "SUCCEEDED") {
    return Object.freeze({
      payment: mapPaymentRow(payment, obligation),
      attempt: mapAttemptRow(attempt),
      checkout,
      anomalyCode: "NON_SUCCESS_AFTER_SUCCESS",
      noop: true,
    });
  }

  if (attempt.status === "FAILED" || attempt.status === "CANCELLED") {
    const freshCheckout = (await findCheckoutRowById(context, checkout.id))!;
    return Object.freeze({
      payment: mapPaymentRow(payment, obligation),
      attempt: mapAttemptRow(attempt),
      checkout: freshCheckout,
      noop: true,
    });
  }

  if (!isUnresolvedAttempt(attempt.status) && attempt.status !== "CREATED") {
    return Object.freeze({
      payment: mapPaymentRow(payment, obligation),
      attempt: mapAttemptRow(attempt),
      checkout,
      noop: true,
    });
  }

  const updatedAttempt = await updateAttemptRow(context, attempt.id, {
    status: kind,
    updatedAt: now,
    failedAt: kind === "FAILED" ? now : null,
    cancelledAt: kind === "CANCELLED" ? now : null,
    succeededAt: null,
    pendingAt: attempt.pendingAt,
    indeterminateAt: attempt.indeterminateAt,
  });

  await releaseClaimsForAttempt(context, attempt.id, now);

  // Expiry source = Checkout.expires_at (not a Payment-local clock).
  const validityElapsed = checkoutValidityElapsed(checkout, now);

  let updatedPayment: PaymentRow;
  let updatedCheckout: CheckoutRow;

  if (validityElapsed) {
    updatedPayment = await updatePaymentRow(context, payment.id, {
      status: "EXPIRED",
      expiredAt: now,
      updatedAt: now,
      succeededAt: null,
      cancelledAt: null,
      supersededAt: null,
    });
    updatedCheckout = await updateCheckoutStatus(context, checkout, {
      status: "EXPIRED",
      activeSnapshotId: null,
      now,
    });
  } else {
    updatedPayment = await updatePaymentRow(context, payment.id, {
      status: "OPEN",
      updatedAt: now,
      succeededAt: null,
      cancelledAt: null,
      expiredAt: null,
      supersededAt: null,
    });
    if (checkout.status === "PAYMENT_PENDING") {
      updatedCheckout = await updateCheckoutStatus(context, checkout, {
        status: "READY_FOR_PAYMENT",
        activeSnapshotId: checkout.activeSnapshotId,
        now,
      });
    } else {
      updatedCheckout = checkout;
    }
  }

  return Object.freeze({
    payment: mapPaymentRow(updatedPayment, obligation),
    attempt: mapAttemptRow(updatedAttempt),
    checkout: updatedCheckout,
    noop: false,
  });
}

async function applyPendingOrClientAction(
  context: PersistenceTransactionContext,
  checkout: CheckoutRow,
  payment: PaymentRow,
  attempt: PaymentAttemptRow,
  obligation: PaymentObligation,
  now: Date,
  clientAction?: NormalizedProviderEvidence["clientAction"],
): Promise<ApplyProviderEvidenceResult> {
  if (isTerminalPayment(payment.status) || attempt.status === "SUCCEEDED") {
    return Object.freeze({
      payment: mapPaymentRow(payment, obligation),
      attempt: mapAttemptRow(attempt),
      checkout,
      noop: true,
    });
  }

  if (attempt.status === "PENDING") {
    return Object.freeze({
      payment: mapPaymentRow(payment, obligation),
      attempt: mapAttemptRow(attempt),
      checkout,
      clientAction,
      noop: true,
    });
  }

  const updatedAttempt = await updateAttemptRow(context, attempt.id, {
    status: "PENDING",
    pendingAt: attempt.pendingAt ?? now,
    updatedAt: now,
    indeterminateAt: attempt.indeterminateAt,
    succeededAt: null,
    failedAt: null,
    cancelledAt: null,
  });

  return Object.freeze({
    payment: mapPaymentRow(payment, obligation),
    attempt: mapAttemptRow(updatedAttempt),
    checkout,
    clientAction,
    noop: false,
  });
}

async function applyIndeterminate(
  context: PersistenceTransactionContext,
  checkout: CheckoutRow,
  payment: PaymentRow,
  attempt: PaymentAttemptRow,
  obligation: PaymentObligation,
  now: Date,
): Promise<ApplyProviderEvidenceResult> {
  if (isTerminalPayment(payment.status) || attempt.status === "SUCCEEDED") {
    return Object.freeze({
      payment: mapPaymentRow(payment, obligation),
      attempt: mapAttemptRow(attempt),
      checkout,
      noop: true,
    });
  }

  if (attempt.status === "INDETERMINATE") {
    return Object.freeze({
      payment: mapPaymentRow(payment, obligation),
      attempt: mapAttemptRow(attempt),
      checkout,
      noop: true,
    });
  }

  if (!isUnresolvedAttempt(attempt.status) && attempt.status !== "CREATED") {
    return Object.freeze({
      payment: mapPaymentRow(payment, obligation),
      attempt: mapAttemptRow(attempt),
      checkout,
      noop: true,
    });
  }

  const updatedAttempt = await updateAttemptRow(context, attempt.id, {
    status: "INDETERMINATE",
    indeterminateAt: attempt.indeterminateAt ?? now,
    updatedAt: now,
    pendingAt: attempt.pendingAt,
    succeededAt: null,
    failedAt: null,
    cancelledAt: null,
  });

  return Object.freeze({
    payment: mapPaymentRow(payment, obligation),
    attempt: mapAttemptRow(updatedAttempt),
    checkout,
    noop: false,
  });
}

/**
 * Apply normalized provider evidence to locked Payment/Attempt/Checkout.
 */
export async function applyProviderEvidence(
  context: PersistenceTransactionContext,
  input: {
    paymentId: string;
    attemptId: string;
    evidence: NormalizedProviderEvidence;
    observationSource: PaymentObservationSource;
    now: Date;
  },
): Promise<ApplyProviderEvidenceResult> {
  assertTransactionContext(context, "applyProviderEvidence");

  const { checkout, payment, attempt, obligation } =
    await lockCheckoutPaymentAttempt(
      context,
      input.paymentId,
      input.attemptId,
    );

  if (
    attempt.providerExecutionIdentity !==
    input.evidence.providerExecutionIdentity
  ) {
    await recordObservation(
      context,
      payment.id,
      attempt.id,
      input.observationSource,
      input.evidence,
      input.now,
      "EXECUTION_IDENTITY_MISMATCH",
    );
    throw new PaymentError(
      "PAYMENT_PROVIDER_EVIDENCE_INVALID",
      "Provider evidence does not match the Payment attempt.",
    );
  }

  let anomalyCode: string | null = null;

  if (input.evidence.outcome === "SUCCEEDED") {
    const currencyOk =
      input.evidence.observedCurrency === null ||
      input.evidence.observedCurrency === obligation.currency;
    const amountOk = amountsMatch(
      obligation.expectedAmountPaise,
      input.evidence.observedAmountPaise,
    );
    if (!currencyOk || !amountOk) {
      anomalyCode = "PAYMENT_PROVIDER_FINANCIAL_MISMATCH";
      await recordObservation(
        context,
        payment.id,
        attempt.id,
        input.observationSource,
        input.evidence,
        input.now,
        anomalyCode,
      );
      return Object.freeze({
        payment: mapPaymentRow(payment, obligation),
        attempt: mapAttemptRow(attempt),
        checkout,
        anomalyCode,
        noop: true,
      });
    }
  }

  await recordObservation(
    context,
    payment.id,
    attempt.id,
    input.observationSource,
    input.evidence,
    input.now,
    anomalyCode,
  );

  switch (input.evidence.outcome) {
    case "SUCCEEDED":
      return applySuccess(
        context,
        checkout,
        payment,
        attempt,
        obligation,
        input.now,
      );
    case "DEFINITIVE_FAILURE":
      return applyDefinitiveNonSuccess(
        context,
        checkout,
        payment,
        attempt,
        obligation,
        input.now,
        "FAILED",
      );
    case "DEFINITIVE_CANCELLED":
      return applyDefinitiveNonSuccess(
        context,
        checkout,
        payment,
        attempt,
        obligation,
        input.now,
        "CANCELLED",
      );
    case "CLIENT_ACTION_REQUIRED":
    case "PENDING":
      return applyPendingOrClientAction(
        context,
        checkout,
        payment,
        attempt,
        obligation,
        input.now,
        input.evidence.clientAction,
      );
    case "INDETERMINATE":
    case "UNSUPPORTED":
      return applyIndeterminate(
        context,
        checkout,
        payment,
        attempt,
        obligation,
        input.now,
      );
    case "ANOMALY":
      return Object.freeze({
        payment: mapPaymentRow(payment, obligation),
        attempt: mapAttemptRow(attempt),
        checkout,
        anomalyCode: input.evidence.anomalyCode ?? "PROVIDER_ANOMALY",
        noop: true,
      });
    default:
      return applyIndeterminate(
        context,
        checkout,
        payment,
        attempt,
        obligation,
        input.now,
      );
  }
}

/**
 * Mark an attempt INDETERMINATE after a provider call that may have sent money
 * movement (network failure after possible transmission).
 */
export async function markAttemptIndeterminateAfterProviderUncertainty(
  context: PersistenceTransactionContext,
  input: {
    paymentId: string;
    attemptId: string;
    providerExecutionIdentity: string;
    provider: string;
    now: Date;
  },
): Promise<ApplyProviderEvidenceResult> {
  return applyProviderEvidence(context, {
    paymentId: input.paymentId,
    attemptId: input.attemptId,
    observationSource: "sync",
    now: input.now,
    evidence: {
      outcome: "INDETERMINATE",
      provider: input.provider,
      providerExecutionIdentity: input.providerExecutionIdentity,
      observedAmountPaise: null,
      observedCurrency: null,
      providerStatusCode: "PROVIDER_CALL_UNCERTAIN",
      providerTimestamp: input.now,
      providerEventId: null,
      payloadDigest: null,
    },
  });
}

export async function cancelPaymentAggregate(
  context: PersistenceTransactionContext,
  paymentId: string,
  now: Date,
): Promise<{ payment: PaymentRow; checkout: CheckoutRow }> {
  assertTransactionContext(context, "cancelPaymentAggregate");

  const paymentProbe = await findPaymentById(context, paymentId);
  if (!paymentProbe) {
    throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
  }
  const linked = await findCheckoutAndSnapshotForPayment(context, paymentProbe);
  if (!linked) {
    throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
  }

  const checkout = await lockCheckoutForUpdate(context, linked.checkout.id);
  if (!checkout) {
    throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
  }
  const payment = await lockPaymentForUpdate(context, paymentId);
  if (!payment) {
    throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
  }

  const unresolved = await findUnresolvedAttempt(context, paymentId);
  if (unresolved) {
    throw new PaymentError(
      "PAYMENT_UNRESOLVED_ATTEMPT",
      "Payment cannot be cancelled while an unresolved attempt exists.",
    );
  }

  if (isTerminalPayment(payment.status)) {
    throw new PaymentError(
      "PAYMENT_TERMINAL",
      "Payment is already terminal and cannot be cancelled.",
    );
  }

  const updatedPayment = await updatePaymentRow(context, payment.id, {
    status: "CANCELLED",
    cancelledAt: now,
    updatedAt: now,
    succeededAt: null,
    expiredAt: null,
    supersededAt: null,
  });

  // Payment cancellation abandons the Payment obligation only. It is not
  // Checkout customer-cancellation: READY_FOR_PAYMENT returns to DRAFT so the
  // customer can rebuild commercial terms. Historical snapshots stay preserved.
  const updatedCheckout = await updateCheckoutStatus(context, checkout, {
    status: "DRAFT",
    activeSnapshotId: null,
    now,
  });

  return { payment: updatedPayment, checkout: updatedCheckout };
}

export async function supersedePaymentAggregate(
  context: PersistenceTransactionContext,
  paymentId: string,
  now: Date,
): Promise<PaymentRow> {
  assertTransactionContext(context, "supersedePaymentAggregate");

  const paymentProbe = await findPaymentById(context, paymentId);
  if (!paymentProbe) {
    throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
  }
  const linked = await findCheckoutAndSnapshotForPayment(context, paymentProbe);
  if (!linked) {
    throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
  }

  await lockCheckoutForUpdate(context, linked.checkout.id);
  const payment = await lockPaymentForUpdate(context, paymentId);
  if (!payment) {
    throw new PaymentError("PAYMENT_NOT_FOUND", "Payment not found.");
  }

  const unresolved = await findUnresolvedAttempt(context, paymentId);
  if (unresolved) {
    throw new PaymentError(
      "PAYMENT_UNRESOLVED_ATTEMPT",
      "Payment cannot be superseded while an unresolved attempt exists.",
    );
  }

  if (payment.status === "SUCCEEDED") {
    throw new PaymentError(
      "PAYMENT_TERMINAL",
      "Succeeded Payment cannot be superseded.",
    );
  }
  if (payment.status === "SUPERSEDED") {
    return payment;
  }
  if (isTerminalPayment(payment.status) && payment.status !== "OPEN") {
    // CANCELLED / EXPIRED already terminal — allow supersede only from OPEN
    // or PROCESSING without unresolved attempt (PROCESSING shouldn't happen).
    if (payment.status !== "OPEN") {
      throw new PaymentError(
        "PAYMENT_TERMINAL",
        "Payment is already terminal.",
      );
    }
  }

  return updatePaymentRow(context, payment.id, {
    status: "SUPERSEDED",
    supersededAt: now,
    updatedAt: now,
    succeededAt: null,
    cancelledAt: null,
    expiredAt: null,
  });
}

export async function resolveAttemptByExecutionIdentity(
  context: PersistenceTransactionContext,
  executionIdentity: string,
): Promise<PaymentAttemptRow | null> {
  assertTransactionContext(context, "resolveAttemptByExecutionIdentity");
  return findAttemptByExecutionIdentity(context, executionIdentity);
}
