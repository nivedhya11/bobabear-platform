<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-028",
  "title": "Invoice / Tax Receipt / Credit Note",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "COMPLETE_AND_ACCEPTED",
  "implementationAuthorized": true,
  "lastReviewed": "2026-08-18",
  "bindingDecisions": ["D-356", "D-357", "D-358", "D-359", "D-360", "D-361", "D-362", "D-363", "D-364", "D-365", "D-366", "D-367"],
  "dependsOn": ["IMP-021", "IMP-022", "IMP-023", "IMP-024", "IMP-026", "IMP-027"],
  "schemaChangeRequired": true
}
-->

# IMP-028 — Invoice / Tax Receipt / Credit Note

## Capability Architecture (ARCHITECTURE_LOCKED)

This document is the **locked capability architecture** for IMP-028 — Invoice / Tax Receipt /
Credit Note.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Implementation | `COMPLETE_AND_ACCEPTED` |
| Implementation authorized | **YES** |
| Implementation started | **YES** |
| Implementation complete | **YES** |
| Acceptance | **COMPLETE_AND_ACCEPTED**; `acceptedThrough = IMP-028`; `pendingAcceptance = NONE` |
| Schema change required | **YES** (Financial Document; numbering; issuer/tax profile; RefundStatutoryDecision; RefundStatutoryIssuanceAllocation; SignatureArtifact / AuthorisedSignerProfile / signed-artifact storage; latest accepted migration `0029_refund_statutory_issuance_allocation`) |
| Binding decisions | **D-365** (Financial Document Authority); **D-366** (Refund Statutory Reversal Decision Authority); **D-367** (Statutory Financial Document Signing and Signed Artifact Authority) |

Architecture remains locked. Implementation is complete and independently accepted.
Product implementation remains strictly within **D-365**, **D-366**, **D-367**, **ARCH-G16**,
**ARCH-G17**, **ARCH-G18**, and this locked capability artifact. Do not start IMP-029. Formal
acceptance of IMP-028 does **not** authorize IMP-029 implementation.

```text
acceptedThrough = IMP-028
pendingAcceptance = NONE
currentProductSlice = NONE
nextProductSlice = IMP-029
IMP-028_IMPLEMENTATION_COMPLETE = YES
IMP-028_ACCEPTED = YES
IMP-029 = NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED = NO
IMP-029_STARTED = NO
```

Formal acceptance (this artifact; STATE-R28 / GTM-R30):

```text
IMP-028_IMPLEMENTATION_COMPLETE = YES
IMP-028_ACCEPTED = YES
D366_FINAL_ISSUANCE = ACCEPTED
IMP028_CODE_COMPLETE = YES
IMP028_STATUTORY_PATH_COMPLETE = YES
IMP028_TESTS_COMPLETE = YES
IMP028_DOCUMENTATION_COMPLETE = YES
IMP028_FORMAL_ACCEPTANCE = ACCEPTED
```

Independent final closure audit: `IMP028_FINAL_CLOSURE_EVIDENCE = SUFFICIENT`;
`D366_FINAL_ISSUANCE_INDEPENDENT_ACCEPTANCE_EVIDENCE = SUFFICIENT`. GTM-R30 records formal
`acceptedThrough` advancement to IMP-028. IMP-029 remains `PLANNED` / `NOT_STARTED` /
`NOT_AUTHORIZED`.

---

## 1. Objective

Give BOBA a first-class immutable **Financial Document** authority for issued statutory /
financial documents required by the direct-order GTM path, without rewriting Checkout Snapshot,
Payment, Refund, or Order authorities.

Roadmap product identity remains **Invoice / Tax Receipt / Credit Note**. “Tax Receipt” is a
customer experience / projection label over the appropriate sealed Financial Document and Payment
context — **not** a sixth statutory document type named `TAX_RECEIPT`.

### 1A. Business / MVP principle

```text
COMPLIANCE-CORRECT
OPERATIONALLY MANUAL
AUTOMATION-READY
```

Rationale (binding product posture for IMP-028; not a weakening of statutory authority):

- BOBA direct commerce begins at relatively low volume;
- time-to-market matters more than premature enterprise automation;
- humans may perform low-volume refund classification and signing;
- statutory correctness, immutable authority, numbering, and auditability are **not** weakened;
- advanced automation is deferred until volume / operational pain justifies it.

Software validates and seals operator-supplied statutory authority. Software does **not** invent
missing GST/statutory facts, automatically infer RFV/CN/NSD, or cryptographically sign documents
in this MVP.

---

## 2. Authority Model

```text
Cart
  ↓
Checkout Snapshot
  ──────────────────────────────┐
                                │
Payment ────────────────────────┤
                                │
Refund ─────────────────────────┤
                                │
Order ──────────────────────────┤
                                │
Effective Issuer / Tax Profile ─┤
                                ▼
                       Financial Document
                                │
                                ▼
                             Rendering
```

Authorities remain distinct:

| Authority | Owns |
|---|---|
| Checkout Snapshot | Immutable accepted commercial transaction truth |
| Payment | Original collection truth |
| Refund | Subsequent financial reversal truth |
| RefundStatutoryDecision | Durable statutory-reversal classification for a PROCESSED Refund (D-366) |
| RefundStatutoryIssuanceAllocation | Exact PARTIAL statutory line/tax arithmetic (D-366); distinct from decision branch and issued FD |
| SignatureArtifact | Durable signature state and exact-byte signed statutory artifact authority (D-367) |
| Order | Post-purchase business / fulfilment lifecycle truth |
| Financial Document | Immutable issued statutory / financial-document truth |
| AuthorisedSignerProfile | Effective-dated authorised signatory authority distinct from IssuerProfile (D-367) |
| Rendering / PDF | Projection of Financial Document authority — not authority itself; signed PDF is durable artifact only after SignatureArtifact SIGNED |

Do not rewrite existing authorities. Do not invent a duplicate mutable commercial snapshot
hierarchy for documents.

Canonical authorities:

| Question | Authority |
|---|---|
| Why / Non-Goals | [`../VISION.md`](../VISION.md) |
| Binding decisions | [`../decision-register.md`](../decision-register.md) (**D-365**, **D-366**, **D-367**) |
| Global architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) (ARCH-G16, ARCH-G17, ARCH-G18) |
| IMP sequence / lifecycle | [`../ROADMAP.md`](../ROADMAP.md) |
| Accepted reality | [`../STATE.md`](../STATE.md) |
| Refund lock consumed | [`IMP-027-refund-foundation.md`](./IMP-027-refund-foundation.md) (**D-364**) |
| This capability lock | **This document** |
| Agent rules | [`../../../AGENTS.md`](../../../AGENTS.md) |

Layering (unchanged):

```text
UI → Transport → Application Operations → Domain Authority → Persistence → Provider Adapter
```

---

## 3. Financial Document Aggregate

Financial Document is a first-class durable aggregate and the **sole** BOBA authority for issued
statutory/financial documents.

It consumes, but does not rewrite:

- Checkout Snapshot
- Payment
- Refund
- Order
- effective Issuer / Tax Profile

Once issued, the aggregate seals historical document identity, statutory/public number, issue
date/time, financial year, supplier facts, applicable recipient facts, commercial lines, taxable
values, discounts/charges, tax classification/rates/components, currency, authority references,
relevant prior Financial Document references, and applicable compliance/profile facts.

Issued Financial Documents are immutable historical truth (**ARCH-G16**).

Monetary, numbering, and authority-separation rules:

- All money is **integer paise**. Tax rates are **integer basis points**. No floating-point
  commercial arithmetic.
- Statutory document numbers are separate from Order numbers, Payment ids, and Razorpay /
  provider ids. `ORD-*` and provider receipts are never GST / statutory numbers.
- Number allocation is transactional and non-reused. Exact retry of the same logical issuance
  returns the same Financial Document / number.
- Issued documents are never reconstructed from mutable current menu, customer, tax, or legal-
  entity configuration, nor from current Payment / Refund / Order state.
