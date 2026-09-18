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

Lifecycle truth remains ROADMAP/STATE only (`GTM-R130` / `STATE-R128`):
`acceptedThrough = IMP-036G`; `currentProductSlice = NONE`
(`COMPLETE_AND_ACCEPTED`; `IMP036G_IMPLEMENTATION_COMPLETE = YES`; `IMP036G_ACCEPTED = YES`);
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
| Canonical anchors | VISION-1; ROADMAP GTM-R130; STATE STATE-R128; ARCH-R19; DR-15; PD-1; TEST-1; PERSONA-1; GJ-1 |
| Repository candidate | Canonical path `/home/ajoshi/repos/boba-bear-platform`; base `origin/main` `c35c9eab6a30ec6ce745cefd75c523181326f360` / tree `266fe3b07811f6942e76cac155d58ba07daabe56`; draft branch `governance/imp040-pre-gate-product-definition` |
| Capability lifecycle / authorization | ROADMAP/STATE: IMP-040 remains **PLANNED / NOT_ACTIVATED / NOT_AUTHORIZED / NOT_STARTED**; **IMP040_ACTIVATED: NO**; Product Definition Gate NOT_PERFORMED; Architecture Fit NOT_PERFORMED; architecture NOT_LOCKED; implementation NOT_AUTHORIZED / NOT_STARTED; IMP040_ACCEPTED: NO; GO_DECLARED: NO; PUBLIC_LAUNCH_APPROVED: NO. **currentProductSlice remains NONE (acceptedThrough IMP-036G).** |
| Relevant capability architecture / ADRs | ADR-002 (Pages transition, rollback, incident); ADR-007 (tax/GST commercial gate); ADR-011 delivery; ADR-012 notifications; IMP-037/038/039 hard prerequisites (future accepted status required before GO — not claimed accepted by this draft); GJ-1 |
| Founder UAT applicability | `FOUNDER_UAT_REQUIRED = YES`; `FOUNDER_UAT_STATUS = NOT_PERFORMED` — interactive exact-candidate UAT gate (separate from production GO / NO-GO / ABORT and from launch-stable; see §12.1 / §26) |

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
| `docs/platform/STATE.md` STATE-R128 | acceptedThrough IMP-036G; currentProductSlice NONE | VERIFIED |
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

Observable success: exact-candidate Founder UAT (separate gate), then `GO_NO_GO_EVIDENCE_COMPLETE`
with Journey Gap Audit dispositions, production smoke under authorized provider modes, tax/GST
evidence readiness, cutover record, elevated observation plan — then Founder may say GO / NO-GO /
ABORT, and later launch-stable after observation. Agents never self-declare UAT PASS, GO, or
launch-stable.

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

IMP-040 also depends on (does not collapse into GO):
  Founder UAT on the exact accepted technical candidate in authorized UAT/staging
  (FOUNDER_UAT_REQUIRED = YES; separate human gate from production GO)

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
| Founder | **Human authority (R3)** — Founder UAT verdict; production GO / NO-GO / ABORT; launch-stable (separate decisions); not a PERSONA-1 ID and not an application RBAC role | AGENTS.md; FD-040-01…10 |
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
| US-IMP-040-010 Founder verdict / sign-off record (human; agent prepares pack only) | V1 |

### US-IMP-040-001 — Launch candidate identity

```text
Story ID: US-IMP-040-001
Title: Launch candidate identity

As a PERSONA-PLATFORM-OPERATOR
I want one exact production launch candidate identity recorded and reused by all downstream evidence
so that Founder UAT, production smoke, GO evidence, and cutover refer to the same proven artifact.

Journey / activity: JOURNEY-040-CANDIDATE-IDENTITY
Preconditions: An authorized production candidate selection activity has begun; repository and build tooling are available; no DNS mutation or live provider enablement is implied by recording identity alone.
Trigger / action: Operator assembles and records the launch-candidate evidence pack for the selected candidate.
Observable success: One candidate record lists canonical repository path, branch/ref, HEAD SHA, tree SHA, working-tree/governance fingerprint as applicable, production OCI image digest, environment label, and timestamp; later smoke/UAT/GO artifacts cite the same identity.
Applicable alternate paths: Re-selection after a newer accepted build replaces the prior candidate (prior pack marked STALE_CANDIDATE).
Applicable failure / recovery paths: Missing digest/SHA/fingerprint → VALIDATION_FAILURE / evidence incomplete; mismatched identity across packs → STALE_CANDIDATE / stop; regenerate identity pack.
Human authority boundary: Operators record identity; Founder does not need to invent SHAs; agents must not invent digests.
Permission / resource scope: Human operating authority + infrastructure/operator access as later Fit locks; no new application RBAC role.
Data implications: Evidence pack stores provenance metadata only (no secrets, no production customer payload dumps required for identity alone).
Security/privacy implications: Digests and SHAs are non-secret; forbid embedding credentials in the identity pack (BR-IMP-040-010).
Dependencies: Future accepted IMP-039 production image/build evidence; canonical repository authority.
Non-goals / explicit exclusions: Declaring GO; mutating DNS; enabling live Razorpay; substituting a dirty worktree as production candidate.
Architecture Fit questions / N/A: Where/how identity packs are stored (artifact path vs tooling) — Fit; product requires durable exact-candidate fields.
Linked acceptance scenarios: AC-IMP-040-001-01
Linked business rules: BR-IMP-040-001, BR-IMP-040-010
Golden Journey linkage / N/A: N/A — identity is a launch-process precondition for GJ production proof, not a GJ row itself.
Founder decision linkage: Supports FD-040-03/08/10 evidence discipline; exact-candidate rule in AGENTS.md Founder UAT gate.
Open material decisions: NONE
Readiness for Product Definition Gate evaluation: READY_FOR_PRODUCT_DEFINITION_GATE_EVALUATION
NOT_READY_FOR_IMPLEMENTATION until Product Definition Gate PASS + Architecture Fit/lock + IMP-040 activation/authorization + sequence prerequisites.
```

### US-IMP-040-002 — Prerequisite acceptance evidence

```text
Story ID: US-IMP-040-002
Title: Prerequisite acceptance evidence

As a PERSONA-PLATFORM-OPERATOR
I want launch evaluation to prove IMP-036G and IMP-037/038/039 are COMPLETE_AND_ACCEPTED with applicable readiness evidence
so that GO cannot proceed on incomplete predecessors.

Journey / activity: JOURNEY-040-PREREQUISITE-GATES
Preconditions: Launch evaluation has begun; ROADMAP/STATE are readable as acceptance authority.
Trigger / action: Operator reviews prerequisite acceptance and readiness evidence against CURRENT ROADMAP/STATE and owning-IMP readiness artifacts.
Observable success: Evidence shows IMP-036G, IMP-037, IMP-038, and IMP-039 each COMPLETE_AND_ACCEPTED plus each capability's applicable readiness evidence required for launch.
Applicable alternate paths: Partial readiness documentation may be attached as DEPENDENCY_UNREADY detail without inventing acceptance.
Applicable failure / recovery paths: Missing/incomplete prerequisite → GO evidence incomplete / NO-GO class (FD-040-03); do not invent acceptance; wait for owning IMP acceptance/reconciliation.
Human authority boundary: Acceptance status is owned by ROADMAP/STATE reconciliation (human R3); operators assemble evidence only.
Permission / resource scope: Read access to canonical docs and readiness artifacts; no new app RBAC.
Data implications: Evidence cites canonical acceptance records; does not rewrite history (BR-IMP-040-003).
Security/privacy implications: No secret leakage in prerequisite packs.
Dependencies: HARD — IMP-037 → IMP-040; IMP-038 → IMP-040; IMP-039 → IMP-040; IMP-036G acceptance before launch evaluation can succeed.
Non-goals / explicit exclusions: Claiming IMP-037/038/039 accepted from this PRE-GATE draft; activating IMP-040 early.
Architecture Fit questions / N/A: N/A for product requirement — acceptance authority remains ROADMAP/STATE.
Linked acceptance scenarios: AC-IMP-040-002-01
Linked business rules: BR-IMP-040-001, BR-IMP-040-003, BR-IMP-040-004
Golden Journey linkage / N/A: N/A — predecessor gate, not a GJ row.
Founder decision linkage: FD-040-03 (mandatory integrity classes cannot be waived); FD-040-09 readiness as future evidence input.
Open material decisions: NONE
Readiness for Product Definition Gate evaluation: READY_FOR_PRODUCT_DEFINITION_GATE_EVALUATION
NOT_READY_FOR_IMPLEMENTATION until Gate PASS + Fit/lock + authorization + sequence.
```

### US-IMP-040-003 — Journey Gap Audit execution

