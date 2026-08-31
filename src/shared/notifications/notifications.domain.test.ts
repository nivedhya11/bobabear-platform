/**
 * Pure Notification domain tests (IMP-033 consent / dedup / staleness /
 * retry classification / template variable safety).
 */
import { describe, expect, it } from "vitest";

import {
  computeNotificationDedupKey,
  evaluateConsent,
  evaluatePreference,
  evaluateSendPolicy,
  isExpiredForAge,
  isStaleSemantic,
  isWithinQuietHours,
  nextAttemptDelayMs,
  normalizeRetryCategory,
  NOTIFICATION_DEFAULT_MAX_ATTEMPTS,
  NOTIFICATION_EXTERNAL_SUCCESS_STATUSES,
  NOTIFICATION_SEMANTIC_TYPES,
  purposeForSemanticType,
  semanticOrderRank,
  shouldExpire,
  shouldRetry,
  shouldReview,
  validateTemplateVariables,
  type NotificationChannel,
  type NotificationCommunicationPreference,
  type NotificationConsent,
  type NotificationConsentStatus,
  type NotificationSemanticType,
} from "./index";

const CUSTOMER_ID = "3f0f2ff2-1c07-4f26-9c0b-6a6a1e2b4c11";

function consent(status: NotificationConsentStatus): NotificationConsent {
  const at = new Date("2026-08-31T10:00:00Z");
  return {
    id: "b1d2c3e4-0000-4000-8000-000000000001",
    customerId: CUSTOMER_ID,
    purpose: "ORDER_UPDATES",
    status,
    evidenceType: "TRANSACTIONAL_RELATIONSHIP",
    evidenceRef: null,
    grantedAt: status === "GRANTED" ? at : null,
    withdrawnAt: status === "WITHDRAWN" ? at : null,
    createdAt: at,
    updatedAt: at,
  };
}

function preference(
  channel: NotificationChannel,
  enabled: boolean,
): NotificationCommunicationPreference {
  const at = new Date("2026-08-31T10:00:00Z");
  return {
    id: "b1d2c3e4-0000-4000-8000-000000000002",
    customerId: CUSTOMER_ID,
    channel,
    enabled,
    quietHours: null,
    createdAt: at,
    updatedAt: at,
  };
}

