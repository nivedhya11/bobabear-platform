/**
 * Replayable inbox evidence serialization (IMP-026A / D-363 / IMP-027).
 *
 * Stores verified normalized provider evidence only — no secrets.
 * Discriminates payment vs refund families without delaying ack.
 */
import type { NormalizedProviderEvidence } from "../../../shared/payment";
import type { NormalizedRefundEvidence } from "../../../shared/refund";
import type { PaymentProviderWebhookEvidence } from "../provider/types";

export type InboxEvidence = PaymentProviderWebhookEvidence;

export function isRefundInboxEvidence(
  evidence: InboxEvidence,
): evidence is NormalizedRefundEvidence {
  return "family" in evidence && evidence.family === "refund";
}

export function serializeInboxEvidence(evidence: InboxEvidence): string {
  return JSON.stringify(evidence, (_key, value) =>
    typeof value === "bigint" ? value.toString(10) : value,
  );
}

export function deserializeInboxEvidence(raw: string): InboxEvidence {
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  if (parsed.family === "refund") {
    const amount = parsed.observedAmountPaise;
    return Object.freeze({
      family: "refund",
      outcome: parsed.outcome as NormalizedRefundEvidence["outcome"],
      provider: String(parsed.provider ?? ""),
      providerRefundId:
        parsed.providerRefundId === null || parsed.providerRefundId === undefined
          ? null
          : String(parsed.providerRefundId),
      providerPaymentId:
        parsed.providerPaymentId === null || parsed.providerPaymentId === undefined
          ? null
          : String(parsed.providerPaymentId),
      observedAmountPaise:
        amount === null || amount === undefined ? null : BigInt(String(amount)),
      observedCurrency:
        parsed.observedCurrency === null || parsed.observedCurrency === undefined
          ? null
          : String(parsed.observedCurrency),
      providerStatusCode:
        parsed.providerStatusCode === null || parsed.providerStatusCode === undefined
          ? null
          : String(parsed.providerStatusCode),
      providerTimestamp: parsed.providerTimestamp
        ? new Date(String(parsed.providerTimestamp))
        : null,
      providerEventId:
        parsed.providerEventId === null || parsed.providerEventId === undefined
          ? null
          : String(parsed.providerEventId),
      payloadDigest:
        parsed.payloadDigest === null || parsed.payloadDigest === undefined
          ? null
          : String(parsed.payloadDigest),
      ...(typeof parsed.anomalyCode === "string" ? { anomalyCode: parsed.anomalyCode } : {}),
      ...(Array.isArray(parsed.references)
        ? {
            references: Object.freeze(
              (parsed.references as Array<{ kind: string; value: string }>).map((ref) =>
                Object.freeze({ kind: String(ref.kind), value: String(ref.value) }),
              ),
            ),
          }
        : {}),
    });
  }

  const amount = parsed.observedAmountPaise;
  return Object.freeze({
    outcome: parsed.outcome as NormalizedProviderEvidence["outcome"],
    provider: String(parsed.provider ?? ""),
    providerExecutionIdentity: String(parsed.providerExecutionIdentity ?? ""),
    observedAmountPaise:
      amount === null || amount === undefined ? null : BigInt(String(amount)),
    observedCurrency:
      parsed.observedCurrency === null || parsed.observedCurrency === undefined
        ? null
        : String(parsed.observedCurrency),
    providerStatusCode:
      parsed.providerStatusCode === null || parsed.providerStatusCode === undefined
        ? null
        : String(parsed.providerStatusCode),
    providerTimestamp: parsed.providerTimestamp
      ? new Date(String(parsed.providerTimestamp))
      : null,
    providerEventId:
      parsed.providerEventId === null || parsed.providerEventId === undefined
        ? null
        : String(parsed.providerEventId),
    payloadDigest:
      parsed.payloadDigest === null || parsed.payloadDigest === undefined
        ? null
        : String(parsed.payloadDigest),
    ...(Array.isArray(parsed.references)
      ? {
          references: Object.freeze(
            (parsed.references as Array<{ kind: string; value: string }>).map((ref) =>
              Object.freeze({ kind: String(ref.kind), value: String(ref.value) }),
            ),
          ),
        }
      : {}),
    ...(typeof parsed.anomalyCode === "string" ? { anomalyCode: parsed.anomalyCode } : {}),
    ...(parsed.clientAction && typeof parsed.clientAction === "object"
      ? {
          clientAction: Object.freeze({
            kind: String((parsed.clientAction as { kind: string }).kind),
            payload: Object.freeze({
              ...((parsed.clientAction as { payload: Record<string, string> }).payload ?? {}),
            }),
          }),
        }
      : {}),
  });
}

export function sanitizeInboxErrorMessage(message: string): string {
  const trimmed = message.replace(/\s+/g, " ").trim().slice(0, 240);
  return trimmed
    .replace(/key_secret/gi, "[redacted]")
    .replace(/webhook_secret/gi, "[redacted]")
    .replace(/rzp_live_[A-Za-z0-9]+/g, "[redacted]")
    .replace(/rzp_test_[A-Za-z0-9]+/g, "[redacted]");
}
