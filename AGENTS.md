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
- Work from the WSL Linux filesystem for Turbopack/Docker reliability when developing.
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
  GTM-R30 records IMP-028 `COMPLETE_AND_ACCEPTED` (`IMP-028_ACCEPTED: YES`;
  `acceptedThrough = IMP-028`; `pendingAcceptance = NONE`; `currentProductSlice = NONE`;
  `nextProductSlice = IMP-029`). Formal acceptance of IMP-028 does **not** authorize or start
  IMP-029 (`IMP-029_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-029_STARTED: NO`).
  GTM-R34 records canonical activation of IMP-028A — Food Direct UX Foundation
  (`currentProductSlice = IMP-028A`; `PLANNED` / `NOT_STARTED` / `NOT_AUTHORIZED`; architecture
  `NOT_LOCKED`; `IMP-028A_IMPLEMENTATION_AUTHORIZED: NO`; `IMP-028A_IMPLEMENTATION_STARTED: NO`)
  without retargeting IMP-029, creating `D-371`, or authorizing Food Direct implementation.
  GTM-R35 records IMP-028A capability-local architecture lock and implementation authorization
  (`ARCHITECTURE_LOCKED`; `IMP-028A_IMPLEMENTATION_AUTHORIZED: YES`;
  `IMP-028A_IMPLEMENTATION_STARTED: NO`) without starting product implementation, creating
  `D-371`, retargeting IMP-029, or activating Food Direct families B–F.
  GTM-R36 records IMP-028A `IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE`
  (`IMP-028A_IMPLEMENTATION_STARTED: YES`; `IMP-028A_IMPLEMENTATION_COMPLETE: YES`;
  `pendingAcceptance = IMP-028A`) without accepting IMP-028A, creating `D-371`, retargeting
  IMP-029, or activating Food Direct families B–F.
  GTM-R37 records IMP-028A `COMPLETE_AND_ACCEPTED` (`IMP-028A_ACCEPTED: YES`;
  `acceptedThrough = IMP-028A`; `pendingAcceptance = NONE`; `currentProductSlice = NONE`;
  `nextProductSlice = IMP-029`) and does **not** authorize or start IMP-029, implement
  D-368 / D-369 / D-370, create `D-371`, or activate Food Direct families B–F.
  `pendingAcceptance` identifies the oldest unresolved formal acceptance gate (currently
  NONE); it does not mean a later authorized slice is still in progress. Formal acceptance
  remains contiguous. The GTM-R15–R26 exception does not accept IMP-026, accept IMP-026C, accept
  IMP-027, mark IMP-028 complete/accepted, activate
  IMP-029, or apply
  automatically to unrelated future slices. Those predecessor acceptances were recorded by later
  dedicated reconciliations (GTM-R27/R28/R29/R30/R37), not by the exception itself.
- Platform docs under `docs/platform/` are canonical for product/architecture; treat older wireframe
  folders as historical unless CURRENT authority says otherwise.

## Canonical development repository (operational)

This section is an **operational / agent** rule. It is not a product architecture invariant and
does not change VISION, ROADMAP, STATE, ARCHITECTURE, or the decision register.

```text
PLATFORM_NAME = BOBA Bear Platform
CANONICAL_REPOSITORY_PATH = /home/ajoshi/repos/boba-bear-platform
DEFAULT_DEVELOPMENT_BRANCH = main
```

- `/home/ajoshi/repos/boba-bear-platform` is the sole BOBA Bear Platform development authority.
- Perform work on `main` unless the user explicitly authorizes another branch.
- Do not create additional Git worktrees.
- Do not create duplicate BOBA development clones.
- Do not use `/mnt/c` as development repository authority.
- Keep development in the WSL/Linux filesystem under `/home/ajoshi/repos`.
- Preserve intentional dirty-tree work according to existing repository rules.
- Never reset, stash, or clean unrelated work.
- Do not commit or push without explicit authorization.

## Working-tree fingerprint

Canonical command: `npm run working-tree:fingerprint` (`scripts/working-tree-fingerprint.mjs`).

`WORKING_TREE_FINGERPRINT` is **content-sensitive** across tracked working-tree files and
non-ignored untracked repository files (paths and contents). It is deterministic, path-sensitive,
and order-independent with respect to filesystem enumeration. It respects `.gitignore`. It does
not hash `.git` object-database bytes, `.git` logs, the `.git/index` file, `node_modules`, or
other ignored/build outputs.

