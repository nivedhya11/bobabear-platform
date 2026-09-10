---
Status: SUPERSEDED HISTORICAL PROGRAMME CONTRACT
Capability: IMP-036E — Store Operations Management
Superseded by: docs/platform/capabilities/IMP-036E-store-operations-management.md
Accepted outcome: COMPLETE_AND_ACCEPTED
Founder UAT: PASS
Last reconciled: 2026-09-10
---

# IMP-036E — Store Operations Management

This planned enterprise-experience contract is historical and is no longer an independent authority
for IMP-036E architecture, lifecycle, implementation, or Store Operations behavior. It was
superseded by the locked canonical capability architecture after implementation and acceptance.

Current accepted authority:

- [IMP-036E locked capability architecture](../../capabilities/IMP-036E-store-operations-management.md)
- [Accepted platform state](../../STATE.md)
- [Implementation roadmap](../../ROADMAP.md)

The accepted product delivers Store Operations Management as a coherent outlet-scoped workspace over
existing Outlet, Availability, Operating, Serviceability, and Access Control authorities: Overview,
Availability, Assortment (Brand-authority read/escalate presentation), Operating Status, Hours, and
Serviceability. Assortment remains Brand authority (`IMP036E_ASSORTMENT_AUTHORITY: BRAND`).
Serviceability remains `OUTLET_DISTANCE_SERVICEABILITY_V1` with coordinate authority and no PIN/
postal runtime authority. No new roles, permissions, scope model, schema, D-374, or ARCH-R20.
Authorization remains resource-scoped under existing D-372 / D-373 façades. Catalog/Menu/Pricing/
Promotions remains IMP-036F and is not activated by this acceptance.

The accepted product candidate and Founder UAT PASS remain
`05c534bac3d077f5ab89928495568bb63faf78df`. Docs/governance reconciliation after that product SHA is
not a new product UAT candidate.

Historical supporting experience detail below the supersession marker remains reference-only and
must not override the locked capability architecture or CURRENT ROADMAP/STATE.

## Purpose, users, and problem (historical reference)

Give authorized outlet managers and operators one coherent management workspace over existing
outlet-scoped operational capabilities. Current controls are fragmented and do not clearly separate
assortment, availability, operating status, hours, and Serviceability.

## Serviceability authority alignment (accepted IMP-036B — not a new decision)

```text
SERVICEABILITY_MODEL = OUTLET_DISTANCE_SERVICEABILITY_V1
SERVICEABILITY_COORDINATE_AUTHORITY = YES
SERVICEABILITY_POSTAL_PIN_RUNTIME_AUTHORITY = NO
SERVICEABILITY_POSTAL_PIN_METADATA_ONLY = YES
SERVICEABILITY_MAP_IS_PROJECTION_ONLY = YES
IMP036E_SERVICEABILITY_ROUTING_PRIORITY_UI = HIDDEN_PREREQUISITE
IMP036E_SERVICEABILITY_MAP = OPTIONAL_PROJECTION_ONLY
```

## Assortment authority (Founder Option A)

```text
IMP036E_ASSORTMENT_AUTHORITY = BRAND
OUTLET_MANAGER_OUTLET_SCOPE_ASSORTMENT_MANAGE = NO
OUTLET_EFFECTIVE_ASSORTMENT_PRESENTATION = AUTHORIZED_READ_OR_ESCALATE
IMP036E_ASSORTMENT_WORKFORCE_TRANSPORT = READ_ONLY_OPERATIONS_PROJECTION
ASSORTMENT_AUTHORIZATION_RESOURCE = BRAND_DERIVED_FROM_OUTLET
ASSORTMENT_MANAGE_ROUTE_IMP036E = NO
```
