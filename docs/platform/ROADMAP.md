<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "IMPLEMENTATION_SEQUENCE",
  "roadmapVersion": "GTM-R28",
  "acceptedThrough": "IMP-027",
  "currentProductSlice": "IMP-028",
  "nextProductSlice": "IMP-028",
  "gtmBoundary": "IMP-040",
  "lastReviewed": "2026-08-18",
  "supersedes": "GTM-R27"
}
-->

# BOBA Bear — Implementation Roadmap

## 1. Roadmap Rules

- Accepted IMP identity is **permanently immutable**. Do not reinterpret or renumber accepted
  history (IMP-001 → IMP-025 and IMP-005A).
- No other document may independently redefine IMP numbering.
- Formal ROADMAP ledger IMP identifiers use `IMP-\d+[A-Z]?` (numeric id with optional single
  uppercase inserted suffix). Examples: `IMP-001`, `IMP-005A`, `IMP-026C`. Multi-letter,
  lowercase, hyphenated, or underscore forms are not formal ledger ids.
- Only one product slice is normally active.
- A deferred capability cannot be assigned or promoted by an implementation agent.
- Roadmap changes require a `roadmapVersion` change.
- Prefer suffix insertion or explicit versioned remapping rather than silently recycling a
  previously published IMP meaning.
- Future planned mappings must not be silently reused for another capability.
- Coding-agent completion is not acceptance. Acceptance is recorded in [`STATE.md`](./STATE.md).
- After `COMPLETE_AND_ACCEPTED`, a separate reconciliation must update STATE / ROADMAP / acceptance
  records (and DECISION-REGISTER / ARCHITECTURE when durable decisions or global architecture
  change) before the next slice begins. **GTM-R15** records a narrow founder exception to that
  `ACCEPT → RECONCILE → ADVANCE` rule: IMP-026C architecture may proceed while IMP-026 remains
  `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` because the remaining IMP-026 gate is an
  unavailable public HTTPS endpoint, not an implementation defect. **GTM-R16** records the
  IMP-026C architecture lock under that exception. **GTM-R17** records explicit founder
  authorization for IMP-026C implementation. **GTM-R18** records IMP-026C
  `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` behind oldest pending acceptance IMP-026.
  **GTM-R19** records explicit founder authorization for IMP-027 architecture activation
  (`ARCHITECTURE_IN_PROGRESS` only) while IMP-026 and IMP-026C remain unaccepted.
  **GTM-R20** records IMP-027 architecture lock (`ARCHITECTURE_LOCKED`) with implementation
  **NOT_AUTHORIZED**, binding **D-364**, and capability artifact
  `capabilities/IMP-027-refund-foundation.md`, while IMP-026 and IMP-026C remain unaccepted.
  **GTM-R21** records explicit founder authorization for IMP-027 implementation
  (`IMPLEMENTATION_IN_PROGRESS`) under that locked artifact and **D-364** / ARCH-G15, while
  IMP-026 and IMP-026C remain unaccepted.   **GTM-R22** records IMP-027
  `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` behind oldest pending acceptance IMP-026 after
  complete implementation evidence and independent implementation review PASS, while IMP-026 and
  IMP-026C remain unaccepted. **GTM-R23** records explicit founder authorization for IMP-028
  architecture activation (`ARCHITECTURE_IN_PROGRESS` only) while IMP-026, IMP-026C, and IMP-027
  remain unaccepted. **GTM-R24** records IMP-028 architecture lock (`ARCHITECTURE_LOCKED`) with
  implementation **NOT_AUTHORIZED**, binding **D-365**, and capability artifact
  `capabilities/IMP-028-invoice-tax-receipt-credit-note.md`, while IMP-026, IMP-026C, and IMP-027
  remain unaccepted. **GTM-R25** records explicit founder authorization for IMP-028 implementation
  (`IMP-028_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028_IMPLEMENTATION_STARTED: NO`) under that
  locked artifact and **D-365** / ARCH-G16, while IMP-026, IMP-026C, and IMP-027 remain unaccepted.
  Authorization under GTM-R25 did **not** auto-start implementation. **GTM-R26** records IMP-028
  implementation started (`IMP-028_IMPLEMENTATION_STARTED: YES`; lifecycle
  `IMPLEMENTATION_IN_PROGRESS`) under that same authorization and locked artifact, while IMP-026,
  IMP-026C, and IMP-027 remain unaccepted. `pendingAcceptance` identifies the oldest unresolved
  formal acceptance gate; it does not mean a later authorized slice remains in progress. Formal
  acceptance remains contiguous. The continuation path does **not** accept IMP-026, accept
  IMP-026C, accept IMP-027, mark IMP-028 complete/accepted, activate
  IMP-029, or legalize arbitrary simultaneous active slices.

### Slice lifecycle states

Exact vocabulary:

```text
PLANNED
ARCHITECTURE_IN_PROGRESS
ARCHITECTURE_LOCKED
IMPLEMENTATION_IN_PROGRESS
IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
COMPLETE_AND_ACCEPTED
BLOCKED
SUPERSEDED
```

```text
IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
≠
COMPLETE_AND_ACCEPTED
```

`pendingAcceptance` identifies the oldest unresolved formal acceptance gate in the contiguous
product sequence. A later explicitly authorized slice may become
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` behind that gate only under this documented IMP-026
deferred-external-gate exception. GTM-R19 further permits IMP-027 `ARCHITECTURE_IN_PROGRESS`
behind the same oldest pending gate under explicit founder architecture-activation authorization.
GTM-R20 may promote IMP-027 to `ARCHITECTURE_LOCKED` with implementation still `NOT_AUTHORIZED`
behind the same oldest pending gate. GTM-R21 may promote IMP-027 to
`IMPLEMENTATION_IN_PROGRESS` under explicit founder implementation authorization, with
architecture remaining `ARCHITECTURE_LOCKED`, behind the same oldest pending gate. GTM-R22 may
promote IMP-027 to `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` behind the same oldest pending
gate after complete implementation evidence and independent implementation review PASS. GTM-R23 may
set `currentProductSlice=IMP-028` with `ARCHITECTURE_IN_PROGRESS` only (architecture not locked;
implementation not authorized) while IMP-026, IMP-026C, and IMP-027 remain unaccepted. GTM-R24 may
promote IMP-028 to `ARCHITECTURE_LOCKED` with implementation still `NOT_AUTHORIZED` behind the
same oldest pending gate. GTM-R25 may authorize IMP-028 implementation
(`IMP-028_IMPLEMENTATION_AUTHORIZED: YES`) while architecture remains `ARCHITECTURE_LOCKED` and
implementation remains `NOT_STARTED` (`IMP-028_IMPLEMENTATION_STARTED: NO`) behind the same oldest
pending gate. GTM-R25 authorization does **not** auto-start implementation. GTM-R26 may promote
IMP-028 to `IMPLEMENTATION_IN_PROGRESS` (`IMP-028_IMPLEMENTATION_STARTED: YES`) under that
authorization behind the same oldest pending gate. Formal
acceptance remains contiguous. Do not retarget `pendingAcceptance` to a later slice, clear it,
or create a pending-acceptance array.

```text
ARCHITECTURE_LOCKED
≠
IMPLEMENTATION_IN_PROGRESS
```

```text
IMP-028_IMPLEMENTATION_AUTHORIZED: YES
+
IMP-028_IMPLEMENTATION_STARTED: NO
≠
IMPLEMENTATION_IN_PROGRESS
```

```text
IMP-028_IMPLEMENTATION_AUTHORIZED: YES
+
IMP-028_IMPLEMENTATION_STARTED: YES
=
IMPLEMENTATION_IN_PROGRESS
≠
IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
≠
COMPLETE_AND_ACCEPTED
```

### Capability architecture persistence (IMP-024 onward)

Every substantial future IMP must persist its complete locked capability architecture in the
repository before implementation begins. Historical accepted slices may lack governance-era
architecture artifacts; that gap does not downgrade their accepted implementation status.

Canonical capability-architecture directory:

```text
docs/platform/capabilities/
```

IMP-024 locked artifact:

[`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md)

