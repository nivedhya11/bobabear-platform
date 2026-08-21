# IMP-028D Ordering UI Design Lock — RC3

Status: DESIGN LOCK FOR FUTURE RC3 IMPLEMENTATION
Scope: Product-card Cart control only
Authority: D-371 and the locked IMP-028D capability architecture

## RC1/RC2 history preserved

[`IMP-028D-ordering-ui-design-lock-RC1.md`](./IMP-028D-ordering-ui-design-lock-RC1.md) remains
historical authority for RC1/RC2. Its product-card rule, always `Add +`, was correct for those
revisions and is not rewritten by this amendment.

## RC3 product-card contract

For a base product (`variantId`):

- Aggregate Cart quantity zero: show **`Add +`**.
- Aggregate Cart quantity greater than zero: show **`− n +`**, where `n` is the authoritative sum
  of quantities across every configured Cart line for that `variantId`.

For configurable products, card `+` continues to open the existing configurator. Confirmation
uses existing configuration equality: an equal configuration increments its coalesced line and a
different configuration creates a distinct line.

Card `−` invokes the D-371 server-owned latest-active-unit Cart command. The browser must not
select a configured line or infer LIFO from local history. Exact Cart-line controls remain the way
to modify one particular configuration.

## Supersession

For positive aggregate Cart quantity only, this RC3 lock supersedes the RC1/RC2 product-card rule
that the primary CTA is always `Add +`. It does not supersede RC1/RC2 layout, accessibility,
category, Cart-scroll, visual-history, or acceptance evidence.

## Non-goals

This amendment does not implement the control, sequence persistence, migration, transport, Cart
mutation, pricing, Checkout, Payment, Order, Refund, auth, catalog, modifier semantics, or
topology. RC3 implementation remains not started.
