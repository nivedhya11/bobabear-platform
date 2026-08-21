<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-028D",
  "title": "Desktop Ordering Continuity",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "IMPLEMENTATION_IN_PROGRESS",
  "implementationAuthorized": true,
  "lastReviewed": "2026-08-21",
  "bindingDecisions": ["D-368", "D-369", "D-370"],
  "dependsOn": ["IMP-025", "IMP-026C", "IMP-028A", "IMP-028B", "IMP-028C"]
}
-->

# IMP-028D — Desktop Ordering Continuity

## Capability Architecture (ARCHITECTURE_LOCKED)

This is the locked capability architecture for the desktop continuation of accepted customer
ordering. It changes only ordering-surface presentation while reusing the accepted Customer Menu
projection, Cart mutations, and Checkout authority. It creates no new decision, domain authority,
persistence, schema, migration, API, or runtime topology. D-371 remains unused.

| Field | Value |
|---|---|
| Placement | After accepted IMP-028C and before planned IMP-029 |
| Lifecycle | `ARCHITECTURE_LOCKED` / `IMPLEMENTATION_IN_PROGRESS` |
| Implementation | `AUTHORIZED` / `STARTED` / `IN_PROGRESS` |
| Founder UAT required at acceptance | **YES** |
| Schema / migration / new authority | **NO** / **NO** / **NO** |

```text
IMP-028D_ARCHITECTURE_LOCKED: YES
IMP-028D_IMPLEMENTATION_AUTHORIZED: YES
IMP-028D_IMPLEMENTATION_STARTED: YES
IMP-028D_IMPLEMENTATION_COMPLETE: NO
IMP-028D_ACCEPTED: NO
IMP-028D_FOUNDER_UAT_REQUIRED: YES
IMP-028D_FOUNDER_UAT: PENDING
IMP-028D_FOUNDER_UAT_COMPLETE: NO
NEW_SCHEMA_REQUIRED: NO
NEW_MIGRATION_REQUIRED: NO
NEW_PERSISTENCE_AUTHORITY: NO
NEW_API_REQUIRED: NO
NEW_DECISION: NO
D-371: UNUSED
IMP-029: PLANNED / NOT_AUTHORIZED / NOT_STARTED
```

The detailed supporting plan is
[`../experience/d2c-ux-and-process-hardening-plan.md`](../experience/d2c-ux-and-process-hardening-plan.md).
This artifact is the canonical bounded capability authority; the supporting plan does not allocate
an IMP or authorize implementation.

## Authority and invariants

- D-368 remains the sole Customer Menu read projection and discovery authority.
- D-369 remains mandatory: a paid modifier requires explicit customer selection and must not enter
  Cart intent solely from a catalog/default presentation.
- D-370 Cart identity-transition policy is not reopened or redesigned.
- Existing Cart authority and mutations remain the sole Cart purchase-intent authority.
- Checkout Snapshot remains final payable commercial truth. Display prices and Cart presentation
  must never imply final payable authority.
- ARCH-G01, ARCH-G02, ARCH-G11, ARCH-G12, and ARCH-G14 remain applicable: no dynamic Next.js
  execution, new service, browser commercial authority, deferred-capability implementation, or
  speculative infrastructure is authorized.

## Authorized implementation scope

When separately authorized, IMP-028D may implement only:

1. An XL desktop three-zone ordering shell: selected-category rail, selected-category Menu, and
   sticky live Cart.
2. A center catalogue that renders only the explicitly selected root category.
3. Accessible root-category navigation driven by explicit selection state, without a root-category
   `IntersectionObserver` scroll-spy requirement.
4. Compact, scannable Menu cards with a consistent `Add +` primary action and a secondary
   `Customisable` label for configurable products; `Add +` opens the existing configurator when
   configuration is supported or required.
5. A desktop live Cart that reuses existing Cart authority and mutations, including configured
   modifier visibility.
6. A bounded desktop Cart whose item list may independently scroll when required while its header,
   safe subtotal presentation, and Checkout action remain visible. This Cart item list is the sole
   permitted nested vertical scroll region; category rail and Menu remain in normal document flow.
7. Tablet and mobile horizontal selected-category navigation with the existing persistent/bottom
   Cart continuity pattern and without the XL side rails.
8. Safe Cart display-price copy: `Estimated subtotal` only when the presentation is fully
   resolvable; otherwise `Total shown at checkout`.
9. Accessibility, responsive layout, and visual presentation governed by
   [`../experience/IMP-028D-ordering-ui-design-lock-RC1.md`](../experience/IMP-028D-ordering-ui-design-lock-RC1.md)
   and its approved composite reference.
10. Consumer-copy cleanup and modest image/performance improvements directly required by the
    changed ordering presentation.

## Explicit non-goals

Menu Search; Popular / Most Ordered; Drops / New; location provider or current-location UX;
Checkout destination redesign; delivery instructions; profile/session changes; verified-phone
projection; My BOBA personalization; Order Again; Favorites; My Usual; a new API, database schema,
migration, pricing authority, or geospatial Serviceability are out of scope.

## Acceptance contract

