<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "ACCEPTED_STATE",
  "stateVersion": "STATE-R26",
  "acceptedThrough": "IMP-027",
  "currentProductSlice": "IMP-028",
  "nextProductSlice": "IMP-028",
  "pendingAcceptance": "IMP-026C",
  "governanceHealth": "ALIGNED",
  "lastReviewed": "2026-08-18"
}
-->

# BOBA Bear — Accepted State

Coding-agent completion does **not** equal acceptance. This document is the independently accepted
current-reality authority.

## 1. Accepted Position

```text
Accepted Through:          IMP-027 — Refund Foundation
Accepted Inserted Slice:   IMP-005A — Dockerized local application runtime
Accepted Range:            IMP-001 → IMP-027 (including IMP-005A)
```

## 2. Current Work Position

```text
Current Product Implementation: IMP-028 — Invoice / Tax Receipt / Credit Note
Pending Acceptance:             IMP-026C
Next Product Slice:             IMP-028 — Invoice / Tax Receipt / Credit Note
Current Governance Activity:    IMP-028 IMPLEMENTATION_IN_PROGRESS (architecture LOCKED; implementation AUTHORIZED / STARTED; acceptance NO)
Governance Health:              ALIGNED
```

```text
IMP-024 architecture:     ARCHITECTURE_LOCKED
IMP-024 implementation:   COMPLETE_AND_ACCEPTED
IMP-025 architecture:     ARCHITECTURE_LOCKED
IMP-025 implementation:   COMPLETE_AND_ACCEPTED
IMP-026 architecture:     ARCHITECTURE_LOCKED
IMP-026 implementation:   COMPLETE_AND_ACCEPTED
IMP-026_ACCEPTED:         YES
IMP-026C:                 IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-026C architecture:    ARCHITECTURE_LOCKED
IMP-026C implementation:  AUTHORIZED / COMPLETE
IMP-026C_IMPLEMENTATION_AUTHORIZED: YES
IMP_026C_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP-026C_ACCEPTED:        NO
IMP-027:                  COMPLETE_AND_ACCEPTED
IMP-027 architecture:     ARCHITECTURE_LOCKED
IMP-027 implementation:   AUTHORIZED / COMPLETE
IMP-027_ARCHITECTURE:     LOCKED
IMP-027_IMPLEMENTATION:   AUTHORIZED / COMPLETE
IMP-027_IMPLEMENTATION_AUTHORIZED: YES
IMP_027_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP027_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP027_REFUND_FOUNDATION: ACCEPTED
IMP027_FORMAL_ACCEPTANCE: ACCEPTED
IMP-027_ACCEPTED:         YES
IMP-028:                  IMPLEMENTATION_IN_PROGRESS
IMP-028 architecture:     ARCHITECTURE_LOCKED
IMP-028 implementation:   AUTHORIZED / STARTED
IMP-028_ARCHITECTURE:     LOCKED
IMP-028_IMPLEMENTATION:   AUTHORIZED / STARTED
IMP-028_ARCHITECTURE_LOCKED: YES
IMP-028_IMPLEMENTATION_AUTHORIZED: YES
IMP-028_IMPLEMENTATION_STARTED: YES
IMP-028_IMPLEMENTATION_COMPLETE: YES
IMP-028_ACCEPTED:         NO
IMP-029:                  NOT_STARTED
```

Capability architecture:

[`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md)

[`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md)

[`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md)

[`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md)

[`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md)

[`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)