- Payment, Order, Refund, and FinancialDocument remain separate authorities.
- Customer access requires exact ownership proof and is **non-oracle** (unknown / unauthorized /
  non-owned converge to `DOCUMENT_NOT_FOUND`).
- Implemented `uninvoiced_advance` path: Payment `SUCCEEDED` → `RECEIPT_VOUCHER`; Order
  `FULFILLED` → `TAX_INVOICE`. Issuance runs outside the commercial transaction.
- Statutory issuance failure or signing pending/failure **never** rolls back valid commercial
  truth (Payment `SUCCEEDED` / Order `FULFILLED` / Refund `PROCESSED` remain).

---

## 4. Issuer / Tax Profile Relationship

Financial Document issuance consumes an **effective** issuer/tax configuration authority.

Exact persistence design belongs to implementation. Architecture requires effective configuration
capable of supplying, as applicable:

- legal entity
- GST legal name
- GSTIN
- registered address
- state / state code
- GST registration scheme/status
- effective registration dates
- tax classification
- SAC/HSN where applicable
- rate / ITC metadata
- jurisdiction / place-of-supply policy
- enabled statutory document types
- numbering series
- Dynamic QR applicability
- issuance-policy configuration
- effective version / validity

Issued Financial Documents **seal** the applicable issuer/tax facts. Later profile changes never
rewrite previously issued documents.

Unknown production values are **CONFIGURATION / DEPLOYMENT / ISSUANCE GATES**, not
architecture-hard-coded assumptions. Incomplete configuration **MUST fail closed**.

Architecture must never:

- invent GSTIN
- use a test GSTIN as production fallback
- guess registration scheme
- guess SAC/HSN
- guess tax rate
- invent place of supply
- invent invoice/document numbers
- silently omit mandatory fields
- reconstruct issued documents from mutable current configuration

---

## 5. Conditional Statutory Document Types

Supported conditional statutory document classes:

| Type | Role (conceptual) |
|---|---|
| `TAX_INVOICE` | Tax Invoice for taxable supply where required |
| `BILL_OF_SUPPLY` | Bill of Supply where conditionally supportable |
| `RECEIPT_VOUCHER` | Receipt Voucher for uninvoiced advance / receipt semantics |
| `REFUND_VOUCHER` | Refund Voucher for uninvoiced advance reversal |
| `CREDIT_NOTE` | Section 34 Credit Note against prior Tax Invoice(s) |

**Do NOT** introduce a statutory document type named `TAX_RECEIPT`.

Enablement of each type is configuration-gated. Types that are not enabled or not applicable for a
given issuance context must fail closed rather than invent a substitute.

---

## 6. Tax Receipt Product Semantic

Roadmap “Tax Receipt” represents customer financial-document experience / projection over the
appropriate sealed Financial Document and Payment context.

It is **not** a sixth statutory class. Customer-facing labels may say “Tax Receipt” when product
copy requires it; the underlying sealed authority remains one of the statutory classes above (or a
lawful projection thereof), never a fabricated `TAX_RECEIPT` type.

---

## 7. Document Issuance Gate

Issuance is gated on:

1. Durable upstream authority facts (Checkout Snapshot / Payment / Refund / Order as applicable)
2. Complete effective issuer/tax profile for the required document class
3. Ability to seal compliant document facts without inventing values
4. Configured numbering series and concurrency-safe allocation
5. Idempotent logical issuance identity (retry must not mint a duplicate document)

If compliant document facts cannot be produced without inventing values: **FAIL CLOSED**.

Incomplete configuration: **FAIL CLOSED**.

---

## 8. Advance-Payment Policy Variants

Architecture supports issuance-policy variants. **D-365 does not select** BOBA’s final production
tax policy.

### 8.1 Uninvoiced advance path (supported as a policy variant)

```text
Payment / advance
  ↓
Receipt Voucher
  ↓
  ├─ supply / invoicing path → Tax Invoice
  │
  └─ no supply + no Tax Invoice → Refund Voucher
```

### 8.2 Invoice-at-payment path (accountant-approved policy variant)

```text
Payment SUCCEEDED
  ↓
Tax Invoice
```

followed, when Section 34 conditions apply, by:

```text
qualifying post-invoice reduction
  ↓
Credit Note
```

Which production policy is active is a configuration / accountant gate, not an architecture
hard-code.

---

## 9. Section 34 Credit Note Precision

`CREDIT_NOTE` under CGST Section 34 requires prior **TAX INVOICE(S)**.

Do **NOT** encode:

```text
"Tax Invoice or Bill of Supply"
```

as the Section 34 enabling precondition.

Bill-of-Supply-only adjustment/reversal semantics have **not** been verified as a
Section-34-equivalent statutory mechanism.

Therefore:

- `BILL_OF_SUPPLY` remains conditionally supportable
- automatic Section 34 Credit Note issuance against a BoS-only supply is **prohibited**
- BoS-only adjustment/reversal treatment must **fail closed** unless explicit verified compliance
  policy later authorizes an appropriate treatment
- Do not invent an unnamed statutory reversal document

Invariant for consistency tooling:

```text
SECTION_34_CREDIT_NOTE_REQUIRES_PRIOR_TAX_INVOICE
BILL_OF_SUPPLY_ONLY_CREDIT_NOTE_PROHIBITED
```

---

## 10. Bill-of-Supply Fail-Closed Boundary

When the only prior supply document is `BILL_OF_SUPPLY`:

- do not automatically issue `CREDIT_NOTE`
- do not invent a substitute statutory reversal type
- fail closed at the compliance / issuance gate unless a later explicit verified policy authorizes
  an appropriate treatment

This boundary is binding architecture, not optional operator preference.

---

## 11. Refund Interaction

**D-364** remains unchanged. Refund lifecycle remains:

```text
ACCEPTED
PENDING
INDETERMINATE
PROCESSED
FAILED
```

Financial-document policy may consume Refund facts. Refund semantics must **not** be encoded by
changing Refund state to represent documents.

**D-366** supplies the missing refund statutory-reversal decision authority consumed before issuing
`REFUND_VOUCHER` / `CREDIT_NOTE`. See §11A.

Conceptual mapping (after D-366 classification; not automatic from Refund alone):

| Refund / commercial situation | Document treatment |
|---|---|
| Uninvoiced advance reversal with positive RFV gates | Refund Voucher |
| Post-Tax-Invoice qualifying reduction with Section-34 qualification | Section 34 Credit Note |
| Bill-of-Supply-only reduction/reversal | no automatic Credit Note; fail-closed compliance gate |
| Explicit structured operator NO_STATUTORY_DOCUMENT | no statutory document (positive final disposition) |
| Insufficient positive authority | remain PENDING / blocked (not NO_STATUTORY_DOCUMENT) |
| Refund `PENDING` | no final reversal document |
| Refund `INDETERMINATE` | no final reversal document |
| Refund `FAILED` | no final reversal document |
| Duplicate provider evidence | no duplicate Financial Document |

---

## 11A. Refund Statutory Reversal Decision Authority (D-366)

### Context

D-365 established Financial Document authority but did **not** provide enough durable authority for
automatic Refund statutory reversal. The implementation gate exposed that:

- actual prior Tax Invoice chronology cannot be inferred from `issueAt` heuristics alone;
- Refund `PROCESSED` alone cannot establish Section-34 qualification;
- Refund `amountPaise` alone cannot authorize arbitrary partial line/tax allocation;
- absence of Tax Invoice cannot prove Section 31(3)(e) “no supply”;
- pre-invoice refund followed by later supply has no safe automatic netting policy;
- statutory issue date must not be invented from `Refund.processedAt`.

D-366 closes that product/architecture authority model without rewriting D-364 Refund truth or
D-365 issued-FD immutability.

### Persistence boundary

`RefundStatutoryDecision` is a first-class durable authority separate from Refund, Payment, Order,
and FinancialDocument.

```text
one Refund → exactly one RefundStatutoryDecision
```