IMP-025 locked artifact:

[`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md)

IMP-026 locked artifact:

[`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md)

IMP-026C locked artifact:

[`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md)

IMP-027 locked artifact:

[`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md)

IMP-028 locked artifact:

[`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)

## 2. Current Position

```text
Accepted Through:     IMP-027 — Refund Foundation
Current Product Slice: IMP-028 — Invoice / Tax Receipt / Credit Note
Next Product Slice:    IMP-028 — Invoice / Tax Receipt / Credit Note
Pending Acceptance:    IMP-026C — Pilot Customer-Commerce UX Hardening
Public GTM Boundary:   IMP-040 — Launch Validation & Cutover
```

IMP-024 architecture remains **ARCHITECTURE_LOCKED**. IMP-024 implementation is
**COMPLETE_AND_ACCEPTED**. IMP-025 architecture remains **ARCHITECTURE_LOCKED**. IMP-025
implementation is **COMPLETE_AND_ACCEPTED**. Independent acceptance remains through Razorpay
Productionization & Payment GTM Readiness.

IMP-026 architecture is **ARCHITECTURE_LOCKED**. IMP-026 implementation is
**COMPLETE_AND_ACCEPTED** after independent acceptance including provider-originated Razorpay Test
Mode webhook proof over public HTTPS.

IMP-026C is **IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE**. IMP-026C architecture remains
**ARCHITECTURE_LOCKED**. Independent implementation review is **PASS**. Implementation evidence is
**COMPLETE**. Formal acceptance of IMP-026C is **not** claimed (`IMP-026C_ACCEPTED: NO`). After
IMP-027 acceptance, `pendingAcceptance = IMP-026C` as the next remaining formal acceptance gate.

IMP-027 is **COMPLETE_AND_ACCEPTED**. Architecture remains **LOCKED**. Implementation evidence is
**COMPLETE**. Independent implementation review is **PASS**. Independent acceptance evidence is
**ACCEPTED**. Formal acceptance is recorded (`IMP-027_ACCEPTED: YES`). `acceptedThrough` advances to
IMP-027.
Locked capability artifact:
[`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md).
Binding decision **D-364**. A Payment that reached BOBA success from provider `captured` remains
successful original collection truth even if the provider later reports a refund; Refund must not
rewrite that truth.

