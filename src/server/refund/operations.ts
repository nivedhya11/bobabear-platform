/**
 * Refund application operations (IMP-027 / D-364).
 *
 * Reservation commits before provider I/O. No customer HTTP. No Ops Console.
 * Payment SUCCEEDED is never rewritten. Order/Checkout are never rewritten.
 */
import "server-only";

import { PAYMENT_FAKE_PROVIDER, PAYMENT_RAZORPAY_PROVIDER } from "../../shared/payment";
import {
  RAZORPAY_REFUND_PAYMENT_REFERENCE_KIND,
  RAZORPAY_REFUND_REFERENCE_KIND,
  REFUND_INITIATE_PERMISSION,
  REFUND_READ_PERMISSION,
  RefundError,
  isAllowedRefundTransition,
  parseGetRefundInput,
  parseReconcileRefundInput,
  parseRequestRefundInput,
  parseReserveOrderRefundBody,
  refundProviderIdempotencyKey,
  type NormalizedRefundEvidence,
  type RefundObservationOutcome,
  type RefundObservationSource,
  type RefundResult,
  type RefundStatus,
} from "../../shared/refund";
import type { Persistence } from "../persistence/types";
import { findPaymentById } from "../payment/repository";
import type { PaymentProvider } from "../payment/provider";
import { disabledPaymentProvider } from "../payment/provider";
import { findOrderById } from "../order/repository";
import {
  authorizeRefundOutletAccess,
  requireRefundCapability,
  requireRefundWorkforceActor,
} from "./authorize";
import { systemRefundClock, type RefundClock } from "./clock";
import { isUniqueViolation } from "./assert-role";
import { throwMappedOrderRefundReplayAuthorizationFailure } from "./replay-authorization";
import { tryEnsureRefundStatutoryDecisionPendingAfterProcessed } from "./refund-statutory-decision-hook";
import {
  balanceFromRefundRows,
  findAuthoritativeProviderPaymentReference,
  findNonTerminalRefundsByProviderPaymentId,
  findPaymentCapturedFacts,
  findProviderPaymentId,
  findRefundById,
  findRefundByProviderRefundId,
  insertRefund,
  insertRefundObservation,
  insertRefundProviderReferences,
  listNonTerminalRefunds,
  listRefundsForPayment,
  lockPaymentAndRefunds,
  mapRefundRow,
  newRefundId,
  updateRefundRow,
  type RefundRow,
} from "./repository";

export type RefundOperationOptions = Readonly<{
  clock?: RefundClock;
  provider?: PaymentProvider;
}>;

function clockOf(options: RefundOperationOptions): RefundClock {
  return options.clock ?? systemRefundClock;
}

function providerOf(options: RefundOperationOptions): PaymentProvider {
  return options.provider ?? disabledPaymentProvider;
}

function requireRefundProvider(provider: PaymentProvider): PaymentProvider {
  if (!provider.createRefund || !provider.queryRefund) {
    throw new RefundError(
      "REFUND_PROVIDER_UNAVAILABLE",
      "Refund provider capability is unavailable.",
    );
  }
  if (provider.name !== PAYMENT_RAZORPAY_PROVIDER && provider.name !== PAYMENT_FAKE_PROVIDER) {
    throw new RefundError(
      "REFUND_PROVIDER_UNSUPPORTED",
      "Payment provider does not support Refund.",
    );
  }
  return provider;
}

function outcomeToObservation(
  outcome: NormalizedRefundEvidence["outcome"],
): RefundObservationOutcome {
  if (
    outcome === "PENDING" ||
    outcome === "PROCESSED" ||
    outcome === "FAILED" ||
    outcome === "INDETERMINATE" ||
    outcome === "ANOMALY" ||
    outcome === "UNSUPPORTED"
  ) {
    return outcome;
  }
  return "ANOMALY";
}

function targetStatusFromEvidence(evidence: NormalizedRefundEvidence): RefundStatus | null {
  if (evidence.outcome === "PENDING") return "PENDING";
  if (evidence.outcome === "PROCESSED") return "PROCESSED";
  if (evidence.outcome === "FAILED") return "FAILED";
  if (evidence.outcome === "INDETERMINATE") return "INDETERMINATE";
  return null;
}

