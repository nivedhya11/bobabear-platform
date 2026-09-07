<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "PRODUCT_PERSONA_REGISTRY",
  "version": "PERSONA-1",
  "lastReviewed": "2026-09-07"
}
-->

# Initial product personas

Personas describe human/business responsibility, goals, common jobs, and context. This initial
registry reuses the three primary-user groups in [VISION §3](../VISION.md) and bounds their jobs
using existing capability evidence. It introduces no organizational structure or actor model.

```text
PERSONA != ROLE
PERSONA != PERMISSION
PERSONA != AUTHORIZATION
```

One person may work in multiple contexts. A persona grants no action or data access: existing
session identity, effective permissions, memberships, and authoritative resource scope determine
authorization. Product Definitions must identify the applicable permission/resource context
separately, preserving [D-358, D-372, and D-373](../decision-register.md).

| Persona | Responsibility and goal | Common jobs grounded in existing support | Context and evidence |
|---|---|---|---|
| `PERSONA-CUSTOMER` — Customer | Choose and purchase BOBA products; understand the resulting order and maintain personal delivery details. | Discover Menu items, customize, review Cart, authenticate when needed, select an address, understand serviceability, pay, view confirmation/history, manage saved addresses and profile. | Guest or authenticated customer on mobile/desktop; customer identity remains separate from workforce identity. [IMP-036B §1](../capabilities/IMP-036B-customer-account-onboarding-address-location.md), [IMP-036C §§1–4](../capabilities/IMP-036C-customer-commerce-experience-v2.md). |
| `PERSONA-WORKFORCE-OPERATOR` — Workforce operator | Operate direct orders and relevant business configuration within the person's authorized scope. | Inspect, accept, fulfil or cancel Orders; handle permitted support/refund actions; administer permitted memberships and access. Brand/outlet commercial configuration is a responsibility in VISION; future management screens remain subject to their capability gates. | Outlet and brand staff, including supported store, support, finance and management work contexts; these descriptions are not roles. [VISION §§3–4](../VISION.md), [IMP-035 §5](../capabilities/IMP-035-initial-administration-capabilities.md), [IMP-036D §§1, 5, 9](../capabilities/IMP-036D-workforce-franchise-operations-v2.md). |
| `PERSONA-PLATFORM-OPERATOR` — Platform operator | Keep platform operation and launch support dependable within existing operational controls. | Inspect service/worker health, use safe request correlation and logs, and investigate operational failures through supported controls. | Production-operability responsibility is established by VISION; the current observability capability provides bounded visibility, not every future launch control. [VISION §§3, 5–6](../VISION.md), [IMP-036 §§1, 4–5](../capabilities/IMP-036-observability-operational-controls.md). |

First-time and returning customers are journey contexts of `PERSONA-CUSTOMER`, not new identities.
Specialized workforce jobs can be described in a Product Definition without inventing a new role,
permission, hierarchy, or entitlement. Add a registry persona only with product evidence and a
distinct responsibility/context that the existing entries cannot express.

Use this registry under [PD-1](../PRODUCT-DELIVERY.md), effective from IMP-036F. Historical accepted
IMPs are not rewritten; IMP-036E's lifecycle is unchanged; IMP-036F is not activated by this registry.
