---
Status: SUPPORTING PRODUCT / EXPERIENCE MATERIAL
Authority: NONE — supporting working-decision register, not docs/platform/decision-register.md
Next free CURRENT decision: D-371 (D-370 allocated to Cart Identity Transition Authority)
Preserved: 2026-08-18
---

# Supporting working-decision register

**SUPPORTING.** Local identifiers use the `EXP-WD-nnn` namespace so they cannot be mistaken for
CURRENT `D-xxx` decisions. **D-368 was later allocated** to Customer Menu Read Projection Authority,
**D-369** to Customer Paid Modifier Explicit Selection Authority, and **D-370** to Cart Identity
Transition Authority by separate governance tasks.
This pack did not create them. Unrelated working decisions here remain SUPPORTING.

Statuses:

| Status | Meaning |
|---|---|
| WORKING | Planning conclusion preserved in this pack |
| EXISTING_AUTHORITY_REFERENCE | Restates CURRENT VISION / ARCH / STATE / D-xxx |
| SUPERSEDED_WORKING_ALTERNATIVE | Considered and rejected during planning |
| OPEN | Unresolved; see [`open-questions.md`](./open-questions.md) |

Potential future canonicalization (not performed by this pack):

```text
DOC_ONLY | VISION | ARCHITECTURE | D-XXX_CANDIDATE | CAPABILITY_AC | BUSINESS_POLICY
```

---

## EXP-WD-001 — Master-brand pillars

| Field | Value |
|---|---|
| Topic | Food / Wear / Culture as one brand world |
| Working decision | BOBA BEAR master brand with Food (current commercial priority), Wear (future), Culture (emerging / soon) |
| Rationale | Avoid restaurant + unrelated clothing store + generic culture page |
| Repository support | PARTIAL — VISION-1 §9 long-term merch/drops; V1 is food-ordering (`v1-product-scope.md`) |
| Status | WORKING |
| Potential future canonicalization | VISION |

## EXP-WD-002 — Food remains commercial implementation focus

| Field | Value |
|---|---|
| Topic | What may be commercially implemented from this pack |
| Working decision | FOOD is the only currently planned commercial implementation focus. Wear and Culture are not implementation-authorized by this documentation. |
| Rationale | VISION V1 / Non-Goals and ROADMAP deferred list already bound implementation |
| Repository support | EXISTS — VISION-1; `v1-product-scope.md`; ROADMAP deferred Wear/Culture-equivalent work unscheduled |
| Status | EXISTING_AUTHORITY_REFERENCE (food V1) + WORKING (explicit Wear/Culture non-authorization) |
| Potential future canonicalization | DOC_ONLY |

## EXP-WD-003 — Strategic pillar meanings

| Field | Value |
|---|---|
| Topic | What each pillar is for |
| Working decision | Food = taste/craving/recurring ritual; Wear = identity/self-expression; Culture = belonging/participation |
| Rationale | Pillars must reinforce one identity, not three disconnected businesses |
| Repository support | NOT_FOUND as CURRENT vision wording |
| Status | WORKING |
| Potential future canonicalization | VISION |

## EXP-WD-004 — “for the Unbothered”

| Field | Value |
|---|---|
| Topic | Brand framing |
| Working decision | Record founder-supplied direction “for the Unbothered” without converting it into canonical VISION authority |
| Rationale | Preserve existing brand language; do not silently amend VISION-1 |
| Repository support | NOT_FOUND in VISION-1 |
| Status | WORKING |
| Potential future canonicalization | VISION |

## EXP-WD-005 — Culture as participation

| Field | Value |
|---|---|
| Topic | Culture capability shape |
| Working decision | Culture should be something people participate in, not merely something the brand claims |
| Rationale | Research: ALD / SOCIAL-style participation beats a generic Culture page |
| Repository support | Current `Artists.tsx` teaser only |
| Status | WORKING |
| Potential future canonicalization | DOC_ONLY (until exact Culture capability is decided) |

## EXP-WD-006 — Recurring cultural ritual / IP

