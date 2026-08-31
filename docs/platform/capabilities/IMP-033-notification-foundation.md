<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-033",
  "title": "Notification Foundation",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "COMPLETE_AND_ACCEPTED",
  "implementationAuthorized": true,
  "lastReviewed": "2026-08-31",
  "bindingDecisions": ["ADR-012"],
  "dependsOn": ["IMP-007", "IMP-010", "IMP-023", "IMP-029", "IMP-030", "IMP-032"]
}
-->

# IMP-033 — Notification Foundation

## Capability Architecture (ARCHITECTURE_LOCKED — COMPLETE_AND_ACCEPTED)

This document is the locked capability architecture for **IMP-033 — Notification Foundation**.
Architecture authority derives from accepted [ADR-012](../decisions/ADR-012-notifications-whatsapp-assisted-commerce.md)
and existing transactional-outbox / modular-monolith conventions. Architecture is **LOCKED**.
Implementation is **AUTHORIZED**, **STARTED**, **COMPLETE**, and formally **COMPLETE_AND_ACCEPTED**.

Formal acceptance does not expand the locked boundary, authorize or start IMP-034, select a WhatsApp
BSP, perform Meta production onboarding, add provider webhook routes, or create `D-373`.

WhatsApp adapter implementation, Meta production onboarding, inbound webhook routes, and
conversation-console UI remain deferred to **IMP-034 — Meta WhatsApp Cloud API Adapter** and later
slices.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Lifecycle | `COMPLETE_AND_ACCEPTED` |
| Implementation | `AUTHORIZED` / `STARTED` / `COMPLETE` |
| Implementation authorized | **YES** |
| Implementation complete | **YES** |
| Accepted | **YES** |
| Accepted product through | IMP-033 |
| Current product slice | NONE |
| Pending acceptance | NONE |
| Next product slice | IMP-034 — Meta WhatsApp Cloud API Adapter |
| Governance checkpoint | GTM-R89 / STATE-R87 |
| New CURRENT decision | **NONE** (`D-373` absent) |
| Global architecture revision | **NONE** (`ARCH-R18` remains current; no ARCH-R19) |
| Decision register | **DR-14** unchanged |
| Founder UAT required for acceptance | **NO** |

```text
IMP-033: COMPLETE_AND_ACCEPTED
IMP-033_ARCHITECTURE: LOCKED
IMP-033_ARCHITECTURE_LOCKED: YES
IMP-033_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-033_IMPLEMENTATION_AUTHORIZED: YES
IMP-033_STARTED: YES
IMP-033_IMPLEMENTATION_COMPLETE: YES
IMP-033_ACCEPTED: YES
FOUNDER_UAT_REQUIRED: NO
FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE: NO
D373_REQUIRED_FOR_LOCK: NO
ARCH_R19_REQUIRED: NO
schema_change: YES
provider_IO: NO
new_service: NO
async_topology: POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER
```

## 1. Purpose

IMP-033 establishes a **provider-neutral Notifications module** reached only through the accepted
transactional outbox (IMP-007). Domain modules (Orders, Payments, Operations, Delivery, Identity)
emit committed domain events; Notifications decides whether, how, and through which channel to
communicate — without becoming an alternate source of truth for order, payment, delivery, refund, or
identity state.

V1 primary transactional channel intent is WhatsApp (`WHATSAPP`), with `IN_APP` PWA tracking as the
authoritative fallback per ADR-010. Concrete WhatsApp Cloud API adapter code, webhook ingestion, and
Meta production approval remain **IMP-034** scope. This slice ships the ports, the domain, the
persistence, the consent/dedup/ordering policy, the retry normalization, the template registry, and
the in-process outbox processor — and nothing that talks to an external messaging provider.

## 2. Preserved authorities

