<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-028D",
  "title": "Desktop Ordering Continuity",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "implementation": "IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE",
  "implementationAuthorized": true,
  "lastReviewed": "2026-08-20",
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
| Lifecycle | `ARCHITECTURE_LOCKED` / `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` |
| Implementation | `AUTHORIZED` / `STARTED` / `COMPLETE` |
| Founder UAT required at acceptance | **YES** |
| Schema / migration / new authority | **NO** / **NO** / **NO** |

```text
IMP-028D_ARCHITECTURE_LOCKED: YES
IMP-028D_IMPLEMENTATION_AUTHORIZED: YES
IMP-028D_IMPLEMENTATION_STARTED: YES
IMP-028D_IMPLEMENTATION_COMPLETE: YES
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

1. An XL desktop three-zone ordering shell: sticky category rail, normal document-scrolling Menu,
   and sticky live Cart.
2. Exactly one natural document scroll; no independently scrolling category, Menu, or Cart pane.
3. IntersectionObserver category scroll spy and accessible category navigation to Menu sections.
4. Compact, scannable desktop Menu presentation while preserving existing Add and Customize flows.
5. A desktop live Cart that reuses existing Cart authority and mutations, including configured
   modifier visibility.
6. Safe Cart display-price copy: `Estimated subtotal` only when the presentation is fully
   resolvable; otherwise `Total shown at checkout`.
7. Consumer-copy cleanup only on affected Menu and Cart surfaces, responsive tablet behavior, and
   retention of the existing mobile sticky Cart pattern.
8. Accessibility and modest image/performance improvements directly required by the changed
   ordering presentation.

## Explicit non-goals

Menu Search; Popular / Most Ordered; Drops / New; location provider or current-location UX;
Checkout destination redesign; delivery instructions; profile/session changes; verified-phone
projection; My BOBA personalization; Order Again; Favorites; My Usual; a new API, database schema,
migration, pricing authority, or geospatial Serviceability are out of scope.

## Acceptance contract

| ID | Requirement |
|---|---|
| AC01 | At XL, the category rail and live Cart remain visible while the central Menu uses one browser document scroll. |
| AC02 | The slice adds no nested independently scrolling category, Menu, or Cart pane. |
| AC03 | Active category follows the Menu section in view; category activation reaches its associated section without a motion-only dependency. |
| AC04 | Keyboard users can reach categories, products, Cart actions, and any Cart overlay logically, with visible focus and no focus loss/trap. |
| AC05 | Add, quantity, Customize, configured-line, and Cart navigation behavior continue through existing Cart paths and submit no client price or new commercial field. |
| AC06 | Tablet retains usable category and Cart access; mobile retains the persistent bottom-Cart pattern and does not render the XL shell. |
| AC07 | A numeric Cart presentation is labelled `Estimated subtotal` only when fully resolvable; unresolved presentation uses `Total shown at checkout` and never implies final payable truth. |
| AC08 | Changed layouts have no horizontal page overflow at tested desktop/tablet/mobile viewports and retain usable targets and contrast. |
| AC09 | Scroll-spy work is bounded to visible Menu sections, does not add a Menu authority or blocking full-menu refetch, and does not observably slow focused Cart mutation or initial Menu load. |
| AC10 | D-368, D-369, D-370, existing Cart authority, Checkout authority, and all explicit non-goals remain preserved. |
| AC11 | Acceptance follows implementation, independent technical acceptance, exact-candidate fresh Docker deployment, and founder UAT PASS before canonical reconciliation. |

## Implementation gates

Implementation is **authorized** and **started** under explicit founder/task authorization while
architecture remains locked. PROCESS-HARDENING-A in the referenced supporting plan applies to this
product implementation. Before founder UAT, PROCESS-HARDENING-B and the exact-candidate UAT
requirements in `AGENTS.md` apply. A persistence, API, authority, or decision need is a
`DECISION_REQUIRED` stop; D-371 must not be allocated.

## Technical completion evidence

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
