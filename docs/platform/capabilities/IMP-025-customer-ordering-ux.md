<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-025",
  "title": "Customer Ordering UX",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "COMPLETE_AND_ACCEPTED",
  "implementationAuthorized": true,
  "lastReviewed": "2026-08-18",
  "bindingDecisions": ["D-356", "D-357", "D-358", "D-359", "D-360", "D-368", "D-370"],
  "dependsOn": ["IMP-024"]
}
-->

# IMP-025 — Customer Ordering UX

## Capability Architecture (ARCHITECTURE_LOCKED)

This document is the **locked capability architecture** for IMP-025 — Customer Ordering UX.

| Field | Value |
|---|---|
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Implementation | `COMPLETE_AND_ACCEPTED` |
| Implementation authorized | **YES** (implementation complete and independently accepted) |
| Acceptance | **COMPLETE_AND_ACCEPTED** |
| Completion | independently accepted; `acceptedThrough = IMP-025` |

Architecture remains locked. Implementation is independently accepted
(`COMPLETE_AND_ACCEPTED`). This document does **not** authorize IMP-026.

> **Amendment (2026-08-13):** Current V1 production payment provider is **Razorpay**
> ([D-361](../decision-register.md)). IMP-025 remains provider-neutral customer Payment UX.
> Historical Cashfree productionization deferrals below now refer to IMP-026 Razorpay
> productionization. **D-362** amends D-361 webhook acknowledgement / post-payment Order recovery
> only and does not change IMP-025 UX authority. **D-363** amends D-362 acknowledgement timing /
> durable inbox only and does not change IMP-025 UX authority. Next free global decision ID after
> D-363 is **D-364**.
>
> **Amendment (2026-08-18):** **[D-368](../decision-register.md)** establishes the long-term BOBA
> Direct customer Menu serving TARGET as a server-backed customer-facing READ PROJECTION over
> existing commerce authorities. D-368 supersedes **only** this capability’s future-facing exclusion
> of a public Menu API and the lock of static `ordering-catalog.json` as long-term
> storefront-delivery architecture. Accepted IMP-025 implementation remains valid CURRENT storefront
> delivery (`src/data/ordering-catalog.json` is TRANSITIONAL CURRENT, not long-term customer Menu
> authority) until an authorized future capability replaces it. D-368 does **not** invalidate
> accepted IMP-025 parity evidence, catalog identity/import authority, catalog/menu schema, product
> identity, pricing authority, Cart rules, Checkout Snapshot rules, or other accepted IMP-025
> behavior unrelated to Menu read delivery. D-368 does **not** authorize implementation, create a
> Menu endpoint, lock an HTTP payload, or activate IMP-029.
>
> **Amendment (2026-08-18):** **[D-370](../decision-register.md)** establishes binding Cart identity
> transition policy: guest→customer compatible purchase-intent merge is required; silent whole-cart
> winner selection is forbidden; sign-out must not delete the customer Cart but must end browser
> authority over it. D-370 supersedes **only** this capability’s future-facing lock of guest→customer
> claim/reconcile exclusively at Checkout and KEEP_GUEST / KEEP_CUSTOMER as a whole-cart silent
> winner. Accepted IMP-025 / IMP-026C checkout claim/reconcile implementation remains CURRENT until
> an authorized future capability implements D-370. Coupon-conflict KEEP_GUEST / KEEP_CUSTOMER as
> coupon-resolution implementation, guest XOR customer ownership, configured-line identity, revision
> concurrency, `sessionStorage` guest-token persistence for CURRENT delivery, Cart commercial
> authority, and Checkout Snapshot authority are **not** invalidated. D-370 does **not** authorize
> implementation, change authentication, change browser storage, or activate IMP-029.

---

## 1. Capability Identity

| Field | Value |
|---|---|
| IMP | IMP-025 |
| Capability | Customer Ordering UX |
| Roadmap lifecycle | `COMPLETE_AND_ACCEPTED` |
| Implementation | `COMPLETE_AND_ACCEPTED` |
| Architecture lock | `ARCHITECTURE_LOCKED` |
| Accepted product through | IMP-025 — Customer Ordering UX |
| Current product slice | `NONE` |
| Consumes | Accepted IMP-001→IMP-024 foundations, especially IMP-024 customer-commerce transport |
| Next related slices | IMP-026 Razorpay productionization; later Refund / Invoice / Ops / Delivery / Notifications |

