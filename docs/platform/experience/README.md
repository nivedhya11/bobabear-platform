---
Status: SUPPORTING PRODUCT / EXPERIENCE MATERIAL
Authority: NONE — not CURRENT product, architecture, decision, roadmap, or acceptance authority
Canonical vision: docs/platform/VISION.md
Canonical sequence: docs/platform/ROADMAP.md
Canonical accepted state: docs/platform/STATE.md
Canonical architecture: docs/platform/ARCHITECTURE.md
Canonical decisions: docs/platform/decision-register.md
Preserved: 2026-08-18
Source checkpoint: HEAD ddca0c319a5e80b2cfe38a2c32481b636277010e
---

# BOBA Direct — Supporting Product / Experience Material

## Current supporting plans

- [`d2c-ux-and-process-hardening-plan.md`](./d2c-ux-and-process-hardening-plan.md) — repository-
  reconciled D2C UX sequencing, process-review remediation register, and descriptive first-slice
  specification. It is supporting planning only and does not activate an IMP, allocate D-371, or
  alter IMP-028C acceptance.

## Authority boundary (read this first)

This directory is **SUPPORTING PRODUCT / EXPERIENCE MATERIAL**.

It preserves completed BOBA Direct UX, lifestyle-brand, customer-journey, backend-authority,
gap-analysis, and research work so that rationale does not remain trapped in chat history.

It is **not**:

- CURRENT architecture authority;
- a replacement for [`VISION.md`](../VISION.md);
- a decision register;
- a roadmap activation mechanism;
- capability acceptance authority.

Working principles, terminology, journeys, and brand framing in this pack are **WORKING** unless a
row explicitly cites existing CURRENT authority (VISION, ARCHITECTURE, ROADMAP, STATE, or a CURRENT
`D-xxx`). They must not be treated as CURRENT product law, as an amendment to VISION-1, or as
authorization to start IMP-029.

**Exception recorded after preservation:** Customer Menu serving TARGET is now binding via
**[D-368](../decision-register.md)** (`CUSTOMER_MENU_TARGET = BINDING VIA D-368`). Customer
paid-modifier explicit selection is now binding via **[D-369](../decision-register.md)**
(`PAID_MODIFIER_EXPLICIT_SELECTION = BINDING VIA D-369`). Cart identity transition is now binding
via **[D-370](../decision-register.md)** (`CART_IDENTITY_TRANSITION = BINDING VIA D-370`). Those
decisions were created by later governance tasks, not by this pack. Unrelated working decisions in
this pack remain SUPPORTING.

```text
MAY BE USED FOR
  founder review
  later product-architecture locking
  later VISION / D-xxx / capability AC promotion when a human decides

MUST NOT BE USED FOR
  activating a currentProductSlice
  authorizing or starting IMP-029
  creating further D-xxx identities from this pack
  rewriting accepted architecture
  implementing Wear, Culture, Rewards, or BrandDrop commerce
```

Governance checkpoint at preservation (VERIFIED 2026-08-18):

```text
VISION = VISION-1
ROADMAP = GTM-R30
STATE = STATE-R28
ARCHITECTURE = ARCH-R12
DECISION_REGISTER = DR-9
acceptedThrough = IMP-028
currentProductSlice = NONE
pendingAcceptance = NONE
IMP-029 = PLANNED / NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED = NO
NEXT_FREE_DECISION = D-368   (unused by this pack)
```

Status after Food Direct product-architecture planning lock (VERIFIED 2026-08-18):

```text
VISION = VISION-1
ROADMAP = GTM-R33
STATE = STATE-R31
ARCHITECTURE = ARCH-R15
DECISION_REGISTER = DR-12
acceptedThrough = IMP-028
currentProductSlice = NONE
pendingAcceptance = NONE
IMP-029 = PLANNED / NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED = NO
NEXT_FREE_DECISION = D-371
CUSTOMER_MENU_TARGET = BINDING VIA D-368
PAID_MODIFIER_EXPLICIT_SELECTION = BINDING VIA D-369
CART_IDENTITY_TRANSITION = BINDING VIA D-370
FOOD_DIRECT_PRODUCT_ARCHITECTURE_LOCK = SUPPORTING / FOUNDER-APPROVED PLANNING LOCK
FOOD_DIRECT_IMPLEMENTATION_AUTHORIZED = NO
FOOD_DIRECT_UX_FOUNDATION_SLICE = SUPPORTING / FOUNDER_REVIEW_CANDIDATE
FOOD_DIRECT_UX_FOUNDATION_IMPLEMENTATION_AUTHORIZED = NO
D371_CREATED = NO
ROADMAP_ACTIVATED = NO
```