| Field | Value |
|---|---|
| Topic | Culture content vs owned ritual |
| Working decision | A recurring BOBA-owned cultural ritual/IP may be more valuable than a generic Culture content section. Names discussed (Unbothered Sessions, BOBA Radio, After Hours, local creator collaborations, match/game nights, Drop Stories) remain concepts, not roadmap commitments. |
| Rationale | Lifestyle research; avoid CMS-shaped Culture |
| Repository support | NOT_FOUND as product |
| Status | WORKING |
| Potential future canonicalization | DOC_ONLY |

## EXP-WD-007 — Drops as campaign mechanism

| Field | Value |
|---|---|
| Topic | Drops vs pillars |
| Working decision | Food / Wear / Culture = brand pillars. Drops = potential recurring campaign/release mechanism spanning pillars (Food Drop, Wear Drop, Culture activation, Collaboration). |
| Rationale | KITH-style release language without merging domains |
| Repository support | Static `SignatureDrops.tsx` only; not a commerce entity |
| Status | WORKING |
| Potential future canonicalization | ARCHITECTURE / D-XXX_CANDIDATE (when real drops are authorized) |

## EXP-WD-008 — BrandDrop must not absorb domain authority

| Field | Value |
|---|---|
| Topic | Drop authority boundary |
| Working decision | BrandDrop MUST NOT automatically become pricing, inventory, checkout, Food Menu, Wear SKU, or Culture participation authority. Underlying domains remain authoritative. |
| Rationale | ARCH-G05/G11 and single-authority principle; prevent a campaign object from becoming a second catalog |
| Repository support | No BrandDrop entity today |
| Status | WORKING |
| Potential future canonicalization | D-XXX_CANDIDATE |
| Note | **Not D-368, D-369, or D-370.** D-368 is Customer Menu Read Projection Authority. D-369 is Customer Paid Modifier Explicit Selection Authority. D-370 is Cart Identity Transition Authority. Drop authority remains WORKING / not CURRENT. |

## EXP-WD-009 — Food Direct north star

| Field | Value |
|---|---|
| Topic | Food-commerce UX outcome |
| Working decision | BOBA Direct should make the next best purchase decision obvious (reduce time-to-first-Add, scrolling, abandonment, extra decisions; increase add/cart-value/attach/checkout/repeat/reorder/limited-drop conversion). |
| Rationale | Direct channel must convert owned demand, not only look editorial |
| Repository support | PARTIAL — IMP-025 journey exists; discovery UX is a long-page catalog |
| Status | WORKING |
| Potential future canonicalization | DOC_ONLY / later CAPABILITY_AC |

## EXP-WD-010 — Belonging north star

| Field | Value |
|---|---|
| Topic | Brand-level intent |
| Working decision | BOBA Bear should create a world people want to belong to |
| Rationale | Lifestyle house, not three disconnected properties |
| Repository support | NOT_FOUND as CURRENT vision sentence |
| Status | WORKING |
| Potential future canonicalization | VISION |

## EXP-WD-011 — Home vs Menu

| Field | Value |
|---|---|
| Topic | Information architecture |
| Working decision | Home = brand discovery + appetite + campaign + conversion entry. Menu = primary Food commerce discovery/catalog. Home must not duplicate the full ordering catalog. |
| Rationale | Current Home marketing menu with hardcoded prices competes with `/order` |
| Repository support | PARTIAL — Home is editorial **and** a fake catalog (`menu.json`) |
| Status | WORKING |
| Potential future canonicalization | DOC_ONLY / CAPABILITY_AC |

## EXP-WD-012 — Working global navigation

| Field | Value |
|---|---|
| Topic | Chrome IA |
| Working decision | Logged out: Menu \| Drops \| Offers \| Sign In \| Cart. Logged in: Menu \| Drops \| Offers \| Hi \<customer\> / My BOBA \| Cart. Sign Out inside My BOBA. |
| Rationale | One brand world; session-true chrome; Cart always reachable |
| Repository support | CONFLICT — dual nav sets; always Sign in; Orders peer of Menu |
| Status | WORKING |
| Potential future canonicalization | CAPABILITY_AC |

## EXP-WD-013 — My BOBA hierarchy and role

