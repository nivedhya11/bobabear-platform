# Product Definition Template

Mandatory for per-IMP Product Definitions for new substantial product work from IMP-036F onward.
Use with [`PRODUCT-DELIVERY.md`](../../PRODUCT-DELIVERY.md), [`TESTING.md`](../../TESTING.md), and
the [product artifact index](../README.md). Replace placeholders with evidence-backed definitions;
an empty field is not approval. Use `N/A` only with a brief reason.

This template defines user/business behaviour within existing authority. It cannot override global
architecture, security, financial or persistence authority, concurrency semantics, accepted STATE,
or binding decisions. Undefined material behaviour is `PRODUCT_DECISION_REQUIRED`: stop for human
resolution; architecture must not invent it. Approval of this artifact does not activate a slice or
authorize implementation independently of ROADMAP and the existing gates.

```text
PRODUCT_DELIVERY_PROCESS_EFFECTIVE_FROM = IMP-036F
HISTORICAL_ACCEPTED_IMPS_REWRITTEN = NO
IMP036E_LIFECYCLE_CHANGED = NO
IMP036F_ACTIVATED = NO
```

Those markers describe adoption of the operating model, not future capability lifecycle updates.
IMP-036E remains on its existing lifecycle. A historical Journey Gap Audit is required before public
GTM cutover / IMP-040 acceptance and is not performed in Session 1.

## 1. Identity / version / status

| Field | Definition |
|---|---|
| Capability / title | `<IMP and existing ROADMAP identity>` |
| Product Definition version / document status | `<version; draft or approved with approval evidence>` |
| Product owner / approval evidence | `<human decision authority and record>` |
| Process / verification policy | `PD-1 / TEST-1` (verify applicable versions) |
| Canonical anchors | `<VISION / ROADMAP / STATE / ARCHITECTURE / decision-register versions>` |
| Repository candidate | `<canonical path / branch / HEAD / tree / content-sensitive fingerprint>` |
| Capability lifecycle / authorization | `<reference ROADMAP / STATE / capability artifact; do not create new states>` |
| Relevant capability architecture / ADRs | `<paths and applicable versions / invariants>` |
| Founder UAT applicability | `FOUNDER_UAT_REQUIRED = <YES or NO>; <authority / reason>` |

## 2. Business outcome

`<The user/business result this capability must achieve and the observable measure of success. Link
the relevant VISION outcome; do not substitute a list of screens or technical components.>`

## 3. Problem statement

`<Who encounters which problem, in what context, with what impact? Cite current evidence and separate
verified facts from unresolved questions.>`

## 4. Primary personas

| Persona ID | Responsibility / goal in this slice | Context / evidence |
|---|---|---|
| `PERSONA-...` | `<human/business responsibility>` | `<registry link and relevant context>` |

Use the [persona registry](../personas.md). `PERSONA != ROLE`, `PERSONA != PERMISSION`, and
`PERSONA != AUTHORIZATION`; list actual authorization authority in section 14.

## 5. Current-state journey

| Journey ID / evidence | Entry / preconditions | Activities today | Existing outcome / gap |
|---|---|---|---|
| `JOURNEY-...` / `<source>` | `<how the person arrives>` | `<ordered activities>` | `<verified behaviour and known gaps>` |

Reference existing journey material instead of duplicating it. Do not claim planned or unaccepted
behaviour is accepted reality.

## 6. Desired-state journey

| Journey ID | Entry / context | Ordered activities | Success / downstream outcome | Alternate / recovery paths |
|---|---|---|---|---|
| `JOURNEY-...` | `<preconditions>` | `<steps>` | `<observable result>` | `<branches and AC references>` |

## 7. Story map

| Business outcome | Persona | Journey | Activity | Story IDs | Slice classification |
|---|---|---|---|---|---|
| `<outcome>` | `PERSONA-...` | `JOURNEY-...` | `<human activity>` | `US-<IMP>-NNN` | `V1_ACCEPTANCE_SLICE / FOLLOW_UP / DEFERRED` |

Each acceptance story should deliver a coherent observable outcome. Record follow-up scope explicitly;
horizontal technical tasks alone do not substitute for the user story map.

## 8. Acceptance slice

| Slice | Mandatory story IDs | Mandatory AC IDs | Required Golden Journeys | Observable acceptance boundary |
|---|---|---|---|---|
| `V1_ACCEPTANCE_SLICE` | `<IDs>` | `<IDs>` | `<GJ IDs>` | `<what the user can complete>` |
| `FOLLOW_UP` | `<IDs / explicit scope>` | `<if defined>` | `<if affected>` | `<reason and dependency; not silently required for V1>` |
| `DEFERRED` | `<IDs / explicit scope>` | `<if defined>` | `<if affected>` | `<reason and future decision gate>` |

Every identified possibility also receives one disposition in sections 22–25:
`SUPPORTED_NOW`, `EXPLICITLY_DEFERRED`, `NOT_SUPPORTED_BY_DESIGN`, or
`UNRESOLVED_DECISION_REQUIRED`. Slice classification does not itself authorize future work.

