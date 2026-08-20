<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "IMPLEMENTATION_SEQUENCE",
  "roadmapVersion": "GTM-R47",
  "acceptedThrough": "IMP-028B",
  "currentProductSlice": "IMP-028C",
  "nextProductSlice": "IMP-029",
  "gtmBoundary": "IMP-040",
  "lastReviewed": "2026-08-20",
  "supersedes": "GTM-R46"
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
  IMP-029, or legalize arbitrary simultaneous active slices. **GTM-R30** separately records
  IMP-028 `COMPLETE_AND_ACCEPTED` after independent acceptance (`acceptedThrough = IMP-028`;
  `pendingAcceptance = NONE`; `currentProductSlice = NONE`; `nextProductSlice = IMP-029`) and
  does **not** authorize or start IMP-029. **GTM-R30** separately records
  IMP-028 `COMPLETE_AND_ACCEPTED` after independent acceptance (`acceptedThrough = IMP-028`;
  `pendingAcceptance = NONE`; `currentProductSlice = NONE`; `nextProductSlice = IMP-029`) and
  does **not** authorize or start IMP-029. **GTM-R31** records binding **D-368** (Customer Menu
  Read Projection Authority) without activating a product slice, authorizing IMP-029, or changing
  `acceptedThrough` / `pendingAcceptance` / `currentProductSlice`. **GTM-R32** records binding
  **D-369** (Customer Paid Modifier Explicit Selection Authority) without activating a product
  slice, authorizing IMP-029, implementing customization, or changing `acceptedThrough` /
  `pendingAcceptance` / `currentProductSlice`. **GTM-R33** records binding **D-370** (Cart Identity
  Transition Authority) without activating a product slice, authorizing IMP-029, implementing Cart
  merge, changing authentication, or changing `acceptedThrough` / `pendingAcceptance` /
  `currentProductSlice`. **GTM-R34** records canonical activation of **IMP-028A — Food Direct UX
  Foundation** as `currentProductSlice` (`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`) without
  locking architecture, authorizing implementation, creating `D-371`, retargeting IMP-029, or
  activating Food Direct families B–F. **GTM-R35** records IMP-028A capability-local architecture
  lock (`ARCHITECTURE_LOCKED`) and implementation authorization
  (`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028A_IMPLEMENTATION_STARTED: NO`) without
  starting product implementation, creating `D-371`, retargeting IMP-029, or activating Food Direct
  families B–F. **GTM-R36** records IMP-028A implementation complete pending independent acceptance
  (`IMP-028A_IMPLEMENTATION_STARTED: YES`; `IMP-028A_IMPLEMENTATION_COMPLETE: YES`;
  `pendingAcceptance = IMP-028A`) without accepting IMP-028A, creating `D-371`, retargeting IMP-029,
  or activating Food Direct families B–F. **GTM-R37** records IMP-028A `COMPLETE_AND_ACCEPTED`
  after independent acceptance (`acceptedThrough = IMP-028A`; `pendingAcceptance = NONE`;
  `currentProductSlice = NONE`; `nextProductSlice = IMP-029`) and does **not** authorize or start
  IMP-029, implement D-368 / D-369 / D-370, create `D-371`, or activate Food Direct families B–F.
  **GTM-R38** records canonical activation of **IMP-028B — Customer Menu Projection + Discovery**
  as `currentProductSlice` (`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`; architecture `NOT_LOCKED`)
  without locking architecture, authorizing implementation, creating `D-371`, retargeting IMP-029,
  or activating Food Direct families C–J. **GTM-R39** records IMP-028B capability-local architecture
  lock (`ARCHITECTURE_LOCKED`) and implementation authorization
  (`IMP-028B_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028B_IMPLEMENTATION_STARTED: NO`) without
  starting product implementation, creating `D-371`, retargeting IMP-029, or activating Food Direct
  families C–J. IMP-029 remains `PLANNED` / `NOT_STARTED` /
  `NOT_AUTHORIZED`.

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
IMP-028A_IMPLEMENTATION_AUTHORIZED: YES
+
IMP-028A_IMPLEMENTATION_STARTED: NO
≠
IMPLEMENTATION_IN_PROGRESS
```

```text
IMP-028A_IMPLEMENTATION_AUTHORIZED: YES
+
IMP-028A_IMPLEMENTATION_STARTED: YES
+
IMP-028A_IMPLEMENTATION_COMPLETE: YES
=
IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
≠
COMPLETE_AND_ACCEPTED
```

```text
IMP-028B_IMPLEMENTATION_AUTHORIZED: YES
+
IMP-028B_IMPLEMENTATION_STARTED: YES
+
IMP-028B_IMPLEMENTATION_COMPLETE: YES
=
IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
≠
COMPLETE_AND_ACCEPTED
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

IMP-028A locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation
**AUTHORIZED** / **COMPLETE** / independently accepted):

[`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md)

IMP-028B locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation
**AUTHORIZED** / **STARTED** / **COMPLETE** / independently accepted):

[`capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](./capabilities/IMP-028B-customer-menu-projection-and-discovery.md)

IMP-028C locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation
**AUTHORIZED** / **STARTED** / **COMPLETE**):

[`capabilities/IMP-028C-food-customization.md`](./capabilities/IMP-028C-food-customization.md)

## 2. Current Position

```text
Accepted Through:     IMP-028B — Customer Menu Projection + Discovery
Current Product Slice: IMP-028C — Food Customization
Next Product Slice:    IMP-029 — Operations Console API
Pending Acceptance:    IMP-028C
Public GTM Boundary:   IMP-040 — Launch Validation & Cutover
```

IMP-024 architecture remains **ARCHITECTURE_LOCKED**. IMP-024 implementation is
**COMPLETE_AND_ACCEPTED**. IMP-025 architecture remains **ARCHITECTURE_LOCKED**. IMP-025
implementation is **COMPLETE_AND_ACCEPTED**. Independent acceptance remains through Razorpay
Productionization & Payment GTM Readiness.

IMP-026 architecture is **ARCHITECTURE_LOCKED**. IMP-026 implementation is
**COMPLETE_AND_ACCEPTED** after independent acceptance including provider-originated Razorpay Test
Mode webhook proof over public HTTPS.

IMP-026C is **COMPLETE_AND_ACCEPTED**. IMP-026C architecture remains
**ARCHITECTURE_LOCKED**. Independent implementation review is **PASS**. Implementation evidence is
**COMPLETE**. Independent acceptance evidence is **ACCEPTED**. Formal acceptance is recorded
(`IMP-026C_ACCEPTED: YES`). `acceptedThrough` remains IMP-027 because IMP-026C is a supplemental
inserted gate, not a contiguous `acceptedThrough` advancement. After IMP-026C acceptance,
GTM-R29 set `pendingAcceptance = IMP-028` as the then-remaining formal acceptance gate. GTM-R30
records IMP-028 `COMPLETE_AND_ACCEPTED`; `pendingAcceptance` is now `NONE`.

