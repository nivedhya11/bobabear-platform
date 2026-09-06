/**
 * Notification application operations (IMP-033).
 *
 * Three entry points: create a request from a notification-intent outbox
 * event, process a pending request, and perform a permission-gated manual
 * resend. None of them writes to Order / Payment / Delivery / Refund /
 * Identity, and none can record a provider or recipient fact that an adapter
 * did not actually report.
 */
import "server-only";

import {
  NOTIFICATION_DEFAULT_LOCALE,
  NOTIFICATION_DEFAULT_MAX_ATTEMPTS,
  NOTIFICATION_DEFAULT_TRANSACTIONAL_CHANNEL,
  NOTIFICATION_REASON_MAX_LENGTH,
  NotificationError,
  computeNotificationDedupKey,
  notificationExpiryFor,
  purposeForSemanticType,
  validateTemplateVariables,
  type NotificationChannel,
  type NotificationRequest,
} from "../../shared/notifications";
import type { Persistence } from "../persistence/types";
import { requireNotificationCapability, requireNotificationWorkforceActor } from "./authorize";
import { createNonSendingChannelRegistry } from "./channels";
import { systemNotificationClock, type NotificationClock } from "./clock";
import type { NotificationOutboxPayload } from "./outbox-events";
import { evaluateNotificationSendPolicy } from "./policy";
import {
  findCustomerPhoneE164,
  findNotificationRequestById,
  insertConsentIfAbsent,
  insertNotificationAttempt,
  insertNotificationRequestIfAbsent,
  finalizeNotificationAttempt,
  lockNotificationRequestForUpdate,
  newNotificationAttemptId,
  newNotificationCorrelationId,
  newNotificationRequestId,
  updateNotificationRequest,
} from "./repository";
import {
  effectiveManualResendMaxAttempts,
  isNotificationManualResendableStatus,
} from "./resend-eligibility";
import { normalizeFailureCategory, resolveFailureOutcome } from "./retry";
import { resolveApprovedTemplate } from "./templates";
import type { NotificationChannelRegistry } from "./types";

export type NotificationOperationOptions = Readonly<{
  clock?: NotificationClock;
  channels?: NotificationChannelRegistry;
  channel?: NotificationChannel;
  locale?: string;
}>;

function clockOf(options: NotificationOperationOptions): NotificationClock {
  return options.clock ?? systemNotificationClock;
}

function channelsOf(options: NotificationOperationOptions): NotificationChannelRegistry {
  return options.channels ?? createNonSendingChannelRegistry();
}

/**
 * Create the notification request for one notification-intent outbox event.
 *
 * Idempotent through the dedup-key UNIQUE index, so at-least-once outbox
 * redelivery converges on the single request that already exists. Returns null
 * when the intent is older than the transactional max age — a day-late order
 * update must not reach the customer at all.
 */
export async function createNotificationRequestFromDomainEvent(
  persistence: Persistence,
  payload: NotificationOutboxPayload,
  options: NotificationOperationOptions = {},
): Promise<NotificationRequest | null> {
  const now = clockOf(options).now();
  const occurredAt = new Date(payload.occurredAt);
  const expiresAt = notificationExpiryFor(occurredAt);
  if (expiresAt.getTime() <= now.getTime()) return null;

  const channel = options.channel ?? NOTIFICATION_DEFAULT_TRANSACTIONAL_CHANNEL;
  const locale = options.locale ?? NOTIFICATION_DEFAULT_LOCALE;
  const purpose = purposeForSemanticType(payload.semanticType);
  const dedupKey = computeNotificationDedupKey({
    customerId: payload.customerId,
    semanticType: payload.semanticType,
    domainEventRef: payload.domainEventRef,
    channel,
  });

  return persistence.transaction(async (tx) => {
    // The transactional relationship is itself the consent evidence for order
    // and delivery updates. Recorded insert-if-absent so a prior withdrawal or
    // operator suppression is never overwritten.
    await insertConsentIfAbsent(tx, {
      customerId: payload.customerId,
      purpose,
      status: "GRANTED",
      evidenceType: "TRANSACTIONAL_RELATIONSHIP",
      evidenceRef: payload.domainEventRef,
      now,
    });

    const { request } = await insertNotificationRequestIfAbsent(tx, {
      id: newNotificationRequestId(),
      customerId: payload.customerId,
      purpose,
      channel,
      semanticType: payload.semanticType,
      domainEventRef: payload.domainEventRef,
      dedupKey,
      orderId: payload.orderId,
      templateKey: null,
      locale,
      maxAttempts: BigInt(NOTIFICATION_DEFAULT_MAX_ATTEMPTS),
      expiresAt,
      now,
    });
    return request;
  });
}

