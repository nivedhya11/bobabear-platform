# IMP-037 Founder UAT checklist (preparation only)

```text
DOCUMENT_ROLE: SUPPORTING_OPS_CHECKLIST
LIFECYCLE_AUTHORITY: NO
FOUNDER_UAT: NOT_PERFORMED
QUALIFYING_EXTERNAL_PROOF: NO
PROVIDER_ACCESS_DEFERRED: YES
IMP037_ACCEPTED: NO
```

This checklist prepares Founder UAT for **after** qualifying external provider proof
passes. It does **not** authorize or perform Founder UAT now.

## Preconditions (must all be true before UAT)

- [ ] Qualifying external recovery proof completed under explicit R3
- [ ] Independent technical acceptance of the exact proof candidate
- [ ] Exact candidate identity recorded:
  - [ ] `CANONICAL_REPOSITORY_PATH`
  - [ ] `BRANCH`
  - [ ] `HEAD`
  - [ ] `WORKING_TREE_FINGERPRINT`
- [ ] UAT deployment (if required) matches that exact candidate

## Founder verification items

1. **Candidate / provenance** — exact SHA/tree/fingerprint matches the accepted technical candidate
2. **Recovery status** — current recovery/readiness status is reviewable and secret-free
3. **Finalized artifact / point** — finalized Layer 1 and/or Layer 2 recovery artifact/point is identified
4. **Isolated target** — restore target is fresh, recovery-classified, and distinct from source
5. **Source protection** — authoritative source remains unmodified; restore-to-source is refused
6. **Business validation** — restored-target business-integrity validation result is reviewable
7. **Measured RPO** — achieved RPO is recorded (do not invent PASS)
8. **Measured RTO** — end-to-end RTO is recorded (do not invent PASS)
9. **High-risk readiness** — READY / BLOCKED gate outcomes are reviewable
10. **Failure evidence** — first failures remain visible; COMPLETE absent on failed runs
11. **No secrets** — evidence/logs contain no passphrases, private keys, Spaces secrets, or tokens
12. **No provider side effects** — recovered target shows provider suppression (no live payment/message/webhook effects)

## Explicit non-claims while deferred

```text
FOUNDER_UAT: NOT_PERFORMED
RPO_RTO_PROVEN: NO
DROPLET_2GIB_RTO_VALIDATED: NO
STORAGE_CAPACITY_VALIDATED: NO
REAL_SPACES: NOT_PERFORMED
IMP037_ACCEPTED: NO
```

**Founder alone** records `PASS` / `FAIL`. Agents must never pre-fill `FOUNDER_UAT = PASS`.
