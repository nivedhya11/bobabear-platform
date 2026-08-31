<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-032",
  "title": "Dehradun Delivery Operating Mode",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "AUTHORIZED / STARTED",
  "implementationAuthorized": true,
  "lastReviewed": "2026-08-31",
  "bindingDecisions": ["D-357", "D-372"],
  "dependsOn": ["IMP-029", "IMP-030", "IMP-031"]
}
-->

# IMP-032 — Dehradun Delivery Operating Mode

## Capability Architecture (ARCHITECTURE_LOCKED)

This document is the locked capability architecture for **IMP-032 — Manual Provider-Neutral
Dehradun Delivery Operating Mode** over the accepted IMP-031 foundation. It defines how BOBA makes
delivery operational without provider API automation.

Architecture remains canonically locked. Implementation is authorized and `STARTED`.
Start does not complete or accept implementation.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Lifecycle | `IMPLEMENTATION_IN_PROGRESS` |
| Implementation | `AUTHORIZED` / `STARTED` |
| Implementation authorized | **YES** |
| Accepted | **NO** |
| Accepted product through | IMP-031 |
| Current product slice | IMP-032 |
| Pending acceptance | NONE |
| Next product slice | IMP-033 — Notification Foundation |
| Operating mode | **MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY** |
| New CURRENT decision | **NONE** (`D-373` absent) |
| Global architecture revision | **NONE** (`ARCH-R18` remains current; no ARCH-R19) |

```text
IMP-032: IMPLEMENTATION_IN_PROGRESS
IMP-032_ARCHITECTURE: LOCKED
IMP-032_ARCHITECTURE_LOCKED: YES
IMP-032_IMPLEMENTATION: AUTHORIZED / STARTED
IMP-032_IMPLEMENTATION_AUTHORIZED: YES
IMP-032_STARTED: YES
IMP-032_IMPLEMENTATION_COMPLETE: NO
IMP-032_ACCEPTED: NO
IMP-032_OPERATING_MODE: MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY
START IS NOT COMPLETION OR ACCEPTANCE: YES
D373_REQUIRED_FOR_LOCK: NO
ARCH_R19_REQUIRED: NO
FOUNDER_UAT_EXPECTED_FOR_IMPLEMENTATION_ACCEPTANCE: YES
schema_change: NO
delivery_schema_migration: NO
new_service: NO
access_control_data_seed_migration: PERMITTED_IF_REQUIRED
```

## 1. Purpose

IMP-032 makes Dehradun delivery operational using **manual provider-neutral execution** over the
accepted IMP-031 Delivery foundation. BOBA staff manually arrange delivery through an approved
external booking channel; BOBA records neutral booking and execution facts; staff manually progress
Delivery through authorized workforce commands; BOBA remains the authoritative normalized Delivery
record; the external provider/app is execution evidence, not business authority.

This lock does **not** select Rapido, Borzo, Shadowfax, Uber Direct, or any named provider; does
**not** require provider API integration; does **not** introduce webhooks, workers, queues, or
automated reconciliation; and does **not** implement WhatsApp or automated notifications.

## 2. Preserved authorities

| Authority | Preservation |
|---|---|
| IMP-031 lifecycle | All seven execution states, return progression, one-active Delivery invariant, `BOOKING_OUTCOME_UNKNOWN` semantics, observation/evidence boundary, and Order/Delivery separation remain binding. |
| ARCH-R18 / ARCH-G24 | Provider-neutral Delivery domain authority; no new global architecture revision required. |
| Order | Sole commercial lifecycle authority; no new Order states. |
| Payment | Verified/prepaid payment authority; **no COD**. |
| Checkout / Pricing | Historical customer delivery charge remains immutable; provider cost never rewrites it. |
| Operations | Existing Order accept/fulfil/cancel workforce patterns remain authoritative for commercial lifecycle. |
| IMP-031 provider ports | Remain future-ready; manual operating mode does not weaken automated adapter recovery semantics for later slices. |
| D-372 | Workforce session / principal / permission / trusted scope authority reused; no new actor model. |

