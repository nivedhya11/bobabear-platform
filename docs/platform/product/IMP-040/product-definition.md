<!-- governance-meta
{
  "status": "PRE_GATE_DRAFT",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-040",
  "productDefinitionVersion": "PD-IMP-040-DRAFT-1",
  "process": "PD-1",
  "verificationPolicy": "TEST-1",
  "lastReviewed": "2026-09-18",
  "productDefinitionGateExecution": "NOT_PERFORMED",
  "productDefinitionGateResult": "NOT_PERFORMED",
  "architectureFitExecution": "NOT_PERFORMED",
  "architectureFit": "NOT_PERFORMED",
  "architectureLocked": "NO",
  "implementationAuthorized": "NO",
  "implementationStarted": "NO",
  "impAccepted": "NO",
  "imp040Activated": "NO",
  "journeyGapAuditExecution": "NOT_PERFORMED",
  "journeyGapAuditPlan": "READY",
  "journeyGapAuditRequired": "YES",
  "founderUatRequired": "YES",
  "founderUatStatus": "NOT_PERFORMED",
  "launchAuthorized": "NO",
  "goDeclared": "NO",
  "publicLaunchApproved": "NO",
  "productDecisions": 10,
  "genuineFounderDecisions": 9,
  "reconfirmedExistingDecisions": 1,
  "unresolvedProductDecisions": 0,
  "preGateDraft": "YES"
}
-->

# IMP-040 — Launch Validation & Cutover

## Product Definition (PRE-GATE DRAFT — Product Definition Gate NOT_PERFORMED)

```text
Document status: PRE-GATE DRAFT
PRODUCT_DEFINITION_VERSION: PD-IMP-040-DRAFT-1
PRE-GATE DRAFT: YES
CAPABILITY: IMP-040
TITLE: Launch Validation & Cutover
AUTHORITY: PRODUCT_DEFINITION
PROCESS: PD-1
VERIFICATION_POLICY: TEST-1

PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
ARCHITECTURE_FIT_EXECUTION: NOT_PERFORMED
ARCHITECTURE_FIT: NOT_PERFORMED
ARCHITECTURE_LOCKED: NO
IMP040_ACTIVATED: NO
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO
IMP040_ACCEPTED: NO
JOURNEY_GAP_AUDIT_REQUIRED: YES
JOURNEY_GAP_AUDIT_PLAN: READY
JOURNEY_GAP_AUDIT_EXECUTION: NOT_PERFORMED
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_STATUS: NOT_PERFORMED
LAUNCH_AUTHORIZED: NO
GO_DECLARED: NO
PUBLIC_LAUNCH_APPROVED: NO
PUBLIC_LAUNCH_ACCEPTED: NO
DNS_MUTATION_AUTHORIZED: NO

PRODUCT_DECISIONS: 10
TOTAL_DECISION_RECORD_ITEMS: 10
NEW_GENUINE_FOUNDER_DECISIONS: 9
RECONFIRMED_EXISTING_DECISIONS: 1
UNRESOLVED_PRODUCT_DECISIONS: 0
OPEN_FOUNDER_DECISIONS: 0

FOUNDER_APPROVAL_PROVENANCE:
  DATE: 2026-09-18
  AUTHORITY: Founder
  CONFIRMATION: explicit "proceed" issued in direct response to the exact
                IMP-040 recommended-refinement approval package
  PACKAGE: APPROVE_IMP040_WITH_RECOMMENDED_REFINEMENTS (package identity; not a
           claim that the Founder typed that phrase)

FD-040-01: APPROVED_WITH_REFINEMENT
FD-040-02: APPROVED_WITH_REFINEMENT
FD-040-03: APPROVED
FD-040-04: APPROVED
FD-040-05: APPROVED_WITH_REFINEMENT
FD-040-06: APPROVED
FD-040-07: ALREADY_DECIDED / RECONFIRMED
FD-040-08: APPROVED_WITH_REFINEMENT
FD-040-09: APPROVED_POLICY / FUTURE_EVIDENCE_REQUIRED
FD-040-10: APPROVED_WITH_REFINEMENT

PRODUCT_DEFINITION_GATE_READY: gate-ready PRE-GATE Product Definition candidate
  with Founder product decisions resolved
  (Founder decision resolution != Product Definition Gate PASS)

stories: 10
acceptance_scenarios: 17
business_rules: 10
```

This artifact is the **gate-ready PRE-GATE Product Definition candidate** for
`PD-IMP-040-DRAFT-1`, with Founder product decisions resolved. It persists Founder-approved
launch/validation product requirements without executing the Product Definition Gate,
Architecture Fit, architecture lock, IMP-040 activation, implementation authorization,
Journey Gap Audit execution, DNS mutation, live commercial provider enablement, or Founder GO.

```text
Founder decision resolution
  !=
Product Definition Gate PASS
```

```text
PRODUCT REQUIREMENT
  = what public-launch validation / cutover outcomes BOBA Bear promises and must prove

ARCHITECTURE MECHANISM
  = how Fit/implementation satisfies those requirements within existing ADRs / ARCH-R19

This Product Definition defines PRODUCT REQUIREMENTS only.
It does not invent or lock Architecture Fit mechanisms.
```

```text
PRODUCT_DELIVERY_PROCESS_EFFECTIVE_FROM = IMP-036F
HISTORICAL_ACCEPTED_IMPS_REWRITTEN = NO
IMP036E_LIFECYCLE_CHANGED = NO
PD1_DID_NOT_ACTIVATE_IMP036F_AT_ADOPTION = YES
```