```text
Story ID: US-IMP-040-003
Title: Journey Gap Audit execution

As a PERSONA-PLATFORM-OPERATOR
I want to execute the Journey Gap Audit against GJ-1 with explicit dispositions
so that public GTM / IMP-040 acceptance is not claimed without journey completeness evidence.

Journey / activity: JOURNEY-040-GAP-AUDIT
Preconditions: Exact launch candidate identity recorded (US-IMP-040-001); audit plan in §19; JOURNEY_GAP_AUDIT_EXECUTION currently NOT_PERFORMED at Product Definition time.
Trigger / action: Authorized operator enumerates every GJ-1 journey (and required additional launch paths in §19), runs the audit action per row, and records dispositions + evidence.
Observable success: Durable audit artifact lists every required row with disposition, evidence location, candidate identity, and launch consequence; historical acceptance statuses unchanged.
Applicable alternate paths: Non-blocking limitation rows may use Founder limitation register (FD-040-06) when permitted; Order Again shortcut absence may be non-blocking (FD-040-07).
Applicable failure / recovery paths: Undisposed row → evidence incomplete; mandatory happy-path/security/financial/order/data/tax gap → LAUNCH_BLOCKER (cannot silent-waive); preserve first failures (TEST-1).
Human authority boundary: Operators execute audit and propose dispositions; Founder approves limitation register entries; agents must not rewrite accepted IMP status.
Permission / resource scope: Operator tooling/runbook + evidence archive; no new app RBAC; production fixture access permission-scoped.
Data implications: Audit artifact is durable evidence; not a rewrite of GJ-1 registry status as PASS from planning.
Security/privacy implications: Controlled fixtures; no uncontrolled live financial activity until FD-040-08 authorizes (BR-IMP-040-008).
Dependencies: Candidate identity; prerequisite readiness for GO-bound audit; GJ-1 registry as enumeration source.
Non-goals / explicit exclusions: Performing the audit in this Product Definition; inventing new Golden Journeys; reopening accepted IMPs.
Architecture Fit questions / N/A: Evidence store/path and tooling shape — Fit; product requires durable per-row fields in §19.
Linked acceptance scenarios: AC-IMP-040-003-01, AC-IMP-040-003-02
Linked business rules: BR-IMP-040-003, BR-IMP-040-004, BR-IMP-040-006, BR-IMP-040-007
Golden Journey linkage / N/A: Owns audit of all GJ-1 rows; execution NOT_PERFORMED now.
Founder decision linkage: FD-040-06, FD-040-07; PD-1 Journey Gap Audit requirement.
Open material decisions: NONE
Readiness for Product Definition Gate evaluation: READY_FOR_PRODUCT_DEFINITION_GATE_EVALUATION
NOT_READY_FOR_IMPLEMENTATION until Gate PASS + Fit/lock + authorization + sequence; audit execution remains separately authorized later.
```

### US-IMP-040-004 — Critical Golden Journey production validation

```text
Story ID: US-IMP-040-004
Title: Critical Golden Journey production validation

As a PERSONA-PLATFORM-OPERATOR (with PERSONA-CUSTOMER / PERSONA-WORKFORCE-OPERATOR fixture participants)
I want critical Golden Journeys proven on the exact production candidate under authorized provider modes
so that GO cannot ignore broken first-order, payment-recovery, or permitted-outlet paths.

Journey / activity: JOURNEY-040-LIVE-SMOKE (critical subset)
Preconditions: Exact candidate identity; authorized provider modes per FD-040-08; sellable menu/outlet fixtures; IMP predecessors accepted when GO-bound; FOUNDER_UAT and GO remain separate later gates.
Trigger / action: Execute GJ-FIRST-ORDER, GJ-PAYMENT-RECOVERY (negative/recovery path), and GJ-PERMITTED-OUTLET-ACCESS (workforce) against the production candidate environment authorized for smoke.
Observable success: Each named journey meets GJ-1 observable outcomes under the authorized modes; evidence bound to candidate digest/SHA; browser payment UI alone is not Payment truth (BR-IMP-040-005).
Applicable alternate paths: Returning-customer new-order path remains mandatory where exercised under broader audit; Order Again shortcut not required (FD-040-07).
Applicable failure / recovery paths: Journey fail → LAUNCH_BLOCKER or ABORT class per FD-040-03; preserve first failure; no silent retry-as-pass (TEST-1).
Human authority boundary: Operators run smoke; Founder decides GO/ABORT later; agents cannot declare journeys PASS for launch acceptance without recorded evidence.
Permission / resource scope: Controlled customer/workforce fixtures; production data access permission-scoped.
Data implications: May create controlled orders/payments under authorized modes; paid obligations remain real if live mode authorized.
Security/privacy implications: BR-IMP-040-008 — no uncontrolled real financial activity until Razorpay live mode Founder-authorized; deny unauthorized outlet access must hold.
Dependencies: US-IMP-040-001/002/005; GJ-1 definitions; FD-040-08 mode authorization.
Non-goals / explicit exclusions: Inventing new Golden Journeys; treating Order Again shortcut as mandatory; substituting staging UAT for production smoke (UAT is separate).
Architecture Fit questions / N/A: Exact smoke harness/runbook — Fit; product requires the three named GJ proofs.
Linked acceptance scenarios: AC-IMP-040-004-01, AC-IMP-040-004-02, AC-IMP-040-004-03
Linked business rules: BR-IMP-040-004, BR-IMP-040-005, BR-IMP-040-008
Golden Journey linkage / N/A: GJ-FIRST-ORDER; GJ-PAYMENT-RECOVERY; GJ-PERMITTED-OUTLET-ACCESS (mandatory for this story).
Founder decision linkage: FD-040-03, FD-040-07, FD-040-08.
Open material decisions: NONE
Readiness for Product Definition Gate evaluation: READY_FOR_PRODUCT_DEFINITION_GATE_EVALUATION
NOT_READY_FOR_IMPLEMENTATION until Gate PASS + Fit/lock + authorization + sequence.
```

### US-IMP-040-005 — Production configuration + live provider mode validation

```text
Story ID: US-IMP-040-005
Title: Production configuration + live provider mode validation

As a PERSONA-PLATFORM-OPERATOR
I want payment/delivery/notification modes, backup/recovery readiness, and IMP-038 hardening evidence checked against Founder authorization
so that launch evidence cannot claim live readiness the environment does not have.

Journey / activity: JOURNEY-040-LIVE-SMOKE / provider-readiness record
Preconditions: Exact candidate; FD-040-08 policy known; IMP-037/038 readiness artifacts exist when those IMPs are accepted (not claimed by this draft).
Trigger / action: Operator validates configured provider modes and readiness records against the Founder-authorized mode set and prerequisite hardening/backup evidence.
Observable success: Recorded modes match authorization; backup/restore-readiness from IMP-037 is READY; IMP-038 hardening evidence is PASS; mismatches are explicit failures.
Applicable alternate paths: WhatsApp may be IN_APP-only when authorized and disclosed (FD-040-08); OTP/Maps require production-readiness verification without inventing “live-mode” semantics.
Applicable failure / recovery paths: Mode mismatch vs marketing/authorization → LAUNCH_BLOCKER / NO-GO; missing READY/PASS → DEPENDENCY_UNREADY; do not enable providers from this Product Definition.
Human authority boundary: Founder authorizes live money-moving Razorpay and mode set (FD-040-08); operators verify; agents must not flip provider modes.
Permission / resource scope: Infrastructure/config read + evidence packs; no new app RBAC.
Data implications: Mode record becomes GO input; FD-040-09 tax evidence remains future written confirmation, not invented GST facts.
Security/privacy implications: Live keys only after Founder authorization; IMP-038 headers/CSP must not be disabled by cutover planning.
Dependencies: HARD IMP-037/038/039; FD-040-08; FD-040-09 future evidence.
Non-goals / explicit exclusions: Enabling live Razorpay now; inventing GSTIN/rates; claiming IMP-038/039 currently accepted.
Architecture Fit questions / N/A: Exact config inspection tooling — Fit; product requires observable mode/readiness mismatch behavior.
Linked acceptance scenarios: AC-IMP-040-005-01, AC-IMP-040-005-02, AC-IMP-040-005-03
Linked business rules: BR-IMP-040-008, BR-IMP-040-004
Golden Journey linkage / N/A: Supports truthful GJ execution under authorized modes; not itself a GJ ID.
Founder decision linkage: FD-040-08, FD-040-09 (policy vs future evidence).
Open material decisions: NONE
Readiness for Product Definition Gate evaluation: READY_FOR_PRODUCT_DEFINITION_GATE_EVALUATION
NOT_READY_FOR_IMPLEMENTATION until Gate PASS + Fit/lock + authorization + sequence.
```

### US-IMP-040-006 — Domain / DNS / TLS cutover