`acceptedThrough` is IMP-027. IMP-025 architecture remains locked; IMP-025 implementation is
**COMPLETE_AND_ACCEPTED**. IMP-026 architecture is **ARCHITECTURE_LOCKED**. IMP-026 implementation
is **COMPLETE_AND_ACCEPTED** (`IMP-026_ACCEPTED: YES`). Independent acceptance of IMP-026 is
recorded, including provider-originated Razorpay Test Mode webhook proof over public HTTPS.
IMP-026C architecture is **ARCHITECTURE_LOCKED**. IMP-026C implementation is **authorized** and
**implementation-complete pending acceptance**. Independent implementation review is **PASS**.
Implementation evidence is **COMPLETE**. Formal acceptance of IMP-026C is **not** claimed.
`pendingAcceptance=IMP-026C` identifies the next remaining unresolved formal acceptance gate.
IMP-027 is `COMPLETE_AND_ACCEPTED` (architecture **LOCKED**; implementation evidence **COMPLETE**;
independent implementation review **PASS**; `IMP-027_ACCEPTED: YES`; binding **D-364**).
Refund architecture remains locked and accepted. GTM-R28 / STATE-R26 record IMP-028
`IMPLEMENTATION_IN_PROGRESS` (architecture **LOCKED**;
implementation **AUTHORIZED** / **STARTED**; binding **D-365** / **D-366** / **D-367**; capability
artifact present). Invoice / tax-receipt / credit-note foundation implementation has **started**.
Working-tree `IMP-028_IMPLEMENTATION_COMPLETE = YES` in the capability artifact does **not**
accept IMP-028. Start is **not** acceptance. Refund statutory reversal remains
**NOT_IMPLEMENTED_UNDER_D366**. Statutory signing architecture is locked under **D-367**; signing
capability remains **NOT_IMPLEMENTED**. `PRE_EXISTING_IMP028_COMPLIANCE_DEFECT=YES` is recorded as
a separate completion blocker. IMP-029 remains not started.

Working-tree / current implementation note (not accepted inventory): migrations `0019`, `0020`,
`0021`, `0022`, and `0029` are present in the working tree. Accepted Technical Inventory below
remains bounded by `acceptedThrough=IMP-027` and must not be read as accepting IMP-026C / IMP-028
schema or promoting working-tree migrations into accepted inventory.

```text
LOCAL_RAZORPAY_GTM_VALIDATION: PASS
EXTERNAL_ACCEPTANCE_GAP: NONE
IMP-026_EXTERNAL_WEBHOOK_GATE: SATISFIED
IMP026_EXTERNAL_ACCEPTANCE_EVIDENCE: ACCEPTED
DEFERRED_EXTERNAL_GATE: NO
SATISFIED: YES
PROVIDER_ORIGINATED_WEBHOOK: VALIDATED_PUBLIC_HTTPS_TEST_MODE
```

Independent IMP-026 external Razorpay webhook acceptance (Test Mode; no Live Mode; no real money):

```text
Razorpay mode: TEST
Public webhook endpoint: POST https://cradling-unenvied-sapling.ngrok-free.dev/api/integrations/payments/razorpay/webhook
BOBA Checkout ID: 7f53816c-e72c-41b6-800f-fe38d97b1e1f
BOBA Payment ID: 5c93bb80-5f52-458f-a8a1-eae356d28956
BOBA Order: ORD-3ZGDJVFQRXHB (PLACED)
Razorpay Order: order_TR8lqo2solrrHR
Razorpay Payment: pay_TR8m5IrbnKkFN1
Razorpay events (HTTP 200): TR8mAZTG4riBtP payment.authorized; TR8mBaitTRKpLl payment.captured; TR8mC6zOM2E2p2 order.paid
Final BOBA state: Payment SUCCEEDED; Checkout COMPLETED; Order PLACED
Signature validation: PASS
Invalid-signature fail-closed: PASS (HTTP 400; no inbox/commercial side effect)
Exact signed-event replay: PASS (one durable inbox identity; no duplicate Payment; no duplicate commercial effect)
Automated tests: test:payment-razorpay 32/32 PASS; razorpay.http.integration 4/4 PASS
```

Prior manual real Razorpay Test payment verification remains on record (provider `captured`; BOBA
Payment `SUCCEEDED`; exactly one BOBA Order; confirmation/history/detail passed; provider
reconciliation and automatic capture passed; no duplicate Order / duplicate provider effect; no
architecture drift). Local signed webhook pipeline tests remain valid engineering evidence but are
not provider-originated webhook proof. Do not store webhook secrets, API secrets, session tokens,
card data, or unnecessary customer PII in repository governance records.

Verified payment (prior governance input; retained for reconstruction):

```text
BOBA Payment ID: a4d146c0-4363-4c83-8b0d-b8b6b7be9938
provider: razorpay
Razorpay Order: order_TPcvA3aIZtLpQ0
Razorpay Payment: pay_TPcvL1mni4ACtw
amount: 54390 paise INR
BOBA Order: ORD-B4CDRNQSBJSE (PLACED; exactly one)
```

