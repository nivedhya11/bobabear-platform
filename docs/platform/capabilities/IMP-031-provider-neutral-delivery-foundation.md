<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-031",
  "title": "Provider-Neutral Delivery Foundation",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "COMPLETE_AND_ACCEPTED",
  "implementationAuthorized": true,
  "lastReviewed": "2026-08-30",
  "bindingDecisions": ["D-357", "D-372"],
  "dependsOn": ["IMP-019", "IMP-021", "IMP-022", "IMP-023", "IMP-029", "IMP-030"]
}
-->

# IMP-031 — Provider-Neutral Delivery Foundation

## Capability Architecture (ARCHITECTURE_LOCKED)

This document locks the provider-neutral Delivery foundation for IMP-031. Implementation is
`AUTHORIZED` / `STARTED` / `COMPLETE` under Boundary C and is formally `COMPLETE_AND_ACCEPTED`.
Formal acceptance does not expand beyond locked Boundary C, authorize IMP-032, select a provider,
or define Dehradun operating mode.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Lifecycle | `COMPLETE_AND_ACCEPTED` |
| Implementation | `AUTHORIZED` / `STARTED` / `COMPLETE` |
| Implementation authorized | **YES** |
| Implementation complete | **YES** |
| Accepted | **YES** |
| Accepted product through | IMP-031 |
| Current product slice | NONE |
| Pending acceptance | NONE |
| Next product slice | IMP-032 — Dehradun Delivery Operating Mode |
| Implementation boundary | **C — APPROVED WITH THIS LIFECYCLE AMENDMENT** |
| New CURRENT decision | **NONE** |

```text
IMP-031: COMPLETE_AND_ACCEPTED
IMP-031_ARCHITECTURE: LOCKED
IMP-031_ARCHITECTURE_LOCKED: YES
IMP-031_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-031_IMPLEMENTATION_AUTHORIZED: YES
IMP-031_STARTED: YES
IMP-031_IMPLEMENTATION_COMPLETE: YES
IMP-031_ACCEPTED: YES
```

```text
IMPLEMENTATION_SOURCE_SHA: 66e2783afa4e9eef35c4ec208b25af9d9450f83d
IMPLEMENTATION_SOURCE_TREE: dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099
MERGED_MAIN_SHA: c3d499b0b8df2a8c7ae9297ab870f6286f81b848
MERGED_MAIN_TREE: dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099
PR: 37
PR_CI: 33317358990 SUCCESS
MAIN_CI: 33317603325 SUCCESS
DEPLOY: 33317603348 SUCCESS
IMP031_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_031_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP031_FORMAL_ACCEPTANCE: ACCEPTED
IMP031_ACCEPTED_MAIN_SHA: c3d499b0b8df2a8c7ae9297ab870f6286f81b848
IMP031_ACCEPTED_TREE: dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099
IMP-031_FOUNDER_UAT_REQUIRED: NO
```

Known LOW independent-acceptance notes (NON_BLOCKING_LOW; preserved historical):
1. no explicit dual-cancel concurrency test
2. UNKNOWN-specific ambiguous-cancel test uses shared cancel path

## 1. Purpose

IMP-031 establishes a provider-neutral Delivery foundation that later provider and operating-mode
work can implement against without changing core Delivery authority. Delivery becomes a first-class
domain for neutral dispatch and delivery-execution truth while Order remains the sole commercial
lifecycle authority.

This locked architecture does not select a provider, operating mode, HTTP boundary, runtime topology,
dispatch threshold, proof method, retry schedule, or provider status mapping. It does define the
minimal provider-neutral lifecycle required for implementation boundary C.

## 2. Authority and cross-domain boundaries