---

## 2. Canonical Authority

| Question | Authority |
|---|---|
| Why / Non-Goals | [`../VISION.md`](../VISION.md) |
| Binding decisions | [`../decision-register.md`](../decision-register.md) |
| Global architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| IMP sequence / lifecycle | [`../ROADMAP.md`](../ROADMAP.md) |
| Accepted reality | [`../STATE.md`](../STATE.md) |
| Transport contracts consumed | [`IMP-024-customer-ordering-transport.md`](./IMP-024-customer-ordering-transport.md) |
| This capability lock | **This document** |
| Agent rules | [`../../../AGENTS.md`](../../../AGENTS.md) |

Layering (unchanged):

```text
UI → Transport → Application Operations → Domain Authority → Persistence → Provider Adapter
```

IMP-025 owns the **UI** layer for customer ordering. It must not invent application/domain
semantics or become commercial authority.

---

## 3. Purpose

Enable customers to complete the owned BOBA Bear ordering journey in the browser against accepted
customer-commerce transport, while the public frontend remains a **static Next.js export**.

Conceptual outcome:

```text
Browse static ordering catalog
→ guest Cart
→ authenticate at checkout
→ claim / reconcile
→ destination
→ Checkout evaluation
→ Payment or zero-payable
→ Order confirmation / history
```

---

## 4. Product Boundary

### 4.1 Included (IMP-025 owns)

1. Owned BOBA Bear ordering entry
2. Static ordering catalog presentation needed to create valid Cart commands
3. Guest cart creation/use
4. Add-to-cart
5. Quantity / configuration / removal interactions supported by existing Cart contracts
6. Cart review
7. Server-authoritative cart evaluation presentation
8. Existing customer-auth integration
9. Authentication gate before checkout
10. Guest-cart claim
11. Guest/customer cart reconcile
12. Explicit reconcile conflict handling when domain requires `KEEP_GUEST | KEEP_CUSTOMER`
13. Minimum customer destination/address UX required to complete checkout
14. Checkout creation
15. Checkout destination
16. Checkout evaluation
17. Serviceability / pricing / error presentation based on authoritative backend results
18. Provider-neutral Payment initiation
19. Payment retry where existing contracts permit it
20. Provider-neutral `clientAction` handling
21. Payment state/status checking
22. Zero-payable checkout completion
23. Order confirmation
24. Customer order history/list
25. Customer order detail
26. Customer order status using **D-357** authority only
27. Browser-side `/api/v1/*` commerce client
28. Guest-cart token lifecycle within the approved browser-storage boundary
29. E2E / customer-flow verification appropriate to this UX slice

### 4.2 Explicitly excluded

- Production Razorpay provider integration — **IMP-026**
- Razorpay production webhook / GTM operationalization — **IMP-026**
- Refund — **IMP-027**
- Invoice — **IMP-028**
- Ops Console API / UI — **IMP-029 / IMP-030**
- Delivery and delivery tracking authority — **IMP-031+**
- Notifications / WhatsApp automation — later slices
- Customer cancellation
- Detailed kitchen workflow / states
- Inventory reservation
- Loyalty / Rewards
- Multi-provider payment orchestration
- International payments / EMI / BNPL / COD
- PWA / service-worker / installability scope
- Public DB-backed Menu API as CURRENT IMP-025 implementation (TARGET serving architecture is **D-368**; not implemented here)
- Standalone Serviceability HTTP API
- Speculative microservices / per-domain HTTP services
- Next.js Route Handlers for commerce / `src/app/api` commerce implementation
- Broad account/profile-management portal beyond ordering-journey minimum

### 4.3 Deferred / later-roadmap ownership