IMP-027 is **COMPLETE_AND_ACCEPTED**. Architecture remains **LOCKED**. Implementation evidence is
**COMPLETE**. Independent implementation review is **PASS**. Independent acceptance evidence is
**ACCEPTED**. Formal acceptance is recorded (`IMP-027_ACCEPTED: YES`). `acceptedThrough` advances to
IMP-027.
Locked capability artifact:
[`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md).
Binding decision **D-364**. A Payment that reached BOBA success from provider `captured` remains
successful original collection truth even if the provider later reports a refund; Refund must not
rewrite that truth.

IMP-028 is **COMPLETE_AND_ACCEPTED** under GTM-R30. Architecture remains **LOCKED**.
Implementation is **AUTHORIZED** and **COMPLETE**. Locked capability artifact:
[`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md).
Binding decisions **D-365** / **D-366** / **D-367**. Financial Document is the sole issued
statutory/financial-document authority. Formal acceptance of IMP-028 does **not** authorize or
start IMP-029. IMP-029 remains `PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`. GTM-R34 records
canonical activation of **IMP-028A — Food Direct UX Foundation** as `currentProductSlice`.
GTM-R35 records IMP-028A capability-local architecture lock and implementation authorization.
IMP-028A is `COMPLETE_AND_ACCEPTED`. Architecture is **ARCHITECTURE_LOCKED**.
Implementation of IMP-028A is **authorized**, **started**, **complete**, and **independently
accepted** (`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028A_IMPLEMENTATION_STARTED: YES`;
`IMP-028A_IMPLEMENTATION_COMPLETE: YES`; `IMP-028A_ACCEPTED: YES`). `acceptedThrough` remains
IMP-028A. GTM-R38 through GTM-R41 record the historical IMP-028B activation, architecture lock,
implementation start, and implementation-complete-pending-acceptance progression. GTM-R42 records
IMP-028B `COMPLETE_AND_ACCEPTED`. Architecture is `ARCHITECTURE_LOCKED`; implementation is
**AUTHORIZED** / **STARTED** / **COMPLETE**; formal acceptance is recorded
(`IMP-028B_ACCEPTED: YES`; `acceptedThrough = IMP-028B`; `pendingAcceptance = NONE`;
`currentProductSlice = NONE`). `nextProductSlice` remains IMP-029 as next-planned GTM bookkeeping
only. Food Direct families C–J are not activated. `D-371` is unused. Acceptance of IMP-028B does
not start IMP-029.

GTM-R31 records binding **D-368** (Customer Menu Read Projection Authority). Customer Menu serving
is a server-backed READ PROJECTION over existing commerce authorities, implemented and accepted
under IMP-028B. The prior accepted IMP-025 static `ordering-catalog.json` is no longer the customer
storefront runtime delivery. D-368 itself did not authorize Menu implementation, create a Menu
endpoint, activate IMP-029, or change
`acceptedThrough` / `pendingAcceptance` / `currentProductSlice`. GTM-R32 records binding **D-369**
(Customer Paid Modifier Explicit Selection Authority). A positive-price modifier must not become
customer purchase intent solely because it is a catalog/default selection. D-369 does **not**
authorize customization implementation, populate modifier data, activate IMP-029, or change
`acceptedThrough` / `pendingAcceptance` / `currentProductSlice`. GTM-R33 records binding **D-370**
(Cart Identity Transition Authority). Guest and customer purchase intent must be reconciled without
silent winner selection; sign-out isolates the browser from the customer Cart without deleting it.
D-370 does **not** authorize Cart-merge implementation, change authentication, activate IMP-029, or
change `acceptedThrough` / `pendingAcceptance` / `currentProductSlice`. Next free decision is
**D-371**.

