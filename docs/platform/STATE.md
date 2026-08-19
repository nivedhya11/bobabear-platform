<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "ACCEPTED_STATE",
  "stateVersion": "STATE-R44",
  "acceptedThrough": "IMP-028B",
  "currentProductSlice": "IMP-028C",
  "nextProductSlice": "IMP-029",
  "pendingAcceptance": "NONE",
  "governanceHealth": "ALIGNED",
  "lastReviewed": "2026-08-19"
}
-->

# BOBA Bear — Accepted State

Coding-agent completion does **not** equal acceptance. This document is the independently accepted
current-reality authority.

## 1. Accepted Position

```text
Accepted Through:          IMP-028B — Customer Menu Projection + Discovery
Accepted Inserted Slice:   IMP-005A — Dockerized local application runtime; IMP-026C — Pilot Customer-Commerce UX Hardening; IMP-028A — Food Direct UX Foundation; IMP-028B — Customer Menu Projection + Discovery
Accepted Range:            IMP-001 → IMP-028B (including IMP-005A and IMP-026C)
```

## 2. Current Work Position

```text
Current Product Implementation: IMP-028C — Food Customization (ARCHITECTURE_LOCKED; AUTHORIZED / STARTED)
Pending Acceptance:             NONE
Next Product Slice:             IMP-029 — Operations Console API
Current Governance Activity:    IMP-028C Food Customization IMPLEMENTATION_IN_PROGRESS; architecture ARCHITECTURE_LOCKED; implementation AUTHORIZED / STARTED; IMP-028B COMPLETE_AND_ACCEPTED; D-368 CURRENT (Customer Menu Read Projection); D-369 CURRENT and mandatory for IMP-028C paid-modifier intent; D-370 CURRENT and out of scope; IMP-029 PLANNED / NOT_STARTED / NOT_AUTHORIZED; D-371 UNUSED
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
IMP-026C:                 COMPLETE_AND_ACCEPTED
IMP-026C architecture:    ARCHITECTURE_LOCKED
IMP-026C implementation:  AUTHORIZED / COMPLETE
IMP-026C_IMPLEMENTATION_AUTHORIZED: YES
IMP_026C_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP_026C_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS
IMP026C_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP026C_FORMAL_ACCEPTANCE: ACCEPTED
IMP-026C_ACCEPTED:        YES
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
IMP-028:                  COMPLETE_AND_ACCEPTED
IMP-028 architecture:     ARCHITECTURE_LOCKED
IMP-028 implementation:   AUTHORIZED / COMPLETE
IMP-028_ARCHITECTURE:     LOCKED
IMP-028_IMPLEMENTATION:   AUTHORIZED / COMPLETE
IMP-028_ARCHITECTURE_LOCKED: YES
IMP-028_IMPLEMENTATION_AUTHORIZED: YES
IMP-028_IMPLEMENTATION_STARTED: YES
IMP-028_IMPLEMENTATION_COMPLETE: YES
IMP-028_ACCEPTED:         YES
IMP-028A:                  COMPLETE_AND_ACCEPTED
IMP-028A_ARCHITECTURE_LOCKED: YES
IMP-028A_IMPLEMENTATION_AUTHORIZED: YES
IMP-028A_IMPLEMENTATION_STARTED: YES
IMP-028A_IMPLEMENTATION_COMPLETE: YES
IMP-028A_ACCEPTED:        YES
IMP028A_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP028A_FORMAL_ACCEPTANCE: ACCEPTED
IMP-028B:                  COMPLETE_AND_ACCEPTED
IMP-028B_ARCHITECTURE_LOCKED: YES
IMP-028B_IMPLEMENTATION_AUTHORIZED: YES
IMP-028B_IMPLEMENTATION_STARTED: YES
IMP-028B_IMPLEMENTATION_COMPLETE: YES
IMP-028B_ACCEPTED:        YES
IMP-028C:                 ARCHITECTURE_LOCKED
IMP-028C_ARCHITECTURE_LOCKED: YES
IMP-028C_IMPLEMENTATION_AUTHORIZED: YES
IMP-028C_IMPLEMENTATION_STARTED: YES
IMP-028C_IMPLEMENTATION_COMPLETE: NO
IMP-028C_ACCEPTED:        NO
IMP-029:                  NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED: NO
IMP-029_STARTED:          NO
```

Capability architecture:

[`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md)

[`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md)

[`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md)

[`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md)

[`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md)

[`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md)

[`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md)

[`capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](./capabilities/IMP-028B-customer-menu-projection-and-discovery.md)

[`capabilities/IMP-028C-food-customization.md`](./capabilities/IMP-028C-food-customization.md)