```text
Story ID: US-IMP-040-006
Title: Domain / DNS / TLS cutover

As a PERSONA-PLATFORM-OPERATOR
I want an authorized apex cutover to DigitalOcean production with valid TLS and no dual active publication
so that https://thebobabear.in becomes the canonical public ordering surface only after Founder GO.

Journey / activity: JOURNEY-040-CUTOVER
Preconditions: Founder GO exists; separate cutover authorization exists; exact candidate; prerequisite/audit/smoke/provider evidence complete as required by GO pack; FD-040-02 operating-window constraints satisfied when executing.
Trigger / action: After GO + cutover authorization, operator executes apex DNS/TLS cutover to DO and retires GitHub Pages as an independent active production publication source.
Observable success: https://thebobabear.in is canonical apex on DO; www behavior consistent (not a distinct application); TLS valid; Pages not dual-publishing; no dual active production.
Applicable alternate paths: Pages may remain only as bounded emergency reference/cutback target (FD-040-01), not as concurrent active production.
Applicable failure / recovery paths: Split-brain Pages+DO → launch defect / cutback path (US-IMP-040-008); TLS failure → stop cutover; unauthorized DNS mutation forbidden.
Human authority boundary: Founder GO and cutover authorization required first; operators execute; this Product Definition does not authorize DNS mutation now (DNS_MUTATION_AUTHORIZED: NO).
Permission / resource scope: DNS/TLS operator authority under infrastructure process; no new app RBAC.
Data implications: Public traffic shifts to DO host; payment webhooks must target live host after DNS (concurrency §15).
Security/privacy implications: TLS required; do not weaken IMP-038 controls; BR-IMP-040-009.
Dependencies: US-IMP-040-007/010 GO; ADR-002; FD-040-01/02.
Non-goals / explicit exclusions: Mutating DNS from this PRE-GATE draft; dual publication; inventing a second www app.
Architecture Fit questions / N/A: Exact DNS/TLS runbook steps — Fit; product requires canonical apex + no dual publication outcomes.
Linked acceptance scenarios: AC-IMP-040-006-01, AC-IMP-040-006-02
Linked business rules: BR-IMP-040-009, BR-IMP-040-001
Golden Journey linkage / N/A: Cutover enables public GJ continuity; not a GJ ID.
Founder decision linkage: FD-040-01, FD-040-02.
Open material decisions: NONE
Readiness for Product Definition Gate evaluation: READY_FOR_PRODUCT_DEFINITION_GATE_EVALUATION
NOT_READY_FOR_IMPLEMENTATION until Gate PASS + Fit/lock + authorization + sequence; DNS remains unauthorized now.
```

### US-IMP-040-007 — GO / NO-GO evidence assembly

```text
Story ID: US-IMP-040-007
Title: GO / NO-GO evidence assembly

As a PERSONA-PLATFORM-OPERATOR
I want a complete GO/NO-GO evidence pack that can reach GO_NO_GO_EVIDENCE_COMPLETE while GO_DECLARED remains NO
so that Founder decision is not confused with agent evidence assembly.

Journey / activity: JOURNEY-040-GO-NO-GO
Preconditions: Candidate identity; prerequisite pack; Journey Gap Audit artifact (when executed); production smoke; provider-mode readiness; FD-040-09 written adviser confirmation before paid public GO; limitation register where applicable; operating-owner availability evidence per FD-040-02.
Trigger / action: Operator assembles the evidence pack and marks completeness status without declaring GO.
Observable success: Pack can be GO_NO_GO_EVIDENCE_COMPLETE with GO_DECLARED = NO until Founder decides; missing mandatory inputs keep pack incomplete.
Applicable alternate paths: NO-GO recommendation packaging when blockers exist; ABORT packaging after GO if needed remains US-IMP-040-008/010.
Applicable failure / recovery paths: Incomplete mandatory evidence → cannot claim COMPLETE; agents must not auto-declare GO (BR-IMP-040-002).
Human authority boundary: Agents/operators assemble; only Founder issues GO / NO-GO / ABORT (US-IMP-040-010).
Permission / resource scope: Evidence archive write; no new app RBAC; no “Launch Approver” application role.
Data implications: Pack references prior artifacts by candidate identity; preserves first failures.
Security/privacy implications: No secrets in pack; accurate mode/limitation disclosure (FD-040-05).
Dependencies: US-IMP-040-001…005; FD-040-03/06/09; Journey Gap Audit when required for GO.
Non-goals / explicit exclusions: Declaring GO from completeness alone; substituting Founder UAT PASS for GO.
Architecture Fit questions / N/A: Pack format/store — Fit; product requires COMPLETE ≠ GO semantics.
Linked acceptance scenarios: AC-IMP-040-007-01
Linked business rules: BR-IMP-040-001, BR-IMP-040-002
Golden Journey linkage / N/A: Pack includes GJ evidence by reference.
Founder decision linkage: FD-040-03; separates from Founder UAT (AGENTS.md).
Open material decisions: NONE
Readiness for Product Definition Gate evaluation: READY_FOR_PRODUCT_DEFINITION_GATE_EVALUATION
NOT_READY_FOR_IMPLEMENTATION until Gate PASS + Fit/lock + authorization + sequence.
```

### US-IMP-040-008 — Abort / rollback / cutback execution

```text
Story ID: US-IMP-040-008
Title: Abort / rollback / cutback execution

As a PERSONA-PLATFORM-OPERATOR
I want human-authorized abort, image rollback/forward-fix, and emergency Pages cutback procedures with paid-order preservation
so that launch failures do not destroy paid obligations or rely on routine DB restore.

Journey / activity: JOURNEY-040-ABORT-ROLLBACK (+ JOURNEY-040-COMMS when ordering impaired)
Preconditions: Launch/cutover process underway or live; Founder/human abort authority available; prior known-good image digest identifiable when rolling back.
Trigger / action: On abort/rollback/cutback trigger, human authorizes and operator executes the selected recovery action per FD-040-03/04.
Observable success: New checkout pauses when abort requires it; paid orders preserved and reconciled; primary app recovery is prior image digest or forward corrective release; DB restore excluded from normal rollback; customer communication issued when ordering materially impaired (FD-040-05).
Applicable alternate paths: Provider-mode reversal separate from image rollback; Pages emergency cutback may leave ordering unavailable unless another accepted ordering surface is explicitly proven (FD-040-04).
Applicable failure / recovery paths: Ambiguous target/digest → CONFIRMATION_REQUIRED / BLOCKED; failed rollback → escalate; do not treat DB restore as routine rollback.
Human authority boundary: Abort/cutback are human decisions (Founder or explicitly named operating authority under policy); agents prepare and execute only when authorized.
Permission / resource scope: Deployment/DNS operator authority; no new app RBAC.
Data implications: Paid obligations retained; no destructive down-migration requirement (FD-040-04).
Security/privacy implications: Preserve financial/order integrity; communications must match actual mode/state.
Dependencies: FD-040-03/04/05; ADR-002; candidate/image provenance from US-IMP-040-001.
Non-goals / explicit exclusions: Routine DB restore as app rollback; silent waiver of integrity failures.
Architecture Fit questions / N/A: Exact pause-checkout / rollback tooling — Fit; product requires outcomes above.
Linked acceptance scenarios: AC-IMP-040-008-01, AC-IMP-040-008-02
Linked business rules: BR-IMP-040-001, BR-IMP-040-004
Golden Journey linkage / N/A: Protects order/payment integrity underlying GJs.
Founder decision linkage: FD-040-03, FD-040-04, FD-040-05.
Open material decisions: NONE
Readiness for Product Definition Gate evaluation: READY_FOR_PRODUCT_DEFINITION_GATE_EVALUATION
NOT_READY_FOR_IMPLEMENTATION until Gate PASS + Fit/lock + authorization + sequence.
```

### US-IMP-040-009 — Post-cutover elevated observation

```text
Story ID: US-IMP-040-009
Title: Post-cutover elevated observation

As a PERSONA-PLATFORM-OPERATOR
I want elevated post-cutover observation for at least 72 hours spanning at least two customer operating periods with an approved monitor list
so that launch-stable is earned from evidence, not assumed at cutover.

Journey / activity: JOURNEY-040-OBSERVE
Preconditions: Successful authorized cutover; monitor list per FD-040-10; operating owners available per policy.
Trigger / action: Operator runs elevated observation, records monitors/alerts/material blockers, and preserves evidence without auto-declaring launch-stable.
Observable success: Observation covers ≥72h and ≥2 customer operating periods; approved monitors and critical alerts handled; material blockers escalated; launch-stable remains Founder-only and NOT automatic.
Applicable alternate paths: Outside-hours critical alert response before next operating period (planned IMP-039 expectation as dependency input; not claimed accepted runtime by this draft).
Applicable failure / recovery paths: Material blocker → pause/corrective/cutback paths; incomplete window → cannot claim observation complete.
Human authority boundary: Operators observe and escalate; Founder issues launch-stable later (US-IMP-040-010); V1 does not require 24×7 staffing (FD-040-10).
Permission / resource scope: Ops/monitoring access; no new app RBAC.
Data implications: Observation pack bound to post-cutover candidate/environment.
Security/privacy implications: Alert handling must not disable hardening; breach comms remain separate (FD-040-05 / IMP-038).
Dependencies: US-IMP-040-006 cutover success; FD-040-10; planned IMP-039 alert expectations as inputs.
Non-goals / explicit exclusions: Auto launch-stable; 24×7 staffing requirement.
Architecture Fit questions / N/A: Dashboard vs evidence-pack tooling — Fit; product requires duration/period/monitor outcomes.
Linked acceptance scenarios: AC-IMP-040-009-01
Linked business rules: BR-IMP-040-001, BR-IMP-040-002
Golden Journey linkage / N/A: Continues watching GJ-critical signals in production.
Founder decision linkage: FD-040-10.
Open material decisions: NONE
Readiness for Product Definition Gate evaluation: READY_FOR_PRODUCT_DEFINITION_GATE_EVALUATION
NOT_READY_FOR_IMPLEMENTATION until Gate PASS + Fit/lock + authorization + sequence.
```

