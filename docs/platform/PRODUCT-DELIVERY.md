<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "PRODUCT_DELIVERY_PROCESS",
  "version": "PD-1",
  "effectiveFrom": "IMP-036F",
  "lastReviewed": "2026-09-07"
}
-->

# Product Delivery Operating Model

## Authority and prospective application

**USER OUTCOME FIRST.** This document owns how product work is defined and delivered: product
definition, story slicing, readiness, completion, journey completeness, explicit deferrals, and
the connection to architecture, verification, UAT, and agent handoffs.

It does not own roadmap sequence, accepted state, architecture, RBAC, or domain decisions.
[`VISION.md`](./VISION.md) owns why; [`ROADMAP.md`](./ROADMAP.md) owns identity, sequence, and
lifecycle; [`STATE.md`](./STATE.md) owns accepted/current reality;
[`product/`](./product/README.md) records personas, journeys, and story definitions;
[`ARCHITECTURE.md`](./ARCHITECTURE.md) owns technical invariants;
[`decision-register.md`](./decision-register.md) owns binding decisions;
[`TESTING.md`](./TESTING.md) owns how behaviour is proven; [`AGENTS.md`](../../AGENTS.md) owns
agent execution, safety, provenance, and promotion rules.

```text
PRODUCT_DELIVERY_PROCESS_EFFECTIVE_FROM = IMP-036F
HISTORICAL_ACCEPTED_IMPS_REWRITTEN = NO
IMP036E_LIFECYCLE_CHANGED = NO
IMP036F_ACTIVATED = NO
```

PD-1 is mandatory for new substantial product work beginning with IMP-036F. A per-IMP Product
Definition is required using the [template](./product/templates/product-definition-template.md).
IMP-036E continues under its existing lifecycle; accepted IMPs are not rewritten or reopened by
this policy. These adoption markers do not replace future ROADMAP/STATE lifecycle authority.
Engineering-only changes with no product behaviour change may remain specification-driven.

A **Journey Gap Audit** of previously implemented product journeys is required before public GTM
cutover / IMP-040 acceptance. Session 1 establishes that requirement; it does not perform the audit.
The audit must surface gaps and proposed follow-ups without retroactively changing acceptance or
silently authorizing implementation.

## Outcome hierarchy and discovery

```text
BUSINESS OUTCOME → PERSONA → JOURNEY → ACTIVITY → USER STORY → ACCEPTANCE SCENARIO
→ ARCHITECTURE FIT → IMPLEMENTATION → TEST EVIDENCE → FOUNDER UAT → ACCEPTANCE
```

Begin with the business outcome and the person's job, context, and observable success. Describe
the current journey from repository evidence and distinguish supported behaviour, planned intent,
and unknowns. Define the desired journey before choosing technical mechanisms. Personas describe
human/business responsibility; `PERSONA != ROLE`, `PERSONA != PERMISSION`, and
`PERSONA != AUTHORIZATION`. Permission and resource context must cite existing authority.

Map journeys into ordered activities, then stories under each activity. Slice vertically so the
acceptance slice delivers a useful, observable outcome through the applicable UI, application,
domain, and persistence boundaries. A technical component alone is not proof of a user outcome.
Do not expand the authorized capability to complete unrelated journeys.

## Delivery process

```text
ANCHOR → DISCOVER → STORY_MAP → PRODUCT_DEFINITION_GATE → ARCHITECTURE_FIT
→ IMPLEMENT → PROVE → INDEPENDENT_REVIEW → FOUNDER_UAT (when required)
→ ACCEPT → RECONCILE → ADVANCE
```

These are **delivery process phases**, not new ROADMAP lifecycle states. Existing canonical
lifecycle markers, authorization, independent technical acceptance, deployment, and Founder UAT
gates remain authoritative. A phase transition never grants push, PR, merge, or deployment authority.

| Phase | Required result |
|---|---|
| ANCHOR | Verify repository candidate, canonical versions, current slice, dependencies, and authorized scope. |
| DISCOVER | Establish outcome, personas, current/desired journeys, evidence, and material questions with the product decision owner. |
| STORY_MAP | Map activities and stories; identify the acceptance slice and classify every identified possibility. |
| PRODUCT_DEFINITION_GATE | Record PASS or STOP on the versioned Product Definition; no material product decision remains unresolved. |
| ARCHITECTURE_FIT | Check product behaviour against global/capability architecture and binding decisions; persist required capability architecture lock before implementation. |
| IMPLEMENT | Implement only authorized stories that satisfy Definition of Ready. |
| PROVE | Map each mandatory acceptance scenario to meaningful behavioural evidence under TEST-1. |
| INDEPENDENT_REVIEW | Review the relevant slice for story completeness, architecture compliance, and evidence; resolve defects through revalidation. |
| FOUNDER_UAT (when required) | After independent technical acceptance and authorized UAT deployment, the founder exercises the exact candidate under AGENTS provenance rules. |
| ACCEPT | Obtain applicable independent acceptance and founder verdicts; coding-agent completion is not acceptance authority. |
| RECONCILE | Separately update applicable canonical state/roadmap/acceptance records and run `npm run project:consistency`. |
| ADVANCE | Proceed only when reconciliation and the next slice's authorization/dependency gates permit it. |