- Refund remains D-364 money/provider truth.
- RefundStatutoryDecision records statutory interpretation and sealed reversal source.
- Issued FinancialDocument remains immutable D-365 authority.
- D-366 layers on D-364 and D-365; it does not supersede them.

### Creation boundary

When Refund becomes durably `PROCESSED`, create/ensure exactly one `RefundStatutoryDecision` for
that Refund in `PENDING` (`ensureRefundStatutoryDecisionPending`). This occurs from the durable
PROCESSED Refund; refund success never depends on statutory decision or FD issuance.

`PENDING` means:

- no statutory branch has been proven;
- no statutory reversal document exists;
- no document is implied;
- classification may remain pending indefinitely.

Refund success must **never** depend on statutory decision or FD issuance success.

### Decision lifecycle

```text
PENDING
→ BRANCH_FINALIZED
→ ISSUED

For dispositions requiring no Financial Document:
PENDING
→ BRANCH_FINALIZED(NO_STATUTORY_DOCUMENT)
```

| Field | Rule |
|---|---|
| Disposition while PENDING | `null` |
| Final dispositions | `REFUND_VOUCHER` \| `CREDIT_NOTE` \| `NO_STATUTORY_DOCUMENT` |
| Once final | disposition and sealed authority are immutable |
| ISSUED | associates exactly one immutable FinancialDocument with an RFV/CN decision without mutating branch facts |

`READY_REFUND_VOUCHER` / `READY_CREDIT_NOTE` states are not required.

Branch selection for MVP is **manual-assisted / operator-selected**. Software validates and
seals supplied authority. Software does **not** automatically infer `REFUND_VOUCHER`,
`CREDIT_NOTE`, or `NO_STATUTORY_DOCUMENT`. Missing evidence **fails closed** (remain PENDING /
blocked).

### Refund Voucher positive finalization

`REFUND_VOUCHER` may finalize **ONLY** when positive durable authority proves:

1. Refund is `PROCESSED`;
2. exact prior `RECEIPT_VOUCHER` exists for the same immutable commercial graph;
3. durable no-supply authority exists;
4. no applicable `TAX_INVOICE` exists for that same supply/commercial graph;
5. reversal source/allocation is sealed;
6. document/value constraints otherwise pass.

Absence of Order, Tax Invoice, fulfillment, or evidence is **NEVER** sufficient by itself.

Preserve exactly:

```text
missing Order != no-supply authority
missing TAX_INVOICE != no-supply authority
Refund existence != RFV authority
```

RFV also requires the **same commercial authority graph** as the exact prior RECEIPT_VOUCHER.

### Durable no-supply authority

Current accepted automatic durable no-supply authority:

```text
Order.status = CANCELLED
```

for the exact commercial graph (positive no-supply authority = exact `Order.status=CANCELLED`).
Order cancellation must be terminal/non-reversible under existing Order authority.

Do **NOT** classify as no-supply authority:

- Order absence
- Checkout not yet ordered
- Payment refunded
- Refund `PROCESSED`
- no Tax Invoice currently
- not `FULFILLED` yet

Pre-Order automatic Refund Voucher therefore remains **FAIL_CLOSED** until another binding
commercial no-supply authority is introduced. D-366 does not invent one.

### Credit Note positive finalization

`CREDIT_NOTE` may finalize **ONLY** when:

1. Refund is `PROCESSED`;
2. exact actual prior `TAX_INVOICE` is sealed;
3. structured Section-34 qualification is sealed;
4. reversal source/allocation is sealed;
5. same legal entity/commercial graph validation passes.

A monetary refund after invoice is **not** sufficient by itself. Existence of a Tax Invoice is
**not** sufficient by itself. `BILL_OF_SUPPLY`-only reversal does **not** map automatically to
Section-34 `CREDIT_NOTE`.

### Section-34 qualification

Section-34 qualification is structured, write-once statutory decision authority. It must **not** be
inferred from free-text `Refund.reason`, generic operator notes, arbitrary text, `operatorNote`,
Refund `PROCESSED`, provider success, Order cancellation, or mere Tax Invoice existence.
Software does **not** infer the qualification code. TI existence alone is insufficient.

BOBA internal canonical Section-34 qualification codes (exactly these; operators choose one):

```text
TAXABLE_VALUE_OR_TAX_EXCEEDS_PAYABLE
GOODS_RETURNED_BY_RECIPIENT
GOODS_OR_SERVICES_DEFICIENT
```

These strings are BOBA internal canonical codes representing the approved statutory grounds.
They are not GST statutory text and must not be treated as newly invented legal categories.

Concrete qualification codes must correspond only to legally verified Section-34 categories. Do
not invent new legal categories in D-366. Operators may supply a qualification only against durable
referenced commercial/statutory facts. Structured durable qualification facts are required.

### Reversal source / full / partial

No generic proportional allocator. No refund/source percentage calculation. No automatic line
split, automatic tax split, automatic rounding/remainder distribution, or gross-to-component
inference. All money remains integer paise.

- **FULL** reversal: exact immutable source FinancialDocument arithmetic **is** the issuance
  arithmetic authority, and may be used only when the Refund amount and qualifying authority
  prove a full reversal and all other branch gates pass.
- **PARTIAL** reversal requires an explicit write-once sealed `RefundStatutoryIssuanceAllocation`
  that reconciles exactly to the Refund statutory amount and must not exceed immutable source
  authority.
- Credit Note source authority = exact prior `TAX_INVOICE`.
- Refund Voucher source authority = exact prior `RECEIPT_VOUCHER` plus immutable Payment/Checkout
  Snapshot graph as authorized.
- Multiple refunds must not cause cumulative statutory reversal beyond source authority.
- Missing allocation → remain PENDING / blocked.
- Never silently proportional allocate, first-line allocate, last-line balance, or use mutable
  menu/catalog/current tax configuration.

### Single refund statutory purpose

Logical issuance identity for **both** `REFUND_VOUCHER` and `CREDIT_NOTE`:

```text
refund:<refundId>:STATUTORY_REVERSAL
```

One Refund therefore has at most one statutory reversal document purpose. Contradictory reuse with
another document type must fail through existing Financial Document idempotency/fingerprint
conflict. Do not introduce separate type-specific purpose identities that could allow both
documents.

### Prior document relationships

**REFUND_VOUCHER** must seal the exact prior `RECEIPT_VOUCHER`. The issued RFV must project the
prior Receipt Voucher statutory number/date as required by the statutory-document model. Using
`priorFinancialDocumentId` is allowed provided implementation preserves document-type-specific
validation and does not weaken Credit Note rules.

**CREDIT_NOTE** must seal the exact prior `TAX_INVOICE`. `priorFinancialDocumentId` must point to
that exact Tax Invoice. Same legal entity + commercial graph validation remains mandatory.

Never select latest invoice, same customer only, same amount only, or current invoice by timing
heuristics.

### NO_STATUTORY_DOCUMENT

`NO_STATUTORY_DOCUMENT` is a positive **FINAL** disposition. It must **NEVER** be inferred merely
because no Tax Invoice exists, no Section-34 evidence was found, profile/configuration is absent, a
document type is disabled, numbering is unavailable, recovery failed, or insufficient evidence
currently exists. Those cases remain PENDING or operationally blocked.

`NO_STATUTORY_DOCUMENT` requires a structured write-once operator decision with positive rationale,
referenced durable commercial/statutory facts, actor, decision timestamp, and audit evidence. It
must not contradict existing immutable commerce truth.

The only currently authorised MVP reason code is:

```text
COMMERCIAL_REFUND_NO_GST_STATUTORY_ADJUSTMENT
```

Required authority for that NSD disposition:

- Refund `PROCESSED`;
- exact relevant `TAX_INVOICE`;
- same commercial graph;
- bounded reason code above;
- non-empty operator rationale;
- durable fact references including the relevant TI authority;
- actor and actual finalization timestamp sealed;
- no FinancialDocument;
- remains terminal `BRANCH_FINALIZED` (does not enter issuance / ISSUED);
- inability to prove RFV/CN does **NOT** itself authorize NSD.