Status after later D-370 governance task (VERIFIED 2026-08-18):

```text
VISION = VISION-1
ROADMAP = GTM-R33
STATE = STATE-R31
ARCHITECTURE = ARCH-R15
DECISION_REGISTER = DR-12
acceptedThrough = IMP-028
currentProductSlice = NONE
pendingAcceptance = NONE
IMP-029 = PLANNED / NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED = NO
NEXT_FREE_DECISION = D-371
CUSTOMER_MENU_TARGET = BINDING VIA D-368
PAID_MODIFIER_EXPLICIT_SELECTION = BINDING VIA D-369
CART_IDENTITY_TRANSITION = BINDING VIA D-370
D368_CREATED = YES
D369_CREATED = YES
D370_CREATED = YES
```

Status after Food Direct Capability B canonical activation (VERIFIED 2026-08-19):

```text
VISION = VISION-1
ROADMAP = GTM-R38
STATE = STATE-R36
ARCHITECTURE = ARCH-R15
DECISION_REGISTER = DR-12
acceptedThrough = IMP-028A
currentProductSlice = IMP-028B
pendingAcceptance = NONE
IMP-028A = COMPLETE_AND_ACCEPTED
IMP-028B = IMPLEMENTATION_AUTHORIZED / NOT_STARTED
IMP-028B_ARCHITECTURE_LOCKED = NO
IMP-029 = PLANNED / NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED = NO
NEXT_FREE_DECISION = D-371
FOOD_DIRECT_CAPABILITY_B = CANONICALIZED_AS = IMP-028B
CANONICALIZED_AS = IMP-028B
IMP028B_CANONICALIZED = YES
IMP028B_IMPLEMENTATION_AUTHORIZED = YES
IMP028B_IMPLEMENTATION_STARTED = NO
IMP028B_IMPLEMENTATION_COMPLETE = NO
IMP028B_ACCEPTED = NO
D371_CREATED = NO
D371_REQUIRED_FOR_CAPABILITY_B_DEFINITION = NO
D371_REQUIRED_FOR_BOUNDED_CAPABILITY_B_IMPLEMENTATION = NO
ROADMAP_ACTIVATED = YES
CURRENT_PRODUCT_SLICE_CHANGED = YES
```

Status after Food Direct Capability B supporting definition persistence (VERIFIED 2026-08-19; superseded for currentProductSlice by GTM-R38):

```text
VISION = VISION-1
ROADMAP = GTM-R37
STATE = STATE-R35
ARCHITECTURE = ARCH-R15
DECISION_REGISTER = DR-12
acceptedThrough = IMP-028A
currentProductSlice = NONE
pendingAcceptance = NONE
IMP-028A = COMPLETE_AND_ACCEPTED
IMP-029 = PLANNED / NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED = NO
NEXT_FREE_DECISION = D-371
FOOD_DIRECT_CAPABILITY_B = SUPPORTING / DEFINED_FOR_REVIEW
CANDIDATE_CANONICAL_ID = IMP-028B
IMP028B_CANONICALIZED = NO
IMP028B_IMPLEMENTATION_AUTHORIZED = YES
IMP028B_IMPLEMENTATION_STARTED = NO
D371_CREATED = NO
D371_REQUIRED_FOR_CAPABILITY_B_DEFINITION = NO
D371_REQUIRED_FOR_BOUNDED_CAPABILITY_B_IMPLEMENTATION = NO
ROADMAP_ACTIVATED = NO
CURRENT_PRODUCT_SLICE_CHANGED = NO
```

Status after Food Direct UX Foundation independent acceptance (VERIFIED 2026-08-19):