async function buildRefundResult(
  persistence: Persistence,
  refundId: string,
): Promise<RefundResult> {
  return persistence.withContext(async (ctx) => {
    const refund = await findRefundById(ctx, refundId);
    if (!refund) {
      throw new RefundError("REFUND_NOT_FOUND", "Refund not found.");
    }
    const payment = await findPaymentById(ctx, refund.paymentId);
    const facts = payment ? await findPaymentCapturedFacts(ctx, payment) : null;
    const rows = await listRefundsForPayment(ctx, refund.paymentId);
    return Object.freeze({
      refund: mapRefundRow(refund),
      balance: balanceFromRefundRows(facts?.grandTotalPaise ?? BigInt(0), rows),
      paymentStatus: payment?.status ?? "UNKNOWN",
    });
  });
}

async function authorizePaymentRefund(
  persistence: Persistence,
  actor: ReturnType<typeof requireRefundWorkforceActor>,
  paymentId: string,
  permission: typeof REFUND_INITIATE_PERMISSION | typeof REFUND_READ_PERMISSION,
): Promise<{
  paymentId: string;
  outletId: string;
  capturedAmount: bigint;
  checkoutId: string;
  checkoutSnapshotId: string;
  orderId: string | null;
  paymentStatus: string;
}> {
  return persistence.withContext(async (ctx) => {
    await requireRefundCapability(ctx, actor, permission);
    const payment = await findPaymentById(ctx, paymentId);
    if (!payment) {
      throw new RefundError("REFUND_NOT_FOUND", "Refund not found.");
    }
    const facts = await findPaymentCapturedFacts(ctx, payment);
    if (!facts) {
      throw new RefundError("REFUND_NOT_FOUND", "Refund not found.");
    }
    await authorizeRefundOutletAccess(ctx, actor, facts.outletId, permission);
    return {
      paymentId: payment.id,
      outletId: facts.outletId,
      capturedAmount: facts.grandTotalPaise,
      checkoutId: facts.checkoutId,
      checkoutSnapshotId: facts.checkoutSnapshotId,
      orderId: facts.orderId,
      paymentStatus: payment.status,
    };
  });
}

function timestampsForStatus(
  current: RefundRow,
  next: RefundStatus,
  now: Date,
): Partial<RefundRow> {
  const patch: Partial<RefundRow> = { status: next, updatedAt: now };
  if (next === "PENDING" && !current.pendingAt) patch.pendingAt = now;
  if (next === "INDETERMINATE" && !current.indeterminateAt) patch.indeterminateAt = now;
  if (next === "PROCESSED") {
    patch.processedAt = now;
    patch.failedAt = null;
  }
  if (next === "FAILED") {
    patch.failedAt = now;
    patch.processedAt = null;
  }
  return patch;
}

async function persistProviderIdentity(
  tx: Parameters<typeof insertRefundProviderReferences>[0],
  refund: RefundRow,
  evidence: NormalizedRefundEvidence,
  now: Date,
): Promise<void> {
  const references: Array<{ kind: string; value: string }> = [];
  if (evidence.providerRefundId) {
    references.push({
      kind: RAZORPAY_REFUND_REFERENCE_KIND,
      value: evidence.providerRefundId,
    });
  }
  if (evidence.providerPaymentId) {
    references.push({
      kind: RAZORPAY_REFUND_PAYMENT_REFERENCE_KIND,
      value: evidence.providerPaymentId,
    });
  }
  for (const extra of evidence.references ?? []) {
    if (extra.value) references.push({ kind: extra.kind, value: extra.value });
  }
  if (references.length > 0) {
    await insertRefundProviderReferences(tx, {
      refundId: refund.id,
      provider: evidence.provider,
      references,
      now,
    });
  }
}