IMP-028 is **IMPLEMENTATION_IN_PROGRESS** under GTM-R28. Architecture remains **LOCKED**.
Implementation is **AUTHORIZED** and **STARTED**. Locked capability artifact:
[`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md).
Binding decision **D-365**. Financial Document is the sole issued statutory/financial-document
authority. Invoice / Tax Receipt / Credit Note product implementation proceeds under GTM-R25
authorization and must remain within the locked architecture. Implementation is **started**,
**not** complete, and **not** accepted by this governance transition. IMP-029 and
later slices remain untouched.

```text
LOCAL_RAZORPAY_GTM_VALIDATION: PASS
EXTERNAL_ACCEPTANCE_GAP: NONE
IMP-026_EXTERNAL_WEBHOOK_GATE: SATISFIED
IMP026_EXTERNAL_ACCEPTANCE_EVIDENCE: ACCEPTED
DEFERRED_EXTERNAL_GATE: NO
SATISFIED: YES
IMP-026_ACCEPTED: YES
IMP-026C: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-026C_IMPLEMENTATION_AUTHORIZED: YES
IMP_026C_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP-026C_ACCEPTED: NO
IMP-027: COMPLETE_AND_ACCEPTED
IMP-027_ARCHITECTURE: LOCKED
IMP-027_IMPLEMENTATION: AUTHORIZED / COMPLETE
IMP-027_IMPLEMENTATION_AUTHORIZED: YES
IMP_027_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP027_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP027_REFUND_FOUNDATION: ACCEPTED
IMP027_FORMAL_ACCEPTANCE: ACCEPTED
IMP-027_ACCEPTED: YES
IMP-028: IMPLEMENTATION_IN_PROGRESS
IMP-028_ARCHITECTURE: LOCKED
IMP-028_IMPLEMENTATION: AUTHORIZED / STARTED
IMP-028_ARCHITECTURE_LOCKED: YES
IMP-028_IMPLEMENTATION_AUTHORIZED: YES
IMP-028_IMPLEMENTATION_STARTED: YES
IMP-028_IMPLEMENTATION_COMPLETE: YES
IMP-028_ACCEPTED: NO
PROVIDER_ORIGINATED_WEBHOOK: VALIDATED_PUBLIC_HTTPS_TEST_MODE
```

Proven locally / through real Razorpay Test Mode: Test credentials, Test Order creation, Standard
Checkout opening, manual Test payment, provider state `captured`, server-side client-evidence
verification, stored provider Order authority, BOBA Payment `SUCCEEDED`, exactly one BOBA Order,
confirmation/history/detail, provider reconciliation, automatic capture, duplicate protection, the
local signed webhook pipeline, and provider-originated webhook delivery over public HTTPS with
signature validation, durable inbox idempotency, and fail-closed invalid-signature behavior. No Live
Mode. No real money. No public database exposure.

This acceptance does **not** authorize production Razorpay launch, public GTM launch, Live Mode, or
removal of IMP-040 launch-validation obligations. It records IMP-026 payment GTM readiness as
independently accepted for the locked Razorpay architecture.

Current V1 payment provider is **Razorpay** (**D-361**), substituting
the previously published Cashfree IMP-026 meaning without changing the slice number. Razorpay
webhook acknowledgement / missing-Order recovery is **D-362** (amends D-361 ack/post-payment effect
only). Webhook acknowledgement timing / durable inbox / asynchronous Payment processing is **D-363**
(amends D-362 acknowledgement timing only).

## 3. Accepted Slices

| IMP | Capability | Lifecycle |
|---|---|---|
| IMP-001 | Behaviour-preserving `src/` migration | COMPLETE_AND_ACCEPTED |
| IMP-002 | Test and quality-tooling foundation | COMPLETE_AND_ACCEPTED |
| IMP-003 | Configuration and startup foundation | COMPLETE_AND_ACCEPTED |
| IMP-004 | PostgreSQL + Drizzle foundation | COMPLETE_AND_ACCEPTED |
| IMP-005 | Database test and migration validation | COMPLETE_AND_ACCEPTED |
| IMP-005A | Dockerized local application runtime | COMPLETE_AND_ACCEPTED |
| IMP-006 | Shared persistence primitives | COMPLETE_AND_ACCEPTED |
| IMP-007 | Transactional outbox and idempotency foundation | COMPLETE_AND_ACCEPTED |
| IMP-008 | Better Auth persistence and sessions | COMPLETE_AND_ACCEPTED |
| IMP-009 | Customer phone OTP authentication | COMPLETE_AND_ACCEPTED |
| IMP-010 | Workforce authentication + MFA | COMPLETE_AND_ACCEPTED |
| IMP-011 | Organization / Territory / Outlet / scoped RBAC | COMPLETE_AND_ACCEPTED |
| IMP-012 | Canonical catalog | COMPLETE_AND_ACCEPTED |
| IMP-013 | Existing menu import + menu presentation | COMPLETE_AND_ACCEPTED |
| IMP-014 | Assortment + operational availability | COMPLETE_AND_ACCEPTED |
| IMP-015 | Pricing, charges and GST/tax engine | COMPLETE_AND_ACCEPTED |
| IMP-016 | Promotions | COMPLETE_AND_ACCEPTED |
| IMP-017 | Customer Profiles | COMPLETE_AND_ACCEPTED |
| IMP-018 | Saved Customer Addresses | COMPLETE_AND_ACCEPTED |
| IMP-019 | Serviceability | COMPLETE_AND_ACCEPTED |
| IMP-020 | Cart | COMPLETE_AND_ACCEPTED |
| IMP-021 | Checkout | COMPLETE_AND_ACCEPTED |
| IMP-022 | Payment | COMPLETE_AND_ACCEPTED |
| IMP-023 | Order | COMPLETE_AND_ACCEPTED |
| IMP-024 | Customer Ordering Transport / API | COMPLETE_AND_ACCEPTED |
| IMP-025 | Customer Ordering UX | COMPLETE_AND_ACCEPTED |
| IMP-026 | Razorpay Productionization & Payment GTM Readiness | COMPLETE_AND_ACCEPTED |
| IMP-027 | Refund Foundation | COMPLETE_AND_ACCEPTED |

## 4. Current Product Slice

```text
IMP-028 — Invoice / Tax Receipt / Credit Note
Lifecycle: IMPLEMENTATION_IN_PROGRESS
Architecture: LOCKED
Implementation: AUTHORIZED / STARTED
Pending acceptance: IMP-026C
IMP-026C: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE (unaccepted; next formal acceptance gate)
IMP-027: COMPLETE_AND_ACCEPTED
IMP-027_ARCHITECTURE: LOCKED
IMP-027_IMPLEMENTATION: AUTHORIZED / COMPLETE
IMP-027_IMPLEMENTATION_AUTHORIZED: YES
IMP_027_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP027_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP027_REFUND_FOUNDATION: ACCEPTED
IMP027_FORMAL_ACCEPTANCE: ACCEPTED
IMP-027_ACCEPTED: YES
IMP-028_ARCHITECTURE: LOCKED
IMP-028_IMPLEMENTATION: AUTHORIZED / STARTED
IMP-028_ARCHITECTURE_LOCKED: YES
IMP-028_IMPLEMENTATION_AUTHORIZED: YES
IMP-028_IMPLEMENTATION_STARTED: YES
IMP-028_IMPLEMENTATION_COMPLETE: YES
IMP-028_ACCEPTED: NO
PREDECESSOR_ACCEPTANCE_UNRESOLVED: IMP-026C
```

Independent acceptance of IMP-026 is recorded. IMP-027 is now independently and formally accepted
under binding **D-364** (`IMP-027_ACCEPTED: YES`; `acceptedThrough = IMP-027`). IMP-026C remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` / `IMP-026C_ACCEPTED: NO`, so
`pendingAcceptance = IMP-026C` as the next formal gate still open in the repository. GTM-R28
continues to record IMP-028 implementation in progress under locked architecture and GTM-R25
authorization (**D-365** / ARCH-G16). Architecture remains **LOCKED**. Implementation is
**AUTHORIZED** and **STARTED**. Do not treat start or working-tree completion as acceptance. Do not
activate IMP-029.

Historical IMP-026A / IMP-026B references are task/authorization labels inside IMP-026 Razorpay
work and are **not** formal product ledger slices. The formal inserted product slice after IMP-026
is **IMP-026C — Pilot Customer-Commerce UX Hardening**.

IMP-024 architecture remains locked at
[`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md).

IMP-025 architecture remains locked at
[`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md).

IMP-026 architecture is locked at
[`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md).

IMP-026C architecture is locked at
[`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md).

IMP-027 architecture is locked at
[`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md)
(binding **D-364**). Implementation is **AUTHORIZED** /
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`.

IMP-028 architecture is locked at
[`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)
(binding **D-365**). Implementation is **AUTHORIZED** / **STARTED**.

## 5. Future GTM Slices

Remaining numeric GTM range IMP-026 → IMP-040: **15** IMP numbers.
Formal product slices in that window including inserted IMP-026C: **16**.

| IMP | Capability | Lifecycle |
|---|---|---|
| IMP-026C | Pilot Customer-Commerce UX Hardening | IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE |
| IMP-028 | Invoice / Tax Receipt / Credit Note | ARCHITECTURE_LOCKED / IMPLEMENTATION_IN_PROGRESS |
| IMP-029 | Operations Console API | PLANNED |
| IMP-030 | Operations Console UI | PLANNED |
| IMP-031 | Provider-Neutral Delivery Foundation | PLANNED |
| IMP-032 | Dehradun Delivery Operating Mode | PLANNED |
| IMP-033 | Notification Foundation | PLANNED |
| IMP-034 | Meta WhatsApp Cloud API Adapter | PLANNED |
| IMP-035 | Initial Administration Capabilities | PLANNED |
| IMP-036 | Observability & Operational Controls | PLANNED |
| IMP-037 | Backup, Restore & Migration Readiness | PLANNED |
| IMP-038 | Security & Privacy Hardening | PLANNED |
| IMP-039 | Production Infrastructure & Release Pipeline | PLANNED |
| IMP-040 | Launch Validation & Cutover | PLANNED |

### 5.1 IMP-026C — Pilot Customer-Commerce UX Hardening (IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE)

```text
Capability: IMP-026C — Pilot Customer-Commerce UX Hardening
Lifecycle: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
Architecture: LOCKED
Implementation: AUTHORIZED / COMPLETE
IMP_026C_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP-026C_ACCEPTED: NO
acceptedThrough: IMP-027
pendingAcceptance: IMP-026C
Placement: after IMP-026, before IMP-027
```

Locked artifact:

[`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md)

Architecture is presentation / client-state mapping / accessibility only. No new domain, API,
database, Payment, or Order authority. Implementation was **explicitly authorized** under GTM-R17
and is **implementation-complete** under GTM-R18. Formal acceptance is **not** claimed. Scope
remains exactly the locked capability artifact.

Objective: a first-time mobile customer can confidently complete the existing BOBA Direct ordering
journey without assistance, using existing server/domain authority. Presentation hardening over
existing accepted/current commerce contracts. Core authority remains Cart → Checkout Snapshot →
Payment → Order.

Planned in-scope:

- early truthful delivery-area / Deliver To presentation;
- reuse existing IMP-019 serviceability where applicable;
- clear product/Add interactions;
- existing quantity controls;
- mobile sticky cart;
- transparent authoritative checkout totals;
- payment confirming / failed / indeterminate customer UX;
- explicit don't-pay-again messaging while unresolved;
- confirmation reassurance;
- contextual customer support using public orderNumber;
- mobile navigation polish;
- accessibility improvements for transaction controls and dynamic payment state.

Explicitly out of scope:

- persisted delivery instructions;
- new Checkout destination/snapshot field;
- new API route;
- new transport contract;
- new DB field/table;
- migration;
- standalone pre-cart Serviceability API;
- fake ETA;
- delivery capacity;
- Search implementation;
- recommendation engine;
- cross-sell engine;
- new menu/catalog modifiers;
- quantitative inventory;
- PREPARING;
- READY;
- OUT_FOR_DELIVERY;
- detailed kitchen fulfilment;
- Refund;
- self-service cancellation;
- Operations Console;
- Delivery implementation;
- Notifications;
- WhatsApp automation;
- support-case domain;
- loyalty;
- favourites;
- referrals;
- personalization;
- scheduled ordering;
- analytics implementation.

Existing Order lifecycle remains: PLACED → ACCEPTED → FULFILLED → CANCELLED.

IMP-025 architecture remains **ARCHITECTURE_LOCKED**. Implementation is
**COMPLETE_AND_ACCEPTED**. IMP-026 architecture is **ARCHITECTURE_LOCKED**. IMP-026
implementation is **COMPLETE_AND_ACCEPTED**. IMP-026C remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (architecture locked; implementation evidence
COMPLETE; independent review PASS; `IMP-026C_ACCEPTED: NO`). IMP-027 is
`COMPLETE_AND_ACCEPTED` under binding **D-364**.

### 5.2 IMP-027 — Refund Foundation (COMPLETE_AND_ACCEPTED)

```text
Capability: IMP-027 — Refund Foundation
Lifecycle: COMPLETE_AND_ACCEPTED
Architecture: LOCKED
Implementation: AUTHORIZED / COMPLETE
IMP-027_ARCHITECTURE: LOCKED
IMP-027_IMPLEMENTATION: AUTHORIZED / COMPLETE
IMP-027_IMPLEMENTATION_AUTHORIZED: YES
IMP_027_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP027_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP027_REFUND_FOUNDATION: ACCEPTED
IMP027_FORMAL_ACCEPTANCE: ACCEPTED
IMP-027_ACCEPTED: YES
acceptedThrough: IMP-027
Placement: after IMP-026C, before IMP-028
Binding decision: D-364
```

Locked artifact:

[`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md)

GTM-R28 records Refund Foundation independently accepted and formally reconciled under the locked
architecture. Deterministic verification completed; independent focused tests 31/31 PASS; real
PostgreSQL evidence proved the locked refund invariants and boundaries. Formal acceptance of
IMP-027 **is** claimed.
Binding payment truth: a Payment that reached BOBA success from provider `captured` remains
successful original collection even if the provider later reports a refund. Refund must not
retroactively rewrite original collection truth. Scope remains exactly the locked capability
artifact and **D-364** / ARCH-G15. Do not steal scope from IMP-028 Invoice / Tax Receipt /
Credit Note or later capabilities. Do not change Refund architecture. GTM-R28 preserves IMP-028
as unaccepted implementation-in-progress and does **not** activate IMP-029.

### 5.3 IMP-028 — Invoice / Tax Receipt / Credit Note (IMPLEMENTATION_IN_PROGRESS)

```text
Capability: IMP-028 — Invoice / Tax Receipt / Credit Note
Lifecycle: IMPLEMENTATION_IN_PROGRESS
Architecture: LOCKED
Implementation: AUTHORIZED / STARTED
IMP-028_ARCHITECTURE: LOCKED
IMP-028_IMPLEMENTATION: AUTHORIZED / STARTED
IMP-028_ARCHITECTURE_LOCKED: YES
IMP-028_IMPLEMENTATION_AUTHORIZED: YES
IMP-028_IMPLEMENTATION_STARTED: YES
IMP-028_IMPLEMENTATION_COMPLETE: NO
IMP-028_ACCEPTED: NO
PREDECESSOR_ACCEPTANCE_UNRESOLVED: IMP-026C
Placement: after IMP-027, before IMP-029
Binding decision: D-365; D-366; D-367
```

Locked artifact:

[`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)

GTM-R26 records Financial Document foundation implementation started under locked **D-365** /
ARCH-G16 and prior GTM-R25 authorization. **D-366** (DR-8 / ARCH-R11 / ARCH-G17) additionally
locks Refund Statutory Reversal Decision Authority without changing IMP-028 lifecycle identity,
completing implementation, or accepting IMP-028. **D-367** (DR-9 / ARCH-R12 / ARCH-G18) additionally
locks Statutory Financial Document Signing and Signed Artifact Authority without changing IMP-028
lifecycle identity, completing implementation, or accepting IMP-028. Financial Document remains the sole immutable
issued statutory/financial-document authority. RefundStatutoryDecision is the durable
classification authority consumed before RFV/CN issuance; refund statutory reversal remains
**NOT_IMPLEMENTED_UNDER_D366**. It consumes Checkout Snapshot, Payment, Refund, Order, and
effective Issuer/Tax Profile without rewriting them. Conditional statutory classes: TAX_INVOICE,
BILL_OF_SUPPLY, RECEIPT_VOUCHER, REFUND_VOUCHER, CREDIT_NOTE. Roadmap “Tax Receipt” is customer
experience/projection — not a statutory `TAX_RECEIPT` type. Section 34 Credit Note requires prior
Tax Invoice(s) only; BoS-only automatic Credit Note is prohibited / fail-closed. Architecture
remains **LOCKED**. Implementation is **AUTHORIZED** and **STARTED**. Do not treat start as
complete or acceptance. Do not activate IMP-029. Do not accept IMP-026, IMP-026C, or IMP-027.
Production GST/accountant gates remain unresolved. `FD_NON_SIGNATURE_COMPLIANCE_CORRECTION=COMPLETE`;
`SIGNATURE_COMPLIANCE=GAP`; `PRE_EXISTING_IMP028_COMPLIANCE_DEFECT=YES` remains a separate IMP-028
completion blocker.

## 6. Deferred / Unscheduled Capabilities

Status: `DEFERRED_UNSCHEDULED` — no IMP number assigned.

- Customer self-service cancellation
- Quantitative Inventory Reservation
- Detailed Kitchen Fulfilment
- Loyalty / Rewards
- Multi-provider Payments
- International Payments
- EMI
- BNPL
- COD

Future possibility does not authorize present implementation.

## 7. GTM Boundary

```text
Public GTM boundary = IMP-040 — Launch Validation & Cutover
```

Vision outcome definition remains in [`VISION.md`](./VISION.md). This roadmap is the only document
that maps that outcome onto the current numbered GTM boundary.

### 7.1 Channel economics (planning requirement)

Strategic channel model (does not change VISION-1):

```text
Zomato / Swiggy
= acquisition + convenience + volume

BOBA Direct
= owned relationship + retention + brand + direct-order economics
```

Primary commercial objective for BOBA Direct: profitable repeat direct orders, not maximum
direct-order volume.

### 7.2 GTM commercial-control measurement

This is a GTM planning / launch requirement. It is **not** authorization to implement analytics
infrastructure now. No speculative financial values are canonical.

Before and during the controlled GTM pilot, BOBA Direct must be able to measure:

Acquisition / attribution: traffic source; campaign/source where available.

Commerce funnel: order entry / menu engagement; product interaction; add to cart; cart; checkout;
payment started; payment verified; order confirmed; delivered.

Commerce metrics: conversion; AOV; items per order; bundle / cross-sell attachment where applicable.

Customer / retention: new vs repeat; 30-day repeat; orders per customer; reorder behaviour when
capability exists.

Operational: payment failure; rejection; refund; fulfilment; support incidence.

Economics: direct contribution per order; comparable marketplace contribution; BOBA Direct vs
Zomato / Swiggy economics.

Conceptual direct contribution model (no hardcoded financial values):

```text
customer revenue
- food cost
- packaging
- discounts
- payment fees
- delivery cost
- refund/support cost
- variable technology cost
```

### 7.3 Controlled pilot governance

Public scaling of BOBA Direct should be evidence-led. The controlled pilot should eventually have
entry criteria, success criteria, hold criteria, rollback criteria, commercial measurement, and
operational measurement.

Numeric thresholds such as `100 fulfilled orders` / `4 weeks` remain `PROPOSED_ONLY` /
`NOT_CANONICAL` until explicitly approved. Do not invent operational SLA numbers; SLAs must come
from actual BOBA operating decisions.

### 7.4 Customer UX strategy inputs

Pilot-minimum customer-commerce UX hardening is formally mapped to **IMP-026C**
(`ARCHITECTURE_LOCKED` / `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`). Broader strategy inputs
such as search, categories, Bestsellers, Fresh Drops, and recommendation/cross-sell remain
`PRODUCT_STRATEGY_INPUTS` / `NOT_IMPLEMENTATION_AUTHORIZATION` unless a later roadmap entry
assigns them. IMP-026C does not reopen accepted IMP-025 and is not assigned to IMP-027. IMP-026C
implementation is complete pending acceptance and remains the current formal pending gate.
Independent acceptance of IMP-026C is **not** claimed. IMP-027 architecture was locked by GTM-R20.
GTM-R21 authorized IMP-027 implementation under that lock. GTM-R28 records IMP-027
`COMPLETE_AND_ACCEPTED`.

## 8. Historical Roadmap Notice

[`implementation-roadmap.md`](./implementation-roadmap.md) is **SUPERSEDED** historical roadmap
version **GTM-R1**. It must not be used for current implementation sequencing.

Historical GTM-R1 meanings that are **not** current:

| Historical GTM-R1 ID | Historical meaning (do not use) | Current GTM-R2/R3 meaning |
|---|---|---|
| IMP-021 | Cashfree payment adapter | Checkout |
| IMP-022 | Payment webhooks and verification | Payment |
| IMP-023 | Refund foundation | Order |
| IMP-024 | Order lifecycle and Operations Console API | Customer Ordering Transport / API |
| IMP-035 | Launch validation and cutover | Initial Administration Capabilities |

Current public GTM boundary is **IMP-040**, not IMP-035.

## 9. Roadmap Change Log

### GTM-R28 — 2026-08-18

- Independent acceptance of IMP-027 — Refund Foundation
  (`COMPLETE_AND_ACCEPTED`; `IMP-027_ACCEPTED: YES`).
- Records refund acceptance evidence under the locked architecture and binding **D-364**
  (`IMP027_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED`;
  `IMP027_REFUND_FOUNDATION: ACCEPTED`;
  `IMP027_FORMAL_ACCEPTANCE: ACCEPTED`).
- Sets `acceptedThrough = IMP-027`; `pendingAcceptance = IMP-026C`; `currentProductSlice` /
  `nextProductSlice` remain IMP-028.
- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`) as the
  next remaining formal acceptance gate.
- IMP-028 remains `IMPLEMENTATION_IN_PROGRESS` (`IMP-028_IMPLEMENTATION_COMPLETE: YES`;
  `IMP-028_ACCEPTED: NO`).
- IMP-029 remains untouched. Decision register remains DR-9. Global architecture remains ARCH-R12.
- Supersedes GTM-R27 for current accepted position.

### GTM-R27 — 2026-08-18

- Independent acceptance of IMP-026 — Razorpay Productionization & Payment GTM Readiness
  (`COMPLETE_AND_ACCEPTED`; `IMP-026_ACCEPTED: YES`).
- Records provider-originated Razorpay Test Mode webhook proof over public HTTPS
  (`IMP-026_EXTERNAL_WEBHOOK_GATE: SATISFIED`; `IMP026_EXTERNAL_ACCEPTANCE_EVIDENCE: ACCEPTED`).
- Sets `acceptedThrough = IMP-026`; `pendingAcceptance = IMP-027`; `currentProductSlice` /
  `nextProductSlice` remain IMP-028.
- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).
- IMP-027 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`) as the
  oldest unresolved formal acceptance gate.
- IMP-028 remains `IMPLEMENTATION_IN_PROGRESS` (`IMP-028_ACCEPTED: NO`; working-tree capability
  artifact may record `IMP-028_IMPLEMENTATION_COMPLETE: YES`).
- Formal acceptance of IMP-027 / IMP-028 is **not** claimed. IMP-029 remains untouched.
- Decision register remains DR-9. Global architecture remains ARCH-R12. Supersedes GTM-R26 for
  current accepted position.

### GTM-R26 — 2026-08-15

- Records IMP-028 Invoice / Tax Receipt / Credit Note foundation implementation **STARTED** under
  prior GTM-R25 authorization, locked capability architecture
  ([`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)),
  and binding **D-365** / ARCH-G16.
- IMP-028 lifecycle = `IMPLEMENTATION_IN_PROGRESS`. Architecture remains `ARCHITECTURE_LOCKED`.
  Implementation = `AUTHORIZED` / `STARTED`
  (`IMP-028_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028_IMPLEMENTATION_STARTED: YES`;
  `IMP-028_IMPLEMENTATION_COMPLETE: NO`; `IMP-028_ACCEPTED: NO`).
- Scope remains exactly the locked capability artifact and D-365. Do not reopen architecture,
  invent TAX_RECEIPT statutory types, weaken Section 34 / BoS fail-closed boundaries, steal Ops
  Console scope, or create a new deployable Financial Document service.
- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. `currentProductSlice` /
  `nextProductSlice` remain IMP-028.
- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**
  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.
- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).
- IMP-027 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`).
- Formal acceptance remains contiguous. This start does **not** accept IMP-026, accept IMP-026C,
  accept IMP-027, mark IMP-028 complete, or activate IMP-029.
- Production GST/accountant configuration gates remain unresolved.
- Decision register remains DR-7. Global architecture remains ARCH-R10. No new decision ID
  (`D-366` remains NEXT_FREE). Supersedes GTM-R25 for current IMP-028 lifecycle position.

### GTM-R25 — 2026-08-15

- Explicit founder authorization to begin IMP-028 Invoice / Tax Receipt / Credit Note
  implementation under the locked capability architecture
  ([`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md))
  and binding **D-365** / ARCH-G16.
- IMP-028 lifecycle = `IMPLEMENTATION_AUTHORIZED`. Architecture remains `ARCHITECTURE_LOCKED`.
  Implementation = `AUTHORIZED` / `NOT_STARTED`
  (`IMP-028_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028_IMPLEMENTATION_STARTED: NO`;
  `IMP-028_IMPLEMENTATION_COMPLETE: NO`; `IMP-028_ACCEPTED: NO`).
- Scope remains exactly the locked capability artifact and D-365. Do not reopen architecture,
  invent TAX_RECEIPT statutory types, weaken Section 34 / BoS fail-closed boundaries, steal Ops
  Console scope, or create a new deployable Financial Document service.
- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. `currentProductSlice` /
  `nextProductSlice` remain IMP-028.
- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**
  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.
- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).
- IMP-027 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`).
- Formal acceptance remains contiguous. This authorization does **not** accept IMP-026, accept
  IMP-026C, accept IMP-027, start product implementation automatically, mark IMP-028 complete, or
  activate IMP-029.
- Production GST/accountant configuration gates remain unresolved.
- No Financial Document product code, schema migration, PDF implementation, customer document UX,
  or Ops Console transport added by this implementation authorization.
- Decision register remains DR-7. Global architecture remains ARCH-R10. No new decision ID
  (`D-366` remains NEXT_FREE).

### GTM-R24 — 2026-08-15

- Locked IMP-028 Invoice / Tax Receipt / Credit Note architecture
  ([`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)).
- IMP-028 lifecycle = `ARCHITECTURE_LOCKED`. Architecture is locked. Implementation remains
  **NOT_AUTHORIZED**.
- Registered binding decision **D-365** (Financial Document Authority and Immutable Issuance
  Model). Decision register → DR-7. Global architecture → ARCH-R10 (Financial Document domain +
  ARCH-G16).
- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. `currentProductSlice` /
  `nextProductSlice` remain IMP-028.
- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**
  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.
- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).
- IMP-027 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`).
- Formal acceptance remains contiguous. This reconciliation does **not** accept IMP-026, accept
  IMP-026C, accept IMP-027, authorize Financial Document implementation, or activate IMP-029.
- No Financial Document product code, schema migration, PDF implementation, or Ops Console
  transport added by this architecture lock.

### GTM-R23 — 2026-08-15

- Explicit founder authorization to activate IMP-028 Invoice / Tax Receipt / Credit Note
  architecture investigation only (`ARCHITECTURE_IN_PROGRESS`). Architecture is **NOT_LOCKED**.
  Implementation is **NOT_AUTHORIZED**. No IMP-028 capability artifact created.
- `currentProductSlice` / `nextProductSlice` become IMP-028.
- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026 (oldest unresolved
  formal acceptance gate). No pending-acceptance array. No out-of-order `acceptedThrough`.
- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**
  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.
- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).
- IMP-027 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`).
- Formal acceptance remains contiguous. This continuation does **not** accept IMP-026, accept
  IMP-026C, accept IMP-027, lock IMP-028 architecture, authorize IMP-028 implementation, invent
  tax/legal document semantics, or activate IMP-029.
- Preserved commercial authorities: Checkout Snapshot, Payment, Refund, Order. IMP-027 owns
  durable Refund facts; IMP-028 owns Invoice / Tax Receipt / Credit Note.
- IMP-028 identity remains Invoice / Tax Receipt / Credit Note. IMP-029 → IMP-040 identities and
  meanings unchanged.
- Public GTM boundary remains IMP-040.
- No product, domain, API, database, invoice, tax-receipt, or credit-note implementation change.
  No new decision ID (`D-365` remains ABSENT).

### GTM-R22 — 2026-08-15

- Recorded IMP-027 Refund Foundation implementation complete pending acceptance under the locked
  capability architecture
  ([`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md))
  and binding **D-364** / ARCH-G15.
- IMP-027 lifecycle promoted to `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Architecture remains
  `ARCHITECTURE_LOCKED`. Implementation evidence = `COMPLETE`. Independent implementation review =
  `PASS`. Formal acceptance is **not** claimed (`IMP-027_ACCEPTED: NO`).
- Deterministic verification completed; full repository suite 863/863 PASS.
- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026 (oldest unresolved formal
  acceptance gate). That pointer does not mean IMP-026C or IMP-027 implementation remains in
  progress. `currentProductSlice` / `nextProductSlice` remain IMP-027.
- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**
  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.
- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).
- Formal acceptance remains contiguous. This reconciliation does **not** accept IMP-026, accept
  IMP-026C, accept IMP-027, change Refund architecture, or activate IMP-028.
- No architecture or scope change. No new decision. No product-code mutation in this reconciliation.

### GTM-R21 — 2026-08-14

- Explicit founder authorization to begin IMP-027 Refund Foundation implementation under the
  locked capability architecture
  ([`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md))
  and binding **D-364** / ARCH-G15.
