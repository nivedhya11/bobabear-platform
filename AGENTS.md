<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your
training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code.
Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# BOBA Bear — Agent Execution Contract

This file is the **sole agent operating contract**. It points to canonical authorities; it is not an
independent roadmap, state, vision, or architecture authority. Do not create a competing governance
document or duplicate rule source. `CLAUDE.md` delegates here.

Product delivery process for new substantial product work from IMP-036F onward:

```text
ANCHOR → DISCOVER → STORY_MAP → PRODUCT_DEFINITION_GATE → ARCHITECTURE_FIT
→ IMPLEMENT → PROVE → INDEPENDENT_REVIEW → FOUNDER_UAT (when required)
→ ACCEPT → RECONCILE → ADVANCE
```

These are delivery process phases, not new ROADMAP lifecycle states. The canonical method is
[`PRODUCT-DELIVERY.md`](docs/platform/PRODUCT-DELIVERY.md). IMP-036E and earlier retain their
existing lifecycle (`ANCHOR → GATE → EXECUTE → PROVE → ACCEPT → RECONCILE → ADVANCE`).

```text
PRODUCT_DELIVERY_PROCESS_EFFECTIVE_FROM = IMP-036F
HISTORICAL_ACCEPTED_IMPS_REWRITTEN = NO
IMP036E_LIFECYCLE_CHANGED = NO
PD1_DID_NOT_ACTIVATE_IMP036F_AT_ADOPTION = YES
```

PD-1 did not itself activate IMP-036F when introduced. IMP-036F activation is governed by CURRENT
[`ROADMAP.md`](docs/platform/ROADMAP.md) / [`STATE.md`](docs/platform/STATE.md)
(`IMP036F_ACTIVATED`). Read current lifecycle truth only from those authorities.

## Canonical authorities

| Question | Authority |
|---|---|
| Why / GTM outcome / Non-Goals | [`docs/platform/VISION.md`](docs/platform/VISION.md) |
| Durable global architecture | [`docs/platform/ARCHITECTURE.md`](docs/platform/ARCHITECTURE.md) |
| Which decisions are binding | [`docs/platform/decision-register.md`](docs/platform/decision-register.md) |
| IMP identity / sequence / GTM boundary | [`docs/platform/ROADMAP.md`](docs/platform/ROADMAP.md) |
| Independently accepted reality | [`docs/platform/STATE.md`](docs/platform/STATE.md) |
| How product work is defined/delivered | [`docs/platform/PRODUCT-DELIVERY.md`](docs/platform/PRODUCT-DELIVERY.md) |
| Personas / journeys / per-IMP stories | [`docs/platform/product/README.md`](docs/platform/product/README.md) and relevant Product Definition |
| How behaviour is proven | [`docs/platform/TESTING.md`](docs/platform/TESTING.md) |
| Agent rules (this file) | `AGENTS.md` |
| Accepted foundation operating constraints | [`docs/platform/accepted-foundation-operating-rules.md`](docs/platform/accepted-foundation-operating-rules.md) (SUPPORTING) |

Historical / supporting platform docs are indexed in [`docs/platform/README.md`](docs/platform/README.md).
Older planning folders (wireframes, design-system drafts) are reference-only unless a CURRENT
authority says otherwise. Canonical docs remain authoritative over conversational restatement.

## Mandatory read order

For IMP-036F onward:

1. `AGENTS.md` (this file)
2. `docs/platform/VISION.md`
3. `docs/platform/ROADMAP.md`
4. `docs/platform/STATE.md`
5. `docs/platform/PRODUCT-DELIVERY.md`
6. Relevant per-IMP Product Definition under `docs/platform/product/`
7. `docs/platform/ARCHITECTURE.md`
8. `docs/platform/decision-register.md`
9. Relevant capability architecture / ADRs
10. `docs/platform/TESTING.md`
11. Current task specification and relevant implementation code
12. Supporting foundation operating rules when touching accepted foundations

