---
Status: Accepted
Decision date: 2026-09-25
Last updated: 2026-09-25
Decision ID: D-380 (CURRENT)
Amends: IMP-031 replacement interpretation for successful-completion finality only
Amended by: none
Does not supersede: IMP-031 wholesale; Delivery lifecycle; one-active Delivery rule; stable request identity; booking ambiguity handling; failure/cancellation rules; return progression; IMP-032 manual Dehradun mode; Order lifecycle; D-379 Scheduled timing
---

# ADR-020: Delivery Successful-Completion Finality and Replacement Boundary

## Status

**Accepted** (2026-09-25). Register identity **[D-380](../decision-register.md)** is **CURRENT**.
Invariant **ARCH-G30** is **CURRENT**. Architecture revision **ARCH-R23** is **CURRENT**.
Independent Architecture Fit review `5312653831` = **PASS**. Human architecture direction
**APPROVED 2026-09-25**. Implementation remains **NOT_AUTHORIZED**.

```text
D-380_STATUS: CURRENT
ADR020_STATUS: Accepted
ARCH-R23_STATUS: CURRENT
ARCH-G30_STATUS: CURRENT
IMP036I_ARCHITECTURE_FIT: PASS
IMP036I_ARCHITECTURE_LOCKED: YES
IMP036I_IMPLEMENTATION_AUTHORIZED: NO
CURRENT_ARCHITECTURE: ARCH-R23
CURRENT_IMP031: ARCHITECTURE_LOCKED (CURRENT)
CURRENT_ADR011: HISTORICAL / future-binding intent (not CURRENT decision authority)
HUMAN_ARCHITECTURE_DIRECTION: APPROVED_2026-09-25
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID: 5312653831
PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT: OPEN
```

Locked capability architecture:

[`../capabilities/IMP-036I-scheduled-fulfilment.md`](../capabilities/IMP-036I-scheduled-fulfilment.md)

Related Accepted Scheduled timing decision (separate; do not merge):

[`ADR-019-scheduled-fulfilment-timing-and-execution.md`](./ADR-019-scheduled-fulfilment-timing-and-execution.md)
(**D-379** CURRENT)

## A. Binding authority after lock

```text
IMP-031 capability architecture = CURRENT / ARCHITECTURE_LOCKED
ARCH-G24 = CURRENT (provider-neutral Delivery foundation)
D-380 = CURRENT
ADR-020 = Accepted
ARCH-G30 = CURRENT
ARCHITECTURE.md tip = ARCH-R23
```

D-380 clarifies IMP-031 successful-completion replacement interpretation only. It does not rewrite
IMP-031 history wholesale. At the reviewed candidate, current runtime `createDelivery` allowed a
`DELIVERED` predecessor. That behaviour is now `PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT` against
CURRENT D-380. This ADR does not pretend the runtime was already conformant.

## B. Binding decision (human architecture approval 2026-09-25; Fit PASS 5312653831)

Human architecture direction **APPROVED** on **2026-09-25**. Independent Architecture Fit review
`5312653831` = **PASS**. Status is **Accepted**.

### Ambiguity being resolved

CURRENT locked IMP-031 says a new/replacement Delivery may begin after the prior booking is
**“authoritatively inactive”** (`IMP-031-provider-neutral-delivery-foundation.md` §4.2). That phrase
is ambiguous for successful completion because `DELIVERED` is terminal/inactive yet records that
successful fulfilment execution occurred.

### Future locked interpretation (after D-380 CURRENT)

```text
Delivery.status = DELIVERED
  = durable successful Delivery execution truth
  ≠ merely “inactive” for replacement purposes

A normal replacement Delivery MUST NOT be created after DELIVERED.

DELIVERED means successful fulfilment execution occurred.
```

No unique “current Delivery,” lineage-tip selection algorithm, `current_delivery_id` pointer,
latest-row-wins rule, or similar new authority is required.

## C. FAILED / CANCELLED — do not manufacture a blanket replacement rule

D-380 **does not** expand replacement eligibility beyond existing accepted Delivery authority.

```text
Normal replacement after FAILED / CANCELLED
  = permitted ONLY where already allowed by accepted Delivery architecture
    and operational prerequisites (IMP-031 / IMP-032 / related accepted rules)

Examples of what D-380 does NOT do:
  - does not invent “every FAILED or CANCELLED Delivery may always be replaced”
  - does not override post-pickup failure / return / support rules
  - does not introduce a new provider-switch policy
  - does not authorize courier switch after pickup
```

Failed/cancelled **pre-pickup** booking replacement may remain valid where existing accepted rules
and prerequisites already permit it. Post-pickup `FAILED` continues under existing failure / return /
support authority.

## D. Correction boundary

If a committed `DELIVERED` fact is later found incorrect:

```text
do NOT mutate Delivery.status backward
do NOT silently create a normal replacement Delivery
do NOT erase the original terminal fact/history
```

A future **separately authorized** correction mechanism may establish a corrected customer-fulfilment
interpretation while preserving the original terminal history. **IMP-036I does not design that
mechanism.**

Until such authority exists:

```text
committed authoritative DELIVERED remains successful-completion truth
```

## Authority conflict reconciliation (truthful discrepancy record)