- IMP-027 lifecycle promoted to `IMPLEMENTATION_IN_PROGRESS`. Architecture remains
  `ARCHITECTURE_LOCKED`. Implementation = `AUTHORIZED` (`IMP-027_IMPLEMENTATION_AUTHORIZED: YES`).
- Scope remains exactly the locked capability artifact. Do not change Refund architecture,
  lifecycle, concurrency invariant, Payment semantics, webhook correlation, provider
  idempotency, IMP-028 boundary, IMP-029 boundary, or runtime topology.
- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. `currentProductSlice`
  / `nextProductSlice` remain IMP-027.
- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**
  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.
- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).
- Formal acceptance remains contiguous. This authorization does **not** accept IMP-026 or
  IMP-026C, generate invoices/credit notes, steal Operations Console scope, or activate IMP-028.
- No Refund product code, schema migration, provider refund API call, or Ops Console transport
  added by this implementation authorization.

### GTM-R20 — 2026-08-14

- Locked IMP-027 Refund Foundation architecture
  ([`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md)).
- IMP-027 lifecycle = `ARCHITECTURE_LOCKED`. Architecture is locked. Implementation remains
  **NOT_AUTHORIZED**.
- Registered binding decision **D-364** (Refund Foundation). Decision register → DR-6. Global
  architecture → ARCH-R9 (Refund domain + ARCH-G15).
- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. `currentProductSlice` /
  `nextProductSlice` remain IMP-027.
- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**
  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.
- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`).
- Formal acceptance remains contiguous. This reconciliation does **not** accept IMP-026 or
  IMP-026C, authorize Refund implementation, or activate IMP-028.
- No Refund product code, schema migration, provider refund API call, or Ops Console transport
  added by this architecture lock.

### GTM-R19 — 2026-08-14

- Explicit founder authorization to activate IMP-027 architecture investigation only
  (`ARCHITECTURE_IN_PROGRESS`). Architecture is **NOT_LOCKED**. Implementation is
  **NOT_AUTHORIZED**. No IMP-027 capability artifact created.
- `currentProductSlice` / `nextProductSlice` become IMP-027.
- `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026 (oldest unresolved
  formal acceptance gate). No pending-acceptance array. No out-of-order `acceptedThrough`.
- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**
  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.
- IMP-026C remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`) behind
  unresolved predecessor acceptance IMP-026.
