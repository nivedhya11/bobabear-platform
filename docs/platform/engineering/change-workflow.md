---
Status: SUPPORTING ENGINEERING WORKFLOW
Authority: NONE — does not change product, architecture, decision, roadmap, or acceptance authority
---

# Bounded Change Workflow

Use one short-lived task branch for one approved, bounded task. Begin from a recorded clean
checkpoint and stop on unexplained drift. Keep changes diff-scoped; do not use a task to mutate
unrelated files.

1. Confirm the applicable architecture and specification are approved.
2. Record a clean checkpoint and create a short-lived branch.
3. Identify acceptance criteria and the relevant tests before implementation.
4. Implement only the approved scope.
5. Create small, reconstructible local commit(s). Never rewrite published history.
6. Run deterministic local validation and retain the commands, exit codes, relevant raw output,
   changed files, diff/stat, and commit SHA.
7. Push only when separately authorized; retain the resulting CI run/link when available.
8. Review the specification, actual diff, and deterministic evidence. Keep review diff-scoped unless
   a changed authority requires wider inspection. Ask: “Identify the three most plausible defects
   or invariant violations in this diff.”
9. Merge only when separately authorized.
10. After merge, verify the exact task-branch tip is contained in `main`, then delete the completed
    task branch locally and remotely. Do not delete a branch that still contains unique/unmerged
    commits; preserve it until that work is reconciled.
11. When applicable, build and promote an immutable artifact, then obtain deployment authorization.
12. Run founder UAT when required, then complete acceptance or rework.

Implementation complete does not mean accepted. Founder UAT is the product-acceptance authority;
an implementation agent must not declare its outcome.

For defect corrections where an observable regression test is practical, preserve red-green
evidence in the task or PR: the test fails before the correction and passes after it. Do not invent
red-green evidence for documentation, formatting, or a change with no meaningful pre-fix test.

Promotion gates are independent: a local commit does not authorize push or a PR; a PR does not
authorize merge; merge does not authorize a tag/release or deployment; and neither does it replace
required founder UAT.
