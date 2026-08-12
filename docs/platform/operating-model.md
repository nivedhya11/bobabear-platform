---
Status: SUPPORTING
Current architecture: docs/platform/ARCHITECTURE.md
Current IMP sequence: docs/platform/ROADMAP.md
Accepted state: docs/platform/STATE.md
Last updated: 2026-08-11
---

# BOBA Bear — Operating Model

## Status

**SUPPORTING.** Not current IMP/status authority. Prefer [`ARCHITECTURE.md`](./ARCHITECTURE.md),
[`ROADMAP.md`](./ROADMAP.md), and [`STATE.md`](./STATE.md) for CURRENT reads. Accepted Order
lifecycle is IMP-023 (`PLACED` \| `ACCEPTED` \| `FULFILLED` \| `CANCELLED`) per D-357; detailed
kitchen workflow in ADR-010 is deferred/historical relative to that accepted lifecycle.

This document records the dual-system operating reality that exists as long as aggregator orders and
direct orders are fulfilled through different systems, the scope of the initial Operations Console,
and provisional operational mitigations. Historical Route-Handler / ADR-014 host references in the
body are superseded by D-356 for CURRENT transport policy.

## The dual-system reality

BOBA Bear will run two order sources into the same kitchen at the same time: aggregator orders
(via Petpooja) and direct orders (via the BOBA Bear direct platform). This is not a temporary
oversight to be immediately eliminated — it is the expected operating condition for the
foreseeable future, because Petpooja remains the system of record for aggregator orders and is not
part of the direct platform.

**Aggregator order flow:**

```text
Aggregator orders
Zomato / Swiggy / Toing / others
                ↓
             Petpooja
                ↓
              Kitchen
```

**Direct order flow:**

```text
Direct orders
BOBA Bear PWA / WhatsApp
                ↓
BOBA Bear Commerce Platform
                ↓
BOBA Bear Operations Console
                ↓
              Kitchen
```

Kitchen staff will initially need to monitor **two** systems: Petpooja for aggregator orders, and
the BOBA Bear Operations Console for direct orders. Petpooja is not integrated with the direct
platform, and no such integration is planned for V1 — see
[`v1-product-scope.md`](./v1-product-scope.md) and the [decision register](./decision-register.md).

## Operational risks of the dual-system reality

Running two systems side by side creates specific, foreseeable risks that the platform and the
operating procedures around it must account for:

- **Missed direct orders** — a direct order can be overlooked if staff attention defaults to the
  more familiar Petpooja screen.
- **Duplicate menu administration** — menu items, prices, and availability may need to be
  maintained separately in Petpooja and in the direct platform's catalog.
- **Staff needing to operate two systems** — additional training and attention burden on kitchen
  and floor staff.
- **Separate direct-order status updates** — direct-order status must be updated in the Operations
  Console; it has no automatic relationship to Petpooja's state.
- **Different reconciliation paths** — end-of-day reconciliation must account for two independent
  order sources rather than one.

## Planned mitigations

The following mitigations are the current intended approach to the risks above. They describe
direction, not a finished specification:

- Prominent new-order alerts in the Operations Console.
- Sound notifications for incoming direct orders.
- Browser notifications where the customer's or staff device's browser supports them.
- A dedicated kitchen screen for the Operations Console, separate from front-of-house or admin
  views.
- Clear order-source labelling, so staff can immediately tell a direct order apart from an
  aggregator order without needing to check which screen it appeared on.
- Large, simple operational actions (accept, mark preparing, mark ready) suited to a fast-paced
  kitchen environment.
- Preparation timers to support consistent kitchen pacing.
- Operational exception alerts (for example, a payment or delivery-assignment failure) surfaced
  clearly rather than silently logged.
