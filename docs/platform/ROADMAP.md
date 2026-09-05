<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "IMPLEMENTATION_SEQUENCE",
  "roadmapVersion": "GTM-R104",
  "acceptedThrough": "IMP-036C",
  "currentProductSlice": "IMP-036D",
  "nextProductSlice": "IMP-036E",
  "gtmBoundary": "IMP-040",
  "lastReviewed": "2026-09-05",
  "supersedes": "GTM-R103"
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
**COMPLETE_AND_ACCEPTED**):

[`capabilities/IMP-028C-food-customization.md`](./capabilities/IMP-028C-food-customization.md)

IMP-028D locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation
**AUTHORIZED** / **STARTED** / **COMPLETE** / `COMPLETE_AND_ACCEPTED`):

[`capabilities/IMP-028D-desktop-ordering-continuity.md`](./capabilities/IMP-028D-desktop-ordering-continuity.md)

IMP-029 locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation
**AUTHORIZED** / **STARTED** / **COMPLETE** / `COMPLETE_AND_ACCEPTED`):

[`capabilities/IMP-029-operations-console-api.md`](./capabilities/IMP-029-operations-console-api.md)

IMP-030 locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation
**AUTHORIZED** / **STARTED** / **COMPLETE** / `COMPLETE_AND_ACCEPTED`):

[`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md)

IMP-031 locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation
**AUTHORIZED** / **STARTED** / **COMPLETE** / `COMPLETE_AND_ACCEPTED`):

[`capabilities/IMP-031-provider-neutral-delivery-foundation.md`](./capabilities/IMP-031-provider-neutral-delivery-foundation.md)

IMP-032 locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation
**AUTHORIZED** / **STARTED** / **COMPLETE** / `COMPLETE_AND_ACCEPTED`):

[`capabilities/IMP-032-dehradun-delivery-operating-mode.md`](./capabilities/IMP-032-dehradun-delivery-operating-mode.md)

IMP-033 locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation
**AUTHORIZED** / **STARTED** / **COMPLETE** / `COMPLETE_AND_ACCEPTED`):

[`capabilities/IMP-033-notification-foundation.md`](./capabilities/IMP-033-notification-foundation.md)

IMP-034 locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation
**AUTHORIZED** / **STARTED** / **COMPLETE** / `COMPLETE_AND_ACCEPTED`):

[`capabilities/IMP-034-meta-whatsapp-cloud-api-adapter.md`](./capabilities/IMP-034-meta-whatsapp-cloud-api-adapter.md)

IMP-035 locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation
**AUTHORIZED** / **STARTED** / **COMPLETE** / `COMPLETE_AND_ACCEPTED`):

[`capabilities/IMP-035-initial-administration-capabilities.md`](./capabilities/IMP-035-initial-administration-capabilities.md)

IMP-036 locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation
**AUTHORIZED** / **STARTED** / **COMPLETE** / `COMPLETE_AND_ACCEPTED`):

[`capabilities/IMP-036-observability-operational-controls.md`](./capabilities/IMP-036-observability-operational-controls.md)

IMP-036D locked capability architecture (architecture **ARCHITECTURE_LOCKED**; implementation
**NOT_AUTHORIZED** / **NOT_STARTED**):

[`capabilities/IMP-036D-workforce-franchise-operations-v2.md`](./capabilities/IMP-036D-workforce-franchise-operations-v2.md)

## 2. Current Position

```text
Accepted Through:     IMP-036C — Customer Commerce Experience V2
Current Product Slice: IMP-036D — Workforce & Franchise Operations Portal V2
Next Product Slice:    IMP-036E — Store Operations Management
Pending Acceptance:    NONE
Public GTM Boundary:   IMP-040 — Launch Validation & Cutover
```

**GTM-R104** records Founder-approved IMP-036D architecture lock. IMP-036D lifecycle is
`ARCHITECTURE_LOCKED` (`IMP-036D_ARCHITECTURE_LOCKED: YES`); implementation remains
`NOT_AUTHORIZED` / `NOT_STARTED` (`IMP-036D_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-036D_STARTED: NO`;
`IMP-036D_IMPLEMENTATION_COMPLETE: NO`; `IMP-036D_ACCEPTED: NO`). Locked capability architecture:
[`capabilities/IMP-036D-workforce-franchise-operations-v2.md`](./capabilities/IMP-036D-workforce-franchise-operations-v2.md).
`acceptedThrough` remains IMP-036C; `pendingAcceptance` remains NONE; `nextProductSlice` remains
IMP-036E (`PLANNED` / `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`). Refund topology blocker
is resolved and locked: Operations provider-free reservation → Refund `ACCEPTED` row durable handoff
→ existing customer-commerce `RefundReconciliationProcessor` / PaymentProvider / Razorpay
(`IMP036D_REFUND_EXECUTION_TOPOLOGY: RESOLVED_AND_LOCKED`;
`IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK: NO`;
`IMP036D_REFUND_MUTATION_TRANSPORT_LOCKED: YES`). D-361 / D-364 / D-372 preserved. No schema; no new
service/queue/auth/role/permission; no D-374; no ARCH-R20. Financial Document workforce review
remains deferred; preparation/readiness remains no-new-state; Notification resend remains bounded
resource-scoped under D-372. Founder UAT remains required eventually
(`IMP-036D_FOUNDER_UAT_REQUIRED: YES`). Architecture lock does **not** authorize or start
implementation.

IMP-036C remains `COMPLETE_AND_ACCEPTED`. Architecture remains **ARCHITECTURE_LOCKED**
(`IMP-036C_ARCHITECTURE_LOCKED: YES`). Implementation is `AUTHORIZED` / `STARTED` / `COMPLETE`
(`IMP-036C_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-036C_STARTED: YES`;
`IMP-036C_IMPLEMENTATION_COMPLETE: YES`; `IMP-036C_ACCEPTED: YES`). Locked boundary facts:
`schema_change: YES` bounded to outlet delivery-fee policy columns; `provider_IO: NO`;
`new_service: NO`; `new_queue: NO`; `new_auth_model: NO`; `STANDARDIZED_CUSTOMER_DELIVERY_FEE: YES`.
Founder UAT is **PASS** (`IMP-036C_FOUNDER_UAT_REQUIRED: YES`; `IMP-036C_FOUNDER_UAT: PASS`;
`IMP036C_FOUNDER_UAT: PASS`). Implementation evidence is **COMPLETE**; independent implementation
review is **PASS**; independent acceptance evidence is **ACCEPTED**; formal acceptance is recorded
(`IMP036C_FORMAL_ACCEPTANCE: ACCEPTED`; `IMP-036C_ACCEPTED: YES`). **GTM-R102** recorded formal
acceptance for the exact accepted product candidate: repository
`/home/ajoshi/repos/boba-bear-platform`; branch `main`; HEAD
`0ec83ba5b7b03387dcefbd478807faefc3499d6b`; tree
`778723aaf8ee363d337f4887455c13f68e1385bc` (PR #107 merge). Locked capability architecture:
[`capabilities/IMP-036C-customer-commerce-experience-v2.md`](./capabilities/IMP-036C-customer-commerce-experience-v2.md).
Prior Founder UAT FAIL / intermediate candidates (`abe19d…` family, direct-main exception
`13835d28…`, explicit FAIL `16e8b822…`, and subsequent repair merges) remain historical and are
**not** rewritten as accepted. Docs reconciliation merge SHA is governance provenance only — not a
new product UAT candidate.

IMP-036B is `COMPLETE_AND_ACCEPTED`. Architecture remains **ARCHITECTURE_LOCKED**
(`IMP-036B_ARCHITECTURE_LOCKED: YES`). Implementation is `AUTHORIZED` / `STARTED` / `COMPLETE`
(`IMP-036B_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-036B_STARTED: YES`;
`IMP-036B_IMPLEMENTATION_COMPLETE: YES`; `IMP-036B_ACCEPTED: YES`). Founder UAT is **PASS**
(`IMP-036B_FOUNDER_UAT_REQUIRED: YES`; `IMP-036B_FOUNDER_UAT: PASS`). **GTM-R100** records formal
acceptance for the exact accepted candidate: repository
`/home/ajoshi/repos/boba-bear-platform`; branch `main`; HEAD
`4c4fcf1887fa6d8386575c77d5da22bb11e79059` (PR #71 merge). Locked capability architecture:
[`capabilities/IMP-036B-customer-account-onboarding-address-location.md`](./capabilities/IMP-036B-customer-account-onboarding-address-location.md).

IMP-036A is `COMPLETE_AND_ACCEPTED`. Architecture remains **ARCHITECTURE_LOCKED**
(`IMP-036A_ARCHITECTURE_LOCKED: YES`). Implementation is `AUTHORIZED` / `STARTED` / `COMPLETE`
(`IMP-036A_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-036A_STARTED: YES`;
`IMP-036A_IMPLEMENTATION_COMPLETE: YES`; `IMP-036A_ACCEPTED: YES`). Founder UAT is **PASS**
(`IMP-036A_FOUNDER_UAT_REQUIRED: YES`; `IMP-036A_FOUNDER_UAT: PASS`). **GTM-R98** records formal
acceptance for the exact accepted candidate: repository
`/home/ajoshi/repos/boba-bear-platform`; branch `main`; HEAD
`ee4926709ba6082ff6c24aabc2ea7d88d9bc1d6f`; tree
`4fd243f5923565deceeb6c3f461e0d8a2f5a1eec` (PR 59 merge). Locked capability architecture:
[`capabilities/IMP-036A-multi-portal-experience-foundation.md`](./capabilities/IMP-036A-multi-portal-experience-foundation.md).

IMP-036 is `COMPLETE_AND_ACCEPTED`. Architecture remains **ARCHITECTURE_LOCKED**
(`IMP-036_ARCHITECTURE_LOCKED: YES`). Implementation is `AUTHORIZED` / `STARTED` / `COMPLETE`
(`IMP-036_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-036_STARTED: YES`;
`IMP-036_IMPLEMENTATION_COMPLETE: YES`; `IMP-036_ACCEPTED: YES`). Locked boundary facts:
`schema_change: NO`, `provider_IO: NO`, `new_service: NO`, `new_permissions: NO`,
`new_roles: NO`; no new CURRENT decision (`D-374` not created). Operational read API reuses
existing workforce auth and existing `order.read` permission. Provider-neutral structured logging
and in-process metrics only — no external observability vendor. Implementation evidence is
**COMPLETE**; independent implementation review is **PASS**; independent acceptance evidence is
**ACCEPTED**; formal acceptance is recorded (`IMP-036_ACCEPTED: YES`;
`IMP036_FORMAL_ACCEPTANCE: ACCEPTED`). Accepted product identity is the immutable merge SHA
`68b46a53dc5d1ff84a8493899e713d3ef43db3aa` / tree
`9b5c3193bf74d75a820b16976e894ec2dffafa13`. **GTM-R95** advances `acceptedThrough` to IMP-036 and
sets `currentProductSlice = NONE` and `pendingAcceptance = NONE`. Founder UAT remains **not
required** (`IMP-036_FOUNDER_UAT_REQUIRED: NO`; `IMP-036_FOUNDER_UAT: NOT_APPLICABLE`).
**GTM-R96** inserts the planned Enterprise Experience Programme after accepted IMP-036 and before
existing IMP-037. IMP-036A–G and IMP-037 all remain `PLANNED` / `NOT_ACTIVATED` /
`NOT_AUTHORIZED` / `NOT_STARTED`; no capability architecture is locked. This planning checkpoint
changes `nextProductSlice` to IMP-036A without activating it. See the supporting
[programme contract](./experience/enterprise-experience/README.md).

IMP-035 is `COMPLETE_AND_ACCEPTED`. Architecture remains **ARCHITECTURE_LOCKED**; implementation is
`AUTHORIZED` / `STARTED` / `COMPLETE`; implementation evidence is **COMPLETE**; independent
implementation review is **PASS**; independent acceptance evidence is **ACCEPTED**; Founder UAT is
**PASS**; formal acceptance is recorded (`IMP-035_ACCEPTED: YES`; `IMP035_FORMAL_ACCEPTANCE: ACCEPTED`).
Accepted product identity is the immutable merge SHA `7e83d5486665ed1a3847f8484d73deb825946501` / tree
`83c318ecd9a4cff86e19f9d35ca5ad42bcff357a`. **GTM-R93** advances `acceptedThrough` to IMP-035 and
sets `currentProductSlice = NONE` and `pendingAcceptance = NONE`. Locked boundary facts remain:
`schema_change: NO`, `provider_IO: NO`, `new_service: NO`, `new_permissions: NO`, `new_roles: NO`;
binding **D-373** / **ARCH-R19** / **ARCH-G25** / **DR-15** preserved. Founder UAT was **required**
and is **PASS** (`IMP-035_FOUNDER_UAT_REQUIRED: YES`; `IMP-035_FOUNDER_UAT: PASS`). **GTM-R94**
records the combined IMP-036 activation / architecture lock / implementation authorize / start /
complete gate. IMP-033 remains `COMPLETE_AND_ACCEPTED`. Architecture remains **ARCHITECTURE_LOCKED**; implementation
is `AUTHORIZED` / `STARTED` / `COMPLETE`; implementation evidence is **COMPLETE**; independent
implementation review is **PASS**; independent acceptance evidence is **ACCEPTED**; formal acceptance
is recorded (`IMP-033_ACCEPTED: YES`; `IMP033_FORMAL_ACCEPTANCE: ACCEPTED`). Accepted product
identity is the immutable merge SHA `5150d70b4683f7abec1e0652bf53e7986efcf622` / tree
`715ff386e672fd276a0b2e888aa2ebeaab3dda8c`. Locked capability architecture remains at
[`capabilities/IMP-033-notification-foundation.md`](./capabilities/IMP-033-notification-foundation.md).
IMP-032 remains `COMPLETE_AND_ACCEPTED`. Architecture remains **ARCHITECTURE_LOCKED** at
[`capabilities/IMP-032-dehradun-delivery-operating-mode.md`](./capabilities/IMP-032-dehradun-delivery-operating-mode.md)
(operating mode **MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY**). Implementation is `AUTHORIZED` /
`STARTED` / `COMPLETE`; independent acceptance evidence is **ACCEPTED**; Founder UAT is **PASS**;
formal acceptance is recorded (`IMP-032_ACCEPTED: YES`; `IMP032_FORMAL_ACCEPTANCE: ACCEPTED`).
Accepted product identity remains immutable merge SHA
`078ae39109a748174c429ac40381e038ab21d3c1` / tree `973153488a4e32e06a6da1e1e7d41072ebca9376`.
GTM-R87 historically activated IMP-033; GTM-R88 recorded the combined IMP-033 lock / authorize /
start / complete gate; GTM-R89 recorded IMP-033 formal acceptance. Founder UAT is **not required**
for IMP-033 (`IMP-033_FOUNDER_UAT_REQUIRED: NO`). DR-14 and ARCH-R18 remain unchanged.
IMP-031 remains `COMPLETE_AND_ACCEPTED`. Its capability architecture remains locked at
[`capabilities/IMP-031-provider-neutral-delivery-foundation.md`](./capabilities/IMP-031-provider-neutral-delivery-foundation.md);
ARCH-R18 / ARCH-G24 records the minimal durable provider-neutral Delivery authority. Implementation
boundary C remains approved with the capability-local Delivery lifecycle amendment. Implementation is
`AUTHORIZED` / `STARTED` / `COMPLETE`; independent acceptance evidence is **ACCEPTED**; formal
acceptance is recorded (`IMP-031_ACCEPTED: YES`). Accepted product identity remains immutable merge
SHA `c3d499b0b8df2a8c7ae9297ab870f6286f81b848` / tree `dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099`.
IMP-030 remains `COMPLETE_AND_ACCEPTED`. Its capability architecture remains locked in
[`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md)
and was formally amended on 2026-08-27 for static detail-route realization. DR-14 and ARCH-R18 remain
unchanged; D-373 is not created. No named provider is canonical; no provider API/webhook/worker/queue
topology is introduced by this governance gate.

