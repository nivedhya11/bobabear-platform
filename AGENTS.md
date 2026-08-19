<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your
training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# BOBA Bear — Agent Execution Contract

This file is the **agent operating contract**. It points to canonical authorities; it is not an
independent roadmap, state, vision, or architecture authority.

Operating lifecycle:

```text
ANCHOR → GATE → EXECUTE → PROVE → ACCEPT → RECONCILE → ADVANCE
```

## Canonical authorities

| Question | Authority |
|---|---|
| Why / GTM outcome / Non-Goals | [`docs/platform/VISION.md`](docs/platform/VISION.md) |
| Durable global architecture | [`docs/platform/ARCHITECTURE.md`](docs/platform/ARCHITECTURE.md) |
| Which decisions are binding | [`docs/platform/decision-register.md`](docs/platform/decision-register.md) |
| IMP identity / sequence / GTM boundary | [`docs/platform/ROADMAP.md`](docs/platform/ROADMAP.md) |
| Independently accepted reality | [`docs/platform/STATE.md`](docs/platform/STATE.md) |
| Agent rules (this file) | `AGENTS.md` |
| Accepted foundation operating constraints | [`docs/platform/accepted-foundation-operating-rules.md`](docs/platform/accepted-foundation-operating-rules.md) (SUPPORTING) |

Historical / supporting platform docs are indexed in [`docs/platform/README.md`](docs/platform/README.md).
Older planning folders (wireframes, design-system drafts) are reference-only unless a CURRENT
authority says otherwise.

## Mandatory read order

1. `AGENTS.md` (this file)
2. `docs/platform/VISION.md`
3. `docs/platform/ROADMAP.md`
4. `docs/platform/STATE.md`
5. `docs/platform/ARCHITECTURE.md`
6. `docs/platform/decision-register.md`
7. Relevant ADRs / capability architecture
8. Current task specification
9. Relevant implementation code
10. Supporting foundation operating rules when touching accepted foundations

## Alignment gate

Before any source mutation, every implementation agent must verify and report:

```text
ALIGNMENT_GATE

Repository Authority: VERIFIED / CONFLICT
Vision Version: ...
Roadmap Version: ...
State Version: ...
Architecture Version: ...
Decision Register Version: ...
Accepted Through: ...
Current Product Slice: ...
Task Slice: ...
Task Capability: ...
Relevant Non-Goals: ...
Relevant ARCH-G Invariants: ...
Relevant Binding Decisions: ...
Task Assumptions: ...
Deferred Capabilities Touched: ...
Conflicts: ...
Unverified Material Facts: ...
Gate Result: PASS / STOP
```

Prompt values must be verified against canonical documents rather than repeated from memory.

## Stop statuses

| Status | Meaning |
|---|---|
| STRATEGY_CONFLICT | Task conflicts with VISION / Non-Goals |
| ROADMAP_CONFLICT | Task conflicts with ROADMAP identity/sequence |
| STATE_CONFLICT | Task conflicts with accepted STATE |
| STATE_CODE_CONFLICT | STATE claims materially contradict verified code |
| ARCHITECTURE_MISMATCH | Task conflicts with ARCHITECTURE / ARCH-G invariants |
| DECISION_CONFLICT | Task conflicts with a CURRENT decision |
| DECISION_REQUIRED | Gap needs a human decision; agent must not invent one |
| DECISION_REGISTER_INVALID | Decision register structurally unusable |
| REPOSITORY_AUTHORITY_CONFLICT | Wrong repo/branch/HEAD authority |
| SCOPE_CONFLICT | Requested change exceeds allowed scope |
| EVIDENCE_GAP | Required evidence cannot be produced |
| ENVIRONMENT_BLOCKER | Environment prevents required validation |

Material conflict affecting correctness means: **STOP AFFECTED WORK**. No “reasonable
interpretation” workaround.

## Decision boundary

Agents may make only local, reversible implementation decisions that do not change:

- public/domain contracts
- persistence authority
- security/auth semantics
- concurrency semantics
- roadmap scope
- provider policy
- architectural topology

Agents may **not** independently create: new domain authority, lifecycle states, actor models,
permission models, services, queues, retry semantics, financial policy, roadmap capabilities, or
global architecture. Such gaps produce `DECISION_REQUIRED`.

## Anti-hallucination vocabulary

```text
VERIFIED | KNOWN | INFERRED | ASSUMED | UNVERIFIED | NOT_FOUND | CONFLICT
```

Material correctness must not silently depend on `ASSUMED`, `UNVERIFIED`, or `CONFLICT`.
`NOT_FOUND` implies an appropriate search was performed.

## Scope rules

Implementation prompts must contain:

```text
MAY MODIFY
MAY MODIFY IF REQUIRED BY LOCKED ARCHITECTURE
MUST NOT MODIFY
EXPLICITLY OUT OF SCOPE
```

Require semantic scope, not only file paths. No opportunistic refactoring. Out-of-scope discoveries
are reported as `OUT_OF_SCOPE_OBSERVATION`, not automatically fixed.

## Status vocabulary

Coding agents may report only:

```text
COMPLETE | PARTIAL | BLOCKED
```

Agents must never self-report `COMPLETE_AND_ACCEPTED`.

## Session-close contract