Additional NSD reason categories are deferred. Cases without sufficient positive authority remain
PENDING / fail closed.

### RefundStatutoryIssuanceAllocation authority

Authority separation:

```text
RefundStatutoryDecision
= WHICH statutory branch / WHY

RefundStatutoryIssuanceAllocation
= exact PARTIAL statutory line/tax arithmetic

FinancialDocument
= final issued statutory result
```

- One successful allocation per eligible PARTIAL decision.
- Source FD derives from sealed decision authority.
- RFV source = exact prior `RECEIPT_VOUCHER`.
- CN source = exact prior `TAX_INVOICE`.
- Source line base/taxable amount derives from immutable FD lines.
- Tax type/rate/amount derives from immutable source tax components.
- Operator cannot invent source rates.
- Allocation reconciles exactly to sealed reversal amount.
- Per-line caps, per-tax-component caps, and cumulative cross-decision caps apply.
- Allocation authority is immutable / write-once.

### Critical prior-partial invariant

```text
UNKNOWN_COMPONENT_CONSUMPTION != ZERO_CONSUMPTION
```

Meaning:

- another sealed PARTIAL reversal against the same source requires a sealed issuance allocation
  before later component-cap calculation;
- another PARTIAL without allocation causes component authority to fail closed;
- gross amount is never used to infer its missing component split;
- FULL reversal consumes complete source component authority;
- the current decision is excluded while its own allocation is being created.

### Final RFV/CN issuance

Implemented path (`issueRefundStatutoryReversal`):

```text
BRANCH_FINALIZED RFV/CN
→ validate existing sealed authority
→ FULL source arithmetic
   OR
   sealed PARTIAL issuance allocation
→ issue FinancialDocument
→ allocate statutory number
→ RefundStatutoryDecision ISSUED
```

- Issuance does not reclassify Refund.
- RFV creates `REFUND_VOUCHER`; CN creates `CREDIT_NOTE`.
- Exact prior-document authority is preserved.
- D-365 Financial Document issuance is reused.
- Number allocation + FD persistence + decision ISSUED share **one PostgreSQL transaction**.
- No saga.
- Exact retry returns the same FD/number.
- Concurrent equivalent issuance produces one FD/number.
- Rollback leaves no document/decision mismatch.
- NSD does not enter issuance.

Transaction-composition seam:

```text
issueFinancialDocument(persistence, command, { transactionContext })
```

`transactionContext` exists so D-366 issuance can compose D-365 issuance into the caller
transaction. Nested `Persistence.transaction()` remains unsupported.

### Partial arithmetic fail-closed rule

A sealed PARTIAL allocation must still satisfy D-365 canonical FinancialDocument arithmetic during
issuance (`sealIssuanceArithmetic` / exclusive GST `taxExclusivePaise`). If the explicit
taxable/tax split is not valid under that arithmetic:

```text
FAIL CLOSED
```

Do not proportionally rerate, redistribute, silently change tax, or automatically repair the
operator allocation. This is an intentional MVP safety boundary.

### Operator authority

Operators **may** provide:

- structured Section-34 qualification tied to exact prior Tax Invoice and durable facts;
- explicit partial reversal allocation tied to sealed source authority;
- `NO_STATUTORY_DOCUMENT` classification with positive cited authority;
- confirmation of no-supply **ONLY** where durable commercial no-supply authority already exists.

Operators may **NOT**: invent pre-Order no-supply; rewrite Refund/Order status; invent Tax Invoice
existence; choose a statutory issue date; mutate issued FDs; override immutable commercial monetary
facts. All operator statutory decisions must be write-once/auditable.

### Statutory issue date

`Refund.processedAt` is **not** the statutory reversal `FinancialDocument.issueAt`.
RefundStatutoryDecision classification/finalization time is **not** automatically
`FinancialDocument.issueAt`.

For `REFUND_VOUCHER` / `CREDIT_NOTE`, `issueAt` is established at the successful Financial Document
issuance boundary. Future implementation must atomically associate:

```text
RefundStatutoryDecision.issuedAt = FinancialDocument.issueAt
```

with the successful issued FinancialDocument.

If classification is sealed earlier and the first issuance attempt fails:

- branch remains immutable;
- no `issueAt` is fabricated from the failed attempt;
- recovery later issues using the successful issuance boundary;
- financial year and numbering series are derived from that successful `issueAt`.

Do not backdate from `Refund.processedAt`.

### Recovery

Reuse D-362-style recovery discipline: one branch-aware recovery workflow. Recovery consumes Refund
`PROCESSED`, sealed RefundStatutoryDecision, sealed disposition, sealed prior-document authority,
sealed qualification, and sealed allocation. Recovery **NEVER** recalculates a FINALIZED branch
from current world state. PENDING decisions may be evaluated/finalized only through the same
positive decision gates. Missing config/numbering/temporary issuance failure does not change the
decision branch. No new scheduler/queue/outbox authority is decided here.

### Customer / commercial references

Immutable historical references:

- **REFUND_VOUCHER** decision/FD: `refundId`, `paymentId`, `checkoutId`, `checkoutSnapshotId`,
  exact prior Receipt Voucher; `orderId` only where immutable authority genuinely supplies it.
  Never backfill an issued RFV merely because Order later exists.
- **CREDIT_NOTE**: `refundId`, exact Payment where applicable, `checkoutId`,
  `checkoutSnapshotId`, exact Order, exact prior Tax Invoice.

Customer ownership continues through the accepted Checkout/Order CustomerActor graph.

### Persistence requirement

Implementation requires a forward-only persistence migration for `RefundStatutoryDecision`
supporting: 1:1 refund relation; PENDING/final lifecycle; disposition; exact prior Receipt Voucher;
exact prior Tax Invoice; Section-34 qualification; sealed reversal amount/allocation authority;
audit/finalization facts; issued Financial Document association; `issuedAt`; immutable/fail-closed
constraints.

This decision did **not** create the migration. Working-tree persistence later added
`RefundStatutoryDecision` and `RefundStatutoryIssuanceAllocation` (through
`0029_refund_statutory_issuance_allocation`). That does not mark IMP-028 complete or accepted.

### Relationship to D-364 / D-365 / D-362

| Decision | Relationship |
|---|---|
| D-364 | Refund authority unchanged; Refund `PROCESSED` is terminal payment/refund truth independent of statutory reversal success |
| D-365 | Financial Document authority remains immutable; D-366 supplies missing refund-reversal decision authority consumed before issuing RFV/CN |
| D-362 | operator CLI recovery discipline reused conceptually |
| D-366 | NEW binding layer on D-364 + D-365; does not silently supersede them |

### Explicit non-goals

D-366 does **not**: implement the migration; implement refund-document orchestration; implement
operator UI; implement IMP-029; invent Section-34 legal categories; introduce Bill-of-Supply
reversal automation; introduce a generic partial allocator; make every Refund produce a statutory
document; treat missing Tax Invoice as RFV qualification; alter accepted Payment Receipt Voucher
workflow; alter accepted Order Tax Invoice workflow; solve generic Financial Document
mandatory-particular compliance defects.

### Separate IMP-028 compliance defect (non-binding completion blocker)

```text
PRE_EXISTING_IMP028_COMPLIANCE_DEFECT = YES
FD_NON_SIGNATURE_COMPLIANCE_CORRECTION = COMPLETE
SIGNATURE_COMPLIANCE = GAP
```

This is an IMP-028 completion/acceptance blocker **separate** from D-366 refund branch authority
and D-367 signing architecture. Non-signature mandatory-particular correction is **COMPLETE**
(migration 0022). Signature compliance remains **GAP** until signing is independently accepted
(unattended DSC/eSign/HSM and cryptographic verification remain deferred). The manual signed-PDF
MVP is implemented in the working tree and does not by itself complete or accept IMP-028.