## 3. Operating mode — MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY

| Decision | Lock |
|---|---|
| Dispatch | **OPERATOR-APPROVED**, not automatic. |
| External booking | Staff create/arrange courier booking **outside BOBA** using an approved external channel (retail parcel app, merchant app/dashboard, portal, phone-booked local courier, or other approved channel). |
| Provider selection | **Provider-neutral**; no canonical named provider; no hard-coded provider enum. |
| Named provider | **None** is canonical for IMP-032. |
| API required | **NO** for IMP-032 MVP. |
| Webhook | **NO**. |
| Polling worker | **NO**. |
| Queue | **NO**. |
| Provider credentials | **NO**. |
| Automatic dispatch | **NO**. |
| COD | **NO**. |
| Customer tracking | BOBA order page is the canonical customer-facing delivery-status surface; optional outbound provider tracking URL when supplied. |
| Provider tracking URL | Optional convenience only; not lifecycle authority; not proof. |
| WhatsApp / notifications | **Deferred** to IMP-033 / IMP-034; manual staff sharing of the BOBA order/tracking URL is operational behavior, not platform notification integration. |
| Provider cost | Separate from customer delivery charge; internal only. |
| Live map tracking | **NOT required**. |

## 4. Manual booking safety — pre-external-attempt UNKNOWN

Manual external booking must preserve the same crash/duplicate safety principle as IMP-031 automated
booking. The unsafe sequence “REQUESTED → external attempt → ambiguity recorded afterwards” is
**prohibited**.

### 4.1 Locked sequence

```text
1. Arrange Delivery
   authorized workforce action validates prerequisites
   createDelivery → REQUESTED

2. Begin Manual Booking  (BEFORE any external booking attempt)
   require authorized workforce principal
   require expected Delivery revision
   select/provider label
   generate or retain stable bookingCorrelationId
   durably transition:
     REQUESTED → BOOKING_OUTCOME_UNKNOWN
   Only after that transaction commits may staff press "Book", "Confirm", call the courier,
   or otherwise attempt the external booking.

3. External booking succeeds definitively
   manual confirmation with normalized evidence:
     BOOKING_OUTCOME_UNKNOWN → BOOKED
   persist provider-neutral booking facts

4. External booking definitively did not succeed
   authorized manual resolution:
     BOOKING_OUTCOME_UNKNOWN → FAILED
   only with evidence establishing no active external booking

5. Authorized cancellation
   UNKNOWN or BOOKED → CANCELLED
   only after operator confirms the external booking is inactive/cancelled

6. Outcome uncertain
   Remain BOOKING_OUTCOME_UNKNOWN
   No timeout conversion
   No replacement booking
   No second external courier attempt

7. Replacement
   Allowed only after prior Delivery is authoritatively inactive/terminal under IMP-031 rules
```

### 4.2 REQUESTED behavior

`REQUESTED` means dispatch has started and no external booking attempt is authorized yet.
Operator may cancel `REQUESTED` when no external booking exists. Operator must **not** attempt
external booking while remaining in `REQUESTED`.

### 4.3 Stable correlation identity

`bookingCorrelationId` is the stable internal booking identity. It is generated or retained during
**Begin Manual Booking** and preserved across subsequent manual resolution. Provider/correlation
identity must not be rewritten by resolution commands.

## 5. Manual resolution command

Existing `reconcileAmbiguousBooking()` uses `provider.queryBooking()`. Manual mode has **no**
provider API.

IMP-032 therefore defines a **new application-level manual resolution command** that:

- uses authenticated workforce authority;
- requires `expectedRevision`;
- requires current state `BOOKING_OUTCOME_UNKNOWN`;
- requires stable `bookingCorrelationId`;
- accepts structured normalized operator-attested evidence;
- permits only `BOOKED` / `FAILED` / `CANCELLED` outcomes allowed by IMP-031;
- preserves provider/correlation identity;
- reuses existing `recordBookingOutcome` semantics where possible;
- performs **NO** provider I/O;
- never issues `createBooking`;
- never bypasses lifecycle validation.

Provider `queryBooking` recovery semantics for future automated adapters remain unchanged and are
**not** altered by this lock.

Conceptual command names (transport may combine routes safely):

| Command | Purpose |
|---|---|
| Begin Manual Booking | `REQUESTED` → `BOOKING_OUTCOME_UNKNOWN` before external attempt |
| Confirm Manual Booking | `UNKNOWN` → `BOOKED` with normalized evidence |
| Resolve Manual Booking Failure | `UNKNOWN` → `FAILED` with inactive-booking evidence |
| Resolve Manual Booking Cancellation | `UNKNOWN`/`BOOKED` → `CANCELLED` after external inactivity established |

## 6. Manual booking evidence

### 6.1 Required BOBA identity

- `deliveryId`
- `bookingCorrelationId`
- provider label
- authenticated workforce command context
- recorded/evidence timestamp (server clock)

### 6.2 Confirmed booking (`BOOKED`)

`externalBookingReference` **SHOULD** be captured when the provider issues one.

If the provider issues **no** external reference:

- **DO NOT** fabricate `"no_reference_issued"` as the identity;
- the BOBA `bookingCorrelationId` remains the stable internal identity.

### 6.3 Optional evidence (never mandatory for lifecycle truth)

- tracking URL
- courier reference / assignment evidence
- provider cost
- neutral reason/note

Optional provider data must not block `BOOKED`, `PICKED_UP`, or `DELIVERED` when legitimately absent.

## 7. Booking channel

Booking channel (retail app, business dashboard, phone, portal, etc.) is **operational context**, not
authoritative Delivery state.

Do **not** persist generic booking-channel values in `delivery_provider_references` (for example
`provider=Rapido`, `kind=booking_channel`, `value=retail_app`) because existing provider-reference
uniqueness can collide across Deliveries.

For IMP-032:

- do not persist booking channel unless an existing collision-safe mechanism already exists;
- no new schema merely to record channel labels.

```text
schema_change: NO
migration: NO
```

## 8. Tracking URL

Optional tracking URLs may use existing provider-reference storage only if:

- the value is specific to this Delivery/provider booking; and
- existing uniqueness permits it safely.

Validation:

- valid absolute URL;
- HTTPS only;
- reject `javascript:`;
- reject `data:`;
- length bounded (consistent with `DELIVERY_REFERENCE_MAX_LENGTH`);
- customer must own/access the underlying Order before the URL is returned.

Tracking URL:

- is convenience only;
- is not proof;
- is not provider evidence authority;
- cannot transition Delivery lifecycle;
- is not lifecycle authority.

## 9. Workforce authority / audit

Reuse D-372 workforce authority:

- validated workforce session;
- trusted principal construction;
- permission-based authorization;
- trusted resource/outlet scope;
- same-origin mutation protection;
- expected revision / concurrency checks.

IMP-029 deferred generic workforce-business audit. Therefore:

```text
DURABLE_GENERIC_DELIVERY_ACTION_AUDIT = DEFERRED
```

Existing application/request logs may aid diagnostics but are not canonical business audit
authority. Do **not** create a new audit table in IMP-032 merely for generic audit.

## 10. RBAC

Do **not** lock a new role named `delivery_coordinator` or any other new role unless repository
authority already defines it. Authority is **permission + trusted scope**. Role name never bypasses
authorization.

Minimum Delivery permission requirements (repository-native dotted keys; exact catalog extension is
implementation detail under existing access-control conventions):

```text
delivery.read
delivery.dispatch
delivery.book
delivery.assign
delivery.pickup
delivery.complete
delivery.cancel
delivery.fail
delivery.return
delivery.cost.record
```