## 9. User stories

Repeat this block for each story:

```text
Story ID: US-<IMP>-NNN
As a <persona>
I want <goal>
so that <business/user outcome>.

Journey / activity:
Preconditions:
Acceptance scenarios:
Business rules:
UX states:
Permission / resource context:
Error / recovery:
Dependencies:
Explicit non-goals:
Data implications:
Security implications:
Architecture fit / applicable invariants:
Open material decisions: <NONE or linked decision required>
Readiness: <READY or NOT_READY_FOR_IMPLEMENTATION, with evidence>
```

## 10. Acceptance scenarios

Use observable scenarios, not implementation details. Cover applicable happy, alternate, empty,
error/recovery, authorization, and cross-scope paths. Define initial conditions, action, resulting
behaviour, and forbidden effects where material.

```text
AC-<IMP>-NNN-NN — <observable scenario title>
Story: US-<IMP>-NNN
Given <persona, resource context and preconditions>
When <the person acts or a relevant event occurs>
Then <observable user/business outcome>
And <observable side-effect boundary or invariant where applicable>
Mandatory in acceptance slice: <YES or NO with classification>
```

| Story / AC ID | Required behaviour / risk | Applicable test layers | Planned proof | Actual evidence / candidate / result |
|---|---|---|---|---|
| `<IDs>` | `<observable outcome>` | `<TEST-1 layers; N/A reason>` | `<test reference or manual procedure>` | `<populate after execution; planned is not proven>` |

Every mandatory AC needs passing evidence under [TEST-1](../../TESTING.md). Record commands, relevant
artifacts, limitations, and candidate provenance in the linked evidence rather than copying logs here.

## 11. Business rules

| Rule ID | User/business rule | Authority / rationale | Story / AC IDs |
|---|---|---|---|
| `BR-<IMP>-NNN` | `<observable constraint or supported/denied transition>` | `<existing authority or explicit product decision>` | `<IDs>` |

Unresolved material rules go in section 25; a product rule cannot silently amend a binding decision.

## 12. Journey Completeness Matrix

Consider every row for every affected journey; add rows per journey where outcomes differ. `N/A`
requires a brief reason and must not hide a missing material path.

| Journey dimension | Behaviour / applicability or N/A reason | Story / AC references |
|---|---|---|
| ENTRY | `<definition>` | `<IDs>` |
| DISCOVERY | `<definition>` | `<IDs>` |
| CONTEXT | `<definition>` | `<IDs>` |
| EMPTY / FIRST USE | `<definition>` | `<IDs>` |
| HAPPY PATH | `<definition>` | `<IDs>` |
| ALTERNATE VALID PATHS | `<definition>` | `<IDs>` |
| VALIDATION FAILURE | `<definition>` | `<IDs>` |
| AUTHORIZATION | `<definition>` | `<IDs>` |
| NOT FOUND / STALE REFERENCE | `<definition>` | `<IDs>` |
| SERVER / NETWORK ERROR | `<definition>` | `<IDs>` |
| RECOVERY | `<definition>` | `<IDs>` |
| CONCURRENCY | `<definition>` | `<IDs>` |
| DESTRUCTIVE ACTION | `<definition>` | `<IDs>` |
| SUCCESS FEEDBACK | `<definition>` | `<IDs>` |
| DOWNSTREAM EFFECT | `<definition>` | `<IDs>` |
| REVISIT / RELOAD | `<definition>` | `<IDs>` |
| RESPONSIVE / MOBILE | `<definition>` | `<IDs>` |
| ACCESSIBILITY | `<definition>` | `<IDs>` |

## 13. UX state matrix

For each affected surface, define applicable ready, loading, empty/first-use, success, validation
failure, unauthorized, not-found/stale, server/network error, and recovery states. Include pending
mutation, concurrency conflict, and destructive confirmation when applicable.

| Surface / state | Entry condition | Visible feedback / available actions | Focus / keyboard behaviour | Next / recovery state | AC ID or N/A reason |
|---|---|---|---|---|---|
| `<surface / state>` | `<condition>` | `<human-readable feedback>` | `<behaviour>` | `<transition>` | `<reference>` |

## 14. Permissions / resource context

| Action | Existing identity / permission authority | Resource context / server-derived scope | Allowed / denied / cross-scope variants | AC IDs |
|---|---|---|---|---|
| `<action>` | `<authority reference>` | `<context>` | `<observable outcomes and forbidden effects>` | `<IDs>` |

Do not derive authorization from persona labels or invent roles, permissions, scope, or delegation.
Unknown material authority stops the affected work for the existing decision gate.

## 15. Data implications

`<Existing data authority; inputs/outputs; persistence and reload expectations; immutable/historical
facts; migration/data impact if any. Link the architecture fit; do not invent persistence authority.>`

## 16. Security/privacy

`<Trust boundaries, sensitive data visibility, isolation and forbidden disclosure/side effects;
positive and negative ACs. Reference binding authority; flag unresolved security decisions.>`

## 17. Concurrency/recovery