| Domain | Authority preserved |
|---|---|
| Cart / Checkout Snapshot | Commerce inputs and immutable purchased-commerce truth only; neither creates a Delivery booking. |
| Serviceability | Outlet/customer serviceability and outlet resolution; not provider selection or Delivery execution. |
| Payment | Original payment and verified-payment authority. |
| Order | Sole commercial lifecycle authority. Delivery must not rewrite Order lifecycle directly. |
| Operations | Preparation, readiness, workforce action, and operational handoff facts. Delivery references confirmed facts rather than replacing their authority. |
| Pricing / Checkout | Historical customer delivery-charge and payable-commerce truth. |
| Delivery | Provider-neutral dispatch, delivery-execution, proof, failure/return, and provider-cost/reconciliation truth. |
| Identity | Customer/workforce identity, authentication, principal, permission, and scope authority. |

Delivery progression may be an input to an authorized Order application workflow, but Delivery does
not directly mutate Order lifecycle. Delivery failure or return does not automatically cancel an
Order, create a Refund, rewrite Payment, or change inventory/availability truth.

The customer delivery charge sealed by Pricing/Checkout is distinct from estimated, booked, final,
cancellation, return, or adjusted provider cost. Provider-cost changes and reconciliation must never
rewrite historical customer-charge truth.

## 3. Provider-neutral Delivery concepts

These concepts remain separate provider-neutral authorities. Exact schema and columns are deferred;
section 4 fixes the lifecycle contract that authorized implementation must preserve.

### Delivery request

The stable BOBA request to arrange delivery execution for one eligible Order. It references the
confirmed dispatch prerequisites and carries stable identity and an immutable request fingerprint.
It is not a Checkout quote and is not proof that an external booking exists.

### Booking and external booking reference

A booking records the neutral result and recovery position of an attempt to arrange delivery. An
external booking reference correlates BOBA truth with an adapter/provider system without making the
provider payload or provider status the Delivery domain model.

### Courier and assignment observation

Courier or assignment data received from an adapter or authorized operational source is evidence.
Only normalized, validated application behavior may establish the current provider-neutral Delivery
assignment fact. Reassignment history must not be collapsed into a mutable provider payload.

### Normalized Delivery progression

Delivery owns provider-neutral execution progression. Section 4 defines its canonical neutral
states, allowed transitions, prerequisites, terminality, and separate return progression. Progression
must be derived through explicit validation; unknown, backward, conflicting, or unsafe observations
remain unapplied or recoverable rather than being forced into authoritative state.

### Provider observation or event

A provider observation/event is durable external evidence with stable deduplication and correlation
identity. Raw provider contracts remain in adapter/evidence storage and never become provider-neutral
business authority. Repeated, delayed, or out-of-order observations must be safe.

### Proof and handoff reference

Delivery owns provider-neutral proof of delivery execution and the Delivery-side reference to a
confirmed handoff. Operations remains authoritative for preparation, readiness, and the operational
handoff fact itself. Exact proof and handoff methods are deferred.

### Failure and return

Delivery owns delivery-execution failure and return truth. Section 4 fixes the provider-neutral
failure and return lifecycle. These facts require explicit downstream commercial or financial
workflows; they do not automatically rewrite Order, Payment, Refund, or inventory authority. Exact
reason catalogs and downstream resolution policies are deferred.

### Provider cost facts and reconciliation

Delivery owns provider execution-cost evidence and neutral reconciliation facts. It may retain
estimated, booked, final, cancellation, return, and adjustment facts without changing the historical
customer delivery charge owned by Pricing/Checkout. Exact reconciliation states, tolerances, and
financial workflows are deferred.

## 4. Authoritative provider-neutral lifecycle

The Delivery lifecycle is intentionally smaller than any provider status model. It records BOBA
Delivery truth, not every courier movement or provider milestone.

### 4.1 Delivery execution states