Retain for correction review (do not encode as final legal conclusions beyond verified gaps):

- Tax Invoice Rule-46 signature exception applicability remains unresolved (`TAX_INVOICE_SIGNATURE_LEGAL_APPLICABILITY: UNRESOLVED_RULE46_EXCEPTION`); BOBA signing required by product policy regardless.
- `SIGNATURE_COMPLIANCE: GAP` until independent acceptance (manual signed-PDF MVP is not unattended cryptographic signing).

Do **not** assert Tax Invoice signature is definitely defective merely because BOBA does not
use/assume IRN e-invoicing. Do **not** treat inter-State-only State-name particulars as current
intra-State BOBA defects without applicability proof.

Compliance correction for non-signature particulars is complete. Independent signing acceptance
remains a separate gate before IMP-028 completion/acceptance.

### Workflow status under D-366

```text
PAYMENT_RECEIPT_VOUCHER_WORKFLOW = COMPLETE
ORDER_TAX_INVOICE_WORKFLOW = COMPLETE
REFUND_STATUTORY_DECISION_PERSISTENCE = IMPLEMENTED
REFUND_STATUTORY_BRANCH_FINALIZATION = IMPLEMENTED
REFUND_STATUTORY_ISSUANCE_ALLOCATION = IMPLEMENTED
REFUND_STATUTORY_RFV_CN_ISSUANCE = ACCEPTED
D366_FINAL_ISSUANCE = ACCEPTED
IMP-028_IMPLEMENTATION_COMPLETE = YES
IMP-028_ACCEPTED = NO
```

The RFV/CN issuance path is implemented and independently accepted as final issuance evidence.
That sets working-tree `IMP-028_IMPLEMENTATION_COMPLETE = YES` and does **not** accept IMP-028
(`IMP-028_ACCEPTED = NO`; `acceptedThrough` remains IMP-025; `pendingAcceptance` remains IMP-026).

---

## 11B. Statutory Financial Document Signing and Signed Artifact Authority (D-367)

### Purpose

D-367 closes the statutory signing / signed-artifact authority model for IMP-028. It layers on
**D-365** issued Financial Document immutability and applies to Financial Documents eventually
issued under **D-366** without changing RefundStatutoryDecision branch authority. **D-365** and
**D-366** remain CURRENT and unchanged in their respective authorities.

D-367 does **not** choose a vendor, create certificates/keys, or resolve Rule-46 Tax Invoice legal
applicability as a final legal conclusion. Architecture lock did not implement signing. The
ATTENDED_ASYNC manual signed-PDF MVP is documented later in this artifact and does not complete or
accept IMP-028.

### Legal / policy boundary

| Document class | BOBA signing policy | Classification |
|---|---|---|
| RECEIPT_VOUCHER | Signature or digital signature required | **CONSERVATIVE_PRODUCT_POLICY** |
| REFUND_VOUCHER | Signature or digital signature required | **CONSERVATIVE_PRODUCT_POLICY** |
| CREDIT_NOTE | Signature or digital signature required | **CONSERVATIVE_PRODUCT_POLICY** |
| TAX_INVOICE | Same SignatureArtifact mechanism as RV/RFV/CN | **REQUIRED_BY_BOBA_PRODUCT_POLICY** |
| BILL_OF_SUPPLY | Signing policy unresolved | **FAIL_CLOSED** |

TI / RV / RFV / CN `signatureRequirement` = **REQUIRED**. `BILL_OF_SUPPLY` remains unresolved /
fail-closed under D-367.

Tax Invoice legal nuance (do not conflate):

```text
TAX_INVOICE_SIGNATURE_LEGAL_APPLICABILITY: UNRESOLVED_RULE46_EXCEPTION
TAX_INVOICE_SIGNING: REQUIRED_BY_BOBA_PRODUCT_POLICY
```

Rule 46 contains an electronic-invoice signature exception whose applicability to BOBA's current
generated PDF remains unresolved. BOBA product policy requires TAX_INVOICE signing through the same
mechanism as other signed statutory documents. This is **not** `GST_REQUIRES_TI_SIGNATURE`.

### Insufficient visual substitutes (BOBA product policy)

BOBA does **not** treat any of the following as sufficient statutory signing authority:

- typed supplier name
- “Authorised Signatory” text
- pasted JPEG/PNG signature image
- scanned / facsimile signature image
- system-generated footer

Classification: **BOBA_COMPLIANCE_PRODUCT_POLICY**. D-367 does **not** independently prove every
such mechanism categorically invalid under GST law.

### Document Signer Certificate boundary

Document Signer Certificate may **not** be used as the sole authority for a signature that BOBA
requires to be the signature/digital signature of the supplier or authorised representative.

```text
DOCUMENT_SIGNER_AS_SOLE_SIGNATURE_AUTHORITY: PROHIBITED
```

CCA distinguishes Document Signer automated organisational responses from the signature of the
authorised signatory. Do **not** encode `DOCUMENT_SIGNER_CERTIFICATE = AUTHORISED_SIGNATORY_SIGNATURE`.

### Initial signing operating model

```text
INITIAL_SIGNING_OPERATING_MODEL: ATTENDED_ASYNC_SIGNING
```

Launch model token: **ATTENDED_ASYNC**. Sequence:

```text
commercial event completes
→ FinancialDocument statutory facts + number seal automatically
→ SignatureArtifact PENDING
→ authorised signatory performs permitted signing action
→ exact signed artifact is persisted/sealed
→ SignatureArtifact SIGNED
→ statutory PDF becomes customer-downloadable
```

Payment and Order truth must never roll back because signing is pending or fails.

D-367 does **not** bind a specific CA/ESP/provider. Fully unattended authorised-signatory signing is
**not** currently proven. Future provider/model proving lawful unattended semantics requires explicit
policy/governance review before activation.

### FinancialDocument ISSUED semantics

`FinancialDocument.status=ISSUED` means statutory commercial/tax facts + statutory number +
`issueAt` have been durably sealed under D-365.

It does **not** mean the required signed customer artifact is already ready.

Separate concept:

```text
STATUTORY_ARTIFACT_READY
IFF
SignatureArtifact.status=SIGNED
```

Do **not** mutate `FinancialDocument.status` for signing. Preserve ARCH-G16 issued-FD immutability.

### issueAt vs signedAt

```text
ISSUEAT_SIGNEDAT_POLICY: SEPARATE_ACTUAL_FACTS
```

- `FinancialDocument.issueAt` — existing D-365 successful statutory FD issuance boundary.
- `SignatureArtifact.signedAt` — actual successful signature completion time.

Never backdate `signedAt` to `issueAt`. Never rewrite `issueAt` to hide signing delay. `issueAt`
may precede `signedAt`. For Receipt Voucher, BOBA operational policy should target signature
completion contemporaneously where practical and no later than the same business-day signing cycle
(**OPERATIONAL_COMPLIANCE_POLICY**, not **STATUTORY_MAXIMUM_DELAY**). Do not encode a statutory
minute/hour maximum or claim GST expressly defines the same-business-day limit.

### AuthorisedSignerProfile

Separate effective-dated **AuthorisedSignerProfile** authority conceptually distinct from
IssuerProfile GST/tax-registration facts. Must support:

- signer identity
- organisational authorisation
- `effectiveFrom` / `effectiveTo`
- permitted signing mechanism
- historical authorisation evidence
- certificate / eSign identity linkage as applicable

Historical signed artifacts must seal sufficient signer authority to remain independent of today's
employee/profile state. Working-tree persistence implements AuthorisedSignerProfile; production
profiles remain a deployment gate (do not fabricate).

### Signature method / custody boundaries

**Prohibited:**

- BOBA server retaining an employee/personal subscriber private key merely to automate signing
- shared employee/personal DSC
- unattended PIN/token automation intended to bypass subscriber control
- Document Signer Certificate as sole authorised-signatory substitute

**Allowed conceptually (subject to deployment evidence):**

