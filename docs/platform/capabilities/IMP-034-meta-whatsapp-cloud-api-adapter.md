<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-034",
  "title": "Meta WhatsApp Cloud API Adapter",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
  "implementationAuthorized": true,
  "lastReviewed": "2026-08-31",
  "bindingDecisions": ["ADR-012", "ADR-013", "ADR-014", "ADR-015"],
  "dependsOn": ["IMP-033"]
}
-->

# IMP-034 — Meta WhatsApp Cloud API Adapter

## Capability Architecture (ARCHITECTURE_LOCKED — IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE)

This document is the locked capability architecture for **IMP-034 — Meta WhatsApp Cloud API
Adapter**. Architecture authority derives from accepted
[ADR-012](../decisions/ADR-012-notifications-whatsapp-assisted-commerce.md),
[ADR-013](../decisions/ADR-013-postgresql-drizzle-migrations-persistence.md),
[ADR-014](../decisions/ADR-014-http-api-route-handlers-contracts.md),
[ADR-015](../decisions/ADR-015-configuration-secrets-feature-flags.md), and the accepted
[IMP-033 Notification Foundation](./IMP-033-notification-foundation.md). Architecture is **LOCKED**.
Implementation is **AUTHORIZED**, **STARTED**, and **COMPLETE** pending independent acceptance.

Capability-local provider choice (no new CURRENT decision / no `D-373` / no `ARCH-R19`):

```text
provider_strategy = DIRECT_META_CLOUD_API_V1
BSP = NO for V1
```

BOBA Bear integrates **directly** with Meta WhatsApp Cloud API behind the existing
provider-neutral Notifications channel adapter. A future BSP may replace or sit behind that
adapter without changing Notifications domain semantics. This slice does **not** invent a BSP
abstraction beyond the existing port.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Lifecycle | `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` |
| Implementation | `AUTHORIZED` / `STARTED` / `COMPLETE` |
| Implementation authorized | **YES** |
| Implementation complete | **YES** |
| Accepted | **NO** |
| Accepted product through | IMP-033 (unchanged until formal acceptance) |
| Current product slice | IMP-034 |
| Pending acceptance | IMP-034 |
| Next product slice | IMP-035 — Initial Administration Capabilities |
| Governance checkpoint | GTM-R90 / STATE-R88 |
| New CURRENT decision | **NONE** (`D-373` absent) |
| Global architecture revision | **NONE** (`ARCH-R18` remains current; no ARCH-R19) |
| Decision register | **DR-14** unchanged |
| Founder UAT required for acceptance | **NO** |

```text
IMP-034: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-034_ARCHITECTURE: LOCKED
IMP-034_ARCHITECTURE_LOCKED: YES
IMP-034_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-034_IMPLEMENTATION_AUTHORIZED: YES
IMP-034_STARTED: YES
IMP-034_IMPLEMENTATION_COMPLETE: YES
IMP-034_ACCEPTED: NO
COMPLETION IS NOT ACCEPTANCE: YES
FOUNDER_UAT_REQUIRED: NO
FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE: NO
IMP-034_FOUNDER_UAT_REQUIRED: NO
D373_REQUIRED_FOR_LOCK: NO
ARCH_R19_REQUIRED: NO
schema_change: YES
provider_IO: YES
new_service: NO
async_topology: POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER
provider_strategy: DIRECT_META_CLOUD_API_V1
BSP: NO
graph_api_version_pin: CONFIG_PINNED (default v23.0; re-verify against Meta docs)
```

COMPLETION IS NOT ACCEPTANCE: YES. Formal acceptance is a separate gate.

## 1. Purpose

IMP-034 registers a production-capable **Meta WhatsApp Cloud API** adapter behind the IMP-033
`NotificationChannelAdapter` port and adds verified, durable, idempotent webhook ingestion for
message status and inbound WhatsApp traffic — without changing Notifications domain authority,
Order/Payment/Delivery/Refund authority, or the transactional-outbox topology.

## 2. Preserved authorities

| Authority | Preservation |
|---|---|
| ADR-012 | Notifications boundary, consent/template/lifecycle/retry, webhook durable-event pattern, assisted-commerce and payment-credential prohibitions |
| ADR-013 | PostgreSQL + Drizzle migrations; additive Notifications-owned schema only |
| ADR-014 | HTTP route-handler contracts for webhook ingress |
| ADR-015 | Typed config/secrets; staging/prod isolation; kill-switch initiation-vs-ingestion separation |
| IMP-033 | Provider-neutral ports, six foundation tables, outbox processor, policy/dedup/retry |
| IMP-007 | Outbox; notification failure never rolls back domain transitions |

## 3. Locked module placement

