---
Status: Canonical index
Last updated: 2026-09-07
---

# BOBA Bear Platform Documentation

## Authority stack (CURRENT)

Read these first. They are the only CURRENT answers to their owned questions:

| Document | Owns |
|---|---|
| [`VISION.md`](./VISION.md) | WHY — product intent / GTM outcome / Non-Goals |
| [`ROADMAP.md`](./ROADMAP.md) | WHEN — IMP identity / sequence / lifecycle / GTM boundary |
| [`STATE.md`](./STATE.md) | Accepted/current reality |
| [`PRODUCT-DELIVERY.md`](./PRODUCT-DELIVERY.md) | HOW product work is defined/delivered (PD-1) |
| [`product/`](./product/README.md) | WHO / JOURNEYS / STORIES — personas, Golden Journeys, per-IMP Product Definitions |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Technical invariants / current durable global architecture |
| [`decision-register.md`](./decision-register.md) | Binding decisions (+ ADR status) |
| [`TESTING.md`](./TESTING.md) | How behaviour is proven (TEST-1) |
| [`capabilities/`](./capabilities/) | Locked capability architectures (IMP-024 onward) |
| [`../../AGENTS.md`](../../AGENTS.md) | Agent execution / safety / provenance |
| [`history/`](./history/README.md) | Exact prior ROADMAP/STATE snapshots (HISTORICAL SUPPORTING EVIDENCE; not CURRENT lifecycle) |

[`ROADMAP.md`](./ROADMAP.md) and [`STATE.md`](./STATE.md) are compact CURRENT authorities.
[`history/`](./history/README.md) preserves exact prior snapshots after authority-context
compression. Agents and humans should read history only when historical acceptance, provenance, or
revision evidence is materially required.

Delivery process for new substantial product work from IMP-036F:

```text
ANCHOR → DISCOVER → STORY_MAP → PRODUCT_DEFINITION_GATE → ARCHITECTURE_FIT
→ IMPLEMENT → PROVE → INDEPENDENT_REVIEW → FOUNDER_UAT (when required)
→ ACCEPT → RECONCILE → ADVANCE
```

These are process phases, not new ROADMAP lifecycle states. IMP-036E retains its existing lifecycle;
historical acceptance is not rewritten. Product behaviour is defined before architecture fit;
product documents cannot override technical/security/data authority or invent roadmap authorization.

```text
PRODUCT_DELIVERY_PROCESS_EFFECTIVE_FROM = IMP-036F
HISTORICAL_ACCEPTED_IMPS_REWRITTEN = NO
IMP036E_LIFECYCLE_CHANGED = NO
IMP036F_ACTIVATED = NO
```

A per-IMP [Product Definition](./product/templates/product-definition-template.md) is mandatory
from IMP-036F. PD-1 requires a Journey Gap Audit before public GTM cutover / IMP-040 acceptance;
that audit is not performed in Session 1. TEST-1's CI restructuring is TARGET until Session 3
implements it; this index makes no claim of full current CI enforcement.

Machine check: `npm run project:consistency`.

Governance fingerprint (`npm run governance:fingerprint`) covers CURRENT authorities including
`PRODUCT-DELIVERY.md` (PD-1), `TESTING.md` (TEST-1), all tracked Markdown under
[`product/`](./product/) recursively, all tracked Markdown under [`history/`](./history/)
recursively, plus the existing canonical/supporting governance set.
AGENTS is the agent execution contract; CLOSED historical one-active-slice exception detail lives
in ROADMAP/STATE history snapshots and is not restated in AGENTS.

Working-tree integrity: `npm run working-tree:fingerprint`. `WORKING_TREE_FINGERPRINT` is
content-sensitive across tracked and non-ignored untracked repository files (see `AGENTS.md`).
Default `git status --porcelain` is not exact-content authority for files beneath an already-untracked
directory.

## Recommended reading order

For IMP-036F onward, matching AGENTS:

1. [`AGENTS.md`](../../AGENTS.md)
2. [`VISION.md`](./VISION.md)
3. [`ROADMAP.md`](./ROADMAP.md)
4. [`STATE.md`](./STATE.md)
5. [`PRODUCT-DELIVERY.md`](./PRODUCT-DELIVERY.md)
6. Relevant per-IMP Product Definition under [`product/`](./product/README.md)
7. [`ARCHITECTURE.md`](./ARCHITECTURE.md)
8. [`decision-register.md`](./decision-register.md)
9. Relevant capability architecture under [`capabilities/`](./capabilities/) / ADRs under [`decisions/`](./decisions/)
10. [`TESTING.md`](./TESTING.md)
11. Task specification / relevant code
12. [`accepted-foundation-operating-rules.md`](./accepted-foundation-operating-rules.md) when touching accepted foundations; other supporting/historical documents as needed