| Field | Value |
|---|---|
| Topic | Relationship surface |
| Working decision | My BOBA = relationship + commerce convenience, not a settings-first admin portal. Full working tree: Order Again, My Orders, Saved Addresses, Favorites, Rewards, Profile, Sign Out. **Initial Food Direct My BOBA Foundation** (planning lock): Active Order, My Orders, Saved Addresses, Profile, Sign Out. Order Again is a separate later capability. Favorites / Rewards remain deferred. |
| Rationale | Repeat purchase and belonging, not account administration; MVP hub must not fake later capabilities |
| Repository support | ABSENT hub; fragments only |
| Status | WORKING |
| Potential future canonicalization | CAPABILITY_AC |
| Note | Qualified 2026-08-18 by Food Direct product-architecture lock. The full tree is still the relationship north star; initial Foundation is the subset that may be sliced first. |

## EXP-WD-014 — Terminology standard

| Field | Value |
|---|---|
| Topic | Customer-facing language |
| Working decision | ONE CUSTOMER CONCEPT → ONE CANONICAL CUSTOMER-FACING TERM. Menu, Order Now, My Orders, My BOBA, Cart, Order Again, Customize, Saved Addresses, Sign In. Do not rewrite backend vocabulary to match. |
| Rationale | Current Order / Order now / Orders / Menu collision |
| Repository support | CONFLICT in live UI (`Nav.tsx`) |
| Status | WORKING |
| Potential future canonicalization | DOC_ONLY |

## EXP-WD-015 — Rejected Order + Orders peer nav

| Field | Value |
|---|---|
| Topic | Global-nav labeling |
| Working decision | Using “Order” and “Orders” as peer global-navigation destinations is rejected because the labels are too similar during scanning. |
| Rationale | Scan collision; Menu + Order Now + My Orders is the working replacement |
| Repository support | Current `Nav` still uses Order / Orders |
| Status | SUPERSEDED_WORKING_ALTERNATIVE |
| Potential future canonicalization | DOC_ONLY |

## EXP-WD-016 — Menu layout

| Field | Value |
|---|---|
| Topic | Discovery layout |
| Working decision | Desktop: sticky categories + product content area + persistent Cart. Mobile: sticky/horizontal categories + product feed + persistent bottom Cart state. |
| Rationale | Reduce scrolling and time to first Add |
| Repository support | PARTIAL — mobile `StickyCartBar` on `/order`; no sticky cats; long page |
| Status | WORKING |
| Potential future canonicalization | CAPABILITY_AC |
| Note | Qualified 2026-08-19 by Capability B supporting definition: sticky/horizontal category chrome remains a working visual candidate, not first-B product law. First B persists the category-navigation **outcome**. See [`slices/customer-menu-projection-and-discovery.md`](./slices/customer-menu-projection-and-discovery.md). |

## EXP-WD-017 — Most Ordered evidence

| Field | Value |
|---|---|
| Topic | Popularity claims |
| Working decision | “Most Ordered” must eventually be based on real commerce evidence if presented as a factual popularity claim. |
| Rationale | Correctness before convenience; do not invent popularity |
| Repository support | NOT_FOUND as a live ranking |
| Status | WORKING |
| Potential future canonicalization | BUSINESS_POLICY / CAPABILITY_AC |

## EXP-WD-018 — Product-card grammar

| Field | Value |
|---|---|
| Topic | Product presentation |
| Working decision | Card = image, product name, short sensory description, display/current price, limited useful tags, Add or Customize CTA. Internal SKU/modifier terms must not leak. |
| Rationale | Appetite objects, not qty-row administration |
| Repository support | PARTIAL — add/qty rows; tags unused on `/order` |
| Status | WORKING |
| Potential future canonicalization | DOC_ONLY / CAPABILITY_AC |

## EXP-WD-019 — Customization UX model

| Field | Value |
|---|---|
| Topic | Configure-before-add |
| Working decision | MenuItem → Food Modifier Groups → Options. Backend defines available customization. SIZE/SWEETNESS/ICE/EXTRAS/REMOVALS are conceptual UX types, not new schema enums. |
| Rationale | Generic groups already exist (ADR-006); live import empty; no customer UI |
| Repository support | EXISTS schema; ABSENT live content and UI |
| Status | WORKING (UX) + EXISTING_AUTHORITY_REFERENCE (generic modifier model) |
| Potential future canonicalization | CAPABILITY_AC; typed kinds remain OPEN / D-XXX_CANDIDATE if needed |

