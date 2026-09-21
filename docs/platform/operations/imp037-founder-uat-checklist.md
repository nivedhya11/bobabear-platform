# IMP-037 Founder UAT checklist (preparation only)

```text
DOCUMENT_ROLE: SUPPORTING_OPS_CHECKLIST
LIFECYCLE_AUTHORITY: NO
FOUNDER_UAT: NOT_PERFORMED
FOUNDER_UAT_REQUIRED: YES
QUALIFYING_EXTERNAL_PROOF: NO
PROVIDER_ACCESS_DEFERRED: YES
IMP037_ACCEPTED: NO
```

This checklist prepares Founder UAT for **after** qualifying external provider proof
passes and independent technical acceptance of the exact proof candidate. It does
**not** authorize or perform Founder UAT now.

IMP-037 Founder UAT is **mandatory** (`IMP037_FOUNDER_UAT_REQUIRED = YES`). Agents
must never pre-fill `FOUNDER_UAT = PASS`.

## Mandatory deployment preconditions (all required before Founder UAT)

These encode the AGENTS.md Founder UAT / exact-candidate acceptance gate. Every item
must be true; any failure fails closed (do not proceed to Founder UAT).

- [ ] Qualifying external recovery proof completed under explicit R3
- [ ] Independent technical acceptance of the exact proof candidate = **PASS**
- [ ] Candidate is already **merged** to the integration branch
- [ ] Canonical repository path verified:
  - [ ] `CANONICAL_REPOSITORY_PATH = /home/ajoshi/repos/boba-bear-platform`
- [ ] `BRANCH = main`
- [ ] `HEAD = origin/main`
- [ ] Tracked source is **clean** (no dirty tracked source)
- [ ] Exact `WORKING_TREE_FINGERPRINT` recorded (content-sensitive; HEAD alone is insufficient)
- [ ] Founder runtime = rootless **PODMAN_WSL**
- [ ] Persistent Founder project = **boba-staging**
- [ ] UAT build context materialized from the **exact merged Git tree**
- [ ] Never build Founder UAT from the **live worktree**
- [ ] Fresh repository-owned Podman image built for this candidate
- [ ] Image records merged SHA (`BOBA_BUILD_SHA` / OCI revision metadata where tooling supports it)
- [ ] Deployed image ID/digest recorded
- [ ] Running container image identity verified against the freshly built artifact
- [ ] Exact UAT URL recorded

### Fail-closed blockers (any one refuses UAT)

- Stale / pre-existing image reused as UAT evidence
- Unmerged branch
- Dirty tracked source
- Stale clone
- `/mnt/c` (or other non-canonical) build context
- Deployed image ID does not match the freshly built artifact
- Missing `WORKING_TREE_FINGERPRINT` or fingerprint mismatch vs accepted candidate

## Founder verification items

1. **Candidate / provenance** — exact SHA/tree/fingerprint matches the accepted technical candidate; merged `main` / `origin/main` / clean tracked source / fingerprint recorded
2. **UAT deployment provenance** — PODMAN_WSL / `boba-staging` / exact-git-tree build / fresh image / running image verified / exact UAT URL
3. **Recovery status** — current recovery/readiness status is reviewable and secret-free
4. **Finalized artifact / point** — finalized Layer 1 and/or Layer 2 recovery artifact/point is identified
5. **Isolated target** — restore target is fresh, recovery-classified, and distinct from source
6. **Source protection** — authoritative source remains unmodified; restore-to-source is refused
7. **Business validation** — restored-target business-integrity validation result is reviewable
8. **Measured RPO** — achieved RPO is recorded (do not invent PASS)
9. **Measured RTO** — end-to-end RTO is recorded (do not invent PASS)
10. **High-risk readiness** — READY / BLOCKED gate outcomes are reviewable
11. **Failure evidence** — first failures remain visible; COMPLETE absent on failed runs
12. **No secrets** — evidence/logs contain no passphrases, private keys, Spaces secrets, or tokens
13. **No provider side effects** — recovered target shows provider suppression (no live payment/message/webhook effects)

## Explicit non-claims while deferred

```text
FOUNDER_UAT: NOT_PERFORMED
RPO_RTO_PROVEN: NO
DROPLET_2GIB_RTO_VALIDATED: NO
STORAGE_CAPACITY_VALIDATED: NO
REAL_SPACES: NOT_PERFORMED
IMP037_ACCEPTED: NO
```

**Founder alone** records `PASS` / `FAIL`. Agents must never self-declare `FOUNDER_UAT = PASS`.