type SendPreparation =
  | Readonly<{ kind: "terminal"; request: NotificationRequest }>
  | Readonly<{
      kind: "attempt";
      request: NotificationRequest;
      attemptId: string;
      correlationId: string;
      templateKey: string;
      providerTemplateRef: string | null;
      variables: Readonly<Record<string, string>>;
    }>;

/**
 * Phase 1: re-gate the request and open an attempt row.
 *
 * Commits before the adapter is called so the adapter never runs while holding
 * the request lock, and so a crash mid-send leaves a visible SENDING request
 * plus SENDING attempt rather than an untracked send.
 */
async function prepareSend(
  persistence: Persistence,
  requestId: string,
  now: Date,
  manualResend: Readonly<{ reason: string; workforceUserId: string }> | null,
): Promise<SendPreparation> {
  return persistence.transaction(async (tx) => {
    const locked = await lockNotificationRequestForUpdate(tx, requestId);
    if (!locked) {
      throw new NotificationError("NOTIFICATION_NOT_FOUND", "Notification not found.");
    }
    if (locked.status !== "PENDING" && locked.status !== "SCHEDULED") {
      return Object.freeze({ kind: "terminal" as const, request: locked });
    }

    const decision = await evaluateNotificationSendPolicy(tx, locked, now);
    if (decision.outcome === "SUPPRESS") {
      const suppressed = await updateNotificationRequest(tx, locked.id, {
        status: "SUPPRESSED",
        suppressionReason: decision.reason,
        terminalAt: now,
        now,
      });
      return Object.freeze({ kind: "terminal" as const, request: suppressed });
    }

    const template = await resolveApprovedTemplate(tx, {
      semanticType: locked.semanticType,
      channel: locked.channel,
      locale: locked.locale,
    });

    const attemptSequence = locked.attemptCount + BigInt(1);
    const attemptId = newNotificationAttemptId();
    const correlationId = newNotificationCorrelationId();

    if (!template) {
      // No APPROVED template: a real failure to record, not a reason to send
      // an untemplated message.
      const outcome = resolveFailureOutcome({
        failureCategory: "TEMPLATE_FAILURE",
        attemptCount: Number(attemptSequence),
        maxAttempts: Number(locked.maxAttempts),
        now,
      });
      await insertNotificationAttempt(tx, {
        id: attemptId,
        notificationRequestId: locked.id,
        attemptSequence,
        channel: locked.channel,
        provider: "none",
        providerMessageId: null,
        status: "FAILED",
        failureCategory: "TEMPLATE_FAILURE",
        failureCode: "TEMPLATE_NOT_APPROVED",
        failureDetail: "No APPROVED template exists for this semantic type, channel, and locale.",
        correlationId,
        manualResendReason: manualResend?.reason ?? null,
        manualResendByWorkforceUserId: manualResend?.workforceUserId ?? null,
        sentAt: null,
        providerAckedAt: null,
        now,
      });
      const updated = await updateNotificationRequest(tx, locked.id, {
        status: outcome.status,
        attemptCount: attemptSequence,
        reviewReason: outcome.reviewReason,
        nextAttemptAt: outcome.nextAttemptAt,
        terminalAt: outcome.status === "PENDING" ? null : now,
        now,
      });
      return Object.freeze({ kind: "terminal" as const, request: updated });
    }

    // No presentation variables exist in the foundation slice; validation still
    // runs so the forbidden-material rules gate every send path.
    const variables = validateTemplateVariables({}, template.variableSchema);

    await insertNotificationAttempt(tx, {
      id: attemptId,
      notificationRequestId: locked.id,
      attemptSequence,
      channel: locked.channel,
      provider: "none",
      providerMessageId: null,
      status: "SENDING",
      failureCategory: null,
      failureCode: null,
      failureDetail: null,
      correlationId,
      manualResendReason: manualResend?.reason ?? null,
      manualResendByWorkforceUserId: manualResend?.workforceUserId ?? null,
      sentAt: null,
      providerAckedAt: null,
      now,
    });

    const sending = await updateNotificationRequest(tx, locked.id, {
      status: "SENDING",
      attemptCount: attemptSequence,
      templateKey: template.templateKey,
      nextAttemptAt: null,
      now,
    });

    return Object.freeze({
      kind: "attempt" as const,
      request: sending,
      attemptId,
      correlationId,
      templateKey: template.templateKey,
      providerTemplateRef: template.providerTemplateRef,
      variables,
    });
  });
}