| State | Meaning | Terminal |
|---|---|---|
| `REQUESTED` | One stable Delivery request exists and no external booking outcome is yet authoritative. | No |
| `BOOKING_OUTCOME_UNKNOWN` | A booking operation may have succeeded externally, but its outcome is ambiguous and must be reconciled by stable identity. It counts as potentially active for the one-active-booking invariant. | No |
| `BOOKED` | One external booking or authorized manual assignment is confirmed active through the provider-neutral booking boundary. | No |
| `PICKED_UP` | The package was handed off through the coordinated Operations/Delivery command with accepted pickup verification. | No |
| `DELIVERED` | Delivery accepted provider-neutral proof and recorded successful completion. | Yes |
| `FAILED` | The booking or delivery attempt definitively failed with a recorded neutral reason and evidence; any commercial, support, refund, or return response is separate. | Yes |
| `CANCELLED` | Delivery execution was authoritatively cancelled before pickup and any possible external booking was confirmed inactive. | Yes |

Courier search, assignment, reassignment, arrival, and dropoff are observations or assignment facts,
not additional authoritative Delivery states. A validated assignment may be recorded while
`BOOKED`; it does not itself advance the Delivery execution lifecycle. Repeating the same assignment
or provider observation is an idempotent no-op, while a validated reassignment preserves prior
assignment history.

### 4.2 Allowed execution transitions and prerequisites

No execution transition is allowed except those below.

| Transition | Required authority or event prerequisite |
|---|---|
| create → `REQUESTED` | The existing Payment, Order, Serviceability, and Operations authorities confirm the applicable dispatch prerequisites; Delivery creates one stable request identity and immutable request fingerprint. |
| `REQUESTED` → `BOOKED` | The provider-neutral booking boundary confirms one active external booking or authorized manual assignment correlated to the stable request. |
| `REQUESTED` → `BOOKING_OUTCOME_UNKNOWN` | A booking operation was attempted but response loss, timeout, or conflicting evidence prevents proving success or failure. |
| `REQUESTED` → `FAILED` | The booking/dispatch attempt is definitively rejected or fails without an active external booking, with normalized reason and evidence. |
| `REQUESTED` → `CANCELLED` | An authorized cancellation occurs before any external attempt, or reconciliation proves no external booking exists. |
| `BOOKING_OUTCOME_UNKNOWN` → `BOOKED` | Stable-identity recovery confirms the earlier external booking is active. |
| `BOOKING_OUTCOME_UNKNOWN` → `FAILED` | Stable-identity recovery confirms the earlier attempt did not create an active booking or establishes a definitive booking failure. |
| `BOOKING_OUTCOME_UNKNOWN` → `CANCELLED` | Authorized cancellation is requested and stable-identity reconciliation confirms that no external booking remains active. |
| `BOOKED` → `PICKED_UP` | Operations confirms the authoritative handoff fact and Delivery confirms the current booking/assignment plus approved pickup verification in one coordinated transaction. |
| `BOOKED` → `FAILED` | Validated evidence establishes a definitive booking or pre-pickup execution failure and the booking is confirmed inactive. |
| `BOOKED` → `CANCELLED` | Authorized cancellation is recorded and the external booking is confirmed cancelled/inactive before pickup. |
| `PICKED_UP` → `DELIVERED` | An accepted provider-neutral proof path confirms delivery to the customer or approved recipient. |
| `PICKED_UP` → `FAILED` | Validated evidence establishes a definitive non-delivery outcome with a normalized reason; cancellation is no longer an allowed Delivery transition. |

Terminal execution states do not transition to another execution state. Correction or reconciliation
after a terminal fact must preserve history and use a separately authorized correction mechanism;
implementation must not invent backward transitions. A new or replacement booking is a new explicit
Delivery request with its own stable identity and an explicit link to the prior request. It is
permitted only after the prior booking is authoritatively inactive, starts again at `REQUESTED`, and
does not erase the prior request/attempt or bypass the transition rules.

### 4.3 Separate return progression

Return is a separate progression linked to a `FAILED` Delivery when a package entered courier custody
and must move to an approved return destination. It does not rewrite the terminal Delivery execution
outcome.