```text
IMP-030: COMPLETE_AND_ACCEPTED
IMP-030_ARCHITECTURE: LOCKED
IMP-030_ARCHITECTURE_LOCKED: YES
IMP-030_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-030_IMPLEMENTATION_AUTHORIZED: YES
IMP-030_STARTED: YES
IMP-030_IMPLEMENTATION_COMPLETE: YES
IMP-030_ACCEPTED: YES
IMP-031: COMPLETE_AND_ACCEPTED
IMP-031_ARCHITECTURE: LOCKED
IMP-031_ARCHITECTURE_LOCKED: YES
IMP-031_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-031_IMPLEMENTATION_AUTHORIZED: YES
IMP-031_STARTED: YES
IMP-031_IMPLEMENTATION_COMPLETE: YES
IMP-031_ACCEPTED: YES
IMP031_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_031_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP031_FORMAL_ACCEPTANCE: ACCEPTED
IMP031_ACCEPTED_MAIN_SHA: c3d499b0b8df2a8c7ae9297ab870f6286f81b848
IMP031_ACCEPTED_TREE: dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099
IMP-032: COMPLETE_AND_ACCEPTED
IMP-032_ARCHITECTURE: LOCKED
IMP-032_ARCHITECTURE_LOCKED: YES
IMP-032_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-032_IMPLEMENTATION_AUTHORIZED: YES
IMP-032_STARTED: YES
IMP-032_IMPLEMENTATION_COMPLETE: YES
IMP-032_ACCEPTED: YES
IMP-032_FOUNDER_UAT_REQUIRED: YES
IMP-032_FOUNDER_UAT: PASS
IMP032_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_032_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP032_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP032_FORMAL_ACCEPTANCE: ACCEPTED
IMP032_ACCEPTED_MAIN_SHA: 078ae39109a748174c429ac40381e038ab21d3c1
IMP032_ACCEPTED_TREE: 973153488a4e32e06a6da1e1e7d41072ebca9376
IMP-033: COMPLETE_AND_ACCEPTED
IMP-033_ARCHITECTURE: LOCKED
IMP-033_ARCHITECTURE_LOCKED: YES
IMP-033_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-033_IMPLEMENTATION_AUTHORIZED: YES
IMP-033_STARTED: YES
IMP-033_IMPLEMENTATION_COMPLETE: YES
IMP-033_ACCEPTED: YES
IMP-033_FOUNDER_UAT_REQUIRED: NO
IMP-033_FOUNDER_UAT: NOT_APPLICABLE
IMP-033_SCHEMA_CHANGE: YES
IMP-033_PROVIDER_IO: NO
IMP-033_NEW_SERVICE: NO
IMP-033_ASYNC_TOPOLOGY: POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER
IMP033_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_033_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP033_FORMAL_ACCEPTANCE: ACCEPTED
IMP033_ACCEPTED_MAIN_SHA: 5150d70b4683f7abec1e0652bf53e7986efcf622
IMP033_ACCEPTED_TREE: 715ff386e672fd276a0b2e888aa2ebeaab3dda8c
IMP-034: COMPLETE_AND_ACCEPTED
IMP-034_ARCHITECTURE: LOCKED
IMP-034_ARCHITECTURE_LOCKED: YES
IMP-034_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-034_IMPLEMENTATION_AUTHORIZED: YES
IMP-034_STARTED: YES
IMP-034_IMPLEMENTATION_COMPLETE: YES
IMP-034_ACCEPTED: YES
IMP-034_FOUNDER_UAT_REQUIRED: NO
IMP-034_FOUNDER_UAT: NOT_APPLICABLE
IMP-034_SCHEMA_CHANGE: YES
IMP-034_PROVIDER_IO: YES
IMP-034_NEW_SERVICE: NO
IMP-034_ASYNC_TOPOLOGY: POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER
IMP-034_PROVIDER_STRATEGY: DIRECT_META_CLOUD_API_V1
IMP-034_BSP: NO
IMP034_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_034_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP034_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP034_FORMAL_ACCEPTANCE: ACCEPTED
IMP034_ACCEPTED_MAIN_SHA: 7e92d1a1ca02ad825229b64f308a8fc555956d25
IMP034_ACCEPTED_TREE: 772c585e93c78285e5b972d8b8a58c83507e01f8
IMP-035: COMPLETE_AND_ACCEPTED
IMP-035_ARCHITECTURE: LOCKED
IMP-035_ARCHITECTURE_LOCKED: YES
IMP-035_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-035_IMPLEMENTATION_AUTHORIZED: YES
IMP-035_STARTED: YES
IMP-035_IMPLEMENTATION_COMPLETE: YES
IMP-035_ACCEPTED: YES
IMP-035_FOUNDER_UAT_REQUIRED: YES
IMP-035_FOUNDER_UAT: PASS
IMP-035_SCHEMA_CHANGE: NO
IMP-035_PROVIDER_IO: NO
IMP-035_NEW_SERVICE: NO
IMP-035_NEW_PERMISSIONS: NO
IMP-035_NEW_ROLES: NO
IMP035_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_035_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP035_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP035_FORMAL_ACCEPTANCE: ACCEPTED
IMP035_ACCEPTED_MAIN_SHA: 7e83d5486665ed1a3847f8484d73deb825946501
IMP035_ACCEPTED_TREE: 83c318ecd9a4cff86e19f9d35ca5ad42bcff357a
D-373_CREATED: YES
ARCH_R19_REQUIRED: YES
ARCH-R19: CURRENT
DR-15: CURRENT
IMP-036: COMPLETE_AND_ACCEPTED
IMP-036_ARCHITECTURE: LOCKED
IMP-036_ARCHITECTURE_LOCKED: YES
IMP-036_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-036_IMPLEMENTATION_AUTHORIZED: YES
IMP-036_STARTED: YES
IMP-036_IMPLEMENTATION_COMPLETE: YES
IMP-036_ACCEPTED: YES
IMP-036_SCHEMA_CHANGE: NO
IMP-036_PROVIDER_IO: NO
IMP-036_NEW_SERVICE: NO
IMP-036_NEW_PERMISSIONS: NO
IMP-036_NEW_ROLES: NO
IMP-036_FOUNDER_UAT_REQUIRED: NO
IMP-036_FOUNDER_UAT: NOT_APPLICABLE
IMP036_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_036_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP036_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP036_FORMAL_ACCEPTANCE: ACCEPTED
IMP036_ACCEPTED_MAIN_SHA: 68b46a53dc5d1ff84a8493899e713d3ef43db3aa
IMP036_ACCEPTED_TREE: 9b5c3193bf74d75a820b16976e894ec2dffafa13
D-374_CREATED: NO
IMP-036A: COMPLETE_AND_ACCEPTED
IMP-036A_ARCHITECTURE_LOCKED: YES
IMP-036A_IMPLEMENTATION_AUTHORIZED: YES
IMP-036A_STARTED: YES
IMP-036A_IMPLEMENTATION_COMPLETE: YES
IMP-036A_ACCEPTED: YES
IMP-036A_FOUNDER_UAT_REQUIRED: YES
IMP-036A_FOUNDER_UAT: PASS
IMP036A_FORMAL_ACCEPTANCE: ACCEPTED
IMP036A_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP036A_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP036A_ACCEPTED_MAIN_SHA: ee4926709ba6082ff6c24aabc2ea7d88d9bc1d6f
IMP036A_ACCEPTED_TREE: 4fd243f5923565deceeb6c3f461e0d8a2f5a1eec
IMP-036B: COMPLETE_AND_ACCEPTED
IMP-036B_ARCHITECTURE_LOCKED: YES
IMP-036B_IMPLEMENTATION_AUTHORIZED: YES
IMP-036B_STARTED: YES
IMP-036B_IMPLEMENTATION_COMPLETE: YES
IMP-036B_ACCEPTED: YES
IMP-036B_FOUNDER_UAT_REQUIRED: YES
IMP-036B_FOUNDER_UAT: PASS
IMP036B_FORMAL_ACCEPTANCE: ACCEPTED
IMP036B_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP-036C: COMPLETE_AND_ACCEPTED
IMP-036C_ARCHITECTURE_LOCKED: YES
IMP-036C_IMPLEMENTATION_AUTHORIZED: YES
IMP-036C_STARTED: YES
IMP-036C_IMPLEMENTATION_COMPLETE: YES
IMP-036C_ACCEPTED: YES
IMP-036C_FOUNDER_UAT_REQUIRED: YES
IMP-036C_FOUNDER_UAT: PASS
IMP036C_FOUNDER_UAT: PASS
IMP036C_FORMAL_ACCEPTANCE: ACCEPTED
IMP036C_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP036C_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP036C_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP036C_ACCEPTED_MAIN_SHA: 0ec83ba5b7b03387dcefbd478807faefc3499d6b
IMP036C_ACCEPTED_TREE: 778723aaf8ee363d337f4887455c13f68e1385bc
IMP036C_ACCEPTED_CANDIDATE: 0ec83ba5b7b03387dcefbd478807faefc3499d6b
IMP036C_DIRECT_MAIN_PROCESS_EXCEPTION: RECONCILED
IMP036C_DIRECT_MAIN_EXCEPTION_SHA: 13835d285f53186c9ed89dc1ed0d11e30be75cca
IMP036C_PROCESS_EXCEPTION_OUTSTANDING: NO
STANDARDIZED_CUSTOMER_DELIVERY_FEE: YES
DEFERRED_CUSTOMER_FAILED_PAYMENT_HISTORY: YES
IMP-036D: ARCHITECTURE_LOCKED
IMP-036D_ARCHITECTURE: LOCKED
IMP-036D_ARCHITECTURE_LOCKED: YES
IMP-036D_IMPLEMENTATION: NOT_AUTHORIZED / NOT_STARTED
IMP-036D_IMPLEMENTATION_AUTHORIZED: NO
IMP-036D_STARTED: NO
IMP-036D_IMPLEMENTATION_COMPLETE: NO
IMP-036D_ACCEPTED: NO
IMP-036D_FOUNDER_UAT_REQUIRED: YES
IMP036D_PREPARATION_READINESS_DECISION: NO_NEW_V1_DOMAIN_STATE_REQUIRED
IMP036D_FINANCIAL_DOCUMENT_WORKFORCE_REVIEW: DEFERRED
IMP036D_NOTIFICATION_RESEND_WORKFORCE_TRANSPORT: APPROVED_FOR_ARCHITECTURE
D374_REQUIRED_FOR_NOTIFICATION_RESEND: NO
NEW_NOTIFICATION_PERMISSION: NO
NEW_NOTIFICATION_ROLE: NO
NEW_NOTIFICATION_SCOPE_MODEL: NO
IMP036D_REFUND_WORKFORCE_SUPPORT_INTENT: YES
IMP036D_REFUND_READ_PROJECTION_DESIRED: YES
IMP036D_REFUND_MUTATION_TRANSPORT_LOCKED: YES
IMP036D_REFUND_EXECUTION_TOPOLOGY: RESOLVED_AND_LOCKED
IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK: NO
SCHEMA_CHANGE_REQUIRED: NO
D-374_CREATED: NO
ARCH_R20_REQUIRED: NO
FRANCHISE_IS_BUSINESS_PERSONA: YES
NEW_FRANCHISE_ROLE: NO
NEW_FRANCHISE_SCOPE_MODEL: NO
ARBITRARY_MULTI_OUTLET_FRANCHISE_RBAC: DEFERRED
IMP-036E: PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED
IMP-036F: PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED
IMP-036G: PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED
IMP-037: PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED
IMP-038: PLANNED
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
statutory/financial-document authority. Formal acceptance of IMP-028 did not itself authorize or
start IMP-029. GTM-R34 records
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
`currentProductSlice = NONE`). GTM-R61 subsequently activates IMP-029 for architecture work only;
`nextProductSlice` is now IMP-030. Food Direct families C–J are not activated. `D-371` is unused.
Acceptance of IMP-028B did not itself start IMP-029.

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
change `acceptedThrough` / `pendingAcceptance` / `currentProductSlice`. GTM-R59 later records
binding **D-371**; the next free decision is **D-372**.

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
IMP-029: COMPLETE_AND_ACCEPTED
IMP-029_ARCHITECTURE: LOCKED
IMP-029_ARCHITECTURE_LOCKED: YES
IMP-029_IMPLEMENTATION_AUTHORIZED: YES
IMP-029_STARTED: YES
IMP-029_IMPLEMENTATION_COMPLETE: YES
IMP-029_ACCEPTED: YES
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
| IMP-028C | Food Customization | COMPLETE_AND_ACCEPTED |
| IMP-028D | Desktop Ordering Continuity | COMPLETE_AND_ACCEPTED |
| IMP-029 | Operations Console API | COMPLETE_AND_ACCEPTED |
| IMP-030 | Operations Console UI | COMPLETE_AND_ACCEPTED |
| IMP-031 | Provider-Neutral Delivery Foundation | COMPLETE_AND_ACCEPTED |
| IMP-032 | Dehradun Delivery Operating Mode | COMPLETE_AND_ACCEPTED |
| IMP-033 | Notification Foundation | COMPLETE_AND_ACCEPTED |
| IMP-034 | Meta WhatsApp Cloud API Adapter | COMPLETE_AND_ACCEPTED |
| IMP-035 | Initial Administration Capabilities | COMPLETE_AND_ACCEPTED |
| IMP-036 | Observability & Operational Controls | COMPLETE_AND_ACCEPTED |
| IMP-036A | Multi-Portal Experience Foundation | COMPLETE_AND_ACCEPTED |
| IMP-036B | Customer Account, Onboarding, Address & Location Experience | COMPLETE_AND_ACCEPTED |
| IMP-036C | Customer Commerce Experience V2 | COMPLETE_AND_ACCEPTED |

## 4. Current Product Slice

IMP-036D — Workforce & Franchise Operations Portal V2 is `ARCHITECTURE_LOCKED`
(`IMP-036D_ARCHITECTURE_LOCKED: YES`; `IMP-036D_IMPLEMENTATION_AUTHORIZED: NO`;
`IMP-036D_STARTED: NO`; `IMP-036D_IMPLEMENTATION_COMPLETE: NO`; `IMP-036D_ACCEPTED: NO`). Locked
capability architecture:
[`capabilities/IMP-036D-workforce-franchise-operations-v2.md`](./capabilities/IMP-036D-workforce-franchise-operations-v2.md).
Supporting experience contract:
[`experience/enterprise-experience/IMP-036D-workforce-franchise-operations-v2.md`](./experience/enterprise-experience/IMP-036D-workforce-franchise-operations-v2.md).
Refund topology is `RESOLVED_AND_LOCKED` and no longer blocks architecture lock.
`acceptedThrough` remains IMP-036C; `pendingAcceptance` remains NONE; `nextProductSlice` is
IMP-036E (`PLANNED` / `NOT_ACTIVATED`). ARCH-R19 and DR-15 remain unchanged; D-374 is not created.
Implementation remains unauthorized.

IMP-036C — Customer Commerce Experience V2 remains `COMPLETE_AND_ACCEPTED` with locked capability
architecture at
[`capabilities/IMP-036C-customer-commerce-experience-v2.md`](./capabilities/IMP-036C-customer-commerce-experience-v2.md).
Architecture is **ARCHITECTURE_LOCKED** (`IMP-036C_ARCHITECTURE_LOCKED: YES`). Implementation is
`AUTHORIZED` / `STARTED` / `COMPLETE`. Founder UAT is **PASS** (`IMP-036C_FOUNDER_UAT: PASS`).
Formal acceptance is recorded via GTM-R102 for product SHA
`0ec83ba5b7b03387dcefbd478807faefc3499d6b`.

IMP-036B — Customer Account, Onboarding, Address & Location Experience is `COMPLETE_AND_ACCEPTED`
with locked capability architecture at
[`capabilities/IMP-036B-customer-account-onboarding-address-location.md`](./capabilities/IMP-036B-customer-account-onboarding-address-location.md).
Founder UAT is **PASS** (`IMP-036B_FOUNDER_UAT: PASS`). Formal acceptance is recorded via GTM-R100.

IMP-036A — Multi-Portal Experience Foundation is `COMPLETE_AND_ACCEPTED` with locked capability
architecture at
[`capabilities/IMP-036A-multi-portal-experience-foundation.md`](./capabilities/IMP-036A-multi-portal-experience-foundation.md).
Architecture remains **ARCHITECTURE_LOCKED** (`IMP-036A_ARCHITECTURE_LOCKED: YES`). Implementation is
`AUTHORIZED` / `STARTED` / `COMPLETE` (`IMP-036A_IMPLEMENTATION_AUTHORIZED: YES`;
`IMP-036A_STARTED: YES`; `IMP-036A_IMPLEMENTATION_COMPLETE: YES`; `IMP-036A_ACCEPTED: YES`).
Founder UAT is **PASS** (`IMP-036A_FOUNDER_UAT: PASS`). Formal acceptance is recorded via GTM-R98.

```text
IMP-028D — Desktop Ordering Continuity
Lifecycle: COMPLETE_AND_ACCEPTED
Architecture: ARCHITECTURE_LOCKED
Implementation: AUTHORIZED / STARTED / COMPLETE
IMP-028D_ARCHITECTURE_LOCKED: YES
IMP-028D_IMPLEMENTATION_AUTHORIZED: YES
IMP-028D_IMPLEMENTATION_STARTED: YES
IMP-028D_IMPLEMENTATION_COMPLETE: YES
IMP-028D_ACCEPTED: YES
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT: PASS
FOUNDER_UAT_COMPLETE: YES
FOUNDER_UAT_DECISION_DATE: 2026-08-22
FOUNDER_UAT_ACCEPTANCE_AUTHORITY: Founder
FOUNDER_UAT_CANDIDATE_REF: main
FOUNDER_UAT_CANDIDATE_HEAD: 166aec4efd1c55a9e14ab7216a2b1af71fb3b2c7
FOUNDER_UAT_CANDIDATE_TREE: eba5f3f7fc25b07581801b53a130fb9547abc459
FOUNDER_UAT_EVIDENCE_SHA256: 715519d51801a10913a71a891af74c68aac1f493088adda43ecbc6a9c8bd5572
Latest accepted slice: IMP-028D — Desktop Ordering Continuity
IMP-028C_ARCHITECTURE_LOCKED: YES
IMP-028C_IMPLEMENTATION_AUTHORIZED: YES
IMP-028C_IMPLEMENTATION_STARTED: YES
IMP-028C_IMPLEMENTATION_COMPLETE: YES
IMP-028C_ACCEPTED: YES
IMP-028C_FOUNDER_UAT_REQUIRED: YES
IMP-028C_FOUNDER_UAT: PASS
IMP-028C_FOUNDER_UAT_COMPLETE: YES
IMP-028B_ARCHITECTURE_LOCKED: YES
IMP-028B_IMPLEMENTATION_AUTHORIZED: YES
IMP-028B_IMPLEMENTATION_STARTED: YES
IMP-028B_IMPLEMENTATION_COMPLETE: YES
IMP-028B_ACCEPTED: YES
Capability: IMP-030 — Operations Console UI
Lifecycle: COMPLETE_AND_ACCEPTED
Architecture: LOCKED
Implementation: AUTHORIZED / STARTED / COMPLETE
IMP-030_ARCHITECTURE_LOCKED: YES
IMP-030_IMPLEMENTATION_AUTHORIZED: YES
IMP-030_STARTED: YES
IMP-030_IMPLEMENTATION_COMPLETE: YES
IMP-030_ACCEPTED: YES
Capability: IMP-029 — Operations Console API
Lifecycle: COMPLETE_AND_ACCEPTED
Architecture: LOCKED
Implementation: AUTHORIZED / STARTED / COMPLETE
IMP-029_ARCHITECTURE_LOCKED: YES
IMP-029_IMPLEMENTATION_AUTHORIZED: YES
IMP-029_STARTED: YES
IMP-029_IMPLEMENTATION_COMPLETE: YES
IMP-029_ACCEPTED: YES
Next product slice: IMP-035 — Initial Administration Capabilities
Pending acceptance: NONE
acceptedThrough: IMP-034
IMP-031: COMPLETE_AND_ACCEPTED
IMP-031_ARCHITECTURE: LOCKED
IMP-031_ARCHITECTURE_LOCKED: YES
IMP-031_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-031_IMPLEMENTATION_AUTHORIZED: YES
IMP-031_STARTED: YES
IMP-031_IMPLEMENTATION_COMPLETE: YES
IMP-031_ACCEPTED: YES
IMP031_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_031_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP031_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP031_FORMAL_ACCEPTANCE: ACCEPTED
IMP031_ACCEPTED_MAIN_SHA: c3d499b0b8df2a8c7ae9297ab870f6286f81b848
IMP031_ACCEPTED_TREE: dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099
IMP-032: COMPLETE_AND_ACCEPTED
IMP-032_ARCHITECTURE: LOCKED
IMP-032_ARCHITECTURE_LOCKED: YES
IMP-032_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-032_IMPLEMENTATION_AUTHORIZED: YES
IMP-032_STARTED: YES
IMP-032_IMPLEMENTATION_COMPLETE: YES
IMP-032_ACCEPTED: YES
IMP-032_FOUNDER_UAT_REQUIRED: YES
IMP-032_FOUNDER_UAT: PASS
IMP032_FORMAL_ACCEPTANCE: ACCEPTED
IMP-033: COMPLETE_AND_ACCEPTED
IMP-033_ARCHITECTURE: LOCKED
IMP-033_ARCHITECTURE_LOCKED: YES
IMP-033_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-033_IMPLEMENTATION_AUTHORIZED: YES
IMP-033_STARTED: YES
IMP-033_IMPLEMENTATION_COMPLETE: YES
IMP-033_ACCEPTED: YES
IMP-033_FOUNDER_UAT_REQUIRED: NO
IMP-033_FOUNDER_UAT: NOT_APPLICABLE
IMP-033_SCHEMA_CHANGE: YES
IMP-033_PROVIDER_IO: NO
IMP-033_NEW_SERVICE: NO
IMP-033_ASYNC_TOPOLOGY: POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER
IMP033_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_033_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP033_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP033_FORMAL_ACCEPTANCE: ACCEPTED
IMP033_ACCEPTED_MAIN_SHA: 5150d70b4683f7abec1e0652bf53e7986efcf622
IMP033_ACCEPTED_TREE: 715ff386e672fd276a0b2e888aa2ebeaab3dda8c
IMP-034: COMPLETE_AND_ACCEPTED
IMP-034_ARCHITECTURE: LOCKED
IMP-034_ARCHITECTURE_LOCKED: YES
IMP-034_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-034_IMPLEMENTATION_AUTHORIZED: YES
IMP-034_STARTED: YES
IMP-034_IMPLEMENTATION_COMPLETE: YES
IMP-034_ACCEPTED: YES
IMP-034_FOUNDER_UAT_REQUIRED: NO
IMP-034_FOUNDER_UAT: NOT_APPLICABLE
IMP-034_SCHEMA_CHANGE: YES
IMP-034_PROVIDER_IO: YES
IMP-034_NEW_SERVICE: NO
IMP-034_ASYNC_TOPOLOGY: POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER
IMP-034_PROVIDER_STRATEGY: DIRECT_META_CLOUD_API_V1
IMP-034_BSP: NO
IMP034_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_034_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP034_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP034_FORMAL_ACCEPTANCE: ACCEPTED
IMP034_ACCEPTED_MAIN_SHA: 7e92d1a1ca02ad825229b64f308a8fc555956d25
IMP034_ACCEPTED_TREE: 772c585e93c78285e5b972d8b8a58c83507e01f8
IMP-035: PLANNED / NOT_ACTIVATED
D-373_CREATED: NO
ARCH_R19_REQUIRED: NO
NO_NEW_CURRENT_DECISION_IN_THIS_GATE: YES
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
**COMPLETE_AND_ACCEPTED**; formal acceptance is claimed (`IMP-028C_ACCEPTED: YES`;
`pendingAcceptance = NONE`). D-369 governs paid-modifier explicit intent. D-371 was unused at
IMP-028C acceptance and is now binding for IMP-028D RC3.