describe("notification consent evaluation", () => {
  it("suppresses when no consent record exists", () => {
    // Absence is unproven consent, never an implicit grant.
    expect(evaluateConsent(null)).toEqual({
      outcome: "SUPPRESS",
      reason: "CONSENT_MISSING",
    });
  });

  it("sends only on GRANTED and records why it suppressed otherwise", () => {
    expect(evaluateConsent(consent("GRANTED"))).toEqual({ outcome: "SEND" });
    expect(evaluateConsent(consent("WITHDRAWN"))).toEqual({
      outcome: "SUPPRESS",
      reason: "CONSENT_WITHDRAWN",
    });
    expect(evaluateConsent(consent("SUPPRESSED"))).toEqual({
      outcome: "SUPPRESS",
      reason: "CONSENT_SUPPRESSED",
    });
  });

  it("treats a missing channel preference as not-disabled", () => {
    expect(evaluatePreference(null)).toEqual({ outcome: "SEND" });
    expect(evaluatePreference(preference("WHATSAPP", true))).toEqual({
      outcome: "SEND",
    });
    expect(evaluatePreference(preference("WHATSAPP", false))).toEqual({
      outcome: "SUPPRESS",
      reason: "CHANNEL_DISABLED",
    });
  });

  it("suppresses expiry, then staleness, then consent, then preference", () => {
    const now = new Date("2026-08-31T12:00:00Z");
    const base = {
      semanticType: "ORDER_ACCEPTED" as NotificationSemanticType,
      channel: "WHATSAPP" as NotificationChannel,
      consent: consent("GRANTED"),
      preference: preference("WHATSAPP", true),
      alreadyDispatchedSemanticTypes: [] as readonly NotificationSemanticType[],
      expiresAt: new Date("2026-09-01T12:00:00Z"),
      now,
    };

    expect(evaluateSendPolicy(base)).toEqual({ outcome: "SEND" });

    // Expiry outranks a granted consent.
    expect(
      evaluateSendPolicy({ ...base, expiresAt: new Date("2026-08-31T11:00:00Z") }),
    ).toEqual({ outcome: "SUPPRESS", reason: "EXPIRED_BEFORE_SEND" });

    // Staleness outranks a granted consent.
    expect(
      evaluateSendPolicy({
        ...base,
        alreadyDispatchedSemanticTypes: ["DELIVERED"],
      }),
    ).toEqual({ outcome: "SUPPRESS", reason: "SUPERSEDED_BY_LATER_SEMANTIC" });

    expect(
      evaluateSendPolicy({ ...base, consent: consent("WITHDRAWN") }),
    ).toEqual({ outcome: "SUPPRESS", reason: "CONSENT_WITHDRAWN" });

    expect(
      evaluateSendPolicy({ ...base, preference: preference("WHATSAPP", false) }),
    ).toEqual({ outcome: "SUPPRESS", reason: "CHANNEL_DISABLED" });
  });

  it("expires on and after the expiry instant", () => {
    const expiresAt = new Date("2026-08-31T12:00:00Z");
    expect(shouldExpire(expiresAt, new Date("2026-08-31T11:59:59Z"))).toBe(false);
    expect(shouldExpire(expiresAt, expiresAt)).toBe(true);
    expect(shouldExpire(expiresAt, new Date("2026-08-31T12:00:01Z"))).toBe(true);
  });

  it("evaluates quiet hours that wrap past midnight", () => {
    const overnight = { startMinuteOfDay: 22 * 60, endMinuteOfDay: 7 * 60 };
    expect(isWithinQuietHours(overnight, new Date("2026-08-31T23:30:00Z"))).toBe(true);
    expect(isWithinQuietHours(overnight, new Date("2026-08-31T03:00:00Z"))).toBe(true);
    expect(isWithinQuietHours(overnight, new Date("2026-08-31T12:00:00Z"))).toBe(false);
    // A zero-width window is never quiet.
    expect(
      isWithinQuietHours(
        { startMinuteOfDay: 600, endMinuteOfDay: 600 },
        new Date("2026-08-31T10:00:00Z"),
      ),
    ).toBe(false);
  });
});

describe("notification dedup key", () => {
  it("is the customer / semantic / domain-event / channel tuple", () => {
    expect(
      computeNotificationDedupKey({
        customerId: CUSTOMER_ID,
        semanticType: "ORDER_ACCEPTED",
        domainEventRef: "order:9f1:accepted:3",
        channel: "WHATSAPP",
      }),
    ).toBe(`${CUSTOMER_ID}|ORDER_ACCEPTED|order:9f1:accepted:3|WHATSAPP`);
  });

  it("is stable across recomputation and distinct per component", () => {
    const input = {
      customerId: CUSTOMER_ID,
      semanticType: "DELIVERED" as NotificationSemanticType,
      domainEventRef: "delivery:7c2:delivered",
      channel: "WHATSAPP" as NotificationChannel,
    };
    expect(computeNotificationDedupKey(input)).toBe(
      computeNotificationDedupKey(input),
    );
    expect(computeNotificationDedupKey({ ...input, channel: "SMS" })).not.toBe(
      computeNotificationDedupKey(input),
    );
    expect(
      computeNotificationDedupKey({ ...input, domainEventRef: "delivery:7c3:delivered" }),
    ).not.toBe(computeNotificationDedupKey(input));
  });

  it("rejects empty and separator-bearing components rather than producing an ambiguous key", () => {
    expect(() =>
      computeNotificationDedupKey({
        customerId: "   ",
        semanticType: "DELIVERED",
        domainEventRef: "delivery:7c2:delivered",
        channel: "WHATSAPP",
      }),
    ).toThrowError(/customerId/);

    expect(() =>
      computeNotificationDedupKey({
        customerId: CUSTOMER_ID,
        semanticType: "DELIVERED",
        domainEventRef: "delivery|7c2|delivered",
        channel: "WHATSAPP",
      }),
    ).toThrowError(/domainEventRef/);
  });

  it("rejects a domain event ref that would overflow the stored key", () => {
    expect(() =>
      computeNotificationDedupKey({
        customerId: CUSTOMER_ID,
        semanticType: "DELIVERED",
        domainEventRef: "d".repeat(600),
        channel: "WHATSAPP",
      }),
    ).toThrowError(/exceeds/);
  });
});