```text
RETURN_REQUESTED → RETURNING → RETURNED
                          └──→ RETURN_FAILED
RETURN_REQUESTED ────────────→ RETURN_FAILED
```

- `RETURN_REQUESTED` requires an authorized return decision, the failed Delivery/handoff reference,
  a recorded neutral reason, and an approved return destination.
- `RETURNING` requires accepted return execution or an authoritative manual start; a provider
  observation alone is insufficient.
- `RETURNED` requires confirmed receipt at the approved return destination and is terminal.
- `RETURN_FAILED` requires validated failure evidence, is terminal for this return attempt, and
  remains available to an authorized support/Operations resolution workflow.

No return state is created for a pre-pickup failure unless an authorized workflow has custody facts
that genuinely require return movement. Return progression never automatically cancels or fulfils an
Order, creates a Refund, rewrites Payment, or restores inventory/availability.

### 4.4 Provider-observation and ambiguous-outcome boundary

A provider callback, query result, dashboard entry, or manual-provider update is durable evidence,
not an authoritative transition. Processing must deduplicate and correlate the observation, retain
its source meaning, normalize it, validate it against current Delivery truth and transition
prerequisites, and only then apply at most one allowed transition. Duplicate observations produce no
duplicate transition or downstream effect. Delayed, backward, unknown, mismatched, or conflicting
observations remain unapplied and recoverable for reconciliation.

`BOOKING_OUTCOME_UNKNOWN` is the only authoritative state for an ambiguous create-booking result. It
must block replacement while an active booking remains possible. Recovery must query or otherwise
reconcile by the stable request/booking identity; the system must never convert ambiguity to
`FAILED`, issue a replacement, or create another courier merely because a retry window elapsed.

### 4.5 Order and coordinated-completion boundary

Delivery and Order retain separate authority:

```text
accepted proof
→ Delivery records `DELIVERED`
→ authorized existing Order/Operations application workflow evaluates current Order truth
→ eligible Order `ACCEPTED` → `FULFILLED` under existing revision, actor, replay, and audit authority
```

The Delivery completion transaction records the neutral `DELIVERED` fact exactly once. Provider
status or callback processing must never directly write Order state. The existing Order/Operations
authority owns the coordinated `FULFILLED` transition and may consume the Delivery completion fact;
it must revalidate current Order state and its normal authorization/concurrency prerequisites. If
that downstream transition cannot complete, Delivery remains truthfully `DELIVERED` and Order
completion remains recoverable or reviewable; neither fact is fabricated or rolled back. No new
Order status is introduced.

`FAILED`, `CANCELLED`, `RETURNED`, or `RETURN_FAILED` likewise do not directly mutate Order, Payment,
Refund, Operations, inventory, or availability truth. They are authoritative Delivery inputs to
separately authorized downstream workflows.

## 5. Dispatch prerequisites

A neutral dispatch request must reference confirmed prerequisites applicable to the Order, including:

- verified payment where payment is required;
- an accepted outlet/Order state;
- valid outlet and delivery-address context; and
- a preparation/readiness estimate where required by the later authorized operating mode.

The prerequisite references do not transfer Payment, Order, Serviceability, Operations, Checkout, or
Identity authority into Delivery. This architecture establishes no timing threshold, dispatch
strategy, or workflow UI.

## 6. Provider-neutral ports and adapter boundary

Delivery application behavior depends on small provider-neutral ports for external booking/recovery,
observation intake/verification, and provider-cost evidence. Exact interface names and signatures are
not locked here.

```text
Delivery application/domain
  ↓ provider-neutral port
future provider or operating-mode adapter
  ↓
external system or authorized operational input
```

Adapters translate provider-specific request, response, callback, credential, account, and status
contracts. No provider SDK, provider-specific payload, credential shape, callback shape, or status
enum may become Delivery domain authority. Business modules must not depend directly on a concrete
provider contract.