Do not substitute `git status --porcelain | sha256sum` (or hashing porcelain paths only when they
are files). Default porcelain reports an already-untracked directory as one entry, so edits or
additions underneath that directory do not change a porcelain-only hash and are not exact-content
authority.

`npm run project:consistency` emits the current content-sensitive fingerprint as an informational
finding. `npm run governance:fingerprint` remains a separate canonical-document manifest hash.

## Founder UAT and exact-candidate acceptance gate

This section is an **operational / agent** rule. It does not itself change product acceptance
status in `ROADMAP.md` or `STATE.md`; it governs how future acceptance evidence must be produced
when founder UAT is required.

- For any capability that materially changes customer-visible behavior, materially changes
  operator-visible behavior needing interactive validation, is explicitly marked `FOUNDER_UAT_REQUIRED
  = YES`, or is requested by the founder for UAT, final canonical acceptance requires a separate
  founder UAT gate in addition to independent technical acceptance.
- Required lifecycle for those capabilities:

```text
IMPLEMENTATION_COMPLETE
→ INDEPENDENT_TECHNICAL_ACCEPTANCE
→ UAT_DEPLOYMENT
→ FOUNDER_UAT
→ ACCEPTANCE_RECONCILIATION
```

- `COMPLETE_AND_ACCEPTED` must not be claimed, and `acceptedThrough` must not advance through that
  capability, until the required founder UAT gate has passed and reconciliation records it.
- Founder UAT must exercise the **exact** implementation candidate that passed independent technical
  acceptance. Candidate identity must include at minimum:

```text
CANONICAL_REPOSITORY_PATH
BRANCH
HEAD
WORKING_TREE_FINGERPRINT
```

- `WORKING_TREE_FINGERPRINT` is mandatory provenance because BOBA development may intentionally
  validate uncommitted but authorized working-tree content. `HEAD` alone is insufficient proof of
  UAT provenance.
- Before any UAT deployment, verify canonical repository path, branch, `HEAD`, and content-sensitive
  working-tree fingerprint, and confirm they exactly match the independently accepted candidate. If
  any of those differ, UAT deployment must stop and the modified candidate must return through the
  applicable validation and technical-acceptance gates before founder UAT.
- When founder UAT is required, the current approved interactive deployment surface is the existing
  Docker Desktop / Compose runtime from the canonical repository. Build from the exact accepted
  working tree, including authorized uncommitted changes. Do not deploy from an older clone, from
  `/mnt/c`, from remote `HEAD` alone, or from a stale already-running image as evidence.
- UAT deployment evidence must identify the source candidate and the deployed artifact as far as
  current tooling allows, including source repository, branch, `HEAD`, fingerprint, image name,
  image ID/digest when available, container identity, deployment health, and the exact UAT URL.
- The UAT image used for founder validation must be freshly built during the UAT deployment
  operation using the repository's actual Docker/Compose architecture. A stale pre-existing image is
  not sufficient UAT evidence.
- After deployment, verify the running service is actually using the newly built image. If the
  deployed image ID does not match the running container image ID, founder UAT must not proceed.
- Only the founder/user may provide the final interactive UAT verdict. Implementation agents must
  never self-declare `FOUNDER_UAT = PASS`.
- Governance-only, documentation-only, architecture-definition, repository-maintenance, and internal
  tooling tasks with no interactive acceptance surface do not automatically require Docker/founder
  UAT. Record applicability explicitly as `FOUNDER_UAT_REQUIRED = YES | NO` in the relevant future
  acceptance evidence.
- Current applicability: **IMP-028B — Customer Menu Projection + Discovery** is
  `FOUNDER_UAT_REQUIRED = YES` before `COMPLETE_AND_ACCEPTED` because it materially changes customer
  `/order`, Menu serving, category navigation, product-card/display-price presentation, and the Add
  / Cart customer flow. Independent technical acceptance alone is insufficient for final acceptance
  of IMP-028B.

## Foundation operating constraints

Slice-specific accepted operating rules (config, database, auth, cart, checkout, payment, order,
audits, etc.) live in
[`docs/platform/accepted-foundation-operating-rules.md`](docs/platform/accepted-foundation-operating-rules.md).
They are SUPPORTING constraints for agents touching those foundations. They must not redefine IMP
numbering or acceptance.