Existing roles may receive permissions separately. Conceptual needs map to those permission keys
(read Delivery; arrange/start delivery; update execution; cancel delivery; record provider cost).

## 11. Customer status projection

Customer UI labels are projections, not lifecycle states.

| Delivery truth | Customer label |
|---|---|
| `REQUESTED` | Arranging delivery |
| `BOOKING_OUTCOME_UNKNOWN` | Arranging delivery |
| `BOOKED` + no active assignment | Delivery booked |
| `BOOKED` + active assignment | Rider assigned |
| `PICKED_UP` | Out for delivery |
| `DELIVERED` | Delivered |
| `FAILED` | Delivery issue |
| `CANCELLED` | Delivery cancelled |

Do **not** derive “Rider assigned” solely from `BOOKED`. Assignment is separate evidence/fact.
Return states may be shown only if useful and must remain projections.

## 12. Customer surface

Extend existing customer Order detail minimally.

Expose:

- normalized customer-safe status;
- optional provider display name;
- optional validated Track Delivery URL;
- last-updated timestamp.

Do **not** expose:

- provider cost;
- internal failure codes/reasons;
- raw provider references;
- workforce notes;
- courier phone by default;
- provider payloads;
- internal observation metadata.

No live-map tracking.

## 13. Proof / handoff

### 13.1 Pickup

Requires:

- `BOOKED`
- authorized workforce command
- expected revision
- stable `handoffReference`

Assignment remains optional.

### 13.2 Delivery confirmation

Delivery confirmation must **not** accept arbitrary free text as sufficient proof.

Allow structured provider-neutral proof references, for example:

- provider POD reference;
- provider delivered-reference;
- BOBA-generated manual-delivery-confirmation reference associated with the explicit
  command/evidence;
- another validated stable proof reference.

Tracking URL alone is **NOT** proof.

Do not persist raw OTP secrets unnecessarily.

Only explicit **Confirm Delivery** may perform `PICKED_UP → DELIVERED`.

## 14. Failure / cancellation / return

| Status | Manual policy |
|---|---|
| `REQUESTED` | Cancel if no external booking exists. |
| `BOOKING_OUTCOME_UNKNOWN` | No replacement; `FAILED`/`CANCELLED` only after external inactivity is established. |
| `BOOKED` | Cancel only after external booking confirmed inactive. |
| `PICKED_UP` | `CANCELLED` prohibited. |
| Post-pickup non-delivery | `FAILED`. |
| Courier custody requires return | Use accepted IMP-031 return progression. |

No direct Refund / Payment / Order / inventory mutations from Delivery failure/cancel/return paths.

## 15. Order fulfilment

```text
Delivery DELIVERED
→ authorized application orchestration
→ re-read current Order truth
→ if eligible ACCEPTED → FULFILLED
→ via existing fulfilOrder authority
```

**NO** direct Delivery repository → Order state update.

If Order fulfilment fails:

- Delivery remains `DELIVERED`;
- Order remains in truthful prior state;
- recovery occurs through authorized Operations workflow.

## 16. Provider cost

Reuse existing `delivery_provider_costs`. Manual staff may capture:

`estimated`, `booked`, `final`, `cancellation`, `return`, `adjustment`.

Provider cost:

- internal only;
- never shown to customer;
- never rewrites historical customer delivery charge.

Financial reconciliation remains deferred.

## 17. Pickup data

For manual MVP:

```text
pickup address/coordinates persistence = DEFERRED_UNTIL_API_AUTOMATION
```

unless current product flow genuinely requires BOBA to supply pickup origin. External
retail/merchant apps may already contain kitchen pickup details. No speculative outlet schema
changes.

## 18. Operations surface

Extend existing Operations patterns only.

Conceptual commands:

- Arrange Delivery
- Begin Manual Booking
- Confirm Manual Booking
- Resolve Manual Booking Failure
- Resolve Manual Booking Cancellation
- Record Assignment
- Confirm Pickup
- Confirm Delivery
- Report Delivery Failure
- Cancel Delivery
- Begin/Advance Return where eligible
- Update Tracking Reference
- Record Provider Cost

Do **not** implement arbitrary `Set Delivery Status = X`. Every mutation must be an explicit command
with prerequisites and lifecycle validation. Transport shape may combine routes if repository
conventions favor a smaller safe API.

Operations UI: Order detail delivery panel. No provider-dashboard clone.

## 19. WhatsApp / notifications

| Slice | Ownership |
|---|---|
| IMP-032 | Stable BOBA Order/status URL availability only |
| IMP-033 | Notification Foundation |
| IMP-034 | Meta WhatsApp Cloud API Adapter |

Manual staff sharing of that URL externally is operational behavior, not platform notification
integration. No WhatsApp API/SDK/config/schema in IMP-032.

## 20. Provider automation deferred

Defer all of:

- concrete provider adapter;
- real create/query/cancel provider I/O;
- API credentials;
- webhook;
- callback signatures;
- automated observation intake;
- polling;
- background reconciliation worker;
- queue;
- automatic dispatch;
- provider-specific status mapping;
- automated cost import;
- provider sandbox;
- multi-provider routing;
- API pickup profile.

Keep IMP-031 provider-neutral ports intact and future-ready.

## 21. Security / privacy

- Workforce session authority only for mutations.
- Customer reads only own Delivery projection via Order ownership.
- Provider/courier contact details minimized and workforce-scoped.
- Customer address/phone shown to authorized operators only as required for manual booking.
- No provider credentials stored (API mode deferred).
- No raw screenshots or arbitrary provider payloads required.
- Tracking URLs validated and access-controlled through BOBA projection.
- Durable generic delivery-action audit remains deferred (see §9).

## 22. D-373 / ARCH-R19

```text
D373_REQUIRED_FOR_LOCK: NO
ARCH_R19_REQUIRED: NO
```

Manual Dehradun operating mode is capability-local under ARCH-R18 / ARCH-G24. No new
platform-global domain authority or deployable topology is introduced. D-373 remains absent.
ARCH remains ARCH-R18. DR remains DR-14.

## 23. Implementation boundary

Implementation is **AUTHORIZED** / **STARTED** for the locked manual-mode boundary below. Start does
**not** complete or accept implementation (`IMP-032_IMPLEMENTATION_COMPLETE: NO`;
`IMP-032_ACCEPTED: NO`).

### 23.1 Included (authorized; started)

```text
A. manual dispatch orchestration (prerequisite validation + createDelivery)
B. Begin Manual Booking (REQUESTED → BOOKING_OUTCOME_UNKNOWN before external attempt)
C. manual normalized booking resolution (UNKNOWN → BOOKED / FAILED / CANCELLED; no provider I/O)
D. provider/external references using existing IMP-031 tables (no booking_channel persistence)
E. optional validated tracking URL provider reference
F. assignment evidence
G. pickup / delivery confirmation / fail / cancel / return commands
H. provider-cost capture
I. Operations API extension under /api/operations/v1/
J. Operations UI extension on order detail
K. customer Delivery projection on existing order detail
L. DELIVERED → existing Order fulfil coordination
M. authorization / concurrency / lifecycle / customer-ACL tests
N. Delivery permission-catalog extension under existing access-control conventions
```

### 23.2 Excluded

- provider API
- webhook
- poll worker
- queue
- notifications
- WhatsApp
- live map
- generic audit table
- pickup schema
- provider-specific DTOs
- financial reconciliation
- automatic dispatch
- COD
- named-provider canonicalization
- D-373 / ARCH-R19

### 23.3 Schema / runtime