- authorised subscriber DSC path compliant with applicable custody
- CCA-recognised eSign path
- CCA-recognised remote-key-storage path
- future external signing provider only after deployment evidence proves authorised-signatory and
  custody semantics

Initial model remains **ATTENDED**. Do not select provider in D-367.

### SignatureArtifact authority

Exactly one durable SignatureArtifact authority per FinancialDocument when signing is required by
BOBA policy.

Conceptual lifecycle:

```text
PENDING → SIGNED
```

Retry/failure states allowed: `FAILED_RETRYABLE`, `REJECTED`. Success is immutable / write-once.

Minimum conceptual authority:

- `financialDocumentId`
- `signatureRequirement`
- `status`
- `artifactContentHash`
- `immutableObjectReference`
- `signedAt`
- `signatureMethod`
- `signerProfileId` / sealed signer authority
- certificate/signature verification evidence
- provider transaction/reference where applicable
- signature profile

No schema in D-367.

### Durable exact-byte artifact

Signed PDF exact bytes matter. Once successfully signed:

- exact signed bytes must be durably preserved
- SHA-256 content hash must be sealed (`artifactContentHashAlgorithm = SHA-256`)
- stored signed object must not be overwritten
- customer retrieval must return the exact signed artifact
- regenerating semantically equivalent PDF is **not** equivalent to the original signed artifact

D-365 FinancialDocument remains statutory fact authority. SignatureArtifact becomes authority for
signature state, signed exact-byte artifact, and signer/signature verification evidence.

### Storage abstraction

Vendor-neutral immutable artifact-storage capability. Required conceptual operations:

- `putImmutable(bytes) → objectRef`
- `getExact(objectRef) → exact bytes`
- verify content hash
- no overwrite
- retention support

Do **not** select DigitalOcean Spaces, S3, filesystem, or another production object store in
D-367 as a binding vendor. Production object-storage backends remain deferred.

Accepted MVP durable signed-artifact storage (working tree; does not supersede the vendor-neutral
abstraction):

```text
PostgreSQL BYTEA
putImmutable / getExact / SHA-256 verify / no overwrite
opaque artifact:<uuid> references
```

This is the launch backing store, not a claim that BYTEA is the long-term production object store.

### Manual signing MVP

Operational path:

```text
FinancialDocument
→ unsigned PDF operator export
→ authorised human signs externally
→ operator-attested signed PDF upload
→ exact bytes stored durably
→ SignatureArtifact SIGNED
→ customer receives exact stored signed bytes
```

Operator CLI: `npm run fd:signing` (`pending` / `export` / `upload --attest-signed-artifact`).

- BOBA performs **no** cryptographic signing.
- No private key / PFX / PKCS12 / PIN / HSM / DSC / eSign / ESP signing integration is configured
  for this MVP.
- Durable operator attestation is distinct from `signature_profile`.
- BOBA performs PDF-container validation and SHA-256 byte integrity checks.
- That is **not** claimed as cryptographic signature verification / PAdES parsing.

Successful signed artifact authority is immutable / write-once. `issueAt` and `signedAt` remain
separate actual facts; `signedAt` is never backdated. Customer required-document PDF is
unavailable until `SignatureArtifact.status=SIGNED`.

### Customer access

For documents whose BOBA `signatureRequirement=REQUIRED`:

```text
FinancialDocument exists + SignatureArtifact not SIGNED
→ statutory signed-PDF download DENIED
```

Ownership/non-oracle D-365 customer-access rules remain unchanged. Listing/document metadata may
expose the owned FD according to existing access policy but must not present an unsigned PDF as the
completed signed statutory artifact. After SIGNED, customer download returns the exact durable signed
artifact.

### Signing failure / recovery

Sign failure **must not** allocate another statutory number. One FD → one SignatureArtifact authority
slot. Retries may create attempt/audit records but must converge on at most one successful immutable
artifact authority.

Recovery handles: signer rejection, authentication failure, provider outage, external sign success /
storage failure, storage success / DB association failure, certificate expiry before retry, authorised
signer change before retry.

Recovery reconciles using `financialDocumentId`, provider transaction/reference where applicable, and
artifact hash/object reference. No second statutory number. No second competing successful signed
artifact.

### Payment / Order workflow independence

Preserve accepted workflows:

```text
Payment SUCCEEDED → RECEIPT_VOUCHER FinancialDocument issuance
Order FULFILLED → TAX_INVOICE FinancialDocument issuance
```

Commercial transitions remain independent from signing. Under D-367, Payment/Order event → FD
facts/number seal automatically → signing may remain PENDING. Signing failure/wait does not roll back
Payment, Order, or renumber FD. Customer signed-PDF delivery waits for SIGNED.

### Receipt Voucher operational signing target

Because Receipt Voucher is tied to receipt of advance:

```text
RECEIPT_VOUCHER_SIGNING_TARGET: SAME_BUSINESS_DAY_OPERATIONAL_POLICY
```

For initial attended model: target completion no later than same business-day signing cycle.
Classification: **OPERATIONAL_COMPLIANCE_POLICY**, not **STATUTORY_MAXIMUM_DELAY**. Pending RV
signatures tracked operationally in later implementation. No scheduler/operator tooling in D-367.

### Long-term verification

Signed statutory PDF must support durable later verification. Preferred PDF signature profile:
PAdES-compatible PDF-embedded CMS/PKCS#7 with long-term verification evidence. LTV is a BOBA
architecture requirement/recommended baseline as governance determines. LTA / trusted timestamp
recommended where deployment supports it. Do **not** state GST law mandates PAdES or LTA. Preserve
certificate/revocation/timestamp evidence sufficient for chosen verification profile.

### HTML projection

HTML remains informational deterministic projection. HTML is not the durable cryptographically signed
statutory artifact. Do not require signing HTML absent separate authority. Customer-facing statutory
signed-PDF action remains gated by SignatureArtifact.

### D-366 relationship

D-366 remains CURRENT and unchanged. D-367 does **not** implement RefundStatutoryDecision. When D-366
later results in REFUND_VOUCHER or CREDIT_NOTE, the resulting FinancialDocument inherits D-367 signing
requirements. D-367 does not select the RFV/CN branch. D-366 does not select signing authority.

### Deployment gates

Production signing activation requires explicit inputs including:

- authorised representative identity
- organisational authority/evidence
- selected permitted signing mechanism
- CA / ESP / provider where applicable
- certificate/eSign identity
- custody model
- immutable artifact-store implementation
- long-term verification/timestamp configuration as applicable

Do **not** fabricate values. Do **not** seed production configuration. Production signing
provider is intentionally not configured; attended external/manual signing is the MVP launch
mechanism.

### Persistence requirement

Future forward-only persistence is required for at least:

- AuthorisedSignerProfile authority
- SignatureArtifact authority
- signed artifact storage refs/hash/evidence
- recovery/idempotency fields as required

```text
NEW_MIGRATION_REQUIRED: YES
NEW_MIGRATION_CREATED_AT_ARCHITECTURE_LOCK: NO
```

Working-tree persistence later added signature foundation, hash integrity, BYTEA signed-artifact
storage, and operator attestation (migrations `0023`–`0026` and related). That does not mark
IMP-028 complete or accepted. Migration `0022_financial_document_non_signature_compliance`
remains unchanged.

### D-367 non-goals

D-367 does **not**:

- implement signing
- choose signing vendor
- create certificate/key custody
- permit Document Signer as authorised-signatory substitute
- claim unattended signing is proven
- implement artifact storage
- create signing migration
- implement D-366
- alter RefundStatutoryDecision
- implement IMP-029
- mark IMP-028 complete
- resolve Rule-46 TI exemption as a legal conclusion

### Compliance status under D-367

```text
FD_NON_SIGNATURE_COMPLIANCE_CORRECTION: COMPLETE
SIGNATURE_COMPLIANCE: GAP
PRE_EXISTING_IMP028_COMPLIANCE_DEFECT: YES
```