Lifecycle truth remains ROADMAP/STATE only (`GTM-R128` / `STATE-R126`):
`acceptedThrough = IMP-036F`; `currentProductSlice = IMP-036G`
(`IMPLEMENTATION_IN_PROGRESS`; `IMP036G_IMPLEMENTATION_COMPLETE = NO`; `IMP036G_ACCEPTED = NO`);
`nextProductSlice = IMP-037`; **`IMP040_ACTIVATED: NO`**. Presence of this PRE-GATE draft does
**not** activate IMP-040 and does **not** advance ROADMAP/STATE lifecycle.

---

## 1. Identity / version / status

| Field | Definition |
|---|---|
| Capability / title | `IMP-040 — Launch Validation & Cutover` (CURRENT ROADMAP identity; PLANNED; `gtmBoundary`) |
| Product Definition version / document status | `PD-IMP-040-DRAFT-1`; **Document status: PRE-GATE DRAFT**; **PRE-GATE DRAFT: YES** |
| Product owner / approval evidence | Founder. FD-040-01…10 resolved 2026-09-18 via explicit `"proceed"` in response to the exact IMP-040 recommended-refinement approval package. Product Definition Gate **NOT_PERFORMED**. |
| Process / verification policy | `PD-1` / `TEST-1` |
| Canonical anchors | VISION-1; ROADMAP GTM-R128; STATE STATE-R126; ARCH-R19; DR-15; PD-1; TEST-1; PERSONA-1; GJ-1 |
| Repository candidate | Canonical path `/home/ajoshi/repos/boba-bear-platform`; base `origin/main` `c35c9eab6a30ec6ce745cefd75c523181326f360` / tree `266fe3b07811f6942e76cac155d58ba07daabe56`; draft branch `governance/imp040-pre-gate-product-definition` |
| Capability lifecycle / authorization | ROADMAP/STATE: IMP-040 remains **PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED**; **IMP040_ACTIVATED: NO**; Product Definition Gate NOT_PERFORMED; Architecture Fit NOT_PERFORMED; architecture NOT_LOCKED; implementation NOT_AUTHORIZED / NOT_STARTED; IMP040_ACCEPTED: NO; GO_DECLARED: NO; PUBLIC_LAUNCH_APPROVED: NO. **currentProductSlice remains IMP-036G.** |
| Relevant capability architecture / ADRs | ADR-002 (Pages transition, rollback, incident); ADR-007 (tax/GST commercial gate); ADR-011 delivery; ADR-012 notifications; IMP-037/038/039 hard prerequisites (future accepted status required before GO — not claimed accepted by this draft); GJ-1 |
| Founder UAT applicability | `FOUNDER_UAT_REQUIRED = YES`; `FOUNDER_UAT_STATUS = NOT_PERFORMED` — this IMP is the public launch verdict surface |

Behaviour classification vocabulary:

```text
CURRENT_SUPPORTED
PLANNED_IMP040
FOLLOW_UP
DEFERRED
NOT_SUPPORTED
ARCHITECTURE_FIT_REQUIRED
FOUNDER_APPROVED_BOBA_POLICY
FUTURE_LAUNCH_EVIDENCE_REQUIRED
```

Architecture Fit hypotheses only (not locked):

```text
NEW_SERVICE: likely NO
NEW_ROLE: NO
NEW_PERMISSION: NO
NEW_RBAC_MODEL: NO
D374_REQUIRED_FOR_LOCK: do not create automatically
ARCH_R20_REQUIRED: do not create automatically
```

---

## 2. Authority and provenance

| Source | Role | Classification |
|---|---|---|
| `docs/platform/VISION.md` VISION-1 | V1 GTM outcome / Non-Goals | VERIFIED |
| `docs/platform/ROADMAP.md` GTM-R128 | IMP-040 identity; gtmBoundary; PLANNED | VERIFIED |
| `docs/platform/STATE.md` STATE-R126 | acceptedThrough IMP-036F; current slice IMP-036G | VERIFIED |
| `docs/platform/PRODUCT-DELIVERY.md` PD-1 | Journey Gap Audit required before public GTM / IMP-040 acceptance | VERIFIED |
| `docs/platform/TESTING.md` TEST-1 | Evidence policy; no silent-retry-as-pass | VERIFIED |
| `docs/platform/ARCHITECTURE.md` ARCH-R19 | Deployment model | VERIFIED |
| ADR-002 / ADR-007 / ADR-011 / ADR-012 | Cutover, tax, delivery, notifications | VERIFIED |
| GJ-1 | Golden Journey registry (not the audit) | VERIFIED |
| Reviewed `/tmp` research package | Stories/ACs/BRs + Journey Gap Audit plan (NON_CANONICAL input) | NON_CANONICAL input |
| Founder `"proceed"` (2026-09-18) | Human product authority for FD-040-01…10 | HUMAN product authority |

```text
MAIN_SHA = c35c9eab6a30ec6ce745cefd75c523181326f360
MAIN_TREE = 266fe3b07811f6942e76cac155d58ba07daabe56
MAIN_MATCHES_TASK_SNAPSHOT = YES
```

No material product/architecture/lifecycle conflict with CURRENT ROADMAP/STATE/ARCHITECTURE was
found that would require stopping persistence of this PRE-GATE draft.

---

## 3. Business outcome