Current V1 payment provider is **Razorpay** (**D-361**). Razorpay webhook acknowledgement / missing-Order
recovery is **D-362**. Razorpay durable webhook inbox / asynchronous Payment processing is **D-363**.
Refund Foundation architecture is **D-364**. Financial Document architecture is **D-365**.
Refund statutory-reversal decision authority is **D-366** (CURRENT; refund statutory reversal
workflow **NOT_IMPLEMENTED_UNDER_D366**). Statutory financial-document signing and signed-artifact
authority is **D-367** (CURRENT; signing capability **NOT_IMPLEMENTED**).

```text
PAYMENT_RECEIPT_VOUCHER_WORKFLOW: COMPLETE
ORDER_TAX_INVOICE_WORKFLOW: COMPLETE
REFUND_STATUTORY_REVERSAL_WORKFLOW: NOT_IMPLEMENTED_UNDER_D366
FD_NON_SIGNATURE_COMPLIANCE_CORRECTION: COMPLETE
SIGNATURE_COMPLIANCE: GAP
PRE_EXISTING_IMP028_COMPLIANCE_DEFECT: YES
```

`PRE_EXISTING_IMP028_COMPLIANCE_DEFECT=YES` is an IMP-028 completion/acceptance blocker separate
from D-366 refund branch authority. It does not accept or complete IMP-028.

Binding payment semantics preserved for IMP-027: a Payment that reached BOBA success from provider
`captured` remains successful original collection truth even if the provider later reports a
refund. Refund must not rewrite that truth. Refund is now formally accepted under the locked
capability artifact; it must not rewrite Payment collection truth.

`governanceHealth = ALIGNED` records independent acceptance through IMP-027.
Implementation agents must not self-promote this field or mark later slices accepted.

## 3. Accepted Technical Inventory

Independently verified from repository evidence on 2026-08-18 (authority path
`/mnt/c/repos/boba-bear-website`), including IMP-026 independent acceptance.
Speculative values are forbidden here.

| Metric | Verified value | How verified |
|---|---|---|
| Latest migration | `0018_payment_provider_event_inbox` | `drizzle/meta/_journal.json` entry tag; `drizzle/0018_payment_provider_event_inbox.sql` present |
| Migration count | `19` | Count of accepted migrations through IMP-026 (0000–0018) |
| Application tables | `93` | Count of `appSchema.table(` declarations under `src/platform/database/schema/` bounded to accepted IMP-026 schema |
| Workforce permissions | `55` | `PERMISSION_KEYS.length` in `src/shared/access-control/catalog.ts` |
| System roles | `7` | `ROLE_KEYS.length` in `src/shared/access-control/catalog.ts` |
| Default Docker services | `5` | Compose services without `profiles: ["tools"]`: `postgres`, `app`, `customer-auth`, `workforce-auth`, `customer-commerce` |
| Order-owned tables | `1` | `orders` in `src/platform/database/schema/order.ts` |
| Order snapshot/history tables | `0` | No additional Order snapshot/event tables in schema |
| IMP-023 new production runtime dependencies | `0` | No Order-domain production dependency addition beyond prior accepted baseline |
| IMP-026 new production runtime dependencies | `0` | Razorpay adapter behind existing `PaymentProvider`; no new deployable service |
| Payment provider event inbox table | `1` | `payment_provider_event_inbox` in `src/platform/database/schema/payment.ts` |
| Public web mode | Next.js static export → Nginx | `next.config.ts` `output: "export"`; `docker/nginx/nginx.conf`; no production `src/app/api` commerce tree |
| IMP-024 architecture artifact | present | `docs/platform/capabilities/IMP-024-customer-ordering-transport.md` |
| IMP-024 runtime Compose service | present | `customer-commerce` internal `:8083`; Nginx `/api/v1/*` (D-359) |
| IMP-025 architecture artifact | present | `docs/platform/capabilities/IMP-025-customer-ordering-ux.md` |
| IMP-025 static ordering catalog | present | `src/data/ordering-catalog.json` deterministic projection from existing-menu-v1 |
| IMP-026 architecture artifact | present | `docs/platform/capabilities/IMP-026-razorpay-productionization.md` |
| IMP-026C architecture artifact | present | `docs/platform/capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md` |

