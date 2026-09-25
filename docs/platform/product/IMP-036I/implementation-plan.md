<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "IMPLEMENTATION_EXECUTION_PLAN",
  "capability": "IMP-036I",
  "productDefinition": "PD-IMP-036I-DRAFT-4",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementationAuthorized": true,
  "implementationStarted": true,
  "planVersion": "IMP036I-PLAN-1",
  "lastReviewed": "2026-09-25",
  "bindingDecisions": ["D-379", "D-380", "ARCH-G29", "ARCH-G30"]
}
-->

# IMP-036I — Implementation Execution Plan

```text
PLAN_VERSION = IMP036I-PLAN-1
AUTHORITY = IMPLEMENTATION_EXECUTION_PLAN
CAPABILITY = IMP-036I — Scheduled Fulfilment
PRODUCT_DEFINITION = PD-IMP-036I-DRAFT-4 (APPROVED; Gate PASS)
ARCHITECTURE = LOCKED (ARCH-R23; D-379 CURRENT; D-380 CURRENT; ARCH-G29; ARCH-G30)
CAPABILITY_ARCHITECTURE = docs/platform/capabilities/IMP-036I-scheduled-fulfilment.md
IMPLEMENTATION_AUTHORIZED = YES
IMPLEMENTATION_STARTED = YES
IMPLEMENTATION_COMPLETE = NO
IMP036I_ACCEPTED = NO
FORMAL_LIFECYCLE = IMPLEMENTATION_IN_PROGRESS
NEXT_ACTION = INDEPENDENT_TRANCHE_2_VERIFICATION
TRANCHE_1 = PERSISTENCE_AND_DOMAIN_FOUNDATIONS
TRANCHE_2 = SCHEDULING_ELIGIBILITY_AND_PAYMENT_BIND
TRANCHE_3 = CUSTOMER_OPERATIONS_AND_CONFIG_SURFACES
TRANCHE_4 = CANCELLATION_AND_REMINDER
TRANCHE_5 = INTEGRATION_PROOF_AND_HARDENING
RED_DECISIONS_REQUIRED = NONE
```

This document is the bounded execution sequence for already-approved
`PD-IMP-036I-DRAFT-4` and already-locked architecture. It is not a Product Definition,
not architecture, and not acceptance authority. It does not change product semantics,
D-379, D-380, ADR-019, ADR-020, or ARCH-R23.

Traceability set:

```text
US-036I-001 … US-036I-016
AC-036I-001 … AC-036I-066
BR-036I-001 … BR-036I-019
FD-036I-01 … FD-036I-22
D-379
D-380
ARCH-G29
ARCH-G30
```

---

## 0. Authorization boundary

```text
IMP036I_IMPLEMENTATION_AUTHORIZATION = APPROVED
IMP036I_IMPLEMENTATION_AUTHORIZATION_DATE = 2026-09-25
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID = 5312653831
ARCHITECTURE_LOCK_PERSISTENCE_VERIFICATION = 5313026804
PRODUCTION_CUTOVER_AUTHORIZED = NO
FOUNDER_UAT = NOT_PERFORMED
ACCEPTED = NO
```

Authorized later tranches may implement only the approved Product Definition and locked
architecture, including persistence required by ARCH-R23 / D-379 / D-380, Checkout mutable
fulfilment timing, immutable Checkout Snapshot Scheduled truth, 30-minute server-authoritative
windows, TODAY + TOMORROW Outlet-local horizon, future full-day Outlet closure exceptions,
per-mode minimum lead time, Brand Scheduled cancellation policy, pre-payment revalidation and
policy sealing, Scheduled cancellation enforcement, customer and Operations surfaces,
Scheduled Pickup, Scheduled Delivery under IMP-032 manual dispatch, the proactive reminder
through the existing notification outbox, and the D-380 successful-completion conformance
correction.

Not authorized:

```text
Product Definition semantic change
D-379 / D-380 change
Slot capacity engine
new Order lifecycle state
ScheduledOrder aggregate
automatic Delivery booking
generic workflow/scheduler platform
new queue / broker / service / container / provider
new role or permission
IMP-032 manual Delivery operating-model change
production cutover
destructive production action
Founder UAT
formal acceptance
acceptedThrough advancement
```

A newly discovered material product or architecture decision stops affected work as
`DECISION_REQUIRED`.

This authorization-persistence record does not modify runtime code, schema, or migrations.

---

## 1. Tranche sequence

| Tranche | Title | Depends on | Runtime in tranche |
|---|---|---|---|
| 1 | Persistence + Domain Foundations | Authorization persistence | Schema, domain invariants, migration proof |
| 2 | Scheduling Eligibility + Payment Bind | 1 | Server eligibility and Snapshot sealing |
| 3 | Customer + Operations + Config Surfaces | 2 | Accepted transports and existing RBAC |
| 4 | Cancellation + Reminder | 2 and 3 for visible paths; cancellation seal from 2 | Post-purchase enforcement and outbox reminder |
| 5 | Integration / Proof / Hardening | 1–4 | Evidence only; no new topology |

Primary story ownership:

| Tranche | Primary stories |
|---|---|
| 1 | Foundations for every later story; no customer UI. Identity constraints FD-036I-17, FD-036I-18, FD-036I-20, FD-036I-21 |
| 2 | US-036I-001, US-036I-002, US-036I-003, US-036I-004, US-036I-005, US-036I-006, US-036I-015 |
| 3 | US-036I-007, US-036I-008, US-036I-009, US-036I-010, US-036I-013, US-036I-014, US-036I-016 |
| 4 | US-036I-011, US-036I-012 |
| 5 | US-036I-001 … US-036I-016 re-proved together |

Primary acceptance-scenario ownership. Every mandatory scenario AC-036I-001 through AC-036I-066 has exactly one primary owner in Tranches 2, 3, or 4. Tranche 1 is persistence and domain proof only and has no mandatory customer acceptance-scenario primary ownership. Tranche 5 is integration re-proof of the full set and is not a primary owner.

AC-036I-003 is scheduled timing selection and is primary-owned by Tranche 2. AC-036I-040 is future full-day closure, which is not current PAUSED, and is primary-owned by Tranche 2. AC-036I-041 is operating-hours eligibility and is primary-owned by Tranche 2. AC-036I-021 is the customer accessibility scenario and is primary-owned only by Tranche 3.

```text
PRIMARY_AC_OWNERSHIP_START
TRANCHE_1_PRIMARY_ACS = NONE
TRANCHE_2_PRIMARY_ACS = AC-036I-001, AC-036I-002, AC-036I-003, AC-036I-004, AC-036I-005, AC-036I-006, AC-036I-007, AC-036I-008, AC-036I-009, AC-036I-010, AC-036I-011, AC-036I-012, AC-036I-013, AC-036I-014, AC-036I-015, AC-036I-016, AC-036I-017, AC-036I-018, AC-036I-019, AC-036I-020, AC-036I-022, AC-036I-023, AC-036I-024, AC-036I-025, AC-036I-026, AC-036I-027, AC-036I-028, AC-036I-029, AC-036I-030, AC-036I-040, AC-036I-041, AC-036I-050, AC-036I-051
TRANCHE_3_PRIMARY_ACS = AC-036I-021, AC-036I-031, AC-036I-032, AC-036I-033, AC-036I-034, AC-036I-035, AC-036I-036, AC-036I-037, AC-036I-038, AC-036I-042, AC-036I-043, AC-036I-044, AC-036I-048, AC-036I-049, AC-036I-052, AC-036I-056, AC-036I-057, AC-036I-058
TRANCHE_4_PRIMARY_ACS = AC-036I-039, AC-036I-045, AC-036I-046, AC-036I-047, AC-036I-053, AC-036I-054, AC-036I-055, AC-036I-059, AC-036I-060, AC-036I-061, AC-036I-062, AC-036I-063, AC-036I-064, AC-036I-065, AC-036I-066
TRANCHE_5_PRIMARY_ACS = INTEGRATION_REPROOF, AC-036I-001, AC-036I-002, AC-036I-003, AC-036I-004, AC-036I-005, AC-036I-006, AC-036I-007, AC-036I-008, AC-036I-009, AC-036I-010, AC-036I-011, AC-036I-012, AC-036I-013, AC-036I-014, AC-036I-015, AC-036I-016, AC-036I-017, AC-036I-018, AC-036I-019, AC-036I-020, AC-036I-021, AC-036I-022, AC-036I-023, AC-036I-024, AC-036I-025, AC-036I-026, AC-036I-027, AC-036I-028, AC-036I-029, AC-036I-030, AC-036I-031, AC-036I-032, AC-036I-033, AC-036I-034, AC-036I-035, AC-036I-036, AC-036I-037, AC-036I-038, AC-036I-039, AC-036I-040, AC-036I-041, AC-036I-042, AC-036I-043, AC-036I-044, AC-036I-045, AC-036I-046, AC-036I-047, AC-036I-048, AC-036I-049, AC-036I-050, AC-036I-051, AC-036I-052, AC-036I-053, AC-036I-054, AC-036I-055, AC-036I-056, AC-036I-057, AC-036I-058, AC-036I-059, AC-036I-060, AC-036I-061, AC-036I-062, AC-036I-063, AC-036I-064, AC-036I-065, AC-036I-066
TRANCHE_5_ROLE = INTEGRATION_REPROOF
PRIMARY_AC_OWNERSHIP_END
```

