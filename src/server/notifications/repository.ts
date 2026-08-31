/**
 * Notification persistence primitives (IMP-033).
 *
 * Every operation takes an IMP-006 persistence context. Notification writes
 * never touch Order / Payment / Delivery / Refund / Identity tables — the only
 * cross-domain read is the customer identity lookup used to address a message.
 */
import { and, asc, eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { checkoutSnapshotsTable, checkoutsTable } from "../../platform/database/schema/checkout";
import {
  notificationCommunicationPreferencesTable,
  notificationConsentsTable,
  notificationMessageAttemptsTable,
  notificationProviderEventsTable,
  notificationRequestsTable,
  notificationTemplatesTable,
} from "../../platform/database/schema/notifications";
import { ordersTable } from "../../platform/database/schema/order";
import {
  parseTemplateVariableSchema,
  type NotificationChannel,
  type NotificationCommunicationPreference,
  type NotificationConsent,
  type NotificationConsentEvidenceType,
  type NotificationConsentStatus,
  type NotificationMessageAttempt,
  type NotificationProviderEventDirection,
  type NotificationProviderEventProcessingStatus,
  type NotificationPurpose,
  type NotificationQuietHours,
  type NotificationRequest,
  type NotificationRetryCategory,
  type NotificationReviewReason,
  type NotificationSemanticType,
  type NotificationStatus,
  type NotificationSuppressionReason,
  type NotificationTemplate,
  type NotificationTemplateStatus,
} from "../../shared/notifications";
import type {
  PersistenceQueryContext,
  PersistenceTransactionContext,
} from "../persistence/types";
import { assertApplicationRole, assertTransactionContext } from "./assert-role";

export type NotificationRequestRow = typeof notificationRequestsTable.$inferSelect;
export type NotificationMessageAttemptRow =
  typeof notificationMessageAttemptsTable.$inferSelect;
export type NotificationConsentRow = typeof notificationConsentsTable.$inferSelect;
export type NotificationPreferenceRow =
  typeof notificationCommunicationPreferencesTable.$inferSelect;
export type NotificationTemplateRow = typeof notificationTemplatesTable.$inferSelect;

export function newNotificationRequestId(): string {
  return randomUUID();
}

export function newNotificationAttemptId(): string {
  return randomUUID();
}

export function newNotificationCorrelationId(): string {
  return randomUUID();
}

function parseQuietHours(value: unknown): NotificationQuietHours | null {
  if (typeof value !== "object" || value === null) return null;
  const record = value as Record<string, unknown>;
  const start = record.startMinuteOfDay;
  const end = record.endMinuteOfDay;
  if (typeof start !== "number" || typeof end !== "number") return null;
  return Object.freeze({ startMinuteOfDay: start, endMinuteOfDay: end });
}

export function mapNotificationRequestRow(
  row: NotificationRequestRow,
): NotificationRequest {
  return Object.freeze({
    id: row.id,
    customerId: row.customerId,
    purpose: row.purpose as NotificationPurpose,
    channel: row.channel as NotificationChannel,
    semanticType: row.semanticType as NotificationSemanticType,
    domainEventRef: row.domainEventRef,
    dedupKey: row.dedupKey,
    orderId: row.orderId,
    status: row.status as NotificationStatus,
    templateKey: row.templateKey,
    locale: row.locale,
    suppressionReason: row.suppressionReason as NotificationSuppressionReason | null,
    reviewReason: row.reviewReason as NotificationReviewReason | null,
    attemptCount: row.attemptCount,
    maxAttempts: row.maxAttempts,
    nextAttemptAt: row.nextAttemptAt,
    expiresAt: row.expiresAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    terminalAt: row.terminalAt,
  });
}

export function mapNotificationAttemptRow(
  row: NotificationMessageAttemptRow,
): NotificationMessageAttempt {
  return Object.freeze({
    id: row.id,
    notificationRequestId: row.notificationRequestId,
    attemptSequence: row.attemptSequence,
    channel: row.channel as NotificationChannel,
    provider: row.provider,
    providerMessageId: row.providerMessageId,
    status: row.status as NotificationStatus,
    failureCategory: row.failureCategory as NotificationRetryCategory | null,
    failureCode: row.failureCode,
    failureDetail: row.failureDetail,
    correlationId: row.correlationId,
    sentAt: row.sentAt,
    providerAckedAt: row.providerAckedAt,
    createdAt: row.createdAt,
  });
}

export function mapNotificationConsentRow(
  row: NotificationConsentRow,
): NotificationConsent {
  return Object.freeze({
    id: row.id,
    customerId: row.customerId,
    purpose: row.purpose as NotificationPurpose,
    status: row.status as NotificationConsentStatus,
    evidenceType: row.evidenceType as NotificationConsentEvidenceType,
    evidenceRef: row.evidenceRef,
    grantedAt: row.grantedAt,
    withdrawnAt: row.withdrawnAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function mapNotificationPreferenceRow(
  row: NotificationPreferenceRow,
): NotificationCommunicationPreference {
  return Object.freeze({
    id: row.id,
    customerId: row.customerId,
    channel: row.channel as NotificationChannel,
    enabled: row.enabled,
    quietHours: parseQuietHours(row.quietHours),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export function mapNotificationTemplateRow(
  row: NotificationTemplateRow,
): NotificationTemplate {
  return Object.freeze({
    id: row.id,
    semanticType: row.semanticType as NotificationSemanticType,
    templateKey: row.templateKey,
    locale: row.locale,
    version: row.version,
    channel: row.channel as NotificationChannel,
    providerTemplateRef: row.providerTemplateRef,
    status: row.status as NotificationTemplateStatus,
    variableSchema: parseTemplateVariableSchema(row.variableSchema),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export type InsertNotificationRequestInput = Readonly<{
  id: string;
  customerId: string;
  purpose: NotificationPurpose;
  channel: NotificationChannel;
  semanticType: NotificationSemanticType;
  domainEventRef: string;
  dedupKey: string;
  orderId: string | null;
  templateKey: string | null;
  locale: string;
  maxAttempts: bigint;
  expiresAt: Date;
  now: Date;
}>;

/**
 * Insert one PENDING request, converging on the existing row when the dedup key
 * is already taken. `ON CONFLICT DO NOTHING` keeps at-least-once outbox
 * redelivery from producing a duplicate customer message, and returning the
 * pre-existing row lets the caller stay idempotent without a second round trip
 * distinguishing "created" from "already existed".
 */
export async function insertNotificationRequestIfAbsent(
  context: PersistenceTransactionContext,
  input: InsertNotificationRequestInput,
): Promise<Readonly<{ request: NotificationRequest; created: boolean }>> {
  assertTransactionContext(context, "insertNotificationRequestIfAbsent");

  const inserted = await context.db
    .insert(notificationRequestsTable)
    .values({
      id: input.id,
      customerId: input.customerId,
      purpose: input.purpose,
      channel: input.channel,
      semanticType: input.semanticType,
      domainEventRef: input.domainEventRef,
      dedupKey: input.dedupKey,
      orderId: input.orderId,
      status: "PENDING",
      templateKey: input.templateKey,
      locale: input.locale,
      suppressionReason: null,
      reviewReason: null,
      attemptCount: BigInt(0),
      maxAttempts: input.maxAttempts,
      nextAttemptAt: input.now,
      expiresAt: input.expiresAt,
      createdAt: input.now,
      updatedAt: input.now,
      terminalAt: null,
    })
    .onConflictDoNothing({ target: notificationRequestsTable.dedupKey })
    .returning();

  const row = inserted[0];
  if (row) {
    return Object.freeze({
      request: mapNotificationRequestRow(row),
      created: true,
    });
  }

  const existing = await findNotificationRequestByDedupKey(context, input.dedupKey);
  if (!existing) {
    // Only reachable if the conflicting row disappeared between statements,
    // which the restrict-only privilege model does not permit.
    throw new Error("Notification request conflict could not be resolved.");
  }
  return Object.freeze({ request: existing, created: false });
}

export async function findNotificationRequestByDedupKey(
  context: PersistenceQueryContext,
  dedupKey: string,
): Promise<NotificationRequest | null> {
  assertApplicationRole(context, "findNotificationRequestByDedupKey");
  const rows = await context.db
    .select()
    .from(notificationRequestsTable)
    .where(eq(notificationRequestsTable.dedupKey, dedupKey))
    .limit(1);
  const row = rows[0];
  return row ? mapNotificationRequestRow(row) : null;
}

export async function findNotificationRequestById(
  context: PersistenceQueryContext,
  id: string,
): Promise<NotificationRequest | null> {
  assertApplicationRole(context, "findNotificationRequestById");
  const rows = await context.db
    .select()
    .from(notificationRequestsTable)
    .where(eq(notificationRequestsTable.id, id))
    .limit(1);
  const row = rows[0];
  return row ? mapNotificationRequestRow(row) : null;
}

export async function lockNotificationRequestForUpdate(
  context: PersistenceTransactionContext,
  id: string,
): Promise<NotificationRequest | null> {
  assertTransactionContext(context, "lockNotificationRequestForUpdate");
  const rows = await context.db
    .select()
    .from(notificationRequestsTable)
    .where(eq(notificationRequestsTable.id, id))
    .limit(1)
    .for("update");
  const row = rows[0];
  return row ? mapNotificationRequestRow(row) : null;
}

export type UpdateNotificationRequestInput = Readonly<{
  status: NotificationStatus;
  attemptCount?: bigint;
  maxAttempts?: bigint;
  templateKey?: string | null;
  suppressionReason?: NotificationSuppressionReason | null;
  reviewReason?: NotificationReviewReason | null;
  nextAttemptAt?: Date | null;
  terminalAt?: Date | null;
  now: Date;
}>;

export async function updateNotificationRequest(
  context: PersistenceTransactionContext,
  id: string,
  input: UpdateNotificationRequestInput,
): Promise<NotificationRequest> {
  assertTransactionContext(context, "updateNotificationRequest");
  const rows = await context.db
    .update(notificationRequestsTable)
    .set({
      status: input.status,
      ...(input.attemptCount !== undefined ? { attemptCount: input.attemptCount } : {}),
      ...(input.maxAttempts !== undefined ? { maxAttempts: input.maxAttempts } : {}),
      ...(input.templateKey !== undefined ? { templateKey: input.templateKey } : {}),
      suppressionReason: input.suppressionReason ?? null,
      reviewReason: input.reviewReason ?? null,
      nextAttemptAt: input.nextAttemptAt ?? null,
      terminalAt: input.terminalAt ?? null,
      updatedAt: input.now,
    })
    .where(eq(notificationRequestsTable.id, id))
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error(`Notification request ${id} disappeared during update.`);
  }
  return mapNotificationRequestRow(row);
}

export type InsertNotificationAttemptInput = Readonly<{
  id: string;
  notificationRequestId: string;
  attemptSequence: bigint;
  channel: NotificationChannel;
  provider: string;
  providerMessageId: string | null;
  status: NotificationStatus;
  failureCategory: NotificationRetryCategory | null;
  failureCode: string | null;
  failureDetail: string | null;
  correlationId: string;
  manualResendReason: string | null;
  manualResendByWorkforceUserId: string | null;
  sentAt: Date | null;
  providerAckedAt: Date | null;
  now: Date;
}>;

export async function insertNotificationAttempt(
  context: PersistenceTransactionContext,
  input: InsertNotificationAttemptInput,
): Promise<NotificationMessageAttempt> {
  assertTransactionContext(context, "insertNotificationAttempt");
  const rows = await context.db
    .insert(notificationMessageAttemptsTable)
    .values({
      id: input.id,
      notificationRequestId: input.notificationRequestId,
      attemptSequence: input.attemptSequence,
      channel: input.channel,
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      status: input.status,
      failureCategory: input.failureCategory,
      failureCode: input.failureCode,
      failureDetail: input.failureDetail,
      correlationId: input.correlationId,
      manualResendReason: input.manualResendReason,
      manualResendByWorkforceUserId: input.manualResendByWorkforceUserId,
      sentAt: input.sentAt,
      providerAckedAt: input.providerAckedAt,
      createdAt: input.now,
    })
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error("Notification attempt insert returned no row.");
  }
  return mapNotificationAttemptRow(row);
}

export type FinalizeNotificationAttemptInput = Readonly<{
  status: NotificationStatus;
  provider: string;
  providerMessageId: string | null;
  failureCategory: NotificationRetryCategory | null;
  failureCode: string | null;
  failureDetail: string | null;
  sentAt: Date | null;
  providerAckedAt: Date | null;
}>;

/** Record an attempt's outcome after the adapter call returned. */
export async function finalizeNotificationAttempt(
  context: PersistenceTransactionContext,
  attemptId: string,
  input: FinalizeNotificationAttemptInput,
): Promise<NotificationMessageAttempt> {
  assertTransactionContext(context, "finalizeNotificationAttempt");
  const rows = await context.db
    .update(notificationMessageAttemptsTable)
    .set({
      status: input.status,
      provider: input.provider,
      providerMessageId: input.providerMessageId,
      failureCategory: input.failureCategory,
      failureCode: input.failureCode,
      failureDetail: input.failureDetail,
      sentAt: input.sentAt,
      providerAckedAt: input.providerAckedAt,
    })
    .where(eq(notificationMessageAttemptsTable.id, attemptId))
    .returning();
  const row = rows[0];
  if (!row) {
    throw new Error(`Notification attempt ${attemptId} disappeared during update.`);
  }
  return mapNotificationAttemptRow(row);
}

export async function listNotificationAttempts(
  context: PersistenceQueryContext,
  notificationRequestId: string,
): Promise<readonly NotificationMessageAttempt[]> {
  assertApplicationRole(context, "listNotificationAttempts");
  const rows = await context.db
    .select()
    .from(notificationMessageAttemptsTable)
    .where(
      eq(notificationMessageAttemptsTable.notificationRequestId, notificationRequestId),
    )
    .orderBy(asc(notificationMessageAttemptsTable.attemptSequence));
  return Object.freeze(rows.map(mapNotificationAttemptRow));
}

export async function findConsent(
  context: PersistenceQueryContext,
  customerId: string,
  purpose: NotificationPurpose,
): Promise<NotificationConsent | null> {
  assertApplicationRole(context, "findConsent");
  const rows = await context.db
    .select()
    .from(notificationConsentsTable)
    .where(
      and(
        eq(notificationConsentsTable.customerId, customerId),
        eq(notificationConsentsTable.purpose, purpose),
      ),
    )
    .limit(1);
  const row = rows[0];
  return row ? mapNotificationConsentRow(row) : null;
}

export type UpsertConsentInput = Readonly<{
  customerId: string;
  purpose: NotificationPurpose;
  status: NotificationConsentStatus;
  evidenceType: NotificationConsentEvidenceType;
  evidenceRef: string | null;
  now: Date;
}>;

/**
 * Record consent evidence, leaving any pre-existing row untouched.
 *
 * A withdrawal or operator suppression must never be silently overwritten by a
 * later transactional-relationship insert, so this is insert-if-absent rather
 * than an upsert of status.
 */
export async function insertConsentIfAbsent(
  context: PersistenceTransactionContext,
  input: UpsertConsentInput,
): Promise<void> {
  assertTransactionContext(context, "insertConsentIfAbsent");
  await context.db
    .insert(notificationConsentsTable)
    .values({
      id: randomUUID(),
      customerId: input.customerId,
      purpose: input.purpose,
      status: input.status,
      evidenceType: input.evidenceType,
      evidenceRef: input.evidenceRef,
      grantedAt: input.status === "GRANTED" ? input.now : null,
      withdrawnAt: input.status === "WITHDRAWN" ? input.now : null,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoNothing({
      target: [notificationConsentsTable.customerId, notificationConsentsTable.purpose],
    });
}

export async function setConsentStatus(
  context: PersistenceTransactionContext,
  input: UpsertConsentInput,
): Promise<void> {
  assertTransactionContext(context, "setConsentStatus");
  await context.db
    .insert(notificationConsentsTable)
    .values({
      id: randomUUID(),
      customerId: input.customerId,
      purpose: input.purpose,
      status: input.status,
      evidenceType: input.evidenceType,
      evidenceRef: input.evidenceRef,
      grantedAt: input.status === "GRANTED" ? input.now : null,
      withdrawnAt: input.status === "WITHDRAWN" ? input.now : null,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: [notificationConsentsTable.customerId, notificationConsentsTable.purpose],
      set: {
        status: input.status,
        evidenceType: input.evidenceType,
        evidenceRef: input.evidenceRef,
        grantedAt: input.status === "GRANTED" ? input.now : null,
        withdrawnAt: input.status === "WITHDRAWN" ? input.now : null,
        updatedAt: input.now,
      },
    });
}

export async function findPreference(
  context: PersistenceQueryContext,
  customerId: string,
  channel: NotificationChannel,
): Promise<NotificationCommunicationPreference | null> {
  assertApplicationRole(context, "findPreference");
  const rows = await context.db
    .select()
    .from(notificationCommunicationPreferencesTable)
    .where(
      and(
        eq(notificationCommunicationPreferencesTable.customerId, customerId),
        eq(notificationCommunicationPreferencesTable.channel, channel),
      ),
    )
    .limit(1);
  const row = rows[0];
  return row ? mapNotificationPreferenceRow(row) : null;
}

export type SetPreferenceInput = Readonly<{
  customerId: string;
  channel: NotificationChannel;
  enabled: boolean;
  quietHours: NotificationQuietHours | null;
  now: Date;
}>;

export async function setCommunicationPreference(
  context: PersistenceTransactionContext,
  input: SetPreferenceInput,
): Promise<void> {
  assertTransactionContext(context, "setCommunicationPreference");
  await context.db
    .insert(notificationCommunicationPreferencesTable)
    .values({
      id: randomUUID(),
      customerId: input.customerId,
      channel: input.channel,
      enabled: input.enabled,
      quietHours: input.quietHours,
      createdAt: input.now,
      updatedAt: input.now,
    })
    .onConflictDoUpdate({
      target: [
        notificationCommunicationPreferencesTable.customerId,
        notificationCommunicationPreferencesTable.channel,
      ],
      set: {
        enabled: input.enabled,
        quietHours: input.quietHours,
        updatedAt: input.now,
      },
    });
}

export async function findApprovedTemplate(
  context: PersistenceQueryContext,
  input: Readonly<{
    semanticType: NotificationSemanticType;
    channel: NotificationChannel;
    locale: string;
  }>,
): Promise<NotificationTemplate | null> {
  assertApplicationRole(context, "findApprovedTemplate");
  const rows = await context.db
    .select()
    .from(notificationTemplatesTable)
    .where(
      and(
        eq(notificationTemplatesTable.semanticType, input.semanticType),
        eq(notificationTemplatesTable.channel, input.channel),
        eq(notificationTemplatesTable.locale, input.locale),
        eq(notificationTemplatesTable.status, "APPROVED"),
      ),
    )
    .orderBy(sql`${notificationTemplatesTable.version} desc`)
    .limit(1);
  const row = rows[0];
  return row ? mapNotificationTemplateRow(row) : null;
}

/**
 * Semantic types already dispatched for one Order — the input to stale
 * suppression. "Dispatched" means an attempt row exists, so a suppressed or
 * still-pending sibling never suppresses an earlier notification.
 */
export async function listDispatchedSemanticTypesForOrder(
  context: PersistenceQueryContext,
  orderId: string,
  excludeRequestId: string,
): Promise<readonly NotificationSemanticType[]> {
  assertApplicationRole(context, "listDispatchedSemanticTypesForOrder");
  const rows = await context.db
    .selectDistinct({ semanticType: notificationRequestsTable.semanticType })
    .from(notificationRequestsTable)
    .innerJoin(
      notificationMessageAttemptsTable,
      eq(
        notificationMessageAttemptsTable.notificationRequestId,
        notificationRequestsTable.id,
      ),
    )
    .where(
      and(
        eq(notificationRequestsTable.orderId, orderId),
        sql`${notificationRequestsTable.id} <> ${excludeRequestId}::uuid`,
      ),
    );
  return Object.freeze(rows.map((row) => row.semanticType as NotificationSemanticType));
}

export type InsertProviderEventInput = Readonly<{
  channel: NotificationChannel;
  provider: string;
  direction: NotificationProviderEventDirection;
  providerEventId: string;
  dedupKey: string;
  payload: Readonly<Record<string, unknown>>;
  processingStatus: NotificationProviderEventProcessingStatus;
  receivedAt: Date;
  processedAt: Date | null;
}>;

/**
 * Persist a provider event record. IMP-033 adds no webhook route and no
 * provider transport; this exists so a future adapter has a dedup-safe landing
 * table rather than inventing one under time pressure.
 */
export async function insertProviderEventIfAbsent(
  context: PersistenceTransactionContext,
  input: InsertProviderEventInput,
): Promise<boolean> {
  assertTransactionContext(context, "insertProviderEventIfAbsent");
  const rows = await context.db
    .insert(notificationProviderEventsTable)
    .values({
      id: randomUUID(),
      channel: input.channel,
      provider: input.provider,
      direction: input.direction,
      providerEventId: input.providerEventId,
      dedupKey: input.dedupKey,
      payload: input.payload as Record<string, unknown>,
      receivedAt: input.receivedAt,
      processedAt: input.processedAt,
      processingStatus: input.processingStatus,
    })
    .onConflictDoNothing({ target: notificationProviderEventsTable.dedupKey })
    .returning({ id: notificationProviderEventsTable.id });
  return rows.length > 0;
}

/**
 * Resolve the customer identity a notification for `orderId` should address.
 *
 * Read-only join through the Order's bound Checkout snapshot. Notifications
 * never write to any of these tables.
 */
export async function findCustomerIdForOrder(
  context: PersistenceQueryContext,
  orderId: string,
): Promise<string | null> {
  assertApplicationRole(context, "findCustomerIdForOrder");
  const rows = await context.db
    .select({ customerId: checkoutsTable.customerAuthUserId })
    .from(ordersTable)
    .innerJoin(
      checkoutSnapshotsTable,
      eq(checkoutSnapshotsTable.id, ordersTable.checkoutSnapshotId),
    )
    .innerJoin(checkoutsTable, eq(checkoutsTable.id, checkoutSnapshotsTable.checkoutId))
    .where(eq(ordersTable.id, orderId))
    .limit(1);
  return rows[0]?.customerId ?? null;
}