IMP-028D locked capability architecture is at
[`capabilities/IMP-028D-desktop-ordering-continuity.md`](./capabilities/IMP-028D-desktop-ordering-continuity.md).
Architecture is **ARCHITECTURE_LOCKED**. Implementation is **AUTHORIZED** / **STARTED** /
**COMPLETE** / `COMPLETE_AND_ACCEPTED`; formal acceptance is recorded
(`IMP-028D_ACCEPTED: YES`; `acceptedThrough = IMP-028D`; `pendingAcceptance = NONE`;
`currentProductSlice = NONE`). Founder UAT is **PASS** for the exact merged-main candidate
`166aec4efd1c55a9e14ab7216a2b1af71fb3b2c7` / tree
`eba5f3f7fc25b07581801b53a130fb9547abc459`. GTM-R61 subsequently activates IMP-029 for
architecture work only; implementation remains not authorized and not started.

## 5. Future GTM Slices

Remaining numeric GTM range IMP-037 → IMP-040: **4** IMP numbers. The seven planned
Enterprise Experience suffix slices IMP-036A–G are inserted before IMP-037 without consuming or
renaming existing numeric identities.
Accepted inserted slices IMP-026C, IMP-028A, IMP-028B, IMP-028C, and IMP-028D remain in the
accepted ledger and are not future identities.

IMP-028A is the first Food Direct experience-programme capability. It was inserted after accepted
IMP-028 and before planned GTM IMP-029. It does **not** consume or remap IMP-029 → IMP-040
identities. IMP-028A is now `COMPLETE_AND_ACCEPTED` and is not a remaining future slice.

IMP-028B is the second Food Direct experience-programme capability. It was inserted after accepted
IMP-028A and before planned GTM IMP-029 using suffix convention. It does **not** consume or remap
IMP-029 → IMP-040 identities. IMP-028B is `COMPLETE_AND_ACCEPTED` and is not a remaining future slice.

IMP-028C is the third Food Direct experience-programme capability. It was inserted after accepted
IMP-028B and before planned GTM IMP-029 using the established suffix convention. It does **not**
consume or remap IMP-029 → IMP-040 identities and is `COMPLETE_AND_ACCEPTED`.

IMP-028D is the fourth Food Direct experience-programme capability. It was inserted after accepted
IMP-028C and before planned GTM IMP-029 using the established suffix convention. It does **not**
consume or remap IMP-029 → IMP-040 identities and is `COMPLETE_AND_ACCEPTED`.

| IMP | Capability | Lifecycle |
|---|---|---|
| IMP-036A | Multi-Portal Experience Foundation | COMPLETE_AND_ACCEPTED |
| IMP-036B | Customer Account, Onboarding, Address & Location Experience | COMPLETE_AND_ACCEPTED |
| IMP-036C | Customer Commerce Experience V2 | COMPLETE_AND_ACCEPTED |
| IMP-036D | Workforce & Franchise Operations Portal V2 | ARCHITECTURE_LOCKED / NOT_AUTHORIZED / NOT_STARTED |
| IMP-036E | Store Operations Management | PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED |
| IMP-036F | Catalog, Menu, Pricing & Promotions Management | PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED |
| IMP-036G | Administration Console V2 | PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED |
| IMP-037 | Backup, Restore & Migration Readiness | PLANNED |
| IMP-038 | Security & Privacy Hardening | PLANNED |
| IMP-039 | Production Infrastructure & Release Pipeline | PLANNED |
| IMP-040 | Launch Validation & Cutover | PLANNED |

### 5.0E Enterprise Experience Programme — IMP-036A → IMP-036G (PLANNED)

The [Enterprise Experience Programme](./experience/enterprise-experience/README.md) defines the
reviewable no-Figma-first UX/workflow contract for three distinct Customer, Workforce, and
Administration applications. Its seven slice contracts are supporting planning artifacts, not
locked capability architecture:

1. [IMP-036A — Multi-Portal Experience Foundation](./experience/enterprise-experience/IMP-036A-multi-portal-experience-foundation.md)
2. [IMP-036B — Customer Account, Onboarding, Address & Location Experience](./experience/enterprise-experience/IMP-036B-customer-account-onboarding-address-location.md)
3. [IMP-036C — Customer Commerce Experience V2](./experience/enterprise-experience/IMP-036C-customer-commerce-experience-v2.md)
4. [IMP-036D — Workforce & Franchise Operations Portal V2](./experience/enterprise-experience/IMP-036D-workforce-franchise-operations-v2.md)
5. [IMP-036E — Store Operations Management](./experience/enterprise-experience/IMP-036E-store-operations-management.md)
6. [IMP-036F — Catalog, Menu, Pricing & Promotions Management](./experience/enterprise-experience/IMP-036F-catalog-menu-pricing-promotions.md)
7. [IMP-036G — Administration Console V2](./experience/enterprise-experience/IMP-036G-administration-console-v2.md)

```text
FIGMA_REQUIRED_FOR_INITIAL_IMPLEMENTATION: NO
IMP-036A → IMP-036G: PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED
ARCHITECTURE_LOCKED: NO
IMPLEMENTATION_AUTHORIZED: NO
FOUNDER_UAT_REQUIRED: YES for each slice
```

The required order is IMP-036A → IMP-036B Account/Location → IMP-036C Commerce V2 → IMP-036D → E
→ F → G → IMP-037. Account/location/serviceability experience therefore precedes the mature
commerce flow that depends on it. Provider selection for location, arbitrary multi-outlet franchise
RBAC, media/object-storage architecture, and any preparation/readiness domain change remain deferred
decisions. Navigation must not advertise unimplemented capabilities. No new domain lifecycle, API,
schema, provider, role, permission, service, micro-frontend, or application implementation is
authorized by GTM-R96.

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
`acceptedThrough` is IMP-028D. `pendingAcceptance` is NONE. IMP-027 architecture was locked
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

### GTM-R104 — 2026-09-05

- Records Founder-approved architecture lock of **IMP-036D — Workforce & Franchise Operations Portal
  V2** after resolution of the Refund provider-execution topology blocker.
- IMP-036D lifecycle becomes `ARCHITECTURE_LOCKED` (`IMP-036D_ARCHITECTURE_LOCKED: YES`);
  implementation remains `NOT_AUTHORIZED` / `NOT_STARTED` (`IMP-036D_IMPLEMENTATION_AUTHORIZED: NO`;
  `IMP-036D_STARTED: NO`; `IMP-036D_IMPLEMENTATION_COMPLETE: NO`; `IMP-036D_ACCEPTED: NO`).
- Creates locked capability artifact
  [`capabilities/IMP-036D-workforce-franchise-operations-v2.md`](./capabilities/IMP-036D-workforce-franchise-operations-v2.md).
- Preserves `acceptedThrough = IMP-036C` and `pendingAcceptance = NONE`; `currentProductSlice`
  remains IMP-036D; `nextProductSlice` remains IMP-036E (`PLANNED` / `NOT_ACTIVATED` /
  `NOT_AUTHORIZED` / `NOT_STARTED`).
- Locks Founder-approved Refund topology: Operations process provider-free reservation; Refund
  `ACCEPTED` row as durable handoff; customer-commerce canonical provider execution via existing
  `RefundReconciliationProcessor` / PaymentProvider / Razorpay; HTTP Refund command idempotency via
  client-stable Refund UUID as Refund id; no Operations Razorpay I/O, PaymentProvider, secrets,
  internal HTTP, RPC, queue, broker, or new service
  (`IMP036D_REFUND_EXECUTION_TOPOLOGY: RESOLVED_AND_LOCKED`;
  `IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK: NO`;
  `IMP036D_REFUND_MUTATION_TRANSPORT_LOCKED: YES`).
- Preserves D-357 / D-358 / D-359 / D-361 / D-364 / D-372. No schema change; no new auth model,
  role, permission, or scope model. No D-374; no ARCH-R20. ARCH-R19 and DR-15 remain unchanged.
- Financial Document workforce review remains deferred; preparation/readiness remains
  `NO_NEW_V1_DOMAIN_STATE_REQUIRED`; Notification resend remains bounded resource-scoped under
  D-372 (`notification.resend` reused). Franchise remains a business persona only.
- Founder UAT remains required eventually (`IMP-036D_FOUNDER_UAT_REQUIRED: YES`). Architecture lock
  does **not** authorize or start implementation. IMP-036E remains planned/unactivated.
- Supersedes GTM-R103 for the current product-slice architecture-lock position.

### GTM-R103 — 2026-09-05

- Records explicit Founder architecture activation of **IMP-036D — Workforce & Franchise Operations
  Portal V2** as `currentProductSlice` for architecture work only.
- IMP-036D lifecycle becomes `ARCHITECTURE_IN_PROGRESS`; architecture is `NOT_LOCKED`
  (`IMP-036D_ARCHITECTURE_LOCKED: NO`); implementation remains `NOT_AUTHORIZED` / `NOT_STARTED`
  (`IMP-036D_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-036D_STARTED: NO`;
  `IMP-036D_IMPLEMENTATION_COMPLETE: NO`; `IMP-036D_ACCEPTED: NO`).
- Preserves `acceptedThrough = IMP-036C` and `pendingAcceptance = NONE`; `nextProductSlice` becomes
  IMP-036E — Store Operations Management, which remains `PLANNED` / `NOT_ACTIVATED` /
  `NOT_AUTHORIZED` / `NOT_STARTED`.