async function applyEvidenceInTransaction(
  persistence: Persistence,
  refundId: string,
  evidence: NormalizedRefundEvidence,
  observationSource: RefundObservationSource,
  now: Date,
): Promise<RefundRow | null> {
  return persistence.transaction(async (tx) => {
    const existing = await findRefundById(tx, refundId);
    if (!existing) return null;
    const locked = await lockPaymentAndRefunds(tx, existing.paymentId);
    if (!locked.payment) return null;
    const refund = locked.refunds.find((row) => row.id === refundId);
    if (!refund) return null;

    const observationOutcome = outcomeToObservation(evidence.outcome);
    let anomaly: string | null = evidence.anomalyCode ?? null;
    const target = targetStatusFromEvidence(evidence);

    if (refund.status === "PROCESSED" && target !== null && target !== "PROCESSED") {
      anomaly = anomaly ?? "REFUND_CONTRADICTORY_EVIDENCE";
    }

    if (
      target === "PROCESSED" &&
      refund.status === "FAILED" &&
      evidence.providerRefundId &&
      refund.providerRefundId &&
      evidence.providerRefundId !== refund.providerRefundId
    ) {
      anomaly = anomaly ?? "REFUND_PROVIDER_IDENTITY_MISMATCH";
    }

    if (target === "PROCESSED" && refund.status === "FAILED") {
      const facts = await findPaymentCapturedFacts(tx, locked.payment);
      const withoutSelf = locked.refunds.filter((row) => row.id !== refund.id);
      const balance = balanceFromRefundRows(facts?.grandTotalPaise ?? BigInt(0), withoutSelf);
      if (refund.amountPaise > balance.remainingRefundableAmount) {
        anomaly = "REFUND_PROCESSED_WOULD_EXCEED_CAPTURED";
        await insertRefundObservation(tx, {
          refundId: refund.id,
          observationSource,
          provider: evidence.provider,
          providerEventId: evidence.providerEventId,
          normalizedOutcome: "ANOMALY",
          observedAmountPaise: evidence.observedAmountPaise,
          observedCurrency: evidence.observedCurrency,
          providerStatusCode: evidence.providerStatusCode,
          payloadDigest: evidence.payloadDigest,
          reconciliationAnomaly: anomaly,
          observedAt: now,
        });
        return refund;
      }
    }

    await insertRefundObservation(tx, {
      refundId: refund.id,
      observationSource,
      provider: evidence.provider,
      providerEventId: evidence.providerEventId,
      normalizedOutcome: anomaly && refund.status === "PROCESSED" ? "ANOMALY" : observationOutcome,
      observedAmountPaise: evidence.observedAmountPaise,
      observedCurrency: evidence.observedCurrency,
      providerStatusCode: evidence.providerStatusCode,
      payloadDigest: evidence.payloadDigest,
      reconciliationAnomaly: anomaly,
      observedAt: now,
    });

    await persistProviderIdentity(tx, refund, evidence, now);

    const patch: Parameters<typeof updateRefundRow>[2] = {
      updatedAt: now,
      providerStatusCode: evidence.providerStatusCode,
      ...(evidence.providerRefundId && !refund.providerRefundId
        ? { providerRefundId: evidence.providerRefundId }
        : {}),
      ...(evidence.providerPaymentId && !refund.providerPaymentId
        ? { providerPaymentId: evidence.providerPaymentId }
        : {}),
      ...(evidence.failureCode ? { failureCode: evidence.failureCode } : {}),
      ...(evidence.failureReason ? { failureReason: evidence.failureReason } : {}),
      ...(evidence.acquirerReference ? { acquirerReference: evidence.acquirerReference } : {}),
    };

    if (target && isAllowedRefundTransition(refund.status as RefundStatus, target) && target !== refund.status) {
      if (!(refund.status === "PROCESSED" && target !== "PROCESSED")) {
        Object.assign(patch, timestampsForStatus(refund, target, now));
      }
    }

    return updateRefundRow(tx, refund.id, patch);
  });
}

async function applyEvidenceThenEnsureStatutoryPending(
  persistence: Persistence,
  refundId: string,
  evidence: NormalizedRefundEvidence,
  observationSource: RefundObservationSource,
  now: Date,
): Promise<RefundRow | null> {
  const row = await applyEvidenceInTransaction(
    persistence,
    refundId,
    evidence,
    observationSource,
    now,
  );
  if (row?.status === "PROCESSED") {
    await tryEnsureRefundStatutoryDecisionPendingAfterProcessed(
      persistence,
      row.id,
      now,
    );
  }
  return row;
}

