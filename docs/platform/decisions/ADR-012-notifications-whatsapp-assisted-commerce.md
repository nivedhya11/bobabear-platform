---
Status: Accepted
Decision date: 2026-08-02
Last updated: 2026-08-02
---

# ADR-012: Notifications, WhatsApp, and Assisted Commerce

## Status

Accepted

## Decision Date

2026-08-02

## Decision Owners

BOBA Bear founder and product leadership

## Context

[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md) fixed the durable provider-event
record, webhook signature verification, and idempotent-ingestion pattern for payment webhooks, and
established the transactional-outbox rule that a webhook processor must not call WhatsApp, email,
or any external notification provider before its own state transaction commits.
[ADR-010](./ADR-010-order-lifecycle-operations-console.md) fixed the commercial and fulfilment
lifecycles, the cancellation-request-versus-cancellation-decision separation, and a Notifications
boundary stating that Operations and Orders emit committed domain events, that notification work
uses the transactional outbox, and that notification delivery must never roll back a domain
transition — while explicitly deferring "exact channels, templates, language, and cadence" to a
future Notifications architecture slice. [ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md)
extended the same notifications boundary to delivery events and fixed the terminology for
provider-neutral delivery events and customer-visible tracking projections.
[ADR-004](./ADR-004-identity-authentication-sessions.md) fixed customer mobile-OTP authentication as
a distinct concern from any other customer-facing messaging, and fixed the identity/authorization
separation that this ADR's inbound-message handling and support escalation must respect.
[ADR-005](./ADR-005-organization-outlet-authorization.md) fixed scoped, permission-based
authorization, including the Support and Refund Operator and Platform Administrator roles this ADR's
administrative-authority section builds on.
[`v1-product-scope.md`](../v1-product-scope.md) named WhatsApp as an initial V1 customer channel,
alongside the PWA, without fixing WhatsApp's message categories, consent model, template governance,
webhook architecture, or the assisted-commerce boundary between "WhatsApp sends and receives
messages about an order" and "WhatsApp is itself a checkout or support-decision surface."

None of the documents above fix a provider-neutral Notifications-module domain model; the supported
notification channels; WhatsApp's message-category taxonomy; a messaging-cost model; a
consent-purpose model and consent-evidence record; the separation between transactional and
marketing communication; customer communication preferences; a provider-neutral template registry
and template lifecycle; typed template-variable validation; locale resolution; the notification
request and notification lifecycle; the message-attempt record; deduplication and semantic-ordering
rules for notifications; expiry and stale-message suppression; a notification retry policy; a
review-and-manual-resend workflow; the V1 position on cross-channel fallback; WhatsApp webhook
ingestion and the durable provider-event record for inbound and outbound WhatsApp traffic; the
boundary between delivery/read-status events and authoritative order/payment/delivery/refund/consent
state; inbound messages as first-class records; inbound-message classification; interactive-response
revalidation; the cancellation-request boundary for inbound cancellation messages; conversation
threads and human escalation; the assisted-commerce boundary itself; safe-link requirements; the
payment-credential prohibition in chat; the marketing boundary; opt-out processing; provider quality,
throughput, and cost controls; provider credential and configuration handling; customer-data
minimization for messaging; the media and attachment boundary; administrative authority; audit
requirements; and required future test coverage. This ADR resolves all of the above so that the
Notifications module referenced in
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#initial-module-boundaries),
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#notifications-boundary), and
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#notifications-boundary) can be
implemented against a fixed foundation rather than ad hoc, per-change decisions.

This ADR is a documentation-only architecture decision. It does not add Notifications-module code,
WhatsApp adapter code, webhook routes, template-management tooling, conversation-console UI,
database tables, migrations, or tests. It does not select a third-party WhatsApp Business Solution
Provider (BSP), finalize template wording, choose launch locales, or complete Meta's production
onboarding for BOBA Bear's WhatsApp Business Account.

### A note on current provider-capability assumptions

This ADR references Meta WhatsApp Cloud API concepts — the Cloud API itself, inbound/outbound
webhooks, the `UTILITY`/`MARKETING`/`AUTHENTICATION`/`SERVICE` template-category taxonomy, WhatsApp
Business Account (WABA) structure and business verification, and opt-in/opt-out obligations for
business-initiated messaging — as officially documented Meta WhatsApp Business Platform capabilities
as of this decision's date. Exact Graph API versions, exact template-approval mechanics, and exact
pricing or billing details are provider detail that changes over time with Meta's own product
evolution; this ADR does not fabricate or cite specific Meta pricing figures or specific Graph API
version numbers, and every such detail must be re-verified against current official Meta/WhatsApp
Business Platform documentation at implementation time, not against blogs, community posts,
unofficial tutorials, AI-generated summaries, or third-party comparison pages. This ADR records the
resulting architecture decisions; it does not reproduce provider documentation.

## Provider-Selection and Production-Validation Boundary

This ADR distinguishes three categories of content, and no reader should collapse them:

1. **Approved platform architecture** — the Notifications module's domain model, channel adapters,
   consent and preference model, template registry and lifecycle, notification and message-attempt
   lifecycles, deduplication and ordering rules, retry policy, webhook ingestion and idempotency
   rules, inbound-message and conversation model, assisted-commerce boundary, and credential, audit,
   and observability requirements. These are Locked architectural decisions, independent of which
   WhatsApp Business Solution Provider, if any, sits between BOBA Bear and Meta's Cloud API.