- Formal acceptance remains contiguous. This continuation does **not** accept IMP-026 or
  IMP-026C, waive webhook debt, lock Refund architecture, authorize Refund implementation, or
  activate IMP-028.
- Preserved payment semantics: provider `captured` → BOBA Payment success remains original
  collection truth; later refund observation must not rewrite that truth. Refund capability
  remains IMP-027.
- IMP-027 identity remains Refund Foundation. IMP-028 → IMP-040 identities and meanings unchanged.
- Public GTM boundary remains IMP-040.
- No product, domain, API, database, or Refund implementation change. No new decision ID
  (`D-364` remains ABSENT).

### GTM-R18 — 2026-08-14

- Promoted IMP-026C lifecycle to `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` after complete
  implementation evidence and independent implementation review PASS.
- Formal acceptance of IMP-026C is **not** claimed (`IMP-026C_ACCEPTED: NO`).
- `pendingAcceptance` remains IMP-026 because it is the oldest unresolved formal acceptance gate.
  That pointer does not mean IMP-026C implementation remains in progress.
- `acceptedThrough` remains IMP-025. `currentProductSlice` / `nextProductSlice` remain IMP-026C.
  This reconciliation does not activate IMP-027.
- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**
  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.
- Formal acceptance remains contiguous. No pending-acceptance array. No out-of-order
  `acceptedThrough`.