```text
VISION = VISION-1
ROADMAP = GTM-R37
STATE = STATE-R35
ARCHITECTURE = ARCH-R15
DECISION_REGISTER = DR-12
acceptedThrough = IMP-028A
currentProductSlice = NONE
pendingAcceptance = NONE
IMP-028A = COMPLETE_AND_ACCEPTED
IMP-028A_IMPLEMENTATION_AUTHORIZED = YES
IMP-028A_IMPLEMENTATION_STARTED = YES
IMP-028A_IMPLEMENTATION_COMPLETE = YES
IMP-028A_ACCEPTED = YES
IMP-029 = PLANNED / NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED = NO
NEXT_FREE_DECISION = D-371
FOOD_DIRECT_UX_FOUNDATION_SLICE = FOUNDER_ACCEPTED / CANONICALIZED_AS = IMP-028A / IMPLEMENTED / INDEPENDENTLY_ACCEPTED
FOOD_DIRECT_UX_FOUNDATION_IMPLEMENTATION_AUTHORIZED = YES
FOOD_DIRECT_UX_FOUNDATION_IMPLEMENTATION_STARTED = YES
FOOD_DIRECT_UX_FOUNDATION_IMPLEMENTATION_COMPLETE = YES
D371_CREATED = NO
TYPECHECK_STATUS = FAIL_PRE_EXISTING_UNRELATED
CUSTOMER_ORDERING_E2E = BLOCKED_ENVIRONMENT
```

Status after Food Direct UX Foundation implementation complete pending acceptance (VERIFIED 2026-08-19):

```text
VISION = VISION-1
ROADMAP = GTM-R36
STATE = STATE-R34
ARCHITECTURE = ARCH-R15
DECISION_REGISTER = DR-12
acceptedThrough = IMP-028
currentProductSlice = IMP-028A
pendingAcceptance = IMP-028A
IMP-028A = IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-028A_IMPLEMENTATION_AUTHORIZED = YES
IMP-028A_IMPLEMENTATION_STARTED = YES
IMP-028A_IMPLEMENTATION_COMPLETE = YES
IMP-029 = PLANNED / NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED = NO
NEXT_FREE_DECISION = D-371
FOOD_DIRECT_UX_FOUNDATION_SLICE = FOUNDER_ACCEPTED / CANONICALIZED_AS = IMP-028A
FOOD_DIRECT_UX_FOUNDATION_IMPLEMENTATION_AUTHORIZED = YES
FOOD_DIRECT_UX_FOUNDATION_IMPLEMENTATION_STARTED = YES
FOOD_DIRECT_UX_FOUNDATION_IMPLEMENTATION_COMPLETE = YES
D371_CREATED = NO
```

Status after Food Direct UX Foundation implementation authorization (VERIFIED 2026-08-19):

```text
VISION = VISION-1
ROADMAP = GTM-R35
STATE = STATE-R33
ARCHITECTURE = ARCH-R15
DECISION_REGISTER = DR-12
acceptedThrough = IMP-028
currentProductSlice = IMP-028A
pendingAcceptance = NONE
IMP-028A = IMPLEMENTATION_AUTHORIZED / NOT_STARTED
IMP-028A_IMPLEMENTATION_AUTHORIZED = YES
IMP-028A_IMPLEMENTATION_STARTED = NO
IMP-029 = PLANNED / NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED = NO
NEXT_FREE_DECISION = D-371
FOOD_DIRECT_UX_FOUNDATION_SLICE = FOUNDER_ACCEPTED / CANONICALIZED_AS = IMP-028A
FOOD_DIRECT_UX_FOUNDATION_IMPLEMENTATION_AUTHORIZED = YES
FOOD_DIRECT_UX_FOUNDATION_IMPLEMENTATION_STARTED = NO
D371_CREATED = NO
```

Status after Food Direct UX Foundation canonical activation (VERIFIED 2026-08-18):

```text
VISION = VISION-1
ROADMAP = GTM-R34
STATE = STATE-R32
ARCHITECTURE = ARCH-R15
DECISION_REGISTER = DR-12
acceptedThrough = IMP-028
currentProductSlice = IMP-028A
pendingAcceptance = NONE
IMP-028A = PLANNED / NOT_STARTED / NOT_AUTHORIZED
IMP-028A_IMPLEMENTATION_AUTHORIZED = NO
IMP-028A_IMPLEMENTATION_STARTED = NO
IMP-029 = PLANNED / NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED = NO
NEXT_FREE_DECISION = D-371
FOOD_DIRECT_UX_FOUNDATION_SLICE = FOUNDER_ACCEPTED / CANONICALIZED_AS = IMP-028A
FOOD_DIRECT_UX_FOUNDATION_IMPLEMENTATION_AUTHORIZED = NO
D371_CREATED = NO
ROADMAP_ACTIVATED = YES (IMP-028A only)
CURRENT_PRODUCT_SLICE_CHANGED = YES (NONE → IMP-028A)
```

Status after Food Direct UX Foundation slice definition (VERIFIED 2026-08-18):