## EXP-WD-020 — Customization operating rules

| Field | Value |
|---|---|
| Topic | Paid extras, defaults, removals, bundles, history |
| Working decision | Paid extras require explicit customer action (**BINDING VIA D-369**). Visible zero-cost standard defaults may be useful and must remain visible when the customization surface is present (**BINDING VIA D-369**). Free-text must never create paid entitlement if later introduced. Ingredient removal does not imply price reduction. Material substitutions must never happen silently. Bundles/combos must not be semantically flattened into modifiers when they are separate products. Current catalog changes must not rewrite historical purchase configuration. |
| Rationale | Protect snapshot/history truth (ARCH-G05) and ADR-006 no-silent-substitution; paid-default prohibition canonicalized by D-369 / ARCH-G20 |
| Repository support | EXISTS `price_delta_paise >= 0`; snapshot seals selected options; paid-default prohibition CURRENT via [D-369](../decision-register.md) |
| Status | EXISTING_AUTHORITY_REFERENCE (paid explicit selection + visible zero-price standard defaults via D-369; no silent substitution; historical seal) + WORKING (remaining UX rules) |
| Potential future canonicalization | Paid defaults already CURRENT via D-369 (implementation not authorized; typed kinds / exact UX remain OPEN) |

## EXP-WD-021 — Cart and snapshot roles

| Field | Value |
|---|---|
| Topic | Purchase intent vs payable offer |
| Working decision | Cart = customer purchase intent. Checkout Snapshot = authoritative commercial offer. Cart may show estimates; must not compete as final pricing authority. |
| Rationale | Already CURRENT; UX must not reopen |
| Repository support | EXISTS IMP-020 / IMP-021 / ARCH-G05 / ARCH-G11 |
| Status | EXISTING_AUTHORITY_REFERENCE |
| Potential future canonicalization | Already CURRENT |

## EXP-WD-022 — Cart UX principles

| Field | Value |
|---|---|
| Topic | Guest, auth survival, merge, revalidation |
| Working decision | Guest browse/add supported; Cart must survive authentication; identical configured lines may merge where identity rules allow; materially different configs remain separate; stale Cart revalidated with resolvable conflicts; no silent substitution. Guest→customer compatible purchase-intent merge and logout customer-cart isolation are **BINDING VIA D-370**. |
| Rationale | Trust during the Direct journey; identity-transition policy canonicalized by D-370 / ARCH-G21 |
| Repository support | EXISTS guest XOR customer, config merge rules, claim at checkout (CURRENT implementation); merge/logout **policy** CURRENT via [D-370](../decision-register.md) |
| Status | EXISTING_AUTHORITY_REFERENCE (`CART_IDENTITY_TRANSITION = BINDING VIA D-370`) + WORKING (remaining UX copy/timing) |
| Potential future canonicalization | Already CURRENT via D-370 (policy only; implementation not authorized) |

## EXP-WD-023 — Auth vs profile vs history

| Field | Value |
|---|---|
| Topic | Identity vs current facts vs purchased facts |
| Working decision | Authentication = who are you? Customer Profile = what current information do we know? Historical Checkout/Order = transaction truth at purchase. Current profile/address edits must not rewrite historical transactions. |
| Rationale | ARCH-G03, ARCH-G05, ARCH-G16; IMP-017/018 |
| Repository support | EXISTS APIs; Profile UI ABSENT |
| Status | EXISTING_AUTHORITY_REFERENCE |
| Potential future canonicalization | Already CURRENT |

## EXP-WD-024 — Saved Address role

| Field | Value |
|---|---|
| Topic | Reusable destinations |
| Working decision | Saved Address = convenience / reusable fulfilment destination. Default Address = convenience default, not invisible fulfilment commitment. Address ≠ delivery instructions. |
| Rationale | Prevent silent fulfilment from a stale default |
| Repository support | EXISTS IMP-018 CRUD; checkout uses select/create only |
| Status | WORKING (UX semantics) + EXISTING_AUTHORITY_REFERENCE (address snapshots at checkout) |
| Potential future canonicalization | DOC_ONLY / CAPABILITY_AC |