Move from **production-ready platform** (IMP-039 when accepted) to **public commercial launch**
using explicit evidence and a **human** Founder GO / NO-GO / ABORT decision. Deployment success is
not business launch success.

```text
IMP-039 = production deployability and operational readiness
IMP-040 = public launch validation and cutover
```

Observable success: `GO_NO_GO_EVIDENCE_COMPLETE` with Journey Gap Audit dispositions, production
smoke under authorized provider modes, tax/GST evidence readiness, cutover record, elevated
observation plan — then Founder may say GO or abort. Agents never self-declare launch.

Canonical public URL after authorized cutover: `https://thebobabear.in` (FD-040-01). Persistence of
this requirement does **not** mutate DNS.

---

## 4. IMP-040 ownership boundary

```text
IMP-040 owns:
  launch-candidate validation
  Journey Gap Audit execution
  GO / NO-GO / ABORT evidence
  live commercial-mode launch authorization
  public customer cutover
  post-cutover observation
  Founder launch-stable verdict

IMP-040 does not itself:
  provision production infrastructure
  replace IMP-037 recovery capability
  replace IMP-038 security/privacy hardening
  replace IMP-039 production pipeline
  invent new commerce/domain behaviour
```

A launch defect may block launch or return to its owning capability. IMP-040 does not silently
rewrite accepted history.

---

## 5. Primary personas

| Persona ID | Role in this slice | Evidence |
|---|---|---|
| Founder | **Human launch authority (R3)** — GO / NO-GO / ABORT / launch-stable; not a PERSONA-1 ID | AGENTS.md; FD-040-01…10 |
| `PERSONA-PLATFORM-OPERATOR` | Assembles evidence, runs smoke, watches health, executes technical rollback/cutback under policy | PERSONA-1 |
| `PERSONA-WORKFORCE-OPERATOR` | Kitchen/ops/admin critical paths during live smoke and observation (required operating/workforce owner at cutover — FD-040-02) | PERSONA-1; FD-040-02 |
| `PERSONA-CUSTOMER` | Subject of Golden Journey validation (controlled until GO; public after GO) | PERSONA-1; GJ-1 |

```text
PERSONA != ROLE != PERMISSION != AUTHORIZATION
```

Do **not** invent RBAC. Launch/cutover approval is human operating authority, not an application role.

---

## 6. Desired-state journeys

| Journey ID | Success |
|---|---|
| `JOURNEY-040-CANDIDATE-IDENTITY` | Exact SHA/tree/fingerprint + production image digest recorded |
| `JOURNEY-040-PREREQUISITE-GATES` | IMP-036G + IMP-037/038/039 COMPLETE_AND_ACCEPTED with required readiness evidence |
| `JOURNEY-040-GAP-AUDIT` | All GJ rows disposed; Founder limitation register where applicable; no silent rewrite of history |
| `JOURNEY-040-LIVE-SMOKE` | Critical paths on production with authorized provider modes (FD-040-08) |
| `JOURNEY-040-CUTOVER` | Apex to DO per FD-040-01; Pages stops active publication; no dual publication |
| `JOURNEY-040-GO-NO-GO` | Evidence complete; Founder decides (FD-040-03) |
| `JOURNEY-040-ABORT-ROLLBACK` | Human abort / image rollback / emergency Pages cutback per FD-040-03/04 |
| `JOURNEY-040-OBSERVE` | Elevated observation ≥72h spanning ≥2 operating periods (FD-040-10) |
| `JOURNEY-040-COMMS` | Proportionate pack executed per FD-040-05 |

---

## 7. Story map (V1)

| Story | Slice |
|---|---|
| US-IMP-040-001 Launch candidate identity | V1 |
| US-IMP-040-002 Prerequisite acceptance evidence | V1 |
| US-IMP-040-003 Journey Gap Audit execution | V1 |
| US-IMP-040-004 Critical Golden Journey production validation | V1 |
| US-IMP-040-005 Production configuration + live provider mode validation | V1 |
| US-IMP-040-006 Domain/DNS/TLS cutover | V1 |
| US-IMP-040-007 Go/no-go evidence assembly | V1 |
| US-IMP-040-008 Abort / rollback / cutback execution | V1 |
| US-IMP-040-009 Post-cutover elevated observation | V1 |
| US-IMP-040-010 Founder sign-off record (human; agent prepares pack only) | V1 |

---

## 8. Proposed V1 acceptance slice

**Evidence + human cutover process**, not new customer features. Fixes only as surfaced by
audit/smoke, without silently opening new IMPs. New product behaviour found by audit is classified
via FD-040-06 register, not implemented opportunistically.

Order Again shortcut is **not** in V1 launch scope (FD-040-07). Returning new-order happy path
remains mandatory.

---

## 9. Acceptance scenarios