Independent Architecture Fit review `5309972440` (PR #264 finding `4098211380`) returned **STOP**:
CURRENT locked IMP-031 wording, historical/future-intent ADR-011, and accepted runtime behavior were
not sufficiently reconciled to let IMP-036I silently choose replacement semantics.

| Source | What it says | Classification |
|---|---|---|
| CURRENT IMP-031 | Replacement after prior booking is “authoritatively inactive” | CURRENT / ARCHITECTURE_LOCKED; wording ambiguous for `DELIVERED` |
| ADR-011 | Replacement only after cancelled or confirmed failed; provider switching after pickup prohibited | HISTORICAL / future-binding intent — **not** CURRENT decision authority; do not rewrite as CURRENT |
| Runtime `createDelivery` (`src/server/delivery/operations.ts`) | Accepts `DELIVERED` \| `FAILED` \| `CANCELLED` as terminal predecessors | **VERIFIED** accepted implementation behaviour; **not** erased by this ADR |
| Human direction 2026-09-25 | `DELIVERED` = successful finality; no normal replacement after `DELIVERED` | APPROVED candidate direction for **D-380** / this ADR |

D-380 candidate resolves the **future** binding interpretation for successful-completion finality.
It does **not** pretend current runtime never allowed a `DELIVERED` predecessor. That runtime
acceptance is recorded as:

```text
PRE_EXISTING_DELIVERY_CONFORMANCE_DEBT
```

relative to the approved D-380 direction. Future authorized implementation must reject normal
create/replacement after `DELIVERED` **before IMP-036I acceptance**. This ADR does **not** change
runtime, schema, migrations, or historical Delivery rows.

Do **not** rewrite historical ADR-011 as though it was CURRENT decision authority merely to force
the answer.

## Decision Summary

```text
DELIVERED = durable successful Delivery execution truth
Normal replacement after DELIVERED = PROHIBITED
FAILED / CANCELLED replacement = existing accepted prerequisites only (no expansion)
Incorrect DELIVERED correction = separately authorized; history-preserving; outside IMP-036I
Lineage tip / current_delivery_id / latest-row-wins = NOT REQUIRED

Scheduled Delivery reminder completion (consumer; owned by D-379 execution boundary):
  EXISTS authoritative Delivery.status = DELIVERED for the exact Order
  → suppress upcoming Scheduled fulfilment reminder
  even if Order still ACCEPTED / DELIVERED notification not processed /
    no notification-attempt row / fulfil coordination not yet updated Order
  Notification rank 50 = secondary communication staleness only
```

### ARCH-G30 (CURRENT)

> Delivery.status = DELIVERED is durable successful execution truth. A normal replacement Delivery
> cannot supersede it. Correction requires separately authorized history-preserving authority.
> Consumers such as Scheduled reminder eligibility may rely on committed DELIVERED completion truth
> without waiting for notification or Order coordination catch-up.

Preferred future lock (with D-379): **one** architecture revision **ARCH-R23** containing
**ARCH-G29** (Scheduled Fulfilment Timing) and **ARCH-G30** (Delivery Successful-Completion
Finality). Do **not** create ARCH-R24. Do **not** apply this invariant to CURRENT ARCHITECTURE.md
while this ADR remains Proposed.

ARCH-G24 remains CURRENT for provider-neutral Delivery foundation / one-active booking. ARCH-G30
clarifies successful-completion finality; it does not replace ARCH-G24 wholesale.

### Relationship to D-379

```text
D-379 = Scheduled timing / Snapshot sealing / reminder execution boundary
D-380 = Delivery successful-completion finality + replacement boundary (durable Delivery-domain)
```

D-379 consumes D-380’s Delivery completion fact for Scheduled Delivery reminder eligibility.
D-379 does **not** redefine Delivery replacement semantics itself. Do not merge D-379 and D-380.

## Consequences

### Positive

- Explicit prospective resolution of IMP-031 “authoritatively inactive” ambiguity for `DELIVERED`
- Scheduled reminder completion gate has clear successful-completion authority without lineage tips
- FAILED / CANCELLED replacement remains bounded by existing accepted prerequisites
- Runtime DELIVERED-predecessor acceptance recorded truthfully as conformance debt

### Negative / accepted constraints

- Runtime must be corrected before IMP-036I acceptance (not in this ADR task)
- Existing nonconformant histories (if any) remain; reminder path stays conservative + diagnostic
- Correction mechanism deferred to separately authorized future work

### Deferred

- Separately authorized DELIVERED correction mechanism / schema
- Any expansion or redesign of post-pickup failure / return / provider-switch policy

## Non-decisions

This Proposed ADR does **not**:

- make D-380 CURRENT or accept ADR-020
- lock ARCH-R23 / ARCH-G30 as CURRENT
- rewrite ADR-011 historical classification to CURRENT
- amend IMP-031 capability lock text in place (prospective interpretation via D-380)
- change runtime `createDelivery`, schema, migrations, or historical Delivery rows
- authorize IMP-036I implementation
- claim Architecture Fit PASS
- expand FAILED / CANCELLED replacement eligibility
- invent a courier-switch path after pickup
- design the future DELIVERED correction mechanism
