---
Status: PLANNED PROGRAMME CONTRACT
Authority: SUPPORTING EXPERIENCE PLAN — ROADMAP owns identity and sequence; this artifact does not activate a slice
Canonical vision: docs/platform/VISION.md
Canonical sequence: docs/platform/ROADMAP.md
Canonical accepted state: docs/platform/STATE.md
Planned slices: IMP-036A → IMP-036G
Architecture: NOT_LOCKED
Implementation: NOT_AUTHORIZED / NOT_STARTED
Founder UAT required: YES for every IMP-036A → IMP-036G slice
Last reviewed: 2026-09-01
---

# Enterprise Experience Programme

## 1. Programme objective and authority boundary

Transform the technically capable but fragmented customer, workforce, and administration surfaces
into three coherent V1 applications over the same canonical BOBA Bear platform. The programme
prioritizes functional completeness, strong information architecture, usable workflows, consistent
interaction patterns, responsive behavior, accessibility, clear recovery, and professional baseline
quality.

This is a detailed **PLANNED** product/experience contract. It does not lock capability architecture,
authorize implementation, create a CURRENT decision, change accepted domain authority, or activate
any slice. Before each slice starts, its capability architecture must be reviewed and locked under
the repository lifecycle.

```text
acceptedThrough = IMP-036
currentProductSlice = NONE
pendingAcceptance = NONE
nextProductSlice = IMP-036A

IMP-036A → IMP-036G = PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED
IMP-037 = PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED
```

## 2. No-Figma product strategy

```text
FIGMA_REQUIRED_FOR_INITIAL_IMPLEMENTATION = NO
```

Initial experience authority, in descending order, is:

1. canonical repository product and domain architecture;
2. accepted capability behavior;
3. existing BOBA Bear design-system assets and tokens;
4. this programme and its slice UX/workflow contracts;
5. WCAG 2.2 AA and established enterprise interaction patterns where reasonably applicable.

Initial implementation is not a pixel-perfect final-design exercise. Founder/UI-team-approved Figma
may later refine visual hierarchy, layout detail, spacing, component aesthetics, typography,
iconography, motion, responsive nuance, and interaction polish. Pure visual or interaction refinement
should be a bounded amendment to the relevant accepted IMP-036x capability when it does not change
business meaning.

Figma must not silently redefine domain authority, lifecycle semantics, RBAC, business rules, API
authority, or provider authority. A design that introduces such semantics requires a new explicit
architecture/capability decision.

## 3. Three experience surfaces

### Customer application

Brand-led, mobile-first, discovery/conversion-oriented, and low-cognitive-load. Customer
restaurant/SEO metadata and promotional presentation belong only on this surface.

### Workforce / franchise application

Task-led, operational, high-frequency, information-dense, and permission-aware. “Franchise” is a
business persona, not a new RBAC role. It may share enterprise components with Administration but
must not inherit customer presentation.

### Administration application

Governance-led, hierarchy-aware, controlled, auditable, and safety-focused. Administration remains
distinct from Operations even when an authorized user can move between them.

The surfaces may remain in one repository, one Next application where the locked architecture
permits, and the existing runtime/deployment topology. No micro-frontends or new deployable services
are implied.

## 4. Target information architecture

```text
BOBA Bear
├── Home
├── Menu
├── Cart
├── Checkout
├── Orders
└── My BOBA
    ├── Profile
    ├── Addresses
    └── Orders

BOBA Operations
├── Today
├── Orders
├── Delivery
├── Store
│   ├── Overview
│   ├── Availability
│   ├── Assortment
│   ├── Operating Status
│   ├── Hours
│   └── Serviceability
├── Menu & Products
├── Pricing & Promotions
└── Operational Status

BOBA Administration
├── Overview
├── Organization
│   ├── Brands
│   ├── Organizations
│   ├── Territories
│   ├── Legal Entities
│   └── Outlets
├── Workforce
│   └── Memberships
├── Access
│   ├── Role Assignments
│   └── Effective Permissions
├── Audit
└── System
    └── Operational Status
```

These are navigation and workflow targets, not authorization bypasses or new domain truth.

## 5. Shared experience foundation

IMP-036A should establish reusable outcomes and interaction semantics without prematurely locking
exact visual composition:

- application shells, side/responsive navigation, top bar, page hierarchy, breadcrumbs, and an
  authorized context selector/switcher;
- `PageHeader`, `DataTable`, `FilterBar`, `StatusBadge`, `MetricCard`, pagination, tabs, and skeletons;
- `EmptyState`, `ErrorState`, `AccessDenied`, alert/feedback, mutation progress, and recovery patterns;
- form fields, drawers, confirmation dialogs, and accessible modal/dialog behavior;
- responsive and mobile navigation appropriate to each surface.

Component reuse is encouraged only where semantics and interaction needs match. Surface identity and
information hierarchy must remain distinct.