| Authority | Preservation |
|---|---|
| ADR-012 | Notifications-module boundary, consent-purpose model, template registry, notification/message-attempt lifecycles, deduplication/ordering, retry categories, assisted-commerce boundary |
| ADR-010 | Order lifecycle, cancellation-request/decision separation, customer-visible tracking projection |
| ADR-009 / ADR-011 | Durable provider-event record, webhook idempotency patterns reused for notification provider events |
| IMP-007 | Transactional outbox; notification work never rolls back domain transitions |
| IMP-010 / IMP-011 | Workforce authentication and scoped RBAC remain the only authorization authority for operator-initiated notification actions |
| IMP-023 | Order remains sole Order-state authority; Notifications only reads committed facts |
| IMP-029 / IMP-030 | Operations API/UI contracts remain unchanged by this foundation |
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

Locked module placement:

```text
src/shared/notifications/       provider-neutral domain: types, policy, dedup, retry, templates
src/server/notifications/       repository, operations, channel ports, outbox processor, authorize
src/platform/database/schema/   Notifications-owned tables only
```

## 4. Supported channels (V1)

| Channel | V1 role |
|---|---|
| `WHATSAPP` | Primary transactional channel intent; **non-sending** in IMP-033; real adapter is IMP-034 |
| `IN_APP` | Authoritative PWA tracking fallback when WhatsApp delivery fails or is suppressed |
| `EMAIL` | Supplementary; not primary V1 transactional channel; non-sending in IMP-033 |
| `SMS` | Reserved primarily for authentication OTP (ADR-004); non-sending in IMP-033 |
| `PUSH` | Not implemented in V1; non-sending in IMP-033 |

Every channel resolves through the same provider-neutral adapter port. IMP-034 registers a real
WhatsApp adapter behind that port without changing the port.

## 5. Transactional-outbox flow

```text
Domain transaction commits (state + outbox event)
        ↓
In-process notification outbox processor claims committed event
(at-least-once; idempotent consumer; FOR UPDATE SKIP LOCKED)
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

### 5.1 Locked async topology

```text
async_topology: POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER
```

The only asynchronous mechanism is the existing PostgreSQL transactional outbox
(`app.outbox_events`) drained by an in-process worker following existing modular-monolith worker
conventions. `NotificationOutboxProcessor` is hosted inside the existing customer-commerce and
operations services exactly as `PaymentInboxProcessor` is hosted today.

Explicitly **forbidden** by this lock:

- Redis, Kafka, RabbitMQ, SQS, or any external broker/queue
- a new deployable service, container, or Docker Compose service
- cron/external scheduler as notification authority
- direct synchronous provider calls inside a domain transaction

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

Consent evaluation is fail-closed: absent, withdrawn, or expired consent suppresses the notification
rather than sending it.

## 7. Notification request and lifecycle

Notification requests are durable, deduplicated records separate from provider message attempts.

Lifecycle states:

```text
PENDING → SCHEDULED → SENDING → PROVIDER_ACCEPTED → DELIVERED → READ
                 ↘ SUPPRESSED / EXPIRED / CANCELLED / FAILED / REVIEW_REQUIRED