Architecture remains authoritative for technical, security, and data invariants. It **must not
invent missing product behaviour**. A Product Definition must not silently override global
architecture, security, financial or persistence authority, concurrency semantics, accepted STATE,
or binding decisions. Stop affected work for human resolution on conflict. Undefined material
user/business behaviour that cannot be inferred produces `PRODUCT_DECISION_REQUIRED`; an architecture
agent cannot resolve it by choosing product behaviour. Token savings never justify guessing.

## Product Definition and scenarios

Persist the per-IMP Product Definition in the [product artifact index](./product/README.md), using
all applicable template sections. Record its identity, version, author/reviewer evidence, source
authorities, and gate outcome. An unfilled template is not an approved definition. Product approval
does not itself authorize implementation or supersede architecture.

Stories use stable IDs and this form:

```text
As a <persona>
I want <goal>
so that <business/user outcome>.
```

Acceptance scenarios use stable AC IDs linked to their story, preconditions, action, and observable
result (Given / When / Then is preferred). Cover happy paths and applicable alternate, denial,
empty, error, and recovery paths. State visible outcomes and business effects, not function names,
table layouts, or component implementation. Link business rules and resource scope. Define data
fixtures/context and pass/fail expectations precisely enough for independent verification.

Maintain traceability from outcome → journey/activity → story → AC/business rule → architecture
fit → evidence → required Golden Journey / UAT evidence. When product behaviour or the acceptance
slice changes materially, version the definition, revisit the product gate and architecture fit,
and revalidate affected scenarios before relying on prior evidence.

## Product Definition Gate

Every applicable field needs a concrete answer or evidence link. `N/A` needs a brief reason.

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

PASS requires complete applicable product definition, no material unresolved product decision, and
no unresolved architecture conflict. A required unanswered field is STOP. Record who approved the
product definition and which version passed. Product-gate PASS precedes, and does not substitute
for, architecture fit/lock or implementation authorization.

## Definition of Ready

A story may enter implementation only when applicable fields are known and traceable:

- Story ID, persona, business outcome, journey, and preconditions.
- Acceptance scenarios, business rules, UX states, and error/recovery behaviour.
- Permission/resource context, dependencies, and explicit non-goals.
- Data implications, security implications, and architecture fit.
- Open material decisions = NONE.

Explain inapplicable fields. A story failing readiness is `NOT_READY_FOR_IMPLEMENTATION` (a story
readiness result, not an IMP lifecycle state). The Product Definition Gate, required architecture
lock, and authorized implementation scope must also be satisfied.

## Journey Completeness Matrix and UX states

Every Product Definition must assess each row below and map it to stories/ACs, explicit deferrals,
or `N/A` with a brief reason. No blank row silently means out of scope.

| Dimension | Required consideration |
|---|---|
| ENTRY | How the person starts, including direct links. |
| DISCOVERY | How they find the action or information. |
| CONTEXT | Identity, outlet/resource selection, and retained context. |
| EMPTY / FIRST USE | No existing data and initial setup. |
| HAPPY PATH | Expected successful outcome. |
| ALTERNATE VALID PATHS | Other supported ways to achieve it. |
| VALIDATION FAILURE | Invalid input and actionable correction. |
| AUTHORIZATION | Material allow/deny and cross-scope variants. |
| NOT FOUND / STALE REFERENCE | Missing, removed, or inaccessible context. |
| SERVER / NETWORK ERROR | Clear failure without false success. |
| RECOVERY | Retry/resume/reconciliation allowed by existing authority. |
| CONCURRENCY | Competing changes, stale state, and duplicate actions. |
| DESTRUCTIVE ACTION | Confirmation, consequences, and cancellation of the action. |
| SUCCESS FEEDBACK | Visible confirmation and next action. |
| DOWNSTREAM EFFECT | Consequences for related capabilities and people. |
| REVISIT / RELOAD | Durable results and safe restoration of context. |
| RESPONSIVE / MOBILE | Applicable screen sizes and input conditions. |
| ACCESSIBILITY | Keyboard, focus, names, announcements, and usable feedback. |