For IMP-036E and earlier, retain the prior authority order with new process/Product Definition/
testing-policy steps omitted where `N/A — PRE-PD-1` applies. Large authorities can be verified
through metadata, targeted searches, and relevant ranges, as described in PD-1.

## Locked capability architectures

| Document | State | Notes |
|---|---|---|
| [`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-024 transport; implementation COMPLETE_AND_ACCEPTED |
| [`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-025 Customer Ordering UX; COMPLETE_AND_ACCEPTED |
| [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-026 Razorpay productionization & Payment GTM readiness (D-361 provider / D-362 missing-Order recovery / D-363 durable webhook inbox); COMPLETE_AND_ACCEPTED |
| [`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-026C pilot UX hardening; COMPLETE_AND_ACCEPTED (`IMP-026C_ACCEPTED: YES`) |
| [`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-027 Refund Foundation (D-364); COMPLETE_AND_ACCEPTED |
| [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-028 Invoice / Tax Receipt / Credit Note (D-365 Financial Document; D-366 RefundStatutoryDecision; D-367 statutory signing); COMPLETE_AND_ACCEPTED (`IMP-028_ACCEPTED: YES`) |
| [`capabilities/IMP-028A-food-direct-ux-foundation.md`](./capabilities/IMP-028A-food-direct-ux-foundation.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-028A Food Direct UX Foundation; COMPLETE_AND_ACCEPTED (`IMP-028A_ACCEPTED: YES`) |
| [`capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](./capabilities/IMP-028B-customer-menu-projection-and-discovery.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-028B Customer Menu Projection + Discovery; COMPLETE_AND_ACCEPTED (`IMP-028B_ACCEPTED: YES`) |
| [`capabilities/IMP-033-notification-foundation.md`](./capabilities/IMP-033-notification-foundation.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-033 Notification Foundation; COMPLETE_AND_ACCEPTED (`IMP-033_ACCEPTED: YES`) |
| [`capabilities/IMP-034-meta-whatsapp-cloud-api-adapter.md`](./capabilities/IMP-034-meta-whatsapp-cloud-api-adapter.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-034 Meta WhatsApp Cloud API Adapter; COMPLETE_AND_ACCEPTED (`IMP-034_ACCEPTED: YES`) |
| [`capabilities/IMP-035-initial-administration-capabilities.md`](./capabilities/IMP-035-initial-administration-capabilities.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-035 Initial Administration Capabilities; COMPLETE_AND_ACCEPTED (`IMP-035_ACCEPTED: YES`; Founder UAT PASS; D-373 / ARCH-R19) |
| [`capabilities/IMP-036-observability-operational-controls.md`](./capabilities/IMP-036-observability-operational-controls.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-036 Observability & Operational Controls; COMPLETE_AND_ACCEPTED (`IMP-036_ACCEPTED: YES`) |
| [`capabilities/IMP-036A-multi-portal-experience-foundation.md`](./capabilities/IMP-036A-multi-portal-experience-foundation.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-036A Multi-Portal Experience Foundation; COMPLETE_AND_ACCEPTED |
| [`capabilities/IMP-036B-customer-account-onboarding-address-location.md`](./capabilities/IMP-036B-customer-account-onboarding-address-location.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-036B Customer Account, Onboarding, Address & Location; COMPLETE_AND_ACCEPTED |
| [`capabilities/IMP-036C-customer-commerce-experience-v2.md`](./capabilities/IMP-036C-customer-commerce-experience-v2.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-036C Customer Commerce Experience V2; COMPLETE_AND_ACCEPTED |
| [`capabilities/IMP-036D-workforce-franchise-operations-v2.md`](./capabilities/IMP-036D-workforce-franchise-operations-v2.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-036D Workforce & Franchise Operations Portal V2; architecture LOCKED; COMPLETE_AND_ACCEPTED; AUTHORIZED / STARTED / COMPLETE (`IMP-036D_ACCEPTED: YES`; Founder UAT PASS) |
| [`capabilities/IMP-036E-store-operations-management.md`](./capabilities/IMP-036E-store-operations-management.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-036E Store Operations Management; architecture LOCKED; IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE; AUTHORIZED / STARTED / COMPLETE (`IMP-036E_ARCHITECTURE_LOCKED: YES`; Founder UAT required / NOT_STARTED) |

## Supporting documents

| Document | State | Notes |
|---|---|---|
| [`product-vision.md`](./product-vision.md) | SUPPORTING / HISTORICAL | Prefer `VISION.md` for CURRENT product vision |
| [`v1-product-scope.md`](./v1-product-scope.md) | SUPPORTING | Product-intent detail; not implementation status. Sequence → `ROADMAP.md`; acceptance → `STATE.md` |
| [`operating-model.md`](./operating-model.md) | SUPPORTING | Day-to-day fulfilment context; not IMP/status authority |
| [`organization-outlet-access-model.md`](./organization-outlet-access-model.md) | SUPPORTING | Org/outlet concepts; authorization CURRENT detail via ADR-005 + STATE |
| [`order-payment-delivery-model.md`](./order-payment-delivery-model.md) | SUPPORTING | Domain narrative; prefer ARCHITECTURE + STATE for current authority chain |
| [`architecture-foundation.md`](./architecture-foundation.md) | SUPPORTING / partially superseded on transport | Prefer `ARCHITECTURE.md` + D-356 / D-359 for static frontend / transport |
| [`architecture-readiness-review.md`](./architecture-readiness-review.md) | HISTORICAL readiness | Not a roadmap authority; GTM boundary → `ROADMAP.md` (IMP-040) |
| [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) | SUPPORTING / HISTORICAL | Open-decision notes; current IMP sequence → `ROADMAP.md` only |
| [`decision-register-historical.md`](./decision-register-historical.md) | HISTORICAL | D-001–D-355 inventory; CURRENT binding status → `decision-register.md` (canonical lowercase path; historical uppercase `DECISION-REGISTER.md` expectation retired for portability) |
| [`accepted-foundation-operating-rules.md`](./accepted-foundation-operating-rules.md) | SUPPORTING | Migrated AGENTS foundation constraints |
| [`engineering/change-workflow.md`](./engineering/change-workflow.md) | SUPPORTING | Bounded task, evidence, review, and promotion workflow; does not alter product acceptance authority |
| [`testing/`](./testing/README.md) | SUPPORTING ENGINEERING EVIDENCE | Repeatable test inventory, TEST-1 baseline, and CI gap analysis. Policy authority remains [`TESTING.md`](./TESTING.md). Does not activate IMP-036F or change acceptance. |
| [`experience/enterprise-experience/`](./experience/enterprise-experience/) | SUPPORTING PROGRAMME CONTRACT | Enterprise Experience Programme and IMP-036A–G experience contracts. Per-slice lifecycle authority = ROADMAP / STATE / relevant capability artifact; this index does not independently restate slice status. |
| [`experience/`](./experience/) | **SUPPORTING PRODUCT / EXPERIENCE MATERIAL** | BOBA Direct UX, brand, detailed [customer journey](./experience/customer-journey.md), gap map, and research. The [Food Direct planning lock](./experience/food-direct-product-architecture-lock.md) is supporting rationale. Per-slice lifecycle authority = ROADMAP / STATE / relevant capability artifact. Dated support/gap claims are historical observations, not current status. Binding decisions remain in decision-register; prospective product artifacts are indexed in [product/](./product/README.md). Index: [`experience/README.md`](./experience/README.md). |

## Superseded sequencing authority

| Document | State |
|---|---|
| [`implementation-roadmap.md`](./implementation-roadmap.md) | **SUPERSEDED** by [`ROADMAP.md`](./ROADMAP.md) (historical GTM-R1). Do not use for current implementation sequencing. |

## Architecture decision records

ADRs under [`decisions/`](./decisions/) preserve detailed rationale/history. Binding status and
supersession are owned by [`decision-register.md`](./decision-register.md). Notably:

- ADR-014 Route-Handler-as-canonical HTTP host → **SUPERSEDED** by D-356
- ADR-010 detailed kitchen workflow → **AMENDED** by D-357 (accepted Order lifecycle is IMP-023)
- ADR-005 historical six-role prose → **AMENDED** by D-358 (inventory is STATE/code)
- ADR-007 invoice intent remains CURRENT architecture intent; implementation = IMP-028 (`COMPLETE_AND_ACCEPTED`)
- ADR-009 Cashfree V1 provider / Hosted Checkout selection → **SUPERSEDED for current provider
  authority** by D-361 (Razorpay / Razorpay Standard Checkout); webhook acknowledgement /
  post-payment Order recovery refined by D-362; webhook acknowledgement timing / durable inbox
  refined by D-363; provider-neutral Payment remainder remains; IMP-026 COMPLETE_AND_ACCEPTED;

## Documentation update protocol

After an IMP becomes `COMPLETE_AND_ACCEPTED`, reconcile `STATE.md` / `ROADMAP.md` (and decisions /
architecture when durable global facts change), then run `npm run project:consistency` before
advancing to the next slice.
