---
Status: SUPPORTING — BOLA / BFLA evidence map
Authority: US-IMP-038-007; ADR-005; ARCH-G03/G04/G08
Compliance claim: NONE
---

# BOLA / BFLA evidence

```text
DENY_BY_DEFAULT: YES (ADR-005)
CALLER_MANUFACTURED_AUTHORITY: FORBIDDEN
REALM_SEPARATION: customer ≠ workforce (ADR-004)
```

Prefer existing negatives. Do not inflate suites.

## Cross-customer (BOLA / IDOR)

| Surface | Negative behaviour | Evidence |
|---|---|---|
| Orders | Cross-customer conceal as `ORDER_NOT_FOUND` | `tests/order-security/order.security.test.ts` (SEC-C04) |
| Payments | Customer B cannot read/retry/cancel/reconcile Customer A | `tests/payment-security/payment.security.test.ts` |
| Cart | Cross-customer cart denial | `tests/cart-security/cart.security.test.ts` |
| Checkout | Cross-customer address / checkout denial; non-leaking errors | `tests/checkout-security/checkout.security.test.ts` (incl. S22) |
| Profiles | Cross-customer profile denial | `tests/customer-profile-security/security.test.ts` |
| Addresses | Cross-customer address denial | `tests/customer-address-security/security.test.ts` |
| Serviceability | Scope / actor negatives | `tests/serviceability-security/security.test.ts` |

## Cross-outlet / territory / org / workforce (BFLA / scope)

| Surface | Negative behaviour | Evidence |
|---|---|---|
| Access-control scope graph | Brand/org/territory/outlet ancestor rules; sibling outlet DENY | `tests/access-control/scope.test.ts` |
| Catalog / principal branding | Untrusted objects rejected; MFA/disabled gates | `tests/access-control/principal.test.ts`; `authorize.service.test.ts` |
| Order workforce reads | Caller brandId/outletId cannot broaden scope (SEC-W11) | `tests/order-security/order.security.test.ts` |
| Administration HTTP | Origin + step-up + body/scope forgery denial | `tests/administration/admin-http.integration.test.ts`; commercial/catalog/menu/assortment admin HTTP |
| Operations HTTP | Store/orders/refunds/notifications authz | `tests/operations/*-http.integration.test.ts` |
| Access-control integration | DB-backed authorize behaviour | `tests/database/access-control.integration.test.ts` |
| Domain audit script | Mutation/config inventory for access control | `scripts/audit-access-control.mjs` |

## Deny-by-default pointers

| Rule | Pointer |
|---|---|
| Permission catalogue closed | `tests/access-control/catalog.test.ts` |
| Unknown permission keys rejected | `tests/access-control/authorize.service.test.ts` |
| Platform super-admin scope lock | `tests/access-control/catalog.test.ts`; staging lock tests |

## Gaps

| Gap | Owner |
|---|---|
| Continuous “BOLA smoke” single meta-suite across every new admin route | Authz — covered by per-domain HTTP suites; no new suite added in Tranche E |