`acceptedThrough` is IMP-028B. IMP-025 architecture remains locked; IMP-025 implementation is
**COMPLETE_AND_ACCEPTED**. IMP-026 architecture is **ARCHITECTURE_LOCKED**. IMP-026 implementation
is **COMPLETE_AND_ACCEPTED** (`IMP-026_ACCEPTED: YES`). Independent acceptance of IMP-026 is
recorded, including provider-originated Razorpay Test Mode webhook proof over public HTTPS.
IMP-026C architecture is **ARCHITECTURE_LOCKED**. IMP-026C implementation is **authorized**,
**implementation-complete**, and **COMPLETE_AND_ACCEPTED**. Independent implementation review is
**PASS**. Implementation evidence is **COMPLETE**. Independent acceptance evidence is **ACCEPTED**.
Formal acceptance of IMP-026C **is** claimed (`IMP-026C_ACCEPTED: YES`). `acceptedThrough` remains
contiguous through IMP-028A; IMP-026C remains a supplemental inserted gate and does not itself move
`acceptedThrough`. `pendingAcceptance=NONE` after GTM-R37 / STATE-R35 record independent acceptance
of IMP-028A. Formal acceptance of IMP-028A **is** claimed (`IMP-028A_ACCEPTED: YES`).
IMP-027 is `COMPLETE_AND_ACCEPTED` (architecture **LOCKED**; implementation evidence **COMPLETE**;
independent implementation review **PASS**; `IMP-027_ACCEPTED: YES`; binding **D-364**).
Refund architecture remains locked and accepted. GTM-R30 / STATE-R28 record IMP-028
`COMPLETE_AND_ACCEPTED` (architecture **LOCKED**; implementation **AUTHORIZED** / **COMPLETE**;
binding **D-365** / **D-366** / **D-367**; capability artifact present). Formal acceptance of
IMP-028 **is** claimed (`IMP-028_ACCEPTED: YES`; `IMP-028_IMPLEMENTATION_COMPLETE: YES`).
GTM-R30 / STATE-R28 recorded `pendingAcceptance=NONE` immediately after that acceptance.
IMP-029 remains not started and is **not** implementation-authorized
(`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`). GTM-R37 / STATE-R35 record
IMP-028A `COMPLETE_AND_ACCEPTED` (`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`;
`IMP-028A_IMPLEMENTATION_STARTED: YES`; `IMP-028A_IMPLEMENTATION_COMPLETE: YES`;
`IMP-028A_ACCEPTED: YES`; architecture `ARCHITECTURE_LOCKED`). `currentProductSlice` is `NONE`.
`nextProductSlice=IMP-029` remains next-planned GTM bookkeeping only. IMP-028A does **not**
retarget IMP-029, implement D-368 / D-369 / D-370, or create `D-371`. Formal acceptance of
IMP-028A does **not** authorize or start IMP-029. GTM-R38 / STATE-R36 historically record IMP-028B canonical
activation (`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`; architecture `NOT_LOCKED`;
`IMP-028B_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-028B_IMPLEMENTATION_STARTED: NO`;
`IMP-028B_IMPLEMENTATION_COMPLETE: NO`; `IMP-028B_ACCEPTED: NO`). GTM-R39 / STATE-R37 historically record
IMP-028B architecture lock and implementation authorization (`IMPLEMENTATION_AUTHORIZED` /
`NOT_STARTED`; architecture `ARCHITECTURE_LOCKED`; `IMP-028B_IMPLEMENTATION_AUTHORIZED: YES`;
`IMP-028B_IMPLEMENTATION_STARTED: NO`; `IMP-028B_IMPLEMENTATION_COMPLETE: NO`;
`IMP-028B_ACCEPTED: NO`). GTM-R40 / STATE-R38 and GTM-R41 / STATE-R39 record the subsequent
historical implementation progression. STATE-R40 records IMP-028B `COMPLETE_AND_ACCEPTED`.
`currentProductSlice` is now NONE; `pendingAcceptance` is NONE; `acceptedThrough` is IMP-028B.
Acceptance of IMP-028B did not implement D-369 / D-370, create `D-371`, or start IMP-029.

GTM-R31 / STATE-R29 historically record binding **D-368** (Customer Menu Read Projection Authority;
DR-10; ARCH-R13 / ARCH-G19). IMP-028B subsequently implemented and accepted the server-backed READ
PROJECTION; the IMP-025 static `ordering-catalog.json` is no longer the storefront runtime delivery.
D-368 itself did not authorize Menu implementation, create a Menu endpoint, or activate IMP-029.
GTM-R32 / STATE-R30
record binding **D-369** (Customer Paid Modifier Explicit Selection Authority; DR-11; ARCH-R14 /
ARCH-G20). A positive-price modifier must not become customer purchase intent solely because it is
a catalog/default selection. D-369 does not authorize customization implementation, populate
modifier data, or activate IMP-029. GTM-R33 / STATE-R31 record binding **D-370** (Cart Identity
Transition Authority; DR-12; ARCH-R15 / ARCH-G21). Guest and customer purchase intent must be
reconciled without silent winner selection; sign-out isolates the browser from the customer Cart
without deleting it. D-370 does not authorize Cart-merge implementation, change authentication, or
activate IMP-029. Next free decision is **D-371**. GTM-R37 / STATE-R35 record IMP-028A
independent acceptance without changing decision register or global architecture. GTM-R38 /
STATE-R36 record IMP-028B canonical activation without changing decision register or global
architecture. GTM-R39 / STATE-R37 record IMP-028B architecture lock and implementation
authorization without changing decision register or global architecture.

