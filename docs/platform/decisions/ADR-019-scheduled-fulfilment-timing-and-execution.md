---
Status: Accepted
Decision date: 2026-09-25
Last updated: 2026-09-25
Decision ID: D-379 (CURRENT)
Amends: D-378 (ASAP-only / no-scheduled-schema reservation only)
Amended by: none
---

# ADR-019: Scheduled Fulfilment Timing and Execution Boundary

## Status

**Accepted** (2026-09-25). Register identity **[D-379](../decision-register.md)** is **CURRENT**.
Global architecture tip is **ARCH-R23**. Invariant **ARCH-G29** is **CURRENT**. Independent
Architecture Fit review `5312653831` = **PASS**. Implementation remains **NOT_AUTHORIZED**.

```text
D-379_STATUS: CURRENT
ADR019_STATUS: Accepted
D-380_STATUS: CURRENT
ADR020_STATUS: Accepted
ARCH-R23_STATUS: CURRENT
ARCH-G29_STATUS: CURRENT
ARCH-G30_STATUS: CURRENT
IMP036I_ARCHITECTURE_FIT: PASS
IMP036I_ARCHITECTURE_LOCKED: YES
IMP036I_IMPLEMENTATION_AUTHORIZED: NO
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID: 5312653831
CURRENT_ARCHITECTURE: ARCH-R23
CURRENT_D378: AMENDED
CURRENT_ADR018: AMENDED
CURRENT_ARCH_G28: CURRENT
HUMAN_ARCHITECTURE_DIRECTION_D380: APPROVED_2026-09-25
```

Locked capability architecture:

[`../capabilities/IMP-036I-scheduled-fulfilment.md`](../capabilities/IMP-036I-scheduled-fulfilment.md)

## Context

`PD-IMP-036I-DRAFT-4` (APPROVED; Product Definition Gate PASS; independent review `5307761142`)
requires Scheduled Fulfilment as an orthogonal timing axis (`ASAP | SCHEDULED`) for both
`DELIVERY` and `PICKUP`, without inventing ScheduledOrder aggregates, new Order lifecycle statuses,
slot capacity engines, automatic Delivery booking, or new deployable schedulers.