/**
 * Phase 2: call the adapter (no lock held) and record what it reported.
 */
async function executeSend(
  persistence: Persistence,
  prepared: Extract<SendPreparation, { kind: "attempt" }>,
  clock: NotificationClock,
  registry: NotificationChannelRegistry,
): Promise<NotificationRequest> {
  const request = prepared.request;
  const adapter = registry.adapterFor(request.channel);
  const phoneE164 = await persistence.transaction((tx) =>
    findCustomerPhoneE164(tx, request.customerId),
  );
  const result = await adapter.send({
    notificationRequestId: request.id,
    attemptId: prepared.attemptId,
    channel: request.channel,
    templateKey: prepared.templateKey,
    providerTemplateRef: prepared.providerTemplateRef,
    locale: request.locale,
    variables: prepared.variables,
    recipient: { customerId: request.customerId, phoneE164 },
    correlationId: prepared.correlationId,
  });

  const now = clock.now();

  // A provider acceptance is recorded only when the adapter actually returned a
  // provider message id. An ACCEPTED outcome without one is treated as an
  // unknown failure rather than a fabricated success.
  const accepted =
    result.outcome === "ACCEPTED" &&
    typeof result.providerMessageId === "string" &&
    result.providerMessageId.length > 0;

  return persistence.transaction(async (tx) => {
    if (accepted) {
      await finalizeNotificationAttempt(tx, prepared.attemptId, {
        status: "PROVIDER_ACCEPTED",
        provider: result.provider,
        providerMessageId: result.providerMessageId ?? null,
        failureCategory: null,
        failureCode: null,
        failureDetail: null,
        sentAt: now,
        providerAckedAt: now,
      });
      return updateNotificationRequest(tx, request.id, {
        status: "PROVIDER_ACCEPTED",
        nextAttemptAt: null,
        now,
      });
    }

    const unacknowledgedAcceptance = result.outcome === "ACCEPTED";
    const failureCategory = unacknowledgedAcceptance
      ? "UNKNOWN"
      : normalizeFailureCategory(result.failureCategory);
    const failureCode = unacknowledgedAcceptance
      ? "PROVIDER_MESSAGE_ID_MISSING"
      : (result.failureCode ?? "PROVIDER_OUTCOME_UNSPECIFIED");
    const failureDetail = unacknowledgedAcceptance
      ? "Adapter reported acceptance without a provider message id."
      : (result.failureDetail ?? null);

    await finalizeNotificationAttempt(tx, prepared.attemptId, {
      status: "FAILED",
      provider: result.provider,
      providerMessageId: null,
      failureCategory,
      failureCode,
      failureDetail,
      sentAt: null,
      providerAckedAt: null,
    });

    const outcome = resolveFailureOutcome({
      failureCategory,
      attemptCount: Number(request.attemptCount),
      maxAttempts: Number(request.maxAttempts),
      now,
    });

    return updateNotificationRequest(tx, request.id, {
      status: outcome.status,
      reviewReason: outcome.reviewReason,
      nextAttemptAt: outcome.nextAttemptAt,
      terminalAt: outcome.status === "PENDING" ? null : now,
      templateKey: prepared.templateKey,
      now,
    });
  });
}

