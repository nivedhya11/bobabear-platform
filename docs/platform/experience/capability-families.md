---
Status: SUPPORTING PRODUCT / EXPERIENCE MATERIAL
Authority: NONE — planning families; family A canonicalized as IMP-028A; family B canonicalized as IMP-028B (architecture ARCHITECTURE_LOCKED; implementation AUTHORIZED / NOT_STARTED); C–J are not IMP identities
Canonical sequence: docs/platform/ROADMAP.md
Planning lock: docs/platform/experience/food-direct-product-architecture-lock.md
Preserved: 2026-08-18
Updated: 2026-08-19 — family B ARCHITECTURE_LOCKED / IMPLEMENTATION_AUTHORIZED (GTM-R39); not started
---

# Working capability families

**SUPPORTING PLANNING GUIDANCE.** These families group Food Direct work. Family **A** is
canonicalized as **IMP-028A**. Family **B** is canonicalized as **IMP-028B** (`CANONICALIZED_AS =
IMP-028B`; architecture `ARCHITECTURE_LOCKED`; implementation **AUTHORIZED** / **NOT_STARTED**). Families C–J are **not**
IMP IDs and are **not** sequenced in
[`ROADMAP.md`](../ROADMAP.md). This file does not start IMP-028B implementation and does not
authorize or retarget IMP-029.

Canonical planning lock:
[`food-direct-product-architecture-lock.md`](./food-direct-product-architecture-lock.md).

Relative order is planning guidance only. Formal IMP identity, dependencies, and authorization
remain ROADMAP-owned.

Lettering below **replaces** the earlier A–K draft in this file (UX foundation … Wear). Wear,
Culture, and Rewards are no longer lettered Food Direct families; they remain deferred pillars.
History of the A–K draft is retained as superseded planning lettering at the bottom of this file.

## Families (A canonical IMP-028A; B canonical IMP-028B; C–J no IMP IDs)

| Family | Name | Customer value | Current dependencies | Backend impact | Likely decision need | Relative order |
|---|---|---|---|---|---|---|
| **A** | Food Direct UX Foundation | Coherent Home/nav/terms; session-true chrome; global Cart | Existing `Nav` + session API | None | None (D-368/369/370 not in A) | 1 |
| **B** | Customer Menu Projection + Discovery | Truthful Menu; faster find-and-add | Catalog/menu/pricing/availability/modifier/bundle graphs; static catalog TRANSITIONAL | `API_READ_MODEL` (D-368); visual consume | Serving TARGET BINDING VIA D-368; JSON not locked | 2 |
| **C** | Food Customization | Real configured items; honest paid extras | ADR-006 schema; empty live import; Cart configured lines | C-CONTENT import; C-UI + D-369; no new schema | Paid defaults BINDING VIA D-369; typed kinds still OPEN | 3 |
| **D** | Cart + Customer Session Hardening | Intent survives login; logout isolation | IMP-009 / IMP-020 / IMP-021 / IMP-026C | Policy implementation, not a new aggregate | Merge/logout BINDING VIA D-370 | 2 (parallel with B/E) |
| **E** | Checkout / Payment Experience Hardening | Safe Pay/refresh; truthful confirmation | IMP-019 / IMP-021 / D-361–D-362 / IMP-023 | Copy/mapping; checkout-bound Order resolution | Do not reopen Payment/Order | 2 (parallel with D) |
| **F** | My BOBA Foundation | Relationship hub; My Orders; addresses; Profile; Sign Out | IMP-017 / IMP-018 / IMP-023 APIs | UI over existing domains | None for initial hub | 4 |
| **G** | Order Again | Historical Order → new current Cart intent | IMP-023 + IMP-020 + current Menu/config | New application op; never replay snapshot | Principle locked; edge UX later | 5 |
| **H** | Offers Experience | Browse/apply offers without a second price engine | IMP-016 + cart coupon API | UI; auto-apply OPEN and out of minimum H | Auto-apply OPEN | later |
| **I** | Food Drops / Campaign | Editorial campaign; not fake commerce | Static `SignatureDrops` teaser | None for static; new entity only if scheduled | Drop ≠ price/inventory/checkout authority | static with A; real later |
| **J** | Favorites / My Usual | Affinity vs configuration template | None today | Future persistence | Distinct from Order Again | defer |

Family **A** is founder-accepted and canonicalized as **IMP-028A — Food Direct UX Foundation**
(GTM-R34 / GTM-R35 / GTM-R37). Canonical product authority:
[`../capabilities/IMP-028A-food-direct-ux-foundation.md`](../capabilities/IMP-028A-food-direct-ux-foundation.md).
Supporting rationale retained:
[`slices/food-direct-ux-foundation.md`](./slices/food-direct-ux-foundation.md)
(`FOUNDER_ACCEPTED`; `CANONICALIZED_AS = IMP-028A`; `IMPLEMENTED`; `INDEPENDENTLY_ACCEPTED`).

