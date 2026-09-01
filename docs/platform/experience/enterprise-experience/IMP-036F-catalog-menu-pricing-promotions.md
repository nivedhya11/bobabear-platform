---
Status: PLANNED CAPABILITY CONTRACT
Capability: IMP-036F — Catalog, Menu, Pricing & Promotions Management
Lifecycle: PLANNED / NOT_ACTIVATED
Architecture: NOT_LOCKED
Implementation: NOT_AUTHORIZED / NOT_STARTED
Founder UAT required: YES
---

# IMP-036F — Catalog, Menu, Pricing & Promotions Management

## Purpose, users, and problem

Provide authorized brand/outlet commercial operators with a coherent configuration experience while
preserving explicit distinctions among Catalog, Menu, Assortment, Availability, Pricing, and
Promotions.

## Product concepts and target information architecture

```text
CATALOG      = product and variant identity authority
MENU         = presentation and organization of catalog items
ASSORTMENT   = what an outlet offers
AVAILABILITY = whether it is currently orderable
PRICING      = monetary configuration
PROMOTIONS   = promotional rules
```

- **Catalog:** product list/detail, variants, supported modifier structures, and existing media
  reference semantics.
- **Menu:** menus, sections/categories, items, ordering, and visibility only where accepted authority
  supports them.
- **Pricing:** current amount/context, validated editing, effective scope/date only where canonical,
  and audit/review.
- **Charges/tax:** controlled forms, stronger confirmation, and permission-driven visibility.
- **Promotions/coupons:** management, activation, and audit using only actual domain lifecycle
  semantics. Draft/active/scheduled/ended labels are not permitted unless canonical authority
  supports them.

## Primary workflows

1. Locate and inspect a Catalog product/variant and supported modifier structure.
2. Organize accepted catalog items within Menu sections/categories.
3. Understand outlet Assortment/Availability without conflating them with Catalog/Menu edits.
4. Review and edit authorized monetary configuration with explicit scope and validation.
5. Manage Promotions/coupons through existing states and permitted actions with audit visibility.

## Reused authority and implications

Reuse accepted Catalog, Menu, outlet assortment/availability, Pricing, Tax/Charges, Promotions,
Audit, workforce auth, and effective permissions/scope. Later architecture must map actual accepted
commands/projections before enabling a control. This plan adds no API, schema, lifecycle, bulk
semantics, or arbitrary permission editor.

Media/reference display may use existing semantics. Do not assume upload or object storage exists.
If true media management requires storage, retention, delivery, scanning, or access policy, that is
`DECISION_REQUIRED` in a later architecture gate.

## Responsive, accessibility, and state requirements

Desktop/tablet-first with graceful mobile fallback for inspection and suitably bounded actions.
Target WCAG 2.2 AA with keyboard data management, semantic monetary/validation errors, visible focus,
announced mutation state, and accessible confirmation.

Cover loading, empty Catalog/Menu/Promotion sets, errors/retry, 401, permission/scope-safe 403/404,
stale/concurrent edits, pending/success/failure, disabled/unsupported actions, destructive or
commercially consequential confirmation, and safe IMP-036 correlation.

## Major acceptance criteria

- The six concepts remain visibly and behaviorally distinct.
- Every displayed action maps to accepted authority, permission, and scope.
- Monetary and promotional edits validate, confirm consequences, audit, and recover from conflicts.
- No invented promotion lifecycle or unsupported effective-date semantics appears.
- Media UI does not imply unsupported upload/storage capability.
- Responsive/accessibility/recovery and exact-candidate Founder UAT checks pass.

## Dependencies, non-goals, and deferred decisions

Depends on IMP-036A/D/E and accepted commercial authorities. Non-goals: new lifecycle states, media
platform, arbitrary bulk operations, new roles/permissions, schema/API invention, or analytics.
Media/object storage and any proven transport/schema gaps are deferred decisions at architecture
lock.

Figma is not required initially; later visual refinement cannot redefine commercial truth,
lifecycles, permissions, or storage/provider authority.
