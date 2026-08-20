---
Status: SUPPORTING PLANNING / PROCESS-REMEDIATION REGISTER
Authority: NONE — does not change CURRENT product, architecture, decision, roadmap, or acceptance authority
Canonical vision: docs/platform/VISION.md
Canonical sequence: docs/platform/ROADMAP.md
Canonical accepted state: docs/platform/STATE.md
Canonical architecture: docs/platform/ARCHITECTURE.md
Canonical decisions: docs/platform/decision-register.md
Source checkpoint: 7f4149914c9abdb0fb6d80e64bbf21579fe790df
Source tree: 2a49537394ee13b0af38b5fa535328e9808e00f3
Prepared: 2026-08-20
---

# D2C UX Program and Process-Hardening Plan

## 1. Authority and current boundary

This is a supporting planning artifact. It neither allocates an IMP or a decision ID nor authorizes
implementation. In particular, it does not alter the frozen `imp-028c/uat-candidate` or claim
acceptance of IMP-028C.

Current verified canonical position:

```text
acceptedThrough = IMP-028B
currentProductSlice = IMP-028C
pendingAcceptance = IMP-028C
IMP-028C = IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE
IMP-028C_ACCEPTED = NO
D-371 = UNUSED
```

The program below is subsequent planning only. An implementation slice must still pass its own
alignment gate, capability architecture lock, and authorization. The numbered product slices in
this document are descriptive labels, not formal IMP identifiers.

## 2. Process-review reconciliation register

Classifications describe the repository at the source checkpoint. A historical reviewer assertion,
or an agent-authored `PASS` field, is not treated as evidence by itself.