Accepted Technical Inventory below is bounded by `acceptedThrough=IMP-028B` and includes accepted
IMP-027 / IMP-028 schema through latest migration `0029_refund_statutory_issuance_allocation`.
IMP-028A added no schema or migration.

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
workflow accepted under the locked IMP-028 capability). Statutory financial-document signing and
signed-artifact authority is **D-367** (CURRENT; attended-async manual signed-PDF MVP accepted;
unattended DSC/eSign/HSM remains deferred and is not authorized by this acceptance). Customer Menu
read-projection serving is **D-368** (CURRENT architecture; implemented and accepted under IMP-028B;
the static `ordering-catalog.json` artifact is no longer the customer storefront runtime source).
Customer paid-modifier
explicit selection is **D-369** (CURRENT business-commerce policy; implementation not authorized;
Cart/Checkout Snapshot/pricing authority unchanged). Cart identity transition is **D-370**
(CURRENT purchase-intent and privacy policy; implementation not authorized; Cart/Checkout Snapshot
authority unchanged).

```text
PAYMENT_RECEIPT_VOUCHER_WORKFLOW: COMPLETE
ORDER_TAX_INVOICE_WORKFLOW: COMPLETE
REFUND_STATUTORY_REVERSAL_WORKFLOW: ACCEPTED
FD_NON_SIGNATURE_COMPLIANCE_CORRECTION: COMPLETE
SIGNATURE_COMPLIANCE: ATTENDED_ASYNC_MVP_ACCEPTED
PRE_EXISTING_IMP028_COMPLIANCE_DEFECT: NO
IMP-028_ACCEPTED: YES
```

`PRE_EXISTING_IMP028_COMPLIANCE_DEFECT` is closed as an IMP-028 completion/acceptance blocker.
Unattended signing and production GST/accountant configuration remain deferred deployment /
later-slice matters, not reopenings of D-365 / D-366 / D-367.

Binding payment semantics preserved for IMP-027: a Payment that reached BOBA success from provider
`captured` remains successful original collection truth even if the provider later reports a
refund. Refund must not rewrite that truth. Refund is now formally accepted under the locked
capability artifact; it must not rewrite Payment collection truth. IMP-028 Financial Document
acceptance does not rewrite Payment, Refund, or Order authorities.

`governanceHealth = ALIGNED` records independent acceptance through IMP-028A.
Implementation agents must not self-promote this field or mark later slices accepted.

## 3. Accepted Technical Inventory

Independently verified from repository evidence on 2026-08-18 (authority path
`/home/ajoshi/repos/boba-bear-website-acceptance`), including IMP-026, IMP-027, IMP-028, and
IMP-028A independent acceptance.
Speculative values are forbidden here.