- IMP-027 remains not started. IMP-027 → IMP-040 identities and meanings unchanged.
- Public GTM boundary remains IMP-040.
- No product, domain, API, database, or Razorpay architecture change. No new decision ID.

### GTM-R17 — 2026-08-14

- Explicit founder authorization to begin IMP-026C implementation under the locked capability
  architecture
  ([`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md)).
- IMP-026C lifecycle promoted to `IMPLEMENTATION_IN_PROGRESS`. Architecture remains
  `ARCHITECTURE_LOCKED`. Implementation = `AUTHORIZED`.
- Scope remains exactly the locked capability artifact (UI presentation / client-state mapping /
  accessibility / tests only). No domain, API, database, Payment, or Order authority change.
- `acceptedThrough` remains IMP-025. `currentProductSlice` remains IMP-026C.
- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**
  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.
- IMP-027 remains not started. IMP-027 → IMP-040 identities and meanings unchanged.
- Public GTM boundary remains IMP-040.
- No product, domain, API, database, or Razorpay architecture change. No new decision ID.

### GTM-R16 — 2026-08-14

- Completed and locked IMP-026C capability architecture
  ([`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md)).
- IMP-026C lifecycle = `ARCHITECTURE_LOCKED`. Architecture is presentation / client-state /
  accessibility only. No new domain, API, database, Payment, or Order authority.
