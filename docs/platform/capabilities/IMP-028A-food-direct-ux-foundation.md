<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-028A",
  "title": "Food Direct UX Foundation",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "COMPLETE_AND_ACCEPTED",
  "implementationAuthorized": true,
  "lastReviewed": "2026-08-19",
  "bindingDecisions": ["D-356", "D-359", "D-360", "D-368", "D-369", "D-370"],
  "dependsOn": ["IMP-009", "IMP-020", "IMP-023", "IMP-024", "IMP-025", "IMP-026C"]
}
-->

# IMP-028A — Food Direct UX Foundation

## Capability Architecture (ARCHITECTURE_LOCKED)

This document is the **locked capability architecture** for IMP-028A — Food Direct UX Foundation.
It locks the independently accepted canonical scope without broadening it. Global architecture
remains ARCH-R15. No new decision is created (`D-371` unused).

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Implementation | `COMPLETE_AND_ACCEPTED` |
| Implementation authorized | **YES** |
| Implementation started | **YES** |
| Implementation complete | **YES** |
| Roadmap lifecycle | `COMPLETE_AND_ACCEPTED` |
| Acceptance | **COMPLETE_AND_ACCEPTED**; `acceptedThrough = IMP-028A`; `pendingAcceptance = NONE` |
| Schema change required | **NO** |
| New API / transport / domain | **NO** |
| New decision | **NO** (`D-371` unused) |

Capability-local architecture remains locked from already-approved authority (canonical IMP-028A
scope, founder-accepted supporting slice, founder-accepted Food Direct product-architecture planning
lock, ARCH-R15, D-356 / D-359 / D-360, D-368 / D-369 / D-370 as unimplemented boundaries, and
existing IMP-009 / IMP-020 / IMP-023 / IMP-024 / IMP-025 / IMP-026C). Implementation is
**authorized**, **started**, **complete**, and **independently accepted**. This lock does **not**
implement D-368 / D-369 / D-370, change global architecture, or retarget IMP-029.

Supporting source (rationale retained; not competing product authority):

[`../experience/slices/food-direct-ux-foundation.md`](../experience/slices/food-direct-ux-foundation.md)

```text
DOMAIN: NONE
DATABASE: NONE
MIGRATION: NONE
SERVER_API: NONE
PAYMENT_PROVIDER: NONE
ORDER_MODEL: NONE
NEW_DECISION: NONE
D371_CREATED: NO
IMP029_RETARGETED: NO
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: YES
IMPLEMENTATION_COMPLETE: YES
IMP-028A_ARCHITECTURE_LOCKED: YES
IMP-028A_IMPLEMENTATION_AUTHORIZED: YES
IMP-028A_IMPLEMENTATION_STARTED: YES
IMP-028A_IMPLEMENTATION_COMPLETE: YES
IMP-028A_ACCEPTED: YES
```

Intended change classes only:

```text
UI_PRESENTATION
CLIENT_STATE_MAPPING
CONTENT_TERMINOLOGY
ACCESSIBILITY
```

---

## 1. Governance Metadata

| Field | Value |
|---|---|
| IMP | IMP-028A |
| Capability | Food Direct UX Foundation |
| Roadmap lifecycle | `COMPLETE_AND_ACCEPTED` |
| Implementation | `AUTHORIZED` / `STARTED` / `COMPLETE` |
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Accepted product through | IMP-028A — Food Direct UX Foundation |
| Current product slice | NONE |
| Pending acceptance | NONE |
| Next product slice | IMP-029 — Operations Console API (unchanged; not this capability) |
| Public GTM boundary | IMP-040 |
| Placement | after accepted IMP-028; before planned IMP-029 |
| Binding decisions consumed | D-356, D-359, D-360 (transport/static frontend); D-368 / D-369 / D-370 remain CURRENT and **unimplemented** by this capability |
| New decision | **NO** (next free ID remains `D-371`) |
| Global architecture | ARCH-R15 unchanged |
| Decision register | DR-12 unchanged |
| Supporting canonicalization | FOUNDER_ACCEPTED → `CANONICALIZED_AS = IMP-028A` |

