---
Status: SUPERSEDED HISTORICAL PROGRAMME CONTRACT
Capability: IMP-036C — Customer Commerce Experience V2
Superseded by: docs/platform/capabilities/IMP-036C-customer-commerce-experience-v2.md
Accepted outcome: COMPLETE_AND_ACCEPTED
Founder UAT: PASS
Last reconciled: 2026-09-05
---

# IMP-036C — Customer Commerce Experience V2

This planned enterprise-experience contract is historical and is no longer an authority for
IMP-036C architecture, lifecycle, implementation, or customer behavior. It was superseded by the
locked canonical capability architecture after implementation and acceptance.

Current accepted authority:

- [IMP-036C locked capability architecture](../../capabilities/IMP-036C-customer-commerce-experience-v2.md)
- [Accepted platform state](../../STATE.md)
- [Implementation roadmap](../../ROADMAP.md)

The accepted product delivers end-to-end Customer Commerce Experience V2 over existing Menu, Cart,
Checkout, Payment, Order, and IMP-036B location/serviceability authorities: menu/category/search/
product/customization/cart, customer auth when required, shared map-first address flow, coordinate
serviceability, delivery/address/review/payment/confirmation, Orders/history/detail/tracking within
existing scope, standardized BOBA delivery-fee authority, Razorpay Standard Checkout with
Razorpay-owned payment-method selection (BOBA selector absent), checkout back-navigation and stale
revision reconciliation, authoritative monetary snapshot presentation, failed/dismissed/unresolved
payment recovery with server-side Razorpay secondary reconciliation, previous-payment/current-cart
separation, and authoritative FAILED Try payment again / Start a new order continuity. Failed
Payment is not an Order. Deferred Maps hardening remains owned by IMP-038; customer failed-payment
history remains deferred.

The accepted product candidate and Founder UAT PASS remain
`0ec83ba5b7b03387dcefbd478807faefc3499d6b`. Docs/governance reconciliation after that product SHA is
not a new product UAT candidate.
