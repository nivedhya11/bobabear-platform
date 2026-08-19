---
Status: Canonical index
Last updated: 2026-08-18
---

# BOBA Bear Platform Documentation

## Authority stack (CURRENT)

Read these first. They are the only CURRENT answers to their owned questions:

| Document | Owns |
|---|---|
| [`VISION.md`](./VISION.md) | Product intent / GTM outcome / Non-Goals |
| [`ARCHITECTURE.md`](./ARCHITECTURE.md) | Current durable global technical architecture |
| [`decision-register.md`](./decision-register.md) | Which decisions are binding (+ ADR status) |
| [`ROADMAP.md`](./ROADMAP.md) | IMP identity / sequence / lifecycle / GTM boundary |
| [`STATE.md`](./STATE.md) | Independently accepted current reality |
| [`capabilities/`](./capabilities/) | Locked capability architectures (IMP-024 onward) |
| [`../../AGENTS.md`](../../AGENTS.md) | Agent execution contract + pointers |

Operating lifecycle:

```text
ANCHOR → GATE → EXECUTE → PROVE → ACCEPT → RECONCILE → ADVANCE
```

Machine check: `npm run project:consistency`.

## Recommended reading order

1. [`VISION.md`](./VISION.md)
2. [`ROADMAP.md`](./ROADMAP.md)
3. [`STATE.md`](./STATE.md)
4. [`ARCHITECTURE.md`](./ARCHITECTURE.md)
5. [`decision-register.md`](./decision-register.md)
6. Relevant capability architecture under [`capabilities/`](./capabilities/) when implementing that IMP
7. Relevant ADRs under [`decisions/`](./decisions/)
8. Supporting / historical documents below as needed
9. [`accepted-foundation-operating-rules.md`](./accepted-foundation-operating-rules.md) when implementing against accepted foundations

## Locked capability architectures

| Document | State | Notes |
|---|---|---|
| [`capabilities/IMP-024-customer-ordering-transport.md`](./capabilities/IMP-024-customer-ordering-transport.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-024 transport; implementation COMPLETE_AND_ACCEPTED |
| [`capabilities/IMP-025-customer-ordering-ux.md`](./capabilities/IMP-025-customer-ordering-ux.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-025 Customer Ordering UX; COMPLETE_AND_ACCEPTED |
| [`capabilities/IMP-026-razorpay-productionization.md`](./capabilities/IMP-026-razorpay-productionization.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-026 Razorpay productionization & Payment GTM readiness (D-361 provider / D-362 missing-Order recovery / D-363 durable webhook inbox); COMPLETE_AND_ACCEPTED |
| [`capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](./capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-026C pilot UX hardening; IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE (`IMP-026C_ACCEPTED: NO`) |
| [`capabilities/IMP-027-refund-foundation.md`](./capabilities/IMP-027-refund-foundation.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-027 Refund Foundation (D-364); COMPLETE_AND_ACCEPTED |
| [`capabilities/IMP-028-invoice-tax-receipt-credit-note.md`](./capabilities/IMP-028-invoice-tax-receipt-credit-note.md) | CURRENT / ARCHITECTURE_LOCKED | IMP-028 Invoice / Tax Receipt / Credit Note (D-365 Financial Document; D-366 RefundStatutoryDecision; D-367 statutory signing); ARCHITECTURE_LOCKED; implementation AUTHORIZED / STARTED / IMPLEMENTATION_IN_PROGRESS; working-tree `IMP-028_IMPLEMENTATION_COMPLETE: YES`; `IMP-028_ACCEPTED: NO` |

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
- ADR-007 invoice intent remains CURRENT architecture intent; implementation = IMP-028
- ADR-009 Cashfree V1 provider / Hosted Checkout selection → **SUPERSEDED for current provider
  authority** by D-361 (Razorpay / Razorpay Standard Checkout); webhook acknowledgement /
  post-payment Order recovery refined by D-362; webhook acknowledgement timing / durable inbox
  refined by D-363; provider-neutral Payment remainder remains; IMP-026 COMPLETE_AND_ACCEPTED;

## Documentation update protocol

After an IMP becomes `COMPLETE_AND_ACCEPTED`, reconcile `STATE.md` / `ROADMAP.md` (and decisions /
architecture when durable global facts change), then run `npm run project:consistency` before
advancing to the next slice.