Canonical authorities:

| Question | Authority |
|---|---|
| Why / Non-Goals | [`../VISION.md`](../VISION.md) |
| Sequence / lifecycle | [`../ROADMAP.md`](../ROADMAP.md) |
| Accepted reality | [`../STATE.md`](../STATE.md) |
| Durable global architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Binding decisions | [`../decision-register.md`](../decision-register.md) |
| Customer UX baseline | [`IMP-025-customer-ordering-ux.md`](./IMP-025-customer-ordering-ux.md) |
| Pilot UX hardening | [`IMP-026C-pilot-customer-commerce-ux-hardening.md`](./IMP-026C-pilot-customer-commerce-ux-hardening.md) |
| Founder-accepted supporting slice | [`../experience/slices/food-direct-ux-foundation.md`](../experience/slices/food-direct-ux-foundation.md) |
| This capability | **This document** |

Layering (unchanged):

```text
UI → Transport → Application Operations → Domain Authority → Persistence → Provider Adapter
```

IMP-028A owns **UI presentation, session-aware chrome mapping over existing APIs, terminology, and
Direct-accurate customer copy**. It must not invent application/domain semantics.

---

## 2. Capability Purpose

Create a coherent, responsive, session-aware BOBA Direct customer-commerce **shell** using existing
accepted commerce/auth/session capabilities.

The customer must clearly understand:

- where to browse Food (**Menu**);
- whether they are signed in;
- where their **Cart** is;
- where historical purchases live (**My Orders**);
- how to sign out;
- how BOBA names its commerce concepts;
- how Home transitions into ordering (**Order Now**).

No new commercial authority.

---

## 3. Customer Problem

The accepted product already completes an owned Food order. The customer-facing shell does not match
that reality.

Verified current defects (supporting slice; not repaired by this activation):

- Global chrome always says **Sign in** after a successful OTP session.
- Sign Out exists only on `/login` after the customer is already signed in.
- Marketing chrome and commerce chrome are two different products.
- Competing labels (**Order** / **Order now** / **Orders** / **Menu**) describe overlapping concepts.
- There is no global Cart entry outside `/order`.
- Home still converts toward Access Drop / in-page marketing menu, while `/order` is the live catalog.
- Privacy / equivalent copy still describes ordering as off-site Zomato / Swiggy / WhatsApp.

---

## 4. Existing Authority / Dependencies

No new domain authority. **NEW_BACKEND_REQUIRED = NONE.**

| Target | Reuse | Class |
|---|---|---|
| Customer authentication / session | IMP-009; `GET /api/customer-auth/session`; `fetchCustomerSession` | EXISTING_API / MINOR_CLIENT_INTEGRATION |
| Sign Out | IMP-009; `POST /api/customer-auth/sign-out`; `signOutCustomer()` | EXISTING_API / MINOR_CLIENT_INTEGRATION |
| Sign In destination | `/login` | UX_ONLY (chrome link) |
| Cart navigation | `/order/cart/`; IMP-020; IMP-025/026C Cart surfaces | UX_ONLY for chrome entry |
| Menu destination | Current `/order` static `ordering-catalog.json` (IMP-025 TRANSITIONAL CURRENT under D-368) | UX_ONLY (label + nav target) |
| My Orders destination | `/order/orders/`; IMP-023 order list | UX_ONLY (label + My BOBA placement) |
| Drops | Home `#drops` campaign destination | UX_ONLY (hash destination) |
| Offers | IMP-016 engine exists; no customer page | DEFER — omit from primary nav |
| Sticky mobile Cart | Accepted IMP-026C `StickyCartBar` | PRESERVE |

This capability reuses IMP-009 authentication/session authority. It must **not** introduce a new
identity/session domain.

Display-safe first name is **out of scope**. Session contract is `{ authenticated, user: { id } }`
only. Do not fetch Profile `givenName` for chrome.

ARCH-G01 / D-356 / D-359 / D-360 remain: static public frontend + `/api/v1/*` and
`/api/customer-auth/*`. No Route Handlers.

---

## 5. Exact In-Scope

Preserve founder-accepted supporting scope.