For IMP-036E and earlier, retain the existing authority order by omitting the new process,
Product Definition, and testing-policy steps where `N/A — PRE-PD-1` applies. Engineering-only
changes without product behaviour changes may remain specification-driven. For large authorities,
metadata/version verification, targeted search, and relevant section/range reads satisfy this
order when they prove applicable authority; whole-document repasting is not required.

## Operating planes

```text
PLANNING / GOVERNANCE / CONTROL  = Human + designated planning/governance agent (currently ChatGPT)
EXECUTION                        = Coding agent
DURABLE VERIFICATION             = GitHub / CI
CONSEQUENTIAL TRANSITIONS        = Human only (R3)
```

Autonomy never permits guessed product, security, payment, or business decisions. Escalation is by
decision/risk boundary, not every Git command.

## Risk-bounded autonomy

| Level | Name | Autonomy |
|---|---|---|
| **R0** | `READ/ANALYZE` | Autonomous read, search, diagnosis, and analysis. No source mutation. |
| **R1** | `BOUNDED_ENGINEERING` | Implementation agent owns inspect → plan → edit → test → diagnose → same-scope repair → validate within authorized scope. Do not stop for every newly exposed same-class defect inside that scope. Use compact R1 alignment and completion reporting. |
| **R2** | `CONTRACT_SENSITIVE` | Product behaviour, public/domain contracts, payment, auth/security, persistence authority / schema strategy, concurrency semantics, provider policy, architecture/topology. Investigate autonomously; implement only when intended binding semantics are explicitly defined by canonical authority and the current authorized task; stop before inventing undefined binding behaviour or resolving canonical conflicts by assumption. Independent review required before R3 promotion/merge/acceptance. Full alignment and session-close reporting. |
| **R3** | `CONSEQUENTIAL` | Merge; deployment/release; production or destructive data operations; force push / history rewrite; lifecycle or product acceptance; Founder UAT verdict. Require explicit human authorization. |

### Risk escalation

- The task contract declares the initial risk level.
- The implementation agent may **raise** the risk classification when repository evidence requires it.
- The implementation agent may **not** silently downgrade the declared risk.
- If only part of the task crosses into a higher-risk or undefined boundary, stop affected work and
  continue safe authorized work where practical.

### Task-contract precedence

Task contracts may narrow agent scope or authority, including `NO_COMMIT`, but may not silently
downgrade R2/R3 safeguards or override canonical product, architecture, security, financial,
persistence, or lifecycle authority. Such overrides require the applicable explicit human or
canonical decision.

### Delivery mode (R1 and R2)

Task contracts may authorize either:

```text
DELIVERY_MODE=LOCAL_ONLY
DELIVERY_MODE=PUBLISH_PR
```

`DELIVERY_MODE` applies to both R1 and R2. Neither mode authorizes R3 actions.

- `LOCAL_ONLY` — in one run: inspect → implement → test → diagnose/self-correct → validate →
  local commit(s) → return once. A task-specific `NO_COMMIT` instruction may narrow this and forbid
  local commits. `NO_COMMIT` means no commit may be created and is compatible only with
  `LOCAL_ONLY` / unpublished work.
- `PUBLISH_PR` — in one run: inspect → implement → test → diagnose/self-correct → validate →
  commit(s) containing the task changes → create/use a short-lived task branch from the verified
  base when a suitable task branch is not already specified → normal push of that branch →
  PR creation → wait for exact-head PR CI to reach a terminal state → report the final CI outcome →
  return once. Ordinary task commits must **not** be published directly to `main`.
  `PUBLISH_PR` requires at least one commit containing the task changes. Returning while
  exact-head PR CI has merely started or is still pending is not permitted.

`NO_COMMIT` + `PUBLISH_PR` is a task-contract conflict: **STOP** rather than silently choosing one
constraint or weakening either. Do not invent a hybrid (for example push/PR without a commit).