| Concern | Owner |
|---|---|
| Razorpay productionization & payment GTM readiness | IMP-026 |
| Refund | IMP-027 |
| Invoice / tax receipt / credit note | IMP-028 |
| Operations Console API / UI | IMP-029 / IMP-030 |
| Delivery | IMP-031+ |
| Notifications / WhatsApp | IMP-033+ |
| Customer self-service cancellation | DEFERRED_UNSCHEDULED |
| Detailed kitchen fulfilment | DEFERRED_UNSCHEDULED |
| Quantitative inventory reservation | DEFERRED_UNSCHEDULED |
| Loyalty / Rewards / multi-provider / intl / EMI / BNPL / COD | DEFERRED_UNSCHEDULED |

Do not opportunistically include later capabilities because UI could theoretically expose them.

---

## 5. Applicable Binding Decisions and ADRs

### Binding decisions (CURRENT / AMENDED)

| ID | Relevance to IMP-025 |
|---|---|
| **D-356** | Public frontend remains static Next.js export; no dynamic Next.js commerce execution |
| **D-357** | Order status vocabulary: `PLACED` \| `ACCEPTED` \| `FULFILLED` \| `CANCELLED` only |
| **D-358** | System-role inventory ownership (workforce; not customer UX authority) |
| **D-359** | Commerce traffic through dedicated `customer-commerce` façade behind Nginx `/api/v1/*` |
| **D-360** | `/api/v1/*` public contract, error envelope, Payment JSON `idempotencyKey` |
| **D-368** | TARGET customer Menu serving architecture: server-backed READ PROJECTION; supersedes only this capability’s future-facing public-Menu-API exclusion / static-catalog long-term serving lock; accepted IMP-025 static catalog remains CURRENT delivery |
| **D-370** | Cart identity transition: guest→customer compatible merge required; silent whole-cart winner forbidden; logout isolates browser from customer Cart; supersedes only this capability’s future-facing Checkout-only identity-transition lock; accepted checkout claim/reconcile implementation remains CURRENT until an authorized future capability implements D-370 |

No new global `D-xxx` was required for the original IMP-025 capability lock. Capability-local choices
(static ordering-catalog projection, `sessionStorage` guest-token persistence, CTA hierarchy)
remain inside this document for CURRENT accepted implementation. **D-368** later amends only the
future-facing Menu serving/read-boundary. **D-370** later amends only the future-facing Checkout-only
guest→customer identity-transition lock and whole-cart silent-winner policy.

Next free global decision ID is **D-364**. **D-361** is CURRENT (Razorpay V1 provider / Standard
Checkout) and does not change IMP-025 provider-neutral UX authority. **D-362** amends D-361 webhook
acknowledgement / post-payment Order recovery only. **D-363** amends D-362 acknowledgement timing /
durable inbox only.

### Applicable ADRs (read with register supersession)

| ADR | Status for IMP-025 | Note |
|---|---|---|
| ADR-003 | AMENDED | Modular monolith / module boundaries remain; HTTP host constrained by D-356 / D-359 |
| ADR-004 | CURRENT foundations | Reuse existing customer phone OTP auth; do not invent a second auth system |
| ADR-007 | CURRENT intent | Pricing/tax/charges remain server-authoritative; invoice implementation = IMP-028 |
| ADR-008 | CURRENT foundations | Cart/Checkout/serviceability authority remains backend |
| ADR-009 | CURRENT foundations | Payment provider-neutral contracts; Razorpay production = IMP-026 (D-361) |
| ADR-010 | AMENDED by D-357 | Do not present kitchen states as Order authority |
| ADR-014 | SUPERSEDED for HTTP host | Must not override D-356–D-360; no Route Handlers for commerce |

---

## 6. Frontend Deployment Boundary

IMP-025 remains inside accepted **D-356** architecture.

```text
Browser
  → same-origin Nginx
  → /api/v1/*
  → customer-commerce (:8083)
  → accepted application/domain capabilities
```

Also bound by **D-359** and **D-360**.

The customer-facing frontend:

- **may** contain client-side interactive React code
- **must** remain compatible with static Next.js export (`output: "export"`)
- **must not** require SSR for ordering
- **must not** introduce dynamic Next.js commerce execution
- **must not** add Next.js Route Handlers / `src/app/api` commerce
- **must not** access Postgres from the browser
- **must not** import `src/server/**` / domain internals into client bundles
- **must not** become commercial authority for pricing, serviceability, payment, or Order lifecycle