## EXP-WD-025 — Serviceability vs Delivery Promise

| Field | Value |
|---|---|
| Topic | Can vs when |
| Working decision | Serviceability = can BOBA fulfil here? Delivery Promise = when can BOBA fulfil here? Do not conflate. Progressive location: browse without full auth/address; lightweight service context may improve Menu; exact destination authoritative at Checkout; changes trigger revalidation. |
| Rationale | IMP-019 + IMP-026C no fake ETA |
| Repository support | EXISTS serviceability; Delivery Promise domain NOT_FOUND |
| Status | EXISTING_AUTHORITY_REFERENCE (coverage) + WORKING (progressive-location UX) |
| Potential future canonicalization | DOC_ONLY |

## EXP-WD-026 — Payment projections and confirmation

| Field | Value |
|---|---|
| Topic | Payment UX vs Payment domain |
| Working decision | Browser callback ≠ success. INDETERMINATE → Do not pay again. Confirmation requires a real BOBA Order. Public `orderNumber` is the customer/support reference. Customer-facing projections CONFIRMING / SUCCESS / DEFINITE FAILURE / INDETERMINATE. Do not create new Payment domain states for UX. |
| Rationale | D-361–D-362; ARCH-G06/G07/G10 |
| Repository support | EXISTS authority; FIX recovery/copy/heading/newest-order/modifier render |
| Status | EXISTING_AUTHORITY_REFERENCE + WORKING (projection labels) |
| Potential future canonicalization | Already CURRENT (authority); CAPABILITY_AC (copy/recovery fixes) |

## EXP-WD-027 — Favorite vs Usual vs Order Again

| Field | Value |
|---|---|
| Topic | Repeat-purchase concepts |
| Working decision | Favorite = product affinity. Saved Configuration / My Usual = preferred configuration template. Order Again = historical Order used to create NEW current purchase intent. Order Again must not replay old Checkout Snapshot as current commercial truth. |
| Rationale | Protect ARCH-G05; avoid mixing affinity, template, and history |
| Repository support | All three ABSENT as product; snapshot replay would CONFLICT with ARCH-G05 |
| Status | WORKING |
| Potential future canonicalization | ARCHITECTURE / CAPABILITY_AC for Order Again; Favorites/Usual remain OPEN timing |

## EXP-WD-028 — Offers UI is not price authority

| Field | Value |
|---|---|
| Topic | Customer Offers |
| Working decision | Customer-facing Offers may exist later over the existing promotion engine; UI must not become competing price authority. Best-available-offer auto-application remains OPEN. |
| Rationale | IMP-016 already seals promotions into snapshot |
| Repository support | EXISTS engine + `POST /api/v1/cart/coupon`; ABSENT Offers page/field |
| Status | WORKING |
| Potential future canonicalization | CAPABILITY_AC; auto-apply = BUSINESS_POLICY (OPEN) |

## EXP-WD-029 — Customer Menu serving target

| Field | Value |
|---|---|
| Topic | Customer Menu storefront delivery |
| Working decision | Long-term BOBA Direct customer Menu is a server-backed READ PROJECTION over existing commerce authorities. Static `ordering-catalog.json` remains TRANSITIONAL CURRENT delivery until an authorized future capability replaces it. |
| Rationale | Canonicalized by D-368. Layout/search/Most Ordered remain separate WORKING/OPEN matters. |
| Repository support | EXISTS — [D-368](../decision-register.md); ARCH-G19; accepted IMP-025 static catalog remains CURRENT implementation |
| Status | EXISTING_AUTHORITY_REFERENCE (`CUSTOMER_MENU_TARGET = BINDING VIA D-368`) |
| Potential future canonicalization | Already CURRENT via D-368 (serving/read-boundary only; implementation not authorized) |

## EXP-WD-030 — Paid modifier explicit selection

