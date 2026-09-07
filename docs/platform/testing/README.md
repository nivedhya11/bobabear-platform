# Testing evidence index

```text
STATUS: SUPPORTING ENGINEERING EVIDENCE
Authority: docs/platform/TESTING.md (TEST-1)
```

## Purpose

Repeatable inventory, baseline measurement, TRACEABILITY assessment, and CI gap
analysis for Session 3 verification work.

## Reading rule

1. Read [`../TESTING.md`](../TESTING.md) first for verification **policy**.
2. Read [`BASELINE.md`](./BASELINE.md) only when current verification
   evidence / baseline measurement is needed.
3. Use [`test-inventory.json`](./test-inventory.json) for machine-readable
   structural inventory (regenerate/check via package scripts below).
4. Read [`CI-GAP-ANALYSIS.md`](./CI-GAP-ANALYSIS.md) for Session 3B / 3C
   implementation planning.

## Explicit non-authority

These files:

- do **not** activate IMP-036F
- do **not** change acceptance, ROADMAP, or STATE
- do **not** replace Product Definition evidence
- do **not** upgrade Golden Journey registry status
- do **not** claim that test presence equals acceptance evidence

```text
IMP036F_PRODUCT_DEFINITION = NOT_CREATED
IMP036F_STORIES = NOT_CREATED
IMP036F_ACCEPTANCE_SCENARIOS = NOT_CREATED
IMP036F_ACTIVATED = NO
```

## Commands

```text
npm run testing:inventory        # regenerate test-inventory.json
npm run testing:inventory:check  # fail on deterministic snapshot drift
node --test scripts/testing-inventory.test.mjs
```

Canonical policy remains TEST-1. This directory is supporting engineering evidence only.