/**
 * Authorize, reserve, commit, then call provider outside the lock.
 */
export async function requestRefund(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: RefundOperationOptions = {},
): Promise<RefundResult> {
  const workforce = requireRefundWorkforceActor(actor);
  const parsed = parseRequestRefundInput(input);
  const clock = clockOf(options);
  const provider = requireRefundProvider(providerOf(options));

  const authorized = await authorizePaymentRefund(
    persistence,
    workforce,
    parsed.paymentId,
    REFUND_INITIATE_PERMISSION,
  );

  if (authorized.paymentStatus !== "SUCCEEDED") {
    throw new RefundError(
      "REFUND_PAYMENT_NOT_ELIGIBLE",
      "Only a successful captured Payment may be refunded.",
    );
  }
  if (parsed.currency && parsed.currency !== "INR") {
    throw new RefundError("REFUND_CURRENCY_MISMATCH", "Refund currency must match Payment currency.");
  }

  const reserved = await persistence.transaction(async (tx) => {
    const locked = await lockPaymentAndRefunds(tx, parsed.paymentId);
    if (!locked.payment || locked.payment.status !== "SUCCEEDED") {
      throw new RefundError(
        "REFUND_PAYMENT_NOT_ELIGIBLE",
        "Only a successful captured Payment may be refunded.",
      );
    }
    const facts = await findPaymentCapturedFacts(tx, locked.payment);
    if (!facts) {
      throw new RefundError("REFUND_PAYMENT_NOT_ELIGIBLE", "Payment captured truth is missing.");
    }
    const providerPaymentId = await findProviderPaymentId(tx, locked.payment.id, provider.name);
    if (!providerPaymentId) {
      throw new RefundError(
        "REFUND_PROVIDER_REFERENCE_MISSING",
        "Payment is missing the required provider payment reference.",
      );
    }
    const balance = balanceFromRefundRows(facts.grandTotalPaise, locked.refunds);
    if (balance.fullyRefunded || balance.remainingRefundableAmount <= BigInt(0)) {
      throw new RefundError("REFUND_FULLY_REFUNDED", "Payment has no remaining refundable amount.");
    }
    if (parsed.amountPaise > balance.remainingRefundableAmount) {
      throw new RefundError(
        "REFUND_AMOUNT_EXCEEDS_REMAINING",
        "Requested refund exceeds remaining refundable amount.",
      );
    }
    const id = newRefundId();
    const now = clock.now();
    return insertRefund(tx, {
      id,
      paymentId: locked.payment.id,
      checkoutId: facts.checkoutId,
      checkoutSnapshotId: facts.checkoutSnapshotId,
      orderId: facts.orderId,
      amountPaise: parsed.amountPaise,
      currency: "INR",
      provider: provider.name,
      providerIdempotencyKey: refundProviderIdempotencyKey(id),
      providerPaymentId,
      reason: parsed.reason,
      operatorNote: parsed.operatorNote ?? null,
      initiatedByActorId: workforce.workforceUserId,
      now,
    });
  });

  let evidence: NormalizedRefundEvidence;
  try {
    evidence = await provider.createRefund!({
      refundId: reserved.id,
      providerPaymentId: reserved.providerPaymentId ?? "",
      amountPaise: reserved.amountPaise,
      currency: "INR",
      idempotencyKey: reserved.providerIdempotencyKey,
    });
  } catch {
    evidence = Object.freeze({
      family: "refund",
      outcome: "INDETERMINATE",
      provider: provider.name,
      providerRefundId: null,
      providerPaymentId: reserved.providerPaymentId,
      observedAmountPaise: reserved.amountPaise,
      observedCurrency: "INR",
      providerStatusCode: "PROVIDER_CALL_UNCERTAIN",
      providerTimestamp: clock.now(),
      providerEventId: null,
      payloadDigest: null,
    });
  }

  await applyEvidenceThenEnsureStatutoryPending(
    persistence,
    reserved.id,
    evidence,
    "sync",
    clock.now(),
  );
  return buildRefundResult(persistence, reserved.id);
}

