/**
 * Notification send policy (IMP-033).
 *
 * Pure decisions over already-loaded consent, preference, and progress facts.
 * Every path either sends or suppresses with a recorded reason — there is no
 * "send anyway" fallback, and a missing consent record is never treated as
 * permission.
 */
import {
  semanticOrderRank,
  type NotificationChannel,
  type NotificationSemanticType,
} from "./constants";
import type {
  NotificationCommunicationPreference,
  NotificationConsent,
  NotificationPolicyDecision,
  NotificationQuietHours,
} from "./types";

const SEND: NotificationPolicyDecision = Object.freeze({ outcome: "SEND" as const });

/**
 * Consent gate.
 *
 * A transactional relationship is recorded as a GRANTED consent row by the
 * enqueue path, so an absent row means unproven consent and suppresses.
 */
export function evaluateConsent(
  consent: NotificationConsent | null,
): NotificationPolicyDecision {
  if (!consent) {
    return Object.freeze({
      outcome: "SUPPRESS" as const,
      reason: "CONSENT_MISSING" as const,
    });
  }
  if (consent.status === "WITHDRAWN") {
    return Object.freeze({
      outcome: "SUPPRESS" as const,
      reason: "CONSENT_WITHDRAWN" as const,
    });
  }
  if (consent.status === "SUPPRESSED") {
    return Object.freeze({
      outcome: "SUPPRESS" as const,
      reason: "CONSENT_SUPPRESSED" as const,
    });
  }
  return SEND;
}

/**
 * Channel preference gate. An absent preference row means the customer never
 * disabled the channel, which is a valid send for a transactional purpose —
 * unlike consent, absence here is not an unproven permission.
 */
export function evaluatePreference(
  preference: NotificationCommunicationPreference | null,
): NotificationPolicyDecision {
  if (preference && !preference.enabled) {
    return Object.freeze({
      outcome: "SUPPRESS" as const,
      reason: "CHANNEL_DISABLED" as const,
    });
  }
  return SEND;
}

/**
 * Stale-progress suppression: an outstanding notification is stale when a
 * strictly higher-ranked semantic type has already been dispatched for the
 * same Order, because sending it now would tell the customer their order
 * regressed.
 */
export function isStaleSemantic(
  semanticType: NotificationSemanticType,
  alreadyDispatchedSemanticTypes: readonly NotificationSemanticType[],
): boolean {
  const rank = semanticOrderRank(semanticType);
  return alreadyDispatchedSemanticTypes.some(
    (dispatched) => semanticOrderRank(dispatched) > rank,
  );
}

export function evaluateStaleness(
  semanticType: NotificationSemanticType,
  alreadyDispatchedSemanticTypes: readonly NotificationSemanticType[],
): NotificationPolicyDecision {
  if (isStaleSemantic(semanticType, alreadyDispatchedSemanticTypes)) {
    return Object.freeze({
      outcome: "SUPPRESS" as const,
      reason: "SUPERSEDED_BY_LATER_SEMANTIC" as const,
    });
  }
  return SEND;
}

export function shouldExpire(expiresAt: Date, now: Date): boolean {
  return now.getTime() >= expiresAt.getTime();
}

/** Quiet hours are stored as minute-of-day and may wrap past midnight. */
export function isWithinQuietHours(
  quietHours: NotificationQuietHours,
  now: Date,
): boolean {
  const minuteOfDay = now.getUTCHours() * 60 + now.getUTCMinutes();
  const { startMinuteOfDay: start, endMinuteOfDay: end } = quietHours;
  if (start === end) return false;
  return start < end
    ? minuteOfDay >= start && minuteOfDay < end
    : minuteOfDay >= start || minuteOfDay < end;
}

/**
 * Full pre-send gate. Order matters: an expired or superseded notification is
 * suppressed even when consent is granted.
 */
export function evaluateSendPolicy(
  input: Readonly<{
    semanticType: NotificationSemanticType;
    channel: NotificationChannel;
    consent: NotificationConsent | null;
    preference: NotificationCommunicationPreference | null;
    alreadyDispatchedSemanticTypes: readonly NotificationSemanticType[];
    expiresAt: Date;
    now: Date;
  }>,
): NotificationPolicyDecision {
  if (shouldExpire(input.expiresAt, input.now)) {
    return Object.freeze({
      outcome: "SUPPRESS" as const,
      reason: "EXPIRED_BEFORE_SEND" as const,
    });
  }

  const staleness = evaluateStaleness(
    input.semanticType,
    input.alreadyDispatchedSemanticTypes,
  );
  if (staleness.outcome === "SUPPRESS") return staleness;

  const consent = evaluateConsent(input.consent);
  if (consent.outcome === "SUPPRESS") return consent;

  return evaluatePreference(input.preference);
}