### US-IMP-040-010 — Founder verdict / sign-off record

```text
Story ID: US-IMP-040-010
Title: Founder verdict / sign-off record

As the Founder (human R3 authority; not an application RBAC role)
I want separate recorded verdicts for Founder UAT, production GO / NO-GO / ABORT, and post-observation launch-stable
so that interactive UAT, public-launch operating decision, and launch-stable declaration cannot substitute for each other.

Journey / activity: JOURNEY-040-GO-NO-GO / Founder UAT gate / JOURNEY-040-OBSERVE closeout
Preconditions: Agents/operators have prepared the applicable evidence pack for the lifecycle point being decided; exact candidate provenance present.
Trigger / action: Founder records one of the distinct human verdicts at the applicable lifecycle point.
Observable success: Separate records exist (as applicable over time) for:
  (1) Founder UAT PASS | DEFECTS (or equivalent canonical vocabulary) on authorized UAT/staging exact candidate
  (2) Founder production GO | NO-GO | ABORT on GO evidence pack
  (3) Founder launch-stable after elevated observation
Agents may prepare packs but cannot issue those verdicts.
Applicable alternate paths: NO-GO or ABORT with preserved paid obligations; UAT DEFECTS returns candidate through validation before relaunch path.
Applicable failure / recovery paths: Missing evidence → Founder must not be forced into false GO; agent-declared GO is invalid (BR-IMP-040-002).
Human authority boundary: Founder only for these three verdict classes; deputy participation rules per FD-040-02 do not create an app “Launch Approver” role.
Permission / resource scope: Human operating authority ≠ RBAC; no PERSONA/role invention named Launch Approver / Release Approver.
Data implications: Verdict records cite candidate identity and evidence pack IDs/timestamps.
Security/privacy implications: Verdict authenticity is human-attested process evidence.
Dependencies: US-IMP-040-001…009 artifacts at the relevant stage; AGENTS.md Founder UAT exact-candidate gate; FD-040-03/10.
Non-goals / explicit exclusions: Collapsing UAT into GO; agent self-declaration of FOUNDER_UAT=PASS / GO / launch-stable; executing any of these verdicts in this PRE-GATE draft.
Architecture Fit questions / N/A: Verdict record format — Fit; product requires three distinct decision classes.
Linked acceptance scenarios: AC-IMP-040-010-01
Linked business rules: BR-IMP-040-002, BR-IMP-040-010
Golden Journey linkage / N/A: Human gate over launch evidence including GJs.
Founder decision linkage: FD-040-03, FD-040-10; AGENTS.md Founder UAT vs production GO separation.
Open material decisions: NONE
Readiness for Product Definition Gate evaluation: READY_FOR_PRODUCT_DEFINITION_GATE_EVALUATION
NOT_READY_FOR_IMPLEMENTATION until Gate PASS + Fit/lock + authorization + sequence.
Current human-gate statuses (not executed by this draft):
  FOUNDER_UAT_REQUIRED = YES
  FOUNDER_UAT_STATUS = NOT_PERFORMED
  GO_DECLARED = NO
  launch-stable = NOT_DECLARED
```

---

## 8. Proposed V1 acceptance slice

**Evidence + human cutover process**, not new customer features. Fixes only as surfaced by
audit/smoke, without silently opening new IMPs. New product behaviour found by audit is classified
via FD-040-06 register, not implemented opportunistically.

Order Again shortcut is **not** in V1 launch scope (FD-040-07). Returning new-order happy path
remains mandatory.

---

## 9. Acceptance scenarios

Count preserved: **17**. IDs preserved. Each scenario is independently verifiable under PD-1 / TEST-1.

### AC-IMP-040-001-01 — Candidate identity recorded and reused

```text
Story: US-IMP-040-001
Linked BR(s): BR-IMP-040-001, BR-IMP-040-010
Linked FD(s): (supports FD-040-03/08/10 evidence discipline)
Evidence expectation: Durable candidate identity pack + cross-references from smoke/UAT/GO artifacts

Given one exact production candidate has been selected
When launch evidence is assembled
Then the candidate record includes repository/canonical path, branch/ref, HEAD SHA, tree SHA,
     working-tree/governance fingerprint as applicable, production OCI image digest, environment,
     and timestamp
And all downstream smoke / Founder UAT / GO evidence refers to that same candidate identity
Forbidden effect / safety constraint: A different SHA/digest must not be silently substituted;
     missing required identity fields → VALIDATION_FAILURE / evidence incomplete (not GO-ready)
```

### AC-IMP-040-002-01 — Prerequisite acceptance evidence

```text
Story: US-IMP-040-002
Linked BR(s): BR-IMP-040-001, BR-IMP-040-003, BR-IMP-040-004
Linked FD(s): FD-040-03
Evidence expectation: Citations to ROADMAP/STATE acceptance + owning-IMP readiness artifacts

Given launch evaluation begins
When prerequisite acceptance evidence is reviewed
Then evidence shows IMP-036G COMPLETE_AND_ACCEPTED, IMP-037 COMPLETE_AND_ACCEPTED,
     IMP-038 COMPLETE_AND_ACCEPTED, and IMP-039 COMPLETE_AND_ACCEPTED
And each capability's applicable readiness evidence required for launch is present
Forbidden effect / safety constraint: Missing prerequisite or readiness → GO evidence incomplete /
     NO-GO class; do not invent acceptance; do not rewrite historical acceptance status
```

### AC-IMP-040-003-01 — Journey Gap Audit enumerates GJ-1 with dispositions

```text
Story: US-IMP-040-003
Linked BR(s): BR-IMP-040-004
Linked FD(s): FD-040-06, FD-040-07
Evidence expectation: Journey Gap Audit artifact with one row per required journey/path

Given the GJ-1 registry is the enumeration source (CURRENT_GOLDEN_JOURNEY_COUNT = 10) plus
     additional launch paths required by §19
And an exact launch candidate identity is recorded
When the Journey Gap Audit action is executed
Then every required row receives an allowed disposition
     (LAUNCH_BLOCKER | AUTHORIZED_FOLLOW_UP_REQUIRED |
      ACCEPTED_KNOWN_LIMITATION_REQUIRING_FOUNDER_DECISION / Founder limitation register as applicable)
And the observable audit artifact records journey ID, candidate identity, environment, outcome,
     evidence location, and launch consequence
Forbidden effect / safety constraint: Undisposed mandatory row → evidence incomplete;
     mandatory security/financial/order/data/tax/GJ happy-path gaps cannot be silently waived
```

### AC-IMP-040-003-02 — Audit does not rewrite historical acceptance

```text
Story: US-IMP-040-003
Linked BR(s): BR-IMP-040-003
Linked FD(s): (PD-1 historical acceptance rule)
Evidence expectation: Audit artifact + unchanged ROADMAP/STATE acceptance claims for prior IMPs

Given previously accepted IMPs and GJ-1 registry statuses exist
When the Journey Gap Audit completes (including finding gaps)
Then historical IMP acceptance status is unchanged by the audit
And planning/audit notes do not mark GJ rows PASS solely from this Product Definition
Forbidden effect / safety constraint: Forbidden rewriting of historical acceptance;
     audit findings classify launch consequence without reopening accepted slices
```

### AC-IMP-040-004-01 — GJ-FIRST-ORDER on production candidate

```text
Story: US-IMP-040-004
Linked BR(s): BR-IMP-040-004, BR-IMP-040-005, BR-IMP-040-008
Linked FD(s): FD-040-08
Evidence expectation: Real-browser / production-smoke evidence bound to candidate digest; Payment/Order truth IDs

Given the exact production candidate is deployed to the authorized smoke environment
And provider modes match Founder authorization (including payment mode)
And sellable menu/outlet/customer fixtures are available
When GJ-FIRST-ORDER is executed (discover/configure → cart → auth/address/serviceability → pay → Order)
Then the journey succeeds with authoritative Order confirmation (browser payment UI alone is insufficient)
Forbidden effect / safety constraint: Uncontrolled live financial activity before Razorpay live-mode
     Founder authorization is forbidden; failure → LAUNCH_BLOCKER (not silent waiver)
```