```text
src/server/notifications/provider/meta-whatsapp/   Meta Cloud API HTTP, send, webhook verify/process
src/server/notifications/channels/                 Registry wiring (WHATSAPP → Meta or noop)
src/server/customer-commerce/http/                 Webhook ingress route (GET verify + POST events)
src/platform/config/                               Approved BOBA_BEAR_* Meta/WhatsApp keys
src/platform/database/schema/notifications.ts      Additive inbound-message table + indexes
drizzle/0034_meta_whatsapp_adapter.sql             Notifications-owned additive migration
```

## 4. Provider strategy (capability-local)

```text
provider_strategy = DIRECT_META_CLOUD_API_V1
BSP = NO
```

- Outbound template messages use Meta Graph API
  `POST /{graph-version}/{phone-number-id}/messages` with Bearer system-user/access token.
- Graph API version is **config-pinned** (default `v23.0` as verified against current Meta developer
  documentation at implementation time), not hard-coded through domain modules.
- Webhook authenticity: GET hub challenge with configured verify token; POST
  `X-Hub-Signature-256` HMAC-SHA256 over raw body with App Secret; timing-safe compare.
- Provider identifier recorded on attempts/events: `meta_whatsapp` (never `noop` / `in_app`).

## 5. Outbound adapter boundary

A Meta send may occur only after the originating domain transaction is committed and the
notification request has passed IMP-033 consent, preference, deduplication, staleness, template,
locale, and policy checks.

Adapter outcomes:

| Outcome | Meaning |
|---|---|
| `ACCEPTED` | Real Meta response with non-empty `messages[0].id` |
| `REJECTED` | Real Meta HTTP error mapped to a retry category |
| `NOT_SENT` | Kill switch, missing recipient/template, or ambiguous network (`TRANSIENT`/`UNKNOWN`) — never fabricated success |

Normalized failure categories reuse IMP-033 vocabulary only. Ambiguous/network outcomes must not
blindly duplicate sends when the first call may have succeeded; retry policy remains foundation-owned.

Internal approved `provider_template_ref` maps to Meta template `name`; locale maps to Meta
`language.code`. Typed variables become template body parameters after IMP-033 variable validation.

Recipient phone is resolved read-only from customer auth (`phone_number` E.164). Notifications never
write customer-auth rows.

## 6. Kill switch and configuration

Using existing ADR-015 config authority (approved `BOBA_BEAR_*` catalogue):

```text
BOBA_BEAR_WHATSAPP_PROVIDER = disabled | meta_cloud_api
BOBA_BEAR_META_WHATSAPP_GRAPH_API_VERSION
BOBA_BEAR_META_WHATSAPP_GRAPH_API_BASE_URL   (optional; default https://graph.facebook.com)
BOBA_BEAR_META_WHATSAPP_PHONE_NUMBER_ID
BOBA_BEAR_META_WHATSAPP_WABA_ID              (optional; account scoping)
BOBA_BEAR_META_WHATSAPP_ACCESS_TOKEN
BOBA_BEAR_META_WHATSAPP_APP_SECRET
BOBA_BEAR_META_WHATSAPP_WEBHOOK_VERIFY_TOKEN
BOBA_BEAR_WHATSAPP_SEND_NEW_MESSAGES         (kill switch; initiation only)
```

Credentials are server-only, environment-separated, never committed, never logged, never browser-
exposed, rotatable/revocable. `WHATSAPP_SEND_NEW_MESSAGES=false` blocks **outbound** sends only;
webhook verification and durable provider-event persistence continue.

## 7. Webhook ingress and durable events

Route (customer-commerce HTTP façade, ADR-014 style):

```text
GET|POST /api/integrations/notifications/whatsapp/meta/webhook
```

Requirements:

1. Reject unauthentic requests (no durable business effect).
2. Persist durable `notification_provider_events` row **before** downstream processing.
3. Dedup key scoped by provider + environment + account/WABA + provider event id.
4. Idempotent replay; safe out-of-order status handling with **no lifecycle regression**.
5. Timely `200` after durable acceptance.
6. Payload minimization/redaction before persistence; staging events cannot affect production rows.
7. Status mapping updates **only** notification request/attempt rows:
   `sent` → remain/confirm `PROVIDER_ACCEPTED`; `delivered` → `DELIVERED`; `read` → `READ`;
   `failed` → `FAILED`. Never mutate Order/Payment/Delivery/Refund/consent.
8. Template/account/provider events required by ADR-012 are durably recorded (processed or ignored
   safely); they do not become commercial authority.

## 8. Inbound messages (IMP-034 extent)

Inbound WhatsApp messages are ingested as:

1. Durable provider-event records; and
2. Minimized first-class `notification_inbound_messages` rows (`classification = UNCLASSIFIED`).