- No architecture lock; no implementation authorization or start; no D-374; no ARCH-R20; no capability
  architecture artifact created. ARCH-R19 and DR-15 remain unchanged.
- Records Founder architecture decisions: preparation/readiness =
  `NO_NEW_V1_DOMAIN_STATE_REQUIRED` (no PREPARING/READY; D-357 preserved); Financial Document
  workforce review = `DEFERRED`; Notification resend architecture direction approved under existing
  D-372 `/api/operations/v1/*` façade subject to resource-specific outlet authorization
  (`notification.resend` reused; no new permission/role/scope; `D374_REQUIRED_FOR_NOTIFICATION_RESEND
  = NO`); Refund workforce support desired (`IMP036D_REFUND_WORKFORCE_SUPPORT_INTENT = YES`) but
  Refund execution topology remains `DECISION_REQUIRED` and blocks architecture lock
  (`IMP036D_REFUND_TOPOLOGY_BLOCKS_ARCHITECTURE_LOCK = YES`; D-361/D-364 PaymentProvider
  customer-commerce boundary preserved; no operations PaymentProvider wiring, internal HTTP, queue,
  or provider topology change).
- Founder UAT remains required eventually (`IMP-036D_FOUNDER_UAT_REQUIRED: YES`). Store Operations
  Management remains IMP-036E (PLANNED / unactivated).
- Supersedes GTM-R102 for the current product-slice position.

### GTM-R102 — 2026-09-05

