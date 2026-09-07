---
Status: SUPPORTING ENGINEERING WORKFLOW
Authority: NONE — does not change product, architecture, decision, roadmap, or acceptance authority
---

# Bounded Change Workflow

Follow [`AGENTS.md`](../../../AGENTS.md) for repository/branch authority: use `main` by default,
or one short-lived task branch when explicitly authorized. Begin from a recorded clean checkpoint
and stop on unexplained drift. Keep changes diff-scoped; do not mutate unrelated files.

For new substantial product-visible work from IMP-036F, the sequence is **approved Product
Definition → architecture fit/lock → implementation**, as defined in
[`PRODUCT-DELIVERY.md`](../PRODUCT-DELIVERY.md). Engineering-only/non-product changes may remain
specification-driven. These are process phases, not new ROADMAP lifecycle states.

```text
PRODUCT_DELIVERY_PROCESS_EFFECTIVE_FROM = IMP-036F
HISTORICAL_ACCEPTED_IMPS_REWRITTEN = NO
IMP036E_LIFECYCLE_CHANGED = NO
IMP036F_ACTIVATED = NO
```

1. Verify applicable authorities and scope. For prospective product-visible work, require the
   approved versioned Product Definition and passed Product Definition Gate before architecture
   fit/lock; stop on unresolved material product behaviour or architecture conflict. Engineering-only
   changes require an approved specification and applicable architecture fit.
2. Record a clean checkpoint and repository provenance; create a task branch only when authorized.
3. Identify stories/observable acceptance scenarios and relevant tests under
   [`TESTING.md`](../TESTING.md) for prospective story delivery, including story Definition of Ready.
   Engineering-only work uses its specification's acceptance criteria. Require applicable
   implementation authorization in either case.
4. Implement only the approved story/AC scope (or engineering specification scope).
5. Run focused tests, relevant regression, and deterministic local validation; retain commands,
   exit codes, relevant raw output, story/AC evidence, and changed files/diff.
6. Create authorized small, reconstructible local commit(s); record SHA/tree and required working-tree
   fingerprint. Never rewrite published history.
7. Push only when separately authorized; retain the resulting CI run/link when available.
8. Independently review story completeness, architecture compliance, actual diff, and deterministic
   evidence, including required Golden Journeys. First review covers the full relevant slice;
   follow-up review uses previous approved SHA → new SHA, changed files, affected invariants, and
   new evidence. Widen review when changed authority requires it. Ask: “Identify the three most
   plausible defects or invariant violations in this diff.”
9. Merge only when separately authorized.
10. After merging an authorized task branch, verify its exact tip is contained in `main`, then delete
    the completed task branch locally and remotely. Do not delete a branch that still contains
    unique/unmerged commits; preserve it until that work is reconciled.
11. When applicable, prepare an immutable artifact under the existing provenance rules; obtain
    deployment authorization before deploying it. Required independent technical acceptance must
    precede UAT deployment.
12. After independent technical acceptance, run founder UAT when required against the exact accepted
    candidate under AGENTS deployment/provenance rules, then complete acceptance or rework. Reconcile
    applicable canonical records and run `npm run project:consistency` before advancing.

`STORY_COMPLETE != IMP_ACCEPTED`. Implementation complete does not mean accepted. Independent
technical acceptance and required Founder UAT remain separate gates; an implementation agent must
not declare the founder's verdict. Record `FOUNDER_UAT_REQUIRED = YES | NO` with rationale.

For defect corrections where an observable regression test is practical, preserve red-green
evidence in the task or PR: the test fails before the correction and passes after it. Do not invent
red-green evidence for documentation, formatting, or a change with no meaningful pre-fix test.

Promotion gates are independent: a local commit does not authorize push or a PR; a PR does not
authorize merge; merge does not authorize a tag/release or deployment; and neither does it replace
required founder UAT.