Future implementation reports must contain:

```text
A. Agent Status
B. Alignment Gate
C. Repository Provenance
D. Scope Implemented
E. Files Changed
F. Architecture / Decision Compliance
G. Tests / Evidence
H. Security / Concurrency / Recovery Evidence as applicable
I. Prompt Deviations
J. Out-of-Scope Observations
K. Unverified Items
L. Proposed State Delta
M. Recommended Acceptance Gates
```

When true, state explicitly: `PROMPT DEVIATIONS: NONE`.

## Acceptance contract

Coding agent outcomes: `COMPLETE` | `PARTIAL` | `BLOCKED`.

Independent acceptance outcomes: `COMPLETE_AND_ACCEPTED` | `PARTIAL` | `DEFECT_FOUND` |
`ARCHITECTURE_MISMATCH` | `ACCEPTANCE_EVIDENCE_INSUFFICIENT`.

Implementation reports are evidence input, not acceptance authority.

### Acceptance principles

- provenance first
- architecture before tests
- evidence over claims
- negative security evidence where relevant
- real concurrency where race correctness matters
- crash/recovery evidence where relevant
- full regression where justified
- fingerprint / multi-round validation based on risk
- surgical corrections preferred over needless rebuilds

Gates need not be identical for every future slice.

## Canonical reconciliation rule

After a future IMP becomes `COMPLETE_AND_ACCEPTED`, a separate reconciliation step must update
applicable `STATE.md`, `ROADMAP.md`, acceptance record, and (if needed) `decision-register.md` /
`ARCHITECTURE.md`. Then run `npm run project:consistency`. Next-slice work must not begin while
canonical reconciliation is blocked.

## Capability architecture persistence

From IMP-024 onward, every substantial IMP must persist its complete locked capability architecture
in the repository before implementation begins. Missing historical architecture artifacts for
pre-governance accepted slices are historical gaps — they do not downgrade accepted implementation.

## Repository safety

- Do not commit, amend, or push unless the founder explicitly instructs that action.
- Do not run destructive Git operations (`reset`, `restore`, `clean`, `stash`, force checkout) unless
  explicitly instructed.
- Never destroy `boba-bear_postgres-data` or run `docker compose down --volumes`.
- Work from the WSL Linux filesystem for Turbopack/Docker reliability when developing; documentation
  authority path for this governance baseline is `/mnt/c/repos/boba-bear-website` when that is the
  declared authority.
- Coding-agent implementation prompts must remain below 50,000 characters; split slices if needed.
- Only one product slice is normally active; never start a slice whose dependencies are
  unresolved, except the documented GTM-R15 founder exception in ROADMAP/STATE: IMP-026C
  may proceed while IMP-026 remains `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`
  with deferred public HTTPS webhook debt. GTM-R19/R20 extend that governed continuation for
  IMP-027 architecture (`ARCHITECTURE_IN_PROGRESS` then `ARCHITECTURE_LOCKED`). GTM-R21 records
  explicit founder authorization for IMP-027 implementation (`IMPLEMENTATION_IN_PROGRESS`) under
  the locked capability artifact. GTM-R22 records IMP-027
  `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE` behind oldest pending acceptance IMP-026, while
  IMP-026 / IMP-026C remain unaccepted. GTM-R23 records explicit founder authorization for
  IMP-028 architecture activation (`ARCHITECTURE_IN_PROGRESS` only) while IMP-026 / IMP-026C /
  IMP-027 remain unaccepted. GTM-R24 records IMP-028 architecture lock (`ARCHITECTURE_LOCKED`)
  with implementation **NOT_AUTHORIZED**, binding **D-365**, while IMP-026 / IMP-026C / IMP-027
  remain unaccepted. GTM-R25 records explicit founder authorization for IMP-028 implementation
  (`IMP-028_IMPLEMENTATION_AUTHORIZED: YES`; `IMP-028_IMPLEMENTATION_STARTED: NO`) under that
  locked artifact and **D-365** / ARCH-G16, while IMP-026 / IMP-026C / IMP-027 remain unaccepted.
  GTM-R26 records IMP-028 implementation started (`IMP-028_IMPLEMENTATION_STARTED: YES`;
  lifecycle `IMPLEMENTATION_IN_PROGRESS`) under that locked artifact and authorization, while
  IMP-026 / IMP-026C / IMP-027 remain unaccepted.
  `pendingAcceptance` identifies the oldest unresolved formal acceptance gate (currently
  IMP-026); it does not mean a later authorized slice is still in progress. Formal acceptance
  remains contiguous. The exception does not accept IMP-026, accept IMP-026C, accept IMP-027,
  mark IMP-028 complete/accepted, activate
  IMP-029, or apply
  automatically to unrelated future slices.
- Platform docs under `docs/platform/` are canonical for product/architecture; treat older wireframe
  folders as historical unless CURRENT authority says otherwise.

## Foundation operating constraints

Slice-specific accepted operating rules (config, database, auth, cart, checkout, payment, order,
audits, etc.) live in
[`docs/platform/accepted-foundation-operating-rules.md`](docs/platform/accepted-foundation-operating-rules.md).
They are SUPPORTING constraints for agents touching those foundations. They must not redefine IMP
numbering or acceptance.