`<Overlapping actions, duplicates, stale context, partial failure, interruption/revisit and the
required observable outcomes. Link existing concurrency/idempotency/recovery authority and planned
proof; do not invent retry semantics. Explain N/A where justified.>`

## 18. Accessibility/responsive expectations

`<Supported viewport/device contexts; keyboard and focus behaviour; semantic labels and feedback;
applicable accessible interaction scenarios and evidence. Do not rely solely on automated scans.>`

## 19. Observability/supportability if applicable

`<How users/operators identify a failure and obtain help; existing audit/diagnostic/support evidence
needed to explain the result; privacy boundaries; AC links. Reference existing authority rather than
introducing infrastructure. N/A requires a reason.>`

## 20. Golden Journeys affected

Use the [Golden Journey registry](../golden-journeys.md). A registry status is not a test verdict or
an accepted product promise.

| GJ ID / registry status | Affected steps / downstream behaviour | Mandatory for this acceptance? | Related story / AC IDs | Required proof / actual evidence |
|---|---|---|---|---|
| `GJ-...` / `<status>` | `<impact>` | `<YES or NO with reason>` | `<IDs>` | `<real-browser proof under TEST-1; result after execution>` |

## 21. Dependencies

| Dependency | Authority / verified state | Required before which story or gate? | Unresolved impact |
|---|---|---|---|
| `<capability / product decision / architecture / environment>` | `<path and evidence>` | `<ID / gate>` | `<NONE or blocker>` |

## 22. Supported now

List all `SUPPORTED_NOW` possibilities; distinguish verified existing behaviour from behaviour
committed to this acceptance slice. Proposed behaviour is not accepted until the canonical gates pass.

| Behaviour | Existing verified or V1 acceptance commitment? | Story / AC IDs / source |
|---|---|---|
| `<behaviour>` | `<basis>` | `<references>` |

## 23. Explicitly deferred

| `EXPLICITLY_DEFERRED` behaviour | FOLLOW_UP or DEFERRED | Reason / consequence | Revisit dependency / decision owner |
|---|---|---|---|
| `<behaviour>` | `<slice>` | `<why; how the current journey remains coherent>` | `<authority; no implied activation>` |

## 24. Not supported by design

| `NOT_SUPPORTED_BY_DESIGN` behaviour | Reason / authority | User-visible boundary / relevant AC |
|---|---|---|
| `<behaviour>` | `<non-goal or explicit decision>` | `<expected handling>` |

## 25. Unresolved / decision required

| `UNRESOLVED_DECISION_REQUIRED` item | Material user/business impact | Decision owner / evidence needed | Affected stories / gate |
|---|---|---|---|
| `<question or NONE>` | `<why it matters>` | `<human resolution>` | `<STOP affected work>` |

Record architecture/decision conflicts explicitly. Material undefined product behaviour is
`PRODUCT_DECISION_REQUIRED`; material open decisions cannot be treated as assumptions or silently
deferred to implementation.

## 26. Definition of Ready

For each story, verify that its section 9 fields are known and supported: Story ID, persona, business
outcome, journey, preconditions, acceptance scenarios, business rules, UX states, permission/resource
context, error/recovery, dependencies, explicit non-goals, data implications, security implications,
and architecture fit. Applicable `N/A` fields require reasons. **Open material decisions = NONE.**

| Story ID | Applicable fields complete / evidence | Open material decisions | Readiness / blocker |
|---|---|---|---|
| `US-<IMP>-NNN` | `<references>` | `<NONE or linked item>` | `<READY or NOT_READY_FOR_IMPLEMENTATION>` |

A story missing these conditions is `NOT_READY_FOR_IMPLEMENTATION`. Product Definition approval
precedes architecture fit/lock; final story readiness requires that fit before implementation.
Readiness labels are process checks, not ROADMAP lifecycle states. At completion apply the
[Definition of Done](../../PRODUCT-DELIVERY.md): every mandatory AC, applicable UX/security/
persistence/recovery/concurrency/accessibility/E2E proof, required Golden Journeys and regression,
documentation, and recorded deviations. `STORY_COMPLETE != IMP_ACCEPTED`.

## 27. Product Definition Gate

Complete the canonical gate with evidence references or a justified N/A. `PASS` requires no material
unresolved product decision or architecture conflict and complete applicable definition fields.
It is not architecture lock, implementation authorization, or IMP acceptance.

```text
PRODUCT_DEFINITION_GATE

Capability:
Product Definition Version:
Business Outcome:
Primary Personas:
Journeys Defined:
Story Map Complete:
Acceptance Slice Defined:
Happy Paths Defined:
Alternate Paths Defined:
Empty / First-Use States Defined:
Error / Recovery Paths Defined:
Authorization Variants Defined:
Cross-Scope Scenarios Defined:
Concurrency Considered:
Destructive Actions Defined:
UX State Matrix Complete:
Accessibility Considered:
Golden Journeys Identified:
Explicit Deferrals Recorded:
Unresolved Product Decisions:
Architecture Conflicts:
Gate Result: PASS / STOP
```