Business rules and founder decisions stay bound to the approved Product Definition. Tranche 5
must show BR-036I-001 … BR-036I-019 and FD-036I-01 … FD-036I-22 against the integrated
candidate. Earlier tranches own the rules their stories already cite, including BR-036I-019
sealing at payment bind (tranche 2) and cutoff enforcement (tranche 4).

---

## 2. Tranche 1 — Persistence + Domain Foundations

Goal: durable persistence and core domain invariants before transport or UI.

Expected scope:

- Checkout `fulfilmentTiming = ASAP | SCHEDULED` and mutable selected Scheduled window, with historical/default compatibility.
- Checkout Snapshot immutable `fulfilmentTiming`, Scheduled window start/end, sealed IANA timezone, sealed cancellation cutoff minutes, and ASAP/SCHEDULED database constraints.
- Brand Scheduled cancellation policy: absent row means effective Pickup 30 / Delivery 60; revision 0 product default; first explicit update `expectedRevision=0` → revision 1 compare-and-swap.
- Outlet scheduling profile: per-mode minimum lead time; no invented product default; Scheduled mode fails closed until configured.
- Outlet operating-date exception: minimal `CLOSED_FULL_DAY` local-date authority only.
- D-380 conformance: normal create/replacement after `Delivery.status = DELIVERED` is rejected.
- Forward-only migration: existing Checkout and Snapshot become ASAP; historical Scheduled fields stay NULL; existing Order, Delivery, and financial-document truth stays unchanged.

Proof: empty database → latest; previous schema → latest; historical Delivery ASAP; historical Pickup ASAP; D-380 replacement rejection; database constraints; compare-and-swap concurrency.

No customer UI in tranche 1.

---

## 3. Tranche 2 — Scheduling Eligibility + Payment Bind

Goal: Scheduled selection is authoritative through payment binding.

Expected scope:

- Server-derived 30-minute windows.
- TODAY + TOMORROW Outlet-local calendar.
- IMP-036E hours.
- Future `CLOSED_FULL_DAY` exceptions.
- Active, mode, and merchandise eligibility.
- Pickup profile eligibility.
- Delivery serviceability eligibility.
- Per-mode lead time.
- No capacity engine.
- Checkout timing and window mutation, revision invalidation, evaluate and re-evaluate.
- `prepareCheckoutForPayment` Scheduled revalidation, stale window rejection, and stale cancellation-policy reconfirmation.
- Successful payment-bound Snapshot sealing.
- Failed, expired, or new payment attempts reevaluate current policy.