describe("notification semantic ordering", () => {
  it("ranks the customer journey and puts cancellation last", () => {
    expect(semanticOrderRank("ORDER_RECEIVED")).toBeLessThan(
      semanticOrderRank("PAYMENT_CONFIRMED"),
    );
    expect(semanticOrderRank("PAYMENT_CONFIRMED")).toBeLessThan(
      semanticOrderRank("ORDER_ACCEPTED"),
    );
    expect(semanticOrderRank("ORDER_ACCEPTED")).toBeLessThan(
      semanticOrderRank("OUT_FOR_DELIVERY"),
    );
    expect(semanticOrderRank("OUT_FOR_DELIVERY")).toBeLessThan(
      semanticOrderRank("DELIVERED"),
    );
    expect(semanticOrderRank("ORDER_CANCELLED")).toBeGreaterThan(
      semanticOrderRank("DELIVERED"),
    );
  });

  it("assigns every semantic type a rank and a consent purpose", () => {
    for (const semanticType of NOTIFICATION_SEMANTIC_TYPES) {
      expect(Number.isFinite(semanticOrderRank(semanticType))).toBe(true);
      expect(purposeForSemanticType(semanticType)).toBeDefined();
    }
    const ranks = NOTIFICATION_SEMANTIC_TYPES.map((t) => semanticOrderRank(t));
    expect(new Set(ranks).size).toBe(NOTIFICATION_SEMANTIC_TYPES.length);
  });

  it("marks a lower-ranked outstanding notification stale once a higher rank went out", () => {
    expect(isStaleSemantic("ORDER_ACCEPTED", ["DELIVERED"])).toBe(true);
    expect(isStaleSemantic("ORDER_ACCEPTED", ["OUT_FOR_DELIVERY"])).toBe(true);
    expect(isStaleSemantic("OUT_FOR_DELIVERY", ["ORDER_CANCELLED"])).toBe(true);
  });

  it("does not suppress an equal or leading semantic type", () => {
    expect(isStaleSemantic("DELIVERED", [])).toBe(false);
    // Same rank is a redelivery of the same step, handled by dedup, not staleness.
    expect(isStaleSemantic("ORDER_ACCEPTED", ["ORDER_ACCEPTED"])).toBe(false);
    expect(isStaleSemantic("DELIVERED", ["ORDER_RECEIVED", "ORDER_ACCEPTED"])).toBe(
      false,
    );
  });
});