## 7. Persistence, concurrency, idempotency, and recovery

PostgreSQL remains authoritative for provider-neutral Delivery business state. The eventual
persistence design must support these architecture-level invariants without relying on in-memory or
browser state:

- a stable Delivery-request and booking identity with a stable request fingerprint;
- duplicate suppression for the same logical dispatch intent;
- at most one active booking for an Order/Delivery request unless an explicit, reconciled
  replacement has made the prior booking inactive;
- safe repeated processing of provider observations/events;
- separation of durable provider evidence, normalization, validation, and authoritative Delivery
  transition; and
- recoverable progress across process failure, response loss, and delayed provider evidence.

An ambiguous external booking response is neither success nor failure. The system must reconcile or
recover the earlier attempt by stable identity before any replacement request is allowed. It must not
blindly retry in a way that can create a duplicate active booking, courier, or provider charge.

Provider observations do not transition Delivery truth merely because they arrived. They are first
deduplicated, correlated, normalized, validated against the current authoritative state, and applied
idempotently. Invalid or unresolved evidence remains recoverable and visible for later reconciliation.

Exact keys, constraints, table columns, retry schedules, leases, and provider-specific recovery
mechanics are intentionally not selected by this locked architecture.

## 8. Implementation boundary C — APPROVED WITH THIS LIFECYCLE AMENDMENT

The approved bounded implementation foundation is:

```text
C. domain model + persistence foundation + provider-neutral ports/interfaces
```

Authorized Boundary C implementation may include only:

- the provider-neutral Delivery domain model;
- persistence required for its authoritative neutral state;
- provider-neutral application and adapter ports/interfaces; and
- deterministic domain, idempotency, concurrency, and recovery behavior with focused tests.

Human adjudication approved boundary C with the lifecycle amendment in section 4. Architecture
remains locked. Implementation is authorized for Boundary C only; authorization does not start
implementation.

IMP-031 must not implement concrete provider adapters; provider API/webhook payloads; provider
selection; the Dehradun operating mode; provider credentials/accounts; HTTP route topology unless a
later architecture review proves it unavoidable; workers, queues, brokers, or new services;
Operations UI; Notifications/WhatsApp; or deployment/infrastructure expansion.

## 9. Explicit deferrals

IMP-032+ retains provider selection and commercial validation, Dehradun operating mode, delivery
account resolution, provider-specific payload/status mapping, callback/API mechanics, and
provider-specific retry or operating thresholds.

Notifications/WhatsApp, administration, observability, infrastructure, security/privacy hardening,
and launch work remain in their existing later roadmap slices. This locked architecture does not
activate or implement them.

## 10. Architecture-lock acceptance criteria

Architecture lock requires review evidence that:

- ARCH-R18 and this capability boundary agree;
- no provider-specific authority leaks into the Delivery domain;
- Order, Operations, Pricing/Checkout, and Delivery ownership is explicit;
- implementation boundary C is unambiguous and human-approved;
- the section 4 lifecycle represents pending/ambiguous booking, confirmed booking, assignment
  observation, pickup, delivery, failure, cancellation, return, and duplicate observation without
  provider-specific policy;
- provider-specific and operating-mode choices remain deferred;
- persistence, concurrency, idempotency, and recovery expectations are sufficient to prevent an
  implementation from inventing durable decisions;
- repository project consistency passes; and
- implementation remains unauthorized until a separate gate.

These are architecture-lock criteria, not implementation acceptance results. Those architecture-lock
criteria were satisfied. Implementation is now `AUTHORIZED` / `STARTED` / `COMPLETE` under Boundary C
and formally `COMPLETE_AND_ACCEPTED`.

## 11. Open questions for architecture review

None recorded. Boundary C is approved with this lifecycle amendment. Architecture is
`ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` / `STARTED` / `COMPLETE` /
`COMPLETE_AND_ACCEPTED`.