```

Deduplication key: customer + semantic notification type + stable domain-event reference + channel.
The key is enforced by a database UNIQUE index, so duplicate at-least-once outbox delivery converges
on one request rather than one request per delivery.

Semantic ordering: later notifications supersede stale intermediate ones for the same order (e.g.
"delivered" suppresses queued "out for delivery").

`PROVIDER_ACCEPTED`, `DELIVERED`, and `READ` are **provider-reported** states. IMP-033 performs no
provider I/O, so IMP-033 code must never assert them. See §14.2.

## 8. Message attempts

Separate from notification requests; one request may have multiple attempts (retries). A failed
attempt does not automatically fail the whole request while retry remains eligible.

Retry categories (normalized): `TRANSIENT`, `RATE_LIMITED`, `AUTHENTICATION_FAILURE`,
`TEMPLATE_FAILURE`, `RECIPIENT_UNAVAILABLE`, `POLICY_REJECTED`, `PERMANENT_FAILURE`, `UNKNOWN`.

Retry classification is provider-neutral: an adapter reports a normalized failure category, and the
foundation — not the adapter — decides eligibility, bounded attempt count, and backoff.

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

**No automatic WhatsApp-to-SMS/email fallback matrix in V1.** The guaranteed channel of record for
failed WhatsApp delivery is authoritative `IN_APP` PWA tracking (ADR-010).

## 11. Operator resend authorization

Manual resend is authorized by a single new permission on an existing role. No new role is created.

```text
permission: notification.resend
target kind: outlet
role: support_refund_operator
also effective for: platform_super_admin (all-permissions role)
```

Resend reuses the same consent, deduplication, template-approval, and semantic-ordering rules as
automatic notification. Resend must not bypass suppression, and must not fabricate provider outcomes.

## 12. Persistence boundary

```text
schema_change: YES
scope: Notifications-owned tables and migrations only
```

Permitted: new Notifications-owned tables plus a data-only access-control seed for the single
`notification.resend` permission key and its repository-approved role mapping.

Forbidden: any DDL against Order, Payment, Refund, Delivery, Financial Document, Cart, Checkout,
Catalog, or Identity tables; any change to existing accepted domain columns or constraints.

Notifications-owned tables:

```text
notification_requests
notification_message_attempts
notification_consents
notification_communication_preferences
notification_templates
notification_provider_events
```

## 13. Explicit deferrals

| Item | Deferred to |
|---|---|
| Meta WhatsApp Cloud API adapter, webhooks, credentials | IMP-034 |
| BSP vs direct Meta integration | IMP-034 / launch validation |
| Exact V1 transactional template wording and Meta template approval | IMP-034 / Meta approval |
| Inbound-message classification, conversation threads, human escalation UI | IMP-034+ |
| Marketing automation | Future slice |
| Cross-channel fallback automation | Not planned for V1 |
| New deployable service / broker / queue topology | **NO** — modular monolith + existing outbox worker pattern |
| ARCH-R19 global revision | **NOT REQUIRED** — no global architecture substance change |
| `D-373` | **NOT CREATED** — ADR-012 binding intent is sufficient |

## 14. Clarifications locked at this gate

These clarifications are part of the lock. They constrain both this slice and any acceptance review
of it.

### 14.1 schema_change = YES, bounded to Notifications

`schema_change: YES`. This slice creates Notifications-owned tables and migrations. It must not
introduce unrelated schema change. No accepted domain table is altered.

### 14.2 provider_IO = NO

`provider_IO: NO`. IMP-033 contains **no** Meta/WhatsApp provider I/O of any kind. Channel adapters
are ports and foundation only; the shipped adapters are explicitly **non-sending** (`noop` for
`WHATSAPP` / `EMAIL` / `SMS` / `PUSH`, and an internal-only adapter for `IN_APP`).

IMP-033 code must never:

- perform an outbound HTTP call to Meta, a BSP, or any messaging provider;
- fabricate or assert `PROVIDER_ACCEPTED`, `DELIVERED`, or `READ`;
- synthesize a provider message ID or provider conversation ID;
- report external-send success, or record a provider event that did not originate from a provider.

The WhatsApp adapter is **IMP-034**. Any provider-outcome state in this slice is unreachable by
design, not merely unused.

### 14.3 Async topology

Locked to the PostgreSQL transactional outbox plus existing modular-monolith in-process worker
conventions. `NotificationOutboxProcessor` is hosted in the existing customer-commerce and
operations services, mirroring `PaymentInboxProcessor`. No Redis, Kafka, RabbitMQ, external queue,
or new deployable service.

### 14.4 Founder UAT

`FOUNDER_UAT_REQUIRED: NO`. IMP-033 introduces no customer-visible or operator-visible interactive
surface: no customer route change, no Operations Console UI change, and no message ever leaves the
platform. It is a foundation-only slice on the same basis as IMP-031. Independent technical
acceptance is the applicable acceptance gate.

### 14.5 Governance scope

`D-373` is **not** created. `ARCH-R19` is **not** required. `DR-14` and `ARCH-R18` remain unchanged.
ADR-012 remains the binding architecture authority for this capability.

### 14.6 Permission model

Authorization uses the single new `notification.resend` permission on the existing
`support_refund_operator` role (and `platform_super_admin` via its all-permissions mapping). No new
role, actor model, or permission model is invented.

### 14.7 No new service

`new_service: NO`. No new deployable service, container, or Compose service is introduced.

## 15. Implementation delivered

Implementation is **AUTHORIZED** / **STARTED** / **COMPLETE** within the boundary above and is
formally **COMPLETE_AND_ACCEPTED**.

1. **Provider-neutral domain** (`src/shared/notifications/`): channels, semantic types, purposes,
   request/attempt lifecycles, template lifecycle, deduplication key derivation, retry
   normalization and bounded backoff, template-variable safety validation, typed errors.
2. **Notifications-owned persistence** (`src/platform/database/schema/notifications.ts`,
   `drizzle/0033_notifications.sql`): the six tables in §12, with the dedup-key UNIQUE index that
   makes duplicate outbox delivery converge on exactly one request.
3. **Repository and operations** (`src/server/notifications/`): request creation from a committed
   domain event, consent/preference/dedup/staleness evaluation, semantic-ordering suppression,
   template resolution, attempt recording, retry scheduling, and expiry.
4. **Channel ports and non-sending adapters** (`src/server/notifications/channels/`): the adapter
   port plus `noop` adapters for `WHATSAPP` / `EMAIL` / `SMS` / `PUSH` and an internal `IN_APP`
   adapter. No adapter performs provider I/O.
5. **In-process outbox processor** (`src/server/notifications/processor.ts`): claims committed
   notification-intent events from `app.outbox_events` with `FOR UPDATE SKIP LOCKED`, bounded
   attempts, lease-based retry, and dead-lettering; hosted in the existing customer-commerce and
   operations services.
6. **Authorization** (`src/server/notifications/authorize.ts`): scoped `notification.resend`
   enforcement through existing Access Control, fail-closed.
7. **Tests**: provider-neutral domain unit tests (consent, dedup, ordering, retry normalization,
   template-variable safety), non-sending adapter tests proving no provider outcome can be
   fabricated, outbox-event contract tests, and database integration tests proving exactly-once
   notification-request creation from duplicate outbox delivery.

Not delivered, by design: Meta onboarding, production WhatsApp sends, inbound webhook routes,
marketing campaigns, conversation console UI, cross-channel fallback automation.

## 16. Architecture-lock review record

Reviewed before lock:

- ADR-012 explicit non-decisions list — no non-decision was silently resolved into a new authority.
- IMP-034 boundary — provider-neutral foundation does not overlap adapter scope.
- No new CURRENT decision is required beyond ADR-012 binding intent (`D-373` not created).
- No global architecture substance change (`ARCH-R19` not required).

## 17. Implementation and acceptance evidence

```text
IMPLEMENTATION_SOURCE_SHA: b91f92b46f8b9fe4e0b716f920babc56864fd342
IMPLEMENTATION_SOURCE_TREE: 715ff386e672fd276a0b2e888aa2ebeaab3dda8c
MERGED_MAIN_SHA: 5150d70b4683f7abec1e0652bf53e7986efcf622
MERGED_MAIN_TREE: 715ff386e672fd276a0b2e888aa2ebeaab3dda8c
PR: 48
PR_CI: 33417506582 SUCCESS
MAIN_CI: 33418061603 SUCCESS
DEPLOY: 33418062095 SUCCESS
IMP033_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_033_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP033_FORMAL_ACCEPTANCE: ACCEPTED
IMP033_ACCEPTED_MAIN_SHA: 5150d70b4683f7abec1e0652bf53e7986efcf622
IMP033_ACCEPTED_TREE: 715ff386e672fd276a0b2e888aa2ebeaab3dda8c
IMP-033_FOUNDER_UAT_REQUIRED: NO
IMP-033_FOUNDER_UAT: NOT_APPLICABLE
```

Accepted product identity is the immutable `main` merge SHA
`5150d70b4683f7abec1e0652bf53e7986efcf622` and tree
`715ff386e672fd276a0b2e888aa2ebeaab3dda8c`. Founder UAT is not applicable to this foundation-only
slice (§14.4); independent technical acceptance is the applicable gate. Acceptance does not authorize
or start IMP-034.
