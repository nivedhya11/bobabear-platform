/**
 * Process verified Meta WhatsApp webhook events (IMP-034).
 *
 * Hard invariants:
 * - Never mutate Order / Payment / Delivery / Refund
 * - Never create cancellation / refund from inbound
 * - Status updates never regress lifecycle (READ ↛ DELIVERED, etc.)
 * - Duplicate provider events are idempotent no-ops
 */
import "server-only";

import type { AppEnvironment } from "../../../../platform/config";
import type { PersistenceTransactionContext } from "../../../persistence/types";
import {
  applyProviderStatusToAttemptAndRequest,
  findAttemptByProviderMessageId,
  insertInboundMessageIfAbsent,
  insertProviderEventIfAbsent,
  markProviderEventProcessed,
} from "../../repository";
import { META_WHATSAPP_PROVIDER } from "./constants";
import { redactWebhookPayload } from "./redact";
import {
  parseMetaWhatsAppWebhookPayload,
  type MetaWhatsAppParsedEvent,
  type MetaWhatsAppStatusValue,
} from "./webhook-payload";
import type { NotificationStatus } from "../../../../shared/notifications";

export type ProcessMetaWhatsAppWebhookInput = Readonly<{
  environment: AppEnvironment;
  /** Fallback account scope when WABA id is absent from the payload. */
  configuredWabaId: string | null;
  rawPayload: Readonly<Record<string, unknown>>;
  receivedAt: Date;
}>;

export type ProcessMetaWhatsAppWebhookResult = Readonly<{
  eventCount: number;
  inserted: number;
  duplicates: number;
  processed: number;
  ignored: number;
}>;

function mapStatusToNotificationStatus(
  status: MetaWhatsAppStatusValue,
): NotificationStatus {
  switch (status) {
    case "sent":
      return "PROVIDER_ACCEPTED";
    case "delivered":
      return "DELIVERED";
    case "read":
      return "READ";
    case "failed":
      return "FAILED";
  }
}

export function buildMetaWhatsAppProviderEventDedupKey(input: Readonly<{
  environment: AppEnvironment;
  wabaOrAccountId: string;
  providerEventId: string;
}>): string {
  return `meta_whatsapp|${input.environment}|${input.wabaOrAccountId}|${input.providerEventId}`;
}

async function processOneEvent(
  tx: PersistenceTransactionContext,
  event: MetaWhatsAppParsedEvent,
  input: ProcessMetaWhatsAppWebhookInput,
  redactedPayload: Readonly<Record<string, unknown>>,
): Promise<"inserted_processed" | "inserted_ignored" | "duplicate"> {
  const wabaOrAccountId =
    event.wabaId ?? input.configuredWabaId ?? "unknown_waba";
  const dedupKey = buildMetaWhatsAppProviderEventDedupKey({
    environment: input.environment,
    wabaOrAccountId,
    providerEventId: event.providerEventId,
  });

  const created = await insertProviderEventIfAbsent(tx, {
    channel: "WHATSAPP",
    provider: META_WHATSAPP_PROVIDER,
    direction: event.kind === "inbound" ? "INBOUND" : "OUTBOUND",
    providerEventId: event.providerEventId,
    dedupKey,
    payload: redactedPayload,
    processingStatus: "RECEIVED",
    receivedAt: input.receivedAt,
    processedAt: null,
  });

  if (!created) {
    return "duplicate";
  }

  if (event.kind === "status") {
    const attempt = await findAttemptByProviderMessageId(
      tx,
      META_WHATSAPP_PROVIDER,
      event.providerMessageId,
    );
    if (!attempt) {
      await markProviderEventProcessed(tx, dedupKey, {
        processingStatus: "IGNORED",
        processedAt: input.receivedAt,
      });
      return "inserted_ignored";
    }
    await applyProviderStatusToAttemptAndRequest(tx, {
      attemptId: attempt.id,
      notificationRequestId: attempt.notificationRequestId,
      nextStatus: mapStatusToNotificationStatus(event.status),
      now: input.receivedAt,
    });
    await markProviderEventProcessed(tx, dedupKey, {
      processingStatus: "PROCESSED",
      processedAt: input.receivedAt,
    });
    return "inserted_processed";
  }

  // Inbound: durable minimized record only. Never cancel/refund.
  await insertInboundMessageIfAbsent(tx, {
    provider: META_WHATSAPP_PROVIDER,
    providerMessageId: event.providerMessageId,
    waFromE164: event.waFromE164,
    customerId: null,
    messageType: event.messageType ?? "unknown",
    bodyPreview: event.bodyPreview,
    classification: "UNCLASSIFIED",
    providerEventDedupKey: dedupKey,
    receivedAt: input.receivedAt,
    now: input.receivedAt,
  });
  await markProviderEventProcessed(tx, dedupKey, {
    processingStatus: "PROCESSED",
    processedAt: input.receivedAt,
  });
  return "inserted_processed";
}

/**
 * Durable ingest + process for one verified webhook body.
 * Caller must hold a persistence transaction.
 */
export async function processMetaWhatsAppWebhook(
  tx: PersistenceTransactionContext,
  input: ProcessMetaWhatsAppWebhookInput,
): Promise<ProcessMetaWhatsAppWebhookResult> {
  const redacted = redactWebhookPayload(input.rawPayload);
  const events = parseMetaWhatsAppWebhookPayload(input.rawPayload);

  let inserted = 0;
  let duplicates = 0;
  let processed = 0;
  let ignored = 0;

  if (events.length === 0) {
    // Still record an envelope-level ignored event for audit when Meta posts
    // an empty / unrecognized body under the correct object.
    const envelopeId = `envelope:${input.receivedAt.toISOString()}`;
    const dedupKey = buildMetaWhatsAppProviderEventDedupKey({
      environment: input.environment,
      wabaOrAccountId: input.configuredWabaId ?? "unknown_waba",
      providerEventId: envelopeId,
    });
    const created = await insertProviderEventIfAbsent(tx, {
      channel: "WHATSAPP",
      provider: META_WHATSAPP_PROVIDER,
      direction: "INBOUND",
      providerEventId: envelopeId,
      dedupKey,
      payload: redacted,
      processingStatus: "RECEIVED",
      receivedAt: input.receivedAt,
      processedAt: null,
    });
    if (created) {
      inserted += 1;
      await markProviderEventProcessed(tx, dedupKey, {
        processingStatus: "IGNORED",
        processedAt: input.receivedAt,
      });
      ignored += 1;
    } else {
      duplicates += 1;
    }
    return Object.freeze({
      eventCount: 0,
      inserted,
      duplicates,
      processed,
      ignored,
    });
  }

  for (const event of events) {
    const outcome = await processOneEvent(tx, event, input, redacted);
    if (outcome === "duplicate") {
      duplicates += 1;
    } else if (outcome === "inserted_ignored") {
      inserted += 1;
      ignored += 1;
    } else {
      inserted += 1;
      processed += 1;
    }
  }

  return Object.freeze({
    eventCount: events.length,
    inserted,
    duplicates,
    processed,
    ignored,
  });
}