`FD_NON_SIGNATURE_COMPLIANCE_CORRECTION: COMPLETE` records non-signature mandatory-particular
correction (migration 0022). `SIGNATURE_COMPLIANCE: GAP` records that unattended authorised-
signatory DSC/eSign/HSM signing and cryptographic signature verification remain deferred, and that
IMP-028 signing has not been independently accepted. The manual signed-PDF MVP is implemented in
the working tree; do not mark compliance PASS or IMP-028 complete until independently accepted.

---

## 12. Checkout Interaction

Checkout Snapshot remains authoritative commercial transaction truth.

Do **NOT** turn Checkout Snapshot into the statutory document engine.

Financial Document consumes sealed Checkout commercial facts. Where statutory document lines
require facts not currently sealed by Checkout Snapshot—such as SAC/HSN or required line-level tax
component breakdown—the Financial Document issuance process seals those compliant historical
document facts using the effective tax profile and canonical Checkout totals.

If compliant document facts cannot be produced without inventing values: **FAIL CLOSED**.

Do not silently alter Checkout authority.

---

## 13. Payment Interaction

Payment remains original collection truth (**ARCH-G06**).

Financial Document may reference Payment identity/facts for issuance context (for example advance
receipt or invoice-at-payment). Payment status is not rewritten by document issuance. Provider
receipt identifiers and Razorpay identifiers must **not** become GST / statutory document numbers.

---

## 14. Order Interaction

Order remains post-purchase business / fulfilment lifecycle truth (**ARCH-G07**).

Financial Document may relate to Order for customer access and business correlation. Document
issuance must not automatically rewrite Order status. Historical document access may survive later
Order lifecycle changes where retention policy permits.

---

## 15. Immutable Document Snapshot

Once issued, a Financial Document seals historical:

- document identity / type
- statutory / public number
- issue date/time
- financial year
- supplier facts
- applicable recipient facts
- commercial lines
- taxable values
- discounts / charges
- tax classification / rates / components
- currency
- authority references
- relevant prior Financial Document references
- applicable compliance / profile facts

Issued Financial Documents must **not** be reconstructed from mutable current:

- menu / catalog
- customer profile
- legal-entity profile
- tax configuration
- Payment state
- Refund state
- Order state

---

## 16. Line-Level Tax / Document Facts

Where statutory lines require facts beyond Checkout Snapshot seal (SAC/HSN, tax-component
breakdown, etc.), issuance seals those facts from the effective tax profile + canonical Checkout
totals into the Financial Document snapshot.

Missing required line facts → fail closed. Do not invent rates, SAC/HSN, or place of supply.

---

## 17. Numbering / Idempotency

Financial Document owns statutory numbering semantics.

Requirements:

- configured legal-entity / document-type / FY series as applicable
- concurrency-safe allocation
- allocation associated atomically with durable issuance
- immutable issued number
- no number reuse
- retry of same logical issuance must not mint a duplicate document
- `ORD-*` must not become statutory invoice/document number
- Razorpay receipt / provider identifiers must not become GST document numbers

Do not create unsupported legal claims about sequence gaps. Operational handling of
reserved/gapped numbers must remain separately defined where needed.

---

## 18. B2C Boundary

Current BOBA Direct product remains **B2C**.

Do **NOT** introduce B2B customer-GSTIN capture in IMP-028 architecture.

Do **NOT** assume ordinary B2C requires IRN merely because an e-invoice turnover threshold is
crossed.

---

## 19. Dynamic QR Conditional Boundary

Dynamic QR applicability is **conditional compliance configuration**.

Do **NOT** assume BOBA exceeds the applicable threshold. Threshold / applicability remain
production / accountant gates.

---

## 20. Rendering Boundary

Financial Document data is authority.

PDF / HTML / customer rendering is projection.

Architecture permits deterministic rendering from sealed authority and may persist artifact
metadata/hash for audit/performance.

Rendered bytes must **not** become the only source of financial-document truth.

Exact PDF library / UI components are implementation choices and are **not** selected here.

---

## 21. Customer-Access Boundary

IMP-028 may define customer financial-document access boundaries.

Conceptually:

- authenticated customer
- ownership validation
- Order / document relationship
- view / download
- avoid sequential-document enumeration vulnerabilities
- do not expose Razorpay / provider IDs
- retain historical access despite later Order lifecycle changes where retention policy permits

Do **NOT** implement Ops Console functionality. IMP-029 / IMP-030 boundaries remain intact.

Exact HTTP route names are not selected here.

Customer access requires exact ownership proof through the sealed Checkout / Order CustomerActor
graph. Unknown, unauthorized, and non-owned documents converge to `DOCUMENT_NOT_FOUND`
(**non-oracle**). Do not expose existence, provider ids, or sequential-document enumeration.

---

## 22. Retention / Security Considerations

Financial-document statutory retention is separate from customer-profile lifecycle.

Issued financial-document history may need to survive:

- customer profile edits
- account deletion / anonymization workflows
- Order lifecycle changes
- tax-profile changes

Detailed privacy-erasure implementation remains future implementation / security work. Architecture
requires the retention boundary to be acknowledged so later privacy work does not casually destroy
issued document authority.

---

## 23. Production / Configuration Gates

The following remain unresolved production/configuration gates and **MUST NOT** be silently marked
resolved by this architecture lock:

- actual production GSTIN
- GST legal name
- registered address
- state / state code
- regular / composition status
- registration effective dates
- accountant-confirmed BOBA tax classification
- SAC / rate / ITC treatment
- accountant-confirmed advance-vs-invoice-at-payment policy
- operational supply-date interpretation
- turnover / Dynamic QR applicability
- document numbering-series configuration
- BoS-only adjustment/reversal treatment if that path is enabled

---

## 24. Explicit Non-Goals

- IMP-028 product implementation in this lock
- Ops Console document actions (IMP-029 / IMP-030)
- B2B customer GSTIN capture
- inventing `TAX_RECEIPT` as a statutory type
- automatic Section 34 Credit Note against BoS-only supply
- inventing unnamed statutory reversal documents
- rewriting Checkout Snapshot / Payment / Refund / Order authorities
- selecting final production tax policy in D-365
- hard-coding production GSTIN / registration facts
- using provider / Order identifiers as GST document numbers
- treating rendered PDF bytes as sole document truth
- IRN / e-invoice as ordinary B2C requirement by assumption
- Dynamic QR as unconditionally required
- new deployable microservice for documents (ARCH-G02 / ARCH-G14)
- accepting IMP-026 / IMP-026C / IMP-027
- treating implementation authorization as implementation start, complete, or acceptance
- starting IMP-029

---

## 25. Architecture-Level Acceptance / Proof Requirements

When implementation is later authorized and completed, acceptance evidence must prove at least:

| ID | Requirement |
|---|---|
| FD-01 | Financial Document is first-class durable authority |
| FD-02 | Issued documents are immutable; no reconstruction from mutable current config/catalog/profile/Payment/Refund/Order |
| FD-03 | Checkout Snapshot / Payment / Refund / Order authorities unchanged by issuance |
| FD-04 | Supported statutory classes only; no `TAX_RECEIPT` statutory type |
| FD-05 | Section 34 Credit Note requires prior Tax Invoice(s); BoS-only Credit Note prohibited / fail-closed |
| FD-06 | Receipt Voucher / Refund Voucher advance path representable as policy variant |
| FD-07 | Invoice-at-payment + Credit Note path representable as policy variant |
| FD-08 | Incomplete issuer/tax configuration fails closed |
| FD-09 | Numbering concurrency-safe, atomic with issuance, no reuse; ORD-* / provider ids not GST numbers |
| FD-10 | Idempotent logical issuance does not mint duplicates |
| FD-11 | Refund PENDING / INDETERMINATE / FAILED yield no final reversal document |
| FD-12 | Rendering is projection; sealed data remains authority |
| FD-13 | Customer access ownership-validated; no provider-id exposure; no sequential enumeration |
| FD-14 | B2C boundary retained; no B2B GSTIN capture |
| FD-15 | Production GST / policy gates remain explicit configuration gates |
| FD-16 | No Ops Console scope theft |
| FD-17 | No new deployable document service |

