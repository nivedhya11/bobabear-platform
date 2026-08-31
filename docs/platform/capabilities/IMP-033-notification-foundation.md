<!-- governance-meta
{
  "status": "DRAFT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-033",
  "title": "Notification Foundation",
  "architectureLock": "NOT_LOCKED",
  "implementation": "NOT_AUTHORIZED / NOT_STARTED",
  "implementationAuthorized": false,
  "lastReviewed": "2026-08-31",
  "bindingDecisions": ["ADR-012"],
  "dependsOn": ["IMP-007", "IMP-010", "IMP-023", "IMP-029", "IMP-030", "IMP-032"]
}
-->

# IMP-033 — Notification Foundation

## Capability Architecture (NOT_LOCKED — review candidate)

This document drafts the provider-neutral Notifications foundation for **IMP-033 — Notification
Foundation**. Architecture authority derives from accepted [ADR-012](../decisions/ADR-012-notifications-whatsapp-assisted-commerce.md)
and existing transactional-outbox / modular-monolith conventions. WhatsApp adapter implementation,
Meta production onboarding, inbound webhook routes, and conversation-console UI remain deferred to
**IMP-034 — Meta WhatsApp Cloud API Adapter** and later slices.

Architecture is **not** locked. Implementation is **not** authorized or started.

| Field | Value |
|---|---|
| Architecture lock | `NOT_LOCKED` |
| Lifecycle | `ARCHITECTURE_IN_PROGRESS` |
| Implementation | `NOT_AUTHORIZED` / `NOT_STARTED` |
| Implementation authorized | **NO** |
| Accepted product through | IMP-032 |
| Current product slice | IMP-033 |
| Pending acceptance | NONE |
| Next product slice | IMP-034 — Meta WhatsApp Cloud API Adapter |
| New CURRENT decision | **NONE** (`D-373` absent) |
| Global architecture revision | **NONE** (`ARCH-R18` remains current; no ARCH-R19 at draft) |

```text
IMP-033: ARCHITECTURE_IN_PROGRESS
IMP-033_ARCHITECTURE: NOT_LOCKED
IMP-033_ARCHITECTURE_LOCKED: NO
IMP-033_IMPLEMENTATION: NOT_AUTHORIZED / NOT_STARTED
IMP-033_IMPLEMENTATION_AUTHORIZED: NO
IMP-033_STARTED: NO
IMP-033_IMPLEMENTATION_COMPLETE: NO
IMP-033_ACCEPTED: NO
D373_REQUIRED_FOR_LOCK: NO
ARCH_R19_REQUIRED: NO
schema_change: DEFERRED_TO_IMPLEMENTATION
new_service: NO
```

## 1. Purpose

IMP-033 establishes a **provider-neutral Notifications module** reached only through the accepted
transactional outbox (IMP-007). Domain modules (Orders, Payments, Operations, Delivery, Identity)
emit committed domain events; Notifications decides whether, how, and through which channel to
communicate — without becoming an alternate source of truth for order, payment, delivery, refund, or
identity state.

V1 primary transactional channel intent is WhatsApp (`WHATSAPP`), with `IN_APP` PWA tracking as the
authoritative fallback per ADR-010. Concrete WhatsApp Cloud API adapter code, webhook ingestion, and
Meta production approval remain **IMP-034** scope.

## 2. Preserved authorities

| Authority | Preservation |
|---|---|
| ADR-012 | Notifications-module boundary, consent-purpose model, template registry, notification/message-attempt lifecycles, deduplication/ordering, retry categories, assisted-commerce boundary |
| ADR-010 | Order lifecycle, cancellation-request/decision separation, customer-visible tracking projection |
| ADR-009 / ADR-011 | Durable provider-event record, webhook idempotency patterns reused for notification provider events |
| IMP-007 | Transactional outbox; notification work never rolls back domain transitions |
| IMP-032 | Manual Dehradun delivery operating mode; staff URL sharing is operational, not platform notification integration |

## 3. Module boundary

The Notifications module owns:

```text
Channel-adapter interfaces (WHATSAPP, EMAIL, SMS, IN_APP, PUSH)
Notification requests
Message attempts
Consent records (purpose-specific)
Communication preferences
Template registry (provider-neutral)
Deduplication and ordering state
Notification retry and expiry state
Durable outbound/inbound provider-event records (Notifications-owned tables)
```

It does **not** own order, payment, delivery, refund, or identity domain state; cancellation
decision authority; customer profile/addresses; or workforce authorization (reads scoped permissions
via Access Control).

## 4. Supported channels (V1 intent)

| Channel | V1 role |
|---|---|
| `WHATSAPP` | Primary transactional channel intent; adapter deferred to IMP-034 |
| `IN_APP` | Authoritative PWA tracking fallback when WhatsApp delivery fails or is suppressed |
| `EMAIL` | Supplementary; not primary V1 transactional channel |
| `SMS` | Reserved primarily for authentication OTP (ADR-004); not primary order notifications |
| `PUSH` | Not implemented in V1 |