```text
LOCAL_RAZORPAY_GTM_VALIDATION: PASS
EXTERNAL_ACCEPTANCE_GAP: NONE
IMP-026_EXTERNAL_WEBHOOK_GATE: SATISFIED
IMP026_EXTERNAL_ACCEPTANCE_EVIDENCE: ACCEPTED
DEFERRED_EXTERNAL_GATE: NO
SATISFIED: YES
IMP-026_ACCEPTED: YES
IMP-026C: COMPLETE_AND_ACCEPTED
IMP-026C_IMPLEMENTATION_AUTHORIZED: YES
IMP_026C_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP026C_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP026C_FORMAL_ACCEPTANCE: ACCEPTED
IMP-026C_ACCEPTED: YES
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
IMP-028: COMPLETE_AND_ACCEPTED
IMP-028_ARCHITECTURE: LOCKED
IMP-028_IMPLEMENTATION: AUTHORIZED / COMPLETE
IMP-028_ARCHITECTURE_LOCKED: YES
IMP-028_IMPLEMENTATION_AUTHORIZED: YES
IMP-028_IMPLEMENTATION_STARTED: YES
IMP-028_IMPLEMENTATION_COMPLETE: YES
IMP-028_ACCEPTED: YES
IMP-028A: COMPLETE_AND_ACCEPTED
IMP-028A_ARCHITECTURE_LOCKED: YES
IMP-028A_IMPLEMENTATION_AUTHORIZED: YES
IMP-028A_IMPLEMENTATION_STARTED: YES
IMP-028A_IMPLEMENTATION_COMPLETE: YES
IMP-028A_ACCEPTED: YES
IMP-028B: COMPLETE_AND_ACCEPTED
IMP-028B_ARCHITECTURE_LOCKED: YES
IMP-028B_IMPLEMENTATION_AUTHORIZED: YES
IMP-028B_IMPLEMENTATION_STARTED: YES
IMP-028B_IMPLEMENTATION_COMPLETE: YES
IMP-028B_ACCEPTED: YES
IMP-029: PLANNED / NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED: NO
IMP-029_STARTED: NO
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
| IMP-026C | Pilot Customer-Commerce UX Hardening | COMPLETE_AND_ACCEPTED |
| IMP-027 | Refund Foundation | COMPLETE_AND_ACCEPTED |
| IMP-028 | Invoice / Tax Receipt / Credit Note | COMPLETE_AND_ACCEPTED |
| IMP-028A | Food Direct UX Foundation | COMPLETE_AND_ACCEPTED |
| IMP-028B | Customer Menu Projection + Discovery | COMPLETE_AND_ACCEPTED |

## 4. Current Product Slice

```text
IMP-028C — Food Customization
Lifecycle: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
Architecture: ARCHITECTURE_LOCKED
Implementation: AUTHORIZED / STARTED / COMPLETE
IMP-028C_ARCHITECTURE_LOCKED: YES
IMP-028C_IMPLEMENTATION_AUTHORIZED: YES
IMP-028C_IMPLEMENTATION_STARTED: YES
IMP-028C_IMPLEMENTATION_COMPLETE: YES
IMP-028C_ACCEPTED: NO
IMP-028B_ARCHITECTURE_LOCKED: YES
IMP-028B_IMPLEMENTATION_AUTHORIZED: YES
IMP-028B_IMPLEMENTATION_STARTED: YES
IMP-028B_IMPLEMENTATION_COMPLETE: YES
IMP-028B_ACCEPTED: YES
Next product slice: IMP-029 — Operations Console API (PLANNED / NOT_STARTED / NOT_AUTHORIZED)
Pending acceptance: IMP-028C
acceptedThrough: IMP-028B
IMP-026C: COMPLETE_AND_ACCEPTED
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
IMP-028: COMPLETE_AND_ACCEPTED
IMP-028_ARCHITECTURE: LOCKED
IMP-028_IMPLEMENTATION: AUTHORIZED / COMPLETE
IMP-028_ARCHITECTURE_LOCKED: YES
IMP-028_IMPLEMENTATION_AUTHORIZED: YES
IMP-028_IMPLEMENTATION_STARTED: YES
IMP-028_IMPLEMENTATION_COMPLETE: YES
IMP-028_ACCEPTED: YES
IMP-028A: COMPLETE_AND_ACCEPTED
IMP-028A_ARCHITECTURE_LOCKED: YES
IMP-028A_IMPLEMENTATION_AUTHORIZED: YES
IMP-028A_IMPLEMENTATION_STARTED: YES
IMP-028A_IMPLEMENTATION_COMPLETE: YES
IMP-028A_ACCEPTED: YES
IMP-028B: COMPLETE_AND_ACCEPTED
IMP-028B_ARCHITECTURE_LOCKED: YES
IMP-028B_IMPLEMENTATION_AUTHORIZED: YES
IMP-028B_IMPLEMENTATION_STARTED: YES
IMP-028B_IMPLEMENTATION_COMPLETE: YES
IMP-028B_ACCEPTED: YES
IMP-029: PLANNED / NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED: NO
IMP-029_STARTED: NO
```

Independent acceptance of IMP-026 is recorded. IMP-027 remains independently and formally accepted
under binding **D-364** (`IMP-027_ACCEPTED: YES`). IMP-026C remains `COMPLETE_AND_ACCEPTED` /
`IMP-026C_ACCEPTED: YES` as a supplemental inserted gate. GTM-R30 records IMP-028 independently
accepted (`IMP-028_ACCEPTED: YES`; `acceptedThrough = IMP-028`; `pendingAcceptance = NONE`;
`currentProductSlice = NONE`; `nextProductSlice = IMP-029`). IMP-029 remains `PLANNED` /
`NOT_STARTED` / `NOT_AUTHORIZED`. Formal acceptance of IMP-028 does **not** authorize or start
IMP-029. GTM-R31 records **D-368** without changing the then-current product-slice position. GTM-R32 records
**D-369** without changing the then-current product-slice position. GTM-R33 records **D-370** without changing
the then-current product-slice position. **GTM-R34** records canonical activation of **IMP-028A —
Food Direct UX Foundation** as `currentProductSlice`. **GTM-R35** records IMP-028A capability-local
architecture lock and implementation authorization (`IMPLEMENTATION_AUTHORIZED` / `NOT_STARTED`;
architecture `ARCHITECTURE_LOCKED`; `IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`;
`IMP-028A_IMPLEMENTATION_STARTED: NO`). **GTM-R36** records IMP-028A
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-028A_IMPLEMENTATION_STARTED: YES`;
`IMP-028A_IMPLEMENTATION_COMPLETE: YES`; `pendingAcceptance = IMP-028A`). **GTM-R37** records
IMP-028A independently accepted (`COMPLETE_AND_ACCEPTED`; `IMP-028A_ACCEPTED: YES`;
`acceptedThrough = IMP-028A`; `pendingAcceptance = NONE`; `currentProductSlice = NONE`;
`nextProductSlice = IMP-029`). Formal acceptance of IMP-028A does **not** authorize or start
IMP-029. **GTM-R38** historically records canonical activation of **IMP-028B — Customer Menu Projection +
Discovery** as `currentProductSlice` (`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`; architecture
`NOT_LOCKED`; `IMP-028B_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-028B_IMPLEMENTATION_STARTED: NO`;
`IMP-028B_IMPLEMENTATION_COMPLETE: NO`; `IMP-028B_ACCEPTED: NO`). **GTM-R39** historically records IMP-028B
capability-local architecture lock and implementation authorization (`IMPLEMENTATION_AUTHORIZED` /
`NOT_STARTED`; architecture `ARCHITECTURE_LOCKED`; `IMP-028B_IMPLEMENTATION_AUTHORIZED: YES`;
`IMP-028B_IMPLEMENTATION_STARTED: NO`; `IMP-028B_IMPLEMENTATION_COMPLETE: NO`;
`IMP-028B_ACCEPTED: NO`). `acceptedThrough` remains
IMP-028A. `pendingAcceptance` remains NONE. `nextProductSlice` remains IMP-029. Decision register
remains DR-12. Global architecture remains ARCH-R15. Next free decision remains **D-371**. IMP-029
remains `PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED` and is **not** this capability. Food Direct
families C–J are not activated. Architecture lock / implementation authorization of IMP-028B does
**not** start product implementation.

Historical IMP-026A / IMP-026B references are task/authorization labels inside IMP-026 Razorpay
work and are **not** formal product ledger slices. The formal inserted product slice after IMP-026
is **IMP-026C — Pilot Customer-Commerce UX Hardening**.

IMP-024 architecture remains locked at
[`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md).

IMP-025 architecture remains locked at
[`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md).
**D-368** superseded only that artifact’s future-facing Menu serving/read-boundary; accepted
IMP-025 implementation remains accepted while IMP-028B is the CURRENT storefront delivery. **D-370** supersedes only that
artifact’s future-facing Checkout-only guest→customer identity-transition lock and whole-cart
silent-winner policy; accepted checkout claim/reconcile implementation remains CURRENT until an
authorized future capability implements D-370.

IMP-026 architecture is locked at
[`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md).

IMP-026C architecture is locked at
[`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md).

IMP-027 architecture is locked at
[`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md)
(binding **D-364**). Implementation is **AUTHORIZED** /
`COMPLETE_AND_ACCEPTED`.

IMP-028 architecture is locked at
[`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)
(binding **D-365** / **D-366** / **D-367**). Implementation is **AUTHORIZED** / **COMPLETE** /
`COMPLETE_AND_ACCEPTED`.

IMP-028A locked capability architecture is at
[`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md).
Architecture is **ARCHITECTURE_LOCKED**. Implementation is **AUTHORIZED** / **COMPLETE** /
`COMPLETE_AND_ACCEPTED`. Formal acceptance of IMP-028A **is** claimed (`IMP-028A_ACCEPTED: YES`).

IMP-028B locked capability architecture is at
[`capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](./capabilities/IMP-028B-customer-menu-projection-and-discovery.md).
Architecture is **ARCHITECTURE_LOCKED**. Implementation is **AUTHORIZED** / **COMPLETE** /
`COMPLETE_AND_ACCEPTED`. Formal acceptance of IMP-028B is claimed (`IMP-028B_ACCEPTED: YES`).