The separate UX state matrix maps each surface/action to loading, empty/first-use, ready, submitting,
success, validation error, denied, not-found/stale, server/network error, and recovery states as
applicable. Include destructive confirmation, focus behaviour, and responsive expectations. Each
required state links to observable scenarios; unsupported states need an explicit reason.

## Slicing and explicit deferrals

Use these slice classifications without creating roadmap lifecycle states:

| Classification | Meaning |
|---|---|
| V1_ACCEPTANCE_SLICE | Mandatory stories/scenarios for this capability's acceptance. |
| FOLLOW_UP | Identified later increment; requires its own authorized scope before implementation. |
| DEFERRED | Outside this acceptance slice; no implicit schedule or authorization. |

Every identified possibility must also have one disposition:

| Disposition | Required record |
|---|---|
| SUPPORTED_NOW | Defined support in the current acceptance slice; distinguish existing proven behaviour from implementation/proof pending and cite the relevant story/evidence. This classification is not an acceptance claim. |
| EXPLICITLY_DEFERRED | What is excluded, why, user/journey impact, and revisit dependency or owner. |
| NOT_SUPPORTED_BY_DESIGN | Explicit product rationale and relevant authority. |
| UNRESOLVED_DECISION_REQUIRED | Question, impact, and human decision owner; material uncertainty blocks the affected gate/story. |

Slice classification and disposition answer different questions: what is mandatory for this
acceptance, and what support is intended or excluded. Record implementation/evidence status
separately so planned support cannot masquerade as accepted reality. A missing product decision
remains `UNRESOLVED_DECISION_REQUIRED`. There is no silent deferral or invented accepted promise.

## Definition of Done and acceptance

A story is complete only when applicable evidence shows:

- Implementation complete and every mandatory AC proven; required UX states complete.
- Authorization positive and negative proof; persistence proof where relevant.
- Error/recovery proof and concurrency proof where relevant.
- Accessibility and relevant browser E2E proof.
- Affected required Golden Journeys and relevant regression pass.
- Documentation and traceability updated; no undocumented deviation.

Use [`TESTING.md`](./TESTING.md) for layer selection, behavioural coverage, flake handling, and
evidence. Explain any inapplicable proof. The Product Definition identifies mandatory journeys from
the [Golden Journey registry](./product/golden-journeys.md); the registry alone does not add scope.

`STORY_COMPLETE != IMP_ACCEPTED`. IMP implementation complete requires every mandatory story in
the acceptance slice plus affected required Golden Journeys. `COMPLETE_AND_ACCEPTED` continues to
require independent acceptance, Founder UAT where mandated, and canonical reconciliation. Record
`FOUNDER_UAT_REQUIRED = YES | NO` with rationale; only the founder supplies the interactive verdict.
Exact-candidate and Podman staging requirements remain in AGENTS. A local green run is not UAT.

## AI execution and documentation efficiency

**MINIMUM_SUFFICIENT_CONTEXT** means enough verified authority to perform and review the bounded
task, with no repeated unrelated history. Prompts should carry task/story IDs, exact authority
versions / SHA / tree (and working-tree fingerprint where required), acceptance criteria, affected
invariants, allowed/forbidden scope, and expected evidence. Reference canonical repository paths
instead of pasting whole documents.

Do not repeatedly paste whole ROADMAP, STATE, ARCHITECTURE, governance history, prior accepted
reports, or unrelated capability architecture. For large authorities, verify metadata/version,
search targeted terms, and read relevant sections/ranges while still proving applicable authority.
Preserve AGENTS' hard prompt-size ceiling and all safety/provenance requirements.

First review covers the full relevant slice. Follow-up review covers previous approved SHA → new
SHA, changed files, affected invariants, and new evidence; include content fingerprints for
uncommitted candidates. Widen review when the change affects previously approved assumptions.
Reports return **changed facts, evidence, exceptions, SHA/tree, and unresolved items**, preserving
required reporting fields without repeating unchanged history.

Bundle authorized machine work until the next genuine human decision boundary:

```text
implement → focused tests → relevant regression → validation → commit → return once
```

When each applicable promotion action is authorized, continue through push → PR → wait for
exact-head CI → return once. Push authorization alone does not authorize PR creation, merge, or
deployment; independent promotion gates remain in force. Context efficiency never permits guessed
product, security, or business decisions. Keep durable definitions and evidence links in their
canonical artifacts; record material deviations explicitly and reconcile only through authorized
governance gates.
