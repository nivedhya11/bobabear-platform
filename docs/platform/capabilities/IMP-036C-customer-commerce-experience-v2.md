<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-036C",
  "title": "Customer Commerce Experience V2",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
  "implementationAuthorized": true,
  "lastReviewed": "2026-09-02",
  "bindingDecisions": ["D-118", "D-368", "D-369", "D-370", "D-371"],
  "dependsOn": ["IMP-036A", "IMP-036B", "IMP-025", "IMP-028B", "IMP-028C", "IMP-021", "IMP-022", "IMP-023"]
}
-->

# IMP-036C — Customer Commerce Experience V2

## Capability Architecture (ARCHITECTURE_LOCKED — IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE)

Mature accepted BOBA Direct commerce into a coherent end-to-end customer ordering experience. This
slice is **experience composition and presentation** over existing domain authorities — not a new
commerce platform.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Lifecycle | `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` |
| Implementation | `AUTHORIZED` / `STARTED` / `COMPLETE` |
| Implementation authorized | **YES** |
| Implementation complete | **YES** |
| Accepted | **NO** |
| Accepted product through | IMP-036B |
| Current product slice | IMP-036C |
| Pending acceptance | IMP-036C |
| Next product slice | IMP-036D |
| Governance checkpoint | GTM-R101 / STATE-R99 |
| Founder UAT required for acceptance | **YES** |

```text
IMP-036C: IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-036C_ARCHITECTURE: LOCKED
IMP-036C_ARCHITECTURE_LOCKED: YES
IMP-036C_IMPLEMENTATION: AUTHORIZED / STARTED / COMPLETE
IMP-036C_IMPLEMENTATION_AUTHORIZED: YES
IMP-036C_STARTED: YES
IMP-036C_IMPLEMENTATION_COMPLETE: YES
IMP-036C_ACCEPTED: NO
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_REQUIRED_FOR_ACCEPTANCE: YES
IMP-036C_FOUNDER_UAT_REQUIRED: YES
STANDARDIZED_CUSTOMER_DELIVERY_FEE: YES
schema_change: YES
provider_IO: NO
new_service: NO
new_queue: NO
new_auth_model: NO
new_roles: NO
new_permissions: NO
EXISTING_DOMAIN_AUTHORITIES_REUSED: YES
TRANSPORT_SCHEMA_CHANGE: NONE
COMPLETION IS NOT ACCEPTANCE: YES
```

## 1. Purpose

Deliver enterprise-class customer commerce UX for the full journey:

```text
Landing → location context → Menu → category/search → product/customization
→ Cart → authentication when required → delivery/address → review → payment
→ confirmation → order history/detail/tracking
```

## 2. Preserved authorities (reuse only)

| Authority | Use |
|---|---|
| D-368 Menu projection | Menu read, categories, display price |
| D-369 Paid modifiers | Customization dialog |
| D-370 Cart identity transition | Guest/authenticated cart |
| D-371 Cart unit sequence | Quantity ordering |
| IMP-021 Checkout | Destination, evaluate, snapshot |
| IMP-022 Payment | Razorpay, idempotency, recovery |
| IMP-023 Order | Materialization from checkout snapshot |
| IMP-036B Location/Serviceability | Deliver-to, coordinate serviceability |
| Customer-commerce transport | `/api/v1/*` wrappers — no new public contracts |

**No new provider, queue, service, auth model, or lifecycle states.**

## 3. Customer delivery fee (BOBA-owned)

```text
STANDARDIZED_CUSTOMER_DELIVERY_FEE = YES
```

- Customer delivery charge is BOBA-owned and server-authoritative at checkout evaluation.
- Distance uses the same Haversine geodesic algorithm as IMP-036B outlet-distance serviceability.
- Configurable per-outlet distance bands live on `outlet_serviceability_configs.delivery_fee_bands`
  (JSON array: `maxDistanceMeters`, `amountPaise`). Optional
  `free_delivery_subtotal_threshold_paise` on the same row.
- When bands are absent, checkout falls back to brand `price_book_charge_prices` delivery row.
- Resolved amount flows through existing `buildDirectPricingQuote` → `checkout_snapshot_charges`
  → order `checkout_snapshot_id` commercial truth (D-118 / D-132).
- Provider execution cost remains in Delivery domain (`delivery_provider_costs`) and never
  rewrites customer delivery charge.

Exact band ₹ values and free-delivery thresholds are **business configuration**, not code constants.

## 4. UX architecture

- **Menu:** location strip, search, category navigation, availability badges, customization cues,
  loading/retry, mobile sticky cart + desktop sidebar continuity.
- **Cart:** line clarity, evaluation problems, serviceability note, estimated subtotal semantics.
- **Checkout:** logical Delivery → Review → Payment on one route; server-side serviceability
  re-evaluation at evaluate; item review + monetary summary before payment.
- **Payment:** existing PaymentPanel recovery semantics; no duplicate order intent.
- **Confirmation / Orders:** monetary summary from snapshot projection; D-357 status timeline only;
  current vs past order grouping; safe delivery projection.

## 5. Schema change (bounded)

Migration `0036_outlet_delivery_fee_policy.sql` adds optional delivery-fee policy columns to
`outlet_serviceability_configs`. No new commercial tables; checkout/order charge snapshot tables
unchanged.

## 6. Non-goals

Loyalty, rewards, subscriptions, favorites, AI recommendations, chat, new providers, kitchen
preparation lifecycle, Routes API, live courier quote pass-through, invented analytics.

## 7. Regression boundary

IMP-036B location selector, session tokens, Back refresh, map stability, coordinate
serviceability, and saved-address behavior must not regress where 036C composition touches those
surfaces.
