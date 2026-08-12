/**
 * Runtime-branded VerifiedProviderEvent (IMP-022).
 *
 * Possession of a plain object / TypeScript cast cannot satisfy
 * {@link requireVerifiedProviderEvent}. Sealing is intentionally absent from
 * the public `src/server/payment` barrel — only webhook adapters / test
 * harnesses that already called `provider.verifyWebhook` may deep-import
 * {@link sealVerifiedProviderEvent}.
 */

import { PaymentError } from "../../shared/payment";
import type { NormalizedProviderEvidence } from "../../shared/payment";

const VERIFIED_PROVIDER_EVENT_BRAND = Symbol(
  "boba-bear.payment.VerifiedProviderEvent",
);

export type VerifiedProviderEvent = Readonly<{
  provider: string;
  rawBody: Uint8Array;
  headers: Readonly<Record<string, string>>;
  evidence: NormalizedProviderEvidence;
  readonly [VERIFIED_PROVIDER_EVENT_BRAND]: true;
}>;

export function sealVerifiedProviderEvent(input: {
  provider: string;
  rawBody: Uint8Array;
  headers: Readonly<Record<string, string>>;
  evidence: NormalizedProviderEvidence;
}): VerifiedProviderEvent {
  return Object.freeze({
    provider: input.provider,
    rawBody: input.rawBody,
    headers: Object.freeze({ ...input.headers }),
    evidence: input.evidence,
    [VERIFIED_PROVIDER_EVENT_BRAND]: true as const,
  });
}

export function isVerifiedProviderEvent(
  value: unknown,
): value is VerifiedProviderEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    VERIFIED_PROVIDER_EVENT_BRAND in value &&
    (value as VerifiedProviderEvent)[VERIFIED_PROVIDER_EVENT_BRAND] === true &&
    typeof (value as VerifiedProviderEvent).provider === "string" &&
    (value as VerifiedProviderEvent).rawBody instanceof Uint8Array &&
    typeof (value as VerifiedProviderEvent).evidence === "object" &&
    (value as VerifiedProviderEvent).evidence !== null
  );
}

export function requireVerifiedProviderEvent(
  value: unknown,
): VerifiedProviderEvent {
  if (!isVerifiedProviderEvent(value)) {
    throw new PaymentError(
      "PAYMENT_PROVIDER_EVIDENCE_INVALID",
      "A sealed VerifiedProviderEvent from provider webhook verification is required.",
    );
  }
  return value;
}