Independent Architecture Fit review `5309072645` returned **STOP**. This Proposed ADR was updated
only as needed to encode Fit remediation for Brand missing-row defaults and the full
`SCHEDULED_FULFILMENT_REMINDER` notification contract. A subsequent independent Fit review
`5309240283` returned **STOP** on reminder vs `OUT_FOR_DELIVERY` ordering; this Proposed ADR was
further remediated so `SCHEDULED_FULFILMENT_REMINDER` co-stages at rank **40** with
`OUT_FOR_DELIVERY` under the existing strict-greater-than staleness model. PR #262 review thread
`4097747389` returned a further **STOP** finding: rank-50 `DELIVERED` notification staleness alone
is insufficient because `recordProofAndDeliver` can durably set `Delivery.status = DELIVERED` while
Order remains `ACCEPTED` and the `DELIVERED` notification is not yet processed. This Proposed ADR
was further remediated so send-time eligibility suppresses a Scheduled Delivery reminder when
authoritative Delivery execution truth is already `DELIVERED`, independent of notification catch-up.
Independent Architecture Fit review `5309837751` (PR #263 threads `4097911250` /
`4097911261`) returned **STOP** on Delivery completion authority: the candidate must not legalize
normal replacement after `DELIVERED`, must not treat a prior `DELIVERED` fact as irrelevant, and
must not depend on an unguaranteed unique “lineage tip.” Independent Architecture Fit review
`5309972440` (PR #264 finding `4098211380`) returned a further **STOP**: CURRENT locked IMP-031
“authoritatively inactive” wording, historical/future-intent ADR-011, and accepted runtime
`createDelivery` acceptance of a `DELIVERED` predecessor were not sufficiently reconciled to let
IMP-036I silently choose replacement semantics. Human architecture direction **APPROVED
2026-09-25** for **D-380 / ADR-020** (Delivery Successful-Completion Finality). Those STOP reviews
are historical. Independent Architecture Fit review `5312653831` returned **PASS**, and this lock
persistence promotes D-379 and D-380 to **CURRENT** as separate decisions. Scheduled Delivery
reminder completion depends on **CURRENT D-380 / ADR-020**: deterministic
`EXISTS Delivery.status = DELIVERED` suppression; D-379 does **not** redefine Delivery replacement
semantics; current runtime `createDelivery` acceptance of a `DELIVERED` predecessor remains
`PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT` against CURRENT D-380 (not architecture precedent).

Verified tip after lock persistence:

```text
ROADMAP = GTM-R154
STATE = STATE-R152
ARCHITECTURE = ARCH-R23
DECISION_REGISTER = DR-21
```

Evidence constraints from repository inspection (Fit candidate):

- D-378 / ARCH-G28 CURRENT explicitly lock ASAP-only timing and reserve scheduled schema to IMP-036I
  (`ARCHITECTURE.md` ARCH-G28; IMP-036H AF-036H-14).
- Mutable Checkout and immutable Checkout Snapshot already own fulfilment **mode**
  (`fulfilment_mode`, `pickup_outlet_id`; migration `0044_imp036h_fulfilment_mode_pickup.sql`).
- Order references Snapshot (`checkout_snapshot_id`) and does not duplicate mode authority.
- `prepareCheckoutForPayment` already revalidates merchandise/mode eligibility and binds Payment to
  Snapshot (`src/server/checkout/prepare.ts`).
- IMP-036E provides Outlet timezone + weekly intervals; **no** date-specific closure table exists.
- No lead-time or cancellation-cutoff persistence exists yet (product policy only).
- IMP-032 locks `MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY` (operator-approved; no auto dispatch).
- PostgreSQL outbox already has `available_at`; `NotificationOutboxProcessor` owns notification
  event types and marks unknown types published untouched — unsafe as a generic business-action bus.
- CURRENT notification foundation (`NOTIFICATION_SEMANTIC_ORDER_RANKS`,
  `createNotificationRequestFromDomainEvent` → `notificationExpiryFor(occurredAt)`) uses a global
  transactional max age of **24 hours** — incompatible with a tomorrow-evening reminder unless a
  semantic-specific expiry boundary is defined.
- Safe existing permissions: `brand.update`; `outlet.operating_schedule.manage` / `.read`.

## Decision Summary

```text
FULFILMENT_TIMING = ASAP | SCHEDULED
orthogonal to FULFILMENT_MODE = DELIVERY | PICKUP (D-378 / ARCH-G28)

Mutable pre-payment intent: Checkout (fulfilmentTiming + selected window when SCHEDULED)
Immutable paid truth: Checkout Snapshot seals:
  fulfilment_timing
  scheduled_window_start_at / scheduled_window_end_at (UTC timestamptz)
  scheduled_timezone (IANA identity used for the promise)
  scheduled_cancellation_cutoff_minutes (0–240; mode-evaluated Brand effective policy at bind)

Order: projects Snapshot timing; no mutable Order timing authority
No ScheduledOrder / PickupScheduledOrder / DeliveryScheduledOrder
No Order statuses SCHEDULED | READY | DUE | LATE | OVERDUE (derived cues only)

NO Slot aggregate / capacity / reservation engine (FD-036I-04)
Eligibility: server-authoritative composition over hours + minimal future closures + lead times
Lead times: Outlet scheduling profile (fail closed if absent)

Cancellation policy: Brand scheduled-fulfilment policy table
  ABSENT ROW = EFFECTIVE PRODUCT DEFAULTS (authoritative server behaviour):
    effectivePickupCancellationCutoffMinutes   = 30
    effectiveDeliveryCancellationCutoffMinutes = 60
    effectivePolicyRevision                    = 0
    source                                     = PRODUCT_DEFAULT
  Admin read projection returns effective values even when no row exists
  First explicit update: expectedRevision = 0 → atomic INSERT → persisted revision = 1
  Concurrent first updates: unique Brand PK + expectedRevision CAS (one wins; loser stale)
  Snapshot sealing always consumes resolved effective numeric cutoff
  Pre-payment stale comparison compares effective business terms (not mere row existence):
    missing 30/60 → insert same 30/60 does NOT alone require reconfirm
  Absent row must never mean unknown / null / Scheduled unavailable / 0 / implementation-defined
  Eager Brand policy backfill not required

Future closures: minimal outlet_operating_date_exceptions (CLOSED_FULL_DAY)
current temporary PAUSED ≠ future closed forever

Pre-payment: extend prepareCheckoutForPayment; stale effective cancellation terms block bind
Purchased cancel: compare now vs sealed cutoff; no fee; later Brand changes do not rewrite history

Execution:
  Pickup: immediate Ops visibility; no prep-release state
  Delivery: preserve IMP-032 manual operator-approved dispatch; no timer auto-book

Reminder (full Notification semantic contract under ADR-012 / IMP-033 / IMP-034):
  NotificationSemanticType = SCHEDULED_FULFILMENT_REMINDER
  Purpose                  = ORDER_UPDATES
    (not DELIVERY_UPDATES; orthogonal time-bound communication for Pickup and Delivery)
  Recommended order rank   = 40
    INTENTIONAL co-stage with OUT_FOR_DELIVERY under existing strict-greater-than staleness
    (ORDER_RECEIVED=10, PAYMENT_CONFIRMED=20, ORDER_ACCEPTED=30,
     SCHEDULED_FULFILMENT_REMINDER=40, OUT_FOR_DELIVERY=40, DELIVERED=50,
     ORDER_CANCELLED=60)
  Co-stage semantics:
    ORDER_ACCEPTED(30) never suppresses reminder(40)
    OUT_FOR_DELIVERY(40) already sent MUST NOT suppress reminder(40)
    Reminder(40) already sent MUST NOT suppress later OUT_FOR_DELIVERY(40)
    DELIVERED(50) / ORDER_CANCELLED(60) may suppress reminder not yet sent (staleness)
    DELIVERED rank 50 is NOT the sole delivered-state gate (see send-time Delivery gate)
    Either-order Delivery example (both valid):
      T-45 OUT_FOR_DELIVERY then T-30 reminder; or T-30 reminder then T-20 OUT_FOR_DELIVERY
  Reminder is NOT a Delivery lifecycle transition; tied to immutable Scheduled window promise
  Stable domainEventRef    = order:<orderId>:scheduled_fulfilment_reminder
                             (or repository-native deterministic equivalent)
  Exactly one logical reminder per Order; no generic Scheduled-business event family
  Atomic intent with successful Scheduled Order materialization where outbox conventions allow
  In-window purchase: do not enqueue proactive reminder
  Future expiry (semantic-specific; do NOT globally raise 24h max age):
    valid only while reminder_due_at <= now < scheduled_window_start_at
    expire / suppress once now >= scheduled_window_start_at
  Send-time eligibility (re-read Order + Snapshot; DELIVERY mode also reads Delivery truth;
    do not mutate Order / Delivery; no cancel/refund; Notifications read-only vs Delivery):
    suppress if CANCELLED
    OR FULFILLED
    OR window started
    OR missing-inconsistent
    OR not SCHEDULED
    OR (FULFILMENT_MODE = DELIVERY AND EXISTS authoritative Delivery for the exact Order
        with execution status DELIVERED)
    Delivery.status = DELIVERED is durable successful Delivery execution truth under
      human-approved D-380 / ADR-020 PROPOSED candidate (not yet CURRENT)
    After future lock:
      D-379 governs Scheduled timing/execution boundary
      D-380 governs Delivery successful-completion finality
      D-379 does NOT redefine Delivery replacement semantics itself
    A normal replacement MUST NOT follow DELIVERED under D-380 candidate direction;
      FAILED / CANCELLED replacement remains only where existing accepted Delivery
      prerequisites already permit (D-380 does not expand eligibility);
      post-pickup failure / return / support rules preserved; no new provider-switch path
    Until separately authorized Delivery correction defines how a committed DELIVERED fact
      becomes non-authoritative for customer fulfilment, any authoritative DELIVERED fact
      for the exact Order remains sufficient to suppress the Scheduled Delivery reminder
    Reminder suppression does NOT depend on choosing a unique lineage tip, latest-row-wins,
      createdAt ordering, highest revision, caller-selected Delivery, or current_delivery_id
    Nonconformant history (safe read-only reminder behaviour):
      no Deliveries / BOOKED|PICKED_UP only / FAILED|CANCELLED only → gate does NOT suppress
      any DELIVERED fact → suppress (never treat prior DELIVERED as irrelevant)
      DELIVERED + later active / FAILED|CANCELLED / multiple DELIVERED → suppress + diagnostic
    Notification semantic DELIVERED remains secondary communication
    Rank-50 staleness remains valid but is not the sole delivered-state gate;
      no Notification request/attempt row is required before recognizing Delivery completion
    PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT:
      current createDelivery permits DELIVERED predecessor — VERIFIED runtime behaviour;
      nonconformant relative to approved D-380 candidate (not silently rewritten as CURRENT
      IMP-031 meaning); DELIVERY_CONFORMANCE_OBLIGATION before IMP-036I acceptance:
      at minimum reject normal replacement after DELIVERED (do not implement in this ADR)
    PICKUP: do not create or query Delivery merely for reminder logic (D-378 / ARCH-G28)
    co-stage ordering MUST NOT bypass these gates
  Content: immutable Checkout Snapshot (mode, window, sealed timezone, Pickup location context)
  No new notification provider; template registry gains semantic under IMP-033/034
  Later implementation proof expectations (Fit remediation; not runtime tests here):
    A Order ACCEPTED + no DELIVERED → reminder may remain eligible;
    B OUT_FOR_DELIVERY sent + Delivery not DELIVERED → reminder eligible;
    C reminder→later OUT_FOR_DELIVERY eligible;
    D Delivery DELIVERED + Order still ACCEPTED + DELIVERED notification not processed
      → reminder SUPPRESSED (EXISTS DELIVERED gate);
    E Delivery DELIVERED + Order later FULFILLED → suppressed;
    F DELIVERED semantic dispatched → rank-50 staleness also suppresses;
    G PICKED_UP alone does NOT suppress; H BOOKED alone does NOT suppress;
    I FAILED/CANCELLED history only does NOT suppress;
    J DELIVERED + later active nonconformant → SUPPRESSED + diagnostic
      (DELIVERED never irrelevant);
    K DELIVERED + later FAILED/CANCELLED nonconformant → SUPPRESSED + diagnostic;
    L Pickup FULFILLED suppresses without Delivery lookup;
    M CANCELLED suppresses; N window start suppresses; O in-window purchase never enqueued;
    P createDelivery / normal replacement with prior DELIVERED → rejected (D-380);
    Q prior FAILED where existing replacement prerequisites satisfied → preserved;
    R prior CANCELLED where existing replacement prerequisites satisfied → preserved;
    S post-pickup FAILED → no unauthorized provider-switch; existing failure/return/support;
    T committed DELIVERED + failed Order fulfil-coordination → no new normal replacement;
      reminder suppressed; coordination/support recovery remains separate;
    U incorrect DELIVERED fact → no silent backward transition; separately authorized correction

Topology: no new deployable service / queue / broker / workflow engine / external provider
Auth: no new role / permission / auth realm
```

Proposed global invariant **ARCH-G29**:

> Checkout owns mutable pre-payment fulfilment timing intent. Checkout Snapshot owns immutable
> purchased fulfilment timing truth. `FULFILMENT_TIMING = ASAP | SCHEDULED`. For SCHEDULED, the
> Snapshot seals scheduled window start/end, Outlet timezone identity used for that promise, and
> effective cancellation-cutoff minutes. Order references/projects Snapshot timing; no ScheduledOrder
> aggregate; no new Order lifecycle statuses for due/late. Timing is orthogonal to
> `FULFILMENT_MODE = DELIVERY | PICKUP`.

### Future D-378 amendment (on lock only)

D-379 amends D-378 **only** where D-378 currently says ASAP-only and “no scheduled-fulfilment
schema.” D-378 continues to govern mode, Pickup fail-closed Delivery boundary, selected Outlet,
Pickup privacy/destination boundary, and Pickup delivery-charge boundary.

Future ARCH-G28 wording (not applied while this ADR is Proposed): fulfilment mode is orthogonal to
fulfilment timing; Scheduled timing is governed by D-379 / ARCH-G29.

## Authorities preserved

| Authority | Preservation |
|---|---|
| D-378 / ADR-018 / ARCH-G28 | Mode ownership + Pickup fail-closed; ASAP reservation amended only on lock |
| D-357 | Order lifecycle unchanged |
| D-359 / D-360 | Customer `/api/v1/*` |
| D-372 / D-373 | Operations / Admin transports |
| D-365…D-367 / D-364 | Financial documents / refunds |
| ADR-011 / IMP-031 / IMP-032 | Delivery foundation + manual Dehradun mode; IMP-031 remains CURRENT/LOCKED; ADR-011 remains HISTORICAL/future-intent (not rewritten as CURRENT); successful-completion finality clarified by **D-380** PROPOSED |
| D-380 / ADR-020 | PROPOSED Delivery successful-completion finality; reminder completion depends on this candidate; D-379 does not redefine replacement |
| ADR-012 / IMP-033 / IMP-034 | Notification platform; reminder extends owned semantic + outbox family only; 24h max-age retained for non-reminder semantics |
| ADR-005 | Permission reuse; no role-name bypass |
| D-377 | Program pause / IMP-037/038 hold |

## Rejected alternatives

- ScheduledOrder / PickupScheduledOrder / DeliveryScheduledOrder aggregates
- New Order lifecycle states SCHEDULED / READY / DUE / LATE / OVERDUE
- Slot capacity / reservation / last-seat engine in V1
- Automatic Delivery booking on a timer in V1
- Generic workflow engine / new queue / broker / Redis / Kafka / RabbitMQ
- New deployable scheduler service or container
- Browser-authoritative slot / cutoff / timezone truth
- Reconstructing historic timing from mutable Brand/Outlet config after purchase
- Putting independent timing authority on Order
- Treating current temporary PAUSED as “future closed forever”
- Using generic `app.outbox_events` as a Scheduled business-action bus under current notification
  processor semantics
- Inventing a new role or permission when `brand.update` /
  `outlet.operating_schedule.manage` suffice
- Treating absent Brand policy row as unknown / null / Scheduled unavailable / 0 minutes /
  implementation-defined fallback
- Globally raising transactional notification max age for all semantics to accommodate reminders
- Dedicating a standalone Reminder user story (reminder remains AC-036I-044 under
  US-036I-007 / US-036I-010)
- Placing `SCHEDULED_FULFILMENT_REMINDER` at rank 35 (between `ORDER_ACCEPTED` and
  `OUT_FOR_DELIVERY`) — early Delivery dispatch would suppress the mandatory reminder under
  existing strict-greater-than staleness; rejected in favour of intentional co-stage rank 40
- Changing Purpose to `DELIVERY_UPDATES` (Pickup requires the same reminder without Delivery events)
- Inventing reminder-specific browser/UI ordering exceptions or changing global staleness beyond
  the co-stage rank assignment
- Treating rank-50 `DELIVERED` notification staleness as the sole delivered-state gate for reminder
  suppression (insufficient when Delivery is already `DELIVERED` but Order fulfil-coordination /
  notification processing has not caught up)
- Creating or querying a Delivery aggregate for Pickup reminder eligibility
- Allowing Notifications to mutate Delivery, fulfil Order, retry fulfil coordination, cancel Order,
  refund Payment, or create a Delivery as part of reminder send-time evaluation
- Legalizing a normal replacement Delivery after `DELIVERED` (conflicts with approved D-380 /
  ADR-020 candidate direction; IMP-036I does not authorize that change)
- Treating a prior authoritative `DELIVERED` fact as irrelevant because a later normal Delivery
  exists
- Depending on a unique “current lineage tip,” latest-row-wins, `createdAt` ordering authority,
  highest revision across Deliveries, caller-selected current Delivery, or a new
  `current_delivery_id` pointer to decide reminder suppression
- Using current runtime `createDelivery` acceptance of a `DELIVERED` predecessor as architecture
  precedent (that behaviour is `PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT` relative to D-380)
- Inventing a Delivery terminal-correction mechanism or schema inside IMP-036I Fit
- Merging D-379 and D-380 into one decision (D-380 is durable Delivery-domain; D-379 owns Scheduled
  timing)
- Expanding FAILED / CANCELLED replacement into a blanket “always replaceable” rule
- Pretending ADR-011 is CURRENT decision authority merely to force replacement semantics
- Claiming Architecture Fit PASS or promoting D-379 / D-380 while still Proposed

## Consequences

### Positive

- Orthogonal timing axis without rewriting D-378 mode architecture
- Purchased promise sealed on Snapshot (including effective cancellation cutoff)
- Absent Brand policy rows resolve deterministically to product defaults without eager backfill
- Reminder receives a complete Notification semantic contract (identity, rank, purpose, expiry,
  send-time eligibility including authoritative Delivery `DELIVERED` gate for Delivery mode,
  Snapshot-derived content) without a new provider or generic scheduler
- Reminder send gate recognises durable Delivery completion via deterministic
  `EXISTS Delivery.status = DELIVERED` before Order fulfil-coordination or `DELIVERED`
  notification catch-up, without mutating Delivery from Notifications and without depending on a
  unique lineage tip; nonconformant post-`DELIVERED` history still suppresses with diagnostic
- Records `PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT` / `DELIVERY_CONFORMANCE_OBLIGATION` so later
  implementation restores D-380 conformance (reject normal replacement after `DELIVERED`) without
  inventing a new Delivery model in Fit; depends on human-approved D-380 / ADR-020 candidate without
  claiming D-380 CURRENT
- Reuses Checkout revision, Payment bind, Ops projections, notification outbox, IMP-032 dispatch
- No new deployable topology or auth surface

### Negative / accepted constraints

- Forward-only schema migration required (Checkout, Snapshot, Brand policy, Outlet scheduling
  profile, minimal future-closure table)
- Scheduled eligibility fail-closed until Outlet lead-time profile configured
- Notification processor event-family + semantic registry extension required for reminder ownership
- Semantic-specific future-expiry path required so 24h max-age does not discard valid tomorrow
  reminders; other semantics retain current max-age policy

### Deferred

- Per-slot capacity / labour / predictive engines (FOLLOW_UP)
- Kitchen PREPARING / READY_FOR_PICKUP statuses
- Customer self-service reschedule
- Automatic provider booking automation beyond IMP-032

## Non-decisions

This Accepted ADR does **not**:

- authorize IMP-036I implementation or schema execution
- redefine Delivery replacement semantics (owned by D-380 / ADR-020)
- activate IMP-039 / IMP-040
- accept IMP-036I / IMP-037 / IMP-038
- change approved Product Definition semantics
- fix `PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT` in runtime