| Metric | Verified value | How verified |
|---|---|---|
| Latest migration | `0029_refund_statutory_issuance_allocation` | `drizzle/meta/_journal.json` entry tag; `drizzle/0029_refund_statutory_issuance_allocation.sql` present |
| Migration count | `30` | Count of accepted migrations through IMP-028 (0000–0029) |
| Application tables | `108` | Count of `appSchema.table(` declarations under `src/platform/database/schema/` bounded to accepted IMP-028 schema |
| Workforce permissions | `57` | `PERMISSION_KEYS.length` in `src/shared/access-control/catalog.ts` |
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
| IMP-025 static ordering catalog | present | `src/data/ordering-catalog.json` deterministic projection from existing-menu-v1; retained for legitimate transitional/import/test purposes, not the customer storefront runtime source |
| IMP-026 architecture artifact | present | `docs/platform/capabilities/IMP-026-razorpay-productionization.md` |
| IMP-026 payment inbox migration | `0018_payment_provider_event_inbox` | `drizzle/0018_payment_provider_event_inbox.sql` present in accepted journal |
| IMP-026C architecture artifact | present | `docs/platform/capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md` |
| IMP-027 architecture artifact | present | `docs/platform/capabilities/IMP-027-refund-foundation.md` |
| IMP-027 refund migration | `0019_refund` | `drizzle/0019_refund.sql` present in accepted journal |
| IMP-028 architecture artifact | present | `docs/platform/capabilities/IMP-028-invoice-tax-receipt-credit-note.md` |
| IMP-028 financial-document / statutory migrations | `0020`–`0029` | Journal tags `0020_financial_document` through `0029_refund_statutory_issuance_allocation` |
| IMP-028A architecture artifact | present | `docs/platform/capabilities/IMP-028A-food-direct-ux-foundation.md` |
| IMP-028B canonical capability artifact | present | `docs/platform/capabilities/IMP-028B-customer-menu-projection-and-discovery.md` |

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
(+ Refund; + Financial Document / RefundStatutoryDecision / SignatureArtifact)
```

| Domain | Authority |
|---|---|
| Cart | Mutable shopping intent |
| Checkout Snapshot | Immutable accepted commercial transaction |
| Payment | Original financial collection truth |
| Order | Post-purchase business lifecycle truth (`PLACED` \| `ACCEPTED` \| `FULFILLED` \| `CANCELLED`) |
| Refund | Financial reversal truth for returned funds (D-364) |
| Financial Document | Immutable issued statutory / financial-document truth (D-365) |
| RefundStatutoryDecision | Durable statutory-reversal classification for a PROCESSED Refund (D-366) |
| SignatureArtifact | Durable signature state and exact-byte signed statutory artifact (D-367) |
| Customer Menu Projection | CURRENT storefront READ MODEL (D-368); implemented and accepted under IMP-028B; not a new commercial authority |
| Customer paid-modifier purchase intent | CURRENT policy (D-369); positive-price modifier requires explicit current-interaction selection; implementation authorized only for IMP-028C; live import `modifier_groups: 0` |
| Cart identity transition | CURRENT policy (D-370); guest→customer compatible merge and logout customer-cart isolation; implementation not authorized |

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
| IMP-026C | Pilot Customer-Commerce UX Hardening | COMPLETE_AND_ACCEPTED |
| IMP-027 | Refund Foundation | COMPLETE_AND_ACCEPTED |
| IMP-028 | Invoice / Tax Receipt / Credit Note | COMPLETE_AND_ACCEPTED |
| IMP-028A | Food Direct UX Foundation | COMPLETE_AND_ACCEPTED |
| IMP-028B | Customer Menu Projection + Discovery | COMPLETE_AND_ACCEPTED |

## 5. Pending Acceptance

```text
NONE
acceptedThrough: IMP-028B
pendingAcceptance: NONE
currentProductSlice: IMP-028C — Food Customization
nextProductSlice: IMP-029 — Operations Console API
IMP-028: COMPLETE_AND_ACCEPTED
IMP-028_ACCEPTED: YES
IMP-028A: COMPLETE_AND_ACCEPTED
IMP-028A_ARCHITECTURE_LOCKED: YES
IMP-028A_IMPLEMENTATION_AUTHORIZED: YES
IMP-028A_IMPLEMENTATION_STARTED: YES
IMP-028A_IMPLEMENTATION_COMPLETE: YES
IMP-028A_ACCEPTED: YES
IMP028A_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED
IMP028A_FORMAL_ACCEPTANCE: ACCEPTED
IMP-028B: COMPLETE_AND_ACCEPTED
IMP-028B_ARCHITECTURE_LOCKED: YES
IMP-028B_IMPLEMENTATION_AUTHORIZED: YES
IMP-028B_IMPLEMENTATION_STARTED: YES
IMP-028B_IMPLEMENTATION_COMPLETE: YES
IMP-028B_ACCEPTED: YES
IMP-028C: ARCHITECTURE_LOCKED
IMP-028C_ARCHITECTURE_LOCKED: YES
IMP-028C_IMPLEMENTATION_AUTHORIZED: YES
IMP-028C_IMPLEMENTATION_STARTED: YES
IMP-028C_IMPLEMENTATION_COMPLETE: NO
IMP-028C_ACCEPTED: NO
IMP-029: PLANNED / NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED: NO
IMP-029_STARTED: NO
TYPECHECK_STATUS: FAIL_PRE_EXISTING_UNRELATED
CUSTOMER_ORDERING_E2E: BLOCKED_ENVIRONMENT
CUSTOMER_ORDERING_ALTERNATIVE_REGRESSION_EVIDENCE_SUFFICIENT: YES
RELEVANT_REGRESSION_TESTS: PASS_WITH_ENVIRONMENT_LIMITATION
```

Independent acceptance of IMP-028A **is** claimed and formally reconciled
(`COMPLETE_AND_ACCEPTED`; architecture locked; implementation AUTHORIZED / STARTED / COMPLETE;
`IMP-028A_ARCHITECTURE_LOCKED: YES`; `IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`;
`IMP-028A_IMPLEMENTATION_STARTED: YES`; `IMP-028A_IMPLEMENTATION_COMPLETE: YES`;
`IMP-028A_ACCEPTED: YES`). `acceptedThrough` advances to IMP-028A. After IMP-028A acceptance,
`pendingAcceptance=NONE`. GTM-R38 / STATE-R36 later set `currentProductSlice=IMP-028B` without
placing IMP-028B in pending acceptance. GTM-R39 / STATE-R37 lock IMP-028B architecture and
authorize implementation without starting it or placing it in pending acceptance. `nextProductSlice=IMP-029` remains
next-planned GTM bookkeeping only. IMP-029 remains not started and is **not**
implementation-authorized. Formal acceptance of IMP-028A does not authorize IMP-029, implement
D-368 / D-369 / D-370, create `D-371`, or implement Capability B. Canonical activation of
IMP-028B does not start IMP-029. Architecture lock / implementation authorization of IMP-028B
does not start product implementation.

Independent IMP-028A acceptance preserved these non-blocking limitations (not IMP-028A defects;
not rewritten as full-suite success): whole-repo TypeScript / Next typecheck remains blocked by
pre-existing financial-document/refund BigInt + ES2017 issues; full customer-ordering E2E was
blocked by occupied fixed port 8183; alternative regression evidence was independently judged
sufficient.

STATE-R37 records IMP-028B architecture lock and implementation authorization
(`IMPLEMENTATION_AUTHORIZED` / `NOT_STARTED`; architecture `ARCHITECTURE_LOCKED`;
`IMP-028B_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028B_IMPLEMENTATION_STARTED: NO`;
`IMP-028B_IMPLEMENTATION_COMPLETE: NO`; `IMP-028B_ACCEPTED: NO`; `currentProductSlice = IMP-028B`).
`acceptedThrough` remains IMP-028A. `pendingAcceptance` remains NONE. `nextProductSlice` remains
IMP-029. IMP-029 remains not started and is not implementation-authorized. Decision register
remains DR-12. Global architecture remains ARCH-R15. Next free decision remains **D-371**.
Authorization does not start product implementation, implement D-369 / D-370, create `D-371`, or
retarget IMP-029. Supersedes STATE-R36 for current IMP-028B lifecycle position. Product acceptance
through IMP-028A is unchanged.

STATE-R36 records canonical activation of IMP-028B — Customer Menu Projection + Discovery
(`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`; architecture `NOT_LOCKED`;
`IMP-028B_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-028B_IMPLEMENTATION_STARTED: NO`;
`IMP-028B_IMPLEMENTATION_COMPLETE: NO`; `IMP-028B_ACCEPTED: NO`; `currentProductSlice = IMP-028B`).
`acceptedThrough` remains IMP-028A. `pendingAcceptance` remains NONE. `nextProductSlice` remains
IMP-029. IMP-029 remains not started and is not implementation-authorized. Decision register
remains DR-12. Global architecture remains ARCH-R15. Next free decision remains **D-371**.

STATE-R35 records independent acceptance of IMP-028A (`COMPLETE_AND_ACCEPTED`;
`IMP-028A_ACCEPTED: YES`; `acceptedThrough = IMP-028A`; `pendingAcceptance = NONE`;
`currentProductSlice = NONE`). `nextProductSlice` remains IMP-029. IMP-029 remains not started
and is not implementation-authorized. Decision register remains DR-12. Global architecture remains
ARCH-R15. Next free decision remains **D-371**.

STATE-R34 records IMP-028A implementation complete pending independent acceptance
(`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; architecture `ARCHITECTURE_LOCKED`;
`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028A_IMPLEMENTATION_STARTED: YES`;
`IMP-028A_IMPLEMENTATION_COMPLETE: YES`; `currentProductSlice = IMP-028A`;
`pendingAcceptance = IMP-028A`). `acceptedThrough` remained IMP-028. `nextProductSlice` remains
IMP-029. IMP-029 remains not started and is not implementation-authorized. Decision register
remains DR-12. Global architecture remains ARCH-R15. Next free decision remains **D-371**.
Product acceptance through IMP-028 was unchanged. Formal acceptance of IMP-028A was **not** then
claimed.