When `DELIVERY_MODE` is unset, treat remote publication (push/PR) as unauthorized. Local commits
remain permitted for authorized R1/R2 engineering unless `NO_COMMIT` is set.

### Agent ownership

- One implementation agent normally owns the write path for a task.
- Multi-agent use is for genuinely parallel investigation or independent evaluation — not mandatory
  decomposition of ordinary coding.
- Same-scope implementation choices are delegated to the coding agent within authorized R1/R2 scope.
- Prefer repository / commit / PR / CI artifacts over large conversational evidence dumps.
- Reviewers should independently inspect GitHub rather than asking the implementation agent to
  restate independently observable facts.

### Failure evidence and retries

Aligned with [`TESTING.md`](docs/platform/TESTING.md) (TEST-1):

- Preserve the initial failure.
- Never present silent retries as proof of correctness.
- Diagnostic reruns after investigation are allowed when the original failure, diagnostic purpose,
  and result remain distinguishable.
- Same-scope repair + validation remains autonomous within authorized risk/delivery mode.

## Alignment gate

Before any source mutation, every implementation agent must verify alignment against canonical
authorities.

A passing alignment gate is **not** a human approval checkpoint. The agent verifies it before
mutation and continues autonomously. Return/control handoff is required only if the gate fails or
another escalation boundary is reached.

### Compact R1 alignment

For ordinary R1 bounded engineering, report only:

```text
ALIGNMENT_GATE (R1 compact)

Repository / Branch / HEAD: ...
Task: ...
Risk Level: R1
DELIVERY_MODE: LOCAL_ONLY | PUBLISH_PR | UNSET
Applicable Authorities Checked: ...
Semantic Scope: ...
Conflicts / Unverified Material Facts: ...
Gate Result: PASS / STOP
```

### Full alignment (R2 / R3 / elevated)

Use the full template for R2, R3, product-visible delivery, architecture-sensitive work, or when
material conflict risk requires it:

```text
ALIGNMENT_GATE

Repository Authority: VERIFIED / CONFLICT
Repository / Branch / HEAD: ...
Vision Version: ...
Roadmap Version: ...
State Version: ...
Architecture Version: ...
Decision Register Version: ...
Product Delivery Version: ...
Product Definition: ...
Stories: ...
Acceptance Scenarios: ...
Golden Journeys: ...
Testing Policy: ...
Accepted Through: ...
Current Product Slice: ...
Task Slice: ...
Task Capability: ...
Relevant Non-Goals: ...
Relevant ARCH-G Invariants: ...
Relevant Binding Decisions: ...
Task Assumptions: ...
Deferred Capabilities Touched: ...
Semantic Scope: ...
Conflicts: ...
Unverified Material Facts: ...
Risk Level: R0 | R1 | R2 | R3
DELIVERY_MODE: LOCAL_ONLY | PUBLISH_PR | UNSET
Gate Result: PASS / STOP
```

Prompt values must be verified against canonical documents rather than repeated from memory.
The six product-delivery fields apply prospectively; `N/A — PRE-PD-1` is valid where appropriate
for IMP-036E and earlier. Product-visible implementation from IMP-036F requires a passed
Product Definition Gate, story Definition of Ready, architecture fit/lock, and implementation
authorization. Story completion does not constitute IMP acceptance.

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
| PRODUCT_DECISION_REQUIRED | Material user/business behaviour is undefined and cannot be inferred; stop for a human product decision |
| DECISION_REGISTER_INVALID | Decision register structurally unusable |
| REPOSITORY_AUTHORITY_CONFLICT | Wrong repo/branch/HEAD authority |
| SCOPE_CONFLICT | Requested change exceeds allowed scope |
| EVIDENCE_GAP | Required evidence cannot be produced |
| ENVIRONMENT_BLOCKER | Environment prevents required validation |

Material conflict affecting correctness means: **STOP AFFECTED WORK**. No “reasonable
interpretation” workaround.

## Decision boundary