function normalizeComparableNote(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length === 0 ? null : normalized;
}

function refundCommandIdentityMatches(
  existing: RefundRow,
  expected: Readonly<{
    paymentId: string;
    orderId: string;
    amountPaise: bigint;
    reason: string;
    operatorNote: string | null;
    initiatedByActorId: string;
  }>,
): boolean {
  return (
    existing.paymentId === expected.paymentId &&
    existing.orderId === expected.orderId &&
    existing.amountPaise === expected.amountPaise &&
    existing.currency === "INR" &&
    existing.reason === expected.reason &&
    normalizeComparableNote(existing.operatorNote) === expected.operatorNote &&
    existing.initiatedByActorId === expected.initiatedByActorId
  );
}

async function resolveExistingOrderRefundReplay(
  persistence: Persistence,
  actor: ReturnType<typeof requireRefundWorkforceActor>,
  existing: RefundRow,
  expected: Readonly<{
    orderId: string;
    paymentId: string;
    amountPaise: bigint;
    reason: string;
    operatorNote: string | null;
    initiatedByActorId: string;
  }>,
): Promise<RefundResult> {
  try {
    await authorizePaymentRefund(
      persistence,
      actor,
      existing.paymentId,
      REFUND_INITIATE_PERMISSION,
    );
  } catch (error) {
    // Expected unauthorized / not-found stay non-disclosing; unexpected errors rethrow.
    throwMappedOrderRefundReplayAuthorizationFailure(error);
  }
  if (
    existing.orderId !== expected.orderId ||
    existing.paymentId !== expected.paymentId ||
    !refundCommandIdentityMatches(existing, expected)
  ) {
    throw new RefundError(
      "REFUND_IDEMPOTENCY_CONFLICT",
      "Refund request conflicts with an existing refund command.",
    );
  }
  return buildRefundResult(persistence, existing.id);
}

/**
 * Provider-free Operations Refund reservation (IMP-036D).
 *
 * Authenticates, authorizes against the server-derived Outlet, reserves one
 * ACCEPTED Refund, and performs ZERO PaymentProvider / Razorpay I/O.
 * Customer-commerce RefundReconciliationProcessor remains the provider executor.
 */