Default Docker topology (accepted runtime inventory):

```text
postgres
app
customer-auth
workforce-auth
customer-commerce
```

Accepted IMP-024 transport (D-359):

```text
customer-commerce   (internal :8083; Nginx /api/v1/*)
```

Domain authority chain (accepted):

```text
Cart → Checkout → Payment → Order
```

| Domain | Authority |
|---|---|
| Cart | Mutable shopping intent |
| Checkout Snapshot | Immutable accepted commercial transaction |
| Payment | Original financial collection truth |
| Order | Post-purchase business lifecycle truth (`PLACED` \| `ACCEPTED` \| `FULFILLED` \| `CANCELLED`) |

## 4. Accepted Capability Ledger

| IMP | Capability | Status |
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

## 5. Pending Acceptance

```text
IMP-026C — Pilot Customer-Commerce UX Hardening
Lifecycle: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-026C_ACCEPTED: NO
acceptedThrough: IMP-027
pendingAcceptance: IMP-026C
```

Independent acceptance of IMP-027 **is** claimed and formally reconciled. IMP-026C remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (architecture locked; implementation evidence COMPLETE;
independent review PASS; `IMP-026C_ACCEPTED: NO`) and is now the next pending acceptance gate.
Current product slice is IMP-028
(`IMPLEMENTATION_IN_PROGRESS`; architecture LOCKED; implementation AUTHORIZED / STARTED;
`IMP-028_ARCHITECTURE_LOCKED: YES`; `IMP-028_IMPLEMENTATION_AUTHORIZED: YES`;
`IMP-028_IMPLEMENTATION_STARTED: YES`; working-tree capability artifact records
`IMP-028_IMPLEMENTATION_COMPLETE: YES`; `IMP-028_ACCEPTED: NO`; binding **D-365** / **D-366**).
`pendingAcceptance=IMP-026C` is the remaining formal acceptance gate; it does not mean IMP-028
acceptance is complete. IMP-027 acceptance does not accept IMP-026C or IMP-028. D-366 is CURRENT
for refund statutory-reversal decision authority; refund statutory reversal remains not
implemented.
`PRE_EXISTING_IMP028_COMPLIANCE_DEFECT=YES` remains a separate IMP-028 completion blocker.

## 6. Known Governance Conflicts

Governance installation conflicts identified at STATE-R1 publication are closed by independent
acceptance:

- Competing historical roadmap meanings in `implementation-roadmap.md` (GTM-R1) — marked
  SUPERSEDED by [`ROADMAP.md`](./ROADMAP.md).
- ADR-014 Route-Handler-as-canonical HTTP boundary — superseded for CURRENT transport policy by
  [`decision-register.md`](./decision-register.md) decision **D-356**, with IMP-024 topology
  decided by **D-359**.
- ADR-010 detailed kitchen states vs accepted IMP-023 Order lifecycle — clarified by **D-357**.
- Historical role-count prose (six roles) vs accepted inventory (seven) — clarified by **D-358**;
  current inventory is owned by this STATE document and code.