Proof covers DELIVERY+ASAP, DELIVERY+SCHEDULED, PICKUP+ASAP, and PICKUP+SCHEDULED, plus no-times, boundary lead times, midnight/tomorrow timezone cases, mode switches, timing switches, Outlet changes, destination changes, policy race, and payment retry.

---

## 4. Tranche 3 — Customer + Operations + Config Surfaces

Goal: expose the locked capability through accepted transports.

Customer: `/api/v1/*`, Scheduled option selection, eligible future windows, clear no-times state, Pickup-specific and Delivery-specific presentation, mobile flow, accessible controls, and post-purchase Scheduled clarity.

Operations: immediate Scheduled Order visibility, mode/timing/window, derived Due soon / Overdue cues, no persisted Scheduled/Due/Overdue Order status, Pickup handover unchanged, and manual Scheduled Delivery execution unchanged.

Administration / Operations configuration: Brand cancellation cutoff policy, Outlet lead-time profile, and future date closure authority, using exact existing RBAC permissions and scopes only. No new role or permission.

---

## 5. Tranche 4 — Cancellation + Reminder

Goal: complete Scheduled post-purchase behaviour.

Cancellation uses the immutable sealed cutoff. Pickup default is 30 minutes. Delivery default is 60 minutes. Allowed range is 0–240. Before cutoff, existing cancel/refund applies when otherwise eligible. At or after cutoff, self-service cancel is denied. No fee, no repricing, and no reschedule.

Reminder semantic `SCHEDULED_FULFILMENT_REMINDER`, purpose `ORDER_UPDATES`, rank 40. Existing ranks remain `OUT_FOR_DELIVERY` 40, `DELIVERED` 50, `ORDER_CANCELLED` 60.

Requirements:

- Reminder intent is atomic with Scheduled Order materialization.
- Stable ref `order:<orderId>:scheduled_fulfilment_reminder`.
- `availableAt` is about window start minus 30 minutes.
- A purchase inside the reminder window never enqueues the reminder.
- Semantic-specific expiry is at window start.
- Content is immutable and Snapshot-derived.
- Pickup content is location and window. Delivery content is arrival/fulfilment window.

Send-time suppression: `CANCELLED`, `FULFILLED`, window started, missing or inconsistent Snapshot, not `SCHEDULED`, and for Delivery an authoritative `Delivery.status = DELIVERED` row. Pickup does not look up Delivery. No new provider.

---

## 6. Tranche 5 — Integration / Proof / Hardening

Goal: implementation-complete evidence.

Required integrated proof includes US-036I-001…016, AC-036I-001…066, BR-036I-001…019, FD-036I-01…22, all four mode/timing combinations, migration compatibility, payment races, cancellation-boundary exact instant, reminder ordering and races, D-380 conformance, Operations manual Delivery preservation, Pickup no-Delivery boundary, financial-document non-regression, mobile, accessibility, authorization/RBAC, privacy, observability, no new topology, the regression suite, CodeQL, and the testing inventory.

`IMPLEMENTATION_COMPLETE` may become YES only after that objective proof. Acceptance stays NO until independent implementation review, Founder UAT, and formal reconciliation.

---

## 7. Delivery conformance debt

```text
PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT = CLOSED
CORRECTION_AUTHORIZED = YES
FIXED_IN_TRANCHE_1_RUNTIME = YES
```

Tranche 1 rejects normal create/replacement after `Delivery.status = DELIVERED`. FAILED and CANCELLED replacement remain only where existing prerequisites already permit them. D-380 controls successful-completion finality only. The debt is CLOSED because the Tranche 1 implementation and tests prove the rejection.

---

## 8. Stop conditions

Stop and return `DECISION_REQUIRED` if a tranche needs any item in the not-authorized list, or any other material product or architecture choice that canonical authority does not already define.

Do not mark `IMPLEMENTATION_COMPLETE` until later tranches and independent proof are complete.