export async function reserveOrderRefund(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: RefundOperationOptions = {},
): Promise<RefundResult> {
  const workforce = requireRefundWorkforceActor(actor);
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new RefundError("REFUND_INVALID_INPUT", "Refund request is invalid.");
  }
  const record = input as Record<string, unknown>;
  const orderIdRaw = record.orderId;
  if (typeof orderIdRaw !== "string") {
    throw new RefundError("REFUND_INVALID_INPUT", "orderId must be a UUID.", {
      field: "orderId",
    });
  }
  // Path orderId is authoritative locator; reject any other authority fields from the body.
  const bodyWithoutOrderId: Record<string, unknown> = { ...record };
  delete bodyWithoutOrderId.orderId;
  const parsed = parseReserveOrderRefundBody(orderIdRaw, bodyWithoutOrderId);
  const clock = clockOf(options);
  const operatorNote = parsed.operatorNote ?? null;

  const context = await persistence.withContext(async (ctx) => {
    const order = await findOrderById(ctx, parsed.orderId);
    if (!order || !order.paymentId) {
      await requireRefundCapability(ctx, workforce, REFUND_INITIATE_PERMISSION);
      throw new RefundError("REFUND_NOT_FOUND", "Refund not found.");
    }
    const payment = await findPaymentById(ctx, order.paymentId);
    if (!payment) {
      await requireRefundCapability(ctx, workforce, REFUND_INITIATE_PERMISSION);
      throw new RefundError("REFUND_NOT_FOUND", "Refund not found.");
    }
    const facts = await findPaymentCapturedFacts(ctx, payment);
    if (!facts || facts.orderId !== order.id) {
      await requireRefundCapability(ctx, workforce, REFUND_INITIATE_PERMISSION);
      throw new RefundError("REFUND_NOT_FOUND", "Refund not found.");
    }
    await authorizeRefundOutletAccess(
      ctx,
      workforce,
      facts.outletId,
      REFUND_INITIATE_PERMISSION,
    );
    const providerRef = await findAuthoritativeProviderPaymentReference(ctx, payment.id);
    return {
      orderId: order.id,
      paymentId: payment.id,
      paymentStatus: payment.status,
      outletId: facts.outletId,
      checkoutId: facts.checkoutId,
      checkoutSnapshotId: facts.checkoutSnapshotId,
      capturedAmount: facts.grandTotalPaise,
      providerRef,
    };
  });

  if (context.paymentStatus !== "SUCCEEDED") {
    throw new RefundError(
      "REFUND_PAYMENT_NOT_ELIGIBLE",
      "Only a successful captured Payment may be refunded.",
    );
  }
  if (!context.providerRef) {
    throw new RefundError(
      "REFUND_PROVIDER_REFERENCE_MISSING",
      "Payment is missing the required provider payment reference.",
    );
  }

  const expectedIdentity = Object.freeze({
    orderId: context.orderId,
    paymentId: context.paymentId,
    amountPaise: parsed.amountPaise,
    reason: parsed.reason,
    operatorNote,
    initiatedByActorId: workforce.workforceUserId,
  });

  const existing = await persistence.withContext((ctx) =>
    findRefundById(ctx, parsed.refundRequestId),
  );
  if (existing) {
    return resolveExistingOrderRefundReplay(persistence, workforce, existing, expectedIdentity);
  }

  try {
    const outcome = await persistence.transaction(async (tx) => {
      const locked = await lockPaymentAndRefunds(tx, context.paymentId);
      if (!locked.payment || locked.payment.status !== "SUCCEEDED") {
        throw new RefundError(
          "REFUND_PAYMENT_NOT_ELIGIBLE",
          "Only a successful captured Payment may be refunded.",
        );
      }
      const raced = await findRefundById(tx, parsed.refundRequestId);
      if (raced) {
        return { kind: "existing" as const, row: raced };
      }
      const facts = await findPaymentCapturedFacts(tx, locked.payment);
      if (!facts || facts.orderId !== context.orderId) {
        throw new RefundError("REFUND_PAYMENT_NOT_ELIGIBLE", "Payment captured truth is missing.");
      }
      const providerRef = await findAuthoritativeProviderPaymentReference(tx, locked.payment.id);
      if (
        !providerRef ||
        providerRef.provider !== context.providerRef!.provider ||
        providerRef.providerPaymentId !== context.providerRef!.providerPaymentId
      ) {
        throw new RefundError(
          "REFUND_PROVIDER_REFERENCE_MISSING",
          "Payment is missing the required provider payment reference.",
        );
      }
      const balance = balanceFromRefundRows(facts.grandTotalPaise, locked.refunds);
      if (balance.fullyRefunded || balance.remainingRefundableAmount <= BigInt(0)) {
        throw new RefundError("REFUND_FULLY_REFUNDED", "Payment has no remaining refundable amount.");
      }
      if (parsed.amountPaise > balance.remainingRefundableAmount) {
        throw new RefundError(
          "REFUND_AMOUNT_EXCEEDS_REMAINING",
          "Requested refund exceeds remaining refundable amount.",
        );
      }
      const now = clock.now();
      await insertRefund(tx, {
        id: parsed.refundRequestId,
        paymentId: locked.payment.id,
        checkoutId: facts.checkoutId,
        checkoutSnapshotId: facts.checkoutSnapshotId,
        orderId: context.orderId,
        amountPaise: parsed.amountPaise,
        currency: "INR",
        provider: providerRef.provider,
        providerIdempotencyKey: refundProviderIdempotencyKey(parsed.refundRequestId),
        providerPaymentId: providerRef.providerPaymentId,
        reason: parsed.reason,
        operatorNote,
        initiatedByActorId: workforce.workforceUserId,
        now,
      });
      return { kind: "created" as const };
    });
    if (outcome.kind === "existing") {
      return resolveExistingOrderRefundReplay(
        persistence,
        workforce,
        outcome.row,
        expectedIdentity,
      );
    }
  } catch (error) {
    if (isUniqueViolation(error)) {
      const raced = await persistence.withContext((ctx) =>
        findRefundById(ctx, parsed.refundRequestId),
      );
      if (!raced) {
        throw new RefundError(
          "REFUND_IDEMPOTENCY_CONFLICT",
          "Refund request conflicts with an existing refund command.",
        );
      }
      return resolveExistingOrderRefundReplay(persistence, workforce, raced, expectedIdentity);
    }
    throw error;
  }

  return buildRefundResult(persistence, parsed.refundRequestId);
}