| In-scope work | Boundary |
|---|---|
| A. Unified customer chrome / navigation | Same `Nav` on Home, `/login`, `/privacy`, and `/order*` |
| B. Session-aware anonymous/authenticated header state | Existing `fetchCustomerSession` only |
| C. Customer-accessible Sign Out | Existing `signOutCustomer`; does **not** implement D-370 Cart isolation |
| D. Terminology normalization | Menu, Order Now, My Orders, My BOBA, Cart, Sign In, Sign Out; route paths unchanged |
| E. Home primary Food conversion | **Order Now** → existing `/order` Menu destination |
| F. Customer-facing label | `/order` → **Menu** |
| G. Historical purchase label | `/order/orders/` → **My Orders** |
| H. Global Cart entry | → `/order/cart/` without requiring a Cart-count badge |
| I. Initial My BOBA disclosure | Existing destinations only; not a full My BOBA hub; no `/my-boba` route |
| J. Static Drops navigation | Only where the existing campaign destination is real (`/#drops`) |
| K. Omit dead Offers navigation | Until a customer Offers destination exists |
| L. Remove competing Merch/Artists primary-nav concepts | Home editorial teasers may remain |
| M. Direct-accurate Privacy/customer-facing copy cleanup | CONTENT_TERMINOLOGY / PRODUCT_DEFECT; not legal-policy redesign |
| N. Responsive/accessibility hardening for global chrome | No Menu/product transaction redesign |
| O. Preserve IMP-026C sticky mobile Cart behavior | Do not replace Cart domain behavior |

**ROUTE_CHANGE = NONE.** Do not rename paths for aesthetics.

---

## 6. Navigation Target

Safe first-slice navigation. Do not invent dead destinations.

**Logged out**

```text
Menu | Drops | Sign In | Cart
[+ Home Order Now conversion CTA]
```

**Logged in**

```text
Menu | Drops | My BOBA | Cart
[+ Home Order Now conversion CTA]
```

| Item | First-slice representation | Class |
|---|---|---|
| **Menu** | `/order` | REAL_DESTINATION |
| **Drops** | `/#drops` | STATIC_CAMPAIGN_DESTINATION |
| **Offers** | Omit from primary nav | MISSING_CAPABILITY / DEFER |
| **Sign In** | `/login` when anonymous | REAL_DESTINATION |
| **My BOBA** | Accessible disclosure (not a new route): My Orders → `/order/orders/`; Sign Out → `signOutCustomer()` | Concept for later family F |
| **Cart** | `/order/cart/` always, empty or not | REAL_DESTINATION; **no count badge** |
| **Order Now** | CTA, not a peer catalog name; `/order` | REAL_DESTINATION |
| **Wear / Culture** (`Merch`, `Artists`) | Remove from primary nav | DEFER |

Do not keep marketing **Order** as a peer of **Menu**. Do not keep **Orders** as a peer of **Menu**.

---

## 7. Session Behavior

Canonical acceptance must establish:

```text
anonymous session
  → chrome shows Sign In

successful customer authentication
  → chrome reflects authenticated state without browser restart

authenticated state
  → My BOBA affordance

Sign Out
  → chrome returns to anonymous state
```

While session is unknown, do not flash a **wrong customer** identity. Anonymous-safe pending chrome
is allowed (Sign In may appear until session resolves). Do not show My BOBA until
`authenticated === true` is verified. Treat `user.id` as opaque (ARCH-G03); never display it.

Sign Out is chrome invocation of the existing IMP-009 operation. Acceptance must **not** claim D-370
logout Cart isolation is implemented.

---

## 8. My BOBA Boundary

Full My BOBA Foundation belongs to later capability family **F**.

This capability may expose **My BOBA** as the authenticated relationship/navigation concept.
Initial disclosure may expose only currently supported actions:

```text
My Orders
Sign Out
```

Do **not** add Profile UI, Saved Addresses UI, Favorites, Rewards, My Usual, Order Again, Wear, or
Culture unless already explicitly included by the founder-accepted slice (they are not).

Do **not** create a `/my-boba` route merely for naming symmetry.