Family **B** is canonicalized as **IMP-028B — Customer Menu Projection + Discovery**
(GTM-R38 / STATE-R36; architecture lock GTM-R39 / STATE-R37). Canonical product authority:
[`../capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](../capabilities/IMP-028B-customer-menu-projection-and-discovery.md).
Supporting rationale retained:
[`slices/customer-menu-projection-and-discovery.md`](./slices/customer-menu-projection-and-discovery.md)
(`SUPPORTING`; `CANONICALIZED_AS = IMP-028B`; architecture `ARCHITECTURE_LOCKED`; implementation **AUTHORIZED** / **NOT_STARTED**).
Families C–J remain supporting planning families without candidate or canonical IMP IDs.

Wear, Culture, and Rewards remain **deferred pillars**, not Food Direct families.

## Split locks (from the product-architecture lock)

```text
B = one family
  D-368 projection + visual Menu discovery are not separately accepted product families.
  Acceptance of B requires D-368 serving, not long-term static catalog serving.

C = one family, two workstreams
  C-CONTENT (import/data) may start independently.
  C-UI SHOULD FOLLOW B for backend/storefront serving and is not customer-valuable without content.

G is separate from F
  Initial My BOBA does not include Order Again operation.
```

## Dependency reading (planning only)

```text
A  UX Foundation
├─ HARD → F
├─ SHOULD_PRECEDE_FOR_UX → B, D, E
B  Menu projection (D-368)
├─ SHOULD_PRECEDE_FOR_BACKEND → C-UI
├─ HARD → G
C-CONTENT  INDEPENDENT (catalog data)
C-UI       SOFT on C-CONTENT; SHOULD FOLLOW B for backend/storefront serving
D  Cart/session (D-370)  INDEPENDENT of B/C
E  Checkout/payment UX   INDEPENDENT of B/C
F  My BOBA Foundation    HARD on A; INDEPENDENT of B/C
G  Order Again           HARD on B+D; SOFT on C+F
H  Offers                INDEPENDENT; auto-apply OPEN / not MVP
I  static Drops ⊂ A; real Drops later
J  Favorites / My Usual  DEFER
```

## UX without domain change vs new capability

```text
UX_REDESIGN_WITHOUT_DOMAIN_CHANGE =
  Home/nav/terminology, session-aware header, stale Privacy copy,
  payment recovery/copy, confirmation/status projection, sealed-modifier render,
  My Orders placement, address-book UI, profile UI over /api/v1/me/profile,
  static Drop presentation, Offers browse over existing engine

NEW_APPLICATION_OPERATION =
  D-368 Menu read projection (read model, not new commercial domain),
  D-370 guest→customer merge + logout isolation (existing Cart aggregate),
  Order Again (historical Order → current Cart intent)

NEW_DOMAIN_CAPABILITY_REQUIRED =
  Favorites, My Usual, BrandDrop entity, Rewards / Wear / Culture,
  special instructions if desired

CONTENT_DATA_REQUIRED =
  Live modifier/bundle catalog content (schema exists; import currently empty)

CUSTOMER_MENU_TARGET = BINDING VIA D-368
PAID_MODIFIER_EXPLICIT_SELECTION = BINDING VIA D-369
CART_IDENTITY_TRANSITION = BINDING VIA D-370
```

## Explicit non-activation

```text
ROADMAP_FAMILIES_PROMOTED = A and B
IMP_IDS_ASSIGNED = IMP-028A, IMP-028B
CANONICALIZED_AS_A = IMP-028A
CANONICALIZED_AS_B = IMP-028B
IMP028B_CANONICALIZED = YES
IMP028B_IMPLEMENTATION_AUTHORIZED = YES
IMP028B_IMPLEMENTATION_STARTED = NO
IMP028B_IMPLEMENTATION_COMPLETE = NO
IMP028B_ACCEPTED = NO
IMP029_RETARGETED = NO
WEAR_AUTHORIZED = NO
CULTURE_AUTHORIZED = NO
REWARDS_AUTHORIZED = NO
IMP-028A_IMPLEMENTATION_AUTHORIZED = YES
IMP-028A_IMPLEMENTATION_STARTED = YES
IMP-028A_IMPLEMENTATION_COMPLETE = YES
IMP-028A_ACCEPTED = YES
D371_CREATED = NO
```

IMP-029 remains Operations Console API, `PLANNED` / `NOT_STARTED` /
`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`. Family A / B canonicalization does not retarget it.
Families C–J are not a substitute sequence for IMP-029 and are not activated.

## Superseded planning lettering (A–K draft)

Earlier preservation in this file used A=UX foundation, B=Menu discovery, C=customization,
D=cart/session, E=profile/addresses, F=checkout UX, G=My BOBA/reorder/favorites, H=Drops,
I=Rewards, J=Culture, K=Wear.

That lettering is **SUPERSEDED_WORKING_ALTERNATIVE** as a family map. Content was folded into the
A–J lock above (Profile/Addresses ⊂ F; checkout UX ⊂ E; reorder split to G; Rewards/Culture/Wear
unlettered deferred pillars). Do not mix old and new letters in later slicing prompts.