STATE-R26 records independent acceptance of IMP-027 — Refund Foundation
(`COMPLETE_AND_ACCEPTED`; `IMP-027_ACCEPTED: YES`). Refund acceptance evidence is recorded
(`IMP027_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED`;
`IMP027_REFUND_FOUNDATION: ACCEPTED`;
`IMP027_FORMAL_ACCEPTANCE: ACCEPTED`). Architecture remains `ARCHITECTURE_LOCKED`.
`acceptedThrough` advances to IMP-027. `pendingAcceptance` advances to IMP-026C. IMP-026C remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). IMP-028 remains
`IMPLEMENTATION_IN_PROGRESS` (`IMP-028_ACCEPTED: NO`; working-tree capability artifact may record
`IMP-028_IMPLEMENTATION_COMPLETE: YES`). IMP-029 remains not started. Decision register remains
DR-9. Global architecture remains ARCH-R12. Supersedes STATE-R25 for current accepted position.
STATE-R25 records independent acceptance of IMP-026 — Razorpay Productionization & Payment GTM
Readiness (`COMPLETE_AND_ACCEPTED`; `IMP-026_ACCEPTED: YES`). Provider-originated Razorpay Test
Mode webhook proof over public HTTPS is recorded (`IMP-026_EXTERNAL_WEBHOOK_GATE: SATISFIED`;
`IMP026_EXTERNAL_ACCEPTANCE_EVIDENCE: ACCEPTED`). Architecture remains `ARCHITECTURE_LOCKED`.
`acceptedThrough` advances to IMP-026. `pendingAcceptance` advances to IMP-027. IMP-026C remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). IMP-027 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`). IMP-028 remains
`IMPLEMENTATION_IN_PROGRESS` (`IMP-028_ACCEPTED: NO`; working-tree capability artifact may record
`IMP-028_IMPLEMENTATION_COMPLETE: YES`). Formal acceptance of IMP-027 / IMP-028 is **not**
claimed. IMP-029 remains not started. Decision register remains DR-9. Global architecture remains
ARCH-R12. Supersedes STATE-R24 for current accepted position.
STATE-R24 records IMP-028 foundation implementation started
(`IMPLEMENTATION_IN_PROGRESS`; architecture `ARCHITECTURE_LOCKED`; implementation `AUTHORIZED` /
`STARTED`; `IMP-028_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028_IMPLEMENTATION_STARTED: YES`;
`IMP-028_IMPLEMENTATION_COMPLETE: NO`; `IMP-028_ACCEPTED: NO`; binding **D-365**). Implementation
is started and **not** complete. Production GST/accountant gates remain unresolved.
`acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. IMP-026 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**
claimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-026C remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). IMP-027 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`). Formal acceptance remains
contiguous. IMP-029 remains not started.
DR-8 / ARCH-R11 subsequently register **D-366** (Refund Statutory Reversal Decision Authority)
without changing STATE-R24 lifecycle identity: `IMP-028_IMPLEMENTATION_COMPLETE` remains NO;
`IMP-028_ACCEPTED` remains NO; `REFUND_STATUTORY_REVERSAL_WORKFLOW` remains
`NOT_IMPLEMENTED_UNDER_D366`; `PRE_EXISTING_IMP028_COMPLIANCE_DEFECT=YES`.
STATE-R23 records explicit founder authorization for IMP-028 implementation
(`IMPLEMENTATION_AUTHORIZED`; architecture `ARCHITECTURE_LOCKED`; implementation `AUTHORIZED` /
`NOT_STARTED`; `IMP-028_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028_IMPLEMENTATION_STARTED: NO`;
`IMP-028_IMPLEMENTATION_COMPLETE: NO`; `IMP-028_ACCEPTED: NO`; binding **D-365**). No Financial
Document product code, schema, migration, PDF, customer document UX, or Ops Console work is
introduced by this authorization. Production GST/accountant gates remain unresolved.
`acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. IMP-026 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**
claimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-026C remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). IMP-027 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`). Formal acceptance remains
contiguous. IMP-029 remains not started.
STATE-R22 records IMP-028 architecture lock (`ARCHITECTURE_LOCKED`; implementation
`NOT_AUTHORIZED`; capability artifact present; binding **D-365**). No Financial Document
implementation. `acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. IMP-026
remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**
claimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-026C remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). IMP-027 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`). Formal acceptance remains
contiguous. IMP-029 remains not started.
STATE-R21 records explicit founder authorization for IMP-028 architecture activation
(`ARCHITECTURE_IN_PROGRESS`; architecture `NOT_LOCKED`; implementation `NOT_AUTHORIZED`). No
IMP-028 capability artifact. No invoice / tax-receipt / credit-note implementation.
`acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. IMP-026 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**
claimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-026C remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). IMP-027 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-027_ACCEPTED: NO`). Formal acceptance remains
contiguous. IMP-029 remains not started.
STATE-R20 records IMP-027 implementation complete pending acceptance
(`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; architecture `ARCHITECTURE_LOCKED`; implementation
evidence `COMPLETE`; independent implementation review `PASS`; `IMP-027_ACCEPTED: NO`; binding
**D-364**). `pendingAcceptance` remains IMP-026 because it is the oldest unresolved formal
acceptance gate; that pointer does not mean IMP-026C or IMP-027 implementation remains in
progress. `acceptedThrough` remains IMP-025. IMP-026 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**
claimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-026C remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). Formal acceptance remains
contiguous. IMP-028 remains not started.
STATE-R19 records explicit founder authorization for IMP-027 implementation
(`IMPLEMENTATION_IN_PROGRESS`; architecture `ARCHITECTURE_LOCKED`; implementation `AUTHORIZED`;
binding **D-364**). No Refund product/schema/provider code is added by this authorization.
`acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. IMP-026 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**
claimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-026C remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). Formal acceptance remains
contiguous. IMP-028 remains not started.
STATE-R18 records IMP-027 architecture lock (`ARCHITECTURE_LOCKED`; implementation
`NOT_AUTHORIZED`; capability artifact present; binding **D-364**). No Refund implementation.
`acceptedThrough` remains IMP-025. `pendingAcceptance` remains IMP-026. IMP-026 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**
claimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-026C remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` (`IMP-026C_ACCEPTED: NO`). Formal acceptance remains
contiguous. IMP-028 remains not started.
STATE-R17 records explicit founder authorization for IMP-027 architecture activation
(`ARCHITECTURE_IN_PROGRESS`; architecture `NOT_LOCKED`; implementation `NOT_AUTHORIZED`). No
IMP-027 capability artifact in that revision. No Refund implementation. `acceptedThrough` remains
IMP-025. `pendingAcceptance` remains IMP-026.
STATE-R16 records IMP-026C implementation complete pending acceptance
(`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; architecture `ARCHITECTURE_LOCKED`; implementation
evidence `COMPLETE`; independent implementation review `PASS`; `IMP-026C_ACCEPTED: NO`).
`pendingAcceptance` remains IMP-026 because it is the oldest unresolved formal acceptance gate;
that pointer does not mean IMP-026C implementation remains in progress. `acceptedThrough` remains
IMP-025. IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of
IMP-026 is **not** claimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-027
remains not started. Formal acceptance remains contiguous.
STATE-R15 records explicit founder authorization for IMP-026C implementation
(`IMPLEMENTATION_IN_PROGRESS`; architecture `ARCHITECTURE_LOCKED`; implementation `AUTHORIZED`).
No implementation-complete or acceptance claim. `acceptedThrough` remains IMP-025.
`pendingAcceptance` remains IMP-026. IMP-026 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**
claimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-027 remains not started.
STATE-R14 records IMP-026C architecture lock (`ARCHITECTURE_LOCKED`) with implementation
`NOT_STARTED` / `NOT_AUTHORIZED`. No accepted capability advancement. `acceptedThrough` remains
IMP-025. `pendingAcceptance` remains IMP-026. IMP-026 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**
claimed; the external webhook debt remains `DEFERRED_NOT_SATISFIED`. IMP-027 remains not started.
`governanceHealth = ALIGNED` remains aligned only through accepted IMP-025.
STATE-R13 records the GTM-R15 founder deferral of the remaining IMP-026 public HTTPS
provider-originated webhook acceptance gate. IMP-026 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not**
claimed; `acceptedThrough` remains IMP-025; `pendingAcceptance` remains IMP-026; the external
debt is `DEFERRED_NOT_SATISFIED`. `currentProductSlice` becomes IMP-026C
(`ARCHITECTURE_IN_PROGRESS`; architecture not locked; implementation not authorized). IMP-027
remains not started. Deferral does not authorize production Razorpay launch, public GTM, or Live
Mode.
STATE-R12 records the independently gathered manual real Razorpay Test payment verification
(provider `captured`; BOBA Payment `SUCCEEDED`; exactly one BOBA Order; reconciliation and
automatic capture passed; no architecture drift). Local Razorpay GTM validation is
`PASS_WITH_PROVIDER_WEBHOOK_PENDING`. Provider-originated public HTTPS webhook remains unverified
(`NOT_VALIDATED_LOCALHOST_LIMITATION`). Lifecycle is unchanged: `acceptedThrough` remains IMP-025;
`currentProductSlice` / `pendingAcceptance` remain IMP-026; IMP-026 remains
`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; independent acceptance of IMP-026 is **not** claimed;
IMP-027 remains not started.
STATE-R11 records IMP-026 coding-agent deterministic completion
(`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`) with `pendingAcceptance = IMP-026` and
`acceptedThrough` remaining IMP-025. Independent acceptance of IMP-026 is **not** claimed. Real
Razorpay Test Mode was then still recorded as `BLOCKED_EXTERNAL_PREREQUISITES`.
STATE-R10 recorded IMP-026 coding-agent implementation start (`IMPLEMENTATION_IN_PROGRESS`) without
independent acceptance.
STATE-R9 recorded **D-363** (Razorpay durable webhook inbox / asynchronous Payment processing) as an
amendment of D-362 acknowledgement timing only. D-362 remains CURRENT for Order materialization
outside the provider-ack path, missing-Order recovery, secondary reconciliation, and no new
deployable service. D-361 remains CURRENT for provider selection.
STATE-R8 records **D-362** (Razorpay webhook acknowledgement / post-payment Order recovery) as an
amendment of D-361 ack/post-payment effect only, without changing IMP-026 lifecycle or
`acceptedThrough`. D-361 remains CURRENT for provider selection.
STATE-R7 records IMP-026 architecture lock (`ARCHITECTURE_LOCKED`) with implementation
`NOT_STARTED`, and the approved V1 provider substitution to Razorpay (**D-361**) without starting
IMP-026 implementation or advancing `acceptedThrough`.
STATE-R6 records independent acceptance of IMP-025 (`COMPLETE_AND_ACCEPTED`).
STATE-R5 recorded IMP-025 coding-agent implementation complete
(`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`) without independent acceptance.
STATE-R4 recorded IMP-025 architecture lock (`ARCHITECTURE_LOCKED`) without starting IMP-025
implementation. STATE-R3 recorded independent acceptance of IMP-024 (`COMPLETE_AND_ACCEPTED`)
without activating IMP-025.

`governanceHealth = ALIGNED`. These items remain historical/supersession records, not open
governance conflicts.

## 7. Acceptance Provenance

Accepted product through IMP-026 is the independently accepted implementation baseline encoded by
this reconciliation. Detailed per-slice evidence remains in repository tests, audits, Docker
runtime proof, and historical implementation artifacts. This STATE snapshot records independent
acceptance of IMP-026 (`COMPLETE_AND_ACCEPTED`) including external Razorpay webhook proof.

Independent IMP-026 acceptance (COMPLETE_AND_ACCEPTED) on 2026-08-18. Pre-acceptance
governance fingerprint:

```text
3234612aaefaf49bad0ee49b68419a91bfff36d1c25c7fec898287c8bf851fe1
```

Post-acceptance fingerprint is regenerated by `npm run governance:fingerprint` after this STATE
update and supersedes the pre-acceptance value for ongoing governance identity.

## 8. Explicitly Not Yet Accepted

Supporting primitives do not equal capability completion. Not yet accepted as product capabilities:

- Pilot Customer-Commerce UX Hardening (IMP-026C)
- Refund
- Invoice / Tax Receipt / Credit Note
- Operations Console API
- Operations Console UI
- Delivery
- Notifications
- WhatsApp
- Initial Administration
- Observability GTM completion
- Backup / Restore GTM completion
- Security / Privacy final hardening
- Production Infrastructure
- Launch Validation

## 9. Authority Boundaries

| Question | Authority |
|---|---|
| What is independently accepted now | **This document (`STATE.md`)** |
| What comes next / IMP meanings | [`ROADMAP.md`](./ROADMAP.md) |
| Why / Non-Goals | [`VISION.md`](./VISION.md) |
| Durable architecture | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Binding decision status | [`decision-register.md`](./decision-register.md) |
| IMP-024 locked capability architecture | [`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md) |
| IMP-025 locked capability architecture | [`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md) |
| IMP-026 locked capability architecture | [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) |
| IMP-026C locked capability architecture | [`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md) |
| IMP-027 locked capability architecture | [`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md) |

Agents may propose a STATE delta in their report. Only independent acceptance updates this file's
accepted position and may promote `governanceHealth` to `ALIGNED`.