IMP-028C locked capability architecture is at
[`capabilities/IMP-028C-food-customization.md`](./capabilities/IMP-028C-food-customization.md).
Architecture is **ARCHITECTURE_LOCKED**. Implementation is **AUTHORIZED** / **STARTED** /
**COMPLETE**; formal acceptance is **not** claimed (`IMP-028C_ACCEPTED: NO`;
`pendingAcceptance = IMP-028C`). D-369 governs paid-modifier explicit intent. D-371 remains unused.

## 5. Future GTM Slices

Remaining numeric GTM range IMP-029 → IMP-040: **12** IMP numbers.
Accepted inserted slices IMP-026C, IMP-028A, and IMP-028B remain in the accepted ledger and are not future
identities.

IMP-028A is the first Food Direct experience-programme capability. It was inserted after accepted
IMP-028 and before planned GTM IMP-029. It does **not** consume or remap IMP-029 → IMP-040
identities. IMP-028A is now `COMPLETE_AND_ACCEPTED` and is not a remaining future slice.

IMP-028B is the second Food Direct experience-programme capability. It was inserted after accepted
IMP-028A and before planned GTM IMP-029 using suffix convention. It does **not** consume or remap
IMP-029 → IMP-040 identities. IMP-028B is `COMPLETE_AND_ACCEPTED` and is not a remaining future slice.

IMP-028C is the third Food Direct experience-programme capability. It is inserted after accepted
IMP-028B and before planned GTM IMP-029 using the established suffix convention. It does **not**
consume or remap IMP-029 → IMP-040 identities.

| IMP | Capability | Lifecycle |
|---|---|---|
| IMP-028C | Food Customization | ARCHITECTURE_LOCKED |
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

### 5.0 IMP-028A — Food Direct UX Foundation (COMPLETE_AND_ACCEPTED)

```text
Capability: IMP-028A — Food Direct UX Foundation
Lifecycle: COMPLETE_AND_ACCEPTED
Architecture: ARCHITECTURE_LOCKED
Implementation: AUTHORIZED / STARTED / COMPLETE
IMP-028A_ARCHITECTURE_LOCKED: YES
IMP-028A_IMPLEMENTATION_AUTHORIZED: YES
IMP-028A_IMPLEMENTATION_STARTED: YES
IMP-028A_IMPLEMENTATION_COMPLETE: YES
IMP-028A_ACCEPTED: YES
IMP028A_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP028A_FORMAL_ACCEPTANCE: ACCEPTED
acceptedThrough at IMP-028A acceptance: IMP-028A
pendingAcceptance: NONE
currentProductSlice: NONE
nextProductSlice: IMP-029
Placement: after IMP-028, before IMP-029
D371_CREATED: NO
IMP029_RETARGETED: NO
```

Locked capability architecture:
[`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md).

Founder-accepted supporting slice (rationale retained):
[`experience/slices/food-direct-ux-foundation.md`](./experience/slices/food-direct-ux-foundation.md)
(`FOUNDER_ACCEPTED`; `CANONICALIZED_AS = IMP-028A`; `INDEPENDENTLY_ACCEPTED`).

IMP-028A is a customer-commerce **shell** over existing IMP-009 session and existing Menu / Cart /
My Orders destinations. It does **not** implement D-368 / D-369 / D-370, change commercial
authority, create schema/migrations, or retarget IMP-029. GTM-R37 records independent acceptance
(`COMPLETE_AND_ACCEPTED`; `IMP-028A_ACCEPTED: YES`). Formal acceptance of IMP-028A does **not**
authorize or start IMP-029. GTM-R38 later activates IMP-028B as `currentProductSlice` without
changing IMP-028A acceptance.

### 5.0B IMP-028B — Customer Menu Projection + Discovery (COMPLETE_AND_ACCEPTED)

```text
Capability: IMP-028B — Customer Menu Projection + Discovery
Lifecycle: COMPLETE_AND_ACCEPTED
Architecture: ARCHITECTURE_LOCKED
Implementation: AUTHORIZED / STARTED / COMPLETE
IMP-028B_ARCHITECTURE_LOCKED: YES
IMP-028B_IMPLEMENTATION_AUTHORIZED: YES
IMP-028B_IMPLEMENTATION_STARTED: YES
IMP-028B_IMPLEMENTATION_COMPLETE: YES
IMP-028B_ACCEPTED: YES
acceptedThrough: IMP-028B
pendingAcceptance: NONE
currentProductSlice: NONE
nextProductSlice: IMP-029
Placement: after IMP-028A, before IMP-029
D371_CREATED: NO
IMP029_RETARGETED: NO
```

Canonical capability:
[`capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](./capabilities/IMP-028B-customer-menu-projection-and-discovery.md).

Supporting slice (rationale retained):
[`experience/slices/customer-menu-projection-and-discovery.md`](./experience/slices/customer-menu-projection-and-discovery.md)
(`SUPPORTING`; `CANONICALIZED_AS = IMP-028B`).

IMP-028B is the first server-backed BOBA Direct customer Menu under D-368 / ARCH-G19. It projects
existing Menu/catalog/pricing authorities into the customer commerce surface and improves
category-based discovery without becoming commercial truth. Architecture is locked and the
implementation is accepted. It did not implement D-369 / D-370, change commercial authority,
create schema/migrations, or retarget IMP-029.

### 5.1 IMP-026C — Pilot Customer-Commerce UX Hardening (COMPLETE_AND_ACCEPTED)

```text
Capability: IMP-026C — Pilot Customer-Commerce UX Hardening
Lifecycle: COMPLETE_AND_ACCEPTED
Architecture: LOCKED
Implementation: AUTHORIZED / COMPLETE
IMP_026C_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP026C_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP026C_FORMAL_ACCEPTANCE: ACCEPTED
IMP-026C_ACCEPTED: YES
acceptedThrough: IMP-027
pendingAcceptance: IMP-028
Placement: after IMP-026, before IMP-027
```

Locked artifact:

[`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md)

Architecture is presentation / client-state mapping / accessibility only. No new domain, API,
database, Payment, or Order authority. Implementation was **explicitly authorized** under GTM-R17
and is **implementation-complete** under GTM-R18. Formal acceptance is recorded under GTM-R29.
Scope remains exactly the locked capability artifact.

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
implementation is **COMPLETE_AND_ACCEPTED**. IMP-026C is
`COMPLETE_AND_ACCEPTED` (architecture locked; implementation evidence
COMPLETE; independent review PASS; independent acceptance evidence ACCEPTED;
`IMP-026C_ACCEPTED: YES`). IMP-027 is
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

### 5.3 IMP-028 — Invoice / Tax Receipt / Credit Note (COMPLETE_AND_ACCEPTED)

```text
Capability: IMP-028 — Invoice / Tax Receipt / Credit Note
Lifecycle: COMPLETE_AND_ACCEPTED
Architecture: LOCKED
Implementation: AUTHORIZED / COMPLETE
IMP-028_ARCHITECTURE: LOCKED
IMP-028_IMPLEMENTATION: AUTHORIZED / COMPLETE
IMP-028_ARCHITECTURE_LOCKED: YES
IMP-028_IMPLEMENTATION_AUTHORIZED: YES
IMP-028_IMPLEMENTATION_STARTED: YES
IMP-028_IMPLEMENTATION_COMPLETE: YES
IMP-028_ACCEPTED: YES
acceptedThrough: IMP-028
pendingAcceptance: NONE
currentProductSlice: NONE
nextProductSlice: IMP-029
IMP-029: PLANNED / NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED: NO
IMP-029_STARTED: NO
Placement: after IMP-027, before IMP-029
Binding decision: D-365; D-366; D-367
```

Locked artifact:

[`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)