/**
 * Safe workforce Refund support projection for one Order (IMP-036D).
 * Permission: payment.refund.read against server-derived Outlet.
 */
export async function getOrderRefundSupport(
  persistence: Persistence,
  actor: unknown,
  orderId: string,
): Promise<{
  refunds: readonly ReturnType<typeof mapRefundRow>[];
  balance: RefundResult["balance"];
  paymentStatus: string;
  paymentId: string;
}> {
  const workforce = requireRefundWorkforceActor(actor);
  return persistence.withContext(async (ctx) => {
    const order = await findOrderById(ctx, orderId);
    if (!order || !order.paymentId) {
      await requireRefundCapability(ctx, workforce, REFUND_READ_PERMISSION);
      throw new RefundError("REFUND_NOT_FOUND", "Refund not found.");
    }
    const payment = await findPaymentById(ctx, order.paymentId);
    if (!payment) {
      await requireRefundCapability(ctx, workforce, REFUND_READ_PERMISSION);
      throw new RefundError("REFUND_NOT_FOUND", "Refund not found.");
    }
    const facts = await findPaymentCapturedFacts(ctx, payment);
    if (!facts || facts.orderId !== order.id) {
      await requireRefundCapability(ctx, workforce, REFUND_READ_PERMISSION);
      throw new RefundError("REFUND_NOT_FOUND", "Refund not found.");
    }
    await authorizeRefundOutletAccess(ctx, workforce, facts.outletId, REFUND_READ_PERMISSION);
    const rows = await listRefundsForPayment(ctx, payment.id);
    return Object.freeze({
      refunds: rows.map(mapRefundRow),
      balance: balanceFromRefundRows(facts.grandTotalPaise, rows),
      paymentStatus: payment.status,
      paymentId: payment.id,
    });
  });
}

export async function getRefund(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: RefundOperationOptions = {},
): Promise<RefundResult> {
  void options;
  const workforce = requireRefundWorkforceActor(actor);
  const parsed = parseGetRefundInput(input);
  const refund = await persistence.withContext((ctx) => findRefundById(ctx, parsed.refundId));
  if (!refund) {
    throw new RefundError("REFUND_NOT_FOUND", "Refund not found.");
  }
  await authorizePaymentRefund(
    persistence,
    workforce,
    refund.paymentId,
    REFUND_READ_PERMISSION,
  );
  return buildRefundResult(persistence, refund.id);
}

export async function reconcileRefund(
  persistence: Persistence,
  actor: unknown,
  input: unknown,
  options: RefundOperationOptions = {},
): Promise<RefundResult> {
  const workforce = requireRefundWorkforceActor(actor);
  const parsed = parseReconcileRefundInput(input);
  const clock = clockOf(options);
  const provider = requireRefundProvider(providerOf(options));
  const refund = await persistence.withContext((ctx) => findRefundById(ctx, parsed.refundId));
  if (!refund) {
    throw new RefundError("REFUND_NOT_FOUND", "Refund not found.");
  }
  await authorizePaymentRefund(
    persistence,
    workforce,
    refund.paymentId,
    REFUND_INITIATE_PERMISSION,
  );
  await reconcileRefundRow(persistence, refund, provider, clock.now());
  return buildRefundResult(persistence, refund.id);
}

