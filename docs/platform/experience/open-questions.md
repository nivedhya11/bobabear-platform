---
Status: SUPPORTING PRODUCT / EXPERIENCE MATERIAL
Authority: NONE — unresolved questions; this pack does not resolve them
Next free CURRENT decision: D-371 (D-370 allocated to Cart Identity Transition Authority)
Preserved: 2026-08-18
---

# Open questions

**SUPPORTING.** These questions were identified during BOBA Direct UX / backend planning and the
2026-08-18 repository audit. **This pack did not resolve them.** Recording them was not a
decision, not an implementation, and not ROADMAP activation. **D-368 was later allocated** to
Customer Menu Read Projection Authority by a separate governance task and resolves OQ-013’s
serving/read-boundary only. **D-369 was later allocated** to Customer Paid Modifier Explicit
Selection Authority and resolves the paid-default prohibition. **D-370 was later allocated** to
Cart Identity Transition Authority and resolves OQ-001 / OQ-002. Remaining items below stay OPEN
unless marked otherwise.

Already decided (do not re-open as if open): Checkout Snapshot authority; Payment callback ≠
success; D-357 Order states; Refund money vs documents; B2C (no customer GSTIN); no customer Refund
API for V1 (D-364); customer Menu serving TARGET (D-368) — static catalog remains CURRENT delivery;
paid-modifier explicit selection (D-369) — catalog/default metadata must not silently create paid
purchase intent; cart identity transition (D-370) — guest→customer compatible merge and logout
customer-cart isolation.

## Register

### OQ-001 — Anonymous → authenticated cart merge

**RESOLVED by [D-370](../decision-register.md)** (`CART_IDENTITY_TRANSITION = BINDING VIA D-370`).
When an active guest Cart and an active customer Cart both exist, BOBA must reconcile compatible
purchase intent into a customer-owned Cart. Silent whole-cart winner selection (guest always wins /
customer always wins / newest / largest, including KEEP_GUEST / KEEP_CUSTOMER as whole-cart winner)
is forbidden. Accepted checkout claim/reconcile implementation remains CURRENT until an authorized
future capability implements D-370. Coupon-conflict KEEP_GUEST / KEEP_CUSTOMER as coupon-resolution
implementation is not invalidated. Exact merge API/UX is not locked. Implementation is not
authorized.

Potential future canonicalization: implementation requires a later authorized capability; not IMP-029.

### OQ-002 — Logout cart behavior

**RESOLVED by [D-370](../decision-register.md)** (`CART_IDENTITY_TRANSITION = BINDING VIA D-370`).
Sign-out must not delete the customer Cart. After sign-out the browser loses authority over that
customer Cart and becomes an anonymous commerce context. The previous customer's Cart must not be
exposed or copied into an anonymous Cart. Customer B on the same browser must not receive Customer
A's Cart. Exact token-deletion mechanism is not locked. Implementation is not authorized.

Potential future canonicalization: implementation requires a later authorized capability; not IMP-029.

### OQ-003 — Best-available-offer auto application

IMP-016 `selectBestCandidate` exists; a named `BEST_AVAILABLE_OFFER_AUTO_APPLICATION` policy is
**NOT_FOUND**.

Potential future canonicalization: `BUSINESS_POLICY`.

### OQ-004 — Checkout validity / expiry customer policy

15 minutes is current implementation TTL. Customer copy, extension, and expiry-recovery policy are
not a CURRENT `D-xxx`.

Potential future canonicalization: `BUSINESS_POLICY` / `CAPABILITY_AC`.

### OQ-005 — Customer data deletion / retention

Profile delete exists as a domain operation. Legal deletion/retention policy is not locked.

Potential future canonicalization: `BUSINESS_POLICY`.

### OQ-006 — Customer self-service refund

D-364 forbids a customer Refund API for V1. Remains deferred. Not authorized by this pack.

Potential future canonicalization: later ROADMAP promotion only.

### OQ-007 — Saved Configuration / My Usual timing

Preferred configuration templates are distinct from Favorites and from Order Again. MVP timing is
unresolved.

Potential future canonicalization: `CAPABILITY_AC`.