### AC-IMP-040-004-02 — GJ-PAYMENT-RECOVERY negative path

```text
Story: US-IMP-040-004
Linked BR(s): BR-IMP-040-005
Linked FD(s): FD-040-03
Evidence expectation: Authoritative FAILED Attempt + OPEN Payment / retry evidence; first failure preserved

Given an in-progress checkout/payment on the exact production candidate under authorized modes
When a payment failure/recovery path for GJ-PAYMENT-RECOVERY is induced
Then authoritative FAILED Attempt + OPEN Payment permits retry against the same immutable Checkout
     or an explicit Start a new order, per GJ-1
And unresolved payment blocks improper retry/new payment/new order contrary to Payment truth
Forbidden effect / safety constraint: Treating browser UI alone as Payment truth is forbidden;
     broken recovery → LAUNCH_BLOCKER
```

### AC-IMP-040-004-03 — GJ-PERMITTED-OUTLET-ACCESS workforce proof

```text
Story: US-IMP-040-004
Linked BR(s): BR-IMP-040-004
Linked FD(s): FD-040-03
Evidence expectation: Workforce allow + deny evidence on production candidate

Given a permitted workforce membership/role fixture and a second identity for deny tests
When GJ-PERMITTED-OUTLET-ACCESS is exercised on the production candidate
Then the permitted member reaches permitted applications/resources / ops visibility required for launch
And unauthorized scopes/actions remain denied without cross-scope leakage
Forbidden effect / safety constraint: AuthZ hole → LAUNCH_BLOCKER
```

### AC-IMP-040-005-01 — Provider modes match authorization

```text
Story: US-IMP-040-005
Linked BR(s): BR-IMP-040-008
Linked FD(s): FD-040-08
Evidence expectation: Provider-mode readiness record citing authorized vs configured modes

Given Founder-authorized payment/delivery/notification operating modes for launch
When production configuration is validated
Then live vs sandbox (and delivery/notification choices) match the authorization record
And WhatsApp is either verified production-ready or accepted IN_APP path with truthful disclosure
Forbidden effect / safety constraint: Mode mismatch vs authorization/marketing → LAUNCH_BLOCKER / NO-GO;
     this scenario does not itself enable providers
```

### AC-IMP-040-005-02 — Backup/restore readiness READY

```text
Story: US-IMP-040-005
Linked BR(s): BR-IMP-040-004
Linked FD(s): (IMP-037 dependency; FD-040-03 integrity)
Evidence expectation: IMP-037 readiness artifact showing READY (when IMP-037 accepted)

Given launch provider/configuration readiness review includes recovery prerequisites
When backup/restore-readiness status from IMP-037 is inspected
Then the status is READY
Forbidden effect / safety constraint: NOT_READY / missing evidence → DEPENDENCY_UNREADY /
     GO evidence incomplete; do not claim IMP-037 accepted from this draft alone
```

### AC-IMP-040-005-03 — IMP-038 hardening evidence PASS

```text
Story: US-IMP-040-005
Linked BR(s): BR-IMP-040-004
Linked FD(s): (IMP-038 dependency)
Evidence expectation: IMP-038 hardening evidence pack with PASS (when IMP-038 accepted)

Given launch hardening prerequisites are reviewed
When IMP-038 hardening evidence is inspected
Then the evidence result is PASS
Forbidden effect / safety constraint: Missing/failed hardening → DEPENDENCY_UNREADY /
     GO evidence incomplete; cutover must not plan to disable required hardening controls
```

### AC-IMP-040-006-01 — Authorized apex cutover outcomes

```text
Story: US-IMP-040-006
Linked BR(s): BR-IMP-040-009, BR-IMP-040-001
Linked FD(s): FD-040-01, FD-040-02
Evidence expectation: Cutover execution record + TLS/DNS observations bound to GO authorization

Given Founder GO exists
And separate cutover authorization exists
And FD-040-02 operating-window constraints are satisfied
When authorized cutover is executed
Then https://thebobabear.in is the canonical apex on DigitalOcean production
And www behavior is consistent (not a distinct application)
And TLS is valid
Forbidden effect / safety constraint: Cutover without Founder GO / cutover authorization is forbidden;
     this Product Definition does not authorize DNS mutation now
```

### AC-IMP-040-006-02 — GitHub Pages no longer independent active production

```text
Story: US-IMP-040-006
Linked BR(s): BR-IMP-040-009
Linked FD(s): FD-040-01
Evidence expectation: Publication-source record showing Pages inactive as independent production

Given authorized apex cutover to DO has been completed under Founder GO
When production publication sources are inspected
Then GitHub Pages is no longer an active independent production publication source
And there is no dual active production (Pages + DO)
Forbidden effect / safety constraint: Dual active publication is a launch defect;
     Pages may remain only as bounded emergency reference/cutback target, not concurrent production
```

### AC-IMP-040-007-01 — Evidence complete ≠ GO

```text
Story: US-IMP-040-007
Linked BR(s): BR-IMP-040-001, BR-IMP-040-002
Linked FD(s): FD-040-03
Evidence expectation: GO/NO-GO pack status fields showing COMPLETE with GO_DECLARED = NO

Given mandatory launch evidence inputs are present for evaluation
When the GO/NO-GO evidence pack is marked complete by operators/agents
Then the process can reach GO_NO_GO_EVIDENCE_COMPLETE
And GO_DECLARED remains NO until Founder decides
Forbidden effect / safety constraint: Agents must not declare GO / PUBLIC_LAUNCH_APPROVED /
     PUBLIC_LAUNCH_ACCEPTED; completeness must not auto-emit GO
```

### AC-IMP-040-008-01 — Abort pauses checkout; paid orders preserved

```text
Story: US-IMP-040-008
Linked BR(s): BR-IMP-040-004
Linked FD(s): FD-040-03, FD-040-05
Evidence expectation: Abort record + order/payment reconciliation evidence + customer comms when impaired

Given a human abort decision during launch/cutover/live operation
When abort is executed
Then new checkout is paused as required by the abort class
And paid orders/obligations already created are preserved and reconciled
And proportionate customer communication occurs when ordering is materially impaired
Forbidden effect / safety constraint: Dropping paid obligations or silent waiver of integrity failures is forbidden
```

### AC-IMP-040-008-02 — Image rollback/forward-fix; DB restore not routine

```text
Story: US-IMP-040-008
Linked BR(s): BR-IMP-040-001
Linked FD(s): FD-040-04
Evidence expectation: Recovery record citing prior digest or forward release; explicit exclusion of routine DB restore

Given application recovery is required after a launch defect
When primary application recovery is performed
Then recovery uses prior immutable image digest rollback or a forward corrective release
And database restore is not used as normal application rollback (DB restore remains DR-only)
Forbidden effect / safety constraint: Treating DB restore as routine rollback is forbidden;
     provider reversal and Pages cutback remain separate actions when used
```

### AC-IMP-040-009-01 — Elevated observation window

```text
Story: US-IMP-040-009
Linked BR(s): BR-IMP-040-001, BR-IMP-040-002
Linked FD(s): FD-040-10
Evidence expectation: Observation pack with timestamps/periods, monitor list, alert handling notes

Given successful authorized cutover
When elevated observation runs
Then observation covers ≥72 hours and ≥2 customer operating periods
And the approved monitor list and critical alerts / material blocker handling are recorded
And launch-stable is not automatically created by completing the window
Forbidden effect / safety constraint: Auto launch-stable declaration by agents/tooling is forbidden;
     Founder launch-stable remains a separate later verdict
```

### AC-IMP-040-010-01 — Separate human verdicts only

```text
Story: US-IMP-040-010
Linked BR(s): BR-IMP-040-002, BR-IMP-040-010
Linked FD(s): FD-040-03, FD-040-10
Evidence expectation: Distinct Founder-attested records for UAT, GO/NO-GO/ABORT, and launch-stable as applicable

Given evidence packs have been prepared by agents/operators for the relevant lifecycle point
When a launch-authority decision is required
Then only Founder-recorded verdicts count for:
     (1) Founder UAT PASS | DEFECTS (authorized UAT/staging exact candidate)
     (2) Founder production GO | NO-GO | ABORT
     (3) Founder launch-stable after elevated observation
And agents cannot issue those human verdicts
Forbidden effect / safety constraint: Collapsing Founder UAT into production GO, or agent-declared
     FOUNDER_UAT=PASS / GO / launch-stable, is forbidden
```

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
| BR-IMP-040-010 | Exact-candidate provenance required for Founder UAT and for production launch evidence (separate gates; same provenance discipline) |

---

## 11. Journey Completeness Matrix (process)