---

## 9. Cart Boundary

Global Cart entry is in scope. **D-370 implementation is NOT.**

This capability must **not** claim:

- guest/customer Cart reconciliation implemented
- logout Cart isolation fully implemented
- Cart merge implemented
- Cart count implemented

It provides navigation to the existing Cart. D-370 remains binding future implementation authority
for family D.

Empty Cart remains a real destination. Do not render a chrome-wide count badge.

---

## 10. Home Boundary

Home remains:

```text
brand discovery
+
campaign
+
conversion entry
```

Home is **not** the full customer Menu. Primary CTA: **Order Now** → `/order`.

Do not implement D-368 Menu projection. Do not convert Home into a second catalog authority.
Editorial Home food chapters may remain non-orderable; they must not be the primary Menu destination.

Aggregator doors may remain **secondary** channels (VISION: aggregators continue). They must not be
presented as the primary Direct order path.

---

## 11. Privacy / Copy Boundary

Correct customer-facing stale content that describes BOBA ordering as primarily off-site /
aggregator-based where it contradicts current owned Direct commerce.

This is **CONTENT_TERMINOLOGY / PRODUCT_DEFECT** correction.

Do **not** broaden into privacy retention policy, customer deletion policy, or legal-policy redesign.

---

## 12. Responsive / Accessibility Outcomes

Preserve accepted IMP-026C behavior.

Canonical outcomes:

- supported mobile widths below Tailwind `md`;
- global navigation usable without horizontal overflow;
- existing transaction-control behavior not regressed;
- existing sticky Cart behavior preserved;
- keyboard-operable customer navigation;
- visible focus according to existing project standards;
- semantic nav/disclosure behavior;
- usable touch interactions;
- safe session loading state.

Do **not** claim a formal accessibility certification.

---

## 13. Explicit Non-Goals

IMP-028A must **not** include:

```text
D-368 implementation
customer Menu read API
Menu category redesign
product-card redesign

D-369 implementation
Food customization
modifier content/import

D-370 implementation
guest/customer Cart reconciliation
Cart merge
logout Cart isolation (beyond chrome Sign Out invoking IMP-009)

checkout changes
payment recovery
confirmation changes

full My BOBA hub
Saved Address UI
Profile UI
/my-boba route

Order Again
Favorites
My Usual
Rewards

Offers customer experience
Offers auto-apply

real BrandDrop authority
Wear
Culture commerce

new authentication method
new customer identity model

new DB schema
migration
new customer HTTP resource

route renaming purely for aesthetics
fake primary-nav destinations
Cart count badge
formal accessibility certification
```

Do not activate Food Direct families B / C / D / E / F. Do not retarget IMP-029. Do not steal
Operations Console, Delivery, Notification, or remaining GTM IMP-030 → IMP-040 scope.

---

## 14. Acceptance Criteria

Objectively testable. A passing IMP-028A **must not** be read as D-370 / D-368 / D-369 done.

| ID | Criterion |
|---|---|
| **AC-01** | **Anonymous chrome.** Logged-out customer sees chrome **Sign In**, and not My BOBA as an authenticated identity. |
| **AC-02** | **Authenticated chrome.** After successful OTP authentication, global chrome reflects authenticated state without requiring a browser restart; stale “Sign in” is gone. |
| **AC-03** | **Sign Out.** Authenticated customer can Sign Out from global customer chrome; chrome returns to anonymous state on the same page load / next paint of chrome. Does **not** require or claim D-370 Cart isolation. |
| **AC-04** | **Menu terminology.** Primary Food catalog is customer-labeled **Menu** and reaches `/order`. |
| **AC-05** | **Order Now.** Home primary commerce CTA is **Order Now** and reaches `/order`. |
| **AC-06** | **My Orders.** Historical purchase destination is customer-labeled **My Orders** (not a peer named “Orders”) and reaches `/order/orders/`. |
| **AC-07** | **Global Cart.** Customer chrome exposes a consistent Cart entry to `/order/cart/` on desktop chrome and in mobile navigation. Empty Cart is still a real destination. No Cart count is required. |
| **AC-08** | **No dead primary nav.** No primary navigation destination is exposed unless the destination actually exists for this capability. No Offers, no Wear/Culture commerce dest, no fake My BOBA hub, no Drops store pretending inventory/checkout authority. |
| **AC-09** | **My BOBA initial boundary.** Authenticated chrome exposes **My BOBA** as the relationship concept using only currently supported actions/destinations (My Orders, Sign Out). A full My BOBA route is not required. |
| **AC-10** | **Responsive.** Supported mobile viewport exposes usable global navigation without horizontal overflow and preserves accepted IMP-026C sticky Cart behavior on `/order` when the Cart is non-empty. |
| **AC-11** | **Direct-accurate copy.** Customer-facing Privacy/Home/chrome copy no longer represents off-site ordering as the BOBA Direct operating model. |
| **AC-12** | **Authority preservation.** No Pricing, Cart aggregate, Checkout, Checkout Snapshot, Payment, Order, Refund, or other commercial authority, schema, or migration changes. D-368 / D-369 / D-370 remain unimplemented by this capability. |