### OQ-008 — Reward model

VISION-1 V1 non-goal; ROADMAP deferred. Exact model (points, stamps, tiers, paid membership) is
unresolved and **not** implementation-authorized.

Potential future canonicalization: `VISION` / `BUSINESS_POLICY` after strategy change.

### OQ-009 — Exact Culture capability

Working principle: participation, not generic content. Exact capability (sessions, radio, events,
collaborations) is unresolved. Names in research remain concepts.

Potential future canonicalization: `VISION` / `CAPABILITY_AC`.

### OQ-010 — Exact Wear capability

Working pillar only. Exact catalog, fulfilment, and commercial authority are unresolved and **not**
implementation-authorized.

Potential future canonicalization: `VISION` / `ARCHITECTURE`.

### OQ-011 — Typed modifier group kinds vs generic groups

SIZE / SWEETNESS / ICE / EXTRAS / REMOVALS were discussed as UX group types. They must not become
schema enums without a later decision. Generic named groups already exist.

Potential future canonicalization: `D-XXX_CANDIDATE` / `ARCHITECTURE` if typed kinds are required;
otherwise `DOC_ONLY`.

### OQ-012 — Special instructions

Free-text special instructions are currently ABSENT (no column). If later introduced, they must
never create paid entitlement. Whether V1 Food UX includes them is unresolved.

Potential future canonicalization: `BUSINESS_POLICY` / `CAPABILITY_AC`.

### OQ-013 — Public Menu API vs static catalog

**RESOLVED as architecture TARGET by [D-368](../decision-register.md)** (`CUSTOMER_MENU_TARGET =
BINDING VIA D-368`). Long-term customer Menu is a server-backed READ PROJECTION. Accepted IMP-025
static `ordering-catalog.json` remains CURRENT storefront delivery until an authorized future
capability replaces it. D-368 does not implement a Menu endpoint, lock an HTTP payload, or decide
Menu layout, search, or Most Ordered ranking.