| ID | Then |
|---|---|
| AC-IMP-040-001-01 | Candidate records canonical path, branch `main`, HEAD, tree, WORKING_TREE_FINGERPRINT, production OCI digest |
| AC-IMP-040-002-01 | Evidence shows IMP-036G and IMP-037/038/039 COMPLETE_AND_ACCEPTED with material readiness |
| AC-IMP-040-003-01 | Audit enumerates all GJ-1 journeys with dispositions |
| AC-IMP-040-003-02 | Audit does not change historical acceptance status |
| AC-IMP-040-004-01 | GJ-FIRST-ORDER succeeds on production candidate with authorized payment mode |
| AC-IMP-040-004-02 | GJ-PAYMENT-RECOVERY negative path proven |
| AC-IMP-040-004-03 | Workforce GJ-PERMITTED-OUTLET-ACCESS and ops visibility proven |
| AC-IMP-040-005-01 | Live vs sandbox payment/delivery/notification match FD-040-08 authorization |
| AC-IMP-040-005-02 | Backup/restore-readiness status from IMP-037 is READY |
| AC-IMP-040-005-03 | IMP-038 hardening evidence is PASS |
| AC-IMP-040-006-01 | After Founder GO + authorized cutover, `https://thebobabear.in` is canonical apex on DO; www consistent; TLS valid |
| AC-IMP-040-006-02 | GitHub Pages is no longer an active independent production publication source |
| AC-IMP-040-007-01 | Pack can be `GO_NO_GO_EVIDENCE_COMPLETE` without stating GO |
| AC-IMP-040-008-01 | Abort pauses new checkout; paid orders preserved and reconciled |
| AC-IMP-040-008-02 | Primary application recovery is prior image digest or forward corrective release; DB restore not routine |
| AC-IMP-040-009-01 | Elevated observation ≥72h spanning ≥2 operating periods + monitor list recorded (FD-040-10) |
| AC-IMP-040-010-01 | Only Founder-recorded GO/NO-GO/ABORT/launch-stable is launch authority |

---

## 10. Business rules

| ID | Rule |
|---|---|
| BR-IMP-040-001 | Deployment success ≠ launch success |
| BR-IMP-040-002 | Agents must not declare GO / LAUNCH_APPROVED / PUBLIC_LAUNCH_ACCEPTED / PUBLIC_LAUNCH_APPROVED |
| BR-IMP-040-003 | Historical IMP acceptance is not rewritten by audit findings |
| BR-IMP-040-004 | Gaps classify via Founder limitation register (FD-040-06); mandatory GJ happy paths / security / financial / order / data integrity / tax prerequisites cannot be silently waived |
| BR-IMP-040-005 | Browser payment UI is not Payment truth |
| BR-IMP-040-006 | Old Checkout Snapshot is never payable truth (Order Again) |
| BR-IMP-040-007 | Customer self-service cancellation remains deferred (VISION) |
| BR-IMP-040-008 | Production smoke must not create uncontrolled real financial activity until Razorpay live mode is Founder-authorized (FD-040-08) |
| BR-IMP-040-009 | GitHub Pages must not dual-publish after cutover (FD-040-01) |
| BR-IMP-040-010 | Exact-candidate provenance required for Founder UAT/launch |

---

## 11. Journey Completeness Matrix (process)

| Journey | Happy | Failure |
|---|---|---|
| Candidate identity | Fingerprint + digest match | Any drift → stop |
| Prerequisites | All accepted + readiness | Missing IMP / unreadiness → NO-GO (FD-040-03) |
| Gap audit | All rows disposed; register signed where needed | Undisposed GJ → evidence incomplete |
| Live smoke | Critical GJs pass under authorized modes | Failure → abort or limitation decision |
| Cutover | Apex on DO; Pages inactive publication | Split-brain Pages+DO → launch defect |
| Go/no-go | Evidence complete | Founder NO-GO |
| Observe | Window complete; Founder launch-stable | Material failure → pause/corrective/cutback |

---

## 12. UX / operator state matrix

| State | Meaning |
|---|---|
| PRE_CUTOVER | DO production exists (IMP-039 when accepted); apex still Pages |
| EVIDENCE_INCOMPLETE | Missing audit/smoke/prereq/tax evidence |
| GO_NO_GO_EVIDENCE_COMPLETE | Agent terminal evidence state (not GO) |
| CUTOVER_IN_PROGRESS | Founder-authorized cutover; dual-run forbidden |
| LIVE_OBSERVING | Public traffic; elevated observation (FD-040-10) |
| ABORTED | New checkout paused; paid obligations preserved |
| ROLLED_BACK_IMAGE | Prior digest / forward corrective release |
| ROLLED_BACK_DNS | Pages emergency cutback; ordering unavailable unless alternate surface proven |
| LAUNCH_STABLE | **Founder only** after elevated observation evidence |
| LAUNCH_ACCEPTED | **Founder only** after reconciliation |

---

## 13. Security / privacy

Cutover must not disable IMP-038 headers/CSP (when IMP-038 is accepted). Live money-moving keys only
after FD-040-08 Founder authorization. Production data access during smoke is permission-scoped.
Incident during window uses IMP-038 evidence pack; personal-data-breach communication remains
separate (FD-040-05).

---

## 14. Data implications

First real customer/payment data may appear at/after GO. Backup READY is a gate. No
production→staging copy. Financial documents start statutory clock — FD-040-09 policy + future
written adviser confirmation. Agents must not invent GSTIN/rates/registration facts.

---

## 15. Concurrency / recovery

Cutover vs in-flight Pages users. Payment webhooks must hit the live host after DNS. Recovery
discipline per FD-040-04: image/digest or forward fix first; DB restore = DR only; provider-mode
reversal separate; Pages cutback emergency with customer messaging when ordering affected.

---

## 16. Observability / supportability

IMP-036 operational-status + planned IMP-039 alerts + elevated observation monitor list (FD-040-10).
Critical alert ack targets continue from planned IMP-039 FD-039-07 input (≤30 min during operating
hours; before next operating period outside) as a **dependency planning expectation**, not as
accepted current runtime authority. Support macros from FD-040-05. V1 does not require 24×7 staffing.

---

## 17. Accessibility / responsive