- Explicit non-goals preserved (no ETA/capacity/search/recommendations/kitchen states/refund/
  delivery/notifications/support-case domain).
- IMP-026C implementation remains **NOT AUTHORIZED**.
- `acceptedThrough` remains IMP-025.
- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent acceptance is **not**
  claimed. Public webhook debt remains `IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`.
- IMP-027 remains not started. IMP-027 → IMP-040 identities and meanings unchanged.
- Public GTM boundary remains IMP-040.
- No product, domain, API, database, or Razorpay architecture change. No new decision ID.

### GTM-R15 — 2026-08-14

- Founder deferred the remaining IMP-026 external provider-webhook acceptance gate because public
  HTTPS infrastructure is not currently available.
- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Independent IMP-026 acceptance is
  **not** claimed. `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026.
- Recorded deferred external acceptance debt `RAZORPAY_PROVIDER_ORIGINATED_WEBHOOK_PUBLIC_HTTPS`
  (`IMP-026_EXTERNAL_WEBHOOK_GATE = DEFERRED_NOT_SATISFIED`; `DEFERRED_EXTERNAL_GATE = YES`;
  `SATISFIED = NO`).
- Documented a narrow external-blocker exception to `ACCEPT → RECONCILE → ADVANCE` so IMP-026C
  architecture work may proceed without accepting IMP-026 or legalizing arbitrary dual active
  slices.
- Activated IMP-026C architecture work: `currentProductSlice` / `nextProductSlice` = IMP-026C;
  IMP-026C lifecycle = `ARCHITECTURE_IN_PROGRESS`; architecture not locked; implementation not
  authorized.
- IMP-027 remains not started. IMP-027 → IMP-040 identities and meanings unchanged.
- Public GTM boundary remains IMP-040.
- Deferred IMP-026 webhook proof remains mandatory before production / public GTM / Live Mode /
  launch acceptance. It is not reassigned as new IMP-039 or IMP-040 scope.
- No product, domain, API, database, or Razorpay architecture change. No new decision ID.

### GTM-R14 — 2026-08-14

- Generalized formal inserted IMP ledger syntax to `IMP-\d+[A-Z]?` (single uppercase suffix).
- Clarified that historical IMP-026A / IMP-026B references remain non-roadmap task/authorization
  labels inside IMP-026 Razorpay work and are not formal product ledger slices.
- Added formal standalone product slice **IMP-026C — Pilot Customer-Commerce UX Hardening**.
- Positioned IMP-026C immediately after IMP-026 and before IMP-027.
- IMP-026C lifecycle = `PLANNED`; architecture not locked; implementation not authorized;
  slice not activated.
- `acceptedThrough` remains IMP-025.
- `currentProductSlice` / `pendingAcceptance` remain IMP-026.
- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`.
- IMP-027 → IMP-040 identities and meanings unchanged.
- Public GTM boundary remains IMP-040.
- No product, domain, API, or database change.

### GTM-R13 — 2026-08-14

- Reconciled IMP-026 external evidence after successful manual real Razorpay Test payment
  verification.
- Recorded `LOCAL_RAZORPAY_GTM_VALIDATION = PASS_WITH_PROVIDER_WEBHOOK_PENDING`.
- Narrowed remaining external blocker to provider-originated Razorpay webhook over public HTTPS
  (`EXTERNAL_ACCEPTANCE_GAP = RAZORPAY_PROVIDER_ORIGINATED_WEBHOOK_PUBLIC_HTTPS`;
  `PROVIDER_ORIGINATED_WEBHOOK = NOT_VALIDATED_LOCALHOST_LIMITATION`;
  `NEXT_GATE = WAITING_FOR_PUBLIC_PROVIDER_WEBHOOK_VALIDATION`).
- `acceptedThrough` remains IMP-025.
- `currentProductSlice` remains IMP-026.
- `pendingAcceptance` remains IMP-026.
- IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`.
- IMP-027 remains not started. IMP-027 → IMP-040 identities are unchanged.
- Added GTM commercial-control / controlled-pilot measurement requirements without authorizing
  implementation or changing future IMP identities. `100 fulfilled orders` / `4 weeks` remain
  `PROPOSED_ONLY` / `NOT_CANONICAL`. Customer UX pilot-minimum items are
  `PRODUCT_STRATEGY_INPUTS` / `NOT_IMPLEMENTATION_AUTHORIZATION`.

### GTM-R12 — 2026-08-14

- Promoted IMP-026 coding-agent lifecycle to `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` after
  deterministic verification. Architecture remains `ARCHITECTURE_LOCKED`.
- Set `pendingAcceptance = IMP-026`; `acceptedThrough` remains IMP-025; `currentProductSlice`
  remains IMP-026; `nextProductSlice` remains IMP-026.
- Recorded Real Razorpay Test Mode as `BLOCKED_EXTERNAL_PREREQUISITES` (pending external GTM
  acceptance evidence). Independent acceptance of IMP-026 is **not** claimed. Do not start IMP-027.

### GTM-R11 — 2026-08-13

- Activated IMP-026 implementation (`IMPLEMENTATION_IN_PROGRESS`) under separate IMP-026A
  server-side Razorpay productionization authorization. Architecture remains
  `ARCHITECTURE_LOCKED`.
- Set `currentProductSlice = IMP-026`; `nextProductSlice` remains IMP-026;
  `acceptedThrough` remains IMP-025; `pendingAcceptance` remains `NONE`.
- Independent acceptance of IMP-026 is **not** claimed. Do not start IMP-026B automatically.
  Do not advance to IMP-027.

### GTM-R10 — 2026-08-13

- Recorded **D-363**: Razorpay durable webhook inbox and asynchronous provider-event processing.
  Amends D-362 only for webhook acknowledgement timing. D-362 remains CURRENT for Order
  materialization outside the provider-ack path, missing-Order recovery, secondary reconciliation,
  and no new deployable service. D-361 remains CURRENT for Razorpay provider selection / Standard
  Checkout.
- Updated locked IMP-026 capability architecture
  ([`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md))
  for durable inbox insert before HTTP 2xx, asynchronous Payment processing inside
  `customer-commerce`, one Attempt = one Razorpay Order, Checkout internal retry disabled, captured
  required for success, automatic capture, and deterministic provider receipt /
  recover-before-recreate.
- IMP-026 lifecycle remains `ARCHITECTURE_LOCKED`. Implementation remains `NOT STARTED` and is
  **not** authorized by this architecture lock.
- `acceptedThrough` remains IMP-025; `currentProductSlice` remains `NONE`; `pendingAcceptance`
  remains `NONE`; `nextProductSlice` remains IMP-026. Do not advance to IMP-027.