| Field | Value |
|---|---|
| Topic | Positive-price modifier purchase intent |
| Working decision | A positive-price modifier must not become customer purchase intent solely because it is a catalog/default selection. Explicit current-interaction selection is required. Zero-price standard defaults MAY be visibly preselected. Recommendation is not selection. Required all-paid groups must not silently auto-select a paid option. |
| Rationale | Canonicalized by D-369. Does not implement customization or change Cart/Checkout Snapshot/pricing authority. |
| Repository support | EXISTS — [D-369](../decision-register.md); ARCH-G20; schema can represent `default_quantity` + non-negative `price_delta_paise`; live import `modifier_groups: 0` |
| Status | EXISTING_AUTHORITY_REFERENCE (`PAID_MODIFIER_EXPLICIT_SELECTION = BINDING VIA D-369`) |
| Potential future canonicalization | Already CURRENT via D-369 (policy only; implementation not authorized) |

## EXP-WD-031 — Cart identity transition

| Field | Value |
|---|---|
| Topic | Guest→customer merge and logout customer-cart isolation |
| Working decision | When an active guest Cart and an active customer Cart both exist, compatible purchase intent must be merged into a customer-owned Cart. Silent whole-cart winner selection is forbidden. Different configured selections remain distinct. Failed merge must not silently discard or partially destroy source intent. After success the former guest credential is not authority over the customer Cart. Sign-out must not delete the customer Cart; the browser becomes anonymous and must not expose or copy that Cart. Customer B must not receive Customer A’s Cart. |
| Rationale | Canonicalized by D-370. Does not implement merge, change authentication, or change Cart/Checkout Snapshot/pricing authority. |
| Repository support | EXISTS — [D-370](../decision-register.md); ARCH-G21; IMP-020 guest XOR customer + configured-line identity; accepted checkout claim/reconcile remains CURRENT implementation |
| Status | EXISTING_AUTHORITY_REFERENCE (`CART_IDENTITY_TRANSITION = BINDING VIA D-370`) |
| Potential future canonicalization | Already CURRENT via D-370 (policy only; implementation not authorized) |

## EXP-WD-032 — Food Direct product-architecture planning lock

| Field | Value |
|---|---|
| Topic | Consolidated Food Direct planning target |
| Working decision | [`food-direct-product-architecture-lock.md`](./food-direct-product-architecture-lock.md) is the SUPPORTING founder-approved product-architecture planning lock for later Food capability slicing. Families A–J (UX Foundation, Menu projection, Customization, Cart/session, Checkout/payment UX, My BOBA Foundation, Order Again, Offers, Drops, Favorites/My Usual) are planning families, not IMPs. |
| Rationale | Prevent contradictory family maps after D-368 / D-369 / D-370 |
| Repository support | EXISTS as SUPPORTING artifact; CURRENT authorities unchanged |
| Status | WORKING |
| Potential future canonicalization | Later capability AC / ROADMAP promotion by humans only |

## EXP-WD-033 — Menu projection and visual discovery stay one family