Production smoke of customer journeys includes mobile+desktop (IMP-028D continuity). Audit flags
inaccessible launch blockers.

---

## 18. Golden Journey impacts

This IMP **owns the audit and production proof** of GJ-1. Journey Gap Audit plan is READY;
execution is **NOT_PERFORMED**. Order Again shortcut not required (FD-040-07); returning new-order
path mandatory.

Proposed audit disposition vocabulary (planning; not locked PD-1 tokens on CURRENT authority):

```text
LAUNCH_BLOCKER
AUTHORIZED_FOLLOW_UP_REQUIRED
ACCEPTED_KNOWN_LIMITATION_REQUIRING_FOUNDER_DECISION
```

---

## 19. Journey Gap Audit (requirement + plan; execution NOT_PERFORMED)

PD-1 requires this audit before public GTM / IMP-040 acceptance. This section **persists the plan**.
It does **not** execute the audit and does **not** reopen accepted IMPs. No Golden Journey is marked
PASS from planning evidence.

```text
JOURNEY_GAP_AUDIT_REQUIRED: YES
JOURNEY_GAP_AUDIT_PLAN: READY
JOURNEY_GAP_AUDIT_EXECUTION: NOT_PERFORMED
CURRENT_GOLDEN_JOURNEY_COUNT: 10 (GJ-1 registry)
PASS_MARKED: NO
```

Future execution **must** bind evidence to the exact candidate SHA / image digest / environment and
record launch consequence for every row.

### Required capture fields (every journey row)

```text
journey ID
candidate SHA / image digest
environment
preconditions
test identity / data
observable outcome
negative / degraded path where mandatory
evidence location
owner
blocker status
launch consequence
```

### Shared production fixture (plan)

| Item | Plan |
|---|---|
| Environment | Founder-approved future IMP-039 planning input uses pre-cutover hostname `prod.thebobabear.in`; apex only after Founder GO. This is **not** a claim that `prod.thebobabear.in` currently exists as deployed/canonical runtime. Not `/mnt/c`; not dirty worktree |
| Candidate identity | `CANONICAL_REPOSITORY_PATH` + `main` + HEAD + tree + `WORKING_TREE_FINGERPRINT` + production OCI image digest |
| Evidence location root (plan) | Founder-authorized launch evidence archive path recorded at audit start (Fit chooses store; plan requires a durable path per row) |
| Customer fixture | Synthetic customer; live vs sandbox payment per FD-040-08 |
| Workforce fixture | Permitted outlet membership; second identity for deny tests |
| Menu fixture | Sellable IMP-036F catalog at launch outlet |
| Payment fixture | Razorpay mode per FD-040-08 |
| Delivery fixture | Mode per FD-040-08 |
| Notification fixture | Meta live or IN_APP-only per FD-040-08 |
| Evidence artefacts | Screenshots/logs/IDs/digest; **first failure preserved** (TEST-1) |
| Preconditions (shared) | IMP-036G + IMP-037/038/039 accepted when audit executes for GO; menu sellable; outlet operable; provider mode authorized |

### GJ-1 rows covered by the plan (10)

| Journey ID | GJ-1 status (registry) | Plan disposition notes |
|---|---|---|
| `GJ-FIRST-ORDER` | CURRENT | Happy-path fail → `LAUNCH_BLOCKER`; cannot waive |
| `GJ-RETURNING-ORDER` | PARTIAL | New-order fail → `LAUNCH_BLOCKER`; missing Order Again shortcut → non-blocking limitation (FD-040-07) |
| `GJ-AVAILABILITY` | CURRENT | Broken fresh-read continuity → `LAUNCH_BLOCKER` |
| `GJ-PRODUCT-MENU-LAUNCH` | CURRENT | Cannot sell configured menu → `LAUNCH_BLOCKER` |
| `GJ-STORE-PAUSE-RESUME` | CURRENT | Pause not reflected → `LAUNCH_BLOCKER` |
| `GJ-PERMITTED-OUTLET-ACCESS` | CURRENT | AuthZ hole → `LAUNCH_BLOCKER` |
| `GJ-PAYMENT-RECOVERY` | CURRENT | Recovery broken → `LAUNCH_BLOCKER` |
| `GJ-CANCELLATION-REFUND` | CURRENT | Ops cannot cancel/refund when needed → `LAUNCH_BLOCKER` |
| `GJ-TRADING-HOURS` | CURRENT | Hours not gating orders → `LAUNCH_BLOCKER` |
| `GJ-ADDRESS-SERVICEABILITY` | CURRENT | Serviceability wrong → `LAUNCH_BLOCKER` |

### Additional launch paths not named as GJ-1 rows (audit shall still tick)

| Path | Plan | Likely class if gap |
|---|---|---|
| Delivery/fulfilment | Execute chosen accepted Dehradun mode (FD-040-08) | Mode mismatch vs marketing = LAUNCH_BLOCKER |
| Notifications | Live WhatsApp or IN_APP-only as authorized | Overclaim = LAUNCH_BLOCKER; IN_APP-only if disclosed = known limitation |
| Financial document continuity | Invoice/sign after first paid order | Accountant gap = FD-040-09 LAUNCH_BLOCKER until signed off |
| Admin/workforce critical | Admin console on production | 036G not accepted yet = sequence blocker before 040 starts |
| Monitoring/backup/restore-ready | Status READY from owning IMPs | Not READY = LAUNCH_BLOCKER |

---

## 20. Explicit non-goals