- Documented menu-update procedures so that keeping Petpooja and the direct platform's catalog in
  sync is a known, repeatable task rather than an ad hoc one. This duplicate catalog administration
  between Petpooja and the direct platform's own Catalog module is an accepted initial operational
  reality for aggregator versus direct channels, not an implied integration between the two — see
  [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md) and the terminology locked in
  [`product-vision.md`](./product-vision.md#terminology).

## Initial Operations Console

The first release must **not** attempt to build a full restaurant point-of-sale system. The
initial Operations Console is scoped narrowly to what direct-order fulfilment requires:

- Receive a new paid order.
- Alert kitchen staff.
- Display ordered items, variants, add-ons, and customer instructions.
- Accept or reject an order.
- Set or confirm a preparation time.
- Mark an order as preparing.
- Mark an order as ready.
- Record or assign delivery.
- Mark an order as out for delivery.
- Mark an order as delivered.
- Cancel an order where permitted.
- Request or initiate a refund.
- View payment state.
- View delivery state.
- Contact the customer.
- Identify integration or payment failures.
- Search direct orders.
- View order history and event history.

The Operations Console is designed as the future foundation of BOBA Bear's own point-of-sale
system, but V1 must remain focused on the capabilities above. Counter billing, cash-drawer
management, dine-in table management, and shift settlement are explicitly **Deferred** — see
[`v1-product-scope.md`](./v1-product-scope.md) and
[`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) for the phased evolution toward
a fuller platform.

A paid order becomes visible in this queue only after Operations releases it from a verified payment
success; V1 requires a Kitchen Operator or Outlet Manager to explicitly accept every paid order before
preparation begins, and normal preparation, ready, and handoff progression is forward-only, with any
backward correction handled through a dedicated, audited correction command rather than a casual
status edit. Cancellation requests, refund status, and operational exceptions are tracked as
first-class, separate concerns rather than folded into a single order-status field, and every
acceptance, rejection, cancellation, exception, and workflow correction produces a durable audit
event. See [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md) for the full
lifecycle, operational command model, exception model, and audit requirements this Console is built
on.

## Serviceability, outlet resolution, and pending-payment orders

The initial Dehradun outlet serves one or more explicitly configured delivery service zones, and
final outlet selection for a customer order is always platform-resolved by the Serviceability module
using those zones and coordinate-based validation — operations staff do not manually choose the
outlet during normal customer checkout, per
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#deterministic-outlet-resolution). Outlet
pause and suspension affect serviceability directly: a paused or suspended outlet must not be
selected as the responsible outlet for a new order, per
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#serviceability-outcomes). Manual
serviceability override is exceptional, permission-controlled, and audited — it is not a routine
operational tool, per
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#initial-dehradun-serviceability-model).

An order created during checkout begins in a pending-payment state and is not visible in normal
kitchen queues; the Operations Console must not surface a pending-payment order as an active kitchen
ticket. Kitchen work begins only after payment is confirmed, and a failed or abandoned checkout must
never create kitchen-visible work, per
[ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md#pre-payment-order-creation). Once
payment is verified, release into the outlet's incoming queue is itself idempotent against the
underlying payment event, so a duplicate provider event or retried release can never create a second
fulfilment workflow for the same order, per
[ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md#payment-release-into-operations).
A
browser-side "payment successful" message alone never releases an order to the kitchen: confirmation
requires a verified Cashfree webhook or an authenticated server-to-server status query, and an order
whose payment is pending, under review, mismatched, or duplicated must not appear as kitchen-visible
work until the payment is safely resolved, per
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#sources-of-payment-truth).
A duplicate or mismatched payment (for example, two successful charges against one order, or an
amount that does not reconcile) requires support or finance review before any further action, per
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#mismatch-handling). Address and
delivery details surfaced to staff remain minimized by role, consistent with the customer-data
minimization principle already locked in
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#customer-data-minimization).

## Staff access to the Operations Console

Who can see and act on which orders is governed by the membership, role, and permission model
described in [`organization-outlet-access-model.md`](./organization-outlet-access-model.md) and fixed
in full by [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md). At launch, the
exposed role set for outlet-facing operations is expected to include Outlet Manager, Kitchen
Operator, and Delivery Coordinator, with Brand Administrator and Finance Viewer roles operating
above the outlet level. See that document for the full role model and the reasoning behind scoped,
permission-based authorization.

Every workforce action must remain attributable to a named individual identity; shared kitchen
logins or shared operational accounts are prohibited, per
[ADR-004](./decisions/ADR-004-identity-authentication-sessions.md#workforce-rules). Outlet-scoped
roles operate strictly within their assigned outlet or outlets — a Kitchen Operator or Delivery
Coordinator at one outlet has no standing access to another outlet's orders, staff, or customer
data, and a Support or Refund Operator may approve refunds only within explicitly configured
authority. Brand-level access does not collapse this boundary: a Brand Administrator's ability to
reach outlet-level operations still depends on an explicit, permitted scope, not general brand
seniority. Emergency break-glass platform access is a narrowly controlled, audited, time-limited
mechanism reserved for incidents and lockout recovery — it is not a routine way to bypass outlet-,
refund-, or catalog-scoped access during normal operations. See
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#break-glass-access) for the full
break-glass requirements.

## Catalog definition versus operational availability

Outlet staff operate the Operations Console day to day with simple controls: an Outlet Manager or
Kitchen Operator may mark a product, variant, or modifier option unavailable, resume availability, and
pause or resume outlet ordering, and these operational availability changes are expected to take
effect quickly for the customer-facing menu. Outlet staff do not redefine the canonical BOBA Bear
brand catalog — product identity, variant structure, and modifier structure remain brand-controlled.
Catalog definition changes (adding a product, changing modifier structure, publishing a menu revision)
and operational availability changes (marking an item sold out, pausing outlet ordering) are
deliberately different workflows, owned by different roles, per
[ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md#catalog-administration-authority).

## Pricing and refund operations

Day-to-day pricing administration is a brand-authorized activity, not a routine outlet task.
Brand-authorized users maintain direct-order price books, packaging-charge definitions, delivery
pricing rules, and promotions; Outlet Managers normally view effective prices and report pricing
errors, but do not change customer-facing prices unless a future pricing permission is explicitly
granted, per
[ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#administration-authority). BOBA
Bear's direct-order prices are managed separately from Petpooja and aggregator-channel prices — the
duplicate menu-administration reality described above extends to price maintenance, not only to
product and availability data.

The customer delivery charge may differ from the delivery-provider cost; any merchant-funded subsidy
must remain visible to operations staff rather than hidden inside a single delivery-fee number, per
[ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#delivery-charge-and-provider-cost).
Refunds and other manual monetary adjustments require explicit permission and produce an audit
record — a valid Operations Console session alone does not authorize a refund, consistent with
[ADR-005](./decisions/ADR-005-organization-outlet-authorization.md#v1-system-roles). Refunds are
requested and approved through BOBA Bear's own Refund workflow, following approval policy and
reusing the original order's pricing and tax allocations; refunds issued directly through the
Cashfree merchant dashboard are an emergency-only path, and any such refund must still be detected,
reconciled, linked to the original order, audited, and reflected in customer-facing status, per
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#emergency-dashboard-refunds).
Finance staff review payment and refund reconciliation, settlement mismatches, and dispute or
chargeback cases as part of routine operations, per
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#scheduled-payment-reconciliation).
Technical access to payment-provider credentials does not itself grant refund authority, and refund
approval remains a separate, scoped permission from routine payment or catalog administration, per
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#payment-administration-authority).
When Cashfree is unavailable, the platform pauses new payment initiation and shows payment as
temporarily unavailable rather than accepting an unverified or assumed-successful payment; operators
are alerted when outage thresholds are crossed, per
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#provider-outage-behaviour).
Tax-policy changes (for example, activating a revised GST configuration) are a Finance/Tax Administrator
activity, not a routine outlet operation, per
[ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#administration-authority).

## Delivery coordination

The initial Dehradun outlet may use an API-integrated provider, a business-dashboard provider, or a
controlled manual local provider — whichever combination of provider capability is actually
validated at launch. Rapido is the first commercial-validation candidate; it is not an approved
integration, and its Dehradun coverage, food-delivery suitability, API availability, and commercial
terms remain subject to direct validation, per
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#provider-validation-order).
Manual local delivery is a controlled, supported, and audited operating mode, not an undocumented
workaround, per
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#delivery-operating-modes).

Day to day, the **Delivery Coordinator** owns routine delivery-request creation and recovery,
approved fallback-provider selection, manual courier assignment, delivery-exception management, and
return requests, per
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#administrative-authority). The
**Kitchen Operator** verifies pickup and records package handoff, but does not select providers,
change provider cost, or mark a delivery complete. **The public order number alone never authorizes
pickup** — a bound, single-use pickup-verification mechanism is required before outlet staff release
a prepared order to a courier, per
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#pickup-verification), and
Operations and Delivery handoff is coordinated in one transaction, per
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#coordinated-handoff).

When the primary delivery provider is unavailable, operations must use only an already-approved
fallback mode rather than creating uncontrolled duplicate bookings across untested providers, per
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#provider-outage-behaviour). A
failed delivery attempt and an undelivered return each require explicit operational resolution — a
failed delivery must not automatically become delivered, cancelled, refunded, or completed, and every
delivery request carries an approved return destination, normally the originating outlet, per
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#delivery-failure) and
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#return-workflow). Returned
food does not automatically return to saleable stock; the outlet must record an explicit outcome
(disposal, quality review, safe internal handling, or another approved outcome), per
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#returned-food-handling).
Provider delivery costs are reconciled separately from the customer delivery charge already locked in
[ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md#delivery-charge-and-provider-cost);
a provider-cost change never rewrites what the customer was charged, per
[ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md#delivery-cost-reconciliation).

## Customer support

Customer-initiated contact about a direct order (delivery delay, item issue, refund request) is
expected to be handled by staff with access to the Operations Console. WhatsApp is BOBA Bear's
primary channel for both proactive transactional order communication and customer-initiated support,
using the single brand-owned WhatsApp Business Account fixed by
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#brand-owned-messaging-identity)
— support staff must never use a personal WhatsApp number for customer-facing order communication,
and must follow the approved conversation and escalation workflows rather than ad hoc messaging.
A customer message asking to cancel an order creates a cancellation *request* only; it never
directly cancels the order, and proceeds through the same cancellation-request and decision workflow
already fixed by
[ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md#cancellation-request-and-decision),
per
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#cancellation-request-boundary).
Ambiguous payment, refund, cancellation, or delivery issues raised over WhatsApp escalate to a human
agent rather than being resolved automatically, per
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#human-escalation). Staff
and automated flows must never request card numbers, CVV, UPI PINs, net-banking passwords, or OTPs
in a WhatsApp conversation; payment always happens inside Cashfree Hosted Checkout, per
[ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md#hosted-checkout-boundary)
and
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#payment-credential-prohibition).
A transactional-communication failure (a WhatsApp message that fails to send or deliver) never
changes order, payment, delivery, or refund state — the PWA's tracking view remains authoritative
regardless of messaging outcome, per
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#deliveryread-status-boundary).
Marketing consent remains a separate, explicit opt-in from the transactional order/delivery/support
consent customers give simply by placing an order, per
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#transactionalmarketing-separation);
staff cannot silently re-enable a customer's withdrawn consent without new evidence. A manual resend
of a stuck or failed notification is a permissioned, audited action, not a routine one, per
[ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md#review-and-manual-resend).
The exact customer-support staffing model, escalation SLA, and conversation-console implementation
are not yet defined and are recorded as open decisions in
[`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md).

## Operational implications of the system of record

Several persistence decisions have direct operational consequences for the people running outlets and
supporting customers. They are stated here in operational terms; the technical decision is
[ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md).

- **PostgreSQL is the system of record.** What the database has committed is what happened. When a
  provider dashboard, a WhatsApp message, and the Operations Console disagree, the Console's view of
  committed state is the reference point for investigation.
- **Provider calls happen after committed state.** An order is recorded before the payment or
  delivery provider is contacted. Staff may therefore briefly see an order that exists in BOBA Bear
  before it exists at a provider; this is expected and is not a defect.
- **Background retries are normal and safe.** Workers retry notification sends, dispatch requests,
  and callback processing. Retries are designed to be idempotent, so a repeated attempt does not
  produce a duplicate order, a duplicate refund, or a duplicate customer message. Staff should not
  manually re-trigger an action simply because it appears to be taking a second attempt.
- **Dead-lettered and unreconciled work needs a human owner.** Events that fail repeatedly stop
  retrying and require operational review. Someone must be responsible for watching that queue daily
  and for the reconciliation exceptions raised against payment and delivery providers; a manual
  replay is a permissioned, audited action with a recorded reason.
- **Database migrations are a controlled release activity.** Schema changes ship as part of a normal
  release, are applied by an automated pre-deployment step, and are not performed ad hoc during an
  outlet's trading hours without an agreed change window.
- **Backup and restore testing are launch-readiness requirements.** Before broad public launch, an
  independent backup must exist and a restore must have been performed and verified. A backup that
  has never been restored is not treated as a backup.
- **Manual production database changes are emergency-only.** Direct changes to production data or
  schema are reserved for audited incident recovery, require an incident reference and an authorized
  actor, and must be followed by a corrective change in the normal release process.

## Related documents

- [`v1-product-scope.md`](./v1-product-scope.md) — the customer- and operations-facing scope this model fulfils.
- [ADR-013](./decisions/ADR-013-postgresql-drizzle-migrations-persistence.md) — the PostgreSQL and Drizzle persistence decision behind the system-of-record, retry, dead-letter, migration, and backup/restore expectations summarized above.
- [`order-payment-delivery-model.md`](./order-payment-delivery-model.md) — the order, payment, and delivery states the Operations Console must reflect.
- [`organization-outlet-access-model.md`](./organization-outlet-access-model.md) — roles and permissions governing Operations Console access.
- [ADR-005](./decisions/ADR-005-organization-outlet-authorization.md) — the full scoped-authorization, delegation, and break-glass decision behind the access boundaries summarized above.
- [ADR-006](./decisions/ADR-006-food-catalog-assortment-availability.md) — the full food-catalog, assortment, and operational-availability decision behind the availability controls summarized above.
- [ADR-007](./decisions/ADR-007-pricing-tax-charges-promotions.md) — the full pricing, tax, charge, and promotion decision behind the pricing- and refund-operations summary above.
- [ADR-008](./decisions/ADR-008-serviceability-cart-checkout.md) — the full serviceability, outlet-resolution, and pre-payment-order decision behind the serviceability and pending-payment-order boundaries summarized above.
- [ADR-009](./decisions/ADR-009-payments-webhooks-refunds-reconciliation.md) — the full payment-verification, refund, reconciliation, and provider-outage decision behind the kitchen-release, refund-operations, and provider-outage summaries above.
- [ADR-010](./decisions/ADR-010-order-lifecycle-operations-console.md) — the full direct-order lifecycle, outlet-acceptance, operational-command, timer, cancellation, exception, and audit decision behind the Operations Console summary above.
- [ADR-011](./decisions/ADR-011-delivery-providers-dispatch-fulfilment.md) — the full delivery-provider abstraction, operating-mode, dispatch, courier-assignment, pickup-verification, provider-outage, return, and delivery-cost-reconciliation decision behind the delivery-coordination summary above.
- [ADR-012](./decisions/ADR-012-notifications-whatsapp-assisted-commerce.md) — the full notifications, WhatsApp, and assisted-commerce decision behind the customer-support summary above, including the brand-owned messaging identity, the cancellation-request boundary, human escalation, and the payment-credential prohibition.
- [ADR-014](./decisions/ADR-014-http-api-route-handlers-contracts.md) — the full HTTP API, Route Handler, operational-command idempotency and concurrency, and provider-webhook decision behind the Operations Console's own HTTP boundary summarized above.
- [ADR-015](./decisions/ADR-015-configuration-secrets-feature-flags.md) — the configuration, feature-flag, and kill-switch decision behind any provider enablement, outlet-provider selection, or emergency kill switch (checkout, payment, delivery, WhatsApp) an operator activates from the Operations Console; kill switches stop new initiation only and never abandon in-flight orders, deliveries, or reconciliation.
- [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) — the phased evolution from this initial console toward a fuller operations platform.
- [`decision-register.md`](./decision-register.md) — structured record of the decisions summarized here.
