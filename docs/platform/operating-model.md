---
Status: Canonical
Last updated: 2026-08-01
---

# BOBA Bear — Operating Model

## Status

This document records the **Locked** dual-system operating reality that exists as long as
aggregator orders and direct orders are fulfilled through different systems, the **Locked** scope
of the initial Operations Console, and a set of **Provisional** operational mitigations. It assumes
the channel and category scope in [`v1-product-scope.md`](./v1-product-scope.md).

## The dual-system reality

BOBA Bear will run two order sources into the same kitchen at the same time: aggregator orders
(via Petpooja) and direct orders (via the BOBA Bear direct platform). This is not a temporary
oversight to be immediately eliminated — it is the expected operating condition for the
foreseeable future, because Petpooja remains the system of record for aggregator orders and is not
part of the direct platform.

**Aggregator order flow:**

```text
Aggregator orders
Zomato / Swiggy / Toing / others
                ↓
             Petpooja
                ↓
              Kitchen
```

**Direct order flow:**

```text
Direct orders
BOBA Bear PWA / WhatsApp
                ↓
BOBA Bear Commerce Platform
                ↓
BOBA Bear Operations Console
                ↓
              Kitchen
```

Kitchen staff will initially need to monitor **two** systems: Petpooja for aggregator orders, and
the BOBA Bear Operations Console for direct orders. Petpooja is not integrated with the direct
platform, and no such integration is planned for V1 — see
[`v1-product-scope.md`](./v1-product-scope.md) and the [decision register](./decision-register.md).

## Operational risks of the dual-system reality

Running two systems side by side creates specific, foreseeable risks that the platform and the
operating procedures around it must account for:

- **Missed direct orders** — a direct order can be overlooked if staff attention defaults to the
  more familiar Petpooja screen.
- **Duplicate menu administration** — menu items, prices, and availability may need to be
  maintained separately in Petpooja and in the direct platform's catalog.
- **Staff needing to operate two systems** — additional training and attention burden on kitchen
  and floor staff.
- **Separate direct-order status updates** — direct-order status must be updated in the Operations
  Console; it has no automatic relationship to Petpooja's state.
- **Different reconciliation paths** — end-of-day reconciliation must account for two independent
  order sources rather than one.

## Planned mitigations

The following mitigations are the current intended approach to the risks above. They describe
direction, not a finished specification:

- Prominent new-order alerts in the Operations Console.
- Sound notifications for incoming direct orders.
- Browser notifications where the customer's or staff device's browser supports them.
- A dedicated kitchen screen for the Operations Console, separate from front-of-house or admin
  views.
- Clear order-source labelling, so staff can immediately tell a direct order apart from an
  aggregator order without needing to check which screen it appeared on.
- Large, simple operational actions (accept, mark preparing, mark ready) suited to a fast-paced
  kitchen environment.
- Preparation timers to support consistent kitchen pacing.
- Operational exception alerts (for example, a payment or delivery-assignment failure) surfaced
  clearly rather than silently logged.
- Documented menu-update procedures so that keeping Petpooja and the direct platform's catalog in
  sync is a known, repeatable task rather than an ad hoc one.

## Initial Operations Console

The first release must **not** attempt to build a full restaurant point-of-sale system. The
initial Operations Console is scoped narrowly to what direct-order fulfilment requires:

- Receive a new paid order.
- Alert kitchen staff.
- Display ordered items, variants, add-ons, and customer instructions.
- Accept or reject an order.
- Set or confirm a preparation time.
- Mark an order as preparing.
- Mark an order as ready.
- Record or assign delivery.
- Mark an order as out for delivery.
- Mark an order as delivered.
- Cancel an order where permitted.
- Request or initiate a refund.
- View payment state.
- View delivery state.
- Contact the customer.
- Identify integration or payment failures.
- Search direct orders.
- View order history and event history.

The Operations Console is designed as the future foundation of BOBA Bear's own point-of-sale
system, but V1 must remain focused on the capabilities above. Counter billing, cash-drawer
management, dine-in table management, and shift settlement are explicitly **Deferred** — see
[`v1-product-scope.md`](./v1-product-scope.md) and
[`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) for the phased evolution toward
a fuller platform.

## Staff access to the Operations Console

Who can see and act on which orders is governed by the membership, role, and permission model
described in [`organization-outlet-access-model.md`](./organization-outlet-access-model.md). At
launch, the exposed role set for outlet-facing operations is expected to include Outlet Manager,
Kitchen Operator, and Delivery Coordinator, with Brand Administrator and Finance Viewer roles
operating above the outlet level. See that document for the full role model and the reasoning
behind scoped, permission-based authorization.

## Customer support

Customer-initiated contact about a direct order (delivery delay, item issue, refund request) is
expected to be handled by staff with access to the Operations Console. The exact customer-support
workflow — channel, staffing, and escalation path — is not yet defined and is recorded as an open
decision in [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md).

## Related documents

- [`v1-product-scope.md`](./v1-product-scope.md) — the customer- and operations-facing scope this model fulfils.
- [`order-payment-delivery-model.md`](./order-payment-delivery-model.md) — the order, payment, and delivery states the Operations Console must reflect.
- [`organization-outlet-access-model.md`](./organization-outlet-access-model.md) — roles and permissions governing Operations Console access.
- [`roadmap-and-open-decisions.md`](./roadmap-and-open-decisions.md) — the phased evolution from this initial console toward a fuller operations platform.
- [`decision-register.md`](./decision-register.md) — structured record of the decisions summarized here.