Relevant global invariants: **ARCH-G01**, **ARCH-G02**, **ARCH-G11**, **ARCH-G14**.

---

## 7. Browser Commerce Client Boundary

### Responsibility

Define a thin browser-side customer commerce client, logically parallel to the existing
[`src/lib/customer-auth/client.ts`](../../../src/lib/customer-auth/client.ts) pattern.

Conceptual home (implementation later; not created by this lock):

```text
src/lib/customer-commerce/
```

The client is responsible only for:

- same-origin `/api/v1/*` requests
- `credentials` behavior consistent with current customer-auth trust (`same-origin` cookie jar)
- D-360 error envelope handling (`{ ok:false, code, requestId }` and domain codes)
- request/response serialization for accepted wire shapes
- guest-cart credential propagation (`X-Boba-Guest-Cart-Token`)
- Payment JSON `idempotencyKey` carriage
- transport-level normalization only (network / invalid-response folding)

### Prohibitions

The browser commerce client **must not** contain business rules belonging to:

- Cart
- Checkout
- Payment
- Order
- Serviceability
- Pricing

### State-management policy

Prefer existing React / client / `fetch` patterns already used by customer-auth UX.

**Not authorized** merely for convenience:

- Redux
- Zustand
- React Query / TanStack Query
- any new global state-management framework

No frontend rewrite is authorized. Marketing architecture unrelated to ordering is out of scope.

---

## 8. Static Menu → Commerce Identity

### Approved direction

Use a **dedicated generated static ordering-catalog artifact** within the frontend static-data
boundary, derived from existing canonical catalog/import identity, while keeping marketing
`src/data/menu.json` conceptually separate.

```text
existing customer/menu presentation source (src/data/menu.json + image helpers)
        +
canonical menu/catalog import identity (data/platform/imports/existing-menu-v1.json)
        ↓
generated static ordering catalog (src/data/ordering-catalog.json)
        ↓
static Next.js customer UX
        ↓
brandId + variantId (+ required Cart identity fields)
        ↓
existing Cart transport (/api/v1/*)
```

### Authoritative identity source

| Concern | Authority |
|---|---|
| Presentation inventory (names, categories, display prices, images) | `src/data/menu.json` (+ `src/lib/menuImages.ts` / types as IMP-013 inventory inputs) |
| Stable commerce UUIDs | Canonical import manifest `data/platform/imports/existing-menu-v1.json` |
| ID generation algorithm | `src/server/catalog/menu-import/stable-ids.ts` (`stableUuid`) via `build-manifest.ts` |
| Proven BOBA Bear `brandId` | `56ff7724-d511-5ef4-b5d5-d629cbfb2388` (`stableUuid("brand:boba-bear")`) |
| Proven default `variantId` | `stableUuid(\`variant:${sourceKey}:default\`)` as recorded on each product in the import manifest |

Runtime browser code must **not**:

- invent UUIDs
- match products by display name
- derive identity from mutable labels
- introduce a public Menu API as CURRENT IMP-025 implementation (TARGET serving architecture is **D-368**; not implemented by this capability)
- query Postgres
- duplicate independent catalog authority

### Exact packaging (locked)

| Field | Locked value |
|---|---|
| Generated destination | `src/data/ordering-catalog.json` |
| Authority / source | Deterministic projection from `data/platform/imports/existing-menu-v1.json` (and presentation fields needed for ordering UX), itself derived from the IMP-013 menu-import pipeline |
| Minimum identity fields | `brandId`; per sellable item at least `variantId`; retain `productId` / `source_key` / stable section linkage where needed for Cart commands and parity checks |
| Generation responsibility | Build/tooling step (deterministic generator). **Not** manually maintained as an independent commerce-identity source. Generator is **not** implemented by this architecture lock. |
| When generation occurs | Conceptually whenever the canonical import manifest / presentation inventory used for ordering changes; before shipping ordering UX that depends on those identities |
| Drift / parity requirement | Generated artifact must deterministically correspond to import `brand.id` and each product `variant.id` for the same `source_key`. Detect missing/extra `source_key`s and ID mismatches in verification. Marketing `menu.json` remains presentation authority; commerce identity authority remains the import manifest. |
| Public Menu API introduced | **NO** (CURRENT accepted implementation). TARGET serving architecture is **D-368** (server-backed READ PROJECTION); implementation not authorized by D-368. |