Implementation inspection established that already-initialized environments do not automatically receive newly locked permission-catalog entries from typed `catalog.ts` alone. Persisted
`app.access_permissions` / `app.access_role_permissions` remain effective authorization authority.
Repository-native precedent installs later permission keys through committed SQL data seeds aligned
with the typed catalog (`payment.refund` in migration `0019_refund.sql`). No existing non-migration
permission-sync/bootstrap mechanism was found.

```text
schema_change: NO
delivery_schema_migration: NO
new_service: NO

access_control_data_seed_migration: PERMITTED_IF_REQUIRED
```

**Access-control data seed constraints (when required):**

- data-only INSERT into existing access-control tables only;
- **NO** CREATE / ALTER / DROP (no access-control schema change);
- **NO** Delivery-table DDL or DML;
- only the already-locked ten `delivery.*` permission keys and repository-approved role mappings;
- **NO** new auth/session/scope model;
- permission + trusted scope remains authority; role name never bypasses authorization;
- additive/idempotent according to repository migration convention.

Delivery/domain schema change remains **NO**. Delivery table migration remains **NO**. New deployable
service remains **NO**.

Existing IMP-031 tables remain sufficient (`deliveries`, `delivery_provider_references`,
`delivery_assignments`, `delivery_provider_observations`, `delivery_provider_costs`,
`delivery_returns`). Existing Docker Compose / Next.js monolith; no new deployable topology.

### 23.4 Tests (future implementation)

Focused tests for pre-external-attempt UNKNOWN safety, manual resolution without provider I/O,
one-active invariant, cancel/fail inactive-booking prerequisites, customer projection access control,
tracking URL validation (HTTPS-only; not lifecycle authority; not proof), and DELIVERED → fulfil
orchestration recovery.

### 23.5 Founder UAT

```text
FOUNDER_UAT_EXPECTED_FOR_IMPLEMENTATION_ACCEPTANCE: YES
```

Workforce and customer-visible surfaces change materially. UAT is not performed in this architecture
lock gate.

## 24. Architecture-lock acceptance criteria (satisfied)

This lock requires and records:

- alignment with ARCH-R18 / IMP-031 without weakening lifecycle safety;
- operating mode `MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY`;
- pre-external-attempt `BOOKING_OUTCOME_UNKNOWN` rule;
- stable `bookingCorrelationId`;
- new manual resolution path with no provider I/O;
- no arbitrary status mutation;
- no provider API / webhook / worker / queue requirement;
- tracking URL is not lifecycle authority and not proof;
- customer charge ≠ provider cost;
- customer projection uses existing states only;
- WhatsApp/notifications deferred to IMP-033 / IMP-034;
- implementation boundary unambiguous;
- D-373 absent; ARCH-R19 not required; ARCH-R18 and DR-14 remain current.

## 25. Implementation-start status

```text
IMP-032: IMPLEMENTATION_IN_PROGRESS
IMP-032_ARCHITECTURE: LOCKED
IMP-032_ARCHITECTURE_LOCKED: YES
IMP-032_IMPLEMENTATION: AUTHORIZED / STARTED
IMP-032_IMPLEMENTATION_AUTHORIZED: YES
IMP-032_STARTED: YES
IMP-032_IMPLEMENTATION_COMPLETE: NO
IMP-032_ACCEPTED: NO
START IS NOT COMPLETION OR ACCEPTANCE: YES
FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE: YES
```

Start covers only §23.1 under the locked operating mode and prior GTM-R82 authorization. GTM-R84 / STATE-R82 clarify §23.3 only: a repository-native data-only access-control seed migration is
**PERMITTED_IF_REQUIRED** to install the already-locked `delivery.*` catalog and role mappings into
already-initialized environments under the constraints above. That clarification is
implementation-boundary only; it is not architecture expansion and not implementation completion.
Start does **not** complete or accept implementation, and does **not** authorize provider API
automation, webhooks, workers, queues, notifications/WhatsApp, Delivery schema/table migration,
D-373, ARCH-R19, IMP-033, or IMP-034.