STATE-R33 records IMP-028A architecture lock and implementation authorization
(`IMPLEMENTATION_AUTHORIZED` / `NOT_STARTED`; architecture `ARCHITECTURE_LOCKED`;
`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028A_IMPLEMENTATION_STARTED: NO`).
`acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE. `currentProductSlice` is
IMP-028A. `nextProductSlice` remains IMP-029. Decision register remains DR-12. Global architecture
remains ARCH-R15. Next free decision remains **D-371**. Product acceptance through IMP-028 is
unchanged.

STATE-R32 records canonical activation of IMP-028A — Food Direct UX Foundation (`PLANNED` /
`NOT_STARTED` / `NOT_AUTHORIZED`; architecture `NOT_LOCKED`). `acceptedThrough` remains IMP-028.
`pendingAcceptance` remains NONE. `currentProductSlice` is IMP-028A. `nextProductSlice` remains
IMP-029. Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision
remains **D-371**. Product acceptance through IMP-028 is unchanged.

STATE-R31 records binding **D-370** (Cart Identity Transition Authority). Decision register is
DR-12. Global architecture is ARCH-R15. Next free decision is **D-371**. Product-slice position is
unchanged.

STATE-R30 records binding **D-369** (Customer Paid Modifier Explicit Selection Authority). Decision
register is DR-11. Global architecture is ARCH-R14. Next free decision is **D-370**. Product-slice
position is unchanged.

STATE-R29 records binding **D-368** (Customer Menu Read Projection Authority). Decision register
is DR-10. Global architecture is ARCH-R13. Next free decision is **D-369**. Product-slice position
is unchanged.

## 6. Known Governance Conflicts

STATE-R41 reconciles stale present-tense IMP-028B lifecycle assertions with the already-settled
STATE-R40 acceptance record. It makes no new acceptance, architecture, product, or decision-register
decision. IMP-028B remains `COMPLETE_AND_ACCEPTED` (`IMP-028B_ACCEPTED: YES`; `acceptedThrough =
IMP-028B`; `pendingAcceptance = NONE`; `currentProductSlice = NONE`); IMP-029 remains planned, not
started, and not implementation-authorized. D-368 / D-369 / D-370 remain CURRENT and D-371 remains
unused.

STATE-R40 records IMP-028B — Customer Menu Projection + Discovery `COMPLETE_AND_ACCEPTED` after
the already-passing independent technical acceptance and founder UAT PASS for the exact candidate:
`/home/ajoshi/repos/boba-bear-platform`; `main`; HEAD
`ddca0c319a5e80b2cfe38a2c32481b636277010e`; working-tree fingerprint
`1b6be793b4825bb8bd8df57dd47164148b0e68df9a674b12f417e97b5497ecc7`.
Architecture remains `ARCHITECTURE_LOCKED`; implementation remains `AUTHORIZED` / `STARTED` /
`COMPLETE`; `IMP-028B_ACCEPTED: YES`. `acceptedThrough` advances to IMP-028B;
`pendingAcceptance=NONE`; `currentProductSlice=NONE`; `nextProductSlice=IMP-029`. IMP-029 remains
planned, not started, and not implementation-authorized. D-369 / D-370 remain unimplemented;
D-371 remains unused. Decision register remains DR-12 and global architecture remains ARCH-R15.
Supersedes STATE-R39 for the current lifecycle position.

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

STATE-R37 records IMP-028B architecture lock and implementation authorization
(`IMPLEMENTATION_AUTHORIZED` / `NOT_STARTED`; architecture `ARCHITECTURE_LOCKED`;
`currentProductSlice = IMP-028B`). `acceptedThrough` remains IMP-028A. `pendingAcceptance` is NONE.
`nextProductSlice` is IMP-029. IMP-029 remains not started and is not implementation-authorized.
Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains
**D-371**. Authorization does not start product implementation, implement D-369 / D-370, create
`D-371`, or retarget IMP-029. Supersedes STATE-R36 for current IMP-028B lifecycle position. Product
acceptance through IMP-028A is unchanged.
STATE-R36 records canonical activation of **IMP-028B — Customer Menu Projection + Discovery**
(`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`; architecture `NOT_LOCKED`;
`currentProductSlice = IMP-028B`). `acceptedThrough` remains IMP-028A. `pendingAcceptance` is NONE.
`nextProductSlice` is IMP-029. IMP-029 remains not started and is not implementation-authorized.
Decision register remains DR-12. Global architecture remains ARCH-R15. Next free decision remains
**D-371**. Canonical activation does not lock architecture, authorize implementation, implement
D-368 / D-369 / D-370, create `D-371`, or retarget IMP-029. Supersedes STATE-R35 for current
product-slice position. Product acceptance through IMP-028A is unchanged.
STATE-R35 records independent acceptance of IMP-028A — Food Direct UX Foundation
(`COMPLETE_AND_ACCEPTED`; `IMP-028A_ACCEPTED: YES`). Architecture remains `ARCHITECTURE_LOCKED`.
`acceptedThrough` advances to IMP-028A. `pendingAcceptance` is NONE. `currentProductSlice` is
NONE. `nextProductSlice` is IMP-029. IMP-029 remains not started and is not
implementation-authorized. Decision register remains DR-12. Global architecture remains ARCH-R15.
Next free decision remains **D-371**. Known typecheck and customer-ordering E2E limitations remain
pre-existing / environment, not IMP-028A defects. Supersedes STATE-R34 for current accepted
position.
STATE-R34 records IMP-028A — Food Direct UX Foundation implementation complete pending independent
acceptance (`IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`; architecture `ARCHITECTURE_LOCKED`;
`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028A_IMPLEMENTATION_STARTED: YES`;
`IMP-028A_IMPLEMENTATION_COMPLETE: YES`; `currentProductSlice = IMP-028A`;
`pendingAcceptance = IMP-028A`). Formal acceptance of IMP-028A was **not** then claimed.
`acceptedThrough` remained IMP-028. `nextProductSlice` remains IMP-029. IMP-029 remains not started
and is not implementation-authorized. Decision register remains DR-12. Global architecture remains
ARCH-R15. Next free decision remains **D-371**. Supersedes STATE-R33 for then-current IMP-028A
lifecycle position. Product acceptance through IMP-028 is unchanged.
STATE-R33 records IMP-028A — Food Direct UX Foundation architecture lock and implementation
authorization (`IMPLEMENTATION_AUTHORIZED` / `NOT_STARTED`; architecture `ARCHITECTURE_LOCKED`;
`IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028A_IMPLEMENTATION_STARTED: NO`;
`currentProductSlice = IMP-028A`). `acceptedThrough` remains IMP-028. `pendingAcceptance` remains
NONE. `nextProductSlice` remains IMP-029. IMP-029 remains not started and is not
implementation-authorized. Decision register remains DR-12. Global architecture remains ARCH-R15.
Next free decision remains **D-371**. Supersedes STATE-R32 for then-current IMP-028A lifecycle
position. Product acceptance through IMP-028 is unchanged.
STATE-R32 records canonical activation of **IMP-028A — Food Direct UX Foundation** (`PLANNED` /
`NOT_STARTED` / `NOT_AUTHORIZED`; architecture `NOT_LOCKED`; `currentProductSlice = IMP-028A`).
`acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE. `nextProductSlice` remains
IMP-029. IMP-029 remains not started and is not implementation-authorized. Decision register
remains DR-12. Global architecture remains ARCH-R15. Next free decision remains **D-371**.
Supersedes STATE-R31 for current product-slice position. Product acceptance through IMP-028 is
unchanged.
STATE-R31 records binding **D-370** — Cart Identity Transition Authority (`CURRENT`; guest→customer
compatible purchase-intent merge required; silent whole-cart winner forbidden; logout isolates the
browser from the customer Cart without deleting it; implementation NOT_AUTHORIZED). Cart remains
purchase intent. Checkout Snapshot remains authoritative payable truth. `acceptedThrough` remains
IMP-028. `pendingAcceptance` remains NONE. `currentProductSlice` remains NONE. `nextProductSlice`
remains IMP-029. IMP-029 remains not started and is not implementation-authorized. Decision register
is DR-12. Global architecture is ARCH-R15 (ARCH-G21). Next free decision is **D-371**. Supersedes
STATE-R30 for current governance/architecture position. Product acceptance through IMP-028 is
unchanged.
STATE-R30 records binding **D-369** — Customer Paid Modifier Explicit Selection Authority
(`CURRENT`; positive-price modifier requires explicit current-interaction selection before entering
Cart purchase intent; implementation NOT_AUTHORIZED). Zero-price standard defaults MAY be visibly
preselected. Cart remains purchase intent. Checkout Snapshot remains authoritative payable truth.
Live import currently has `modifier_groups: 0`. `acceptedThrough` remains IMP-028.
`pendingAcceptance` remains NONE. `currentProductSlice` remains NONE. `nextProductSlice` remains
IMP-029. IMP-029 remains not started and is not implementation-authorized. Decision register is
DR-11. Global architecture is ARCH-R14 (ARCH-G20). Next free decision is **D-370**. Supersedes
STATE-R29 for current governance/architecture position. Product acceptance through IMP-028 is
unchanged.
STATE-R29 records binding **D-368** — Customer Menu Read Projection Authority (`CURRENT`; TARGET
customer Menu serving architecture; implementation NOT_AUTHORIZED). Static `ordering-catalog.json`
remains TRANSITIONAL CURRENT storefront delivery. Accepted IMP-025 implementation is not
invalidated. `acceptedThrough` remains IMP-028. `pendingAcceptance` remains NONE.
`currentProductSlice` remains NONE. `nextProductSlice` remains IMP-029. IMP-029 remains not started
and is not implementation-authorized. Decision register is DR-10. Global architecture is ARCH-R13
(ARCH-G19). Next free decision is **D-369**. Supersedes STATE-R28 for current
governance/architecture position. Product acceptance through IMP-028 is unchanged.
STATE-R28 records independent acceptance of IMP-028 — Invoice / Tax Receipt / Credit Note
(`COMPLETE_AND_ACCEPTED`; `IMP-028_ACCEPTED: YES`). Financial-document acceptance evidence is
recorded under binding **D-365** / **D-366** / **D-367**. Architecture remains
`ARCHITECTURE_LOCKED`. `acceptedThrough` advances to IMP-028. `pendingAcceptance` is NONE.
`currentProductSlice` is NONE. `nextProductSlice` is IMP-029. IMP-029 remains not started and is
not implementation-authorized. Decision register remains DR-9. Global architecture remains
ARCH-R12. Supersedes STATE-R27 for current accepted position.
STATE-R27 records independent acceptance of IMP-026C — Pilot Customer-Commerce UX Hardening
(`COMPLETE_AND_ACCEPTED`; `IMP-026C_ACCEPTED: YES`). Supplemental-inserted-gate acceptance evidence
is recorded (`IMP026C_INDEPENDENT_ACCEPTANCE_EVIDENCE: ACCEPTED`;
`IMP026C_FORMAL_ACCEPTANCE: ACCEPTED`). Architecture remains `ARCHITECTURE_LOCKED`.
`acceptedThrough` remains IMP-027. `pendingAcceptance` advances to IMP-028. IMP-028 remains
`IMPLEMENTATION_IN_PROGRESS` (`IMP-028_ACCEPTED: NO`; working-tree capability artifact may record
`IMP-028_IMPLEMENTATION_COMPLETE: YES`). IMP-029 remains not started. Decision register remains
DR-9. Global architecture remains ARCH-R12. Supersedes STATE-R26 for current accepted position.
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

