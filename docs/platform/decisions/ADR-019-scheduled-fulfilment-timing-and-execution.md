---
Status: Proposed
Decision date: 2026-09-25
Last updated: 2026-09-25
Decision ID: D-379 (PROPOSED — not CURRENT)
Amends: D-378 (ASAP-only / no-scheduled-schema reservation only — after future lock)
Amended by: none
---

# ADR-019: Scheduled Fulfilment Timing and Execution Boundary

## Status

**Proposed** (2026-09-25). Register identity **[D-379](../decision-register.md)** is **PROPOSED**
only. Global architecture tip remains **ARCH-R22**. Proposed invariant **ARCH-G29** and architecture
revision **ARCH-R23** are recorded in this ADR and the IMP-036I Architecture Fit candidate; they
are **not** CURRENT until independent Architecture Fit review PASS and authorized lock persistence.

```text
D-379_STATUS: PROPOSED
ADR019_STATUS: Proposed
ARCH-R23_STATUS: PROPOSED_LOCK_DELTA (not applied to ARCHITECTURE.md meta)
ARCH-G29_STATUS: PROPOSED
IMP036I_ARCHITECTURE_FIT: NOT_PERFORMED
IMP036I_ARCHITECTURE_LOCKED: NO
IMP036I_IMPLEMENTATION_AUTHORIZED: NO
CURRENT_ARCHITECTURE: ARCH-R22
CURRENT_D378: CURRENT
CURRENT_ADR018: Accepted
CURRENT_ARCH_G28: CURRENT
```

Capability Fit candidate:

[`../capabilities/IMP-036I-scheduled-fulfilment.md`](../capabilities/IMP-036I-scheduled-fulfilment.md)

## Context

`PD-IMP-036I-DRAFT-4` (APPROVED; Product Definition Gate PASS; independent review `5307761142`)
requires Scheduled Fulfilment as an orthogonal timing axis (`ASAP | SCHEDULED`) for both
`DELIVERY` and `PICKUP`, without inventing ScheduledOrder aggregates, new Order lifecycle statuses,
slot capacity engines, automatic Delivery booking, or new deployable schedulers.

Verified CURRENT tip at Fit candidate authoring:

```text
ROADMAP = GTM-R153
STATE = STATE-R151
ARCHITECTURE = ARCH-R22
DECISION_REGISTER = DR-20
MAIN_HEAD = 56047b284ff116c301d8d3eedd55661d26ae3a5e
MAIN_TREE = a4da41efda0dcc5d92bfde043c37e63af75f01e4
FINGERPRINT = fa81c272db12cbe8ba606e3e992cb764c8f73c6ddf9ccbe1e22a9304aca07d69
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
  scheduled_cancellation_cutoff_minutes (0–240; mode-evaluated Brand policy at bind)

Order: projects Snapshot timing; no mutable Order timing authority
No ScheduledOrder / PickupScheduledOrder / DeliveryScheduledOrder
No Order statuses SCHEDULED | READY | DUE | LATE | OVERDUE (derived cues only)

NO Slot aggregate / capacity / reservation engine (FD-036I-04)
Eligibility: server-authoritative composition over hours + minimal future closures + lead times
Lead times: Outlet scheduling profile (fail closed if absent)
Cancellation policy: Brand scheduled-fulfilment policy (defaults 30 Pickup / 60 Delivery)
Future closures: minimal outlet_operating_date_exceptions (CLOSED_FULL_DAY)
current temporary PAUSED ≠ future closed forever

Pre-payment: extend prepareCheckoutForPayment; stale cancellation policy blocks bind
Purchased cancel: compare now vs sealed cutoff; no fee; later Brand changes do not rewrite history

Execution:
  Pickup: immediate Ops visibility; no prep-release state
  Delivery: preserve IMP-032 manual operator-approved dispatch; no timer auto-book
  Reminder: one notification-owned outbox intent with available_at; suppress in-window purchases

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
| ADR-011 / IMP-031 / IMP-032 | Delivery foundation + manual Dehradun mode |
| ADR-012 / IMP-033 | Notification platform; reminder extends owned event family only |
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

## Consequences

### Positive

- Orthogonal timing axis without rewriting D-378 mode architecture
- Purchased promise sealed on Snapshot (including cancellation cutoff)
- Reuses Checkout revision, Payment bind, Ops projections, notification outbox, IMP-032 dispatch
- No new deployable topology or auth surface

### Negative / accepted constraints

- Forward-only schema migration required (Checkout, Snapshot, Brand policy, Outlet scheduling
  profile, minimal future-closure table)
- Scheduled eligibility fail-closed until Outlet lead-time profile configured
- Notification processor event-family extension required for reminder ownership

### Deferred

- Per-slot capacity / labour / predictive engines (FOLLOW_UP)
- Kitchen PREPARING / READY_FOR_PICKUP statuses
- Customer self-service reschedule
- Automatic provider booking automation beyond IMP-032

## Non-decisions

This Proposed ADR does **not**:

- authorize IMP-036I implementation or schema execution
- lock ARCH-R23 / ARCH-G29 as CURRENT
- promote D-379 to CURRENT
- amend D-378 while still PROPOSED
- activate IMP-039 / IMP-040
- accept IMP-036I / IMP-037 / IMP-038
- change approved Product Definition semantics