GTM-R30 records Invoice / Tax Receipt / Credit Note independently accepted and formally reconciled
under the locked architecture and binding **D-365** / **D-366** / **D-367**. Financial Document
remains the sole immutable issued statutory/financial-document authority. RefundStatutoryDecision
governs refund statutory reversal without rewriting Refund money truth. SignatureArtifact governs
signed statutory artifact readiness under the attended-async manual signed-PDF MVP. Architecture
remains **LOCKED**. Implementation is **AUTHORIZED** and **COMPLETE**. Formal acceptance of IMP-028
**is** claimed. This reconciliation does **not** authorize or start IMP-029. Production
GST/accountant configuration gates remain unresolved deployment inputs, not open architecture
questions.

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
(`ARCHITECTURE_LOCKED` / `COMPLETE_AND_ACCEPTED`). Broader strategy inputs
such as search, categories, Bestsellers, Fresh Drops, and recommendation/cross-sell remain
`PRODUCT_STRATEGY_INPUTS` / `NOT_IMPLEMENTATION_AUTHORIZATION` unless a later roadmap entry
assigns them. IMP-026C does not reopen accepted IMP-025 and is not assigned to IMP-027. IMP-026C
is independently and formally accepted as a supplemental inserted gate (`IMP-026C_ACCEPTED: YES`).
`acceptedThrough` is IMP-028A. `pendingAcceptance` is NONE. IMP-027 architecture was locked
by GTM-R20. GTM-R21 authorized IMP-027 implementation under that lock. GTM-R28 records IMP-027
`COMPLETE_AND_ACCEPTED`. GTM-R30 records IMP-028 `COMPLETE_AND_ACCEPTED`. GTM-R31 records **D-368**
without activating IMP-029. GTM-R32 records **D-369** without activating IMP-029. GTM-R33 records
**D-370** without activating IMP-029. GTM-R34 records **IMP-028A** Food Direct UX Foundation as
`currentProductSlice` without authorizing implementation or retargeting IMP-029. GTM-R35 records
IMP-028A `ARCHITECTURE_LOCKED` and `IMPLEMENTATION_AUTHORIZED` / `NOT_STARTED` without starting
product implementation or retargeting IMP-029. GTM-R36 records IMP-028A
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` without accepting IMP-028A or retargeting IMP-029.
GTM-R37 records IMP-028A `COMPLETE_AND_ACCEPTED` without authorizing or starting IMP-029.
GTM-R38 records **IMP-028B** Customer Menu Projection + Discovery as `currentProductSlice`
(`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`; architecture `NOT_LOCKED`) without locking
architecture, authorizing implementation, or retargeting IMP-029. GTM-R39 records IMP-028B
`ARCHITECTURE_LOCKED` and `IMPLEMENTATION_AUTHORIZED` / `NOT_STARTED` without starting
product implementation or retargeting IMP-029.
IMP-029 remains
`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`.

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

### GTM-R47 — 2026-08-20

- Records **IMP-028C — Food Customization** implementation **COMPLETE** under prior GTM-R44/GTM-R45
  authorization and the locked capability architecture
  ([`capabilities/IMP-028C-food-customization.md`](./capabilities/IMP-028C-food-customization.md))
  after independent technical acceptance of all implementation slices, including Slice 4 canonical
  modifier content readiness.
- IMP-028C lifecycle = `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Architecture remains
  `ARCHITECTURE_LOCKED`. Implementation = `AUTHORIZED` / `STARTED` / `COMPLETE`
  (`IMP-028C_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028C_IMPLEMENTATION_STARTED: YES`;
  `IMP-028C_IMPLEMENTATION_COMPLETE: YES`). Formal acceptance of IMP-028C is **not** claimed.
- Sets `pendingAcceptance = IMP-028C`. `acceptedThrough` remains IMP-028B. `currentProductSlice`
  remains IMP-028C. `nextProductSlice` remains IMP-029.
- Founder UAT, exact-candidate deployment, and final canonical acceptance remain **pending** /
  **not started**. This reconciliation does not deploy, run founder UAT, or advance
  `acceptedThrough`.
- IMP-029 remains `PLANNED / NOT_STARTED / NOT_AUTHORIZED`
  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).
- Does not change product scope, AC01–AC14, D-368 / D-369 / D-370, runtime, schema, migration,
  catalog content, the decision register, or global architecture. D-371 remains unused.
- Supersedes GTM-R46 for the current IMP-028C lifecycle position. Product acceptance through
  IMP-028B is unchanged.

### GTM-R46 — 2026-08-19

- Records the IMP-028C business/domain model and remaining implementation-plan lock in its existing
  capability architecture. Reusable Catalog Modifier Groups, Variant ↔ Modifier Group bindings,
  bundle composition, component modifier inheritance, normal modifier pricing, D-368 projection,
  configured-line identity, and D-369 remain the sufficient existing authorities.
- Locks `COMBO_MEMBERSHIP_CHANGES_MODIFIER_PRICE = NO`; bundle/package discount and bundle-option
  adjustments remain separate from modifier deltas. Combo-context modifier overrides are non-goal /
  deferred and require future architecture/governance review if requested.
- Records Slice 1 and Slice 2 as `TECHNICALLY_ACCEPTED`, and locks remaining Slice 3 (configured
  Cart presentation + edit configuration) and Slice 4 (canonical modifier content readiness for
  founder UAT). IMP-028C remains `IMPLEMENTATION_IN_PROGRESS`, incomplete, and unaccepted.
- Does not alter AC01–AC14, lifecycle, acceptance position, D-368 / D-369 / D-370, D-371, runtime,
  schema, migration, catalog content, decision register, or global architecture. IMP-029 remains
  planned, not started, and unauthorized.

### GTM-R45 — 2026-08-19

- Records **IMP-028C — Food Customization** implementation **STARTED** under prior GTM-R44
  authorization and its locked capability architecture
  ([`capabilities/IMP-028C-food-customization.md`](./capabilities/IMP-028C-food-customization.md)).