| Finding | Classification | Current evidence | Remaining risk and bounded remediation | Blocks |
|---|---|---|---|---|
| Acceptance evidence relied on agent-authored verdicts | PARTIAL | `.github/workflows/ci.yml` executes deterministic commands; `scripts/project-consistency.mjs` and its Node test suite return process exit codes. `engineering/change-workflow.md` and the PR template now require command, exit-code, relevant raw-output, and diff artifacts. Current canonical records still contain self-authored outcome tokens such as `IMP_027_INDEPENDENT_IMPLEMENTATION_REVIEW: PASS`. | Preserve deterministic evidence in future task/PR handoff; narrative verdicts remain summaries, and automated enforcement is not yet present. | Next application-source implementation |
| Dirty-tree candidates were not reconstructible | PARTIAL | The frozen candidate is a clean, committed SHA/tree; `AGENTS.md` defines a content-sensitive `working-tree:fingerprint`; `scripts/working-tree-fingerprint.mjs` is the implementation. No committed cold-clone/reproduction record for this candidate was located. | PROCESS-HARDENING-A: make a clean-clone verification artifact part of a release/UAT candidate when reproducibility is asserted. | Next UAT deployment |
| Branch/commit discipline was weak | PARTIAL | `ci.yml` runs on every pull request. `AGENTS.md` now permits small reconstructible local commits for authorized bounded tasks, and `engineering/change-workflow.md` documents short-lived branches, clean checkpoints, and separate push/merge/deploy gates. No repository evidence of GitHub branch protection was located. | Configure and verify required-review/branch-protection policy outside this repository. | Next application-source implementation |
| CI did not exist | ADDRESSED | `.github/workflows/ci.yml` is a committed workflow with `npm ci`, typecheck, lint, targeted commerce/menu suites, governance checks, Docker tooling build, and production build. It is triggered by `pull_request` and pushes to `main`/`imp-**`. | The workflow is a minimum CI baseline; PROCESS-HARDENING-A should add evidence capture/review requirements, not replace it. Whether a particular remote run succeeded is external evidence, not inferred here. | None |
| Accepted/deployed/UAT artifact identity was weak | PARTIAL | The UAT rule in `accepted-foundation-operating-rules.md` requires repository, branch, SHA, fingerprint, image ID/digest, container ID, and image/container match. The frozen candidate SHA/tree is verifiable locally. No committed reusable deployment/UAT record or same-digest production-promotion chain was found. | PROCESS-HARDENING-B/C: standardize a UAT charter/record, then implement release-candidate tag → CI run → immutable digest → deployment/UAT record → same-digest promotion when production release work is authorized. | Next UAT deployment / production release |
| Governance duplication and overfit validator | OPEN | `scripts/project-consistency.mjs:19-21` hard-codes version allowlists; current lifecycle checks are IMP-specific (for example lines 41-47 and 266-354). These checks correctly represent the current checkpoint but structurally duplicate lifecycle facts. | PROCESS-HARDENING-D: separately design a declarative generic state machine plus structured lifecycle state and externally verifiable facts. Do not weaken or remove existing validation before a tested migration. | None now; future governance change |
| Test power | PARTIAL | Targeted unit, integration, database, and Playwright suites exist (`tests/catalog-imp028c-modifiers`, `tests/database/customer-menu-modifier-projection.integration.test.ts`, `tests/e2e/customer-ordering.spec.ts`). No property-based or mutation-test tooling was found; Playwright is present but no automated accessibility engine was located. | PROCESS-HARDENING-E: add high-risk negative controls first, then D-369/pricing generative tests, Cart-display/Checkout-snapshot parity, focused browser/a11y checks, and migration rehearsal only where a slice changes the relevant boundary. | Next money-path application slice (targeted controls) |
| D-369 price-book scope/nullity | ADDRESSED | `src/server/catalog/imp028c-modifiers/bootstrap.ts:154-163` requires brand scope plus null territory/organization/outlet columns. `tests/catalog-imp028c-modifiers/bootstrap.integration.test.tsx` test “rejects price book with wrong scope type even when brand and code match” (line 464) exercises incompatible scope. | Keep this regression coverage when changing catalog/pricing bootstrap. | None |
| D-369 malicious client price input | PARTIAL | Customer Menu price data is server projected in `src/server/customer-commerce/menu/project-customer-menu.ts`; Cart intent uses canonical product/selection identities rather than a price field. No dedicated test that submits a forged client modifier price was located. | PROCESS-HARDENING-E: add one transport/domain negative control proving price-like client fields cannot set a Cart or Checkout payable value. | Next pricing/Cart mutation change |
| D-369 removal of free default during edit | ADDRESSED | `src/components/ordering/CartClient.test.tsx` test “does not apply zero-price catalog defaults absent from persisted cart intent in edit mode” (line 318) covers the persisted-free-default removal case. | Retain when edit state changes. | None |
| D-369 zero-to-positive default transition during edit | PARTIAL | `CartClient.test.tsx` test “initializes edit mode from persisted cart intent without paid catalog defaults” covers no paid default injection. No explicit transition fixture from zero to positive was located. | PROCESS-HARDENING-E: add a focused transition regression before changing modifier edit initialization. | Next modifier-edit change |
| D-369 removed/stale modifier during edit | ADDRESSED | `cart-presentation.test.ts` test “marks stale persisted modifiers with neutral unavailable copy” (line 220) and `CartClient.test.tsx` test “shows stale modifier presentation and does not offer edit” (line 581) preserve intent without silent substitution. | Retain when menu lifecycle/edit policy changes. | None |
| Founder UAT lacked a FAIL/rework path | ADDRESSED | `accepted-foundation-operating-rules.md` defines `UAT = PASS | FAIL | BLOCKED` and a failed-evidence → fix → revalidate → new fingerprint → redeploy → retest loop. It does not use the proposed names `REJECTED_PENDING_REWORK` or `PASS_WITH_DEFECTS`. | PROCESS-HARDENING-B may decide whether a formal intermediate state adds value; no new lifecycle state is created here. | None |
| Reusable UAT charter/record was absent | PARTIAL | The operating rule specifies provenance and founder-handoff contents, but no reusable scenario charter or completed record template was found. | PROCESS-HARDENING-B: add a documentation-only charter/record template before the next UAT deployment. | Next UAT deployment |
| PR/review model was unspecified | PARTIAL | `.github/pull_request_template.md` and `engineering/change-workflow.md` now provide task/scope, deterministic evidence, diff-scoped adversarial review, and separate promotion gates. `.github/workflows/ci.yml` remains the committed CI baseline. No repository evidence of GitHub branch protection or a completed remote CI run for this task exists. | Configure and verify required-review/branch-protection policy outside this repository; capture remote CI evidence once a PR is authorized. | Next application-source implementation |
| Operational release controls were incomplete | PARTIAL | `scripts/audit-config-boundary.mjs` protects committed configuration/secret boundaries; CI does not run dependency audit, secret scanning, or SBOM generation. ADR-015 defines a future flag/kill-switch model but states no runtime flag code exists; no food-customization switch exists. `ROADMAP.md` keeps observability (IMP-036), backup/restore (IMP-037), and release pipeline (IMP-039) planned. No incident/hotfix runbook or deployment-digest verification record was found. | PROCESS-HARDENING-C: digest verification/release record before production. Keep observability, backup/restore, and feature controls in their authorized roadmap capabilities; do not bolt them onto UX work. | Production release |