Accepted product through IMP-028A is the independently accepted implementation baseline encoded by
this reconciliation. Detailed per-slice evidence remains in repository tests, audits, Docker
runtime proof, and historical implementation artifacts. This STATE snapshot records independent
acceptance of IMP-028A (`COMPLETE_AND_ACCEPTED`) as a customer-commerce shell over accepted
IMP-009 / IMP-025 / IMP-026C, without implementing D-368 / D-369 / D-370. STATE-R28 recorded
independent acceptance of IMP-028 (`COMPLETE_AND_ACCEPTED`) under locked **D-365** / **D-366** /
**D-367**. STATE-R31 additionally records **D-370** as CURRENT Cart identity-transition policy
without changing that accepted product inventory. STATE-R30 additionally records **D-369** as CURRENT paid-modifier explicit-selection policy without
changing that accepted product inventory. STATE-R29 additionally records **D-368** as CURRENT TARGET
Menu serving architecture without changing that accepted product inventory.

Independent IMP-028A acceptance (COMPLETE_AND_ACCEPTED) on 2026-08-19. Pre-acceptance
working-tree fingerprint:

```text
32f3bbeda6507e286ee9fe4cc93efa7c6c843ec81b4f4d54864eaf3e20a43f1a
```

Post-acceptance fingerprint is regenerated by `npm run working-tree:fingerprint` after this STATE
update and supersedes the pre-acceptance value for ongoing governance identity.