Within R1 and locked task scope, agents may make local, reversible implementation decisions that do
not change binding semantics.

R2 work may implement contract-sensitive behaviour only when the intended binding semantics are
explicitly defined by canonical authority and the current authorized task. Agents must stop before:

- inventing undefined binding behaviour
- resolving canonical conflicts by assumption
- materially changing authority beyond the authorized contract

Surfaces that remain R2-sensitive (implement only when explicitly defined and authorized; otherwise
stop / escalate):

- public/domain contracts
- persistence authority or schema strategy
- security/auth semantics
- concurrency semantics
- roadmap scope
- provider policy
- architectural topology
- new domain authority, lifecycle states, actor models, permission models, services, queues, retry
  semantics, financial/payment policy, or global architecture

Undefined gaps produce `DECISION_REQUIRED` or `PRODUCT_DECISION_REQUIRED`. Architecture agents must
not resolve `PRODUCT_DECISION_REQUIRED` by inventing product behaviour. A Product Definition must
not silently override global architecture, security/financial/persistence authority, concurrency
semantics, accepted STATE, or binding decisions. Stop affected work on conflict for human
resolution. R2 still requires independent review before R3 promotion, merge, or acceptance.

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

## Session-close / completion reporting

Prefer compact deltas, paths, SHAs, CI URLs, and fingerprints over restating capability history or
independently observable GitHub facts.

### Compact R1 completion report

For ordinary R1 bounded engineering:

```text
STATUS: COMPLETE | PARTIAL | BLOCKED
Repository / Branch / Final HEAD: ...
Scope / Files Changed: ...
Validation / CI: ...
Deviations: ... | PROMPT DEVIATIONS: NONE
Out-of-Scope Observations: ...
Unresolved Items: ...
Delivery Artifact: local commit(s) | PR URL | NONE (NO_COMMIT) | ...
Risk Level / DELIVERY_MODE: ...
```

### Full session-close report