describe("notification retry classification", () => {
  it("normalizes unknown, absent, and malformed categories to UNKNOWN", () => {
    expect(normalizeRetryCategory(undefined)).toBe("UNKNOWN");
    expect(normalizeRetryCategory(null)).toBe("UNKNOWN");
    expect(normalizeRetryCategory("")).toBe("UNKNOWN");
    expect(normalizeRetryCategory("provider_said_no")).toBe("UNKNOWN");
    expect(normalizeRetryCategory("  transient ")).toBe("TRANSIENT");
    expect(normalizeRetryCategory("rate_limited")).toBe("RATE_LIMITED");
  });

  it("retries only transient and rate-limited failures, within max attempts", () => {
    expect(shouldRetry({ failureCategory: "TRANSIENT", attemptCount: 1 })).toBe(true);
    expect(shouldRetry({ failureCategory: "RATE_LIMITED", attemptCount: 4 })).toBe(true);
    expect(
      shouldRetry({
        failureCategory: "TRANSIENT",
        attemptCount: NOTIFICATION_DEFAULT_MAX_ATTEMPTS,
      }),
    ).toBe(false);

    for (const category of [
      "AUTHENTICATION_FAILURE",
      "TEMPLATE_FAILURE",
      "RECIPIENT_UNAVAILABLE",
      "POLICY_REJECTED",
      "PERMANENT_FAILURE",
      "UNKNOWN",
    ] as const) {
      expect(shouldRetry({ failureCategory: category, attemptCount: 1 })).toBe(false);
    }
  });

  it("routes non-retryable operator-actionable failures to review", () => {
    expect(shouldReview({ failureCategory: "AUTHENTICATION_FAILURE", attemptCount: 1 })).toBe(
      "AUTHENTICATION_FAILURE",
    );
    expect(shouldReview({ failureCategory: "TEMPLATE_FAILURE", attemptCount: 1 })).toBe(
      "TEMPLATE_FAILURE",
    );
    expect(shouldReview({ failureCategory: "POLICY_REJECTED", attemptCount: 1 })).toBe(
      "POLICY_REJECTED",
    );
    expect(shouldReview({ failureCategory: "UNKNOWN", attemptCount: 1 })).toBe(
      "UNKNOWN_FAILURE",
    );
    // A permanent provider-absence failure is terminal, not an operator task.
    expect(shouldReview({ failureCategory: "PERMANENT_FAILURE", attemptCount: 1 })).toBeNull();
    expect(shouldReview({ failureCategory: "RECIPIENT_UNAVAILABLE", attemptCount: 1 })).toBeNull();
    // An exhausted retryable failure becomes reviewable.
    expect(shouldReview({ failureCategory: "TRANSIENT", attemptCount: 1 })).toBeNull();
    expect(
      shouldReview({
        failureCategory: "TRANSIENT",
        attemptCount: NOTIFICATION_DEFAULT_MAX_ATTEMPTS,
      }),
    ).toBe("RETRIES_EXHAUSTED");
  });

  it("backs off exponentially from the base delay and stops growing", () => {
    expect(nextAttemptDelayMs(1)).toBe(30_000);
    expect(nextAttemptDelayMs(2)).toBe(60_000);
    expect(nextAttemptDelayMs(3)).toBe(120_000);
    expect(nextAttemptDelayMs(0)).toBe(30_000);
    expect(nextAttemptDelayMs(50)).toBe(nextAttemptDelayMs(60));
    expect(nextAttemptDelayMs(50)).toBeLessThanOrEqual(2 * 60 * 60 * 1000);
  });

  it("expires a notification once it passes its max age", () => {
    const createdAt = new Date("2026-08-31T00:00:00Z");
    expect(isExpiredForAge(createdAt, new Date("2026-08-31T23:59:00Z"))).toBe(false);
    expect(isExpiredForAge(createdAt, new Date("2026-09-01T00:00:00Z"))).toBe(true);
  });
});

describe("notification template variables", () => {
  it("accepts customer-safe presentation values", () => {
    expect(
      validateTemplateVariables({ order_code: "BB-1042", eta_minutes: "35" }),
    ).toEqual({ order_code: "BB-1042", eta_minutes: "35" });
  });

  it("rejects variable names that would carry secrets or internal identity", () => {
    for (const name of [
      "otp_secret",
      "password",
      "access_token",
      "card_cvv",
      "upi_pin",
      "internal_ref",
    ]) {
      expect(() => validateTemplateVariables({ [name]: "value" })).toThrowError(
        /forbidden secret or internal material/,
      );
    }
  });

  it("rejects secret-shaped values regardless of variable name", () => {
    const secretValues = [
      "rzp_live_ABCDEFGH1234",
      "Bearer abcdefghijklmnop0123",
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dBjftJeZ4CVPmB92K27uhbUJU1p1r",
      "token=abc123def456",
      "a".repeat(0) + "0123456789abcdef0123456789abcdef",
    ];
    for (const value of secretValues) {
      expect(() => validateTemplateVariables({ note: value })).toThrowError(
        /secret-shaped material/,
      );
    }
  });

  it("rejects malformed names and oversized values", () => {
    expect(() => validateTemplateVariables({ "Order-Code": "BB-1" })).toThrowError(
      /valid identifier/,
    );
    expect(() => validateTemplateVariables({ note: "x".repeat(513) })).toThrowError(
      /exceeds/,
    );
  });

  it("enforces the template's declared variable schema in both directions", () => {
    expect(
      validateTemplateVariables({ order_code: "BB-1042" }, ["order_code"]),
    ).toEqual({ order_code: "BB-1042" });
    expect(() => validateTemplateVariables({}, ["order_code"])).toThrowError(
      /is required/,
    );
    expect(() =>
      validateTemplateVariables({ order_code: "BB-1042", extra: "x" }, ["order_code"]),
    ).toThrowError(/is not declared/);
  });
});

describe("notification external-success vocabulary", () => {
  it("names exactly the statuses that assert a provider or recipient fact", () => {
    expect([...NOTIFICATION_EXTERNAL_SUCCESS_STATUSES]).toEqual([
      "PROVIDER_ACCEPTED",
      "DELIVERED",
      "READ",
    ]);
  });
});