Explicitly **deferred** beyond this slice:

- Full inbound classification routing (`CANCELLATION_REQUEST`, etc.)
- Conversation threads / human escalation console UI
- Autonomous actions from interactive replies

Inbound cancellation must never directly cancel/refund. Interactive replies must be server-side
revalidated before any later domain-affecting request (future slices). Never collect/store card
numbers, CVV, UPI PIN, banking passwords, OTPs, or payment/session credentials in chat records.

## 9. Schema

```text
schema_change: YES
scope: Notifications-owned additive migration only (0034_meta_whatsapp_adapter)
```

Permitted:

- `notification_inbound_messages` table
- index on `notification_message_attempts.provider_message_id` (nullable partial)
- data update setting WHATSAPP `provider_template_ref` from internal `template_key` where null
- revoke DELETE/TRUNCATE for app role on new communication table

Forbidden: DDL against Order, Payment, Refund, Delivery, Financial Document, Cart, Checkout,
Catalog, or Identity tables; material redesign of the accepted Notifications domain model.

## 10. Async topology

```text
async_topology: POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER
new_service: NO
```

Reuse IMP-033 `NotificationOutboxProcessor` hosted in existing customer-commerce / operations
services. No Redis/Kafka/RabbitMQ/SQS; no new deployable service.

## 11. Explicit deferrals / non-goals

| Item | Status |
|---|---|
| BSP integration | **NO** for V1 |
| SMS/email provider adapters | Deferred |
| Automatic cross-channel fallback | Not V1 |
| Marketing automation | Deferred |
| Conversational ordering / AI autonomous checkout | Forbidden |
| Autonomous refund/cancellation | Forbidden |
| Conversation-console UI | Deferred (later slice) |
| Meta production onboarding (WABA verification, display name, billing, production templates, public webhook DNS) | Launch validation — does **not** block technical acceptance |
| Live production Meta sends in CI | **Forbidden** — mocked fixtures only |
| IMP-035 | **NOT** started or authorized by this slice |
| `D-373` / `ARCH-R19` | **NOT** created / **NOT** required |

## 12. Testing (locked evidence requirements)

Deterministic mocked Meta HTTP/webhook fixtures must cover: successful send; provider rejection;
transient/rate-limit; auth failure; template failure; ambiguous/network failure; malformed
responses; webhook verification success/failure; duplicate webhook; out-of-order status;
delivered/read/failed; environment/account isolation; credential/log redaction; outbound kill
switch; duplicate outbox consumption; provider telemetry never mutating owning domains; failed
notification never rolling back source transaction; invalid webhook with no durable business
effect.

## 13. Founder UAT

`FOUNDER_UAT_REQUIRED: NO`. IMP-034 adds server-side provider I/O and an integration webhook route
with no customer-visible or operator-visible interactive product surface. Independent technical
acceptance with mocked provider fixtures is the applicable gate. Meta production onboarding and any
optional live founder WhatsApp exercise remain **external launch-validation** items and do not
block technical acceptance of this adapter slice.

## 14. Implementation delivered

1. Meta WhatsApp Cloud API outbound template adapter behind `NotificationChannelAdapter`.
2. Config-pinned Graph version + credential catalogue + outbound kill switch.
3. Channel registry wiring (`WHATSAPP` → `meta_whatsapp` when enabled; otherwise safe noop).
4. Recipient phone + `provider_template_ref` resolution on the send path.
5. Verified webhook GET/POST ingress with durable provider-event persistence and idempotent status
   / inbound processing.
6. Additive Notifications migration `0034_meta_whatsapp_adapter`.
7. Unit + database integration tests with mocked Meta I/O (no production Meta calls in CI).

## 15. Implementation evidence (filled at merge/acceptance)

```text
IMPLEMENTATION_SOURCE_SHA: PENDING
IMPLEMENTATION_SOURCE_TREE: PENDING
MERGED_MAIN_SHA: PENDING
MERGED_MAIN_TREE: PENDING
PR: PENDING
PR_CI: PENDING
MAIN_CI: PENDING
DEPLOY: PENDING
IMP034_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_034_INDEPENDENT_IMPLEMENTATION_REVIEW: PENDING
IMP034_INDEPENDENT_ACCEPTANCE_EVIDENCE: PENDING
IMP034_FORMAL_ACCEPTANCE: PENDING
IMP-034_FOUNDER_UAT_REQUIRED: NO
IMP-034_FOUNDER_UAT: NOT_APPLICABLE
```

Implementation completion does **not** authorize or start IMP-035, create `D-373`, create
`ARCH-R19`, complete Meta production onboarding, or declare founder UAT PASS.
