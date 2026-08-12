<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "PRODUCT_VISION",
  "version": "VISION-1",
  "lastReviewed": "2026-08-11"
}
-->

# BOBA Bear — Product Vision

## 1. Product Mission

BOBA Bear is building an owned direct-ordering platform through which customers can discover,
purchase, pay for, and follow BOBA Bear orders while giving the business an owned customer and order
relationship rather than relying exclusively on third-party marketplace platforms.

This mission is independent of any particular payment provider, cloud provider, delivery provider,
HTTP framework transport, or database implementation detail.

## 2. Problem We Are Solving

Orders today arrive largely through aggregators. That channel carries commissions, platform-set
discounts, paid acquisition dependency, and weak ownership of customer identity and order history.
BOBA Bear still expects aggregators to continue as an acquisition and volume channel. The direct
platform is additive: retain customers BOBA Bear already serves, own the relationship, and operate
direct orders safely.

## 3. Primary Users

- **Customers** — people discovering the brand, building carts, authenticating when required, paying,
  and tracking their orders.
- **Workforce operators** — outlet and brand staff who accept and fulfil direct orders, manage
  relevant commercial rules, and operate the platform within scoped authorization.
- **Platform operators** — the people who keep production payment, delivery, communication,
  security, observability, backup, and release controls safe enough for real traffic.

## 4. Product Outcome

Intended customer outcome (conceptual, not a claim of present completeness):

```text
Menu / discovery
→ Cart
→ authentication where required
→ Address
→ Serviceability
→ Checkout
→ Payment
→ Order confirmation
→ Order status / history
```

Intended business outcome (conceptual):

```text
configure sellable products
→ operate incoming Orders
→ manage relevant commercial rules
→ handle required delivery / communication
→ operate the production platform safely
```

A product outcome describes the intended end-to-end capability. It is **not** a claim that every
capability in that chain is already implemented or accepted.

## 5. V1 / GTM Definition

Public V1 GTM is defined by outcome, not by IMP numbers:

A real customer can complete an end-to-end owned BOBA Bear order; the business can safely operate
that order; production payment, delivery, and communication requirements are validated; required
financial documentation and recovery processes are addressed; and security, observability,
backup/recovery, infrastructure, support, and launch controls are sufficient for production
operation.

Current mapping of that outcome onto numbered slices lives only in
[`ROADMAP.md`](./ROADMAP.md).

## 6. Product Principles

1. **Owned customer relationship** — prefer BOBA Bear-owned identity, order history, and operating
   control over exclusive marketplace dependence.
2. **Single authority for business truth** — every material business fact has one canonical owner;
   other domains may reference or project it, not compete with mutable duplicates.
3. **Correctness before convenience** — pricing, tax, payment, authorization, and order lifecycle
   must be server-authoritative and fail closed when unsure.
4. **Incremental capability delivery** — ship one sequenced capability at a time; do not speculate
   entire platforms ahead of need.
5. **Production operability is part of GTM** — observability, backup/restore, security hardening,
   infrastructure, and launch controls are product requirements, not afterthoughts.
6. **Provider integrations stay adapters** — Cashfree, delivery partners, WhatsApp, and similar
   systems must not unnecessarily become core business authority.
7. **Future flexibility does not justify speculative present implementation** — deferred ideas are
   not license to build early.

## 7. Non-Goals

Current strategic non-goals (intentionally outside scope until strategy changes):

- Not a multi-restaurant marketplace.
- No onboarding of unrelated third-party restaurants.
- Not a speculative microservice platform.
- A domain capability does not automatically require a deployable service.
- V1 does not require multi-provider payment orchestration.
- V1 does not currently require international payments, EMI, BNPL, or COD.
- V1 does not currently require Loyalty / Rewards.
- Deferred capabilities may not be implemented opportunistically.

Technology-specific durable constraints live in [`ARCHITECTURE.md`](./ARCHITECTURE.md).

## 8. Deferred Capabilities

**NON-GOAL** = intentionally outside current strategic scope.

**DEFERRED** = potentially relevant later, but not currently authorized for implementation.

A deferred capability requires explicit ROADMAP promotion and locked architecture before
implementation. Present deferred / unscheduled examples include customer self-service cancellation,
quantitative inventory reservation, detailed kitchen fulfilment, loyalty/rewards, multi-provider
payments, international payments, EMI, BNPL, and COD. The current deferred list is owned by
[`ROADMAP.md`](./ROADMAP.md).

## 9. Long-Term Direction

Over time the platform may expand to multi-outlet and franchise-capable operations, richer
administration, merchandise and drops, and stronger retention programs — without abandoning the
owned direct-order core or turning BOBA Bear into a third-party restaurant marketplace.

## 10. Authority Boundaries

| Question | Authority |
|---|---|
| Why / GTM outcome / Non-Goals | **This document (`VISION.md`)** |
| IMP sequence / current slice | [`ROADMAP.md`](./ROADMAP.md) |
| What is accepted today | [`STATE.md`](./STATE.md) |
| Durable technical structure | [`ARCHITECTURE.md`](./ARCHITECTURE.md) |
| Which decisions are binding | [`decision-register.md`](./decision-register.md) |
| Agent operating rules | [`../../AGENTS.md`](../../AGENTS.md) |

This document does not own IMP numbering or current implementation state.