| Journey dimension | Behaviour / applicability or N/A reason | Story / AC references |
|---|---|---|
| ENTRY | Operator opens launch evidence / runbook process for candidate, prerequisites, audit, smoke, GO pack, cutover, abort, observation, or Founder verdict record | US-IMP-040-001…010 |
| DISCOVERY | Packs and statuses distinguish incomplete vs COMPLETE vs human-decided GO/UAT/launch-stable | US-IMP-040-007, US-IMP-040-010 |
| CONTEXT | Exact candidate identity + environment + authorized provider modes retained across artifacts | US-IMP-040-001, US-IMP-040-005; AC-001-01 |
| EMPTY / FIRST USE | No candidate / no audit rows / empty GO pack → NOT_STARTED / evidence incomplete (never healthy by empty folder) | §12 matrix |
| HAPPY PATH | Identity → prerequisites → audit dispositions → critical GJ smoke → mode readiness → COMPLETE pack → Founder GO → cutover → observation → Founder launch-stable | AC-001…010 |
| ALTERNATE VALID PATHS | Limitation register for permitted non-blocking gaps; IN_APP notification path when authorized; Pages emergency cutback target | FD-040-06/07/08; US-008 |
| VALIDATION FAILURE | Missing identity fields, mode mismatch, failed GJ → VALIDATION_FAILURE / LAUNCH_BLOCKER / incomplete pack | AC-001-01; AC-004-*; AC-005-01 |
| AUTHORIZATION | Human Founder UAT / GO / ABORT / launch-stable; operators execute under authorization; no invented Launch Approver RBAC | AC-010-01; BR-002 |
| NOT FOUND / STALE REFERENCE | STALE_CANDIDATE when digest/SHA drift; missing prerequisite → DEPENDENCY_UNREADY / NOT_FOUND | §12; AC-002-01 |
| SERVER / NETWORK / PROVIDER ERROR | Smoke/tooling/provider errors recorded as failure; no false success | AC-004-*; AC-005-01; §12 |
| RECOVERY | Abort / image rollback / forward-fix / Pages cutback; paid-order reconcile; DB restore not routine | AC-008-01/02 |
| CONCURRENCY | Cutover vs in-flight Pages users; webhook host after DNS; no dual active production | §15; AC-006-* |
| DESTRUCTIVE ACTION | Abort/cutback/rollback require human confirmation; cancel before destructive where meaningful | US-008; §12 CONFIRMATION_REQUIRED |
| SUCCESS FEEDBACK | COMPLETE ≠ GO; UAT PASS ≠ GO; observation complete ≠ launch-stable | AC-007-01; AC-009-01; AC-010-01 |
| DOWNSTREAM EFFECT | Public traffic on apex; communications pack; statutory/tax clock concerns under FD-040-09 future evidence | FD-040-05/09 |
| REVISIT / RELOAD | Evidence packs reproducible and bound to candidate; first failures preserved (TEST-1) | BR-010; §19 |
| RESPONSIVE / MOBILE | Customer GJ smoke includes mobile+desktop continuity; operator V1 surfaces are artifacts/CLI/runbook (responsive N/A for those) | §17; §12 |
| ACCESSIBILITY | Interactive operator surfaces (if any) require keyboard/focus/name/confirmation semantics; pure artifacts/CLI document a11y via readable results | §12; §17 |

| Journey | Happy | Failure |
|---|---|---|
| Candidate identity | Fingerprint + digest match | Any drift → stop |
| Prerequisites | All accepted + readiness | Missing IMP / unreadiness → NO-GO (FD-040-03) |
| Gap audit | All rows disposed; register signed where needed | Undisposed GJ → evidence incomplete |
| Live smoke | Critical GJs pass under authorized modes | Failure → abort or limitation decision |
| Cutover | Apex on DO; Pages inactive publication | Split-brain Pages+DO → launch defect |
| Go/no-go | Evidence complete; Founder decides | Founder NO-GO |
| Founder UAT | Exact UAT candidate interactive PASS | DEFECTS → return through validation |
| Observe | Window complete; Founder launch-stable | Material failure → pause/corrective/cutback |

---

## 12. UX / operator state matrix

IMP-040 V1 operator experience is **launch process artifacts + CLI/runbook/evidence packs**, not a
mandatory new customer web application. Interactive accessibility rows apply only if Fit later
introduces an interactive operator UI; otherwise keyboard/focus is **N/A (artifact/CLI)** with
readable results still required.

Canonical delivery order (human gates separated):

```text
IMPLEMENT
→ PROVE
→ INDEPENDENT_REVIEW
→ independent technical acceptance
→ authorized UAT deployment
→ FOUNDER_UAT
→ ACCEPT / RECONCILE as applicable
→ later IMP-040 launch evidence
→ Founder GO / NO-GO / ABORT
→ public cutover
→ elevated observation
→ Founder launch-stable verdict
```

### 12.1 Human gate definitions (non-substitutable)

#### Founder UAT

```text
purpose:
  interactive human validation of the exact accepted technical candidate
environment:
  authorized UAT/staging deployment (Founder staging / boba-staging per AGENTS.md when used)
candidate provenance:
  exact SHA, tree, working-tree/governance fingerprint as applicable, image digest where applicable
result:
  PASS | DEFECTS (or equivalent existing canonical vocabulary)
authority:
  Founder
not equivalent to:
  production GO
  public launch authorization
  DNS cutover authorization
  live-provider authorization
  launch-stable declaration
current status in this draft:
  FOUNDER_UAT_REQUIRED = YES
  FOUNDER_UAT_STATUS = NOT_PERFORMED
```

#### Founder GO / NO-GO / ABORT

```text
purpose:
  production/public-launch operating decision
inputs:
  accepted prerequisite IMPs
  Journey Gap Audit evidence
  production smoke
  provider-mode readiness
  tax/GST evidence (FD-040-09 written adviser confirmation before paid public GO)
  known limitation register
  cutover readiness
  operating-owner availability
  other approved FD-040 prerequisites
authority:
  Founder
not equivalent to:
  Founder UAT
  technical acceptance
  implementation completion
current status in this draft:
  GO_DECLARED = NO
```

#### Founder launch-stable

```text
purpose:
  post-cutover verdict after elevated observation
minimum observation:
  72 hours and >=2 customer operating periods
not equivalent to:
  initial GO
  Founder UAT
current status in this draft:
  NOT_DECLARED
```

### 12.2 Per-surface / process matrix

