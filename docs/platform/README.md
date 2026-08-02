---
Status: Canonical index
Last updated: 2026-08-01
---

# BOBA Bear Platform Documentation

## Purpose

This directory is the **canonical source of truth** for what BOBA Bear is building, why it is
being built, what currently exists in this repository, and how the platform is intended to grow
from a marketing website into a direct-to-consumer commerce and operations platform.

It exists so that founders, developers, designers, operators, and coding agents share one
consistent reference instead of reconstructing product and architecture intent from chat history,
older planning documents, or the implementation alone.

This documentation set records **approved direction**, distinguishes it clearly from
**provisional assumptions** and **open questions**, and states plainly what has been deliberately
**deferred**. It is written as durable project documentation, not as a summary of a conversation.

## Canonical documents

| Document | Covers |
|---|---|
| [`product-vision.md`](./product-vision.md) | What BOBA Bear is, the business rationale for a direct platform, and standardized terminology |
| [`v1-product-scope.md`](./v1-product-scope.md) | The first sellable release: customer experience, channels, and explicit scope boundaries |
| [`operating-model.md`](./operating-model.md) | How direct orders and aggregator orders are fulfilled day to day, including the kitchen dual-system reality and the initial Operations Console |
| [`architecture-foundation.md`](./architecture-foundation.md) | Approved architectural principles: modular monolith, relational data model, evolution of the existing Next.js application, and audit requirements |
| [`organization-outlet-access-model.md`](./organization-outlet-access-model.md) | Brand, organization, legal entity, territory, and outlet concepts; user/membership/role/permission model; catalog and pricing inheritance |
| [`order-payment-delivery-model.md`](./order-payment-delivery-model.md) | Cart and outlet boundaries, order ownership and snapshots, payment and settlement foundation, delivery model, and state domains |
| [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) | The phased evolution toward a full operations platform, and the complete list of unresolved decisions |
| [`decision-register.md`](./decision-register.md) | Structured, dated record of every major decision and its current status |

## Recommended reading order

1. [`product-vision.md`](./product-vision.md) — start here for business context and terminology.
2. [`v1-product-scope.md`](./v1-product-scope.md) — what the first sellable release must do.
3. [`operating-model.md`](./operating-model.md) — how that release is fulfilled operationally.
4. [`order-payment-delivery-model.md`](./order-payment-delivery-model.md) — how a single order moves through cart, payment, and delivery.
5. [`architecture-foundation.md`](./architecture-foundation.md) — the technical principles that must hold across all of the above.
6. [`organization-outlet-access-model.md`](./organization-outlet-access-model.md) — the multi-outlet and multi-organization foundation, including access control.
7. [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) — what comes after V1, and what is still unresolved.
8. [`decision-register.md`](./decision-register.md) — the authoritative, structured log behind everything above.

Anyone planning a specific piece of work (a feature, an integration, a data model) should read the
documents relevant to that area in full before writing a specification or code.

## Current-state summary

The repository currently contains a polished, statically exported marketing website — Next.js 16,
React 19, TypeScript, Tailwind CSS v4, and Framer Motion — deployed to GitHub Pages at
`https://thebobabear.in/`. It presents brand content, a menu (sourced from repository data), a
signature-drop countdown, merchandise teasers, an artist-collaboration teaser, and outbound
ordering links to Zomato, Swiggy, and WhatsApp. It has no backend, database, authentication, cart,
checkout, payment processing, order management, delivery orchestration, or administrative
operations capability. All of that is planned, none of it is built.

## Future-platform summary

BOBA Bear intends to build an independently owned **BOBA Bear direct platform** — a mobile-first
web application (PWA) plus WhatsApp-assisted ordering — that lets customers order food directly
from BOBA Bear rather than exclusively through aggregators. The first sellable release is scoped to
direct food ordering for one outlet in Dehradun. The underlying domain model is designed from the
outset to support multiple outlets, multiple operating organizations, and a future franchise
model, without requiring a foundational rebuild. Merchandise, gated drops, loyalty, a full
point-of-sale system, and franchise operations are explicitly future phases, not part of the first
release.

## Decision-status definitions

Every decision recorded in this documentation set, and in the [decision register](./decision-register.md),
carries one of the following statuses:

| Status | Meaning |
|---|---|
| **Locked** | Approved direction. Should not be casually reopened; changing it requires the [documentation update protocol](#documentation-update-protocol) below. |
| **Provisional** | A working assumption adopted so planning can proceed. Reasonable and currently in effect, but not yet validated against business, legal, or technical constraints, and may change without representing a reversal of a locked decision. |
| **Open** | Unresolved. Requires an explicit decision from a founder or accountable owner before related implementation can proceed. |
| **Deferred** | Explicitly out of scope for the current release. Will be reconsidered in a later phase; not forgotten, not rejected. |
| **Superseded** | Was previously Locked or Provisional and has been replaced by a later decision. Retained in the register for history, not deleted. |

## How stale and historical material is handled

Older planning documents, design-system drafts, wireframes, and mockups remain in the repository.
They are **not deleted**, because they retain reference value, but they are **not authoritative**.
The table below is the single, centralized status map for notable historical material — individual
historical files are not edited merely to add a warning.

| Location | Classification | Notes |
|---|---|---|
| `README.md` (repo root) | Current | Describes the shipped marketing site accurately; now links to this document set. |
| `AGENTS.md` / `CLAUDE.md` | Current | Framework-specific coding instructions remain in force; updated to point here for platform-level work. |
| `data/menu.json`, `lib/menuImages.ts`, `lib/site.ts` | Current | Live source data behind the shipped site; not platform data models. |
| `docs/missing-menu-images.md` | Current | Active photography checklist for the shipped site. |
| `Boba Bear Landing Page Wireframe Updated/Boba-Bear-Landing-Build-Guide.md` | Superseded | Locks in Next.js 15, Vercel hosting, and Plausible/PostHog analytics — all of which diverge from the shipped implementation (Next.js 16, GitHub Pages, GA4). Its information-architecture and "link-out only" ordering description are historically accurate for the marketing site but do not reflect platform direction. |
| `boba-bear-design-system.md` (repo root), `Updated_BOBA BEAR_ DESIGN SYSTEM (V1.1).md` | Reference only | Earlier design-system drafts. Superseded in detail by `Boba_Bear_Design_System_Updated/`, but both remain useful visual/brand references. |
| `Boba_Bear_Design_System_Updated/` (including `ui_kits/ordering-app/`) | Reference only | The most complete design-system reference, built without access to this codebase. Its ordering-app UI kit is a first-principles mockup and is **not** an adopted product specification — see [`v1-product-scope.md`](./v1-product-scope.md) and the [open decisions](./roadmap-and-open-decisions.md) for what is actually approved. |
| `Boba Bear Landing Page Wireframe Updated/` wireframe HTML files (v3–v8) and duplicate `menu.json` / design-system copies | Historical | Early iteration artifacts. Not imported by the application. Do not treat any copy outside `data/menu.json` as live menu data. |
| Root-level `robots.txt`, `sitemap.xml` | Needs reconciliation | Likely inert; the shipped site's `robots.txt`/`sitemap.xml` are generated by `app/robots.ts` / `app/sitemap.ts`. Not a platform-documentation concern, but flagged here so a future cleanup pass does not mistake either file for authoritative. |
| Root-level `*.png` design screenshots, `figma-sync/` | Reference only | Design-iteration and Figma-sync tooling; not shipped in the build. |

**When older repository documents conflict with `docs/platform/`, the canonical platform
documentation takes precedence unless a newer approved decision explicitly supersedes it.**

## Document ownership and maintenance

This documentation set is owned collectively by whoever holds product and technical decision
authority for BOBA Bear at a given time. There is no single named owner recorded in the repository;
until one is designated, any founder or lead engineer making a locked decision is responsible for
updating the relevant document and the decision register in the same change.

## Documentation update protocol

Future changes to product, business, or architectural direction must be documented using the
following protocol:

1. Update the relevant canonical document(s) under `docs/platform/` first.
2. Add or update the corresponding row in [`decision-register.md`](./decision-register.md).
3. If a decision replaces an earlier one, mark the earlier row **Superseded** — do not delete it.
4. Update cross-references in any other canonical document affected by the change.
5. Keep approved decisions (Locked) visibly separate from proposals or recommendations under
   discussion; do not record a recommendation as if it were approved.
6. Do not let application code become the only record of a product or business decision — if a
   decision is implemented, the documentation must say so explicitly.
7. Keep open decisions visible in [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md)
   until they are resolved; do not silently drop them.
8. Update documentation in the same change set as any material implementation change that acts on
   a platform decision.

## Instructions for future coding agents

Before planning or implementing any platform-level work (accounts, ordering, payments, outlets,
organizations, roles, or anything beyond the existing marketing site), read this document set in
full, starting with this file and following the recommended reading order above. Do not treat
`Boba Bear Landing Page Wireframe Updated/`, the design-system drafts, or the ordering-app UI kit
as approved specifications — they are historical or reference material as classified above. Where
this documentation marks a decision as **Open**, do not invent an answer; surface the question
instead. Where it marks a capability as **Deferred**, do not build it as part of V1 work unless a
new Locked decision in the [decision register](./decision-register.md) explicitly changes that.

## Related documents

All eight canonical documents listed above are part of this set. The repository root
[`README.md`](../../README.md), [`AGENTS.md`](../../AGENTS.md), and [`CLAUDE.md`](../../CLAUDE.md)
link back to this index for platform-level work.