Negative: IMP-028A does not require a Cart count badge, “Hi \<name\>”, Offers nav, or `/my-boba`
route.

Independent acceptance evidenced AC-01 through AC-12 as **PASS** without changing criterion wording
or scope (STATE-R35 / GTM-R37).

---

## 15. Validation / Evidence Expectations

Do **not** implement tests in this authorization. Later implementation must produce:

### UNIT / COMPONENT

- anonymous Nav state;
- authenticated Nav state;
- pending / after sign-out Nav state;
- My BOBA disclosure (open/close, keyboard, Escape, `aria-expanded`);
- terminology (Menu, Order Now, My Orders, Sign In, Cart, My BOBA);
- responsive interaction where component tests apply;
- mobile drawer includes Cart and does not include Offers / Merch / Artists as live commerce.

### INTEGRATION

- real/existing session API → chrome;
- Sign Out → chrome;
- route targets;
- Order Now → Menu (`/order`);
- Cart / My Orders links.

### E2E

- logged-out desktop;
- logged-in desktop;
- sign out;
- supported mobile viewport;
- no dead primary-nav entries.

### REGRESSION

- IMP-026C sticky mobile Cart remains intact;
- existing ordering flow still reachable (`/order` → cart → checkout → pay);
- OTP auth contract remains intact.

---

## 16. Implementation Inventory (planning guidance)

Carry forward the supporting inventory as planning guidance, **not** binding source ownership. Do
not edit these files in this authorization.

| Path | Class |
|---|---|
| `src/components/Nav.tsx` | EXPECTED_CHANGE |
| `src/components/Hero.tsx` | EXPECTED_CHANGE |
| `src/components/AccessCTA.tsx` | EXPECTED_CHANGE |
| `src/app/privacy/page.tsx` | EXPECTED_CHANGE |
| `src/app/order/page.tsx` | EXPECTED_CHANGE (presentation metadata/titles) |
| `src/components/ordering/OrderingCatalogClient.tsx` | EXPECTED_CHANGE (titles only; no card redesign) |
| `src/components/ordering/OrderHistoryClient.tsx` | EXPECTED_CHANGE (titles) |
| `src/app/order/orders/page.tsx` | EXPECTED_CHANGE (titles) |
| `src/app/layout.tsx` | POSSIBLE_CHANGE (JSON-LD) |
| `src/components/Footer.tsx` | POSSIBLE_CHANGE |
| `src/app/page.tsx` | POSSIBLE_CHANGE |
| `src/app/login/CustomerLoginClient.tsx` | POSSIBLE_CHANGE |
| `src/components/ordering/StickyCartBar.tsx` | NO_CHANGE_EXPECTED (preserve IMP-026C) |
| `src/server/**` | NO_CHANGE_EXPECTED |
| `drizzle/**` | NO_CHANGE_EXPECTED |

Expected no domain/server/schema change.

---

## 17. Dependencies / Future Boundaries