Independent IMP-028A acceptance preserved truthful limitations:

```text
TYPECHECK_STATUS = FAIL_PRE_EXISTING_UNRELATED
CUSTOMER_ORDERING_E2E = BLOCKED_ENVIRONMENT
CUSTOMER_ORDERING_ALTERNATIVE_REGRESSION_EVIDENCE_SUFFICIENT = YES
RELEVANT_REGRESSION_TESTS = PASS_WITH_ENVIRONMENT_LIMITATION
```

Independent IMP-028 acceptance (COMPLETE_AND_ACCEPTED) on 2026-08-18. Pre-acceptance
working-tree fingerprint:

```text
400f0ec388327c6c323eded33d8188428bb46cc031f7be92a9d62ea371c84467
```

Post-acceptance fingerprint is regenerated by `npm run governance:fingerprint` after this STATE
update and supersedes the pre-acceptance value for ongoing governance identity.

Independent IMP-026 acceptance (COMPLETE_AND_ACCEPTED) on 2026-08-18. Pre-acceptance
governance fingerprint:

```text
3234612aaefaf49bad0ee49b68419a91bfff36d1c25c7fec898287c8bf851fe1
```

STATE-R43 records IMP-028C — Food Customization implementation started under its existing
architecture `ARCHITECTURE_LOCKED` and implementation authorization. `acceptedThrough` remains
IMP-028B; `pendingAcceptance` remains NONE; `currentProductSlice` remains IMP-028C; and
`nextProductSlice` remains IMP-029, which is planned, not started, and not authorized. D-369 is
mandatory for this capability; D-368 remains the Customer Menu discovery authority; D-370 policy
remains outside scope; D-371 remains unused. The capability retains the canonical-content
founder-UAT stop gate. No acceptance, runtime, schema, migration, catalog-data, decision-register,
or global-architecture change is recorded.