- Records formal acceptance of **IMP-036C — Customer Commerce Experience V2** after independent
  technical acceptance and Founder UAT PASS for the exact accepted product candidate: repository
  `/home/ajoshi/repos/boba-bear-platform`; branch `main`; HEAD
  `0ec83ba5b7b03387dcefbd478807faefc3499d6b`; tree
  `778723aaf8ee363d337f4887455c13f68e1385bc` (PR #107 merge). Implementation evidence is
  **COMPLETE**; independent implementation review is **PASS**; independent acceptance evidence is
  **ACCEPTED**; Founder UAT is **PASS**; formal acceptance is recorded (`IMP036C_FORMAL_ACCEPTANCE:
  ACCEPTED`; `IMP-036C_ACCEPTED: YES`).
- IMP-036C lifecycle becomes `COMPLETE_AND_ACCEPTED`. Architecture remains `LOCKED`
  (`IMP-036C_ARCHITECTURE_LOCKED: YES`).
- Advances `acceptedThrough = IMP-036C`; sets `currentProductSlice = NONE` and
  `pendingAcceptance = NONE`; preserves `nextProductSlice = IMP-036D`. IMP-036D remains `PLANNED` /
  `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`. Formal acceptance does **not** authorize,
  start, or activate IMP-036D.
- Preserves Founder UAT / candidate history: earlier `abe19d…` family failure; direct-main process
  exception `13835d285f53186c9ed89dc1ed0d11e30be75cca` (**reconciled**, not accepted; subsequent
  work returned to normal PR/CI/merge; `IMP036C_PROCESS_EXCEPTION_OUTSTANDING: NO`); explicit
  Founder UAT FAIL `16e8b8223aa7bb25b759402e69e2f934a1a844fe`; intermediate repair candidates not
  rewritten as PASS. Sole accepted product SHA remains `0ec83ba5…`.
- Docs/governance reconciliation merge is governance provenance only — not a new product UAT
  candidate. Deferred Maps hardening remains owned by IMP-038 (PLANNED only);
  `DEFERRED_CUSTOMER_FAILED_PAYMENT_HISTORY: YES` preserved.
- Supersedes GTM-R101 for the current IMP-036C lifecycle and acceptance position.

### GTM-R101 — 2026-09-02

- Single founder-authorized **combined** gate for **IMP-036C — Customer Commerce Experience V2**:
  canonical activation, capability architecture **ARCHITECTURE_LOCKED**, implementation
  **AUTHORIZED** / **STARTED** / **COMPLETE**, lifecycle
  `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`.
- Sets `currentProductSlice = IMP-036C`, `pendingAcceptance = IMP-036C`, `nextProductSlice = IMP-036D`.
  `acceptedThrough` remains IMP-036B. Completion is **not** acceptance.
- Locked boundary facts: `schema_change: YES` bounded to `0036_outlet_delivery_fee_policy`;
  `provider_IO: NO`; `new_service: NO`; `new_queue: NO`; `new_auth_model: NO`;
  `STANDARDIZED_CUSTOMER_DELIVERY_FEE: YES`. Reuses existing Menu, Cart, Checkout, Payment, Order,
  and IMP-036B Serviceability authorities; no new public transport contracts.
- Locked capability architecture:
  [`capabilities/IMP-036C-customer-commerce-experience-v2.md`](./capabilities/IMP-036C-customer-commerce-experience-v2.md).
- Founder UAT **required** (`IMP-036C_FOUNDER_UAT_REQUIRED: YES`). Does **not** authorize or start
  IMP-036D. Supersedes GTM-R100 for the current IMP-036C lifecycle position.

### GTM-R100 — 2026-09-02

- Records formal acceptance of **IMP-036B — Customer Account, Onboarding, Address & Location
  Experience** after independent technical acceptance and Founder UAT PASS for the exact accepted
  candidate: repository `/home/ajoshi/repos/boba-bear-platform`; branch `main`; HEAD
  `4c4fcf1887fa6d8386575c77d5da22bb11e79059` (PR #71 merge). Implementation evidence is
  **COMPLETE**; independent implementation review is **PASS**; independent acceptance evidence is
  **ACCEPTED**; Founder UAT is **PASS**; formal acceptance is recorded (`IMP036B_FORMAL_ACCEPTANCE:
  ACCEPTED`; `IMP-036B_ACCEPTED: YES`).
- IMP-036B lifecycle becomes `COMPLETE_AND_ACCEPTED`. Architecture remains `LOCKED`
  (`IMP-036B_ARCHITECTURE_LOCKED: YES`).
- Advances `acceptedThrough = IMP-036B`; sets `currentProductSlice = NONE` and
  `pendingAcceptance = NONE`; preserves `nextProductSlice = IMP-036C`. IMP-036C remains `PLANNED` /
  `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`. Formal acceptance does **not** authorize,
  start, or activate IMP-036C.
- Supersedes GTM-R99 for the current IMP-036B lifecycle and acceptance position.

### GTM-R98 — 2026-09-01

- Records formal acceptance of **IMP-036A — Multi-Portal Experience Foundation** after independent
  technical acceptance and Founder UAT PASS for the exact accepted candidate: repository
  `/home/ajoshi/repos/boba-bear-platform`; branch `main`; HEAD
  `ee4926709ba6082ff6c24aabc2ea7d88d9bc1d6f`; tree
  `4fd243f5923565deceeb6c3f461e0d8a2f5a1eec` (PR 59 merge
  `ee4926709ba6082ff6c24aabc2ea7d88d9bc1d6f`). Implementation evidence is **COMPLETE**;
  independent implementation review is **PASS**; independent acceptance evidence is **ACCEPTED**;
  Founder UAT is **PASS**; formal acceptance is recorded (`IMP036A_FORMAL_ACCEPTANCE: ACCEPTED`;
  `IMP-036A_ACCEPTED: YES`).
- IMP-036A lifecycle becomes `COMPLETE_AND_ACCEPTED`. Architecture remains `LOCKED`
  (`IMP-036A_ARCHITECTURE_LOCKED: YES`). Locked boundary facts remain unchanged: `schema_change: NO`,
  `provider_IO: NO`, `new_service: NO`, `new_auth_model: NO`, `new_roles: NO`,
  `new_permissions: NO`, `microfrontend: NO`; no new CURRENT decision.
- Advances `acceptedThrough = IMP-036A`; sets `currentProductSlice = NONE` and
  `pendingAcceptance = NONE`; preserves `nextProductSlice = IMP-036B`. IMP-036B remains `PLANNED` /
  `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`. Formal acceptance does **not** authorize,
  start, or activate IMP-036B.
- Supersedes GTM-R97 for the current IMP-036A lifecycle and acceptance position. Product acceptance
  through IMP-036 is unchanged.

### GTM-R97 — 2026-09-01

- Single founder-authorized **combined** gate for **IMP-036A — Multi-Portal Experience Foundation**:
  canonical activation, capability architecture **ARCHITECTURE_LOCKED**, implementation
  **AUTHORIZED** / **STARTED** / **COMPLETE**, lifecycle
  `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`.
- Sets `currentProductSlice = IMP-036A`, `pendingAcceptance = IMP-036A`, `nextProductSlice = IMP-036B`.
  `acceptedThrough` remains IMP-036. Completion is **not** acceptance.
- Locked boundary facts: `schema_change: NO`; `provider_IO: NO`; `new_service: NO`;
  `new_auth_model: NO`; `new_roles: NO`; `new_permissions: NO`; `microfrontend: NO`; no new CURRENT
  decision. Customer, Workforce, and Administration shells are separated via Next.js route groups
  under static export; workforce hub navigation is permission-driven over existing session projection.
- Locked capability architecture:
  [`capabilities/IMP-036A-multi-portal-experience-foundation.md`](./capabilities/IMP-036A-multi-portal-experience-foundation.md).
- Founder UAT **required** (`IMP-036A_FOUNDER_UAT_REQUIRED: YES`). Does **not** authorize or start
  IMP-036B. Supersedes GTM-R96 for the current IMP-036A lifecycle position. Product acceptance
  through IMP-036 is unchanged.

### GTM-R96 — 2026-09-01

- Inserts the planned **Enterprise Experience Programme** as IMP-036A–G between accepted IMP-036
  and existing IMP-037 using the repository-supported single-letter suffix convention.
- Preserves `acceptedThrough = IMP-036`, `currentProductSlice = NONE`, and
  `pendingAcceptance = NONE`; changes `nextProductSlice` from IMP-037 to IMP-036A.
- Records all IMP-036A–G and IMP-037 as `PLANNED` / `NOT_ACTIVATED` / `NOT_AUTHORIZED` /
  `NOT_STARTED`. No capability architecture is locked and no implementation is authorized.
- Preserves IMP-037–040 identities and the public GTM boundary at IMP-040. Sequence becomes
  IMP-036A → B → C → D → E → F → G → IMP-037 → IMP-038 → IMP-039 → IMP-040.
- Indexes one programme contract and seven detailed planned slice contracts under
  [`experience/enterprise-experience/`](./experience/enterprise-experience/README.md). Initial
  implementation does not require Figma; later visual amendments cannot silently redefine product,
  domain, API, provider, or authorization semantics.
- Orders IMP-036B Account/Location before IMP-036C Commerce V2 so mature commerce can depend on
  canonical customer location and Serviceability experience.
- Plans permission/scope-derived workforce entry, outlet-scoped Team administration over existing
  IMP-035 authority, existing support/refund workflows in IMP-036D, and an IMP-036D architecture
  assessment of preparation/readiness needs without creating a lifecycle state or implementation.
- Records `NAVIGATION_MUST_NOT_ADVERTISE_UNIMPLEMENTED_CAPABILITIES`: navigation may expose only
  real, available destinations authorized for the principal; direct URL/API authorization remains
  authoritative.
- Defers location-provider selection, arbitrary multi-outlet franchise RBAC, and media/object-storage
  architecture. Creates no D-374 and leaves ARCH-R19 / DR-15 unchanged.
- Supersedes GTM-R95 for current next-slice planning only; accepted history remains unchanged.

### GTM-R95 — 2026-09-01

- Records formal acceptance of **IMP-036 — Observability & Operational Controls** for independently
  accepted product `main` merge SHA `68b46a53dc5d1ff84a8493899e713d3ef43db3aa` and tree
  `9b5c3193bf74d75a820b16976e894ec2dffafa13` (repository
  `/home/ajoshi/repos/boba-bear-platform`; branch `main`; working-tree fingerprint
  `bc872e19e46d178c9145f743a78a655fa849d145ebadf6c6c2d768768975e915`; PR 55 merge
  `90593ab846992ca963bf5ae5edc3d0b6a5281d4b`; PR CI run 33470441914 SUCCESS). Implementation
  evidence is **COMPLETE**; independent implementation review is **PASS**; independent acceptance
  evidence is **ACCEPTED**; formal acceptance is recorded (`IMP036_FORMAL_ACCEPTANCE: ACCEPTED`;
  `IMP-036_ACCEPTED: YES`).
- IMP-036 lifecycle becomes `COMPLETE_AND_ACCEPTED`. Architecture remains `LOCKED`
  (`IMP-036_ARCHITECTURE_LOCKED: YES`). Locked boundary facts remain unchanged: `schema_change: NO`,
  `provider_IO: NO`, `new_service: NO`, `new_permissions: NO`, `new_roles: NO`; no `D-374`.
- Founder UAT remains **not required** (`IMP-036_FOUNDER_UAT_REQUIRED: NO`;
  `IMP-036_FOUNDER_UAT: NOT_APPLICABLE`). Independent technical acceptance was the applicable gate.
- Advances `acceptedThrough = IMP-036`; sets `currentProductSlice = NONE` and
  `pendingAcceptance = NONE`; preserves `nextProductSlice = IMP-037`. IMP-037 remains `PLANNED` /
  `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`. Formal acceptance does **not** authorize,
  start, or activate IMP-037.
- Supersedes GTM-R94 for the current IMP-036 lifecycle and acceptance position. Product acceptance
  through IMP-035 is unchanged.

### GTM-R94 — 2026-09-01

- Single founder-authorized **combined** gate for **IMP-036 — Observability & Operational Controls**:
  canonical activation, capability architecture **ARCHITECTURE_LOCKED**, implementation
  **AUTHORIZED** / **STARTED** / **COMPLETE**, lifecycle
  `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`.
- Sets `currentProductSlice = IMP-036`, `pendingAcceptance = IMP-036`, `nextProductSlice = IMP-037`.
  `acceptedThrough` remains IMP-035. Completion is **not** acceptance.
- Locked boundary facts: `schema_change: NO`; `provider_IO: NO`; `new_service: NO`;
  `new_permissions: NO`; `new_roles: NO`; no new CURRENT decision (`D-374` not created).
  Provider-neutral structured logs and in-process metrics only; operational read API on existing
  operations process gated by existing workforce auth and `order.read`.
- Locked capability architecture:
  [`capabilities/IMP-036-observability-operational-controls.md`](./capabilities/IMP-036-observability-operational-controls.md).
- Does **not** authorize or start IMP-037. Supersedes GTM-R93 for the current IMP-036 lifecycle
  position. Product acceptance through IMP-035 is unchanged.

### GTM-R93 — 2026-09-01

- Records formal acceptance of **IMP-035 — Initial Administration Capabilities** after independent
  technical acceptance and Founder UAT PASS for the exact accepted candidate: repository
  `/home/ajoshi/repos/boba-bear-platform`; branch `main`; HEAD
  `7e83d5486665ed1a3847f8484d73deb825946501`; tree `83c318ecd9a4cff86e19f9d35ca5ad42bcff357a`;
  working-tree fingerprint `6f7d01304bbd66835e8dec18ed8c29b87d2c5513d2b23799b53b6bf1c6f88d13`
  (PR 52 merge `642cf7193a8b8419e8abec3bc24b5a76df9c182a`; PR 53 merge
  `7e83d5486665ed1a3847f8484d73deb825946501`; PR CI run 33432064507 SUCCESS; main CI run
  33432564817 SUCCESS; Deploy run 33432564832 SUCCESS). Implementation evidence is **COMPLETE**;
  independent implementation review is **PASS**; independent acceptance evidence is **ACCEPTED**;
  Founder UAT is **PASS**; formal acceptance is recorded (`IMP035_FORMAL_ACCEPTANCE: ACCEPTED`;
  `IMP-035_ACCEPTED: YES`).
- IMP-035 lifecycle becomes `COMPLETE_AND_ACCEPTED`. Architecture remains `LOCKED`
  (`IMP-035_ARCHITECTURE_LOCKED: YES`). Locked boundary facts remain unchanged: `schema_change: NO`,
  `provider_IO: NO`, `new_service: NO`, `new_permissions: NO`, `new_roles: NO`; binding **D-373** /
  **ARCH-R19** / **ARCH-G25** / **DR-15** preserved.
- Advances `acceptedThrough = IMP-035`; sets `currentProductSlice = NONE` and
  `pendingAcceptance = NONE`; preserves `nextProductSlice = IMP-036`. IMP-036 remains `PLANNED` /
  `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`. Formal acceptance does **not** authorize,
  start, or activate IMP-036.
- Supersedes GTM-R92 for the current IMP-035 lifecycle and acceptance position. Product acceptance
  through IMP-034 is unchanged.

### GTM-R92 — 2026-09-01

- Single founder-authorized **combined** gate for **IMP-035 — Initial Administration Capabilities**:
  architecture **ARCHITECTURE_LOCKED**, implementation **AUTHORIZED** / **STARTED** / **COMPLETE**,
  lifecycle `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`.
- Registers binding **D-373** (admin transport `/api/admin/v1/*` on existing operations process),
  advances decision register to **DR-15**, and advances global architecture to **ARCH-R19** /
  **ARCH-G25**.
- Sets `currentProductSlice = IMP-035`, `pendingAcceptance = IMP-035`, `nextProductSlice = IMP-036`.
  `acceptedThrough` remains IMP-034. Completion is **not** acceptance.
- Founder UAT **required**. Does **not** authorize or start IMP-036. `schema_change: NO`;
  `new_service: NO`; `new_permissions: NO`; `new_roles: NO`.
- Locked capability architecture:
  [`capabilities/IMP-035-initial-administration-capabilities.md`](./capabilities/IMP-035-initial-administration-capabilities.md).
- Supersedes GTM-R91 for the current IMP-035 lifecycle position. Product acceptance through IMP-034
  is unchanged.

### GTM-R91 — 2026-08-31

- Records formal acceptance of **IMP-034 — Meta WhatsApp Cloud API Adapter** for independently
  accepted product `main` merge SHA `7e92d1a1ca02ad825229b64f308a8fc555956d25` and tree
  `772c585e93c78285e5b972d8b8a58c83507e01f8` (PR 50; PR CI run 33424475222 SUCCESS; main CI run
  33424999014 SUCCESS; Deploy run 33424998996 SUCCESS). Implementation evidence is **COMPLETE**;
  independent implementation review is **PASS**; independent acceptance evidence is **ACCEPTED**;
  formal acceptance is recorded (`IMP034_FORMAL_ACCEPTANCE: ACCEPTED`; `IMP-034_ACCEPTED: YES`).
- IMP-034 lifecycle becomes `COMPLETE_AND_ACCEPTED`. Architecture remains `LOCKED`
  (`IMP-034_ARCHITECTURE_LOCKED: YES`). Implementation remains `AUTHORIZED` / `STARTED` /
  `COMPLETE` (`IMP-034_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-034_STARTED: YES`;
  `IMP-034_IMPLEMENTATION_COMPLETE: YES`). Locked boundary facts remain unchanged:
  `schema_change: YES` (Notifications-owned additive migration `0034_meta_whatsapp_adapter`),
  `provider_IO: YES` (direct Meta Cloud API outbound + verified webhook ingress), `new_service: NO`,
  `async_topology: POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER`,
  `provider_strategy: DIRECT_META_CLOUD_API_V1`, and `BSP: NO`.
- Founder UAT remains **not required** (`IMP-034_FOUNDER_UAT_REQUIRED: NO`;
  `IMP-034_FOUNDER_UAT: NOT_APPLICABLE`). Independent technical acceptance with mocked Meta fixtures
  was the applicable gate. Meta production onboarding / live production send remain external launch
  validation and do **not** block this technical acceptance.
- Advances `acceptedThrough = IMP-034`; sets `currentProductSlice = NONE` and
  `pendingAcceptance = NONE`; preserves `nextProductSlice = IMP-035` — Initial Administration
  Capabilities, which remains `PLANNED` / `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`.
  Formal acceptance does **not** authorize, start, or activate IMP-035.
- Does **not** create `D-373`, create `ARCH-R19`, adopt a BSP, start SMS/email providers, add
  conversation-console UI, marketing automation, or a new queue/service.
- Supersedes GTM-R90 for the current IMP-034 lifecycle and acceptance position.

### GTM-R90 — 2026-08-31

- Records a single founder-authorized **combined** gate for **IMP-034 — Meta WhatsApp Cloud API
  Adapter**: capability-local architecture lock, implementation authorization, implementation start,
  and implementation completion. Intermediate lifecycle-only roadmap versions are deliberately not
  emitted.
- IMP-034 lifecycle becomes `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Architecture becomes
  `ARCHITECTURE_LOCKED` (`IMP-034_ARCHITECTURE_LOCKED: YES`). Implementation is `AUTHORIZED` /
  `STARTED` / `COMPLETE` (`IMP-034_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-034_STARTED: YES`;
  `IMP-034_IMPLEMENTATION_COMPLETE: YES`; `IMP-034_ACCEPTED: NO`). Formal acceptance is **not**
  claimed; `COMPLETION IS NOT ACCEPTANCE: YES`.
- Locked capability architecture is persisted at
  [`capabilities/IMP-034-meta-whatsapp-cloud-api-adapter.md`](./capabilities/IMP-034-meta-whatsapp-cloud-api-adapter.md)
  under binding **ADR-012** / **ADR-013** / **ADR-014** / **ADR-015** and accepted IMP-033.
- Sets `pendingAcceptance = IMP-034`. Preserves `acceptedThrough = IMP-033`. Sets
  `currentProductSlice = IMP-034` and `nextProductSlice = IMP-035` — Initial Administration
  Capabilities, which remains `PLANNED` / `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`.
- Locked boundary clarifications: `provider_strategy: DIRECT_META_CLOUD_API_V1` (`BSP: NO` for V1);
  `schema_change: YES` bounded to Notifications-owned additive migration `0034_meta_whatsapp_adapter`
  only; `provider_IO: YES` — direct Meta Cloud API outbound template send plus verified webhook
  ingress with durable provider-event / inbound-message persistence; `new_service: NO`;
  `async_topology: POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER` reusing the IMP-033
  `NotificationOutboxProcessor` hosted in customer-commerce and operations; no Redis / Kafka /
  RabbitMQ / external queue / new deployable service.
- `IMP-034_FOUNDER_UAT_REQUIRED: NO`. IMP-034 adds server-side provider I/O and an integration webhook
  route with no customer-visible or operator-visible interactive product surface. Independent
  technical acceptance with mocked Meta fixtures is the applicable gate. Meta production onboarding
  remains external launch validation and does not block technical acceptance.
- `D-373` is **not** created; `ARCH_R19_REQUIRED: NO`. DR-14 and ARCH-R18 remain unchanged. Completion
  does **not** authorize, start, or activate IMP-035, create conversation-console UI, or claim
  marketing automation.
- Supersedes GTM-R89 for the current IMP-034 lifecycle position. Product acceptance through IMP-033
  is unchanged.

### GTM-R89 — 2026-08-31

- Records formal acceptance of **IMP-033 — Notification Foundation** for independently accepted
  product `main` merge SHA `5150d70b4683f7abec1e0652bf53e7986efcf622` and tree
  `715ff386e672fd276a0b2e888aa2ebeaab3dda8c` (PR 48; PR CI run 33417506582 SUCCESS; main CI run
  33418061603 SUCCESS; Deploy run 33418062095 SUCCESS). Implementation evidence is **COMPLETE**;
  independent implementation review is **PASS**; independent acceptance evidence is **ACCEPTED**;
  formal acceptance is recorded (`IMP033_FORMAL_ACCEPTANCE: ACCEPTED`; `IMP-033_ACCEPTED: YES`).
- IMP-033 lifecycle becomes `COMPLETE_AND_ACCEPTED`. Architecture remains `LOCKED`
  (`IMP-033_ARCHITECTURE_LOCKED: YES`). Implementation remains `AUTHORIZED` / `STARTED` /
  `COMPLETE` (`IMP-033_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-033_STARTED: YES`;
  `IMP-033_IMPLEMENTATION_COMPLETE: YES`). Locked boundary facts remain unchanged:
  `schema_change: YES` (Notifications-owned tables and migrations only), `provider_IO: NO`,
  `new_service: NO`, and `async_topology: POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER`.
- Founder UAT remains **not required** (`IMP-033_FOUNDER_UAT_REQUIRED: NO`;
  `IMP-033_FOUNDER_UAT: NOT_APPLICABLE`). IMP-033 is a foundation-only slice with no customer-visible
  or operator-visible interactive surface and no message leaving the platform, on the same basis as
  IMP-031, so independent technical acceptance was the applicable gate.
- Advances `acceptedThrough = IMP-033`; sets `currentProductSlice = NONE` and
  `pendingAcceptance = NONE`; preserves `nextProductSlice = IMP-034` — Meta WhatsApp Cloud API
  Adapter, which remains `PLANNED` / `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`. Formal
  acceptance does **not** authorize, start, or activate IMP-034.
- ARCH-R18 / ARCH-G24 and DR-14 remain unchanged; `D-373` is not created and `ARCH-R19` is not
  required. WhatsApp adapter implementation, BSP selection, Meta production onboarding, inbound
  webhook routes, conversation-console UI, and marketing automation remain deferred to IMP-034 and
  later slices. This reconciliation introduces no product source, schema, migration,
  decision-register, or global-architecture substance mutation.
- Supersedes GTM-R88 for the current IMP-033 lifecycle and acceptance position.

### GTM-R88 — 2026-08-31

- Records a single founder-authorized **combined** gate for **IMP-033 — Notification Foundation**:
  capability-local architecture lock, implementation authorization, implementation start, and
  implementation completion. Intermediate lifecycle-only roadmap versions are deliberately not
  emitted.
- IMP-033 lifecycle becomes `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Architecture becomes
  `ARCHITECTURE_LOCKED` (`IMP-033_ARCHITECTURE_LOCKED: YES`). Implementation is `AUTHORIZED` /
  `STARTED` / `COMPLETE` (`IMP-033_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-033_STARTED: YES`;
  `IMP-033_IMPLEMENTATION_COMPLETE: YES`; `IMP-033_ACCEPTED: NO`). Formal acceptance is **not**
  claimed; `COMPLETION IS NOT ACCEPTANCE: YES`.
- Locked capability architecture is persisted at
  [`capabilities/IMP-033-notification-foundation.md`](./capabilities/IMP-033-notification-foundation.md)
  under binding **ADR-012**.
- Sets `pendingAcceptance = IMP-033`. Preserves `acceptedThrough = IMP-032`,
  `currentProductSlice = IMP-033`, and `nextProductSlice = IMP-034` — Meta WhatsApp Cloud API
  Adapter, which remains `PLANNED` / `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`.
- Locked boundary clarifications recorded in the capability artifact: `schema_change: YES` bounded
  to Notifications-owned tables and migrations only; `provider_IO: NO` — IMP-033 contains no
  Meta/WhatsApp provider I/O, channel adapters are ports/foundation only, shipped adapters are
  explicitly non-sending, and IMP-033 must never fabricate `PROVIDER_ACCEPTED` / `DELIVERED` /
  `READ`, provider IDs, or external-send success; `new_service: NO`;
  `async_topology: POSTGRESQL_TRANSACTIONAL_OUTBOX_IN_PROCESS_WORKER` using existing
  modular-monolith in-process worker conventions (`NotificationOutboxProcessor` hosted in
  customer-commerce and operations like `PaymentInboxProcessor`) with no Redis / Kafka / RabbitMQ /
  external queue / new deployable service; operator resend authorized by the single new
  `notification.resend` permission on the existing `support_refund_operator` role (plus
  `platform_super_admin` via all-permissions) with no new role invented.
- `IMP-033_FOUNDER_UAT_REQUIRED: NO`. IMP-033 is a foundation-only slice with no customer-visible or
  operator-visible interactive surface, on the same basis as IMP-031. Independent technical
  acceptance is the applicable acceptance gate.
- `D-373` is **not** created; `ARCH_R19_REQUIRED: NO`. DR-14 and ARCH-R18 remain unchanged. The Meta
  WhatsApp Cloud API adapter, webhook routes, Meta onboarding, conversation console UI, and
  marketing automation remain deferred to IMP-034 and later slices.
- Supersedes GTM-R87 for the current IMP-033 lifecycle position. Product acceptance through IMP-032
  is unchanged.

### GTM-R87 — 2026-08-31

- Records explicit authorization and canonical activation of **IMP-033 — Notification Foundation**
  as `currentProductSlice` for architecture work only, under accepted IMP-032 and binding ADR-012
  intent.
- IMP-033 lifecycle becomes `ARCHITECTURE_IN_PROGRESS`; architecture is `NOT_LOCKED`
  (`IMP-033_ARCHITECTURE_LOCKED: NO`); implementation remains `NOT_AUTHORIZED` / `NOT_STARTED`
  (`IMP-033_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-033_STARTED: NO`;
  `IMP-033_IMPLEMENTATION_COMPLETE: NO`; `IMP-033_ACCEPTED: NO`).
- Draft capability architecture is commenced at
  [`capabilities/IMP-033-notification-foundation.md`](./capabilities/IMP-033-notification-foundation.md)
  (`NOT_LOCKED`; provider-neutral Notifications module; transactional outbox; consent/template/
  notification lifecycle; WhatsApp adapter deferred to IMP-034).
- Preserves `acceptedThrough = IMP-032` and `pendingAcceptance = NONE`; `nextProductSlice` becomes
  IMP-034 — Meta WhatsApp Cloud API Adapter, which remains `PLANNED` / `NOT_ACTIVATED`.
- IMP-032 remains `COMPLETE_AND_ACCEPTED` under ARCH-R18 / ARCH-G24. No WhatsApp BSP is selected;
  no Meta production onboarding, webhook routes, notification schema migration, worker/queue/new-service
  topology, D-373, or ARCH-R19 is introduced. DR-14 and ARCH-R18 remain unchanged;
  `D-373_CREATED: NO`; `ARCH_R19_REQUIRED: NO`.
- Supersedes GTM-R86 for the current product-slice position.

### GTM-R86 — 2026-08-31

- Records formal acceptance of **IMP-032 — Dehradun Delivery Operating Mode** after independent
  technical acceptance and Founder UAT PASS for the exact accepted candidate: repository
  `/home/ajoshi/repos/boba-bear-platform`; branch `main`; HEAD
  `078ae39109a748174c429ac40381e038ab21d3c1`; tree `973153488a4e32e06a6da1e1e7d41072ebca9376`;
  working-tree fingerprint `251c0589f8f17a1acf289d2798a671cea8eaba9ebd604edc0e5a933dc711223c`.
  Implementation evidence is **COMPLETE**; independent implementation review is **PASS**; independent
  acceptance evidence is **ACCEPTED**; Founder UAT is **PASS**; formal acceptance is recorded
  (`IMP032_FORMAL_ACCEPTANCE: ACCEPTED`; `IMP-032_ACCEPTED: YES`).
- IMP-032 lifecycle becomes `COMPLETE_AND_ACCEPTED`. Architecture remains `LOCKED`
  (`IMP-032_ARCHITECTURE_LOCKED: YES`). Operating mode remains **MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY**.
- Advances `acceptedThrough = IMP-032`; sets `currentProductSlice = NONE` and
  `pendingAcceptance = NONE`; preserves `nextProductSlice = IMP-033`. IMP-033 remains `PLANNED` /
  `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`. Formal acceptance does **not** authorize,
  start, or activate IMP-033.
- ARCH-R18 / ARCH-G24 and DR-14 remain unchanged; D-373 is not created. Provider API automation,
  webhooks, workers, queues, and notifications remain deferred. This reconciliation introduces no
  product source, schema, migration, decision-register, or ARCH-G24 substance mutation beyond
  governance records.
- Supersedes GTM-R85 for the current IMP-032 lifecycle and acceptance position.

### GTM-R85 — 2026-08-31

- Records implementation **COMPLETE** pending independent acceptance and required Founder UAT for
  **IMP-032 — Dehradun Delivery Operating Mode** under prior GTM-R82/GTM-R83/GTM-R84 authorization,
  start, and boundary clarification and the locked capability architecture at
  [`capabilities/IMP-032-dehradun-delivery-operating-mode.md`](./capabilities/IMP-032-dehradun-delivery-operating-mode.md).
  Operating mode remains **MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY**. ARCH-R18 / ARCH-G24 and DR-14
  remain unchanged; D-373 is not created.
- IMP-032 lifecycle becomes `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Architecture remains
  `LOCKED` (`IMP-032_ARCHITECTURE_LOCKED: YES`). Implementation is `AUTHORIZED` / `STARTED` /
  `COMPLETE` (`IMP-032_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-032_STARTED: YES`;
  `IMP-032_IMPLEMENTATION_COMPLETE: YES`; `IMP-032_ACCEPTED: NO`). Formal acceptance is **not**
  claimed. Founder UAT is **REQUIRED** and **NOT_STARTED** (`IMP-032_FOUNDER_UAT_REQUIRED: YES`).
- Sets `pendingAcceptance = IMP-032`. Preserves `acceptedThrough = IMP-031`,
  `currentProductSlice = IMP-032`, and `nextProductSlice = IMP-033`. IMP-033 remains `PLANNED` /
  `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`.
- Records data-only access-control seed migration `0032_delivery_permissions` applied under the
  GTM-R84 boundary (no Delivery schema change; no provider I/O). Manual booking safety, RBAC,
  Operations API/UI, customer projection, and fulfil coordination are implemented within the locked
  architecture. Provider API automation, webhooks, workers, queues, and notifications remain deferred.
- Supersedes GTM-R84 for the current IMP-032 implementation-completion position. Product acceptance
  through IMP-031 is unchanged.

### GTM-R84 — 2026-08-31

- Records an **implementation-boundary clarification** for IMP-032 §23.3 only. Implementation
  inspection established that already-initialized environments do not automatically receive newly
  locked permission-catalog entries from typed `catalog.ts` alone; persisted
  `app.access_permissions` / `app.access_role_permissions` remain effective authorization authority;
  repository-native precedent uses committed SQL data seeds aligned with the typed catalog
  (`payment.refund` in migration `0019_refund.sql`).
- Clarifies under the locked manual-mode architecture: Delivery/domain `schema_change: NO`;
  `delivery_schema_migration: NO`; `new_service: NO`; access-control schema change **NO**; a
  repository-native **data-only** access-control seed migration is **PERMITTED_IF_REQUIRED** only
  to install the already-locked ten `delivery.*` permission keys and repository-approved role
  mappings into already-initialized environments, with **NO** DDL and **NO** Delivery-table mutation,
  and with permission + trusted scope remaining authority.
- IMP-032 lifecycle remains `IMPLEMENTATION_IN_PROGRESS`; implementation remains
  `AUTHORIZED` / `STARTED` (`IMP-032_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-032_STARTED: YES`;
  `IMP-032_IMPLEMENTATION_COMPLETE: NO`; `IMP-032_ACCEPTED: NO`). This gate does **not** complete
  or accept implementation, create D-373, create ARCH-R19, activate IMP-033 / IMP-034, or authorize
  provider API / webhook / worker / queue / notification integration.
- Preserves operating mode **MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY**, `acceptedThrough = IMP-031`,
  `pendingAcceptance = NONE`, `currentProductSlice = IMP-032`, and `nextProductSlice = IMP-033`
  (remains `PLANNED` / `NOT_ACTIVATED`). ARCH-R18 and DR-14 remain unchanged;
  `D-373_CREATED: NO`; `ARCH_R19_REQUIRED: NO`.
- Supersedes GTM-R83 for the current IMP-032 implementation-boundary position. Historical GTM-R83 /
  STATE-R81 implementation-start checkpoint remains preserved as prior authority.

### GTM-R83 — 2026-08-31

- Records IMP-032 implementation **STARTED** under prior GTM-R82 authorization and the locked
  capability architecture at
  [`capabilities/IMP-032-dehradun-delivery-operating-mode.md`](./capabilities/IMP-032-dehradun-delivery-operating-mode.md)
  (`ARCHITECTURE_LOCKED`; `IMP-032_ARCHITECTURE_LOCKED: YES`).
- IMP-032 lifecycle becomes `IMPLEMENTATION_IN_PROGRESS`; implementation is
  `AUTHORIZED` / `STARTED` (`IMP-032_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-032_STARTED: YES`;
  `IMP-032_IMPLEMENTATION_COMPLETE: NO`; `IMP-032_ACCEPTED: NO`). Start does **not** complete or
  accept implementation.
- Preserves operating mode **MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY** and the locked manual
  booking safety boundary (pre-external-attempt `REQUESTED` → `BOOKING_OUTCOME_UNKNOWN`; stable
  `bookingCorrelationId`; manual resolution without provider I/O).
- Preserves `acceptedThrough = IMP-031`, `pendingAcceptance = NONE`, `currentProductSlice = IMP-032`,
  and `nextProductSlice = IMP-033` (remains `PLANNED` / `NOT_ACTIVATED`).
- IMP-031 remains `COMPLETE_AND_ACCEPTED` under ARCH-R18 / ARCH-G24. No named provider is canonical;
  no provider API integration, webhook, queue, worker, notification, Delivery schema migration,
  runtime topology, D-373, or ARCH-R19 is introduced. DR-14 and ARCH-R18 remain unchanged;
  `D-373_CREATED: NO`; `ARCH_R19_REQUIRED: NO`. Founder UAT remains required for later acceptance.
- Supersedes GTM-R82 for the current IMP-032 implementation-start position. Historical GTM-R82 /
  STATE-R80 authorization checkpoint remains preserved as prior authority.

### GTM-R82 — 2026-08-31

- Authorizes implementation of **IMP-032 — Dehradun Delivery Operating Mode** under the locked
  capability architecture at
  [`capabilities/IMP-032-dehradun-delivery-operating-mode.md`](./capabilities/IMP-032-dehradun-delivery-operating-mode.md)
  (`ARCHITECTURE_LOCKED`; `IMP-032_ARCHITECTURE_LOCKED: YES`).
- IMP-032 lifecycle becomes `IMPLEMENTATION_AUTHORIZED`; implementation is
  `AUTHORIZED` / `NOT_STARTED` (`IMP-032_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-032_STARTED: NO`;
  `IMP-032_IMPLEMENTATION_COMPLETE: NO`; `IMP-032_ACCEPTED: NO`). Authorization does **not** start
  implementation.
- Preserves operating mode **MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY** and the locked manual
  booking safety boundary (pre-external-attempt `REQUESTED` → `BOOKING_OUTCOME_UNKNOWN`; stable
  `bookingCorrelationId`; manual resolution without provider I/O).
- Preserves `acceptedThrough = IMP-031`, `pendingAcceptance = NONE`, `currentProductSlice = IMP-032`,
  and `nextProductSlice = IMP-033` (remains `PLANNED` / `NOT_ACTIVATED`).
- IMP-031 remains `COMPLETE_AND_ACCEPTED` under ARCH-R18 / ARCH-G24. No named provider is canonical;
  no provider API integration, webhook, queue, worker, notification, Delivery schema migration,
  runtime topology, D-373, or ARCH-R19 is introduced. DR-14 and ARCH-R18 remain unchanged;
  `D-373_CREATED: NO`; `ARCH_R19_REQUIRED: NO`. Founder UAT remains required for later acceptance.
- Supersedes GTM-R81 for the current IMP-032 implementation-authorization position. Historical
  GTM-R81 / STATE-R79 architecture-lock checkpoint remains preserved as prior authority.

### GTM-R81 — 2026-08-31

- Locks capability architecture for **IMP-032 — Dehradun Delivery Operating Mode** at
  [`capabilities/IMP-032-dehradun-delivery-operating-mode.md`](./capabilities/IMP-032-dehradun-delivery-operating-mode.md)
  (`ARCHITECTURE_LOCKED`; `IMP-032_ARCHITECTURE_LOCKED: YES`).
- Locks operating mode **MANUAL_PROVIDER_NEUTRAL_DEHRADUN_DELIVERY**: operator-approved dispatch;
  pre-external-attempt `REQUESTED` → `BOOKING_OUTCOME_UNKNOWN`; stable `bookingCorrelationId`;
  application-level manual booking resolution with no provider I/O; provider-neutral facts; BOBA
  order page as canonical customer delivery-status surface; deferred provider API / webhook /
  worker / queue / WhatsApp automation (IMP-033 / IMP-034).
- Architecture lock does **not** authorize or start implementation
  (`IMP-032_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-032_STARTED: NO`;
  `IMP-032_IMPLEMENTATION_COMPLETE: NO`; `IMP-032_ACCEPTED: NO`).
- Preserves `acceptedThrough = IMP-031`, `pendingAcceptance = NONE`, `currentProductSlice = IMP-032`,
  and `nextProductSlice = IMP-033` (remains `PLANNED` / `NOT_ACTIVATED`).
- IMP-031 remains `COMPLETE_AND_ACCEPTED` under ARCH-R18 / ARCH-G24. No named provider is canonical;
  no provider API integration, webhook, queue, worker, notification, schema migration, runtime
  topology, D-373, or ARCH-R19 is introduced. DR-14 and ARCH-R18 remain unchanged;
  `D-373_CREATED: NO`; `D373_REQUIRED_FOR_LOCK: NO`; `ARCH_R19_REQUIRED: NO`.
- Reuses the uncommitted GTM-R81 revision for architecture lock (draft was never committed or
  promoted). Supersedes GTM-R80 for the current IMP-032 architecture-lock position.

### GTM-R80 — 2026-08-30

- Records explicit authorization and canonical activation of **IMP-032 — Dehradun Delivery Operating
  Mode** as `currentProductSlice` for architecture work only.
- IMP-032 lifecycle becomes `ARCHITECTURE_IN_PROGRESS`; architecture is `NOT_LOCKED`
  (`IMP-032_ARCHITECTURE_LOCKED: NO`); implementation remains `NOT_AUTHORIZED` / `NOT_STARTED`
  (`IMP-032_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-032_STARTED: NO`;
  `IMP-032_IMPLEMENTATION_COMPLETE: NO`; `IMP-032_ACCEPTED: NO`).
- Preserves `acceptedThrough = IMP-031` and `pendingAcceptance = NONE`; `nextProductSlice` becomes
  IMP-033 — Notification Foundation, which remains `PLANNED` / `NOT_ACTIVATED`.
- IMP-031 remains `COMPLETE_AND_ACCEPTED` under ARCH-R18 / ARCH-G24 and the locked capability
  artifact at
  [`capabilities/IMP-031-provider-neutral-delivery-foundation.md`](./capabilities/IMP-031-provider-neutral-delivery-foundation.md).
  Accepted provider-neutral Delivery authority, Order lifecycle separation, provider-observation
  evidence semantics, one-active Delivery/booking safety, `BOOKING_OUTCOME_UNKNOWN` semantics,
  customer delivery charge versus provider cost separation, and deferral of provider-specific choices
  remain binding and are not amended by this activation.
- No capability architecture artifact is created, architecture is not locked, implementation is not
  authorized or started, no provider or aggregator is selected, no Dehradun operating mode is chosen,
  no provider accounts/contracts/credentials/payload mappings/webhook schemas/worker-queue topology
  are defined, and no runtime, schema, migration, dependency, deployment, decision-register, or
  global-architecture substance mutation is introduced. ARCH-R18 and DR-14 remain unchanged;
  `D-373_CREATED: NO`; `NO_NEW_CURRENT_DECISION_IN_THIS_ACTIVATION_GATE: YES`. Subsequent architecture
  discovery may investigate operating-model and provider-strategy questions without this gate
  answering them.
- Supersedes GTM-R79 for the current product-slice position.

### GTM-R79 — 2026-08-30

- Records formal acceptance of **IMP-031 — Provider-Neutral Delivery Foundation** for independently
  accepted product `main` merge SHA `c3d499b0b8df2a8c7ae9297ab870f6286f81b848` and tree
  `dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099`. Implementation evidence is **COMPLETE**; independent
  implementation review is **PASS**; independent acceptance evidence is **ACCEPTED**; formal
  acceptance is recorded (`IMP031_FORMAL_ACCEPTANCE: ACCEPTED`; `IMP-031_ACCEPTED: YES`).
- IMP-031 lifecycle becomes `COMPLETE_AND_ACCEPTED`. Architecture remains `LOCKED`
  (`IMP-031_ARCHITECTURE_LOCKED: YES`). Implementation remains `AUTHORIZED` / `STARTED` /
  `COMPLETE` (`IMP-031_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-031_STARTED: YES`;
  `IMP-031_IMPLEMENTATION_COMPLETE: YES`). Boundary C remains the implementation boundary.
- Advances `acceptedThrough = IMP-031`; sets `currentProductSlice = NONE` and
  `pendingAcceptance = NONE`; preserves `nextProductSlice = IMP-032`. IMP-032 remains `PLANNED` /
  `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`. Formal acceptance does **not** authorize,
  start, or activate IMP-032.
- ARCH-R18 / ARCH-G24 and DR-14 remain unchanged; D-373 is not created. Provider selection and
  Dehradun operating mode remain deferred. This reconciliation introduces no product source, schema,
  migration, decision-register, or ARCH-G24 substance mutation.
- Supersedes GTM-R78 for the current IMP-031 lifecycle and acceptance position.

### GTM-R78 — 2026-08-30

- Records implementation **COMPLETE** pending independent acceptance for **IMP-031 — Provider-Neutral
  Delivery Foundation** under prior GTM-R76/GTM-R77 authorization and start and the locked capability
  architecture at
  [`capabilities/IMP-031-provider-neutral-delivery-foundation.md`](./capabilities/IMP-031-provider-neutral-delivery-foundation.md).
  Authorization scope remains locked Boundary C only. ARCH-R18 / ARCH-G24 and DR-14 remain unchanged;
  D-373 is not created.
- IMP-031 lifecycle becomes `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`. Architecture remains
  `LOCKED` (`IMP-031_ARCHITECTURE_LOCKED: YES`). Implementation is `AUTHORIZED` / `STARTED` /
  `COMPLETE` (`IMP-031_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-031_STARTED: YES`;
  `IMP-031_IMPLEMENTATION_COMPLETE: YES`; `IMP-031_ACCEPTED: NO`). Formal acceptance is **not**
  claimed.
- Sets `pendingAcceptance = IMP-031`. Preserves `acceptedThrough = IMP-030`,
  `currentProductSlice = IMP-031`, and `nextProductSlice = IMP-032`. IMP-032 remains `PLANNED` /
  `NOT_ACTIVATED` / `NOT_AUTHORIZED` / `NOT_STARTED`.
- Records exact implementation identity: source SHA
  `66e2783afa4e9eef35c4ec208b25af9d9450f83d` / tree `dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099`;
  merged main SHA `c3d499b0b8df2a8c7ae9297ab870f6286f81b848` / tree
  `dd42ea992c8866ff8cfbc0ac09e781eb6fcfa099`; PR #37; PR CI `33317358990` SUCCESS; main CI
  `33317603325` SUCCESS; deploy `33317603348` SUCCESS; independent implementation review **PASS**
  after bounded safety repair and focused re-review (`IMP_031_INDEPENDENT_IMPLEMENTATION_REVIEW:
  PASS`).
- Concrete provider adapters, provider selection/accounts/credentials, Dehradun operating mode,
  provider payload/status mapping, concrete callback/webhook API, workers/queues/new services,
  retry timings/operating thresholds, Operations UI, Notifications/WhatsApp, and infrastructure
  expansion remain deferred. This completion gate does not mutate product source, schema,
  migration, decision register, or ARCH-G24 substance.
- Supersedes GTM-R77 for the current IMP-031 implementation-completion position. Product acceptance
  through IMP-030 is unchanged.

### GTM-R77 — 2026-08-30

- Records implementation **START** for **IMP-031 — Provider-Neutral Delivery Foundation** under prior
  GTM-R76 authorization and the locked capability architecture at
  [`capabilities/IMP-031-provider-neutral-delivery-foundation.md`](./capabilities/IMP-031-provider-neutral-delivery-foundation.md).
  Authorization scope remains locked Boundary C only. ARCH-R18 / ARCH-G24 and DR-14 remain unchanged;
  D-373 is not created.
- IMP-031 implementation becomes `AUTHORIZED` / `STARTED` / `IMPLEMENTATION_IN_PROGRESS`; start does
  not complete or accept implementation (`IMP-031_IMPLEMENTATION_AUTHORIZED: YES`;
  `IMP-031_STARTED: YES`). Architecture remains `LOCKED` (`IMP-031_ARCHITECTURE_LOCKED: YES`).
- Preserves `acceptedThrough = IMP-030`, `pendingAcceptance = NONE`, `currentProductSlice = IMP-031`,
  and `nextProductSlice = IMP-032`. IMP-032 remains `PLANNED` / `NOT_ACTIVATED`.
- Concrete provider adapters, provider selection/accounts/credentials, Dehradun operating mode,
  provider payload/status mapping, concrete callback/webhook API, workers/queues/new services,
  retry timings/operating thresholds, Operations UI, Notifications/WhatsApp, and infrastructure
  expansion remain deferred. No product source, runtime, schema, migration, dependency, or
  deployment mutation is introduced by this governance START gate.
- Supersedes GTM-R76 for the current IMP-031 implementation-start position.

### GTM-R76 — 2026-08-29

- Records explicit implementation authorization for **IMP-031 — Provider-Neutral Delivery
  Foundation** under the locked capability architecture at
  [`capabilities/IMP-031-provider-neutral-delivery-foundation.md`](./capabilities/IMP-031-provider-neutral-delivery-foundation.md).
  Authorization applies only to locked Boundary C. ARCH-R18 / ARCH-G24 and DR-14 remain unchanged;
  D-373 is not created.
- IMP-031 implementation becomes `AUTHORIZED` / `NOT_STARTED`; authorization does not start
  implementation (`IMP-031_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-031_STARTED: NO`). Architecture
  remains `LOCKED` (`IMP-031_ARCHITECTURE_LOCKED: YES`).
- Preserves `acceptedThrough = IMP-030`, `pendingAcceptance = NONE`, `currentProductSlice = IMP-031`,
  and `nextProductSlice = IMP-032`. IMP-032 remains `PLANNED` / `NOT_ACTIVATED`.
- Concrete provider adapters, provider selection/accounts/credentials, Dehradun operating mode,
  provider payload/status mapping, concrete callback/webhook API, workers/queues/new services,
  retry timings/operating thresholds, Operations UI, Notifications/WhatsApp, and infrastructure
  expansion remain deferred. No product source, runtime, schema, migration, dependency, or
  deployment mutation is introduced.
- Supersedes GTM-R75 for the current IMP-031 implementation-authorization position.

### GTM-R75 — 2026-08-29

- Locks the capability architecture for **IMP-031 — Provider-Neutral Delivery Foundation** at
  [`capabilities/IMP-031-provider-neutral-delivery-foundation.md`](./capabilities/IMP-031-provider-neutral-delivery-foundation.md).
- Preserves ARCH-R18 / ARCH-G24, implementation boundary C with the capability-local Delivery
  lifecycle amendment, DR-14, and the absence of D-373.
- IMP-031 lifecycle becomes `ARCHITECTURE_LOCKED`; architecture is `LOCKED`
  (`IMP-031_ARCHITECTURE_LOCKED: YES`); implementation remains `NOT_AUTHORIZED` / `NOT_STARTED`
  (`IMP-031_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-031_STARTED: NO`).
- Preserves `acceptedThrough = IMP-030`, `pendingAcceptance = NONE`, `currentProductSlice = IMP-031`,
  and `nextProductSlice = IMP-032`. IMP-032 remains `PLANNED` / `NOT_ACTIVATED`.
- Provider selection, Dehradun operating mode, provider accounts/credentials/contracts,
  provider-specific status mapping, routes, workers/queues/services, UI, Notifications/WhatsApp, and
  infrastructure remain deferred. No runtime, schema, migration, dependency, deployment,
  implementation authorization, or implementation start occurs.
- Supersedes GTM-R74 for the current IMP-031 architecture-lock position.

### GTM-R74 — 2026-08-29

- Records the reviewable architecture candidate for **IMP-031 — Provider-Neutral Delivery
  Foundation** at
  [`capabilities/IMP-031-provider-neutral-delivery-foundation.md`](./capabilities/IMP-031-provider-neutral-delivery-foundation.md).
- Advances global architecture to **ARCH-R18 / ARCH-G24** for the minimal durable Delivery-domain,
  provider-adapter, one-active-booking, idempotency, and ambiguous-outcome recovery authority.
- Records implementation boundary C (provider-neutral domain model + persistence foundation +
  provider-neutral ports/interfaces) as **APPROVED WITH THE CAPABILITY-LOCAL LIFECYCLE AMENDMENT**.
  This is approved architecture scope only, not implementation authorization.
- IMP-031 remains `ARCHITECTURE_IN_PROGRESS`; architecture remains `NOT_LOCKED`; implementation
  remains `NOT_AUTHORIZED` / `NOT_STARTED` (`IMP-031_IMPLEMENTATION_AUTHORIZED: NO`;
  `IMP-031_STARTED: NO`). `acceptedThrough = IMP-030`, `pendingAcceptance = NONE`,
  `currentProductSlice = IMP-031`, and `nextProductSlice = IMP-032` remain unchanged.
- Provider selection, Dehradun operating mode, provider accounts/credentials/contracts,
  provider-specific status mapping, routes, workers/queues/services, UI, Notifications/WhatsApp, and
  infrastructure remain deferred. DR-14 is unchanged; D-373 is not created. No runtime, schema,
  migration, dependency, deployment, implementation authorization, or implementation start occurs.
- Supersedes GTM-R73 for the current IMP-031 architecture-drafting position.

### GTM-R73 — 2026-08-29

- Records explicit authorization and canonical activation of **IMP-031 — Provider-Neutral Delivery
  Foundation** as `currentProductSlice` for architecture work only.
- IMP-031 lifecycle becomes `ARCHITECTURE_IN_PROGRESS`; architecture is `NOT_LOCKED`; implementation
  remains `NOT_AUTHORIZED` / `NOT_STARTED` (`IMP-031_IMPLEMENTATION_AUTHORIZED: NO`;
  `IMP-031_STARTED: NO`).
- Preserves `acceptedThrough = IMP-030` and `pendingAcceptance = NONE`; `nextProductSlice` becomes
  IMP-032 — Dehradun Delivery Operating Mode, which remains `PLANNED` / `NOT_ACTIVATED`.
- No capability architecture artifact is created, implementation is not authorized or started, no
  provider is selected or integrated, and no runtime, schema, migration, dependency, deployment,
  decision-register, or global-architecture mutation is introduced. ARCH-R17 and DR-14 remain
  unchanged; D-373 is not created; provider-specific choices remain deferred.
- Supersedes GTM-R72 for the current product-slice position.

### GTM-R72 — 2026-08-29

- Records formal acceptance of **IMP-030 — Operations Console UI** for independently accepted
  `main` merge SHA `4bcf0fa0a659202c29be03e9b1b0cefbacf484fb` and tree
  `048b3ac4e1ba5b3519fa5665f0f4de151068fb59`. Implementation evidence is **COMPLETE**;
  independent implementation review is **PASS**; independent acceptance evidence is **ACCEPTED**.
- IMP-030 lifecycle becomes `COMPLETE_AND_ACCEPTED`. Architecture remains
  `ARCHITECTURE_LOCKED`; implementation remains `AUTHORIZED` / `STARTED` / `COMPLETE`
  (`IMP-030_IMPLEMENTATION_COMPLETE: YES`; `IMP-030_ACCEPTED: YES`). D-372 remains CURRENT.
- Advances `acceptedThrough = IMP-030`; sets `currentProductSlice = NONE`; preserves
  `pendingAcceptance = NONE` and `nextProductSlice = IMP-031`. IMP-031 remains `PLANNED` /
  `NOT_ACTIVATED`.
- This reconciliation introduces no runtime, schema, migration, or deployment mutation beyond the
  already-promoted implementation. ARCH-R17 and DR-14 remain unchanged; D-373 is not created.
- Supersedes GTM-R71 for the current IMP-030 lifecycle and acceptance position.

### GTM-R71 — 2026-08-27

- **CANONICAL_CONSISTENCY_ONLY** repair. Reconciles stale present-tense IMP-030 lifecycle /
  current-slice prose with the already-established GTM-R70 / STATE-R68 authoritative state.
- Corrects ROADMAP §4 live current-product-slice prose that still described architecture-only /
  not-locked / not-authorized / not-started status, and corrects the stale
  `Next product slice: IMP-030` line while `currentProductSlice = IMP-030` and
  `nextProductSlice = IMP-031`.
- Reconciles STATE §5 Acceptance Position stale lifecycle prose that still asserted
  `ARCHITECTURE_IN_PROGRESS` / `NOT_LOCKED` / `NOT_AUTHORIZED` / `NOT_STARTED`.
- Hardens `project:consistency` so the same live ROADMAP §4 / STATE §5 contradiction class is
  detectable without treating historical GTM-R66 / STATE-R64 records as current prose.
- Does **not** create a lifecycle advance, architecture change, implementation authorization or
  start event, completion decision, acceptance decision, IMP-031 activation, D-372 change, or
  D-373 creation. IMP-030 remains `IMPLEMENTATION_IN_PROGRESS` / `LOCKED` / `AUTHORIZED` /
  `STARTED`; `acceptedThrough` remains IMP-029; IMP-031 remains `PLANNED` / `NOT_ACTIVATED`.
  ARCH-R17 and DR-14 remain unchanged.
- Supersedes GTM-R70 for the current consistency position only.

### GTM-R70 — 2026-08-27

- Records a capability-local **detail route architecture amendment** for **IMP-030 — Operations
  Console UI** while implementation remains `AUTHORIZED` / `STARTED` /
  `IMPLEMENTATION_IN_PROGRESS` under the locked capability architecture at
  [`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md).
- During implementation, the prior pretty dynamic UI route
  `/workforce/operations/orders/{orderId}/` proved incompatible with binding static export
  (`output: "export"`, `trailingSlash: true`). The amended architecture uses the fixed static detail
  shell `/workforce/operations/orders/detail/` with `orderId` carried via query parameter. The
  Operations API surface, static-export topology, D-372, ARCH-R17, and DR-14 remain unchanged; D-373
  is not created.
- Prior read-only list implementation remains valid. No product source is included in this governance
  transition. Architecture remains `ARCHITECTURE_LOCKED`; implementation is not completed or
  accepted. IMP-031 remains `PLANNED` / `NOT_ACTIVATED`.
- Preserves `acceptedThrough = IMP-029` and `pendingAcceptance = NONE`.
- Supersedes GTM-R69 for the current lifecycle position.

### GTM-R69 — 2026-08-26

- Records implementation **START** for **IMP-030 — Operations Console UI** under prior GTM-R68
  authorization and the locked capability architecture at
  [`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md).
  Architecture remains `ARCHITECTURE_LOCKED`; D-372 remains binding and CURRENT; ARCH-R17 and DR-14
  remain unchanged; D-373 is not created.
- IMP-030 implementation becomes `AUTHORIZED` / `STARTED` / `IMPLEMENTATION_IN_PROGRESS`; start does
  not complete or accept implementation. No product source, runtime, schema, migration, or deployment
  mutation is introduced. IMP-031 remains `PLANNED` / `NOT_ACTIVATED`.
- Preserves `acceptedThrough = IMP-029` and `pendingAcceptance = NONE`.
- Supersedes GTM-R68 for the current lifecycle position.

### GTM-R68 — 2026-08-26

- Records explicit implementation authorization for **IMP-030 — Operations Console UI** under the
  locked capability architecture at
  [`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md).
  D-372 remains binding and CURRENT; ARCH-R17 and DR-14 remain unchanged; D-373 is not created.
- IMP-030 implementation becomes `AUTHORIZED` / `NOT_STARTED`; authorization does not start
  implementation. No product source, runtime, schema, migration, or deployment mutation is
  introduced. IMP-031 remains `PLANNED` / `NOT_ACTIVATED`.
- Preserves `acceptedThrough = IMP-029` and `pendingAcceptance = NONE`.
- Supersedes GTM-R67 for the current lifecycle position.

### GTM-R67 — 2026-08-26

- Locks the capability architecture for **IMP-030 — Operations Console UI** at
  [`capabilities/IMP-030-operations-console-ui.md`](./capabilities/IMP-030-operations-console-ui.md).
  D-372 remains binding and CURRENT; ARCH-R17 and DR-14 remain unchanged; D-373 is not created.
- IMP-030 implementation remains `NOT_AUTHORIZED` / `NOT_STARTED`; no runtime, product, schema, or
  deployment mutation is introduced. IMP-031 remains `PLANNED` / `NOT_ACTIVATED`.
- Supersedes GTM-R66 for the current product-slice architecture position.

### GTM-R66 — 2026-08-26

- Records explicit Founder authorization to activate **IMP-030 — Operations Console UI** for
  architecture work only. IMP-030 becomes `currentProductSlice` and its lifecycle becomes
  `ARCHITECTURE_IN_PROGRESS`; architecture remains `NOT_LOCKED` and implementation remains
  `NOT_AUTHORIZED` / `NOT_STARTED`.
- Preserves `acceptedThrough = IMP-029` and `pendingAcceptance = NONE`; `nextProductSlice` becomes
  IMP-031, which remains `PLANNED` / `NOT_ACTIVATED`.
- No capability architecture artifact is created, no D-373 is created, and ARCH-R17, DR-14, and
  D-372 remain unchanged. No runtime, schema, migration, product, or deployment mutation is
  introduced.
- Supersedes GTM-R65 for the current product-slice position.

### GTM-R65 — 2026-08-26

- Records formal acceptance of **IMP-029 — Operations Console API** for independently accepted
  `main` SHA `0490a393666a87f5f99cc6d90c99bef18d09c097` and tree
  `4d376d296bd8596c4809fc91331659a2f52e53e6`. Implementation evidence is **COMPLETE**;
  independent implementation review is **PASS**; independent acceptance evidence is **ACCEPTED**.
- IMP-029 lifecycle becomes `COMPLETE_AND_ACCEPTED`. Architecture remains
  `ARCHITECTURE_LOCKED`; implementation remains `AUTHORIZED` / `STARTED` / `COMPLETE`
  (`IMP-029_IMPLEMENTATION_COMPLETE: YES`; `IMP-029_ACCEPTED: YES`). D-372 remains CURRENT.
- Advances `acceptedThrough = IMP-029`; sets `currentProductSlice = NONE`; preserves
  `pendingAcceptance = NONE` and `nextProductSlice = IMP-030`. IMP-030 remains `PLANNED` /
  `NOT_STARTED` / `NOT_AUTHORIZED`.
- This reconciliation introduces no runtime, schema, migration, or deployment mutation. Remote
  Operations deployment is not claimed. ARCH-R17 and DR-14 remain unchanged.
- Supersedes GTM-R64 for the current IMP-029 lifecycle and acceptance position.

### GTM-R64 — 2026-08-24

- Records **IMP-029 — Operations Console API** implementation **STARTED** under prior GTM-R63
  authorization and its locked capability architecture
  ([`capabilities/IMP-029-operations-console-api.md`](./capabilities/IMP-029-operations-console-api.md)).
- IMP-029 lifecycle = `IMPLEMENTATION_IN_PROGRESS`. Architecture remains `ARCHITECTURE_LOCKED`.
  Implementation = `AUTHORIZED` / `STARTED`
  (`IMP-029_ARCHITECTURE_LOCKED: YES`; `IMP-029_IMPLEMENTATION_AUTHORIZED: YES`;
  `IMP-029_STARTED: YES`; `IMP-029_IMPLEMENTATION_COMPLETE: NO`; `IMP-029_ACCEPTED: NO`).
- `acceptedThrough` remains IMP-028D; `pendingAcceptance` remains NONE; `currentProductSlice`
  remains IMP-029; `nextProductSlice` remains IMP-030. IMP-030 remains `PLANNED` /
  `NOT_ACTIVATED`.
- This governance transition records implementation start only. It introduces no product code, no
  runtime route, no schema change, no migration, no deployment, and no IMP-030 activation.
- Decision register remains DR-14. Global architecture remains ARCH-R17. D-372 remains CURRENT.
- Supersedes GTM-R63 for the current IMP-029 lifecycle position. Product acceptance through
  IMP-028D is unchanged.

### GTM-R63 — 2026-08-24

- Records explicit Founder authorization for **IMP-029 — Operations Console API** implementation
  under its locked capability architecture
  ([`capabilities/IMP-029-operations-console-api.md`](./capabilities/IMP-029-operations-console-api.md)).
- IMP-029 lifecycle = `IMPLEMENTATION_AUTHORIZED`. Architecture remains `ARCHITECTURE_LOCKED`.
  Implementation = `AUTHORIZED` / `NOT_STARTED`
  (`IMP-029_ARCHITECTURE_LOCKED: YES`; `IMP-029_IMPLEMENTATION_AUTHORIZED: YES`;
  `IMP-029_STARTED: NO`; `IMP-029_IMPLEMENTATION_COMPLETE: NO`; `IMP-029_ACCEPTED: NO`).
- `acceptedThrough` remains IMP-028D; `pendingAcceptance` remains NONE; `currentProductSlice`
  remains IMP-029; `nextProductSlice` remains IMP-030. IMP-030 remains `PLANNED` /
  `NOT_ACTIVATED`.
- Authorization does **not** start implementation. No product source, product tests, runtime,
  schema, migration, permission catalog, configuration, deployment, decision-register, or global
  architecture change is recorded.
- Decision register remains DR-14. Global architecture remains ARCH-R17. D-372 remains CURRENT.
- Supersedes GTM-R62 for the current IMP-029 lifecycle position. Product acceptance through
  IMP-028D is unchanged.

### GTM-R62 — 2026-08-24

- Locks the approved capability architecture for **IMP-029 — Operations Console API** at
  [`capabilities/IMP-029-operations-console-api.md`](./capabilities/IMP-029-operations-console-api.md).
- IMP-029 lifecycle becomes `ARCHITECTURE_LOCKED`; implementation remains `NOT_AUTHORIZED` /
  `NOT_STARTED` (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).
- Registers binding **D-372** and advances global architecture to **ARCH-R17** and the decision
  register to **DR-14**. D-372 establishes the dedicated `/api/operations/v1/*` workforce business
  transport, backed by the existing trusted workforce-session authority and existing Order authority.
- `acceptedThrough` remains IMP-028D; `pendingAcceptance` remains NONE;
  `currentProductSlice` remains IMP-029; `nextProductSlice` remains IMP-030. IMP-030 remains
  `PLANNED` / `NOT_ACTIVATED`.
- Does **not** authorize or start implementation, create runtime/container/router code, alter
  Nginx, Compose, cookies, permissions, schemas, migrations, Refund/Financial Document workforce
  transport, or activate IMP-030.

### GTM-R61 — 2026-08-22

- Records explicit Founder authorization and canonical activation of **IMP-029 — Operations Console
  API** as `currentProductSlice` for architecture work only.
- IMP-029 lifecycle becomes `ARCHITECTURE_IN_PROGRESS`; architecture is `NOT_LOCKED`; implementation
  is `NOT_AUTHORIZED` / `NOT_STARTED`.
- `acceptedThrough` remains IMP-028D; `pendingAcceptance` remains NONE; `nextProductSlice` becomes
  IMP-030 — Operations Console UI.
- Does **not** lock IMP-029 architecture, authorize or start IMP-029 implementation, create D-372,
  modify ARCH-R16 or DR-13, implement Operations Console API or UI, implement delivery or
  notifications, activate IMP-030, change `acceptedThrough`, or create pending acceptance.

### GTM-R60 — 2026-08-22

- Records formal acceptance of **IMP-028D — Desktop Ordering Continuity** after Founder UAT
  **PASS** for the exact merged-main candidate
  `166aec4efd1c55a9e14ab7216a2b1af71fb3b2c7` / tree
  `eba5f3f7fc25b07581801b53a130fb9547abc459`.
- IMP-028D lifecycle becomes `COMPLETE_AND_ACCEPTED`; architecture remains
  `ARCHITECTURE_LOCKED`; implementation remains `AUTHORIZED` / `STARTED` / `COMPLETE`.
- Advances `acceptedThrough = IMP-028D`; sets `currentProductSlice = NONE` and
  `pendingAcceptance = NONE`; `nextProductSlice` remains IMP-029.
- IMP-029 remains `PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`. This reconciliation does not
  authorize or start IMP-029.
- D-368 / D-369 / D-370 / D-371 remain unchanged and binding. Global architecture remains
  ARCH-R16 and the decision register remains DR-13.
- This reconciliation introduces no runtime, schema, migration, or product mutation.

### GTM-R59 — 2026-08-21

- Registers D-371 Durable Cart Unit Sequence Authority and the bounded IMP-028D RC3 contract
  amendment. It authorizes future durable internal per-unit Cart ordering, a forward-only migration,
  and the minimum existing customer-commerce product-level decrement command/transport only.
- RC3 implementation is **NOT_STARTED**. This governance decision does not alter the recorded RC1
  implementation-complete-pending-acceptance evidence, accept IMP-028D, claim Founder UAT, start
  IMP-029, or change pricing, Checkout, Payment, Order, Refund, auth, catalog, modifier semantics,
  or topology.
- Decision register becomes DR-13; global architecture becomes ARCH-R16 / ARCH-G22; next decision
  ID is D-372. Supersedes GTM-R58 only for current decision/architecture references.

### GTM-R58 — 2026-08-21

- Records IMP-028D RC1 implementation completion and promotion evidence: visual review PASS;
  feature commit `2a48e16fabc4b1fe9e86d23c6a3aad6d726b7e6e`; exact-SHA CI run `32458495599` SUCCESS;
  GitHub PR #3; and merge commit `c4d262b78f3a7f65808155634cc2745236c38b7c` on `main`.
- Lifecycle becomes `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; architecture remains
  `ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` / `STARTED` / `COMPLETE`
  (`IMP-028D_IMPLEMENTATION_COMPLETE: YES`; `IMP-028D_ACCEPTED: NO`).
- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;
  `pendingAcceptance` becomes IMP-028D; and `nextProductSlice` remains IMP-029. Founder UAT is
  required and PENDING / NOT RUN. No UAT build, deployment, Founder UAT result, or acceptance is
  claimed.
- Preserves prior Founder UAT FAIL, technical pre-UAT blocker, and RC1 amendment history. Does not
  authorize or start IMP-029, create D-371, or alter global architecture, decision authority,
  runtime topology, API, schema, migration, or pricing authority.
- Supersedes GTM-R57 for the current IMP-028D lifecycle position. Product acceptance through
  IMP-028C is unchanged.

### GTM-R57 — 2026-08-21

- Records founder approval and capability-local re-lock of the IMP-028D RC1 interaction
  architecture. The previous all-root-category sections and `IntersectionObserver` scroll-spy model
  is superseded for IMP-028D by explicit selected-category state; the bounded desktop Cart item list
  is the sole authorized nested vertical scroll region.
- Reopens implementation as `IMPLEMENTATION_IN_PROGRESS`; architecture remains
  `ARCHITECTURE_LOCKED`; implementation remains `AUTHORIZED` / `STARTED` with
  `IMP-028D_IMPLEMENTATION_COMPLETE: NO` and `IMP-028D_ACCEPTED: NO`.
- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;
  `pendingAcceptance` returns to NONE; `nextProductSlice` remains IMP-029. Founder UAT for RC1 is
  PENDING / NOT RUN and visual review must precede implementation completion.
- Preserves prior implementation, technical-preview, and Founder UAT failure evidence. Does not
  authorize or start IMP-029, create D-371, or alter global architecture, decision authority,
  runtime topology, API, schema, migration, or pricing authority.
- Supersedes GTM-R56 for the current IMP-028D lifecycle position. Product acceptance through
  IMP-028C is unchanged.

### GTM-R56 — 2026-08-21

- Records completion of the bounded IMP-028D `IntersectionObserver` root-margin correction:
  `-7rem 0px -55% 0px` is now the browser-valid `-112px 0px -55% 0px`, preserving the intended
  7rem sticky-header offset at the standard 16px root size. Regression test and deterministic
  validation pass; source implementation commit is `259d27d`.
- Lifecycle returns to `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; architecture remains
  `ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` / `STARTED` / `COMPLETE`
  (`IMP-028D_IMPLEMENTATION_COMPLETE: YES`; `IMP-028D_ACCEPTED: NO`).
- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;
  `pendingAcceptance` becomes IMP-028D; `nextProductSlice` remains IMP-029. Founder UAT remains
  PENDING; no acceptance is claimed.
- Does not authorize or start IMP-029, create D-371, or alter runtime topology, API, schema,
  migration, pricing authority, decision register, or global architecture.
- Supersedes GTM-R55 for the current IMP-028D lifecycle position. Product acceptance through
  IMP-028C is unchanged.

### GTM-R55 — 2026-08-21

- Reopens IMP-028D for an authorized, bounded technical correction after the UAT deployment at
  `365019e0e64e2d855298c714d3c65671183303b1` reached healthy APIs but browser rendering failed
  before freeze. The browser rejected `IntersectionObserver` `rootMargin: "-7rem 0px -55% 0px"`;
  Founder UAT did not occur and this is not a Founder UAT failure.
- Lifecycle returns to `IMPLEMENTATION_IN_PROGRESS`; architecture remains `ARCHITECTURE_LOCKED`;
  implementation remains `AUTHORIZED` / `STARTED` with
  `IMP-028D_IMPLEMENTATION_COMPLETE: NO`; `IMP-028D_ACCEPTED: NO`.
- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;
  `pendingAcceptance` returns to NONE; `nextProductSlice` remains IMP-029. No acceptance is claimed.
- Does not authorize or start IMP-029, create D-371, or alter runtime topology, API, schema,
  migration, pricing authority, decision register, or global architecture.
- Supersedes GTM-R54 for the current IMP-028D lifecycle position. Product acceptance through
  IMP-028C is unchanged.

### GTM-R54 — 2026-08-21

- Records the final customer-copy correction in the completed IMP-028D rework: delivery-PIN result
  copy no longer exposes checkout implementation wording. The exact updated rework tip was
  revalidated before the next UAT candidate is built.
- Current lifecycle remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` with
  `pendingAcceptance = IMP-028D`; the prior UAT FAIL remains preserved and the new Founder UAT is
  still PENDING. No acceptance is claimed.
- Supersedes GTM-R53 for the current IMP-028D implementation evidence only; product acceptance
  through IMP-028C, IMP-029 status, and D-371 remain unchanged.

### GTM-R53 — 2026-08-21

- Records deterministic completion of the bounded IMP-028D Founder-UAT rework. Lifecycle returns
  to `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; architecture remains
  `ARCHITECTURE_LOCKED`; implementation is `AUTHORIZED` / `STARTED` / `COMPLETE`
  (`IMP-028D_IMPLEMENTATION_COMPLETE: YES`; `IMP-028D_ACCEPTED: NO`). The recorded Founder UAT
  FAIL remains preserved; a new Founder UAT is required and PENDING.
- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;
  `pendingAcceptance` becomes IMP-028D; `nextProductSlice` remains IMP-029. No acceptance is
  claimed.
- Does not authorize or start IMP-029, create D-371, or alter runtime topology, API, schema,
  migration, pricing authority, decision register, or global architecture.
- Supersedes GTM-R52 for the current IMP-028D lifecycle position. Product acceptance through
  IMP-028C is unchanged.

### GTM-R52 — 2026-08-21

- Records the required founder UAT result for IMP-028D as **FAIL** against the frozen candidate
  `38fa04db9d81e47efeb0702037a0e7ee9371a28d` / tree
  `c91e51150461251470791f830293e49931f91cfa` (UAT project
  `boba-bear-imp028d-uat`, URL `http://127.0.0.1:18084`, freeze
  `2026-08-20T18:38:17Z`). The failure reopens the existing implementation for bounded rework;
  it is not a new capability or acceptance.
- IMP-028D lifecycle returns to `IMPLEMENTATION_IN_PROGRESS`. Architecture remains
  `ARCHITECTURE_LOCKED`; implementation remains `AUTHORIZED` / `STARTED` with
  `IMP-028D_IMPLEMENTATION_COMPLETE: NO`; `IMP-028D_ACCEPTED: NO`.
- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;
  `pendingAcceptance` returns to NONE; `nextProductSlice` remains IMP-029. A new founder UAT is
  required after deterministic rework validation and a newly frozen exact candidate.
- Does not accept IMP-028D, authorize or start IMP-029, create D-371, or alter runtime topology,
  API, schema, migration, pricing authority, decision register, or global architecture.
- Supersedes GTM-R51 for the current IMP-028D lifecycle position. Product acceptance through
  IMP-028C is unchanged.

### GTM-R51 — 2026-08-20

- IMP-028D — Desktop Ordering Continuity implementation is complete and awaits independent
  acceptance and required founder UAT. Lifecycle is `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`;
  architecture remains `ARCHITECTURE_LOCKED`; implementation remains `AUTHORIZED` / `STARTED` /
  `COMPLETE` (implementation authorization and start were recorded; this historical completion was
  superseded by the founder-UAT rework in GTM-R52; `IMP-028D_ACCEPTED: NO`).
- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;
  `pendingAcceptance` becomes IMP-028D; and `nextProductSlice` remains IMP-029. Founder UAT is
  required and pending; no founder-UAT result or formal acceptance is claimed.
- Records technical evidence for implementation commit `795bb3151e3a24d5914160d232f099016d880a2b`,
  reconciled CI candidate `499e9249e3c46d76e382c8c91740b49253b54a19`, GitHub PR #1, CI run
  `32395774250` (SUCCESS), and merge commit `ba1b0864fe39aefe3b20b0da1c2c039eff020998`.
- Does not accept IMP-028D, authorize or start IMP-029, create D-371, or alter runtime topology,
  API, schema, migration, pricing authority, decision register, or global architecture.
- Supersedes GTM-R50 for the current IMP-028D lifecycle position. Product acceptance through
  IMP-028C is unchanged.

### GTM-R50 — 2026-08-20

- Explicit founder/task authorization to implement **IMP-028D — Desktop Ordering Continuity** under
  the locked capability architecture
  ([`capabilities/IMP-028D-desktop-ordering-continuity.md`](./capabilities/IMP-028D-desktop-ordering-continuity.md)).
- IMP-028D lifecycle = `IMPLEMENTATION_IN_PROGRESS`. Architecture remains `ARCHITECTURE_LOCKED`.
  Implementation = `AUTHORIZED` / `STARTED`
  (`IMP-028D_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028D_IMPLEMENTATION_STARTED: YES`;
  `IMP-028D_IMPLEMENTATION_COMPLETE: NO`; `IMP-028D_ACCEPTED: NO`).
- `acceptedThrough` remains IMP-028C; `currentProductSlice` remains IMP-028D;
  `pendingAcceptance` remains NONE; `nextProductSlice` remains IMP-029.
- Does not mark IMP-028D complete or accepted, authorize or start IMP-029, create D-371, or alter
  runtime topology, API, schema, migration, pricing authority, decision register, or global
  architecture.
- Supersedes GTM-R49 for the current IMP-028D lifecycle position. Product acceptance through
  IMP-028C is unchanged.

### GTM-R49 — 2026-08-20

- Allocates and activates **IMP-028D — Desktop Ordering Continuity** after accepted IMP-028C and
  before reserved IMP-029. The locked capability architecture is
  [`capabilities/IMP-028D-desktop-ordering-continuity.md`](./capabilities/IMP-028D-desktop-ordering-continuity.md).
- IMP-028D lifecycle = `ARCHITECTURE_LOCKED`. Implementation remains **NOT_AUTHORIZED** /
  **NOT_STARTED** (`IMP-028D_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-028D_IMPLEMENTATION_STARTED: NO`;
  `IMP-028D_IMPLEMENTATION_COMPLETE: NO`; `IMP-028D_ACCEPTED: NO`).
- `acceptedThrough` remains IMP-028C; `currentProductSlice` becomes IMP-028D;
  `pendingAcceptance` remains NONE; `nextProductSlice` remains IMP-029.
- This activation reuses D-368 Customer Menu projection, D-369 paid-modifier intent, D-370 Cart
  identity-transition policy, existing Cart authority, and Checkout Snapshot final payable
  authority. It creates no decision: D-371 remains unused.
- Does not authorize or start IMP-028D implementation, authorize or start IMP-029, alter runtime,
  API, schema, migration, pricing authority, decision register, or global architecture.
- Supersedes GTM-R48 for the current product-slice position. Product acceptance through IMP-028C is
  unchanged.

### GTM-R48 — 2026-08-20

- Records formal acceptance of **IMP-028C — Food Customization** after founder UAT PASS for the
  frozen product candidate recorded in
  [`capabilities/IMP-028C-food-customization.md`](./capabilities/IMP-028C-food-customization.md).
- IMP-028C lifecycle = `COMPLETE_AND_ACCEPTED`; architecture remains `ARCHITECTURE_LOCKED` and
  implementation remains `AUTHORIZED` / `STARTED` / `COMPLETE`
  (`IMP-028C_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028C_IMPLEMENTATION_STARTED: YES`;
  `IMP-028C_IMPLEMENTATION_COMPLETE: YES`; `IMP-028C_ACCEPTED: YES`).
- Advances `acceptedThrough = IMP-028C`; sets `currentProductSlice = NONE` and
  `pendingAcceptance = NONE`. `nextProductSlice` remains IMP-029, planned, not started, and not
  implementation-authorized.
- Does not authorize or start IMP-029, change D-368 / D-369 / D-370, create D-371, alter runtime,
  schema, migration, catalog content, the decision register, or global architecture.
- Supersedes GTM-R47 for the current IMP-028C lifecycle position.

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
| IMP-031 capability architecture | [`capabilities/IMP-031-provider-neutral-delivery-foundation.md`](./capabilities/IMP-031-provider-neutral-delivery-foundation.md) (`ARCHITECTURE_LOCKED`) |

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