Use for R2, R3, and substantial product / lifecycle / architecture-sensitive work:

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
N. Risk Level / DELIVERY_MODE
O. Delivery Artifact (local commit(s) / PR)
```

When true, state explicitly: `PROMPT DEVIATIONS: NONE`.

## Acceptance contract

Coding agent outcomes: `COMPLETE` | `PARTIAL` | `BLOCKED`.

Independent acceptance outcomes: `COMPLETE_AND_ACCEPTED` | `PARTIAL` | `DEFECT_FOUND` |
`ARCHITECTURE_MISMATCH` | `ACCEPTANCE_EVIDENCE_INSUFFICIENT`.

Implementation reports are evidence input, not acceptance authority. Lifecycle and product
acceptance remain R3 (human).

For prospective story delivery, follow [`PRODUCT-DELIVERY.md`](docs/platform/PRODUCT-DELIVERY.md)
and [`TESTING.md`](docs/platform/TESTING.md) for readiness, completion, and behavioural evidence.
A Journey Gap Audit of previously implemented product journeys is required before public GTM
cutover / IMP-040 acceptance. Session 1 establishes the requirement; it does not perform the audit
or rewrite historical acceptance.

### AI context and handoff efficiency

Apply **MINIMUM_SUFFICIENT_CONTEXT** from
[`PRODUCT-DELIVERY.md`](docs/platform/PRODUCT-DELIVERY.md#ai-execution-and-documentation-efficiency).
Prompts should include task/story IDs, risk level, `DELIVERY_MODE`, any `NO_COMMIT` narrowing,
exact authority versions / SHA / tree, acceptance criteria, affected invariants,
allowed/forbidden scope, and expected evidence; include the working-tree fingerprint wherever
existing provenance rules require it. Prefer canonical paths to pasted docs.

**CURRENT FIRST:** read [`docs/platform/ROADMAP.md`](docs/platform/ROADMAP.md) and
[`docs/platform/STATE.md`](docs/platform/STATE.md) for lifecycle authority.

**HISTORY ON DEMAND:** read [`docs/platform/history/`](docs/platform/history/) only when the task
materially requires historical revision, acceptance, or provenance detail. Agents MUST NOT load
complete historical snapshots during ordinary current product work. Historical snapshots do not
override CURRENT metadata.

Do not repeatedly paste whole ROADMAP, STATE, ARCHITECTURE, governance history, prior accepted
reports, or unrelated capability architecture. Verify metadata/versions, search, and read relevant
sections/ranges without guessing applicable authority. Coding-agent implementation prompts must
remain below 50,000 characters; split slices if needed.

First review covers the full relevant slice. Follow-up review covers previous approved SHA → new
SHA, changed files, affected invariants, and new evidence (including required content fingerprints).
Widen review if the delta changes earlier assumptions. Reports return changed facts, evidence,
exceptions, SHA/tree, and unresolved items; retain required report fields without repeating history.

Bundle authorized machine work until the next genuine human decision boundary:

- `LOCAL_ONLY`: inspect → implement → test → diagnose/self-correct → validate → local commit(s)
  (unless `NO_COMMIT`) → return once.
- `PUBLISH_PR`: inspect → implement → test → diagnose/self-correct → validate → commit(s) →
  short-lived task branch (create from verified base if needed) → normal push → PR → wait for
  exact-head PR CI terminal state → report final outcome → return once.
  `NO_COMMIT` + `PUBLISH_PR` is a task-contract conflict (STOP).
- Merge, deploy, acceptance, and Founder UAT remain separate R3 human gates.

Efficiency must never permit guessed product, security, payment, or business decisions.

### Acceptance principles

- provenance first
- architecture before tests
- evidence over claims (prefer GitHub/CI artifacts; no silent-retry “passes”)
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

## Repository safety and publication

```text
PLATFORM_NAME = BOBA Bear Platform
CANONICAL_REPOSITORY_PATH = /home/ajoshi/repos/boba-bear-platform
DEFAULT_DEVELOPMENT_BRANCH = main
```

- `/home/ajoshi/repos/boba-bear-platform` is the sole BOBA Bear Platform development authority.
- Default integration branch is `main`. Read/analyze and verified-base checkout may use `main`.
  Ordinary task commits must not be published directly to `main`.
- For `PUBLISH_PR`, create or use a short-lived task branch from the verified base when a suitable
  task branch is not already specified. An explicit task/user branch authorization still controls
  when already provided.
- Do not create additional Git worktrees or duplicate BOBA development clones.
- Do not use `/mnt/c` as development repository authority; keep development under
  `/home/ajoshi/repos` on the WSL Linux filesystem (Turbopack/Podman reliability).
- Preserve intentional dirty-tree work. Never reset, stash, or clean unrelated work.
- Do not run destructive Git operations (`reset`, `restore`, `clean`, `stash`, force checkout,
  force push, history rewrite) unless explicitly authorized (R3).
- Never destroy `boba-bear_postgres-data` or run `docker compose down --volumes`.
- Prefer Podman for local DB/container runtime when Compose/container work is required.
- Preserve protected evidence directories (including `test-results-customer-ordering/**`).
- Local commits are authorized under R1/R2 `LOCAL_ONLY` and under `PUBLISH_PR`. `NO_COMMIT` may
  narrow only `LOCAL_ONLY` / unpublished work and forbids creating any commit; keep commits small
  and reconstructible. `NO_COMMIT` + `PUBLISH_PR` is a task-contract conflict (STOP).
- `PUBLISH_PR` authorizes short-lived-branch commit(s) + push + PR + wait for exact-head PR CI
  terminal state with reporting of the final outcome; do not re-require separate mid-run push/PR
  authorization for that sequence. Do not return while exact-head PR CI is only started or pending.
- Merge, tag/release, deployment, force push, history rewrite, destructive data ops, lifecycle
  acceptance, and Founder UAT each require explicit human R3 authorization.
- Only one product slice is normally active; never start a slice whose dependencies are unresolved.
  Historical controlled-continuation exceptions for the IMP-026 → IMP-028 period are CLOSED and
  MUST NOT be applied to future slices without an explicit new Founder/governance decision.
  Current lifecycle position (`acceptedThrough`, `currentProductSlice`, `pendingAcceptance`,
  `nextProductSlice`) is authoritative only in ROADMAP/STATE. `pendingAcceptance` identifies the
  oldest unresolved formal acceptance gate and does not by itself authorize starting another
  product slice.
- Platform docs under `docs/platform/` are canonical for product/architecture; treat older wireframe
  folders as historical unless CURRENT authority says otherwise.

## Branch lifecycle

- `main` is permanent. Explicitly required deployment branches may remain only while actively used.
- Normal task, feature, fix, chore, and governance branches are short-lived and their remote head
  must be deleted after merge; GitHub automatic head-branch deletion must remain enabled.
- Close and delete stale, abandoned, or superseded unmerged branches after verifying their unique
  work is not required. Retain a non-main branch only for a concrete active or future purpose.
- Git history and merged pull requests are the historical archive. Never delete genuinely required
  unique unmerged work without first explicitly resolving it.

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
when founder UAT is required. Founder UAT verdict and acceptance reconciliation are R3.

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
- Founder UAT runtime is rootless **PODMAN_WSL**. The sole persistent Founder project is
  `boba-staging`. Founder staging must be built from an exact merged-main candidate: canonical
  repository, `branch=main`, `HEAD=origin/main`, and clean tracked source. Its artifact build
  context must be materialized from that exact merged Git tree, not the live worktree. Untracked
  evidence may remain outside that isolated build context. Do not deploy an unmerged branch, dirty tracked
  source, an older clone, `/mnt/c`, or a stale image as Founder-UAT evidence.
- UAT deployment evidence must identify the source candidate and the deployed artifact as far as
  current tooling allows, including source repository, branch, `HEAD`, fingerprint, image name,
  image ID/digest when available, container identity, deployment health, and the exact UAT URL.
- The UAT image used for founder validation must be freshly built by repository-owned Podman WSL
  tooling and record the merged SHA (for example `BOBA_BUILD_SHA` and OCI revision metadata).
  A stale pre-existing image is not sufficient UAT evidence.
- After deployment, verify the running service is actually using the newly built image. If the
  deployed image ID does not match the running container image ID, founder UAT must not proceed.
- Only the founder/user may provide the final interactive UAT verdict. Implementation agents must
  never self-declare `FOUNDER_UAT = PASS`.
- Governance-only, documentation-only, architecture-definition, repository-maintenance, and internal
  tooling tasks with no interactive acceptance surface do not automatically require Podman/founder
  UAT. Record applicability explicitly as `FOUNDER_UAT_REQUIRED = YES | NO` in the relevant future
  acceptance evidence.
- Current applicability: **IMP-028B — Customer Menu Projection + Discovery** is
  `FOUNDER_UAT_REQUIRED = YES` before `COMPLETE_AND_ACCEPTED` because it materially changes customer
  `/order`, Menu serving, category navigation, product-card/display-price presentation, and the Add
  / Cart customer flow. Independent technical acceptance alone is insufficient for final acceptance
  of IMP-028B. **IMP-035 — Initial Administration Capabilities** is likewise
  `FOUNDER_UAT_REQUIRED = YES` before `COMPLETE_AND_ACCEPTED` because it creates operator-visible
  administration behavior.

## Foundation operating constraints

Slice-specific accepted operating rules (config, database, auth, cart, checkout, payment, order,
audits, etc.) live in
[`docs/platform/accepted-foundation-operating-rules.md`](docs/platform/accepted-foundation-operating-rules.md).
They are SUPPORTING constraints for agents touching those foundations. They must not redefine IMP
numbering or acceptance.