### GTM-R9 — 2026-08-13

- Recorded **D-362**: Razorpay webhook acknowledgement and post-payment Order recovery boundary.
  Amends D-361 only for webhook acknowledgement / post-payment Order effect semantics. D-361 remains
  CURRENT for Razorpay provider selection / Standard Checkout.
- Updated locked IMP-026 capability architecture
  ([`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md))
  for acknowledgement-after-durable-Payment, Order materialization outside provider-ack path, and
  missing-Order recovery via existing `recoverMissingOrdersBatch`.
- IMP-026 lifecycle remains `ARCHITECTURE_LOCKED`. Implementation remains `NOT STARTED` and is
  **not** authorized by this architecture lock.
- `acceptedThrough` remains IMP-025; `currentProductSlice` remains `NONE`; `pendingAcceptance`
  remains `NONE`; `nextProductSlice` remains IMP-026. Do not advance to IMP-027.

### GTM-R8 — 2026-08-13

- Explicit approved provider substitution: retitled IMP-026 from
  `Cashfree Productionization & Payment GTM Readiness` to
  **`IMP-026 — Razorpay Productionization & Payment GTM Readiness`**. Slice number unchanged.
- Locked IMP-026 capability architecture
  ([`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md)).
- Set IMP-026 lifecycle to `ARCHITECTURE_LOCKED`. Implementation remains `NOT STARTED` and is
  **not** authorized by this architecture lock.
- `acceptedThrough` remains IMP-025; `currentProductSlice` remains `NONE`; `pendingAcceptance`
  remains `NONE`; `nextProductSlice` remains IMP-026.
- Current V1 payment provider/surface authority is **D-361** (Razorpay / Razorpay Standard
  Checkout), superseding D-161 / D-162 for current authority. Do not advance to IMP-027.

### GTM-R7 — 2026-08-13

- Independent acceptance of IMP-025 — Customer Ordering UX
  (`COMPLETE_AND_ACCEPTED`). Architecture remains `ARCHITECTURE_LOCKED`.
- Set `acceptedThrough = IMP-025`; `currentProductSlice = NONE`;
  `nextProductSlice = IMP-026`.
- IMP-026 remains `PLANNED / NOT STARTED`. Implementation of IMP-026 is not authorized
  by this reconciliation.

### GTM-R6 — 2026-08-13

- Recorded IMP-025 coding-agent implementation complete
  (`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`). Architecture remains
  `ARCHITECTURE_LOCKED`.
- Set `currentProductSlice = IMP-025`; `nextProductSlice` remains IMP-025;
  `acceptedThrough` remains IMP-024.
- Independent acceptance of IMP-025 is **not** claimed. Do not start IMP-026.

### GTM-R5 — 2026-08-13

- Locked IMP-025 capability architecture
  ([`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md)).
- Set IMP-025 lifecycle to `ARCHITECTURE_LOCKED`.
- `acceptedThrough` remains IMP-024; `currentProductSlice` remains `NONE`;
  `nextProductSlice` remains IMP-025.
- IMP-025 implementation remains `NOT STARTED` and is **not** authorized by architecture lock.

### GTM-R4 — 2026-08-12

- Independent acceptance of IMP-024 — Customer Ordering Transport / API
  (`COMPLETE_AND_ACCEPTED`). Architecture remains `ARCHITECTURE_LOCKED`.
- Set `acceptedThrough = IMP-024`; `currentProductSlice = NONE`;
  `nextProductSlice = IMP-025`.
- IMP-025 remains `PLANNED / NOT STARTED`. Implementation of IMP-025 is not authorized
  by this reconciliation.

### GTM-R3 — 2026-08-12

- Locked IMP-024 capability architecture
  ([`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md)).
- Set IMP-024 lifecycle to `ARCHITECTURE_LOCKED`, then activated `IMPLEMENTATION_IN_PROGRESS`
  under separate implementation authorization (architecture lock retained), then recorded
  `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` after coding-agent implementation evidence.
- Set `currentProductSlice = IMP-024`; `acceptedThrough` remains IMP-023.
- Recorded CURRENT decisions D-359 / D-360 (see [`decision-register.md`](./decision-register.md)).

### GTM-R2 — 2026-08-11

- Preserved accepted IMP-001→IMP-023 identities.
- Preserved IMP-005A.
- Superseded older future-roadmap numbering (GTM-R1 / `implementation-roadmap.md`).
- Added Customer Ordering Transport / API as IMP-024.
- Added Customer Ordering UX as IMP-025.
- Separated Cashfree productionization from the Payment domain (IMP-026).
- Moved Refund to its own future capability (IMP-027).
- Added Invoice / Tax Receipt / Credit Note (IMP-028).
- Separated Order domain from Operations Console API/UI (IMP-029 / IMP-030).
- Moved public GTM boundary from IMP-035 to IMP-040.
- Reassigned IMP-035 to Initial Administration Capabilities.

### GTM-R1 — 2026-08-03

- Original approved sequential implementation roadmap (`implementation-roadmap.md`). Historical
  only.

## 10. Authority Boundaries

| Question | Authority |
|---|---|
| IMP identity / sequence / GTM boundary | **This document (`ROADMAP.md`)** |
| Accepted reality | [`STATE.md`](./STATE.md) |
| Product purpose / Non-Goals | [`VISION.md`](./VISION.md) |
| Durable architecture | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Binding decisions | [`decision-register.md`](./decision-register.md) |
| IMP-024 capability architecture | [`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md) |
| IMP-025 capability architecture | [`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md) |
| IMP-026 capability architecture | [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) |
| IMP-026C capability architecture | [`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md) |
| IMP-027 capability architecture | [`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md) |
| IMP-028 capability architecture | [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md) |

Operating lifecycle:

```text
ANCHOR → GATE → EXECUTE → PROVE → ACCEPT → RECONCILE → ADVANCE
```

GTM-R15 exception (narrow): IMP-026C work may proceed while IMP-026 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` with deferred public HTTPS webhook debt. GTM-R16
records IMP-026C `ARCHITECTURE_LOCKED` under that exception. GTM-R17 records explicit founder
authorization for IMP-026C `IMPLEMENTATION_IN_PROGRESS` under the locked capability artifact.
GTM-R18 records IMP-026C `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` behind oldest pending
acceptance IMP-026. GTM-R19 records IMP-027 `ARCHITECTURE_IN_PROGRESS`. GTM-R20 records
IMP-027 `ARCHITECTURE_LOCKED` with implementation **NOT_AUTHORIZED**. GTM-R21 records explicit
founder authorization for IMP-027 `IMPLEMENTATION_IN_PROGRESS` under the locked Refund
Foundation artifact. GTM-R22 records IMP-027 `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` behind
oldest pending acceptance IMP-026. GTM-R23 records explicit founder authorization for IMP-028
`ARCHITECTURE_IN_PROGRESS` only while IMP-026, IMP-026C, and IMP-027 remain unaccepted. GTM-R24
records IMP-028 `ARCHITECTURE_LOCKED` with implementation **NOT_AUTHORIZED** behind the same
oldest pending gate. GTM-R25 records explicit founder authorization for IMP-028 implementation
(`AUTHORIZED` / `NOT_STARTED`) under the locked Financial Document artifact and **D-365** /
ARCH-G16. This is
not IMP-026 acceptance, not IMP-026C acceptance, not IMP-027 acceptance, not IMP-028
implementation start/complete/acceptance, and does not weaken the deferred external gate
generally. The exception does not apply automatically to unrelated future slices.