## 3. Bounded process-hardening sequence

### PROCESS-HARDENING-A — evidence and branch/PR workflow

Minimum near-term control, required before the next application-source implementation:

1. One short-lived branch per bounded task, created from a recorded SHA.
2. Small reconstructible local commits; no published-history rewrite.
3. Handoff includes exact commands, exit codes, relevant raw output, source SHA/tree/fingerprint, and
   `git diff --stat`; agent conclusion is never the primary oracle.
4. Diff-scoped adversarial review checks authority boundaries, money/security changes, negative
   controls, and scope compliance.
5. A repository-local PR/task template and external branch-protection policy are planned separately.

### PROCESS-HARDENING-B — UAT lifecycle and records

Required before the next founder-UAT deployment:

1. Preserve the existing `PASS | FAIL | BLOCKED` UAT outcome and failed-evidence/retest loop.
2. Create a reusable charter/record with exact candidate identity, prerequisites, scripted scenarios,
   known limitations, result evidence, and defect/retest linkage.
3. Require a fresh build and source/image/container identity match before inviting founder UAT.

`PASS_WITH_DEFECTS` and `REJECTED_PENDING_REWORK` are not introduced by this plan; either would
change product-governance vocabulary and needs a separate decision.

### PROCESS-HARDENING-C — release identity and promotion

Required before a production release, not before planning or the next UX implementation:

```text
commit SHA → release-candidate tag → CI run → immutable image digest
→ deployment record → founder-UAT record → same-digest production promotion
```

The current Docker UAT provenance rule is an interim control, not proof that this full promotion
chain already exists. Dependency audit/secret scanning/SBOM, deployment digest verification, and
incident/hotfix operational records belong in this release-hardening work.

### PROCESS-HARDENING-D — governance model redesign

Safely deferred. Evaluate a replacement based on structured lifecycle state, a declarative generic
state machine, and verifiable external facts. Transition tests and a migration plan are mandatory;
current consistency/fingerprint mechanisms remain in force until replacement is accepted.

### PROCESS-HARDENING-E — test-power improvements

Prioritized for customer/money-path risk: (1) price-tampering negative control and D-369 edit
transition test, (2) Cart displayed estimate versus Checkout Snapshot final-value relationship,
(3) targeted browser keyboard/focus/accessibility testing for new ordering shells, and (4) only
then property-based, mutation, and migration-rehearsal tooling where the changed boundary warrants it.

## 4. D2C UX product program

The desktop destination target is a sticky left category rail, one normally scrolling central Menu,
and sticky live Cart at right. It is explicitly **not** three independent scroll panes. Tablet uses
horizontal sticky categories and suitable Cart access. Mobile keeps horizontal/sticky categories and
the existing persistent bottom-Cart pattern; it is not a collapsed desktop three-column shell.

| Descriptive slice | Dependency and boundary | Explicit exclusions |
|---|---|---|
| A — Desktop Ordering Continuity | Reuses D-368 Customer Menu projection and existing Cart mutations after IMP-028C acceptance/next-slice authorization. | Search, location, checkout destination redesign, profile/session contracts, pricing authority, schema/migration, unauthoritative offers/popularity/drop classifications. |
| B — Menu Search | Client-side search over already projected D-368 Menu facts, after A is stable. | Invented ranking authority. |
| C — Authenticated Customer Contact Projection | Existing Customer Profile `givenName` for greeting; existing customer-auth for verified phone. | `recipientName` identity shortcut, new identity store. |
| D — Location Provider Foundation | Provider-neutral boundary, privacy/config/loading/fallback architecture. | Provider selection, SDK install, persistent provider-place identity. |
| E — Checkout Destination Experience | Existing server-authoritative PIN serviceability; provider city/state/PIN can feed existing contracts. | Dehradun hard-coding, delivery instructions, geospatial serviceability redesign. |
| F — My BOBA Personalization | Legitimate greeting/profile and real destinations only. | Order Again, Favorites, My Usual, saved drinks, dead links. |