STATE-R44 records the IMP-028C business/domain model and remaining implementation-plan lock. The
core model reuses Catalog Modifier Groups and Variant bindings; bundle components inherit their
canonical Variant modifier authority; bundle/package pricing remains distinct from modifier pricing;
and D-368 / D-369 / D-370 remain sufficient. Slice 1 and Slice 2 are `TECHNICALLY_ACCEPTED`; Slice
3 and Slice 4 remain planned implementation work. IMP-028C remains `IMPLEMENTATION_IN_PROGRESS`,
`IMP-028C_IMPLEMENTATION_COMPLETE: NO`, and `IMP-028C_ACCEPTED: NO`. No new decision is created:
D-371 remains unused; ARCH-R15 and DR-12 remain current.

## 8. Explicitly Not Yet Accepted

Supporting primitives do not equal capability completion. Not yet accepted as product capabilities:

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
- Food Customization (IMP-028C architecture locked; implementation authorized and started; not complete or accepted)

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
| IMP-028 locked capability architecture | [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md) |
| IMP-028A locked capability architecture | [`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md) |
| IMP-028B canonical capability | [`capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](./capabilities/IMP-028B-customer-menu-projection-and-discovery.md) |

Agents may propose a STATE delta in their report. Only independent acceptance updates this file's
accepted position and may promote `governanceHealth` to `ALIGNED`.