async function reconcileRefundRow(
  persistence: Persistence,
  refund: RefundRow,
  provider: PaymentProvider,
  now: Date,
): Promise<void> {
  if (!provider.queryRefund || !provider.createRefund) {
    throw new RefundError(
      "REFUND_PROVIDER_UNAVAILABLE",
      "Refund provider capability is unavailable.",
    );
  }
  if (refund.status === "PROCESSED") {
    const evidence = await provider.queryRefund({
      providerRefundId: refund.providerRefundId ?? undefined,
      providerPaymentId: refund.providerPaymentId ?? undefined,
      amountPaise: refund.amountPaise,
      idempotencyKey: refund.providerIdempotencyKey,
    });
    await applyEvidenceThenEnsureStatutoryPending(
      persistence,
      refund.id,
      evidence,
      "reconciliation",
      now,
    );
    return;
  }
  if (refund.providerRefundId) {
    const evidence = await provider.queryRefund({
      providerRefundId: refund.providerRefundId,
      providerPaymentId: refund.providerPaymentId ?? undefined,
      amountPaise: refund.amountPaise,
      idempotencyKey: refund.providerIdempotencyKey,
    });
    await applyEvidenceThenEnsureStatutoryPending(
      persistence,
      refund.id,
      evidence,
      "query",
      now,
    );
    return;
  }
  let evidence: NormalizedRefundEvidence;
  try {
    evidence = await provider.createRefund({
      refundId: refund.id,
      providerPaymentId: refund.providerPaymentId ?? "",
      amountPaise: refund.amountPaise,
      currency: "INR",
      idempotencyKey: refund.providerIdempotencyKey,
    });
  } catch {
    evidence = await provider.queryRefund({
      providerPaymentId: refund.providerPaymentId ?? undefined,
      amountPaise: refund.amountPaise,
      idempotencyKey: refund.providerIdempotencyKey,
    });
  }
  await applyEvidenceThenEnsureStatutoryPending(
    persistence,
    refund.id,
    evidence,
    "reconciliation",
    now,
  );
}

/**
 * Webhook/inbox application. Returns false when correlation is unknown.
 */
export async function applyRefundProviderEvidence(
  persistence: Persistence,
  evidence: NormalizedRefundEvidence,
  options: RefundOperationOptions = {},
): Promise<boolean> {
  const clock = clockOf(options);
  const now = clock.now();
  const correlated = await persistence.withContext(async (ctx) => {
    if (evidence.providerRefundId) {
      const byId = await findRefundByProviderRefundId(ctx, {
        provider: evidence.provider,
        providerRefundId: evidence.providerRefundId,
      });
      if (byId) return byId;
    }
    if (!evidence.providerPaymentId) return null;
    const candidates = await findNonTerminalRefundsByProviderPaymentId(ctx, {
      provider: evidence.provider,
      providerPaymentId: evidence.providerPaymentId,
    });
    if (candidates.length === 0) return null;
    if (candidates.length === 1) return candidates[0]!;
    const amountMatched =
      evidence.observedAmountPaise !== null
        ? candidates.filter((row) => row.amountPaise === evidence.observedAmountPaise)
        : candidates;
    if (amountMatched.length === 1) return amountMatched[0]!;
    return null;
  });
  if (!correlated) return false;
  await applyEvidenceThenEnsureStatutoryPending(
    persistence,
    correlated.id,
    evidence,
    "webhook",
    now,
  );
  return true;
}

export async function reconcileNonTerminalRefundsBatch(
  persistence: Persistence,
  options: RefundOperationOptions = {},
  limit = 8,
): Promise<number> {
  const clock = clockOf(options);
  const provider = providerOf(options);
  if (!provider.createRefund || !provider.queryRefund) return 0;
  const rows = await persistence.withContext((ctx) => listNonTerminalRefunds(ctx, limit));
  let processed = 0;
  for (const row of rows) {
    try {
      await reconcileRefundRow(persistence, row, provider, clock.now());
      processed += 1;
    } catch {
      // Batch must not abort remaining rows.
    }
  }
  return processed;
}

export async function getRefundBalanceForPayment(
  persistence: Persistence,
  paymentId: string,
): Promise<RefundResult["balance"]> {
  return persistence.withContext(async (ctx) => {
    const payment = await findPaymentById(ctx, paymentId);
    if (!payment) {
      throw new RefundError("REFUND_NOT_FOUND", "Refund not found.");
    }
    const facts = await findPaymentCapturedFacts(ctx, payment);
    const rows = await listRefundsForPayment(ctx, paymentId);
    return balanceFromRefundRows(facts?.grandTotalPaise ?? BigInt(0), rows);
  });
}
