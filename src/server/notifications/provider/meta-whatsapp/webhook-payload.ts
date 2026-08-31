/**
 * Parse Meta WhatsApp Cloud API webhook payloads into typed events (IMP-034).
 *
 * Status values: sent | delivered | read | failed.
 * object: whatsapp_business_account.
 */
import { truncateBodyPreview } from "./redact";

export const META_WHATSAPP_WEBHOOK_OBJECT = "whatsapp_business_account" as const;

export type MetaWhatsAppStatusValue = "sent" | "delivered" | "read" | "failed";

export type MetaWhatsAppStatusEvent = Readonly<{
  kind: "status";
  providerEventId: string;
  wabaId: string | null;
  providerMessageId: string;
  status: MetaWhatsAppStatusValue;
  recipientId: string | null;
  timestamp: string | null;
  errors: ReadonlyArray<Readonly<{ code: number | null; title: string | null }>>;
}>;

export type MetaWhatsAppInboundEvent = Readonly<{
  kind: "inbound";
  providerEventId: string;
  wabaId: string | null;
  providerMessageId: string;
  waFromE164: string | null;
  messageType: string | null;
  bodyPreview: string | null;
  timestamp: string | null;
}>;

export type MetaWhatsAppParsedEvent =
  | MetaWhatsAppStatusEvent
  | MetaWhatsAppInboundEvent;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function isStatusValue(value: string): value is MetaWhatsAppStatusValue {
  return (
    value === "sent" ||
    value === "delivered" ||
    value === "read" ||
    value === "failed"
  );
}

function extractBodyPreview(message: Record<string, unknown>): string | null {
  const type = asString(message.type);
  if (type === "text") {
    const text = asRecord(message.text);
    return truncateBodyPreview(asString(text?.body));
  }
  if (type === "button") {
    const button = asRecord(message.button);
    return truncateBodyPreview(asString(button?.text) ?? asString(button?.payload));
  }
  if (type === "interactive") {
    const interactive = asRecord(message.interactive);
    const buttonReply = asRecord(interactive?.button_reply);
    const listReply = asRecord(interactive?.list_reply);
    return truncateBodyPreview(
      asString(buttonReply?.title) ??
        asString(listReply?.title) ??
        asString(buttonReply?.id),
    );
  }
  return null;
}

/**
 * Parse a verified Meta webhook JSON body into normalized events.
 * Unknown shapes yield an empty list (caller may IGNORED the provider event).
 */
export function parseMetaWhatsAppWebhookPayload(
  payload: unknown,
): readonly MetaWhatsAppParsedEvent[] {
  const root = asRecord(payload);
  if (!root) return Object.freeze([]);
  if (root.object !== META_WHATSAPP_WEBHOOK_OBJECT) return Object.freeze([]);

  const entry = root.entry;
  if (!Array.isArray(entry)) return Object.freeze([]);

  const events: MetaWhatsAppParsedEvent[] = [];

  for (const entryItem of entry) {
    const entryRec = asRecord(entryItem);
    if (!entryRec) continue;
    const wabaId = asString(entryRec.id);
    const changes = entryRec.changes;
    if (!Array.isArray(changes)) continue;

    for (const change of changes) {
      const changeRec = asRecord(change);
      if (!changeRec) continue;
      const value = asRecord(changeRec.value);
      if (!value) continue;

      const statuses = value.statuses;
      if (Array.isArray(statuses)) {
        for (const statusItem of statuses) {
          const statusRec = asRecord(statusItem);
          if (!statusRec) continue;
          const providerMessageId = asString(statusRec.id);
          const statusRaw = asString(statusRec.status);
          if (!providerMessageId || !statusRaw || !isStatusValue(statusRaw)) continue;
          const errorsRaw = Array.isArray(statusRec.errors) ? statusRec.errors : [];
          const errors = errorsRaw.map((err) => {
            const errRec = asRecord(err);
            return Object.freeze({
              code: typeof errRec?.code === "number" ? errRec.code : null,
              title: asString(errRec?.title),
            });
          });
          events.push(
            Object.freeze({
              kind: "status",
              providerEventId: `status:${providerMessageId}:${statusRaw}:${asString(statusRec.timestamp) ?? "0"}`,
              wabaId,
              providerMessageId,
              status: statusRaw,
              recipientId: asString(statusRec.recipient_id),
              timestamp: asString(statusRec.timestamp),
              errors: Object.freeze(errors),
            }),
          );
        }
      }

      const messages = value.messages;
      if (Array.isArray(messages)) {
        for (const messageItem of messages) {
          const messageRec = asRecord(messageItem);
          if (!messageRec) continue;
          const providerMessageId = asString(messageRec.id);
          if (!providerMessageId) continue;
          events.push(
            Object.freeze({
              kind: "inbound",
              providerEventId: `inbound:${providerMessageId}`,
              wabaId,
              providerMessageId,
              waFromE164: asString(messageRec.from),
              messageType: asString(messageRec.type),
              bodyPreview: extractBodyPreview(messageRec),
              timestamp: asString(messageRec.timestamp),
            }),
          );
        }
      }
    }
  }

  return Object.freeze(events);
}