```text
VISION = VISION-1
ROADMAP = GTM-R33
STATE = STATE-R31
ARCHITECTURE = ARCH-R15
DECISION_REGISTER = DR-12
acceptedThrough = IMP-028
currentProductSlice = NONE
pendingAcceptance = NONE
IMP-029 = PLANNED / NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED = NO
NEXT_FREE_DECISION = D-371
FOOD_DIRECT_UX_FOUNDATION_SLICE = SUPPORTING / FOUNDER_REVIEW_CANDIDATE
FOOD_DIRECT_UX_FOUNDATION_IMPLEMENTATION_AUTHORIZED = NO
D371_CREATED = NO
ROADMAP_ACTIVATED = NO
CURRENT_PRODUCT_SLICE_CHANGED = NO
```

Status after later D-369 governance task (VERIFIED 2026-08-18):

```text
VISION = VISION-1
ROADMAP = GTM-R32
STATE = STATE-R30
ARCHITECTURE = ARCH-R14
DECISION_REGISTER = DR-11
acceptedThrough = IMP-028
currentProductSlice = NONE
pendingAcceptance = NONE
IMP-029 = PLANNED / NOT_STARTED
IMP-029_IMPLEMENTATION_AUTHORIZED = NO
NEXT_FREE_DECISION = D-370
CUSTOMER_MENU_TARGET = BINDING VIA D-368
PAID_MODIFIER_EXPLICIT_SELECTION = BINDING VIA D-369
D368_CREATED = YES
D369_CREATED = YES
```

## What this pack owns

Working BOBA Direct experience planning for **Food commerce** as the only currently planned
commercial implementation focus, plus supporting brand/lifestyle research that must not be read as
implementation authorization for Wear or Culture.

## What current authorities still own

| Question | Authority |
|---|---|
| Why / GTM outcome / Non-Goals | [`../VISION.md`](../VISION.md) |
| IMP identity / sequence / GTM boundary | [`../ROADMAP.md`](../ROADMAP.md) |
| Independently accepted reality | [`../STATE.md`](../STATE.md) |
| Durable global architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Which decisions are binding | [`../decision-register.md`](../decision-register.md) |
| Locked customer ordering UX capability | [`../capabilities/IMP-025-customer-ordering-ux.md`](../capabilities/IMP-025-customer-ordering-ux.md) |
| Pilot UX hardening | [`../capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md`](../capabilities/IMP-026C-pilot-customer-commerce-ux-hardening.md) |

This pack restates accepted Cart / Checkout Snapshot / Payment / Order / Refund / Financial Document
boundaries where needed. Restatement is not a new decision.

The Food Direct product-architecture planning lock
([`food-direct-product-architecture-lock.md`](./food-direct-product-architecture-lock.md)) is the
consolidated SUPPORTING target for later Food capability slicing. It does not amend CURRENT
architecture, activate a product slice, or authorize implementation.

## Index

