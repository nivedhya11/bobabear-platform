<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "VERIFICATION_POLICY",
  "version": "TEST-1",
  "effectiveFrom": "IMP-036F for new story-based delivery",
  "lastReviewed": "2026-09-07"
}
-->

# BOBA Bear — Behaviour Verification Policy

This policy owns how product behaviour is proven for new story-based delivery from IMP-036F.
[`PRODUCT-DELIVERY.md`](./PRODUCT-DELIVERY.md) owns the delivery method and story completion rules;
the relevant Product Definition selects the acceptance scenarios and required Golden Journeys.
[`ARCHITECTURE.md`](./ARCHITECTURE.md), the
[`decision register`](./decision-register.md), and locked capability architecture remain authoritative
for technical, security, financial, persistence, and concurrency invariants. Tests cannot authorize
new behaviour or silently override those authorities, accepted [`STATE.md`](./STATE.md), or
[`ROADMAP.md`](./ROADMAP.md).

```text
PRODUCT_DELIVERY_PROCESS_EFFECTIVE_FROM = IMP-036F
HISTORICAL_ACCEPTED_IMPS_REWRITTEN = NO
IMP036E_LIFECYCLE_CHANGED = NO
IMP036F_ACTIVATED = NO
```

IMP-036E continues under its existing lifecycle. Verification layers and delivery phases are not
new ROADMAP lifecycle states. Session 1 establishes documentation policy; it changes no runtime,
tests, CI configuration, staging deployment, or acceptance status.

## Test pyramid / matrix

Use fast, focused tests for individual rules and broader tests for behaviour that crosses real
boundaries. Select layers by the story's risks and observable acceptance scenarios; duplicating the
same assertion at every layer adds no proof. Record each material layer's applicability, with a
brief reason for `N/A`.