`src/data/menu.json` continues to lack Cart commerce identifiers by design; IMP-025 must not treat it
as Cart identity authority.

### `brandId` sourcing

The browser obtains `brandId` **only** through the generated ordering-catalog artifact.

Do not:

- hardcode brand UUID in arbitrary components
- introduce a brand env var unless existing architecture already requires one (it does not for this)
- invent multi-brand runtime configuration
- create a brand-discovery API

---

## 9. Guest Cart Credential Handling

### Locked browser persistence

**`sessionStorage`**

| Field | Locked value |
|---|---|
| Token issuer | Backend / accepted Cart + customer-commerce transport (first guest mutation may return `guestToken`) |
| Browser persistence | `sessionStorage` |
| Header | `X-Boba-Guest-Cart-Token` |
| Auth credential | **NO** — Cart authority only; distinct from customer-auth session cookie |
| HttpOnly auth session | **NO** — must not be stored as / inside customer auth cookie |
| Cross-browser-session persistence required | **NO** |
| Token format / TTL | Backend canonical policy only; frontend must not invent format or TTL |

### Lifecycle

```text
guest token received from accepted transport
→ store in sessionStorage
→ subsequent guest Cart calls send X-Boba-Guest-Cart-Token
→ customer authenticates (customer-auth cookie session)
→ claim OR reconcile (authenticated + guest token as required by transport)
→ successful customer-owned cart established
→ guest credential no longer used for that customer-owned flow
→ clear guest token from sessionStorage (conceptual cleanup point)
```

Cleanup point: after claim/reconcile successfully establishes the customer-owned cart used for
checkout (or when the ordering flow explicitly abandons the guest cart path). Do not prescribe
implementation code here.

---

## 10. Guest → Auth → Checkout Orchestration

Canonical sequence supported by accepted contracts:

```text
Anonymous customer
→ browse ordering catalog
→ create/use guest cart
→ modify/review cart
→ evaluate cart as supported
→ customer chooses checkout
→ ★ AUTHENTICATION GATE ★ (existing customer phone OTP auth)
→ return to ordering flow
→ claim guest cart if no customer cart exists
   OR
→ reconcile when both guest and customer carts exist
→ explicitly resolve KEEP_GUEST / KEEP_CUSTOMER when domain requires it
→ authenticated checkout
→ destination / address
→ checkout evaluation
→ Payment / zero-payable
→ order confirmation
→ order reads / history
```

Rules:

- Do **not** invent a silent reconciliation rule when domain requires explicit resolution
- Reuse existing customer authentication architecture (IMP-009 / `src/lib/customer-auth/client.ts`)
- Do **not** design a second customer auth system

### Auth return-to-flow requirement

Current login UX (`src/app/login`) has **no** generic return-to-ordering-flow mechanism
(VERIFIED: no `returnUrl` / equivalent contract in the login client).

IMP-025 frontend implementation **must** add a safe return-to-flow integration with existing
customer auth (for example a same-origin return path after successful OTP verify) without creating
a second auth system and without placing secrets in URLs.

---

## 11. Address / Profile Scope

### Address

Support destination interaction sufficient to complete checkout, using existing:

- saved-address contracts
- one-time-address contracts
- create / update / select address operations where needed

A standalone full address-management center is **not** required for first-slice correctness unless
existing contracts force one during implementation (none currently force a portal).

### Profile

Profile management is **not** a full IMP-025 account-management project.

Only profile interaction required by the ordering / auth journey belongs in this slice.

---

## 12. Serviceability and Commercial Authority

IMP-025 surfaces authoritative results returned through existing Cart / Checkout evaluation paths.

Frontend **must not** independently calculate authoritative:

- serviceability
- subtotal / discount / coupon outcome / tax / total / final payable
- payment validity

Static menu price presentation remains **presentation information** only.

When ordering reaches authoritative Cart/Checkout evaluation, **backend values win**.

### Error presentation

Using existing D-360 / domain contracts:

- Domain / business validation errors → present via returned `code` (and any accepted field/detail
  already exposed by transport)
- Generic transport failure → client `NETWORK_ERROR` / `INVALID_RESPONSE` style folding (parallel to
  customer-auth client), without inventing domain codes

Do not create new commercial rules.

---

## 13. Payment UX Boundary

### IMP-025 (provider-neutral customer UX)

May:

- start payment
- use accepted idempotency contract (**D-360** JSON body `idempotencyKey`)
- consume existing Payment response
- act on provider-neutral `clientAction`
- support redirect/navigation when returned by the accepted abstraction
- poll/read existing Payment state where required
- retry using existing accepted retry operation
- handle zero-payable completion
- transition to order confirmation when existing backend authority permits it

Must **not** embed provider-specific business logic (historically Cashfree; current V1 provider
Razorpay under D-361) into generic customer UX unless an already accepted provider-neutral contract
requires a generic browser action.

### IMP-026

Owns:

- Razorpay production adapter completion / productionization
- production payment GTM readiness
- production provider-specific webhook / operational concerns assigned to that slice

### Existing accepted surfaces consumed

- Payment application operations already exposed by IMP-024 customer-commerce
- Fake/test provider behavior for verification where repository convention already supports it

---

## 14. Order UX Boundary

IMP-025 includes:

- order confirmation
- order list / history
- order detail
- order status

Lifecycle presentation uses **D-357** only:

```text
PLACED
ACCEPTED
FULFILLED
CANCELLED
```

Do **not** create authoritative customer states such as `PREPARING`, `READY`,
`OUT_FOR_DELIVERY`, `COURIER_ASSIGNED`, or `DELIVERED` unless a future canonical decision
introduces a separate projection.

| Concern | IMP-025 |
|---|---|
| Confirmation | Included |
| History / list | Included |
| Detail | Included |
| Status vocabulary | D-357 only |
| Kitchen states | Excluded / deferred |
| Customer cancellation | Excluded / deferred |
| Refund | IMP-027 |
| Delivery tracking | IMP-031+ |

---

## 15. CTA / Channel Strategy

**UX intent (not a transport rule):**

> Owned BOBA Bear ordering becomes the **primary customer ordering CTA**, while aggregator
> channels remain available as secondary alternatives.

Preserve Vision coexistence: aggregators remain additive acquisition/volume channels. Aggregators
are **not** part of owned checkout. Exact copy/styling/placement is not locked by this architecture
unless a CURRENT design authority already requires it (none does beyond existing component patterns
such as `AccessCTA`).

---

## 16. PWA Exclusion

IMP-025 does **not** include a new PWA architecture.

Do not introduce solely for IMP-025:

- service worker
- offline ordering
- installability
- app manifest expansion
- background sync
- push notification architecture

Existing responsive / mobile behavior remains relevant. “Mobile-first” must not silently become
PWA implementation scope. Supporting historical product-scope mentions of PWA are **not** CURRENT
IMP-025 requirements.

---

## 17. Candidate UX Capability Surfaces

Classify interaction capabilities without over-prescribing URL structure.

### Required

| Capability | Natural fit (evidence-based) |
|---|---|
| Ordering / menu interaction | Page (extends existing menu presentation patterns) |
| Add / configure Cart line | Modal/dialog or inline sheet over catalog (interaction container) |
| Cart review | Page or drawer/sheet |
| Authentication transition | Existing `/login` page + return-to-flow integration |
| Claim / reconcile conflict | Modal/dialog (explicit choice required) |
| Checkout | Page / multi-step inline flow |
| Destination / address | Inline within checkout; optional supporting page only if needed |
| Checkout evaluation result | Inline within checkout |
| Payment initiation / status | Inline / page within checkout payment step |
| Zero-payable completion | Inline transition to confirmation |
| Order confirmation | Page |