| Document | Purpose |
|---|---|
| [`food-direct-product-architecture-lock.md`](./food-direct-product-architecture-lock.md) | **FOUNDER-APPROVED PRODUCT-ARCHITECTURE PLANNING LOCK** (SUPPORTING). Consolidates UX research, gap audit, and D-368 / D-369 / D-370 into Food Direct capability boundaries. Family A is canonicalized as **IMP-028A**; this lock remains SUPPORTING rationale. **Not** implementation authorization. |
| [`slices/food-direct-ux-foundation.md`](./slices/food-direct-ux-foundation.md) | **FOUNDER_ACCEPTED** capability slice A — Food Direct UX Foundation (SUPPORTING rationale). `CANONICALIZED_AS = IMP-028A`. Canonical product authority: [`../capabilities/IMP-028A-food-direct-ux-foundation.md`](../capabilities/IMP-028A-food-direct-ux-foundation.md). **Implemented / independently accepted**. |
| [`slices/customer-menu-projection-and-discovery.md`](./slices/customer-menu-projection-and-discovery.md) | **SUPPORTING** capability family B rationale — Customer Menu Projection + Discovery. `CANONICALIZED_AS = IMP-028B`. Canonical product authority: [`../capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](../capabilities/IMP-028B-customer-menu-projection-and-discovery.md). Architecture **ARCHITECTURE_LOCKED**. Implementation **authorized** / **not started**. |
| [`brand-architecture.md`](./brand-architecture.md) | Working master-brand model: Food / Wear / Culture |
| [`direct-ux-north-star.md`](./direct-ux-north-star.md) | Food-commerce north star and brand-belonging intent |
| [`customer-journey.md`](./customer-journey.md) | Target Food journey vs current repository disposition |
| [`information-architecture.md`](./information-architecture.md) | Home, Menu, global nav, My BOBA, discovery layout |
| [`terminology.md`](./terminology.md) | Working customer-facing terminology standard |
| [`ux-authority-principles.md`](./ux-authority-principles.md) | UX-facing restatement of existing domain authority |
| [`ux-backend-gap-map.md`](./ux-backend-gap-map.md) | Evidence-backed 2026-08-18 repository audit |
| [`capability-families.md`](./capability-families.md) | Planning families A–J (aligned to the Food Direct lock). A = IMP-028A. B = IMP-028B (canonicalized; ARCHITECTURE_LOCKED; IMPLEMENTATION_AUTHORIZED / NOT_STARTED). C–J have no IMP IDs. |
| [`working-decisions.md`](./working-decisions.md) | Supporting working-decision register (not D-xxx) |
| [`open-questions.md`](./open-questions.md) | Unresolved questions; not resolved here |
| [`research/lifestyle-brand-and-commerce-research.md`](./research/lifestyle-brand-and-commerce-research.md) | Research references; not implementation requirements |

## Status vocabulary used in this pack

| Status | Meaning |
|---|---|
| WORKING | Planning conclusion preserved here; not CURRENT unless later promoted |
| DEFINED_FOR_REVIEW | Supporting capability definition persisted for later canonical activation review; not CURRENT |
| EXISTING_AUTHORITY_REFERENCE | Restates CURRENT VISION / ARCH / STATE / D-xxx; does not reopen it |
| SUPERSEDED_WORKING_ALTERNATIVE | Considered during planning and rejected |
| OPEN | Unresolved; see [`open-questions.md`](./open-questions.md) |

Dispositions used in the gap map and journey:

```text
KEEP | FIX | REDESIGN | MISSING | DEFER
```

Those dispositions evaluate current repository facts against the **working** Direct UX. They are not
acceptance judgments and they do not change STATE.

## Explicit non-activation

```text
PRODUCT_SLICE_ACTIVATED = YES (later GTM-R37; IMP-028A COMPLETE_AND_ACCEPTED; currentProductSlice NONE)
IMP028A_CANONICALIZED = YES
IMP-028A_IMPLEMENTATION_AUTHORIZED = YES
IMP-028A_IMPLEMENTATION_STARTED = YES
IMP-028A_IMPLEMENTATION_COMPLETE = YES
IMP-028A_ACCEPTED = YES
IMP029_STARTED = NO
D368_CREATED = YES   (later governance task; this pack did not create D-368)
CUSTOMER_MENU_TARGET = BINDING VIA D-368
D369_CREATED = YES   (later governance task; this pack did not create D-369)
PAID_MODIFIER_EXPLICIT_SELECTION = BINDING VIA D-369
D370_CREATED = YES   (later governance task; this pack did not create D-370)
CART_IDENTITY_TRANSITION = BINDING VIA D-370
WEAR_IMPLEMENTATION_AUTHORIZED = NO
CULTURE_IMPLEMENTATION_AUTHORIZED = NO
REWARDS_IMPLEMENTATION_AUTHORIZED = NO
FOOD_DIRECT_IMPLEMENTATION_AUTHORIZED = NO
FOOD_DIRECT_PRODUCT_ARCHITECTURE_LOCK = SUPPORTING / FOUNDER-APPROVED PLANNING LOCK
FOOD_DIRECT_UX_FOUNDATION_SLICE = FOUNDER_ACCEPTED / CANONICALIZED_AS = IMP-028A
FOOD_DIRECT_UX_FOUNDATION_IMPLEMENTATION_AUTHORIZED = YES
IMP028A_CANONICALIZED = YES
IMP-028A_IMPLEMENTATION_AUTHORIZED = YES
IMP-028A_IMPLEMENTATION_STARTED = YES
IMP-028A_IMPLEMENTATION_COMPLETE = YES
IMP-028A_ACCEPTED = YES
FOOD_DIRECT_CAPABILITY_B = CANONICALIZED_AS = IMP-028B
CANONICALIZED_AS = IMP-028B
IMP028B_CANONICALIZED = YES
IMP028B_IMPLEMENTATION_AUTHORIZED = YES
IMP028B_IMPLEMENTATION_STARTED = NO
IMP028B_IMPLEMENTATION_COMPLETE = NO
IMP028B_ACCEPTED = NO
D371_CREATED = NO
```