- Implementing new customer features to “complete” PARTIAL journeys unless Founder re-scopes ROADMAP
- Declaring GO / PUBLIC_LAUNCH_APPROVED / PUBLIC_LAUNCH_ACCEPTED by agents
- Reopening accepted IMPs via audit
- Cloud redesign / new delivery mode invention
- Absorbing IMP-037/038/039 unfinished work by renaming it launch
- DNS mutation or live credential changes by this Product Definition alone
- Enterprise-scale communications platform (FD-040-05)
- 24×7 staffing (FD-040-10)
- Order Again shortcut as launch requirement (FD-040-07)
- Provisioning production infrastructure (IMP-039)
- Replacing IMP-037 recovery or IMP-038 hardening

---

## 21. Deferrals / follow-ups

| Item | Class |
|---|---|
| Order Again shortcut | DEFERRED / accepted non-blocking limitation if absent (FD-040-07) |
| Failed-payment customer history | Already deferred IMP-036C |
| Customer self-service cancel | VISION deferred |
| Full DPDP automated portal | Legal + IMP-038 follow-up |
| Actual GSTIN / registration facts + written adviser confirmation | FUTURE_LAUNCH_EVIDENCE_REQUIRED (FD-040-09) — not open PD decision |
| Exact launch calendar timestamp | Later Founder scheduling under FD-040-02 |

---

## 22. Dependencies

```text
HARD: IMP-036G COMPLETE_AND_ACCEPTED (sequence predecessor)
HARD: IMP-037 → IMP-040
HARD: IMP-038 → IMP-040
HARD: IMP-039 → IMP-040
HARD: Journey Gap Audit execution before GO
HARD: FD-040-09 written accountant/GST-adviser confirmation before GO for paid public orders
SOFT: communications pack drafting before GO
BOUNDARY: live Razorpay + apex DNS = IMP-040 (not IMP-039)
```

### Predecessor authority precision (CURRENT)

| Capability | CURRENT canonical authority | This PD may claim | This PD must NOT claim |
|---|---|---|---|
| IMP-037 | Canonical PRE-GATE draft exists at [`../IMP-037/product-definition.md`](../IMP-037/product-definition.md) | Hard dependency; PRE-GATE draft exists | Must not claim IMP-037 is COMPLETE_AND_ACCEPTED, implemented, ready, or Gate PASS |
| IMP-038 | No canonical Product Definition on CURRENT main | Hard dependency requirement | Must not claim IMP-038 is COMPLETE_AND_ACCEPTED, Gate PASS, or that hardening is PASS as a present fact |
| IMP-039 | No canonical Product Definition on CURRENT main | Hard dependency requirement; `prod.thebobabear.in` as Founder-approved **future IMP-039 planning input** | Must not claim IMP-039 is COMPLETE_AND_ACCEPTED or Gate PASS; must not claim production infrastructure currently exists or that `prod.thebobabear.in` is currently deployed |

Predecessor accepted status today: **NOT_ACCEPTED**. Do not convert non-canonical future-planning
lane artifacts into accepted STATE by implication.

---

## 23. Founder product decisions (resolved)

```text
TOTAL_DECISION_RECORD_ITEMS = 10
NEW_GENUINE_FOUNDER_DECISIONS = 9
RECONFIRMED_EXISTING_DECISIONS = 1 (FD-040-07)
UNRESOLVED_PRODUCT_DECISIONS = 0
```

Human approval provenance:

```text
DATE: 2026-09-18
AUTHORITY: Founder
CONFIRMATION: explicit "proceed" issued in direct response to the exact
              IMP-040 recommended-refinement approval package
```

| ID | Status | Binding summary |
|---|---|---|
| FD-040-01 | APPROVED_WITH_REFINEMENT | Apex cutover only after Founder GO + complete GO/NO-GO evidence; canonical `https://thebobabear.in`; www must not become a distinct application; Pages stops active publication; may retain Pages only as bounded emergency reference/cutback target; no dual active publication; **persistence does not mutate DNS** |
| FD-040-02 | APPROVED_WITH_REFINEMENT | Public cutover only during declared customer/outlet operating period with Founder available and required operating/workforce owner available; prefer lower-traffic period; a deputy may participate if explicitly named but is not mandatory; no launch date/time chosen by this PD; outside-policy cutover needs new Founder decision |
| FD-040-03 | APPROVED | NO-GO / ABORT classes; mandatory security, financial integrity, order integrity, data integrity, and required Golden Journey failures cannot be waived as known limitations; paid obligations already created must be preserved/reconciled if new checkout is paused; GO / NO-GO / ABORT remain human decisions |
| FD-040-04 | APPROVED | Normal app recovery = immutable image/digest rollback or forward corrective release; DB restore = disaster recovery ≠ normal application rollback; provider reversal and public traffic cutback are separate; Pages cutback means ordering unavailable unless another accepted ordering surface is explicitly proven; no destructive down-migration requirement |
| FD-040-05 | APPROVED_WITH_REFINEMENT | Proportionate V1 pack: internal/operator readiness before cutover; no customer launch announcement before GO; customer launch communication only after successful GO/cutover; visible support/contact path; degraded/outage communication when ordering materially impaired; corrective/post-issue communication where customers are affected; communications must accurately reflect the provider modes and known limitations actually active at launch; IMP-038 breach communication remains separate |
| FD-040-06 | APPROVED | Founder-approved limitation register required for non-blocking launch limitations; cannot waive mandatory Golden Journeys, security/authentication, financial integrity, order integrity, data integrity, or mandatory regulatory/tax launch prerequisites; no silent waiver |
| FD-040-07 | ALREADY_DECIDED / RECONFIRMED | Order Again shortcut is not a GTM/public-launch requirement; ordinary supported returning-customer new-order path remains mandatory; shortcut absence may be listed as non-blocking limitation; **not** a newly invented Founder decision |
| FD-040-08 | APPROVED_WITH_REFINEMENT | Razorpay live money-moving mode requires explicit Founder authorization in IMP-040 after required evidence; one accepted/tested Dehradun delivery operating mode must be selected and evidenced before GO; OTP/auth and Google Maps/Places require production-readiness verification, not invented “live-mode” semantics; WhatsApp production capability only when provider readiness verified, otherwise accepted `IN_APP` path when mandatory journeys remain truthful; **this document does not enable any provider** |
| FD-040-09 | APPROVED_POLICY / FUTURE_EVIDENCE_REQUIRED | **POLICY = APPROVED; ACTUAL_EVIDENCE = FUTURE_REQUIRED.** Paid public launch requires actual legal/tax identity and invoice/receipt behaviour to match the business's real registration position; written accountant/GST-adviser confirmation is a launch prerequisite. Never invent GST registration status, GSTIN, tax rate, legal-entity tax treatment, or registration-dependent invoice text. Missing evidence later blocks GO; it does **not** make this Product Definition decision unresolved |
| FD-040-10 | APPROVED_WITH_REFINEMENT | Elevated post-cutover observation minimum 72 hours spanning ≥2 customer operating periods; monitor auth, serviceability, checkout, payments/recovery, orders/duplicates, outlet flow, delivery where applicable, notification/fallback, operational health, reconciliation anomalies, and critical alerts; planned IMP-039 response expectation (≤30m during operating hours; outside hours before next operating period; V1 24×7 staffing not required) as dependency input only; leaving elevated observation requires explicit Founder launch-stable declaration |