| Layer | Required behavioural evidence when applicable |
|---|---|
| 1. Unit | Rule calculations, boundaries, and supported/denied branches in isolation. |
| 2. Component | Rendered component behaviour, user interactions, state changes, and understandable feedback. |
| 3. Domain/use-case | Business rules, invariants, supported/denied transitions, and externally observable use-case results. |
| 4. Integration | Real collaboration across affected modules or adapter boundaries; identify any controlled substitutes. |
| 5. Database integration | Real PostgreSQL persistence, constraints, transactions, isolation, and reload behaviour; migration compatibility when changed. In-memory doubles alone do not prove database behaviour. |
| 6. HTTP/API contract | Requests, responses, validation, error contracts, and transport-to-domain mapping over the applicable HTTP boundary. |
| 7. Authorization/security | Material allow and deny decisions, unauthenticated/ineligible identities, permission/resource scope, cross-scope isolation, and forbidden side effects. |
| 8. Concurrency | Real overlapping operations for affected race-sensitive rules, with durable final-state and invariant assertions. Sequential calls alone do not prove a race. |
| 9. Recovery/idempotency | Duplicate requests/events, interruption and resumption, ambiguous outcomes, and retry/reload recovery under existing contracts; verify no duplicate or partial forbidden effect. |
| 10. Accessibility | Semantics, names, keyboard operation, focus movement/return, and applicable accessible feedback; automated checks plus interaction evidence where automation is insufficient. |
| 11. E2E browser/UI | A real browser exercises the story through the relevant integrated UI, transport, and persistence boundaries; declare fixtures, provider substitutes, and remaining gaps. |
| 12. Golden Journey regression | Required affected `GJ-...` journeys prove cross-capability business continuity in a real browser, including downstream effects. Isolated page assertions do not prove the full journey. |
| 13. Founder UAT | Founder validation of the exact independently reviewed implementation candidate when required, with the provenance and promotion gates in [`AGENTS.md`](../../AGENTS.md#founder-uat-and-exact-candidate-acceptance-gate). Automated or agent-run browser checks cannot supply the founder's verdict. |

## Meaningful coverage

**MAXIMUM MEANINGFUL BEHAVIOURAL COVERAGE**, not artificial 100% line coverage.

- New critical business/domain logic targets **>= 90% branch coverage where practical**. Record
  measurement scope and explain a material shortfall; do not pad tests to increase a percentage.
- Security/authorization decisions require behavioural tests for **all material allow/deny
  branches**, regardless of aggregate coverage percentage.
- Money/order/payment/refund state transitions require tests for **every supported and denied
  material transition**, using the authoritative contracts rather than inventing new states.
- Coverage percentage is diagnostic. **Acceptance-scenario coverage is the release criterion**:
  every mandatory AC must have passing, relevant evidence. A high percentage cannot waive a missing
  scenario, required Golden Journey, architecture gate, independent review, or Founder UAT.

For a bug, preserve a reproducing test before the correction when practical, then its passing result.
Do not fabricate red/green evidence for a documentation-only change or add tests that merely mirror
implementation details.

## Scenario-to-evidence traceability

Maintain this mapping in the per-IMP Product Definition or its linked implementation evidence:

| Story ID | AC ID / required GJ ID | Behaviour / risk | Applicable layers or N/A reason | Test/check reference | Candidate and result/artifact |
|---|---|---|---|---|---|
| `US-<IMP>-NNN` | `AC-<IMP>-NNN-NN` / `GJ-...` | Observable outcome | Selected layers | Executable test or explicit manual procedure | Exact candidate, command, exit/result, evidence path |

Before implementation, identify the expected proof. At completion, record actual results rather than
treating the planned test as evidence. Preserve relevant commands, raw failure/pass output, browser
artifacts when useful, limitations, and repository/branch/HEAD/tree/content-sensitive
`WORKING_TREE_FINGERPRINT`. Disclose skipped, failed, quarantined, or substituted checks and any
mandatory AC without proof. Use the canonical fingerprint command in `AGENTS.md`; a path-only Git
status hash is insufficient.

Story completion follows the [Definition of Done](./PRODUCT-DELIVERY.md). IMP implementation
completion requires every mandatory acceptance-slice story and every affected required Golden
Journey to pass. `STORY_COMPLETE != IMP_ACCEPTED`; evidence does not grant publication, deployment,
or canonical acceptance authority.

## E2E expectations

Golden Journeys require a real browser. Each applicable acceptance slice must exercise:

- Mobile/responsive behaviour, including the defined supported viewports.
- Keyboard interaction and focus placement, movement, and return.
- Human-readable errors and useful next actions.
- Empty/first-use, loading, error, and recovery states.
- Deep links and stale/missing resource or permission context.
- Destructive-action confirmation, cancellation, and observable consequences.
- Revisit/reload persistence and relevant downstream changes.

The Product Definition records applicability and any justified `N/A`; browser fixtures must not
conceal the persistence, authorization, concurrency, or recovery behaviour being claimed. Existing
Golden Journey registry status does not itself prove a journey passed for the current candidate.

## Validation cadence — TARGET for Session 3

**CI restructuring is TARGET until Session 3 implements it.** The matrix below describes the
intended allocation; it does not claim current CI already implements TEST-1 in full or replace
existing required checks and independent promotion gates.

| Stage | Target validation |
|---|---|
| PR | Fast, risk-focused checks for the changed stories/ACs and affected invariants; include security, database, concurrency, or browser proof whenever the change requires it. |
| main | Comprehensive validation across the integrated candidate and affected regression surfaces. |
| Nightly/release | Broad E2E and Golden Journey regression, including applicable responsive, accessibility, recovery, and cross-capability scenarios. |

Scheduling expensive regression later must not defer evidence required for the candidate's current
acceptance or release gate. Actual configured checks remain in the repository's
[`workflows`](../../.github/workflows/) and [`package.json`](../../package.json); this policy changes
neither. Required checks, release boundaries, and environment isolation remain governed by the
binding [ADR-002](./decisions/ADR-002-environments-ci-cd-release-model.md) and current operational
rules in [`AGENTS.md`](../../AGENTS.md).

## Flake policy

A flaky test is a defect. No silent retries may be presented as proof of correctness. Preserve the
initial failure and any diagnostic rerun, distinguish infrastructure failure from product behaviour,
and investigate the cause. Quarantine requires an explicit documented reason, named owner, and
follow-up. A quarantined check is missing evidence, not a pass; it cannot silently waive a mandatory
AC or required Golden Journey.

## Founder UAT and historical journey audit

Record `FOUNDER_UAT_REQUIRED = YES | NO` with the applicable authority and reason. When required,
follow the existing independent technical acceptance, deployment, Founder UAT, and reconciliation
gates in [`AGENTS.md`](../../AGENTS.md#founder-uat-and-exact-candidate-acceptance-gate), including exact
repository/branch/HEAD/fingerprint matching, merged-main build provenance, image/container identity,
and the exact UAT URL. This policy does not authorize staging mutation or relax any of those rules.
Only the founder/user can provide `FOUNDER_UAT = PASS`; `COMPLETE_AND_ACCEPTED` requires that gate
where mandated.

A Journey Gap Audit of previously implemented product journeys is required before public GTM
cutover / IMP-040 acceptance. **The audit is not performed in Session 1.** It must later identify
missing journey behaviour and evidence for explicit disposition without retroactively rewriting
accepted IMPs or silently authorizing deferred capabilities.