/**
 * Advance one PENDING/SCHEDULED request through policy, template resolution,
 * and a single adapter attempt. Safe to call repeatedly: a request that is not
 * awaiting a send is returned unchanged.
 */
export async function processPendingNotification(
  persistence: Persistence,
  requestId: string,
  options: NotificationOperationOptions = {},
): Promise<NotificationRequest> {
  const clock = clockOf(options);
  const prepared = await prepareSend(persistence, requestId, clock.now(), null);
  if (prepared.kind === "terminal") return prepared.request;
  return executeSend(persistence, prepared, clock, channelsOf(options));
}

export type ManualResendInput = Readonly<{
  notificationRequestId: string;
  reason: string;
}>;

/**
 * Operator-driven resend, gated on `notification.resend`.
 *
 * Revalidates consent and staleness through the normal processing path — a
 * resend can never bypass a withdrawal or push a superseded update.
 */
export async function manualResendNotification(
  persistence: Persistence,
  actor: unknown,
  input: ManualResendInput,
  options: NotificationOperationOptions = {},
): Promise<NotificationRequest> {
  const workforce = requireNotificationWorkforceActor(actor);
  const clock = clockOf(options);

  const reason = typeof input?.reason === "string" ? input.reason.trim() : "";
  if (reason.length === 0) {
    throw new NotificationError(
      "NOTIFICATION_INVALID_INPUT",
      "A resend reason is required.",
      { field: "reason" },
    );
  }
  if (reason.length > NOTIFICATION_REASON_MAX_LENGTH) {
    throw new NotificationError(
      "NOTIFICATION_INVALID_INPUT",
      `reason must be at most ${NOTIFICATION_REASON_MAX_LENGTH} characters.`,
      { field: "reason" },
    );
  }

  await persistence.withContext((ctx) =>
    requireNotificationCapability(ctx, workforce, "notification.resend"),
  );

  const existing = await persistence.withContext((ctx) =>
    findNotificationRequestById(ctx, input.notificationRequestId),
  );
  if (!existing) {
    throw new NotificationError("NOTIFICATION_NOT_FOUND", "Notification not found.");
  }
  if (!isNotificationManualResendableStatus(existing.status)) {
    throw new NotificationError(
      "NOTIFICATION_RESEND_NOT_ALLOWED",
      "Notification cannot be resent from its current status.",
    );
  }

  const now = clock.now();
  await persistence.transaction(async (tx) => {
    const locked = await lockNotificationRequestForUpdate(tx, input.notificationRequestId);
    if (!locked) {
      throw new NotificationError("NOTIFICATION_NOT_FOUND", "Notification not found.");
    }
    if (!isNotificationManualResendableStatus(locked.status)) {
      throw new NotificationError(
        "NOTIFICATION_RESEND_NOT_ALLOWED",
        "Notification cannot be resent from its current status.",
      );
    }
    // Grant exactly one further attempt when the automatic budget is spent.
    const maxAttempts = effectiveManualResendMaxAttempts(
      locked.attemptCount,
      locked.maxAttempts,
    );
    if (locked.attemptCount >= maxAttempts) {
      throw new NotificationError(
        "NOTIFICATION_RESEND_NOT_ALLOWED",
        "Notification has exhausted its attempt ceiling.",
      );
    }
    await updateNotificationRequest(tx, locked.id, {
      status: "PENDING",
      maxAttempts,
      reviewReason: null,
      nextAttemptAt: now,
      terminalAt: null,
      now,
    });
  });

  const prepared = await prepareSend(persistence, input.notificationRequestId, clock.now(), {
    reason,
    workforceUserId: workforce.workforceUserId,
  });
  if (prepared.kind === "terminal") return prepared.request;
  return executeSend(persistence, prepared, clock, channelsOf(options));
}