- IMP-028C lifecycle = `IMPLEMENTATION_IN_PROGRESS`. Architecture remains
  `ARCHITECTURE_LOCKED`. Implementation = `AUTHORIZED` / `STARTED`
  (`IMP-028C_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028C_IMPLEMENTATION_STARTED: YES`;
  `IMP-028C_IMPLEMENTATION_COMPLETE: NO`; `IMP-028C_ACCEPTED: NO`).
- Preserves `acceptedThrough = IMP-028B`, `pendingAcceptance = NONE`, `currentProductSlice =
  IMP-028C`, and `nextProductSlice = IMP-029`. IMP-029 remains `PLANNED / NOT_STARTED /
  NOT_AUTHORIZED`.
- Does not change product scope, AC01–AC14, the architecture lock, D-368 / D-369 / D-370,
  D-371, runtime, schema, migration, catalog content, the decision register, or global architecture.
  No implementation is recorded by this lifecycle transition.
- Supersedes GTM-R44 for the current IMP-028C lifecycle position. Product acceptance through
  IMP-028B is unchanged.

### GTM-R44 — 2026-08-19

- Canonically assigns **IMP-028C — Food Customization** as the active Food Direct product slice.
  Its capability-local architecture is `ARCHITECTURE_LOCKED`; implementation is authorized but
  `NOT_STARTED` (`IMP-028C_IMPLEMENTATION_AUTHORIZED: YES`; started/complete/accepted: NO).
- Preserves `acceptedThrough = IMP-028B`, `pendingAcceptance = NONE`, and `nextProductSlice =
  IMP-029`. IMP-029 remains `PLANNED / NOT_STARTED / NOT_AUTHORIZED`.
- Binds D-369 as mandatory: a positive-price catalog default cannot silently create configured Cart
  intent. D-368 remains the Customer Menu discovery authority; D-370 policy remains out of scope.
- Records the canonical-content founder-UAT stop gate. No runtime, schema, migration, catalog-data,
  decision-register, or global-architecture change; D-371 remains unused.

### GTM-R43 — 2026-08-19

- Reconciles stale present-tense IMP-028B lifecycle assertions with the already-settled GTM-R42
  acceptance record. This is a consistency repair, not a new acceptance decision.
- Current IMP-028B lifecycle remains `COMPLETE_AND_ACCEPTED` (`IMP-028B_ACCEPTED: YES`;
  `acceptedThrough = IMP-028B`; `pendingAcceptance = NONE`; `currentProductSlice = NONE`).
- IMP-029 remains `PLANNED / NOT_STARTED / NOT_AUTHORIZED`; D-368 / D-369 / D-370 remain CURRENT
  and D-371 remains unused. No IMP-028C activity is authorized or recorded.

### GTM-R42 — 2026-08-19

- Records IMP-028B — Customer Menu Projection + Discovery `COMPLETE_AND_ACCEPTED` after the
  already-passing independent technical acceptance and founder UAT PASS for the exact accepted
  candidate: repository `/home/ajoshi/repos/boba-bear-platform`; branch `main`; HEAD
  `ddca0c319a5e80b2cfe38a2c32481b636277010e`; working-tree fingerprint
  `1b6be793b4825bb8bd8df57dd47164148b0e68df9a674b12f417e97b5497ecc7`.
- IMP-028B architecture remains `ARCHITECTURE_LOCKED`. Implementation remains `AUTHORIZED` /
  `STARTED` / `COMPLETE`; formal acceptance is recorded (`IMP-028B_ACCEPTED: YES`).
- Advances `acceptedThrough = IMP-028B`; clears `pendingAcceptance = NONE`; sets
  `currentProductSlice = NONE`; and preserves `nextProductSlice = IMP-029` as planning metadata only.
- IMP-029 remains `PLANNED / NOT_STARTED / NOT_AUTHORIZED`. This reconciliation does not activate,
  rename, reinterpret, or start IMP-029; it does not implement D-369 / D-370 or create D-371.
- Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains
  **D-371**. Supersedes GTM-R41 for the current IMP-028B lifecycle position.

### GTM-R41 — 2026-08-19