### Strongly expected

| Capability | Natural fit |
|---|---|
| Order history / list | Page |
| Order detail / status | Page |

### Optional / supporting

| Capability | Natural fit |
|---|---|
| Saved-address management beyond checkout minimum | Supporting page or checkout-adjacent UI only if needed |
| Limited profile editing needed by ordering | Inline / minimal page |
| Aggregator-secondary CTA placement | Reuse / extend existing CTA components |

Do not lock arbitrary URL trees merely for completeness.

---

## 18. Frontend Component / State Boundaries

Prefer existing application architecture under `src/app`, `src/components`, and `src/lib`.

| Concern | Intended boundary |
|---|---|
| Ordering catalog data access | Read generated `src/data/ordering-catalog.json` (static import / data module); keep marketing `menu.json` separate |
| Browser commerce transport | Thin `src/lib/customer-commerce/*` client (conceptual); parallel to `src/lib/customer-auth` |
| Guest Cart token handling | Small browser helper around `sessionStorage` + header injection via commerce client |
| Cart interaction state | Local React component / flow state; no new global store framework |
| Customer-session transition | Existing customer-auth client + login return-to-flow |
| Checkout orchestration | Client flow composing commerce client calls; backend remains authority |
| Payment orchestration | Client flow for start/retry/status/`clientAction`/zero-payable only |
| Order reads | Commerce client wrappers over `/api/v1/orders*` |
| Presentation components | Extend existing menu/CTA/layout language; do not rewrite marketing site |

Prohibitions:

- no new generic state framework authorization
- no frontend rewrite
- no server/domain imports into client bundles
- no marketing architecture changes unrelated to ordering

---

## 19. Architecture-Level Definition of Done

Future IMP-025 implementation/acceptance must prove at least:

### Customer journey

- static ordering catalog renders commerce-addressable items
- guest can create/use Cart
- guest Cart credential survives same-tab ordering navigation (`sessionStorage`)
- customer can authenticate at checkout
- guest cart can be claimed
- reconcile conflict is surfaced when required (`KEEP_GUEST | KEEP_CUSTOMER`)
- customer can provide destination
- backend evaluation drives serviceability/pricing outcome
- checkout can progress to provider-neutral Payment or zero-payable completion
- payment `clientAction` / state handled through accepted contracts
- successful journey reaches order confirmation
- customer can read order history/detail
- status uses D-357 only

### Architecture

- static export remains successful
- no commerce Route Handlers / no `src/app/api` commerce
- no frontend Postgres access
- no domain internals in browser bundles
- `/api/v1/*` remains through `customer-commerce`
- generated ordering identity remains deterministic and tied to canonical import authority

### Verification layers

- browser-client unit/contract tests
- component tests where repository convention supports them
- guest-cart E2E
- auth-return E2E
- reconcile-conflict E2E
- checkout/address E2E
- Payment abstraction E2E using accepted fake/test behavior
- zero-payable path
- order confirmation/history
- static-export verification
- Docker/Nginx routing smoke
- accessibility smoke
- relevant `project:consistency` checks

Do **not** redundantly reimplement IMP-024’s full HTTP integration matrix in frontend tests.
Reference accepted IMP-024 HTTP tests as transport evidence.

---

## 20. Implementation Authorization

```text
Architecture:     ARCHITECTURE_LOCKED
Implementation:   COMPLETE_AND_ACCEPTED
Authorized now:   YES (accepted)
Acceptance:       COMPLETE_AND_ACCEPTED
```

IMP-025 is independently accepted. Do not start IMP-026 from this artifact.

---

## 21. Authority Boundaries

| Question | Authority |
|---|---|
| IMP-025 UX capability architecture | **This document** |
| Transport / public API wire contracts | IMP-024 capability + D-359 / D-360 |
| Order lifecycle vocabulary | D-357 |
| Static public frontend rule | D-356 |
| Global durable architecture | [`../ARCHITECTURE.md`](../ARCHITECTURE.md) |
| Acceptance / inventory | [`../STATE.md`](../STATE.md) |
| Sequence | [`../ROADMAP.md`](../ROADMAP.md) |
