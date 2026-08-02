---
Status: Canonical
Last updated: 2026-08-01
---

# BOBA Bear — Product Vision

## Status

This document records **Locked** business direction (the reasons a direct platform is being
built, and the standardized terminology used across this documentation set) alongside a small
number of items marked **Provisional** where noted. It does not define feature scope — see
[`v1-product-scope.md`](./v1-product-scope.md) for that.

## What BOBA Bear is

BOBA Bear is a Dehradun, India-based food and beverage brand built around boba tea and Indo-Korean
street food, delivery-first, positioned as a premium lifestyle brand with a Gen Z audience. The
brand's current customer-facing presence is the marketing website at `https://thebobabear.in/`
(this repository), which presents the menu, a signature-drop countdown, merchandise teasers, and
an artist-collaboration teaser, and directs customers to place orders through aggregator apps or
WhatsApp.

This vision document, and the rest of `docs/platform/`, describes the platform BOBA Bear intends
to build **around and beyond** that marketing site: a direct ordering, fulfilment, and eventually
multi-outlet and franchise-capable commerce platform.

## Why a direct platform

BOBA Bear currently receives orders primarily through third-party aggregator applications. This
dependency carries structural costs:

- **Aggregator commissions reduce margins** on every order fulfilled through those platforms.
- **Aggressive platform discounts**, often set by the aggregator rather than BOBA Bear, reduce unit
  economics further.
- **Paid aggregator advertising** creates an ongoing customer-acquisition dependency rather than a
  durable, owned customer relationship.
- **Aggregators control much of the customer relationship and data** — BOBA Bear does not own the
  contact information, order history, or preferences of a customer who orders exclusively through
  a third party.

BOBA Bear is not abandoning aggregators. They remain a valid and continuing channel for customer
acquisition and incremental order volume. The strategic model is additive, not a replacement of one
channel by another:

```text
Aggregators acquire or introduce customers
                ↓
BOBA Bear direct platform retains customers
                ↓
Repeat orders, customer relationships, loyalty, drops, and merchandise
```

Aggregator participation is expected to continue indefinitely alongside the direct platform. This
documentation set does not describe, plan, or imply an end to aggregator participation.

## Terminology

The following terms are used consistently across every document in `docs/platform/`. Where a term
has a specific meaning in this documentation set, use only that meaning — do not substitute
informal synonyms in future documents or specifications.

| Term | Meaning |
|---|---|
| **BOBA Bear direct platform** | The independent, BOBA Bear-owned platform covering customer accounts, direct web ordering, WhatsApp-assisted ordering, menu and customization, cart and checkout, payments, direct-order operations, kitchen fulfilment, delivery orchestration, customer tracking, administrative operations, and future loyalty, merchandise, gated-drop, and point-of-sale capabilities. |
| **Aggregators** | External ordering platforms through which customers can order BOBA Bear food today — Zomato, Swiggy, Toing, and other platforms BOBA Bear may join in the future. |
| **Petpooja** | The point-of-sale system currently used to receive and manage orders that originate from aggregators. Petpooja is **not** part of the BOBA Bear direct platform and must not be described or designed as a dependency of direct ordering. |
| **Operations Console** | The BOBA Bear-owned interface used by outlet staff to receive and fulfil orders placed through the direct platform. The initial Operations Console is a focused fulfilment tool, not a complete point-of-sale system — see [`operating-model.md`](./operating-model.md). |
| **COCO** | Company-Owned, Company-Operated outlet — an outlet run directly by BOBA Bear's own operating organization, as distinct from a franchise outlet. |
| **Franchise outlet** | An outlet operated by an independent franchise organization under BOBA Bear's brand and platform policies. |
| **PWA** | Progressive Web App. The first direct customer channel is a mobile-first web application (PWA), not a native mobile application. See [`v1-product-scope.md`](./v1-product-scope.md). |

Additional domain-specific terms (Brand, Organization, Legal entity, Territory, Outlet, Membership,
Role, Permission/Capability) are defined in
[`organization-outlet-access-model.md`](./organization-outlet-access-model.md) and used consistently
from there onward.

## Product pillars

1. **Direct ordering** — customers can order food directly from BOBA Bear, on BOBA Bear-owned
   channels, without requiring an aggregator.
2. **Owned customer relationship** — customer identity, order history, and eligibility for future
   loyalty and gated drops belong to the BOBA Bear brand, not to an aggregator or to any single
   outlet.
3. **Operational simplicity at launch** — the first release must be fulfillable by a small team
   without requiring a full restaurant point-of-sale system or duplicate operational overhead
   beyond what is unavoidable during the transition period (see
   [`operating-model.md`](./operating-model.md)).
4. **Multi-outlet, multi-organization foundation** — the platform's domain model supports multiple
   outlets and operating organizations, and a future franchise model, from the start, even though
   the first release runs a single outlet under a single operating organization. See
   [`organization-outlet-access-model.md`](./organization-outlet-access-model.md).
5. **Category expansion over time** — food ordering is the launch category. Merchandise and gated
   limited drops are intended future categories, built on the same owned customer identity, but not
   necessarily the same cart or checkout flow — see
   [`v1-product-scope.md`](./v1-product-scope.md).

## Related documents

- [`docs/platform/README.md`](./README.md) — index, decision-status definitions, and stale-document map.
- [`v1-product-scope.md`](./v1-product-scope.md) — what the first sellable release built on this vision must include.
- [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) — how the platform is expected to evolve beyond V1, and what remains undecided.
- [`decision-register.md`](./decision-register.md) — structured record of the decisions summarized here.