Proof layers are expected to include domain, persistence, transport (customer access only as
scoped), rendering projection checks, governance/architecture, and negative security evidence where
relevant. Exact test file names are not locked here.

---

## 26. Architecture Invariants

| ID | Invariant |
|---|---|
| FD-I01 | Financial Document is sole issued statutory/financial-document authority |
| FD-I02 | Issued Financial Documents are immutable sealed historical truth |
| FD-I03 | Checkout Snapshot remains commercial truth; not the statutory engine |
| FD-I04 | Payment remains original collection truth |
| FD-I05 | Refund remains financial-reversal truth; document policy consumes Refund facts without rewriting Refund lifecycle |
| FD-I06 | Order remains fulfilment/business lifecycle truth |
| FD-I07 | No statutory type named `TAX_RECEIPT` |
| FD-I08 | Section 34 Credit Note requires prior Tax Invoice(s) |
| FD-I09 | BoS-only automatic Credit Note is prohibited; fail closed |
| FD-I10 | Incomplete issuer/tax configuration fails closed |
| FD-I11 | Rendering is projection, not authority |
| FD-I12 | ORD-* and provider identifiers are not GST document numbers |
| FD-I13 | B2C boundary: no customer GSTIN capture in IMP-028 |
| FD-I14 | No new deployable Financial Document service |

Global architecture additions:

- **ARCH-G16**: Once a statutory Financial Document is issued, its sealed commercial, tax, issuer,
  recipient, numbering, and authority-linkage facts are immutable historical document truth and must
  not be reconstructed from mutable current catalog, customer profile, tax configuration,
  legal-entity configuration, Payment state, Refund state, or Order state.
- **ARCH-G17**: RefundStatutoryDecision owns durable statutory-reversal classification; must not
  rewrite Refund money truth or mutate issued Financial Documents.
- **ARCH-G18**: SignatureArtifact owns durable signature state and exact-byte signed statutory
  artifact authority; must not rewrite Financial Document sealed issuance facts or Payment/Order
  commercial truth; **STATUTORY_ARTIFACT_READY** iff `SignatureArtifact.status=SIGNED`.

---

## 27. Open Questions

```text
(none)
```

All material questions required for architecture lock are resolved. Production GST values and
final production tax-policy selection remain explicit configuration / accountant gates (not open
architecture questions). Implementation is `COMPLETE_AND_ACCEPTED` under GTM-R30. Working-tree
`IMP-028_IMPLEMENTATION_COMPLETE` is **YES**. Formal `acceptedThrough` is IMP-028.
`IMP-028_ACCEPTED` is **YES**. Formal acceptance does not resolve production GST/accountant gates
and does not authorize IMP-029.

---

## 28. Implemented functional flow

```text
Payment SUCCEEDED
→ RECEIPT_VOUCHER

Order FULFILLED
→ TAX_INVOICE

Refund PROCESSED
→ RefundStatutoryDecision PENDING

operator finalization
→ RFV / CN / NSD

PARTIAL RFV/CN
→ RefundStatutoryIssuanceAllocation

RFV/CN
→ FinancialDocument issuance
→ decision ISSUED

required signature
→ external manual signing
→ signed upload
→ exact signed customer artifact
```

Idempotency / recovery (appropriate level):

- Payment SUCCEEDED → Receipt Voucher and Order FULFILLED → Tax Invoice run **after** the
  commercial commit. Failure does not roll back Payment/Order. Operator recovery:
  `financial-document:recover-missing-receipt-vouchers` /
  `financial-document:recover-missing-tax-invoices`.
- Exact retry of the same logical issuance key returns the same Financial Document / number.
- Concurrent equivalent issuance produces one FD/number.
- RefundStatutoryDecision is 1:1 with Refund; PENDING ensure is idempotent.
- BRANCH_FINALIZED / ISSUED / allocation / SIGNED success are write-once; exact retry returns the
  sealed authority.
- RFV/CN issuance, numbering, and decision ISSUED share one PostgreSQL transaction; rollback
  leaves no mismatch. Nested Persistence transactions remain unsupported.
- D-362-style recovery consumes sealed decision authority and never recalculates a FINALIZED
  branch. No scheduler / queue / worker is introduced for these statutory flows.

## 29. Non-functional requirements

At minimum:

- immutable statutory history;
- transactional statutory numbering;
- integer monetary / tax arithmetic (paise + basis points);
- deterministic immutable-source rendering;
- exact-byte signed artifact preservation;
- SHA-256 integrity verification;
- write-once successful signature authority;
- idempotency;
- real PostgreSQL concurrency safety;
- atomic transaction rollback;
- exact ownership authorization;
- customer non-oracle behavior;
- historical independence from mutable current menu / customer / tax configuration;
- Payment / Order independence from downstream statutory / signing failure;
- fail-closed behavior when statutory authority is incomplete.

## 30. Deferred capabilities / non-goals

The following are **deferred**, not implementation defects:

- unattended authorised-signatory DSC / eSign / HSM signing;
- ESP / signing-provider integration;
- certificate renewal / revocation automation;
- cryptographic signature verification / PAdES parsing;
- PAdES / LTV / LTA archival automation;
- dedicated object-storage signed-artifact backend;
- signing SLA alerts / escalations;
- automatic RFV / CN / NSD classification;
- automatic Section-34 inference;
- generic proportional partial allocator;
- additional NSD reason codes;
- operator signing web UI;
- scheduler / queue / worker for these statutory flows;
- IMP-029 work.

## 31. Deployment gates

Documented separately from code defects. Do not fabricate values to make acceptance green.

- Real production `AuthorisedSignerProfile` must be supplied.
- Production issuer profile / statutory numbering activation requires explicit deployment inputs
  (GSTIN, legal name, address, scheme, numbering series, `uninvoiced_advance` enablement, etc.).
- Production signing provider is **intentionally not configured**.
- Attended external / manual signing is the MVP launch mechanism.
- See also §23 production / configuration gates and D-367 deployment-gate list.

Supporting operator commands live in [`../../../scripts/financial-document/README.md`](../../../scripts/financial-document/README.md).
Operating constraints: [`../accepted-foundation-operating-rules.md`](../accepted-foundation-operating-rules.md).

## 32. Governance / acceptance distinction

```text
implementation-slice acceptance
!=
formal acceptedThrough advancement
```

Working-tree completion vs formal sequential acceptance:

```text
acceptedThrough = IMP-028
pendingAcceptance = NONE
currentProductSlice = NONE
nextProductSlice = IMP-029
IMP-028_IMPLEMENTATION_COMPLETE = YES
IMP-028_ACCEPTED = YES
IMP-029 = NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED = NO
IMP-029_STARTED = NO
D366_FINAL_ISSUANCE = ACCEPTED
IMP028_CODE_COMPLETE = YES
IMP028_STATUTORY_PATH_COMPLETE = YES
IMP028_TESTS_COMPLETE = YES
IMP028_DOCUMENTATION_COMPLETE = YES
```

IMP-028 is formally accepted. `acceptedThrough` has advanced to IMP-028. IMP-029 remains
`PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`. Formal acceptance of IMP-028 does not authorize
IMP-029.

---

## Appendix A — Compatibility with Existing Global Invariants

| Invariant | Compatibility |
|---|---|
| ARCH-G05 Checkout Snapshot | Preserved; Financial Document consumes sealed commercial facts |
| ARCH-G06 Payment | Preserved; documents do not rewrite collection truth |
| ARCH-G07 Order | Preserved; documents do not own fulfilment lifecycle |
| ARCH-G15 Refund | Preserved; D-364 unchanged; documents may consume Refund facts |
| ARCH-G14 | No speculative duplicate commercial snapshot hierarchy; Financial Document is distinct statutory authority |
| ARCH-G02 | No automatic new deployable service |