| Field | Value |
|---|---|
| Topic | D-368 vs visual Menu redesign |
| Working decision | Visual Menu discovery and D-368 serving belong in one family (B). A separately accepted “pretty static catalog” is rejected as TARGET Menu. Internal adapter scaffolding is allowed; B acceptance requires D-368 projection serving. Family B is canonicalized as **IMP-028B** (`CANONICALIZED_AS = IMP-028B`; architecture `ARCHITECTURE_LOCKED`; implementation AUTHORIZED / NOT_STARTED) in [`../capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](../capabilities/IMP-028B-customer-menu-projection-and-discovery.md) with supporting rationale in [`slices/customer-menu-projection-and-discovery.md`](./slices/customer-menu-projection-and-discovery.md). |
| Rationale | Static catalog cannot truthfully project live availability/display price; double-rewrite risk |
| Repository support | D-368 CURRENT; IMP-025 static catalog TRANSITIONAL CURRENT |
| Status | WORKING |
| Potential future canonicalization | CAPABILITY_AC |

## EXP-WD-034 — Customization content vs UI workstreams

| Field | Value |
|---|---|
| Topic | Modifier activation vs Customize surface |
| Working decision | C-CONTENT (import/data) and C-UI (Customize + D-369) are workstreams inside family C, not two CURRENT decisions. Content may start before UI. Customer-valuable UI SHOULD consume D-368 modifier projection rather than a second Menu read. Typed SIZE/SWEETNESS/ICE schema is not required. |
| Rationale | Live import `modifier_groups: 0`; schema already generic |
| Repository support | ADR-006; D-369; empty live import |
| Status | WORKING |
| Potential future canonicalization | CAPABILITY_AC |

## EXP-WD-035 — Order Again separate from My BOBA Foundation

| Field | Value |
|---|---|
| Topic | Repeat-purchase operation vs hub |
| Working decision | Order Again is a separate later capability (G): historical Order → new current Cart intent → current revalidation. Initial My BOBA Foundation (F) does not include the Order Again operation. Do not show a dead Order Again control. |
| Rationale | ARCH-G05; hub can exist over existing APIs without a reorder op |
| Repository support | Order Again ABSENT; Profile/Addresses/Orders APIs EXIST |
| Status | WORKING |
| Potential future canonicalization | CAPABILITY_AC |

## EXP-WD-036 — Offers minimum later scope

| Field | Value |
|---|---|
| Topic | Customer Offers without auto-apply |
| Working decision | Minimum later Offers experience = browse existing promotions + optional coupon field via existing cart coupon API. UI is not price authority. `BEST_AVAILABLE_OFFER_AUTO_APPLICATION` remains OPEN and is out of that minimum. Offers is not Food Direct MVP. |
| Rationale | IMP-016 already exists; auto-apply is a separate business policy |
| Repository support | EXISTS engine; ABSENT Offers page |
| Status | WORKING |
| Potential future canonicalization | CAPABILITY_AC; auto-apply remains OPEN / BUSINESS_POLICY |

## EXP-WD-037 — First Food Direct slice needs no new CURRENT decision

| Field | Value |
|---|---|
| Topic | Remaining D-xxx after D-370 |
| Working decision | No remaining CURRENT-decision gap blocks Food Direct MVP slicing (A–F). D-371 is not consumed by this pack. Later-slice candidates (auto-apply, BrandDrop authority, My Usual, special instructions, Most Ordered ranking, typed kinds, deletion/retention) stay OPEN or DEFERRED as classified in [`open-questions.md`](./open-questions.md). Bounded Capability B definition also does not consume D-371 (`D371_REQUIRED_FOR_CAPABILITY_B_DEFINITION = NO`). |
| Rationale | D-368 / D-369 / D-370 already bind Menu serving, paid selection, and cart identity |
| Repository support | DR-12 next free = D-371 |
| Status | WORKING |
| Potential future canonicalization | DOC_ONLY |

## EXP-WD-038 — Capability B supporting definition

| Field | Value |
|---|---|
| Topic | Customer Menu Projection + Discovery supporting definition |
| Working decision | Food Direct capability family B is canonicalized as **IMP-028B — Customer Menu Projection + Discovery** (GTM-R38 / STATE-R36). GTM-R39 / STATE-R37 lock architecture and authorize implementation without starting it. Supporting rationale remains in [`slices/customer-menu-projection-and-discovery.md`](./slices/customer-menu-projection-and-discovery.md) (`CANONICALIZED_AS = IMP-028B`). Canonical product authority: [`../capabilities/IMP-028B-customer-menu-projection-and-discovery.md`](../capabilities/IMP-028B-customer-menu-projection-and-discovery.md). Architecture is `ARCHITECTURE_LOCKED`. Implementation is **AUTHORIZED** / **NOT_STARTED** / not accepted. Availability is optional display projection in first B. Category navigation outcome is in scope; exact sticky/layout pattern is not product law. D-371 is not required for this lock or for bounded B implementation. |
| Rationale | Promote the reviewed B boundary, non-goals, and proposed ACs into canonical IMP-028B while locking implementation architecture under D-368 / ARCH-G19 and authorizing implementation without starting it. |
| Repository support | EXISTS as canonical capability + SUPPORTING artifact; D-368 / ARCH-G19 CURRENT; IMP-025 static catalog TRANSITIONAL CURRENT; IMP-028A COMPLETE_AND_ACCEPTED; ROADMAP GTM-R39 / STATE STATE-R37 |
| Status | WORKING / EXISTING_AUTHORITY_REFERENCE |
| Potential future canonicalization | Already canonicalized as IMP-028B; architecture locked; implementation authorized and not started |