| Surface / process | State | Trigger / condition | What operator sees | Allowed action | Forbidden action | Recovery / next state | Keyboard / focus if interactive | Responsive if interactive | Linked AC(s) |
|---|---|---|---|---|---|---|---|---|---|
| Launch candidate evidence pack | NOT_STARTED / empty | No identity pack yet | Empty pack / first-use guidance | Start identity capture | Claim GO-ready | → LOADING | N/A (artifact/CLI) — readable fields required | N/A (not customer UI) | AC-001-01 |
| Launch candidate evidence pack | LOADING / gathering | Capture in progress | Gathering SHA/tree/digest/fingerprint | Wait / cancel gather | Invent digest | → READY or VALIDATION_FAILURE | N/A (CLI) | N/A | AC-001-01 |
| Launch candidate evidence pack | READY | All required identity fields present | Path, ref, HEAD, tree, fingerprint, digest, env, timestamp | Attach to downstream packs | Mutate DNS / enable live providers | Used by smoke/UAT/GO | N/A | N/A | AC-001-01 |
| Launch candidate evidence pack | VALIDATION_FAILURE | Missing/invalid required field | Field-level failure reason | Fix / re-gather | Proceed as complete | → LOADING / READY | N/A | N/A | AC-001-01 |
| Launch candidate evidence pack | STALE_CANDIDATE | Downstream artifact cites different SHA/digest | Stale warning + both identities | Re-select / regenerate pack | Ignore drift | → NOT_STARTED / READY | N/A | N/A | AC-001-01; BR-010 |
| Prerequisite evidence review | NOT_STARTED | Launch evaluation not begun | Empty checklist | Begin review | Invent IMP acceptance | → LOADING | N/A | N/A | AC-002-01 |
| Prerequisite evidence review | LOADING | Gathering ROADMAP/STATE + readiness cites | In-progress checklist | Continue gather | Mark COMPLETE_AND_ACCEPTED falsely | → READY / DEPENDENCY_UNREADY / NOT_FOUND | N/A | N/A | AC-002-01 |
| Prerequisite evidence review | READY | 036G+037+038+039 accepted + readiness present | Green prerequisite summary | Include in GO pack | Declare GO | → used by AC-007 | N/A | N/A | AC-002-01 |
| Prerequisite evidence review | DEPENDENCY_UNREADY / NOT_FOUND | Missing acceptance or readiness | Which prerequisite missing | Stop GO path; wait owning IMP | Silent waiver | Remains incomplete | N/A | N/A | AC-002-01 |
| Prerequisite evidence review | UNAUTHORIZED / denied | Operator lacks evidence access | Denied without secret leak | Escalate access | Bypass with guessed status | BLOCKED | If UI: focus denial | If UI: usable message | AC-002-01 |
| Journey Gap Audit record | NOT_STARTED | Audit not executed | Plan only (execution NOT_PERFORMED) | Request authorized execution later | Mark audit PASS from planning | stays NOT_STARTED until authorized | N/A | N/A | AC-003-01/02 |
| Journey Gap Audit record | IN_PROGRESS | Rows being executed | Row statuses / pending dispositions | Record evidence; preserve first failure | Rewrite historical acceptance | → COMPLETE or VALIDATION_FAILURE | N/A | N/A | AC-003-01/02 |
| Journey Gap Audit record | COMPLETE | All required rows disposed | Durable artifact with dispositions | Attach to GO pack; Founder limitation register where needed | Treat as GO | → GO pack input | N/A | N/A | AC-003-01 |
| Journey Gap Audit record | VALIDATION_FAILURE / BLOCKED | Undisposed or mandatory blocker | Blocker list | Remediate / NO-GO path | Silent waive mandatory class | incomplete / NO-GO | N/A | N/A | AC-003-01; BR-004 |
| Production smoke execution/result | NOT_STARTED | Smoke not run | Empty smoke sheet | Start under authorized modes | Uncontrolled live charges pre-auth | → IN_PROGRESS | Customer UI a11y applies during GJ smoke | Mobile+desktop required for customer GJs | AC-004-* |
| Production smoke execution/result | IN_PROGRESS | Journey running | Live progress; candidate identity shown | Continue / abort smoke | Silent-retry-as-pass | → SUCCESS / VALIDATION_FAILURE / PROVIDER_ERROR | Customer journeys: keyboard/focus/name per existing commerce a11y | Yes (customer) | AC-004-*; TEST-1 |
| Production smoke execution/result | SUCCESS | Named GJs pass | Pass evidence bound to digest | Attach to GO pack | Declare GO / UAT PASS | → GO pack | N/A for result artifact | N/A | AC-004-01/02/03 |
| Production smoke execution/result | VALIDATION_FAILURE | Journey fail | First failure preserved | Classify LAUNCH_BLOCKER / ABORT path | Erase first failure | remediation / NO-GO | Errors not by color alone if UI | Yes | AC-004-*; TEST-1 |
| Production smoke execution/result | SERVER / NETWORK / PROVIDER_ERROR | Infra/provider fault | Explicit error; no false success | Retry only as distinguishable diagnostic | Claim success | FAILED retained | N/A | N/A | AC-004-*; AC-005-01 |
| Provider-mode readiness record | NOT_STARTED / empty | No mode record | Empty mode checklist | Capture authorized vs configured | Enable live Razorpay from PD | → LOADING | N/A | N/A | AC-005-01 |
| Provider-mode readiness record | READY | Modes match; 037 READY; 038 PASS | Mode + readiness summary | Include in GO pack | Flip provider modes without Founder auth | → GO pack | N/A | N/A | AC-005-01/02/03 |
| Provider-mode readiness record | VALIDATION_FAILURE | Mode mismatch | Mismatch detail | Fix config or NO-GO | Ship mismatched marketing claim | DEPENDENCY_UNREADY / NO-GO | N/A | N/A | AC-005-01 |
| Provider-mode readiness record | DEPENDENCY_UNREADY | Backup/hardening not READY/PASS | Which dependency failed | Wait owning IMP | Invent PASS | incomplete | N/A | N/A | AC-005-02/03 |
| GO / NO-GO evidence pack | NOT_STARTED | Pack not assembled | Empty pack | Assemble inputs | Auto GO | → LOADING | N/A | N/A | AC-007-01 |
| GO / NO-GO evidence pack | LOADING / gathering | Assembling | Checklist of missing inputs | Add evidence | Mark COMPLETE early | → COMPLETE or BLOCKED | N/A | N/A | AC-007-01 |
| GO / NO-GO evidence pack | GO_NO_GO_EVIDENCE_COMPLETE | Mandatory inputs present | COMPLETE status with GO_DECLARED=NO | Submit to Founder | Agent-declare GO | awaits Founder verdict | If interactive submit UI later: visible focus + name | If UI: usable | AC-007-01; AC-010-01 |
| GO / NO-GO evidence pack | BLOCKED | Mandatory input missing | Missing list | Continue assemble / NO-GO recommend | Fake completeness | → LOADING | N/A | N/A | AC-007-01 |
| Cutover execution record | UNAUTHORIZED / denied | No Founder GO or no cutover auth | Denied / blocked | Obtain GO + auth | Mutate DNS anyway | stays blocked (DNS_MUTATION_AUTHORIZED=NO now) | If UI: focus denial | If UI | AC-006-01 |
| Cutover execution record | CONFIRMATION_REQUIRED | GO exists; about to mutate DNS/TLS | Consequence summary; Confirm/Cancel | Confirm under auth / cancel | Skip confirmation | → IN_PROGRESS or cancel | If UI: focus dialog; Esc=cancel; restore focus | If UI | AC-006-01 |
| Cutover execution record | IN_PROGRESS | Cutover running | Progress; no dual-run claim | Monitor TLS/DNS | Dual-publish Pages+DO | → SUCCESS / VALIDATION_FAILURE | N/A | N/A | AC-006-01/02 |
| Cutover execution record | SUCCESS | Apex on DO; TLS valid; Pages not independent active production | Canonical URL confirmed | Begin elevated observation | Keep Pages as active production | → LIVE_OBSERVING | N/A | N/A | AC-006-01/02 |
| Cutover execution record | VALIDATION_FAILURE | TLS/split-brain/failure | Failure detail | Cutback / fix | Ignore split-brain | RECOVERY_AVAILABLE (US-008) | N/A | N/A | AC-006-*; AC-008-* |
| Abort / rollback / cutback controls | CONFIRMATION_REQUIRED | Human abort/rollback requested | Target digest / consequence / cancel | Confirm authorized action | Unconfirmed destructive action | → IN_PROGRESS or cancel | If UI: confirm semantics + focus restore | If UI | AC-008-01/02 |
| Abort / rollback / cutback controls | IN_PROGRESS | Executing abort/rollback/cutback | Checkout pause / deploy progress | Monitor reconcile | DB restore as routine rollback | → SUCCESS / SERVER_ERROR | N/A | N/A | AC-008-01/02 |
| Abort / rollback / cutback controls | SUCCESS / RECOVERY_AVAILABLE | Abort done; paid orders preserved; image/forward-fix path used | Reconciliation status; comms status | Continue observe / Founder ABORT record | Drop paid obligations | terminal recovery state | N/A | N/A | AC-008-01/02 |
| Abort / rollback / cutback controls | SERVER / NETWORK / PROVIDER_ERROR | Recovery action failed | Explicit failure | Escalate / retry distinguishable | Claim rolled back | FAILED retained | N/A | N/A | AC-008-02 |
| Elevated observation dashboard/evidence pack | NOT_STARTED | Pre-cutover | Observation not started | Wait for cutover SUCCESS | Auto launch-stable | → IN_PROGRESS after cutover | N/A | N/A | AC-009-01 |
| Elevated observation dashboard/evidence pack | IN_PROGRESS | Post-cutover window open | Monitors, alerts, elapsed time/periods | Ack alerts; escalate blockers | Declare launch-stable | continues until window met or blocker path | If dashboard UI: keyboard reachability, visible focus, programmatic names; errors not color-only; SR-understandable results | If UI: usable layout | AC-009-01 |
| Elevated observation dashboard/evidence pack | COMPLETE | ≥72h and ≥2 operating periods recorded | Window complete; still not launch-stable | Submit pack to Founder | Auto launch-stable | awaits Founder launch-stable | Same a11y if UI | If UI | AC-009-01; AC-010-01 |
| Elevated observation dashboard/evidence pack | BLOCKED | Material blocker during window | Blocker detail | Corrective / cutback / escalate | Ignore critical alert | RECOVERY_AVAILABLE / ABORT path | If UI: a11y as above | If UI | AC-009-01; US-008 |
| Founder verdict / sign-off record | NOT_STARTED | No verdict yet | Empty verdict slots for UAT / GO / launch-stable | Prepare packs only | Agent fill PASS/GO | awaits Founder | If UI later: focus on verdict control | If UI | AC-010-01 |
| Founder verdict / sign-off record | CONFIRMATION_REQUIRED | Founder about to record a verdict | Distinct verdict type + candidate identity + consequence | Founder confirms UAT or GO/NO-GO/ABORT or launch-stable | Collapse UAT into GO | recorded verdict | If UI: confirm + focus restore | If UI | AC-010-01 |
| Founder verdict / sign-off record | SUCCESS | Founder recorded applicable verdict | Attested record with timestamp + candidate | Proceed to next lifecycle step only | Agent overwrite verdict | next authorized phase | N/A for sealed artifact | N/A | AC-010-01 |