```text
HARD dependency on D-368 implementation = NO
HARD dependency on D-369 implementation = NO
HARD dependency on D-370 implementation = NO

IMP-028A SHOULD_PRECEDE_FOR_UX:
  Food Direct B Menu projection / discovery
  Food Direct D Cart / session (D-370)
  Food Direct E Checkout / payment UX
  Food Direct F My BOBA Foundation

IMP-028A is NOT responsible for B, C, D, E, or F implementation.
B–F are NOT activated by this capability.
IMP-029 remains Operations Console API, PLANNED / NOT_STARTED / NOT_AUTHORIZED.
```

---

## 18. Open Questions

None that block implementation authorization. No architectural gap requiring `D-371`.

Implementation-local defaults already locked by the founder-accepted slice:

- Logged-in chrome label is **My BOBA**, not “Hi \<first name\>”.
- My BOBA is a disclosure, not a new route.
- Offers omitted from primary nav; Drops = `/#drops`.
- No Cart count badge.

---

## Implementation Authorization

GTM-R35 authorized implementation without starting it.

```text
Architecture:     ARCHITECTURE_LOCKED
Authorized:       YES
Then started:     NO
```

```text
IMP-028A_IMPLEMENTATION_AUTHORIZED: YES
+
IMP-028A_IMPLEMENTATION_STARTED: NO
≠
IMPLEMENTATION_IN_PROGRESS
```

That authorization did **not** start product implementation.

## Implementation Completion

```text
Architecture:     ARCHITECTURE_LOCKED
Implementation:   COMPLETE_AND_ACCEPTED
Authorized:       YES
Started:          YES
Complete:         YES
Accepted:         YES
IMP-028A_ARCHITECTURE_LOCKED: YES
IMP-028A_IMPLEMENTATION_AUTHORIZED: YES
IMP-028A_IMPLEMENTATION_STARTED: YES
IMP-028A_IMPLEMENTATION_COMPLETE: YES
IMP-028A_ACCEPTED: YES
pendingAcceptance: NONE
```

Implementation remains inside this locked artifact. It does **not** implement D-368 / D-369 /
D-370, create `D-371`, or retarget IMP-029.

## Formal Acceptance

GTM-R37 / STATE-R35 record independent acceptance of IMP-028A.

```text
acceptedThrough = IMP-028A
pendingAcceptance = NONE
currentProductSlice = NONE
nextProductSlice = IMP-029
IMP-028A = COMPLETE_AND_ACCEPTED
IMP-028A_ARCHITECTURE_LOCKED = YES
IMP-028A_IMPLEMENTATION_COMPLETE = YES
IMP-028A_ACCEPTED = YES
IMP028A_INDEPENDENT_ACCEPTANCE = PASS
IMP028A_FORMAL_ACCEPTANCE = ACCEPTED
AC-01 = PASS
AC-02 = PASS
AC-03 = PASS
AC-04 = PASS
AC-05 = PASS
AC-06 = PASS
AC-07 = PASS
AC-08 = PASS
AC-09 = PASS
AC-10 = PASS
AC-11 = PASS
AC-12 = PASS
IMP-029 = PLANNED / NOT_STARTED / NOT_AUTHORIZED
D371_CREATED = NO
TYPECHECK_STATUS = FAIL_PRE_EXISTING_UNRELATED
CUSTOMER_ORDERING_E2E = BLOCKED_ENVIRONMENT
CUSTOMER_ORDERING_ALTERNATIVE_REGRESSION_EVIDENCE_SUFFICIENT = YES
RELEVANT_REGRESSION_TESTS = PASS_WITH_ENVIRONMENT_LIMITATION
```

Known non-blocking limitations preserved from independent acceptance (not IMP-028A defects; not
rewritten as full-suite success):

- Whole-repo TypeScript / canonical Next typecheck is blocked by pre-existing
  financial-document/refund BigInt + ES2017 issues.
- Full customer-ordering E2E was blocked by an occupied fixed port 8183.
- Alternative regression evidence was independently judged sufficient for IMP-028A.

Formal acceptance of IMP-028A does **not** authorize or start IMP-029, implement D-368 / D-369 /
D-370, create `D-371`, or activate Food Direct Capability B.