Cart presentation may show **Estimated subtotal** only where current Menu-derived facts fully resolve
the presentation. Otherwise use wording such as **Total shown at checkout**. This never establishes
a new Cart pricing authority: Checkout Snapshot remains final payable authority.

## 5. First bounded implementation candidate — Slice A

### Objective

Make large-screen `/order` discovery and Cart continuity faster to scan without changing Menu,
Cart, Pricing, Checkout, authentication, or persistence authority.

### Customer behaviour and scope

- At XL desktop, customers navigate categories from a sticky vertical rail, read a normal document-
  scrolling Menu, and see a sticky live Cart.
- Scrolling updates the active category without creating independent scroll panes.
- Menu rows are compact and scannable; existing Add, quantity, and Cart mutations remain intact.
- Mobile preserves the existing persistent bottom Cart pattern. Tablet uses horizontal category
  navigation and an appropriate Cart access pattern.
- Improve consumer-facing copy only where it describes existing behaviour accurately.

### Non-goals and architecture boundaries

No Menu Search, provider/location work, Checkout destination redesign, customer-profile/session
contract change, pricing computation, schema/migration, new backend endpoint, or new commercial
classification. D-368 remains the sole customer Menu projection. Existing Cart contracts remain
the sole Cart mutation authority; Checkout Snapshot remains final payable authority. D-369 and
D-370 are not reopened.

Expected implementation surfaces, subject to a future locked capability artifact: `/order` shell
and ordering components/styles, existing customer-Menu client projection, existing Cart client and
presentation components, plus focused component and Playwright tests. No server/domain/persistence
surface is expected.

### Testable acceptance criteria

1. At the defined XL breakpoint, the category rail and live Cart remain visible while the central
   Menu uses one browser document scroll.
2. The page contains no nested independently scrolling category/Menu/Cart panes introduced by the
   slice.
3. Keyboard users can reach categories, products, Cart actions, and any Cart overlay in a logical
   order; focus is visible and overlays do not trap or lose focus.
4. The active category reflects the Menu section in view, and category activation moves to the
   associated section without an inaccessible motion-only dependency.
5. Existing Add, quantity, configured-line, and Cart navigation behaviours continue to invoke the
   existing Cart paths; the slice submits no client price or new commercial fields.
6. Tablet and mobile preserve usable category and Cart access; mobile preserves the persistent
   bottom-Cart pattern rather than rendering the XL three-zone shell.
7. When Menu facts resolve the Cart presentation, copy labels it as an estimate; when they do not,
   it does not present a numeric subtotal as final payable truth.
8. Responsive layout has no horizontal page overflow at the tested viewport set and maintains
   usable target sizes/contrast under the existing design system.

### Validation, performance, risks, and UAT

Use focused component tests for shell state, scroll-spy/category mapping, Cart mutation reuse, and
estimate/unresolved copy. Use Playwright at desktop/tablet/mobile widths for one natural scroll,
keyboard focus/layering, responsive Cart access, and existing add-to-Cart continuity. Add an
automated accessibility check only when an agreed lightweight tool and baseline are selected.

Performance expectation: no additional Menu authority or blocking full-menu refetch caused by
scroll position; scroll-spy work must be bounded to visible sections and must not make Cart mutation
or existing initial Menu load observably slower in the focused browser checks. Main risks are
sticky/focus layering, small viewport behaviour, and accidental display of an estimate as a final
price. This customer-visible slice requires founder UAT after independent technical acceptance;
the charter from PROCESS-HARDENING-B must bind it to an exact artifact.

## 6. Preconditions and deferred work

Slice A is not authorized by this document. Before it can start: IMP-028C must follow its own UAT
and acceptance path, the canonical sequencing authority must activate/authorize a bounded next
capability, and PROCESS-HARDENING-A must be completed. PROCESS-HARDENING-B is required before its
founder UAT; PROCESS-HARDENING-C is required only before production release. D, E, and F require
separate authority/architecture work and must not be smuggled into Slice A.
