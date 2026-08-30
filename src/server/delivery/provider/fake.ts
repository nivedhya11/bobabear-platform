/**
 * Controllable in-memory fake Delivery provider for tests (IMP-031).
 *
 * Never a real courier SDK. Used to prove booking safety and recovery.
 */

import { DELIVERY_FAKE_PROVIDER, type NormalizedDeliveryBookingEvidence } from "../../../shared/delivery";
import type {
  DeliveryProvider,
  DeliveryProviderCancelBookingInput,
  DeliveryProviderCreateBookingInput,
  DeliveryProviderQueryBookingInput,
} from "./types";

export type FakeDeliveryBookingOutcome =
  | "booked"
  | "failed"
  | "cancelled"
  | "ambiguous";

type StoredBooking = Readonly<{
  bookingCorrelationId: string;
  deliveryId: string;
  orderId: string;
  requestFingerprint: string;
  outcome: FakeDeliveryBookingOutcome;
  externalBookingReference: string | null;
}>;

export type FakeDeliveryProvider = DeliveryProvider &
  Readonly<{
    setDefaultOutcome(outcome: FakeDeliveryBookingOutcome): void;
    setOutcome(
      bookingCorrelationId: string,
      outcome: FakeDeliveryBookingOutcome,
    ): void;
    setCreateBookingHook(
      hook:
        | ((input: DeliveryProviderCreateBookingInput) => Promise<void> | void)
        | null,
    ): void;
    setQueryBookingHook(
      hook:
        | ((input: DeliveryProviderQueryBookingInput) => Promise<void> | void)
        | null,
    ): void;
    setCancelBookingHook(
      hook:
        | ((input: DeliveryProviderCancelBookingInput) => Promise<void> | void)
        | null,
    ): void;
    getBooking(bookingCorrelationId: string): StoredBooking | null;
    clear(): void;
    readonly createBookingCallCount: number;
    readonly queryBookingCallCount: number;
    readonly cancelBookingCallCount: number;
  }>;

function evidenceFor(stored: StoredBooking): NormalizedDeliveryBookingEvidence {
  const outcome =
    stored.outcome === "booked"
      ? "BOOKED"
      : stored.outcome === "failed"
        ? "FAILED"
        : stored.outcome === "cancelled"
          ? "CANCELLED"
          : "AMBIGUOUS";
  return Object.freeze({
    outcome,
    provider: DELIVERY_FAKE_PROVIDER,
    bookingCorrelationId: stored.bookingCorrelationId,
    externalBookingReference: stored.externalBookingReference,
    providerStatusCode: stored.outcome,
    providerTimestamp: new Date(),
    failureCode: stored.outcome === "failed" ? "FAKE_BOOKING_FAILED" : null,
    failureReason:
      stored.outcome === "failed" ? "Fake booking failed." : null,
    references:
      stored.externalBookingReference !== null
        ? Object.freeze([
            Object.freeze({
              kind: "external_booking_reference",
              value: stored.externalBookingReference,
            }),
          ])
        : undefined,
  });
}