```text
UNRESOLVED_PRODUCT_DECISIONS = 0
OPEN_FOUNDER_DECISIONS = 0
```

### FD-040-09 evidence incompleteness (explicit)

```text
POLICY = APPROVED
ACTUAL_EVIDENCE = FUTURE_REQUIRED
EVIDENCE_COMPLETE = NO
PRODUCT_DEFINITION_OPEN_DECISION = NO
```

---

## 24. Architecture Fit inputs

| Question | Classification |
|---|---|
| Pages → DO commercial launch topology | ALREADY_LOCKED_BY_EXISTING_ARCHITECTURE |
| Image rollback primary | ALREADY_LOCKED_BY_EXISTING_ARCHITECTURE |
| Exact-candidate fingerprint | ALREADY_LOCKED_BY_EXISTING_ARCHITECTURE |
| Canonical apex URL policy | FOUNDER_APPROVED_BOBA_POLICY (`https://thebobabear.in`) |
| www consistency (not separate app) | FOUNDER_APPROVED_BOBA_POLICY (mechanism = Fit) |
| Launch-window staffing policy | FOUNDER_APPROVED_BOBA_POLICY |
| NO-GO / ABORT / limitation register | FOUNDER_APPROVED_BOBA_POLICY |
| Elevated observation window | FOUNDER_APPROVED_BOBA_POLICY (≥72h / ≥2 periods) |
| Cutover tooling (manual DNS vs API) | FIT_CONFIRMATION_REQUIRED |
| DNS change mechanism / TTL / TLS issuance | FIT_CONFIRMATION_REQUIRED |
| www redirect-or-equivalent mechanism | FIT_CONFIRMATION_REQUIRED |
| Smoke-test execution point | FIT_CONFIRMATION_REQUIRED |
| Launch evidence persistence | FIT_CONFIRMATION_REQUIRED |
| Rollback / cutback automation boundary | FIT_CONFIRMATION_REQUIRED (policy locked; automation not) |
| New global traffic manager | NOT_APPLICABLE |

Do **not** invent implementation mechanisms in this Product Definition. Do **not** mutate DNS from
Fit alone without Founder GO.

```text
architectureFitExecution = NOT_PERFORMED
architectureFit = NOT_PERFORMED
architectureLocked = NO
```

---

## 25. Expected TEST-1 proof

- Journey Gap Audit report artifact (not a rewrite of GJ-1)
- Production smoke logs tied to digest under authorized provider modes
- Real-browser critical GJs on production candidate
- Negative: payment failure recovery; unauthorized outlet access denied
- Negative: dual Pages+DO publication after cutover forbidden
- Negative: agents cannot declare GO
- Preserve first failures
- Founder UAT / GO = Founder verdict only on exact candidate
- FD-040-09 written adviser confirmation present before paid public GO
- Elevated observation evidence pack + Founder launch-stable declaration

---

## 26. Founder UAT applicability

```text
FOUNDER_UAT_REQUIRED = YES
FOUNDER_UAT_STATUS = NOT_PERFORMED
```

This **is** the public launch verdict. Interactive. Exact candidate (path + `main` + HEAD + tree +
WORKING_TREE_FINGERPRINT + production image digest). Separate from IMP-039 pre-cutover operator UAT
(when that capability exists and is accepted).

---

## 27. Unresolved / decision required

| `UNRESOLVED_DECISION_REQUIRED` item | Material user/business impact | Decision owner / evidence needed | Affected stories / gate |
|---|---|---|---|
| NONE | Founder product decisions FD-040-01…10 are resolved as recorded above; `UNRESOLVED_PRODUCT_DECISIONS = 0` | N/A | Product Definition Gate may evaluate this candidate when authorized |