- Records IMP-028B — Customer Menu Projection + Discovery implementation **COMPLETE** under prior
  GTM-R39/GTM-R40 authorization and the locked capability architecture
  ([`capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](./capabilities/IMP-028B-customer-menu-projection-and-discovery.md)).
- IMP-028B lifecycle = `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Architecture remains
  `ARCHITECTURE_LOCKED`. Implementation = `AUTHORIZED` / `STARTED` / `COMPLETE`
  (`IMP-028B_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028B_IMPLEMENTATION_STARTED: YES`;
  `IMP-028B_IMPLEMENTATION_COMPLETE: YES`). Formal acceptance of IMP-028B is **not** claimed.
- Sets `pendingAcceptance = IMP-028B`. `acceptedThrough` remains IMP-028A. `currentProductSlice`
  remains IMP-028B. `nextProductSlice` remains IMP-029.
- Product implementation delivers `GET /api/v1/menu`, `CustomerMenuProjection`, runtime `/order`
  consumption of the server-backed Menu projection, and category discovery without D-369 / D-370 /
  schema changes / `D-371`.
- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized
  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).
- Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains
  **D-371**.
- Supersedes GTM-R40 for current IMP-028B lifecycle position. Product acceptance through IMP-028A is
  unchanged.

### GTM-R40 — 2026-08-19

- Records IMP-028B — Customer Menu Projection + Discovery implementation **STARTED** under prior
  GTM-R39 authorization and the locked capability architecture.
- IMP-028B lifecycle = `IMPLEMENTATION_IN_PROGRESS`. Architecture remains `ARCHITECTURE_LOCKED`.
  Implementation = `AUTHORIZED` / `STARTED`
  (`IMP-028B_IMPLEMENTATION_STARTED: YES`; `IMP-028B_IMPLEMENTATION_COMPLETE: NO`).
- `acceptedThrough` remains IMP-028A. `pendingAcceptance` remains NONE. `currentProductSlice`
  remains IMP-028B.
- Supersedes GTM-R39 for current IMP-028B lifecycle position. Product acceptance through IMP-028A is
  unchanged.

### GTM-R39 — 2026-08-19

- Explicit founder authorization to begin IMP-028B — Customer Menu Projection + Discovery
  implementation under the locked capability architecture
  ([`capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](./capabilities/IMP-028B-customer-menu-projection-and-discovery.md)).
- Locks IMP-028B capability-local architecture from already-approved authority (canonical IMP-028B
  AC-01–AC-12; D-368 / ARCH-G19; D-356 / D-359 / D-360; existing IMP-012–015 / IMP-020–021 /
  IMP-024 / IMP-025 / IMP-026C / IMP-028A). No new global architecture. No `D-371`.
- Locks implementation details allowed by D-368: `GET /api/v1/menu`; application-layer read
  composition; `CustomerMenuProjection` DTO; Brand-baseline display price when outlet context is
  absent; omit availability without authoritative outlet context; `/order` runtime consumes the
  server projection.
- IMP-028B lifecycle = `IMPLEMENTATION_AUTHORIZED`. Architecture = `ARCHITECTURE_LOCKED`.
  Implementation = `AUTHORIZED` / `NOT_STARTED`
  (`IMP-028B_ARCHITECTURE_LOCKED: YES`; `IMP-028B_IMPLEMENTATION_AUTHORIZED: YES`;
  `IMP-028B_IMPLEMENTATION_STARTED: NO`; `IMP-028B_IMPLEMENTATION_COMPLETE: NO`;
  `IMP-028B_ACCEPTED: NO`).
- Scope remains exactly Capability B. Do not implement D-369 / D-370, expand to Food Direct
  families C–J, change commercial authority, or retarget IMP-029.
- `acceptedThrough` remains IMP-028A. `pendingAcceptance` remains NONE. `currentProductSlice`
  remains IMP-028B. `nextProductSlice` remains IMP-029.
- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized
  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).
- Authorization does **not** auto-start product implementation. No product source, product tests,
  schema, or migration changes in this authorization.
- Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains
  **D-371**.
- Supersedes GTM-R38 for current IMP-028B lifecycle position. Product acceptance through IMP-028A is
  unchanged.

### GTM-R38 — 2026-08-19

- Canonical activation of **IMP-028B — Customer Menu Projection + Discovery** as the second Food
  Direct experience-programme capability.
- Inserted IMP identity `IMP-028B` after accepted IMP-028A and before planned IMP-029. IMP-029 →
  IMP-040 identities and meanings are unchanged. IMP-029 is **not** retargeted.
- `acceptedThrough` remains IMP-028A. `pendingAcceptance` remains NONE. `currentProductSlice`
  advances to IMP-028B. `nextProductSlice` remains IMP-029.
- IMP-028B lifecycle is `PLANNED`. Architecture is `NOT_LOCKED`. Implementation is
  **NOT_AUTHORIZED** / **NOT_STARTED** (`IMP-028B_IMPLEMENTATION_AUTHORIZED: NO`;
  `IMP-028B_IMPLEMENTATION_STARTED: NO`; `IMP-028B_IMPLEMENTATION_COMPLETE: NO`;
  `IMP-028B_ACCEPTED: NO`).
- Reviewed supporting slice
  `docs/platform/experience/slices/customer-menu-projection-and-discovery.md` is retained as
  `SUPPORTING` / `CANONICALIZED_AS = IMP-028B`. Canonical product authority is
  `docs/platform/capabilities/IMP-028B-customer-menu-projection-and-discovery.md`.
- Preserves D-368 / ARCH-G19. D-369 / D-370 remain CURRENT and unimplemented. `D-371` is unused.
  Decision register remains DR-12. Global architecture remains ARCH-R15.
- Food Direct families C–J are **not** activated.
- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized
  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).
- Does **not** lock architecture, authorize implementation, implement Capability B, or change
  product source.
- Supersedes GTM-R37 for current product-slice position. Product acceptance through IMP-028A is
  unchanged.

### GTM-R37 — 2026-08-19

- Independent acceptance of IMP-028A — Food Direct UX Foundation
  (`COMPLETE_AND_ACCEPTED`; `IMP-028A_ACCEPTED: YES`).
- Records Food Direct UX Foundation acceptance evidence under the locked capability architecture
  ([`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md)).
  AC-01 through AC-12 remain PASS. Known limitations remain truthful:
  `TYPECHECK_STATUS = FAIL_PRE_EXISTING_UNRELATED`;
  `CUSTOMER_ORDERING_E2E = BLOCKED_ENVIRONMENT`;
  `CUSTOMER_ORDERING_ALTERNATIVE_REGRESSION_EVIDENCE_SUFFICIENT = YES`;
  `RELEVANT_REGRESSION_TESTS = PASS_WITH_ENVIRONMENT_LIMITATION`.
- Sets `acceptedThrough = IMP-028A`; `pendingAcceptance = NONE`; `currentProductSlice = NONE`;
  `nextProductSlice = IMP-029`.
- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized by
  this reconciliation (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).
- Does **not** implement D-368 / D-369 / D-370, create `D-371`, retarget IMP-029, or activate
  Food Direct families B–F / Capability B.
- Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains
  **D-371**.
- Supersedes GTM-R36 for current accepted position.

### GTM-R36 — 2026-08-19

- Records IMP-028A — Food Direct UX Foundation implementation **STARTED** and **COMPLETE** under
  prior GTM-R35 authorization and the locked capability architecture
  ([`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md)).
- IMP-028A lifecycle = `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Architecture remains
  `ARCHITECTURE_LOCKED`. Implementation = `AUTHORIZED` / `STARTED` / `COMPLETE`
  (`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028A_IMPLEMENTATION_STARTED: YES`;
  `IMP-028A_IMPLEMENTATION_COMPLETE: YES`). Formal acceptance of IMP-028A is **not** claimed.
- Sets `pendingAcceptance = IMP-028A`. `acceptedThrough` remains IMP-028.
  `currentProductSlice` remains IMP-028A. `nextProductSlice` remains IMP-029.
- Scope remains exactly Capability A (session-aware chrome, terminology, Direct-accurate copy,
  responsive/accessible shell). Does **not** implement D-368 / D-369 / D-370, create `D-371`,
  retarget IMP-029, or activate Food Direct families B–F.
- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized
  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).
- Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains
  **D-371**.
- Supersedes GTM-R35 for current IMP-028A lifecycle position. Product acceptance through IMP-028 is
  unchanged.

### GTM-R35 — 2026-08-19

- Explicit founder authorization to begin IMP-028A — Food Direct UX Foundation implementation under
  the locked capability architecture
  ([`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md)).
- Locks IMP-028A capability-local architecture from already-approved authority (canonical IMP-028A
  scope; founder-accepted supporting slice; founder-accepted Food Direct product-architecture
  planning lock; ARCH-R15; D-356 / D-359 / D-360; D-368 / D-369 / D-370 as unimplemented
  boundaries; existing IMP-009 / IMP-020 / IMP-023 / IMP-024 / IMP-025 / IMP-026C). No new global
  architecture. No `D-371`.
- IMP-028A lifecycle = `IMPLEMENTATION_AUTHORIZED`. Architecture = `ARCHITECTURE_LOCKED`.
  Implementation = `AUTHORIZED` / `NOT_STARTED`
  (`IMP-028A_ARCHITECTURE_LOCKED: YES`; `IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`;
  `IMP-028A_IMPLEMENTATION_STARTED: NO`).
- Scope remains exactly Capability A. Do not implement D-368 / D-369 / D-370, expand to Food Direct
  families B–F, change commercial authority, or retarget IMP-029.
- `acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE. `currentProductSlice`
  remains IMP-028A. `nextProductSlice` remains IMP-029.
- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized
  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).
- Authorization does **not** auto-start product implementation. No Nav, Home, Privacy, Cart,
  route, auth, schema, or migration product changes in this authorization.
- Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains
  **D-371**.
- Supersedes GTM-R34 for current IMP-028A lifecycle position. Product acceptance through IMP-028 is
  unchanged.

### GTM-R34 — 2026-08-18

- Canonical activation of **IMP-028A — Food Direct UX Foundation** as the first Food Direct
  experience-programme capability.
- Inserted IMP identity `IMP-028A` after accepted IMP-028 and before planned IMP-029. IMP-029 →
  IMP-040 identities and meanings are unchanged. IMP-029 is **not** retargeted.
- `acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE. `currentProductSlice`
  advances to IMP-028A. `nextProductSlice` remains IMP-029.
- IMP-028A lifecycle is `PLANNED`. Architecture is `NOT_LOCKED`. Implementation is
  **NOT_AUTHORIZED** / **NOT_STARTED** (`IMP-028A_IMPLEMENTATION_AUTHORIZED: NO`;
  `IMP-028A_IMPLEMENTATION_STARTED: NO`).
- Founder-accepted supporting slice
  `docs/platform/experience/slices/food-direct-ux-foundation.md` is retained as
  `FOUNDER_ACCEPTED` / `CANONICALIZED_AS = IMP-028A`. Canonical product authority is
  `docs/platform/capabilities/IMP-028A-food-direct-ux-foundation.md`.
- Food Direct families B–F are **not** activated. D-368 / D-369 / D-370 remain CURRENT and
  unimplemented. `D-371` is unused. Decision register remains DR-12. Global architecture remains
  ARCH-R15.
- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized
  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).
- Supersedes GTM-R33 for current product-slice position. Product acceptance through IMP-028 is
  unchanged.

### GTM-R33 — 2026-08-18

- Registered binding **D-370** Cart Identity Transition Authority (DR-12 / ARCH-R15 / ARCH-G21).
- Guest→customer: compatible purchase-intent merge is required; silent whole-cart winner selection
  is forbidden; failed reconciliation must not silently discard or partially destroy source intent;
  resulting Cart is customer-owned; former guest credential is not continuing authority.
- Authenticated→signed-out: customer Cart is not deleted; browser loses customer-cart authority;
  post-logout context is anonymous; Customer B must not receive Customer A’s Cart.
- `acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE. `currentProductSlice` remains
  NONE. `nextProductSlice` remains IMP-029.
- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized
  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).
- D-370 does **not** authorize Cart-merge implementation, change authentication, change browser
  storage, create a new IMP, or decide merge API/UX, Cart expiry, multi-device sync, Menu
  projection, customization, D-369 enforcement, Saved Configuration, Order Again, Favorites, Offers,
  Drops, Rewards, Culture, Wear, Checkout pricing, Payment, Refund, or customer deletion/retention.
- Next free decision ID is **D-371**.
- Supersedes GTM-R32 for current governance/architecture position. Product acceptance position
  (IMP-028 `COMPLETE_AND_ACCEPTED`) is unchanged.

### GTM-R32 — 2026-08-18

- Registered binding **D-369** Customer Paid Modifier Explicit Selection Authority (DR-11 / ARCH-R14 /
  ARCH-G20).
- A positive-price modifier (`price_delta_paise > 0` or equivalent) MUST NOT become customer
  purchase intent solely because it is a catalog/default selection. Explicit current-interaction
  selection is required. Zero-price standard defaults MAY be visibly preselected. Recommendation
  is not selection. Cart/Checkout Snapshot/pricing authority unchanged.
- `acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE. `currentProductSlice` remains
  NONE. `nextProductSlice` remains IMP-029.
- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized
  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).
- D-369 does **not** authorize customization implementation, populate modifier data, change schema,
  create a new IMP, or decide typed modifier kinds, Saved Configuration, Order Again, cart
  merge/logout, Offers, Drops, Rewards, Culture, Wear, Menu UX, or D-368 implementation.
- Next free decision ID is **D-370**.
- Supersedes GTM-R31 for current governance/architecture position. Product acceptance position
  (IMP-028 `COMPLETE_AND_ACCEPTED`) is unchanged.

### GTM-R31 — 2026-08-18

- Registered binding **D-368** Customer Menu Read Projection Authority (DR-10 / ARCH-R13 / ARCH-G19).
- Long-term customer Menu serving TARGET is a server-backed storefront READ PROJECTION over existing
  commerce authorities. Static `ordering-catalog.json` remains TRANSITIONAL CURRENT storefront
  delivery. Accepted IMP-025 implementation is not invalidated.
- `acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE. `currentProductSlice` remains
  NONE. `nextProductSlice` remains IMP-029.
- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized
  (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).
- D-368 does **not** authorize Menu implementation, create a Menu endpoint, create a new IMP, or
  decide Menu UX / search / Most Ordered / personalization / Offers / Drops / Rewards / Culture /
  Wear / Favorites / Order Again / cart merge/logout / paid-modifier defaults.
- Next free decision ID is **D-369**.
- Supersedes GTM-R30 for current governance/architecture position. Product acceptance position
  (IMP-028 `COMPLETE_AND_ACCEPTED`) is unchanged.

### GTM-R30 — 2026-08-18

- Independent acceptance of IMP-028 — Invoice / Tax Receipt / Credit Note
  (`COMPLETE_AND_ACCEPTED`; `IMP-028_ACCEPTED: YES`).
- Records financial-document acceptance evidence under the locked architecture and binding
  **D-365** / **D-366** / **D-367**.
- Sets `acceptedThrough = IMP-028`; `pendingAcceptance = NONE`; `currentProductSlice = NONE`;
  `nextProductSlice = IMP-029`.
- IMP-029 remains `PLANNED / NOT STARTED`. Implementation of IMP-029 is **not** authorized by
  this reconciliation (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).
- Decision register remains DR-9. Global architecture remains ARCH-R12. No new decision ID
  (`D-368` remains NEXT_FREE).
- Supersedes GTM-R29 for current accepted position.

### GTM-R29 — 2026-08-18

- Independent acceptance of IMP-026C — Pilot Customer-Commerce UX Hardening
  (`COMPLETE_AND_ACCEPTED`; `IMP-026C_ACCEPTED: YES`).
- Records supplemental-inserted-gate acceptance under the locked architecture
  (`IMP026C_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED`;
  `IMP026C_FORMAL_ACCEPTANCE: ACCEPTED`).
- `acceptedThrough` remains IMP-027. `pendingAcceptance` advances to IMP-028.
  `currentProductSlice` / `nextProductSlice` remain IMP-028.
- IMP-026C is a supplemental inserted gate; accepting it does **not** move
  `acceptedThrough` to IMP-026C.
- IMP-028 remains `IMPLEMENTATION_IN_PROGRESS` (`IMP-028_IMPLEMENTATION_COMPLETE: YES`;
  `IMP-028_ACCEPTED: NO`).
- IMP-029 remains untouched. Decision register remains DR-9. Global architecture remains ARCH-R12.
- Supersedes GTM-R28 for current accepted position.

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
| IMP-028A capability architecture | [`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md) |

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