2. **Approved V1 WhatsApp adapter** — the **Meta WhatsApp Cloud API** is the approved initial
   WhatsApp channel adapter for V1, subject to the Meta production-approval conditions in
   [Meta Production-Approval Conditions](#meta-production-approval-conditions) below. No BSP,
   reseller, or managed WhatsApp platform is selected by this ADR; whether BOBA Bear integrates
   directly against Meta's Cloud API or through a BSP remains open.
3. **Provider-implementation detail** — exact Graph API versions, exact webhook route paths, exact
   authenticity-verification implementation, exact template-approval mechanics, and exact
   pricing/billing detail. This detail must remain implementation-pinned against current official
   Meta documentation at build time, not permanently embedded in this ADR as an unversioned
   assumption.

BOBA Bear's WhatsApp presence is not production-approved by this ADR alone. Business verification,
WABA ownership, phone-number registration, display-name approval, template approval, and billing
setup are launch-validation requirements this documentation does not satisfy — see
[Meta Production-Approval Conditions](#meta-production-approval-conditions).

## Decision Summary

> BOBA Bear uses a provider-neutral Notifications module, reached only through a transactional
> outbox, that sends brand-owned transactional customer communication — primarily over WhatsApp,
> with email, SMS, in-app, and future push as supported channels — governed by an explicit
> consent-purpose model, a provider-neutral template registry, and a deduplicated, ordered,
> retryable notification lifecycle. WhatsApp additionally supports customer-initiated support and
> assisted-commerce messaging, strictly bounded away from autonomous ordering, payment collection,
> or autonomous cancellation and refund decisions.

```text
Committed domain event (order, payment, delivery, refund, identity)
        ↓
Transactional outbox
        ↓
Notification request created
        ↓
Consent, preference, and policy evaluation
        ↓
Template and locale resolution
        ↓
Channel adapter (WhatsApp, email, SMS, in-app, push)
        ↓
Provider message attempt
        ↓
Durable provider-event record (delivery/read status)
        ↓
Customer-visible tracking remains authoritative in the PWA
```

BOBA Bear owns the WhatsApp messaging identity as a **brand-owned business number**, never a
personal staff number, integrated through the **Meta WhatsApp Cloud API** as the V1 adapter behind a
provider-neutral Notifications-module boundary — Orders, Payments, Operations, Delivery, Identity,
and Customers depend only on Notifications-module interfaces, never on a WhatsApp, email, or SMS
provider SDK directly. Supported channels are `WHATSAPP`, `EMAIL`, `SMS`, `IN_APP`, and `PUSH`;
`WHATSAPP` is the primary V1 transactional channel, `IN_APP`/PWA tracking is the authoritative
fallback, and `PUSH` is not implemented in V1. WhatsApp messages are classified using Meta's
`UTILITY`/`MARKETING`/`AUTHENTICATION`/`SERVICE` template categories. Every outbound message is
governed by a purpose-specific consent record (`ORDER_UPDATES`, `DELIVERY_UPDATES`,
`SUPPORT_MESSAGES`, `MARKETING_MESSAGES`, `AUTHENTICATION_MESSAGES`), kept strictly separate from
general order/account consent, with marketing consent never inferred from transactional
interaction. A provider-neutral template registry maps a semantic notification type to an internal
template key, locale, version, and channel/provider-specific template reference, with typed variable
validation that forbids secrets and internal identifiers. Notification requests and provider message
attempts are separate, deduplicated, and idempotent; duplicate domain events must never duplicate
customer messages, and stale intermediate messages (for example, "preparing" arriving after
"delivered") are suppressed rather than sent out of order. WhatsApp inbound messages, delivery
receipts, and read receipts are durably ingested through verified, deduplicated, idempotent webhooks,
and delivery/read-status events never mutate order, payment, delivery, refund, or consent state.
Inbound customer messages are classified (including `CANCELLATION_REQUEST`) and routed; an inbound
cancellation message creates a cancellation request only, which proceeds through the cancellation
workflow already fixed by
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#cancellation-request-and-decision) — it
never directly cancels an order. WhatsApp in V1 supports transactional notifications and
customer-initiated support and simple assisted actions (for example, tapping a safe link back to
the PWA, or confirming/declining a structured prompt); it does not support full conversational
ordering, an AI shopping agent, autonomous checkout, payment-credential collection, or autonomous
cancellation/refund approval. Payment always remains inside Cashfree Hosted Checkout, per
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#hosted-checkout-boundary); WhatsApp
must never request card numbers, CVV, UPI PINs, net-banking passwords, or OTPs in chat.

This is an accepted, final decision for BOBA Bear's notifications, WhatsApp, and assisted-commerce
architecture — not a recommendation or a provisional option, except where a specific item is
explicitly marked provisional or open below. It fixes the Notifications-module boundary, the
supported-channel and message-category model, the consent-purpose and consent-evidence model, the
template registry and lifecycle, the notification and message-attempt lifecycles, deduplication and
semantic-ordering rules, the retry policy, the webhook-ingestion and durable-provider-event model,
the inbound-message and conversation model, the assisted-commerce boundary, and the credential,
data-minimization, administrative-authority, audit, and observability requirements. It does not fix
the exact Meta Graph API version, the exact V1 transactional template set or wording, the exact
launch locales, the exact retry counts or intervals, the exact channel-fallback matrix, or several
other implementation and commercial details — see [Explicit Non-Decisions](#explicit-non-decisions).

## Brand-Owned Messaging Identity

BOBA Bear's WhatsApp presence is a single **brand-owned WhatsApp Business Account and phone number**,
never a personal staff mobile number. Support staff, kitchen staff, and delivery coordinators must
never conduct customer-facing WhatsApp communication about an order from a personal WhatsApp
account; all WhatsApp customer communication flows through the brand-owned number and the
Notifications module's conversation tooling. This extends the payment-account and delivery-account
ownership principle already locked in
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#payment-account-ownership) and
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#delivery-account-ownership) to the
messaging identity: the customer or browser never selects it, and it belongs to the brand, not to an
individual outlet, franchisee, or staff member. For the initial COCO launch, BOBA Bear uses one
brand-owned WhatsApp Business Account; a future franchise model may require additional approved
numbers, governed by a separate decision.

## Notifications-Module Boundary

The Notifications module owns:

```text
Channel adapters (WhatsApp, email, SMS, in-app, push)
Notification requests
Message attempts
Consent records
Communication preferences
Template registry
Template variables and locale resolution
Deduplication and ordering state
Notification retry and expiry state
Inbound message records
Conversation threads
Durable inbound and outbound provider-event records
```

It does not own:

```text
Order, payment, delivery, refund, and identity domain state → Orders / Payments / Delivery / Identity
Cancellation decision authority                              → Orders / Operations, per ADR-010
Customer profile and saved addresses                          → Customers
Customer-visible tracking projection (source of truth)        → Orders / Operations, per ADR-010
Workforce authorization for support and marketing actions      → Access Control, per ADR-005
```

Approved ownership relationship: domain modules (Orders, Payments, Operations, Delivery, Identity)
emit committed domain events; the Notifications module decides whether, how, and through which
channel to communicate about them. The Notifications module never becomes an alternate source of
truth for order, payment, delivery, refund, or identity state — it reads that state through each
owning module's application interface, consistent with the module dependency rules already locked in
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#dependency-rules).

## Supported Channels

The Notifications module supports channel adapters conceptually equivalent to:

```text
WHATSAPP
EMAIL
SMS
IN_APP
PUSH
```

| Channel | V1 role |
| --- | --- |
| `WHATSAPP` | Primary V1 transactional customer-notification channel; also supports customer-initiated support and bounded assisted actions |
| `IN_APP` | Authoritative customer-visible tracking projection inside the PWA, per [ADR-010](./ADR-010-order-lifecycle-operations-console.md#customer-visible-tracking-projection); the fallback of record when WhatsApp delivery is delayed, suppressed, or fails |
| `EMAIL` | Supplementary channel — for example, receipts or account communication where collected; not the primary V1 transactional channel |
| `SMS` | Reserved primarily for authentication-related messaging under [ADR-004](./ADR-004-identity-authentication-sessions.md#otp-security); not the primary V1 order-notification channel |
| `PUSH` | Not implemented in V1; reserved for a future native-app or web-push capability |

Each channel is implemented behind a provider-neutral adapter; business modules and the
Notifications application layer depend only on the channel-adapter interface, never on a specific
provider SDK, consistent with
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#dependency-rules).

## WhatsApp Message Categories

WhatsApp business-initiated messages are classified using Meta's provider-level template categories:

```text
UTILITY
MARKETING
AUTHENTICATION
SERVICE
```

**`UTILITY`** — transactional updates about an existing order or account action the customer
initiated: for example, order received, payment confirmed, order accepted, preparation started,
order ready, out for delivery, delivered, cancellation update, refund update. **`MARKETING`** —
promotional or re-engagement messaging, governed separately per
[Marketing Boundary](#marketing-boundary) below and out of scope for V1 delivery. **`AUTHENTICATION`**
— one-time-passcode-style messages, kept distinct from the customer login OTP already fixed by
[ADR-004](./ADR-004-identity-authentication-sessions.md#otp-security); WhatsApp authentication
templates, if ever used, remain a separate concern from Identity-module OTP delivery.
**`SERVICE`** — free-form customer-support conversation within an open service window, used for
customer-initiated support and human-agent replies rather than for template-based proactive
messaging. BOBA Bear's V1 scope is overwhelmingly `UTILITY` and customer-initiated `SERVICE`
conversation; `MARKETING` and `AUTHENTICATION` WhatsApp templates are not part of V1 delivery.

## Messaging-Cost Model

Messaging cost is tracked as an effective-dated, conceptual cost model, not a hard-coded price list:
a cost record conceptually includes provider, channel, message category, effective start date,
effective end date, currency, and a cost basis (for example, per-conversation or per-message,
depending on current provider billing model). No specific Meta or provider price is hard-coded in
application logic or in this ADR; costs must be resolved from current, version-pinned provider
configuration at implementation time, consistent with the effective-dated pricing and tax-policy
pattern already locked in
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md#tax-policies). Messaging-cost tracking exists
so operations and finance can observe notification volume and cost by channel and category; it does
not itself gate whether a transactional message is sent.

## Consent-Purpose Model

Consent is modeled per purpose, not as one blanket "may we contact you" flag:

```text
ORDER_UPDATES
DELIVERY_UPDATES
SUPPORT_MESSAGES
MARKETING_MESSAGES
AUTHENTICATION_MESSAGES
```

`ORDER_UPDATES`, `DELIVERY_UPDATES`, `SUPPORT_MESSAGES`, and `AUTHENTICATION_MESSAGES` are
transactional purposes tied to an active account relationship, an order, or a customer-initiated
support interaction. `MARKETING_MESSAGES` is a separate, opt-in purpose, per
[Transactional/Marketing Separation](#transactionalmarketing-separation) below. A notification
request must declare the purpose it serves, and the Notifications module must evaluate consent for
that specific purpose before sending — consent for one purpose must never be treated as consent for
another.

## Consent Evidence

A consent record conceptually includes: customer, purpose, channel, consent state, evidence source
(for example, checkout confirmation, WhatsApp opt-in message, account-settings action, support-agent
recorded request), evidence timestamp, expiry where applicable, and audit metadata. Consent state
supports:

```text
GRANTED
WITHDRAWN
EXPIRED
SUPPRESSED
```

**Granted** — the customer has given evidence-backed consent for the purpose and channel.
**Withdrawn** — the customer explicitly opted out; a withdrawal must be honored promptly and must
never be silently overridden by staff without new evidence, extending the
customer-data-minimization and consent-integrity principle already locked in
[ADR-005](./ADR-005-organization-outlet-authorization.md#customer-data-minimization). **Expired** —
a time-bound consent (where applicable, for example certain marketing consent models) has lapsed
without renewal. **Suppressed** — consent may nominally exist, but a policy, quality, or compliance
control temporarily blocks sending (for example, a quality-hold or opt-out-processing delay).
Consent evidence must be retained and auditable; a staff member must never re-enable a withdrawn
consent state without new, recorded customer evidence.

## Transactional/Marketing Separation

Transactional notifications (`ORDER_UPDATES`, `DELIVERY_UPDATES`, `SUPPORT_MESSAGES`,
`AUTHENTICATION_MESSAGES`) are sent based on an active order, account, or support relationship and
applicable transactional consent; they are not blocked merely because a customer has not opted into
marketing. `MARKETING_MESSAGES` consent is a wholly separate, explicit opt-in that is never inferred
from placing an order, completing checkout, or replying to a transactional message. A customer who
withdraws marketing consent must continue to receive applicable transactional order and delivery
updates unless they separately withdraw those purposes. This mirrors, for messaging consent, the
same transactional/marketing separation principle already implied by the consent-preferences
requirement in [`operating-model.md`](../operating-model.md) and made explicit here.

## Customer Preferences

Customers may configure communication preferences within the bounds of applicable consent and
transactional necessity: preferred channel for non-critical updates where more than one applies,
language/locale preference, and marketing opt-in/opt-out. Preferences are read by the Notifications
module at send time alongside consent and policy; a preference can narrow channel choice among
otherwise-eligible channels, but cannot be used to disable a transactional purpose the platform
determines is operationally required (for example, a payment-review notice) — such cases fall back
to the authoritative `IN_APP` tracking projection at minimum.

## Template Registry

The Notifications module maintains a **provider-neutral template registry**. Templates are resolved
through a chain conceptually equivalent to:

```text
Semantic notification type (e.g. ORDER_ACCEPTED)
        ↓
Internal template key
        ↓
Locale and version
        ↓
Channel and provider-specific template reference (e.g. Meta-approved WhatsApp template name)
```

A semantic notification type (for example, `PAYMENT_CONFIRMED`, `ORDER_ACCEPTED`,
`OUT_FOR_DELIVERY`, `REFUND_UPDATE`) never directly names a provider-specific template; the registry
resolves it to the correct internal key, locale, version, and provider reference. This keeps
business modules and notification-triggering code independent of Meta's template-naming and
template-approval mechanics, consistent with the provider-neutral adapter pattern already used for
Payments and Delivery in
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#provider-neutral-payments-boundary)
and
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#provider-neutral-delivery-interface).

## Template Lifecycle

Templates support a lifecycle conceptually equivalent to:

```text
DRAFT
SUBMITTED
APPROVED
REJECTED
PAUSED
DISABLED
RETIRED
```

**Draft** — an internal template definition exists but has not been submitted to the provider.
**Submitted** — the template is pending provider (Meta) review. **Approved** — the provider has
approved the template for sending. **Rejected** — the provider declined the template; a rejected
template must not be silently resubmitted without addressing the rejection reason. **Paused** — an
approved template is temporarily withheld from use by BOBA Bear policy (for example, pending
content review) without losing provider approval. **Disabled** — the template is administratively
disabled from further use. **Retired** — the template is no longer used for new sends but its
history remains for audit and support. A notification must resolve to an `APPROVED` and
non-`PAUSED`/non-`DISABLED` template version before sending; a template stuck outside `APPROVED`
must fail safely into the notification review state described in
[Review and Manual Resend](#review-and-manual-resend), not silently drop the message.

## Typed Variables

Template variables are typed and validated before substitution: each template version declares its
expected variable types (for example, order number, amount, date/time, safe short text), and a
notification request must supply values matching that declaration. Validation rules require: no
secrets (OTPs, tokens, credentials) as template variables; no internal database identifiers,
internal enum names, or internal diagnostic detail; length and character-set constraints appropriate
to the provider and template; and safe escaping of any customer-supplied free text. A variable
mismatch or validation failure must block the send and route to review rather than send malformed
or unsafe content.

## Locale Resolution

Locale is resolved through a fallback order: explicit customer language preference, then a
configured default locale for the channel/market, then a platform-wide default. Exact launch locales
and the exact fallback order remain open — see [Explicit Non-Decisions](#explicit-non-decisions). No
machine translation occurs at send time: only pre-approved, human-reviewed template content for a
resolved locale may be sent; a missing locale-specific template version must fall back to an
approved default-locale version rather than auto-translating content on the fly.

## Notification Requests

A notification request conceptually includes: internal identifier, triggering domain event
reference, customer, purpose, semantic notification type, candidate channel(s), resolved channel,
template key/locale/version, typed variables, deduplication key, priority, requested time, earliest-
and latest-send window where applicable, lifecycle state, and correlation identifier. A notification
request is the Notifications module's own durable record of "this event should produce a customer
message," separate from any provider-facing send attempt.

## Notification Lifecycle

The notification-request lifecycle is conceptually equivalent to:

```text
PENDING
SCHEDULED
SUPPRESSED
SENDING
PROVIDER_ACCEPTED
DELIVERED
READ
FAILED
EXPIRED
CANCELLED
REVIEW_REQUIRED
```

**Pending** — the request exists and awaits policy evaluation and dispatch. **Scheduled** — dispatch
is deliberately deferred (for example, respecting a quiet-hours or throttling policy). **Suppressed**
— consent, preference, deduplication, or staleness policy blocks sending; the request is retained for
audit rather than deleted. **Sending** — a channel adapter has been invoked and a provider response
is pending. **Provider accepted** — the provider has accepted the message for delivery.
**Delivered** — a delivery receipt has been received. **Read** — a read receipt has been received,
where the channel supports it. **Failed** — the provider reported failure; see
[Retry Policy](#retry-policy). **Expired** — the notification is no longer relevant (per
[Expiry and Stale-Message Suppression](#expiry-and-stale-message-suppression)) and must not be sent.
**Cancelled** — a superseding event or explicit action cancelled the pending notification.
**Review required** — an unresolved template, policy, or provider condition blocks safe automatic
handling; see [Review and Manual Resend](#review-and-manual-resend).

## Message Attempts

A **message attempt** is a separate record from the notification request — one notification request
may produce more than one provider-facing attempt (for example, on retry). A message attempt
conceptually includes: internal identifier, notification request reference, channel, provider,
provider message identifier, attempt sequence number, provider status, normalized internal status,
provider failure code and category, sent timestamp, provider-acknowledged timestamp,
delivered/read timestamps where available, and correlation identifier. This mirrors the
payment-intent/payment-attempt and delivery-request/provider-event separation already locked in
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#payment-concepts) and
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#separate-delivery-concepts): a failed
attempt does not automatically fail the whole notification request while a retry remains eligible.

## Transactional-Outbox Boundary

Domain modules (Orders, Payments, Operations, Delivery, Identity) never call a notification provider
directly. The approved flow is:

```text
Domain transaction commits (order/payment/delivery/refund/identity state + outbox event)
        ↓
Background worker consumes committed outbox event
        ↓
Notifications module creates a notification request
        ↓
Consent, preference, deduplication, and staleness policy evaluated
        ↓
Template and locale resolved
        ↓
Channel/provider adapter invoked
        ↓
Message attempt recorded
```

This extends the transactional-outbox requirement already locked in
[`architecture-foundation.md`](../architecture-foundation.md#transactional-outbox) and applied to
payment and delivery events in
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#webhook-processing-transaction) and
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#provider-event-processing-transaction).
A notification failure — provider outage, template rejection, invalid recipient, or any other
send-side failure — must never roll back, retry, or otherwise mutate the originating order, payment,
delivery, refund, or identity transaction. The domain transition is already committed and
authoritative before any notification work begins.

## Deduplication

Every notification request carries a deterministic deduplication key composed of, at minimum:
customer, semantic notification type, the triggering domain event's stable reference (for example, a
specific order-status transition or a specific provider-event identifier), and channel. Rules: a
duplicate domain event (for example, a replayed payment or delivery webhook, per
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#webhook-idempotency-and-ordering) and
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#duplicate-and-out-of-order-events))
must not create a second notification request for the same deduplication key; a retried or replayed
notification-worker execution must not create a second message attempt beyond the retry policy below;
and a manual resend, per [Review and Manual Resend](#review-and-manual-resend), is the only approved
path to intentionally re-send an already-delivered notification.

## Semantic Ordering

Notifications for the same order and customer must reflect the domain's true current state, not
merely the order in which underlying events were produced or processed. A later, more current
notification supersedes an earlier, now-stale one: for example, if "delivered" has already been
communicated, an earlier queued "out for delivery" notification for the same order becomes stale and
must be suppressed rather than sent after the fact. Illustrative order-status notification sequence:

```text
ORDER_RECEIVED
        ↓
PAYMENT_CONFIRMED
        ↓
ORDER_ACCEPTED
        ↓
PREPARING
        ↓
OUT_FOR_DELIVERY
        ↓
DELIVERED
```

A notification whose semantic position in this sequence has already been superseded by a later,
already-sent or already-superseding notification for the same order must enter `EXPIRED` or
`SUPPRESSED` rather than send. This does not require full event sourcing — it requires the
Notifications module to compare a pending notification's semantic position against the domain's
current authoritative state at send time, consistent with the append-only order timeline and
current-state authority already locked in
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#append-only-timeline).

## Expiry and Stale-Message Suppression

A pending notification request that is no longer relevant must expire rather than send. Conditions
include: the underlying order has reached a materially later state (per
[Semantic Ordering](#semantic-ordering) above); the order was cancelled after the notification was
queued but before it sent; the maximum age for that notification type has elapsed (exact maximum
notification age remains open); or the applicable consent or preference changed to block the purpose
before send. Expired notifications are retained for audit, not deleted, consistent with the
historical-immutability principle already locked in
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#historical-immutability).

## Retry Policy

Failures are normalized into safe internal categories:

```text
TRANSIENT
RATE_LIMITED
AUTHENTICATION_FAILURE
TEMPLATE_FAILURE
RECIPIENT_UNAVAILABLE
POLICY_REJECTED
PERMANENT_FAILURE
UNKNOWN
```

**Transient** — a temporary provider or network failure; eligible for automatic retry with backoff.
**Rate limited** — the provider or BOBA Bear's own throughput controls throttled the send; eligible
for delayed retry, respecting [Provider Quality and Throughput Controls](#provider-quality-and-throughput-controls).
**Authentication failure** — the Notifications module's own provider credentials are invalid or
expired; this is an operational incident, not a per-message retry case, and must alert operations
immediately rather than retry silently. **Template failure** — the resolved template is not
`APPROVED`, was rejected, or failed variable validation; routes to
[Review and Manual Resend](#review-and-manual-resend), not automatic retry. **Recipient unavailable**
— for example, the customer's WhatsApp number is invalid, blocked BOBA Bear, or the phone is
unreachable long-term; not eligible for indefinite retry, and should trigger fallback to `IN_APP`
tracking as the channel of record. **Policy rejected** — consent, preference, deduplication, or
staleness policy blocked the send; not a failure to retry, it is an intentional suppression, per
[Notification Lifecycle](#notification-lifecycle). **Permanent failure** — the provider has
confirmed the message can never be delivered as sent; not retried with the same content. **Unknown**
— an unrecognized provider failure code; treated conservatively (limited retry, then review) rather
than assumed transient. Exact retry counts and intervals remain open — see
[Explicit Non-Decisions](#explicit-non-decisions).

## Review and Manual Resend

A notification enters `REVIEW_REQUIRED` when: the resolved template is not usable
(`TEMPLATE_FAILURE`); retries under `TRANSIENT`/`RATE_LIMITED`/`UNKNOWN` are exhausted without
resolution; an `AUTHENTICATION_FAILURE` blocks the provider adapter; or another unsafe-to-automate
condition exists. A notification in `REVIEW_REQUIRED` must not silently drop — it must remain visible
to authorized staff. Manual resend requires: an authorized permission (distinct from routine order or
support access, consistent with the scoped-permission model in
[ADR-005](./ADR-005-organization-outlet-authorization.md#v1-system-roles)); a recorded reason;
revalidation that the underlying domain state has not since changed in a way that would make the
message stale, per [Semantic Ordering](#semantic-ordering); and an audit event. Manual resend must
never bypass consent or the deduplication key.

## Channel Fallback

**V1 position: there is no automatic WhatsApp-to-SMS or WhatsApp-to-email fallback matrix.** If a
WhatsApp notification cannot be delivered (recipient unavailable, permanent failure, or unresolved
review), the platform's guaranteed channel of record is the authoritative `IN_APP` PWA tracking
projection, per [ADR-010](./ADR-010-order-lifecycle-operations-console.md#customer-visible-tracking-projection)
— not an automatic cross-provider SMS or email send. A future cross-channel fallback matrix (which
failure conditions trigger which fallback channel, and through which SMS/email provider) requires a
separately approved decision; it is not introduced by this ADR.

## WhatsApp Webhooks

WhatsApp inbound messages, message-status updates (sent/delivered/read/failed), and account-level
events arrive as Meta Cloud API webhook events. Every webhook endpoint must: use HTTPS; verify event
authenticity before accepting the event (exact verification mechanism is implementation detail, per
[Explicit Non-Decisions](#explicit-non-decisions)); persist a durable provider-event record before
any further processing; deduplicate repeated deliveries; process business effects transactionally;
and return a timely acknowledgement after durable acceptance, mirroring the webhook-acceptance
pattern already locked in
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#webhook-signature-verification-and-acceptance)
and
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#provider-callbacks-and-webhooks).
Event categories include at least: inbound customer message, message delivered, message read,
message failed, template status change, and account/quality-rating change.

## Durable Provider-Event Record

A WhatsApp (or other channel) provider-event record conceptually includes: internal identifier,
provider, channel, environment, provider event identifier, related message-attempt or inbound-message
reference, event category, event type, authenticity-verification result, received timestamp,
provider event timestamp, processing state, processing-attempt count, safe normalized metadata, and
correlation identifier — mirroring the durable provider-event record already locked in
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#durable-provider-event-record) and
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#durable-provider-event-records). Both
inbound (customer-originated) and outbound (delivery/read-status) WhatsApp events use this same
durable, deduplicated, idempotent pattern.

## Delivery/Read-Status Boundary

Message delivery and read-status events (`PROVIDER_ACCEPTED`, `DELIVERED`, `READ`, `FAILED`) update
only the notification request and message-attempt records described above. They must **never**
mutate order, payment, delivery, refund, or consent state. For example: a "message read" receipt must
never be interpreted as "customer confirmed the order"; a "message delivery failed" event must never
be interpreted as "customer cancelled" or trigger any change to commercial, fulfilment, payment, or
refund state. This is a hard boundary equivalent to the delivery-driven-completion and
payment-success separation already locked in
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#payment-success-and-settlement-separation)
and
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#delivery-driven-completion): messaging
telemetry is never a source of domain truth.

## Inbound Messages as First-Class Records

Every inbound WhatsApp message is stored as a first-class record, conceptually including: internal
identifier, customer (resolved where possible from the sending number), provider message identifier,
received timestamp, message type (text, interactive reply, media, location), raw content reference,
classification (see below), linked order where applicable, linked conversation thread, and
correlation identifier. Inbound messages are retained for support, audit, and classification-model
improvement, subject to the customer-data-minimization and retention principles referenced in
[Customer-Data Minimization](#customer-data-minimization) below.

## Inbound-Message Classification

Inbound messages are classified into categories conceptually including:

```text
OPT_OUT
OPT_IN
ORDER_SUPPORT
CANCELLATION_REQUEST
DELIVERY_SUPPORT
REFUND_SUPPORT
GENERAL_SUPPORT
MENU_OR_PRODUCT_QUERY
COMPLAINT
UNRECOGNIZED
ABUSE_OR_SPAM
```

Classification may use rule-based matching, structured interactive replies, or an AI/ML classifier.
**AI classification restrictions**: an AI or ML classifier may only propose a classification and may
only trigger safe, reversible, non-authoritative actions (for example, routing to a human queue,
suggesting a canned reply for agent review, or creating a cancellation *request*). An AI classifier
must never itself approve a refund, execute a cancellation, authorize a payment action, or take any
action this ADR reserves for a human decision-maker or an already-approved deterministic workflow.
Misclassification must fail safe toward human review (`GENERAL_SUPPORT`/human escalation), not toward
an autonomous action.

## Interactive Responses

Structured interactive replies (button taps, list selections, quick replies) are convenience input,
not authoritative confirmation on their own. Every interactive response that would affect order,
payment, delivery, refund, or consent state must be **server-side revalidated** against current
authoritative state before any action is taken — for example, a "confirm cancellation" button tap
must be revalidated against the order's current cancellation-eligibility state, per
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#customer-cancellation-foundation), before
any request is created; a stale or replayed interactive response must not apply to a since-changed
order. This mirrors the browser-result-is-not-proof principle already locked in
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#browser-result-boundary): a client- or
channel-side signal is never trusted as authoritative without server-side verification.

## Cancellation-Request Boundary

An inbound WhatsApp message classified as `CANCELLATION_REQUEST` — whether free text or a structured
interactive reply — creates a **cancellation request only**. It never directly cancels an order,
never directly triggers a refund, and never bypasses the cancellation-request/cancellation-decision
separation already locked in
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#cancellation-request-and-decision). The
resulting request proceeds through the same customer-cancellation-foundation, outlet-review, and
refund workflow as a cancellation request from any other channel. This boundary exists specifically
so that WhatsApp cannot become a side channel for autonomous order cancellation.

## Conversation Threads

Customer-initiated WhatsApp interaction is grouped into a **conversation thread**, conceptually
including: internal identifier, customer, related order(s) where applicable, opened timestamp, last-
activity timestamp, current lifecycle state, assigned human agent where applicable, and a reference
to the constituent inbound/outbound messages. Conversation lifecycle is conceptually equivalent to:

```text
OPEN
AUTOMATION_ACTIVE
WAITING_FOR_AGENT
AGENT_ASSIGNED
WAITING_FOR_CUSTOMER
RESOLVED
CLOSED
```

**Open** — a new inbound message started or continued the thread. **Automation active** — automated
classification/reply handling is in progress. **Waiting for agent** — automation determined human
handling is needed and the thread awaits an available agent. **Agent assigned** — a named human
support actor owns the thread. **Waiting for customer** — the agent or automation is awaiting a
customer reply. **Resolved** — the underlying issue has been addressed. **Closed** — the thread is
archived; historical messages remain retained per [Audit Requirements](#audit-requirements). Exact
conversation-lifecycle naming and agent-response SLA remain open — see
[Explicit Non-Decisions](#explicit-non-decisions).

## Human Escalation

A conversation must escalate to a human agent when: classification is `UNRECOGNIZED`,
`ABUSE_OR_SPAM`, or `COMPLAINT`; the customer explicitly asks for a human; an automated reply would
otherwise need to make a payment, refund, or cancellation *decision* (as opposed to creating a
request); the same issue recurs without resolution; or a configured automation-confidence threshold
is not met. Handoff content passed to the human agent must include the conversation history, linked
order and payment/delivery/refund context available to that agent's authorized scope (per
[Administrative Authority](#administrative-authority) below), and the classification/automation
outcome that triggered escalation, so the agent is not starting from zero context.

## Assisted-Commerce Boundary

WhatsApp in V1 is used for: transactional order/payment/delivery/refund notifications; safe links
back into the PWA for detail, tracking, or completing an action; customer-initiated support
conversation; simple, server-revalidated interactive confirmations (for example, "confirm
cancellation request?"); and classification-driven routing to human agents. WhatsApp in V1 is **not**
used for: full conversational ordering (building or modifying a cart through chat); an AI shopping
agent that selects items or checks out on the customer's behalf; autonomous checkout; collecting
payment credentials in chat; or autonomously approving a cancellation or refund. This boundary exists
so that WhatsApp remains a notification-and-support channel layered on top of the PWA's authoritative
catalog, cart, checkout, and payment flows fixed by
[ADR-006](./ADR-006-food-catalog-assortment-availability.md),
[ADR-007](./ADR-007-pricing-tax-charges-promotions.md), and
[ADR-008](./ADR-008-serviceability-cart-checkout.md), rather than becoming a second, parallel
commerce system.

## Safe Links

Links sent to customers over WhatsApp (or any channel) must: use HTTPS; reference an opaque,
non-guessable resource identifier rather than a raw internal database identifier, consistent with the
public-order-number principle already locked in
[ADR-010](./ADR-010-order-lifecycle-operations-console.md#public-order-number); never embed a
password, session token, payment credential, or other secret in the URL; require the customer to be
authenticated (or use a future approved secure guest-token model) before the linked page discloses
protected order, payment, or delivery detail, consistent with
[ADR-005](./ADR-005-organization-outlet-authorization.md#customer-authorization); and expire or
become inert where the underlying action is time-bound (for example, a stale "confirm cancellation"
link must not silently apply to a since-changed order).

## Payment-Credential Prohibition

WhatsApp, and every other notification or support channel, must **never** request or accept a card
number, CVV, UPI PIN, net-banking password, OTP, or any other sensitive payment-authentication data
in chat. Payment always occurs inside **Cashfree Hosted Checkout**, reached through a safe link back
to the PWA, per
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#hosted-checkout-boundary). A support
agent or automated flow that appears to be asking for payment detail in chat is treated as a
suspected phishing/abuse indicator, not a valid support pattern, and must be classified toward
[Human Escalation](#human-escalation) and audited.

## Marketing Boundary

`MARKETING` WhatsApp templates and general marketing messaging are **out of scope for this ADR's
delivered V1 capability** and are deferred, per
[Rejected and Deferred Alternatives](#rejected-and-deferred-alternatives) below. Before any future
marketing-messaging capability is built, it requires: explicit, evidence-backed
`MARKETING_MESSAGES` opt-in per [Consent-Purpose Model](#consent-purpose-model) above, kept
structurally separate from transactional consent; a defined marketing-frequency and quiet-hours
policy; a Marketing Administrator authority distinct from Support/Refund Operator authority, per
[Administrative Authority](#administrative-authority); and its own approved architecture decision.
This ADR fixes only the consent-separation requirement that any future marketing capability must
honor; it does not design that capability.

## Opt-Out Processing

Opt-out (`STOP`-style replies, WhatsApp-level blocking, or an explicit opt-out request through
support) must be processed from every available source: inbound WhatsApp message classified
`OPT_OUT`, account-preference changes in the PWA, and support-agent-recorded requests. Opt-out
processing must be **idempotent** — a repeated opt-out request must not create duplicate consent
records or duplicate audit events — and must apply promptly to the specific purpose(s) it targets; a
generic "stop messaging me" must be interpreted conservatively (at minimum, suppress marketing) and
routed to support to confirm scope for transactional purposes, since some transactional messaging
(for example, a payment-review notice for an active order) may still be operationally required and
falls back to `IN_APP` tracking rather than being silently dropped. Re-enabling any withdrawn consent
requires new customer evidence, per [Consent Evidence](#consent-evidence) above; staff must never
silently reverse an opt-out.

## Provider Quality and Throughput Controls

The Notifications module must track and respond to WhatsApp account-quality and throughput signals
exposed by the provider (for example, quality rating, messaging-limit tier, and template
pause/rejection events) rather than assuming unlimited send capacity. Throughput controls must:
respect provider-imposed rate limits; queue and pace sends rather than bursting; prioritize
higher-value transactional categories (payment/order-status) over lower-priority categories under
constrained throughput; and alert operations when quality or throughput signals degrade, rather than
silently continuing to send at a rate that risks the account.

## Messaging-Cost Controls

Beyond the cost model in [Messaging-Cost Model](#messaging-cost-model) above, operational controls
should track notification volume and cost by channel, category, and time period, and alert on
unexpected volume spikes (which may indicate a bug, a duplicate-event regression, or abuse) and
unexpected cost-per-conversation drift. Exact messaging-budget thresholds remain open — see
[Explicit Non-Decisions](#explicit-non-decisions).

## Provider Credentials and Configuration

WhatsApp (and other channel) provider credentials — access tokens, webhook verification secrets,
phone-number identifiers, and WABA identifiers — must be: separate for staging and production; stored
as encrypted DigitalOcean runtime secrets; available only to server-side infrastructure; excluded
from logs and client bundles; rotatable and revocable; and validated at startup, consistent with the
secrets model already locked in
[ADR-002](./ADR-002-environments-ci-cd-release-model.md#secrets-model) and applied to payment and
delivery credentials in
[ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md#credential-and-webhook-secret-controls)
and
[ADR-011](./ADR-011-delivery-providers-dispatch-fulfilment.md#credential-controls). Staging events
and staging credentials must never be able to affect production notification records, and production
credentials must never be used from staging.

## Customer-Data Minimization

Only the customer data required for a given notification or support interaction is exposed to a
given channel adapter or surfaced to a given staff role: recipient name or safe display name, the
minimum order/payment/delivery context needed for the message content, and the customer's verified
phone number for WhatsApp delivery — never a customer's complete profile, unrelated order history,
full payment instrument detail, or marketing-segmentation profile, unless the specific task requires
it and the actor's role permits it, extending the data-minimization principle already locked in
[ADR-005](./ADR-005-organization-outlet-authorization.md#customer-data-minimization). Inbound-message
and conversation retention must follow the same minimization discipline; exact retention periods
remain open.

## Media and Attachment Boundary

Where WhatsApp media (images sent by the customer, for example a delivery-issue photo) is accepted,
it must be: stored through the platform's existing object-storage foundation (DigitalOcean Spaces,
per [ADR-001](./ADR-001-digitalocean-platform.md)), referenced rather than embedded inline in
notification or conversation records; subject to a defined retention policy (exact period open); and
not treated as authoritative evidence for automated decisions — media supports human review (for
example, a support agent assessing a complaint), it does not itself trigger an automatic refund,
cancellation, or delivery-state change. Malware/content scanning for inbound media is required in
principle; the exact scanning service remains open.

## Administrative Authority

**Customer** may view their own notification/communication preferences, manage their own marketing
opt-in/opt-out, and initiate WhatsApp support conversation about their own orders. **Support
Operator** may view and respond within an assigned conversation thread, request a cancellation (never
approve one merely through chat), view notification/delivery status for orders within their
authorized scope, and perform a permissioned manual resend with a recorded reason. Must not
access conversations outside their scope, view unrelated customer marketing-consent history beyond
what support requires, or bypass the consent, dedup, or staleness checks on a manual resend.
**Marketing Administrator** — a role distinct from Support/Refund Operator — may manage marketing
consent-driven campaigns once a future marketing capability is approved; this role has no authority
over transactional-notification content, templates, or the assisted-commerce boundary in V1, since
marketing capability itself is deferred. **Platform Administrator** may manage WhatsApp/provider
technical configuration, credential rotation, and template-registry administration; technical access
must not itself grant support-conversation access or marketing-consent-management authority, this
extends the least-privilege and role-separation principle already locked in
[ADR-005](./ADR-005-organization-outlet-authorization.md#v1-system-roles).

## Audit Requirements

Audit events are required for: notification-request creation; consent grant, withdrawal, and
suppression; template submission, approval, rejection, pause, and disablement; message-attempt
creation and terminal state; notification entering `REVIEW_REQUIRED`; manual resend; opt-out
processing; conversation escalation to a human agent; conversation assignment and resolution;
cancellation-request creation from an inbound message; provider-credential configuration change and
rotation; and account-quality/throughput threshold breaches. Audit context should conceptually
include actor or service identity, customer, order or conversation reference, channel, provider,
purpose, previous state, resulting state, reason, correlation identifier, and timestamp, extending the
general audit requirement already locked in
[`architecture-foundation.md`](../architecture-foundation.md#audit-requirements).

## Operational Metrics and Alerts

Track at least: notification volume by channel and category; delivery success rate; read-rate where
available; average send latency; retry rate by failure category; review-queue backlog; deduplication-
suppression count; stale-message-suppression count; consent-withdrawal rate; opt-out-processing
latency; conversation volume and escalation rate; average time-to-human-agent; account-quality signal
trend; and messaging cost by channel/category. Alert on: sustained delivery-failure rate; webhook
absence or processing backlog; authentication-failure on provider credentials; quality-rating
degradation; throughput-limit breaches; review-queue growth beyond threshold; and unexpected cost or
volume spikes. The exact observability provider remains open.

## Testing Requirements

**Unit tests** must eventually cover: consent-purpose evaluation; template resolution and variable
validation; locale-fallback resolution; deduplication-key computation; semantic-ordering/staleness
determination; retry-category normalization; and inbound-message classification routing (including
the `CANCELLATION_REQUEST`-creates-a-request-only rule).

**Integration tests** must eventually cover: a committed domain event produces exactly one
notification request; a duplicate domain event does not duplicate a notification; a stale
intermediate notification is suppressed after a later state is reached; a withdrawn consent blocks
sending without staff override; a signed, verified WhatsApp webhook is accepted and an unverifiable
one is rejected; a duplicate webhook delivery does not duplicate processing; delivery/read-status
events do not mutate order/payment/delivery/refund/consent state; an inbound cancellation message
creates a cancellation request that flows through the ADR-010 workflow rather than directly
cancelling the order; an interactive response is revalidated against current server-side state before
acting; and a staging webhook cannot affect production records.

**Concurrency and invariant tests** must establish: one notification-request deduplication key
produces at most one active notification; a notification never regresses to a semantically earlier
state after a later one has sent; a manual resend is permission-gated and audited; opt-out processing
is idempotent; and message-delivery telemetry never mutates domain state in any owning module.

The exact test frameworks remain governed by
[ADR-003](./ADR-003-modular-monolith-node-typescript.md#testing-structure).

## Meta Production-Approval Conditions

BOBA Bear's WhatsApp presence is **not** production-approved by this documentation. The following is
a launch-validation checklist, not a completed step, and must be validated before commercial
WhatsApp messaging goes live: BOBA Bear Meta Business Portfolio ownership; Meta business
verification; WhatsApp Business Account (WABA) ownership and configuration; production phone-number
registration; display-name approval; V1 transactional template approval; billing and payment setup
with Meta; verified webhook delivery in production; verified webhook-authenticity handling in
production; production messaging-limit tier confirmation; ongoing account-quality monitoring;
confirmation of current India-specific WhatsApp Business Platform pricing against official Meta
sources at the time of launch; a defined support and account-recovery procedure with Meta or a BSP;
appropriate privacy-policy presentation to customers regarding WhatsApp messaging; appropriate
opt-in presentation at account creation or first order; defined internal operations access and
ownership of the WhatsApp Business Account; a credential-rotation procedure; and confirmed
production-domain and callback/webhook configuration. None of these are satisfied by this ADR alone.

## Consequences

### Positive

- A provider-neutral Notifications-module boundary lets BOBA Bear run WhatsApp as the primary V1
  transactional channel today while keeping the option to add or change channels and providers later
  without redesigning Orders, Payments, Operations, Delivery, or Identity.
- Separating notification requests from provider message attempts, and applying the same
  deduplication and idempotency discipline already proven for payments and delivery, prevents
  duplicate or out-of-order customer messages as more event sources are added.
- Treating delivery/read-status events as non-authoritative telemetry, never a source of domain
  truth, removes an entire category of risk where WhatsApp read receipts or delivery failures could
  be mistaken for customer intent.
- A strict assisted-commerce boundary — notifications and support, not autonomous ordering, payment
  collection, or cancellation/refund approval — lets BOBA Bear use WhatsApp usefully today without
  taking on the security, compliance, and reliability burden of an AI shopping agent or in-chat
  payments before those are ready to be designed properly.
- Explicit, purpose-separated consent (order updates versus marketing) prevents a future marketing
  capability from inadvertently degrading the transactional messaging customers actually rely on for
  order status.

### Trade-offs accepted

- A full notification-request/message-attempt domain model, template registry, and consent-purpose
  model add implementation complexity beyond calling a WhatsApp SDK directly from each domain module,
  accepted because duplicate, out-of-order, or policy-violating customer messages are a direct
  customer-trust and compliance risk.
- Conservative V1 scope for WhatsApp (transactional notifications plus support, not conversational
  ordering or in-chat payment) forgoes some customer convenience a fuller "chat commerce" experience
  might offer, accepted to avoid autonomous decisions over payment, cancellation, or refunds before
  those workflows are proven safe.
- Deferring channel-fallback automation (WhatsApp-to-SMS/email) means a customer whose WhatsApp
  delivery fails depends on the PWA tracking view rather than an automatic alternate-channel message,
  accepted until a fallback matrix is separately designed and approved.

## Risks and Mitigations

| Risk | Mitigation |
| --- | --- |
| A duplicate domain event sends a duplicate customer message | Deterministic deduplication keys and idempotent notification-request creation, per [Deduplication](#deduplication) |
| An out-of-order or delayed notification confuses the customer about order status | Semantic-ordering and stale-message-suppression rules ensure only the current, superseding state is communicated, per [Semantic Ordering](#semantic-ordering) and [Expiry and Stale-Message Suppression](#expiry-and-stale-message-suppression) |
| A WhatsApp delivery or read receipt is mistaken for customer confirmation or order-affecting intent | Delivery/read-status events are locked as non-authoritative telemetry that never mutates domain state, per [Delivery/Read-Status Boundary](#deliveryread-status-boundary) |
| An inbound WhatsApp message directly cancels an order without review | Inbound cancellation messages create a request only, routed through the existing ADR-010 cancellation workflow, per [Cancellation-Request Boundary](#cancellation-request-boundary) |
| An AI classifier autonomously approves a refund, cancellation, or payment action | AI classification is restricted to proposing classification and triggering only safe, reversible, request-creating actions, per [Inbound-Message Classification](#inbound-message-classification) |
| A customer is asked for card/OTP/PIN details inside a WhatsApp conversation | Payment-credential collection in chat is prohibited outright; payment remains inside Cashfree Hosted Checkout, per [Payment-Credential Prohibition](#payment-credential-prohibition) |
| Marketing messaging degrades transactional-message deliverability or account quality | Marketing consent and marketing messaging are structurally separate and deferred beyond V1, per [Consent-Purpose Model](#consent-purpose-model) and [Marketing Boundary](#marketing-boundary) |
| A withdrawn consent is silently re-enabled by staff | Consent evidence requires new customer-sourced evidence to change state; staff cannot silently override withdrawal, per [Consent Evidence](#consent-evidence) |
| Uncontrolled sending volume degrades WhatsApp account quality or increases cost unexpectedly | Provider quality/throughput controls and messaging-cost controls with alerting, per [Provider Quality and Throughput Controls](#provider-quality-and-throughput-controls) and [Messaging-Cost Controls](#messaging-cost-controls) |
| BOBA Bear's WhatsApp presence is treated as production-ready before Meta onboarding completes | The Meta production-approval checklist is explicit and unresolved by this ADR, per [Meta Production-Approval Conditions](#meta-production-approval-conditions) |

## Explicit Non-Decisions

This decision does not resolve the following, which remain **Open** or require launch validation,
and must not be treated as answered by this ADR:

- Exact Meta Graph API version
- Exact Cloud API SDK or REST client
- Exact production WhatsApp phone number
- Exact Meta business portfolio
- Exact WhatsApp Business Account configuration
- Exact token mechanism
- Exact Meta application permissions
- Exact webhook route
- Exact webhook authenticity implementation
- Exact V1 transactional template set
- Exact template wording
- Exact launch locales
- Exact locale fallback
- Exact mandatory-versus-optional communication matrix
- Exact order-update consent wording
- Exact marketing-consent wording
- Exact retry count
- Exact retry intervals
- Exact maximum notification age
- Exact channel-fallback matrix
- Exact SMS provider for non-authentication fallback
- Exact email provider
- Exact message retention
- Exact provider-payload retention
- Exact inbound-media retention
- Exact malware-scanning service
- Exact support-console implementation
- Exact conversation-lifecycle names
- Exact agent-response SLA
- Exact marketing frequency
- Exact marketing quiet hours
- Exact messaging budget
- Exact BSP requirement (whether a Business Solution Provider is used at all)
- Exact provider-account recovery process
- Exact account-quality thresholds
- Exact observability provider
- Exact Graph API upgrade procedure

## Rejected and Deferred Alternatives

- **Full conversational ordering over WhatsApp (building or modifying a cart through chat)** —
  rejected for V1.
- **An AI shopping agent that selects items or checks out on the customer's behalf** — rejected for
  V1.
- **Autonomous checkout initiated from WhatsApp** — rejected for V1.
- **Autonomous cancellation or refund approval triggered by an inbound message or AI classifier** —
  rejected.
- **Payment-credential collection in chat** — rejected outright.
- **Voice or video support over WhatsApp** — deferred.
- **A marketing-automation engine** — deferred; requires a separate future decision per
  [Marketing Boundary](#marketing-boundary).
- **A customer-segmentation engine** — deferred.
- **Abandoned-cart marketing campaigns** — deferred.
- **Loyalty marketing campaigns** — deferred.
- **Native push notifications** — deferred; `PUSH` channel is defined but not implemented in V1.
- **A unified omnichannel contact centre spanning WhatsApp, email, and voice** — deferred.
- **Social-media direct-message integration (Instagram/Facebook DMs)** — deferred.
- **Multiple outlet-level or franchise-level WhatsApp identities** — deferred; V1 uses one
  brand-owned number.
- **A third-party BSP shared inbox as the primary support tool** — not selected; whether a BSP is
  used at all remains open.
- **Automatic machine translation at send time** — rejected; only pre-approved, human-reviewed
  locale-specific templates are sent.
- **Sentiment-driven irreversible decisions (for example, auto-refunding on detected frustration)** —
  rejected.
- **AI-generated production templates submitted without human review** — rejected; all V1 templates
  require human review before submission and use.

## Cross-Reference: ADR-013 Notification Persistence

[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#provider-event-storage) fixes how
notification state is stored. Notification requests, send attempts, and provider events all persist
in PostgreSQL, and the provider-event table is Notifications-owned, following the shared
provider-event convention with uniqueness scoped per provider, provider account, and environment.
Notification deduplication relies on a database uniqueness constraint rather than an application
check, so concurrent triggers for the same event cannot produce two messages, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#database-constraints). Outbox
consumption is at-least-once, which means notification consumers must be idempotent: duplicate
delivery of an outbox event must not produce a duplicate customer message, per
[ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md#outbox-delivery-semantics).

## Related Canonical Documents

- [`README.md`](../README.md) — the canonical documentation index and update protocol.
- [ADR-013](./ADR-013-postgresql-drizzle-migrations-persistence.md) — the persistence decision that
  fixes notification, attempt, and provider-event storage, deduplication constraints, and
  at-least-once outbox semantics for this ADR, per the cross-reference above.
- [`architecture-foundation.md`](../architecture-foundation.md) — the modular-monolith principle,
  transactional outbox, and Notification-module reference this decision implements in detail.
- [`operating-model.md`](../operating-model.md) — how WhatsApp notifications and support fit into
  day-to-day operations.
- [`order-payment-delivery-model.md`](../order-payment-delivery-model.md) — the order, payment, and
  delivery events this decision's notification triggers are drawn from.
- [`v1-product-scope.md`](../v1-product-scope.md) — the V1 WhatsApp and PWA customer experience this
  decision must support.
- [`organization-outlet-access-model.md`](../organization-outlet-access-model.md) — the role and
  permission model this decision's administrative-authority section builds on.
- [`roadmap-and-open-decisions.md`](../roadmap-and-open-decisions.md) — the open decisions this ADR
  does not resolve.
- [`decision-register.md`](../decision-register.md) — the structured register entries this ADR locks.
- [ADR-004](./ADR-004-identity-authentication-sessions.md) — the customer mobile-OTP authentication
  decision this ADR's authentication-messaging boundary and identity-resolution assumptions depend
  on.
- [ADR-005](./ADR-005-organization-outlet-authorization.md) — the scoped, permission-based
  authorization and data-minimization decision this ADR's administrative-authority section builds on.
- [ADR-009](./ADR-009-payments-webhooks-refunds-reconciliation.md) — the durable provider-event
  record, webhook idempotency, and payment-credential-handling decision this ADR's webhook,
  deduplication, and payment-credential-prohibition sections reuse the conventions of.
- [ADR-010](./ADR-010-order-lifecycle-operations-console.md) — the order lifecycle, cancellation
  request/decision separation, and Notifications-boundary decision this ADR completes with full
  notification, WhatsApp, and assisted-commerce detail.
- [ADR-014](./ADR-014-http-api-route-handlers-contracts.md) — the HTTP API decision whose
  provider-webhook boundary this ADR's WhatsApp webhook ingestion is exposed through.
- [ADR-015](./ADR-015-configuration-secrets-feature-flags.md) — the configuration and secrets
  decision that fixes how the WhatsApp Business Account credential is classified, referenced, and
  rotated, and how the WhatsApp outbound kill switch stops new sends without stopping inbound event
  recording.