Technical / sequence risks that are **not** open Founder product decisions:

- Sequence not yet at IMP-040; IMP-036G still open; IMP-037 PRE-GATE only; IMP-038/039 not canonical
- Meta WhatsApp production onboarding external
- Actual GST registration facts + written adviser confirmation (future evidence under approved policy)
- Exact launch calendar timestamp (later under FD-040-02)

```text
UNRESOLVED_PRODUCT_DECISIONS = 0
```

---

## 28. Definition of Ready

| Story ID | Applicable fields complete / evidence | Open material decisions | Readiness / blocker |
|---|---|---|---|
| `US-IMP-040-001` | Complete in §§7–10 | NONE | READY for Product Definition Gate evaluation; NOT_READY_FOR_IMPLEMENTATION until Fit lock + auth + sequence |
| `US-IMP-040-002` | Complete in §§7–10 | NONE | Same |
| `US-IMP-040-003` | Complete in §§7–10 + §19 plan | NONE | Same; audit execution still NOT_PERFORMED |
| `US-IMP-040-004` | Complete in §§7–10 | NONE | Same |
| `US-IMP-040-005` | Complete in §§7–10 | NONE | Same |
| `US-IMP-040-006` | Complete in §§7–10 | NONE | Same; DNS mutation not authorized by this PD |
| `US-IMP-040-007` | Complete in §§7–10 | NONE | Same |
| `US-IMP-040-008` | Complete in §§7–10 | NONE | Same |
| `US-IMP-040-009` | Complete in §§7–10 | NONE | Same |
| `US-IMP-040-010` | Complete in §§7–10 | NONE | Same |

---

## 29. Product Definition Gate record

```text
PRODUCT_DEFINITION_GATE
Capability: IMP-040 — Launch Validation & Cutover
Product Definition Version: PD-IMP-040-DRAFT-1
Business Outcome: Public launch validation and cutover under human Founder GO (§3)
Primary Personas: Founder (R3) + PERSONA-PLATFORM-OPERATOR / PERSONA-WORKFORCE-OPERATOR / PERSONA-CUSTOMER
Journeys Defined: YES (9 desired-state journeys)
Story Map Complete: YES (10 stories)
Acceptance Slice Defined: YES
Acceptance Scenarios: 17
Business Rules: 10
Happy Paths Defined: YES
Alternate Paths Defined: YES
Error / Recovery Paths Defined: YES
Authorization Variants Defined: YES (human launch authority; no invented app RBAC)
Cross-Scope Scenarios Defined: YES (Pages vs DO; live vs sandbox modes)
Concurrency Considered: YES (§15)
Destructive Actions Defined: YES (abort / cutback / limitation register)
UX State Matrix Complete: YES (§12)
Accessibility Considered: YES (§17)
Golden Journeys Identified: YES (owns Journey Gap Audit of GJ-1; plan READY; execution NOT_PERFORMED)
Explicit Deferrals Recorded: YES (§20–21)
Unresolved Product Decisions: 0
Architecture Conflicts: NONE identified against ADR-002/007/011/012 / ARCH-R19 for product requirements
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
```

`NOT_PERFORMED` means no gate evaluation has occurred. This draft is a **gate-ready PRE-GATE
Product Definition candidate with Founder product decisions resolved**. It is **not** Gate PASS.

---

## 30. Current readiness status (PRE-GATE candidate)

```text
ANCHOR: COMPLETE
DISCOVER: COMPLETE
STORY_MAP: COMPLETE
STORIES: 10
ACCEPTANCE_SCENARIOS: 17
BUSINESS_RULES: 10
PRODUCT_DECISIONS: 10
NEW_GENUINE_FOUNDER_DECISIONS: 9
RECONFIRMED_EXISTING_DECISIONS: 1
UNRESOLVED_PRODUCT_DECISIONS: 0

PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
ARCHITECTURE_FIT: NOT_PERFORMED
ARCHITECTURE_LOCKED: NO
IMP040_ACTIVATED: NO
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO
IMP040_ACCEPTED: NO
JOURNEY_GAP_AUDIT_REQUIRED: YES
JOURNEY_GAP_AUDIT_PLAN: READY
JOURNEY_GAP_AUDIT_EXECUTION: NOT_PERFORMED
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_STATUS: NOT_PERFORMED
GO_DECLARED: NO
PUBLIC_LAUNCH_APPROVED: NO
DNS_MUTATION_AUTHORIZED: NO

PRODUCT_DEFINITION_GATE_READY:
gate-ready PRE-GATE Product Definition candidate
with Founder product decisions resolved
```

IMP-040 remains pre-gate and unactivated. `currentProductSlice` remains IMP-036G.
`nextProductSlice` remains IMP-037. ROADMAP/STATE are unchanged by this persistence.

```text
PROMPT DEVIATIONS: NONE
ROADMAP_CHANGED: NO
STATE_CHANGED: NO
ACTIVATED: NO
IMPLEMENTATION_AUTHORIZED: NO
PRODUCT_DEFINITION_GATE: NOT_PERFORMED
ARCHITECTURE_FIT: NOT_PERFORMED
JOURNEY_GAP_AUDIT_EXECUTION: NOT_PERFORMED
GO_DECLARED: NO
PUBLIC_LAUNCH_APPROVED: NO
DNS_MUTATION_AUTHORIZED: NO
```