## 5. Transactional-outbox flow

```text
Domain transaction commits (state + outbox event)
        ↓
Background worker consumes committed outbox event (at-least-once; idempotent consumer)
        ↓
Notifications module creates notification request
        ↓
Consent, preference, deduplication, staleness policy evaluated
        ↓
Template and locale resolved
        ↓
Channel adapter invoked (provider-neutral port)
        ↓
Message attempt recorded
```

Notification failure must **never** roll back, retry, or mutate the originating domain transaction.

## 6. Consent-purpose model

Purposes (per ADR-012):

```text
ORDER_UPDATES
DELIVERY_UPDATES
SUPPORT_MESSAGES
MARKETING_MESSAGES
AUTHENTICATION_MESSAGES
```

Marketing consent is structurally separate from transactional consent and never inferred from order
placement. `MARKETING_MESSAGES` V1 delivery remains deferred beyond this foundation slice.

## 7. Notification request and lifecycle

Notification requests are durable, deduplicated records separate from provider message attempts.

Lifecycle states (conceptual):

```text
PENDING → SCHEDULED → SENDING → PROVIDER_ACCEPTED → DELIVERED → READ
                 ↘ SUPPRESSED / EXPIRED / CANCELLED / FAILED / REVIEW_REQUIRED
```

Deduplication key: customer + semantic notification type + stable domain-event reference + channel.

Semantic ordering: later notifications supersede stale intermediate ones for the same order (e.g.
"delivered" suppresses queued "out for delivery").

## 8. Message attempts

Separate from notification requests; one request may have multiple attempts (retries). Failed
attempt does not automatically fail the whole request while retry remains eligible.

Retry categories (normalized): `TRANSIENT`, `RATE_LIMITED`, `AUTHENTICATION_FAILURE`,
`TEMPLATE_FAILURE`, `RECIPIENT_UNAVAILABLE`, `POLICY_REJECTED`, `PERMANENT_FAILURE`, `UNKNOWN`.

Exact retry counts and intervals remain **open** until implementation lock.

## 9. Template registry

Provider-neutral registry chain:

```text
Semantic notification type (e.g. ORDER_ACCEPTED)
        ↓
Internal template key + locale + version
        ↓
Channel/provider-specific template reference (resolved at send time)
```

Template lifecycle: `DRAFT` → `SUBMITTED` → `APPROVED` → (`REJECTED` | `PAUSED` | `DISABLED` | `RETIRED`).

Only `APPROVED` non-paused templates may send. Variable validation forbids secrets and internal IDs.

## 10. Channel fallback (V1)

**No automatic WhatsApp-to-SMS/email fallback matrix in V1.** Guaranteed channel of record for
failed WhatsApp delivery is authoritative `IN_APP` PWA tracking (ADR-010).

## 11. Explicit deferrals (not decided in this draft)

| Item | Deferred to |
|---|---|
| Meta WhatsApp Cloud API adapter, webhooks, credentials | IMP-034 |
| BSP vs direct Meta integration | IMP-034 / launch validation |
| Exact V1 transactional template set and wording | Implementation / Meta approval |
| Exact retry counts, intervals, max notification age | Implementation lock |
| Inbound-message classification, conversation threads, human escalation UI | IMP-034+ |
| Marketing automation | Future slice |
| New deployable service / queue topology | **NO** — modular monolith + existing outbox worker pattern |
| ARCH-R19 global revision | Not required for architecture draft; evaluate at lock |

## 12. Implementation boundary (proposed — not authorized)

When authorized, IMP-033 implementation is expected to deliver:

1. Notifications-owned PostgreSQL schema (notification requests, message attempts, consent,
   template registry, provider events) per ADR-013 conventions.
2. Outbox consumer wiring for initial order/payment/delivery transactional triggers (minimal V1 set).
3. Provider-neutral channel-adapter ports with stub/no-op adapters except where IMP-034 supplies
   WhatsApp.
4. Consent evaluation, deduplication, semantic-ordering, and safe suppression logic.
5. Workforce permission hooks for manual resend (distinct permission; no bypass of consent/dedup).
6. Tests: unit coverage for consent, dedup, ordering, retry normalization; integration for
   exactly-once notification request creation from duplicate outbox delivery.

Does **not** include: Meta onboarding, production WhatsApp sends, inbound webhook routes, marketing
campaigns, conversation console UI, or cross-channel fallback automation.

## 13. Architecture-lock prerequisites (future)

Before lock:

- Review against ADR-012 explicit non-decisions list.
- Confirm IMP-034 boundary does not overlap provider-neutral foundation.
- Confirm no new CURRENT decision is required beyond ADR-012 binding intent.
- Persist ARCH-R19 only if global architecture substance changes (not anticipated at draft).