Still OPEN inside that TARGET: exact payload, architecture lock, implementation authorization, and UX layout
(EXP-WD-016). Capability B is now canonicalized as **IMP-028B**
([`../capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](../capabilities/IMP-028B-customer-menu-projection-and-discovery.md);
supporting rationale [`slices/customer-menu-projection-and-discovery.md`](./slices/customer-menu-projection-and-discovery.md);
`CANONICALIZED_AS = IMP-028B`). Canonicalization does **not** lock architecture, authorize
implementation, lock HTTP/JSON, or consume D-371.

Potential future canonicalization: architecture lock / implementation authorization remain separate later gates; not IMP-029.

### OQ-014 — Drop authority boundary (formal)

Working rule EXP-WD-008 says BrandDrop must not become price/inventory/checkout/Menu/SKU/
participation authority. That boundary is **not** a CURRENT decision. Formalizing it later must
not consume a further CURRENT ID from this pack. D-368 is already allocated to Customer Menu Read
Projection Authority. D-369 is already allocated to Customer Paid Modifier Explicit Selection
Authority. D-370 is already allocated to Cart Identity Transition Authority.

Potential future canonicalization: `D-XXX_CANDIDATE`.

### Additional open items from the audit (not separately numbered)

- ADR-008-style conflict code names vs live `CHECKOUT_*` codes — mapping is UX; renaming is
  architecture.
- Delivery instructions (semantically distinct from address; currently ABSENT; IMP-026C non-goal).
- **RESOLVED by [D-369](../decision-register.md):** paid-default prohibition (`PAID_MODIFIER_EXPLICIT_SELECTION = BINDING VIA D-369`). Schema may still represent `default_quantity` + positive `price_delta_paise`; D-369 does not change schema. See EXP-WD-020 / EXP-WD-030.
- Email / communication preferences (customer `marketingOptIn` forbidden in current profile
  contract).

## How to use this list later

Founder review should classify each item as:

```text
remain OPEN
→ documentation-only close
→ BUSINESS_POLICY
→ later D-xxx (not a reuse of D-368, D-369, or D-370)
→ later capability acceptance criteria
→ stay deferred / non-goal
```

Do not resolve them by implementing. Do not start IMP-029 to hold these answers.

## Food Direct slicing classification (2026-08-18 planning lock)

Classification only. **This pack still does not resolve them** and does not create D-371.
See [`food-direct-product-architecture-lock.md`](./food-direct-product-architecture-lock.md) §14.

| Item | Classification |
|---|---|
| Any remaining item needed to slice family A (UX Foundation) | `BLOCKS_FIRST_SLICE` = **none** |
| OQ-003 Best-available-offer auto-application | `DOES_NOT_BLOCK_FOOD_MVP`; `BLOCKS_LATER_SLICE` only if auto-apply is added to Offers |
| OQ-004 Checkout TTL customer copy | `DOES_NOT_BLOCK_FOOD_MVP` |
| OQ-005 Customer deletion / retention | `DOES_NOT_BLOCK_FOOD_MVP` |
| OQ-006 Customer self-service refund | `DEFERRED` (D-364 V1 forbid) |
| OQ-007 Saved Configuration / My Usual timing | `DEFERRED` (family J) |
| OQ-008 Reward model | `DEFERRED` |
| OQ-009 Exact Culture capability | `DEFERRED` |
| OQ-010 Exact Wear capability | `DEFERRED` |
| OQ-011 Typed modifier kinds | `DOES_NOT_BLOCK_FOOD_MVP` |
| OQ-012 Special instructions | `DOES_NOT_BLOCK_FOOD_MVP` |
| OQ-014 Drop authority (real BrandDrop) | `DOES_NOT_BLOCK_FOOD_MVP`; `BLOCKS_LATER_SLICE` for I-real |
| Most Ordered / public popularity ranking | `DOES_NOT_BLOCK_FOOD_MVP` (do not ship as a factual claim without authority) |
| Order Again edge UX beyond historical→current-intent | `DOES_NOT_BLOCK_FOOD_MVP`; `BLOCKS_LATER_SLICE` for family G |
| Exact D-368 JSON / D-370 merge API / D-369 enforcement location | Implementation under CURRENT decisions; **not** new D-xxx |
| Bounded Capability B definition (family B) | `DEFINED_FOR_REVIEW` supporting slice; `D371_REQUIRED_FOR_CAPABILITY_B_DEFINITION` = **NO**; `D371_REQUIRED_FOR_BOUNDED_CAPABILITY_B_IMPLEMENTATION` = **NO** |

`BLOCKS_FIRST_SLICE` count = 0.
`REMAINING_BLOCKING_DECISIONS` for Food Direct MVP slicing = 0.

## Capability B implementation-boundary questions (2026-08-19)

OPEN / IMPLEMENTATION-BOUNDARY only. They do **not** block the bounded Capability B definition
and do **not** consume D-371. See
[`slices/customer-menu-projection-and-discovery.md`](./slices/customer-menu-projection-and-discovery.md).

1. Exact customer Menu HTTP endpoint and response DTO. D-368 permits `/api/v1/*` but does not lock
   the payload. `GET /api/v1/menu` is an implementation candidate only.
2. Runtime projection composition strategy (direct query vs service-layer composition vs
   transitional adapter) must follow existing architecture and implementation evidence.
3. Availability context: which existing outlet/operating context can be legitimately used before
   the customer supplies a destination? First slice may omit availability when context is absent.
4. Exact category navigation visual pattern. Sticky category navigation is a candidate, not a
   product-law requirement.
5. Static transition mechanism: direct runtime switch vs temporary adapter while preserving
   accepted parity.
6. Existing unused content tags/badges (`new` / `signature` / `bestseller`). Keep outside first B
   unless proven legitimate and non-ranking. `bestseller` must not become a factual Most Ordered
   claim without future authority.

```text
D371_REQUIRED_FOR_CAPABILITY_B_DEFINITION = NO
D371_REQUIRED_FOR_BOUNDED_CAPABILITY_B_IMPLEMENTATION = NO
IMP028B_CANONICALIZED = NO
IMP028B_IMPLEMENTATION_AUTHORIZED = YES
```