## 6. Cross-portal UX acceptance baseline

Every applicable workflow must account for loading, empty, error, retry/recovery, 401, 403,
non-disclosing 404, stale/concurrent mutation, mutation pending/success/failure,
disabled/unavailable states, and destructive confirmation. Controls and destinations derive from
effective permissions and scope; hiding a control never replaces direct-URL/API authorization.

All surfaces must provide keyboard navigation, visible focus, screen-reader semantics, responsive
layout, sensitive-data minimization, and traceable failure reporting using accepted IMP-036
correlation/observability where available. No UI creates authority.

```text
Accessibility target = WCAG 2.2 AA where reasonably applicable
Customer responsive priority = MOBILE_FIRST
Workforce responsive priority = DESKTOP_TABLET_FIRST_WITH_SENSIBLE_MOBILE_USE
Administration responsive priority = DESKTOP_FIRST_WITH_GRACEFUL_FALLBACK
```

## 7. Persona, role, and scope plan

The accepted RBAC catalog is authoritative. This provisional mapping guides terminology and default
navigation only:

| UX persona | Existing role |
|---|---|
| Platform Admin | `platform_super_admin` |
| BOBA HQ / Brand Management | `brand_admin` |
| Franchise / Store Manager | `outlet_manager` |
| Kitchen | `kitchen_operator` |
| Delivery Desk | `delivery_coordinator` |
| Customer Support | `support_refund_operator` |
| Finance | `finance_viewer` |

Menus and actions must derive from effective permission and scope, not hard-coded role-name screens.
If BOBA later needs one franchise principal to administer an arbitrary selected set of outlets
without brand-wide authority, that is a deliberate deferred RBAC architecture question. This plan
does not create `franchise_owner`, roles, permissions, or new scope semantics.

## 8. Programme dependencies and sequence

```text
IMP-036A  Multi-Portal Experience Foundation
→ IMP-036B  Customer Commerce Experience V2
→ IMP-036C  Customer Account, Onboarding, Address & Location Experience
→ IMP-036D  Workforce & Franchise Operations Portal V2
→ IMP-036E  Store Operations Management
→ IMP-036F  Catalog, Menu, Pricing & Promotions Management
→ IMP-036G  Administration Console V2
→ IMP-037  Backup, Restore & Migration Readiness
→ IMP-038  Security & Privacy Hardening
→ IMP-039  Production Infrastructure & Release Pipeline
→ IMP-040  Launch Validation & Cutover
```

IMP-036A establishes shell separation and primitives. IMP-036B matures customer commerce; IMP-036C
adds coherent account/location experience; IMP-036D creates the daily operations workspace;
IMP-036E adds outlet management; IMP-036F adds commercial configuration; IMP-036G matures
administration. Repository policy remains one active product slice; this sequence does not permit
concurrent activation.

## 9. Founder UAT strategy

Every IMP-036A–G slice requires independent technical acceptance and Founder UAT against the exact
candidate before final acceptance. UAT evaluates coherent workflows, comprehensibility, navigation,
correct capability exposure, permission behavior, safe failure/recovery, responsive usability, and
acceptable baseline visual quality. It is not pixel-perfect final visual approval. Later Figma
refinements may receive bounded Founder visual review.

## 10. Deferred decisions and programme non-goals

Deferred until the relevant slice architecture gate:

- location-search/map provider, browser/server responsibility, privacy, quotas, fallbacks, and PIN
  evidence quality for IMP-036C;
- arbitrary multi-outlet franchise administration without brand-wide authority;
- media/object-storage architecture if true media management is required;
- exact route, API, or schema changes where accepted authority does not already provide the needed
  behavior.

The programme plan does not authorize new Order or Delivery lifecycles; loyalty/rewards;
subscriptions; customer chat; autonomous AI ordering; arbitrary permission editing; new franchise
RBAC; geospatial Serviceability authority; provider selection; media/object-storage platform;
micro-frontends; deployable services; major analytics/reporting; an external observability vendor;
production infrastructure work; or activation of IMP-037–040.

## 11. Slice contracts

- [IMP-036A — Multi-Portal Experience Foundation](./IMP-036A-multi-portal-experience-foundation.md)
- [IMP-036B — Customer Commerce Experience V2](./IMP-036B-customer-commerce-experience-v2.md)
- [IMP-036C — Customer Account, Onboarding, Address & Location Experience](./IMP-036C-customer-account-onboarding-address-location.md)
- [IMP-036D — Workforce & Franchise Operations Portal V2](./IMP-036D-workforce-franchise-operations-v2.md)
- [IMP-036E — Store Operations Management](./IMP-036E-store-operations-management.md)
- [IMP-036F — Catalog, Menu, Pricing & Promotions Management](./IMP-036F-catalog-menu-pricing-promotions.md)
- [IMP-036G — Administration Console V2](./IMP-036G-administration-console-v2.md)