Lifecycle labels retained as process outcomes (not a substitute for the matrix above):

| State | Meaning |
|---|---|
| PRE_CUTOVER | DO production exists (IMP-039 when accepted); apex still Pages until GO+cutover |
| EVIDENCE_INCOMPLETE | Missing audit/smoke/prereq/tax evidence |
| GO_NO_GO_EVIDENCE_COMPLETE | Agent/operator terminal evidence state (not GO) |
| CUTOVER_IN_PROGRESS | Founder-authorized cutover; dual-run forbidden |
| LIVE_OBSERVING | Public traffic; elevated observation (FD-040-10) |
| ABORTED | New checkout paused; paid obligations preserved |
| ROLLED_BACK_IMAGE | Prior digest / forward corrective release |
| ROLLED_BACK_DNS | Pages emergency cutback; ordering unavailable unless alternate surface proven |
| LAUNCH_STABLE | **Founder only** after elevated observation evidence |
| LAUNCH_ACCEPTED | **Founder only** after reconciliation |

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
- Founder UAT = Founder interactive verdict only on exact UAT/staging candidate (separate from GO)
- Founder GO / NO-GO / ABORT = Founder production/public-launch operating verdict on GO evidence pack (separate from UAT)
- Founder launch-stable = Founder post-observation verdict (separate from initial GO and from UAT)
- FD-040-09 written adviser confirmation present before paid public GO
- Elevated observation evidence pack (≥72h, ≥2 operating periods) before launch-stable consideration

---

## 26. Founder UAT applicability (separate from GO)

```text
FOUNDER_UAT_REQUIRED = YES
FOUNDER_UAT_STATUS = NOT_PERFORMED
GO_DECLARED = NO
LAUNCH_STABLE = NOT_DECLARED
```

Founder UAT is the interactive human validation gate on the exact independently reviewed technical
candidate in an authorized UAT/staging deployment. It is **not** the public launch verdict and is
**not** interchangeable with Founder GO / NO-GO / ABORT.

Production GO / NO-GO / ABORT is a later human operating decision after IMP-040 launch evidence
(including Journey Gap Audit, production smoke, provider-mode readiness, and FD-040 prerequisites).

Launch-stable is a still-later Founder verdict after elevated observation.

Separate from IMP-039 pre-cutover operator UAT (when that capability exists and is accepted).

Exact-candidate provenance discipline applies to Founder UAT and to production launch evidence
(path + branch/ref + HEAD + tree + WORKING_TREE_FINGERPRINT/governance fingerprint as applicable +
image digest where applicable). See §12.1.

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

Each story’s readiness cites concrete sections. Generic “Complete in §§7–10” is insufficient under PD-1.

| Story ID | Story definition | ACs | Business rules | UX / error / recovery | Security / data / context | Dependencies | Fit questions | Open material decisions | Readiness / blocker |
|---|---|---|---|---|---|---|---|---|---|
| `US-IMP-040-001` | §7 story block | AC-001-01 (§9) | BR-001, BR-010 (§10) | §11–12 candidate pack states | §7 + §13–14 | §7 + §22 | §7 Fit note | NONE | `READY_FOR_PRODUCT_DEFINITION_GATE_EVALUATION`; `NOT_READY_FOR_IMPLEMENTATION` until Gate PASS + Fit/lock + auth + sequence |
| `US-IMP-040-002` | §7 story block | AC-002-01 | BR-001, BR-003, BR-004 | §11–12 prerequisite states | §7 + §13–14 | §7 + §22 HARD deps | N/A (ROADMAP/STATE) | NONE | Same |
| `US-IMP-040-003` | §7 story block + §19 plan | AC-003-01/02 | BR-003, BR-004, BR-006, BR-007 | §11–12 audit states | §7 + §13–14 + §19 | §7 + §19 | §7 / §19 store path | NONE | Same; audit execution still NOT_PERFORMED |
| `US-IMP-040-004` | §7 story block | AC-004-01/02/03 | BR-004, BR-005, BR-008 | §11–12 smoke states | §7 + §13–14 | §7 + FD-040-08 | Smoke harness Fit | NONE | Same |
| `US-IMP-040-005` | §7 story block | AC-005-01/02/03 | BR-004, BR-008 | §11–12 provider-readiness states | §7 + §13–14; FD-040-09 future evidence | §22 HARD 037/038/039 | Config inspection Fit | NONE | Same |
| `US-IMP-040-006` | §7 story block | AC-006-01/02 | BR-001, BR-009 | §11–12 cutover states | §7 + §13–15 | GO + FD-040-01/02 | DNS/TLS runbook Fit | NONE | Same; DNS mutation not authorized by this PD |
| `US-IMP-040-007` | §7 story block | AC-007-01 | BR-001, BR-002 | §11–12 GO pack states | §7 + §13–14 | US-001…005 + FD-040-09 | Pack format Fit | NONE | Same |
| `US-IMP-040-008` | §7 story block | AC-008-01/02 | BR-001, BR-004 | §11–12 abort/rollback states | §7 + §13–15 | FD-040-03/04/05 | Pause/rollback tooling Fit | NONE | Same |
| `US-IMP-040-009` | §7 story block | AC-009-01 | BR-001, BR-002 | §11–12 observation states | §7 + §16 | Cutover SUCCESS + FD-040-10 | Observe tooling Fit | NONE | Same |
| `US-IMP-040-010` | §7 story block + §12.1 | AC-010-01 | BR-002, BR-010 | §12 Founder verdict states | §7 human authority ≠ RBAC | Prior packs at lifecycle point | Verdict record Fit | NONE | Same; UAT/GO/launch-stable all NOT performed/declared |

```text
READY_FOR_PRODUCT_DEFINITION_GATE_EVALUATION = YES for all 10 stories (PD-1 DoR fields present)
NOT_READY_FOR_IMPLEMENTATION = YES until Product Definition Gate PASS + Architecture Fit/lock +
  IMP-040 activation/authorization + sequence prerequisites
PRODUCT_DEFINITION_GATE_EXECUTION = NOT_PERFORMED
```

---

## 29. Product Definition Gate record

Candidate record only. The Gate itself remains unexecuted.

```text
PRODUCT_DEFINITION_GATE
Capability: IMP-040 — Launch Validation & Cutover
Product Definition Version: PD-IMP-040-DRAFT-1
Business Outcome: Public launch validation and cutover under human Founder GO, with Founder UAT
  as a separate prior interactive gate (§3, §12.1, §26)
Primary Personas: Founder (R3 human authority, not RBAC) + PERSONA-PLATFORM-OPERATOR /
  PERSONA-WORKFORCE-OPERATOR / PERSONA-CUSTOMER
Journeys Defined: YES (9 desired-state journeys + Founder UAT distinguished in §12.1/§26)
Story Map Complete: YES (10 stories)
Stories Defined: YES (§7 full PD-1 story blocks)
Acceptance Slice Defined: YES (§8)
Acceptance Scenarios Complete: YES (17 executable Given/When/Then scenarios in §9)
Acceptance Scenarios: 17
Business Rules: 10
Happy Paths Defined: YES (§9 + §11)
Alternate Paths Defined: YES (§7 alternate paths; §9; FD-040-06/07/08)
Empty / First-Use States Defined: YES (§12 NOT_STARTED/empty rows)
Error / Recovery Paths Defined: YES (§9 failure constraints; §12 recovery states; US-008)
Authorization Variants Defined: YES (human UAT/GO/ABORT/launch-stable; denied cutover without GO;
  no invented app RBAC / Launch Approver role)
Cross-Scope Scenarios Defined: YES (Pages vs DO; live vs sandbox modes; UAT vs production GO)
Concurrency Considered: YES (§15; cutover dual-publication forbidden)
Destructive Actions Defined: YES (abort / cutback / rollback confirmation; limitation register)
UX State Matrix Complete: YES (§12 per-surface operator process matrix + a11y/N/A rationale)
Accessibility Considered: YES (§12 interactive requirements; §17 customer smoke; CLI/artifact N/A rationale)
Golden Journeys Identified: YES (owns Journey Gap Audit of GJ-1; plan READY; execution NOT_PERFORMED;
  critical production proofs AC-004-*)
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
and PD-1 story/AC/UX completeness corrected for gate evaluation
```

IMP-040 remains pre-gate and unactivated. `currentProductSlice` remains NONE (`acceptedThrough` IMP-036G).
`nextProductSlice` remains IMP-037. ROADMAP/STATE are unchanged by this persistence.

```text
This document does not:
  execute Product Definition Gate
  perform Architecture Fit
  lock architecture
  activate IMP-040
  authorize implementation
  execute Journey Gap Audit
  mutate DNS
  enable live Razorpay / provider modes
  declare Founder UAT PASS
  declare GO
  approve public launch
```