export function createFakeDeliveryProvider(options?: {
  defaultOutcome?: FakeDeliveryBookingOutcome;
}): FakeDeliveryProvider {
  const bookings = new Map<string, StoredBooking>();
  let defaultOutcome: FakeDeliveryBookingOutcome =
    options?.defaultOutcome ?? "booked";
  let createBookingCallCount = 0;
  let queryBookingCallCount = 0;
  let cancelBookingCallCount = 0;
  let createBookingHook:
    | ((input: DeliveryProviderCreateBookingInput) => Promise<void> | void)
    | null = null;
  let queryBookingHook:
    | ((input: DeliveryProviderQueryBookingInput) => Promise<void> | void)
    | null = null;
  let cancelBookingHook:
    | ((input: DeliveryProviderCancelBookingInput) => Promise<void> | void)
    | null = null;
  let bookingSeq = 1;

  const provider: FakeDeliveryProvider = {
    name: DELIVERY_FAKE_PROVIDER,

    get createBookingCallCount(): number {
      return createBookingCallCount;
    },
    get queryBookingCallCount(): number {
      return queryBookingCallCount;
    },
    get cancelBookingCallCount(): number {
      return cancelBookingCallCount;
    },

    setDefaultOutcome(outcome: FakeDeliveryBookingOutcome): void {
      defaultOutcome = outcome;
    },

    setOutcome(
      bookingCorrelationId: string,
      outcome: FakeDeliveryBookingOutcome,
    ): void {
      const existing = bookings.get(bookingCorrelationId);
      if (!existing) return;
      bookings.set(
        bookingCorrelationId,
        Object.freeze({ ...existing, outcome }),
      );
    },

    setCreateBookingHook(
      hook:
        | ((input: DeliveryProviderCreateBookingInput) => Promise<void> | void)
        | null,
    ): void {
      createBookingHook = hook;
    },

    setQueryBookingHook(
      hook:
        | ((input: DeliveryProviderQueryBookingInput) => Promise<void> | void)
        | null,
    ): void {
      queryBookingHook = hook;
    },

    setCancelBookingHook(
      hook:
        | ((input: DeliveryProviderCancelBookingInput) => Promise<void> | void)
        | null,
    ): void {
      cancelBookingHook = hook;
    },

    getBooking(bookingCorrelationId: string): StoredBooking | null {
      return bookings.get(bookingCorrelationId) ?? null;
    },

    clear(): void {
      bookings.clear();
      createBookingCallCount = 0;
      queryBookingCallCount = 0;
      cancelBookingCallCount = 0;
      createBookingHook = null;
      queryBookingHook = null;
      cancelBookingHook = null;
    },

    async createBooking(
      input: DeliveryProviderCreateBookingInput,
    ): Promise<NormalizedDeliveryBookingEvidence> {
      createBookingCallCount += 1;
      if (createBookingHook) {
        await createBookingHook(input);
      }
      const existing = bookings.get(input.bookingCorrelationId);
      if (existing) {
        return evidenceFor(existing);
      }
      const stored: StoredBooking = Object.freeze({
        bookingCorrelationId: input.bookingCorrelationId,
        deliveryId: input.deliveryId,
        orderId: input.orderId,
        requestFingerprint: input.requestFingerprint,
        outcome: defaultOutcome,
        externalBookingReference:
          defaultOutcome === "booked" || defaultOutcome === "ambiguous"
            ? `fake_booking_${String(bookingSeq++).padStart(4, "0")}`
            : null,
      });
      bookings.set(input.bookingCorrelationId, stored);
      return evidenceFor(stored);
    },

    async queryBooking(
      input: DeliveryProviderQueryBookingInput,
    ): Promise<NormalizedDeliveryBookingEvidence> {
      queryBookingCallCount += 1;
      if (queryBookingHook) {
        await queryBookingHook(input);
      }
      if (input.provider !== DELIVERY_FAKE_PROVIDER) {
        return Object.freeze({
          outcome: "AMBIGUOUS",
          provider: input.provider,
          bookingCorrelationId: input.bookingCorrelationId,
          externalBookingReference: input.externalBookingReference ?? null,
          providerStatusCode: "UNSUPPORTED",
          providerTimestamp: new Date(),
        });
      }
      const stored = bookings.get(input.bookingCorrelationId);
      if (!stored) {
        return Object.freeze({
          outcome: "FAILED",
          provider: DELIVERY_FAKE_PROVIDER,
          bookingCorrelationId: input.bookingCorrelationId,
          externalBookingReference: null,
          providerStatusCode: "NOT_FOUND",
          providerTimestamp: new Date(),
          failureCode: "BOOKING_NOT_FOUND",
          failureReason: "No booking found for correlation identity.",
        });
      }
      return evidenceFor(stored);
    },

    async cancelBooking(
      input: DeliveryProviderCancelBookingInput,
    ): Promise<NormalizedDeliveryBookingEvidence> {
      cancelBookingCallCount += 1;
      const existing = bookings.get(input.bookingCorrelationId);
      if (!existing) {
        if (cancelBookingHook) {
          await cancelBookingHook(input);
        }
        const afterHook = bookings.get(input.bookingCorrelationId);
        if (afterHook) {
          return evidenceFor(afterHook);
        }
        return Object.freeze({
          outcome: "CANCELLED" as const,
          provider: DELIVERY_FAKE_PROVIDER,
          bookingCorrelationId: input.bookingCorrelationId,
          externalBookingReference: input.externalBookingReference ?? null,
          providerStatusCode: "NOT_FOUND",
          providerTimestamp: new Date(),
        });
      }
      const cancelled: StoredBooking = Object.freeze({
        ...existing,
        outcome: "cancelled",
      });
      bookings.set(input.bookingCorrelationId, cancelled);
      // External effect is durable before the hook so response-loss tests can
      // prove retry recovery via queryBooking. Hooks may further mutate the
      // stored outcome (e.g. force AMBIGUOUS) before the response is observed.
      if (cancelBookingHook) {
        await cancelBookingHook(input);
      }
      const final = bookings.get(input.bookingCorrelationId) ?? cancelled;
      return evidenceFor(final);
    },
  };

  return Object.freeze(provider);
}