| ID | Requirement |
|---|---|
| AC01 | At XL, the category rail and live Cart remain available while the center catalogue shows the selected root category. |
| AC02 | Category rail and center Menu do not create nested independent vertical scroll panes. The bounded Cart item list is the sole permitted nested vertical scroll region; Cart header and summary/Checkout remain visible. |
| AC03 | The active category is the explicitly selected root category. Activating a category replaces the center catalogue with that category's items and does not depend on motion or scroll position. |
| AC04 | Keyboard users can reach categories, products, Cart actions, and any Cart overlay logically, with visible focus and no focus loss/trap. |
| AC05 | Existing Cart paths remain authoritative. Menu product cards use `Add +`; configurable items open the existing customization flow. No client price or new commercial field is introduced. |
| AC06 | Tablet and mobile retain usable horizontal selected-category navigation and persistent/bottom Cart continuity without rendering the XL side rails. |
| AC07 | A numeric Cart presentation is labelled `Estimated subtotal` only when fully resolvable; unresolved presentation uses `Total shown at checkout` and never implies final payable truth. |
| AC08 | Changed layouts have no horizontal page overflow at tested desktop/tablet/mobile viewports and retain usable targets and contrast. |
| AC09 | Selected-category switching uses the already-loaded D-368 Menu projection where possible, does not add a Menu authority or blocking full-menu refetch on every selection, and does not observably slow Cart mutations or initial Menu load. |
| AC10 | D-368, D-369, D-370, existing Cart authority, Checkout authority, and all explicit non-goals remain preserved. |
| AC11 | Acceptance follows implementation, independent technical acceptance, exact-candidate fresh Docker deployment, and founder UAT PASS before canonical reconciliation. |

## Implementation gates

Implementation is **authorized** and **started** under explicit founder/task authorization while
architecture remains locked. PROCESS-HARDENING-A in the referenced supporting plan applies to this
product implementation. Before founder UAT, PROCESS-HARDENING-B and the exact-candidate UAT
requirements in `AGENTS.md` apply. A persistence, API, authority, or decision need is a
`DECISION_REQUIRED` stop; D-371 must not be allocated.

## Founder UAT failure and rework evidence

## RC1 capability amendment and implementation reopening

Founder authorization on 2026-08-21 supersedes the prior IMP-028D all-sections/root-category
scroll-spy presentation model with the explicit selected-category model documented above. It also
authorizes the bounded Cart item-list scroll exception and the consistent `Add +` product-card
contract. Global architecture remains ARCH-R15, the decision register remains DR-12, and D-371
remains unused. Prior implementation and UAT evidence below is preserved as history.

The RC1 material rework is `IMPLEMENTATION_IN_PROGRESS`: implementation remains authorized and
started, `IMP-028D_IMPLEMENTATION_COMPLETE: NO`, `IMP-028D_ACCEPTED: NO`, and Founder UAT is
PENDING / NOT RUN for RC1. Visual review is required before implementation completion is recorded.

## Technical pre-UAT blocker

The UAT deployment from `365019e0e64e2d855298c714d3c65671183303b1` reached healthy APIs, but
browser rendering failed before freeze because `IntersectionObserver` rejected
`rootMargin: "-7rem 0px -55% 0px"`. Founder UAT did not occur; this is a technical pre-UAT blocker,
not a Founder UAT failure. The bounded correction is to use browser-valid pixel/percent margin
syntax while preserving the intended sticky-header offset. The correction is complete in
`259d27d`: `rootMargin: "-112px 0px -55% 0px"` preserves the intended 7rem offset at the standard
16px root size. Strict browser-validity regression and deterministic validation pass. No new
authority, API, schema, migration, or UX capability is introduced.

Founder UAT failed on 2026-08-21. The failed candidate remains reconstructible and is not claimed
as passed:

```text
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT: FAIL
FOUNDER_UAT_CANDIDATE_HEAD: 38fa04db9d81e47efeb0702037a0e7ee9371a28d
FOUNDER_UAT_CANDIDATE_TREE: c91e51150461251470791f830293e49931f91cfa
FOUNDER_UAT_PROJECT: boba-bear-imp028d-uat
FOUNDER_UAT_URL: http://127.0.0.1:18084
FOUNDER_UAT_FREEZE_TIMESTAMP: 2026-08-20T18:38:17Z
FOUNDER_UAT_NGINX_OVERLAY_SHA256: 6d830835924027e719516de1d7aa41b7545965b8c7705298924b3bf3f3eb21ec
```

The failure concerns the XL ordering presentation: absent effective three-zone continuity, sparse
product merchandising, dominant serviceability treatment, and customer-visible engineering copy.
The completed rework preserves this failure. A new, freshly built UAT candidate is still required
before Founder UAT can proceed.

## Rework technical completion evidence

```text
REWORK_IMPLEMENTATION_COMMIT: 5327958
REWORK_VALIDATION: OrderingCatalogClient, serviceability-copy, cart-presentation, Cart, and ordering component suites PASS (110 tests)
REWORK_TYPECHECK: PASS
REWORK_LINT: PASS_WITH_PRE_EXISTING_WARNINGS
REWORK_PRODUCTION_BUILD: PASS
REWORK_PROJECT_CONSISTENCY: PASS
REWORK_GOVERNANCE_FINGERPRINT: ad93d75341234a7cf6ee0c472f7e687d762535cec84ebc578a66c71a7f97490d
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT: PENDING
```

The rework is implementation-complete pending independent technical acceptance, CI, a fresh exact
candidate deployment, and Founder UAT. It is not accepted.

## Prior technical completion evidence

IMP-028D implementation is complete pending independent acceptance and founder UAT; it is not
accepted. The recorded implementation/promotion evidence is:

```text
IMPLEMENTATION_COMMIT: 795bb3151e3a24d5914160d232f099016d880a2b
RECONCILED_CI_CANDIDATE: 499e9249e3c46d76e382c8c91740b49253b54a19
GITHUB_PR: #1
CI_RUN: 32395774250
CI_RESULT: SUCCESS
MERGE_COMMIT: ba1b0864fe39aefe3b20b0da1c2c039eff020998
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT: PENDING
```

No UAT artifact identity is claimed before the required fresh UAT build and deployment.
