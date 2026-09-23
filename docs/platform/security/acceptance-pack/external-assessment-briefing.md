---
Status: SUPPORTING — External assessment briefing (IMP-038 PROVE prep)
Authority: FD-038-18; gap GAP-EXT-ASSESS-001; capability §15/§16
Compliance claim: NONE
Assessor independence: REQUIRED (this artifact is NOT the assessment)
---

# External web/API security assessment — assessor briefing

```text
GAP-EXT-ASSESS-001: OPEN
INDEPENDENT_EXTERNAL_ASSESSMENT: NOT_PERFORMED
SELF_ASSESSMENT_IS_NOT_INDEPENDENT: YES
COMPLIANCE_CLAIMS: NONE
FOUNDER_EXTERNAL_ASSESSMENT_STAGING_AUTHORIZATION: YES
PRODUCTION_MUTATION_AUTHORIZED: NO
IMP039_ACTIVATED: NO
IMP038_ACCEPTANCE_AUTHORIZED: NO

ASSESSMENT_WINDOW_STARTED: YES
ASSESSMENT_CREDENTIAL_PACKAGE_READY: YES
CSP_ENFORCE: YES
ASSESSOR_IDENTITY_READINESS: docs/platform/security/acceptance-pack/assessor-identity-readiness.md
```

## 1. Purpose

Enable a **Founder-commissioned independent** web/API security assessment of the
BOBA Bear V1 ordering platform before IMP-038 acceptance. This briefing prepares
scope and evidence pointers; it does **not** close `GAP-EXT-ASSESS-001`.

Cursor / ChatGPT / internal implementation review must **never** be labeled the
independent external assessment.

## 2. Exact deployed assessment candidate (pinned)

```text
CANONICAL_REPOSITORY_PATH: /home/ajoshi/repos/boba-bear-platform
BRANCH: main
ASSESSMENT_HEAD: 0990c91e428a8dea2dd3387cd6f7f1cb6425a1a1
ASSESSMENT_TREE: d426ee4e947b6f3eb0559f93eb8b1d008f15696e
WORKING_TREE_FINGERPRINT: 0d017621d37eb6439db854cfdc5dd6bd9689f61636b10d3d6a1689e63e61ea90
CI_PR: https://github.com/nivedhya11/bobabear-platform/pull/210 (exact-head CI SUCCESS; merged)
NIGHTLY_VERIFICATION: https://github.com/nivedhya11/bobabear-platform/actions/runs/35849864740 (SUCCESS @ HEAD 0990c91e)
DEPLOYED_ENVIRONMENT: Founder staging (boba-staging / PODMAN_WSL)
STAGING_ARTIFACT_SOURCE: EXACT_MERGED_GIT_TREE (git archive HEAD)
STAGING_CANDIDATE_MATCH: YES
DEPLOYMENT_IDENTIFIER: boba-staging @ HEAD 0990c91e428a8dea2dd3387cd6f7f1cb6425a1a1
ASSESSMENT_URL: https://cradling-unenvied-sapling.ngrok-free.dev
ASSESSMENT_URL_CUSTOMER: https://cradling-unenvied-sapling.ngrok-free.dev/order/
ASSESSMENT_URL_WORKFORCE: https://cradling-unenvied-sapling.ngrok-free.dev/workforce/login/
DEPLOYMENT_TIMESTAMP_UTC: 2026-09-23T10:51:06Z (staging deploy complete; CANDIDATE_MATCH YES)
EXTERNAL_EXPOSURE_MECHANISM: TEMPORARY_NGROK_TUNNEL
CSP_PHASE: ENFORCE
D376_RATIFIED: YES
SUPERSEDES_PRIOR_CANDIDATE: a4680c983934bbf0c889952af19bd99bf3a43ed4
```

Pinned assessment runtime identity is **HEAD + TREE + deploy-time fingerprint** above.
Later local Acceptance Pack doc edits change the live worktree fingerprint but do **not**
alter the Podman images (exact `git archive` artifact). Do **not** redeploy mid-window.

Assessment browser/API origin for this window is the HTTPS ngrok URL above. Auth
`CUSTOMER_AUTH_BASE_URL` / `WORKFORCE_AUTH_BASE_URL` / `BOBA_BEAR_PUBLIC_ORIGIN` are temporarily
aligned to that origin for the assessment window only (not committed; restored to localhost
on teardown). Do **not** allow candidate drift during an active assessment window. Redeploy only
an exact new pinned candidate after the window is closed or explicitly re-baselined.

### Reachability note (Founder staging path)

Founder staging (`boba-staging` / PODMAN_WSL) serves Nginx on the operator host at
`http://localhost:8080`. For the bounded independent assessment window, Founder authorizes a
**temporary assessment-only** externally reachable endpoint using the repository's already-used
Founder-staging reverse-tunnel capability (**ngrok**, historically proven for provider-originated
Razorpay Test Mode webhook acceptance). This is **not** IMP-039 production edge realization
(`GAP-ORIGIN-LIVE-001` remains OPEN; `IMP039_ACTIVATED: NO`).

```text
EXTERNAL_EXPOSURE_MECHANISM: TEMPORARY_NGROK_TUNNEL (Founder-authorized; assessment-only)
PRODUCTION_EDGE: NOT_USED
IMP039_ACTIVATED: NO
TEARDOWN: disable ngrok agent + restore localhost auth origins after assessment window
```

Pinned `ASSESSMENT_URL` in §2 is updated when the tunnel is live for the frozen candidate.
Assessor credentials are delivered out-of-band; never committed.

### Data / secrets boundaries

```text
PRODUCTION_CUSTOMER_DATA: NO (persistent Founder UAT volume only; seed/UAT rows)
PRODUCTION_CREDENTIALS_IN_BRIEFING: FORBIDDEN
PRODUCTION_MUTATION: FORBIDDEN
```

Observed staging identity scale at deploy (counts only): ~26 customer_auth_users,
~3 workforce_auth_users, ~4 orders, ~17 payments — Founder staging/UAT residual,
not production Droplet data.

## 3. In-scope surfaces

| Surface | Notes |
|---|---|
| Public static site + CSP headers | Nginx serving path; CSP is **Enforce** (D-376 Maps Fonts inventory applied; `GAP-CSP-ENFORCE-001` CLOSED) |
| `/api/customer-auth/*` | OTP / session / abuse controls; preserve auth gates |
| `/api/v1/*` | Customer commerce (menu, cart, checkout, order, location) |
| Razorpay webhook path | Signature + durable inbox; staging-safe only |
| `/api/workforce-auth/*` | Workforce AuthN / MFA |
| `/api/operations/v1/*` | Operations Console API + step-up |
| `/api/admin/v1/*` | Administration API + step-up |
| Workforce UI | `/workforce/login/`, `/workforce/operations/`, `/workforce/admin/` |
| Origin-trust design | Lab/config evidence; live CF/DO/AOP PENDING (IMP-039) |

## 4. Auth / test-account process

| Realm | Process |
|---|---|
| Customer | Staging phone OTP path only (`CUSTOMER_OTP_PROVIDER=local` on Founder staging). Dedicated assessor test phone delivered OOB. Do not use production phones. Abuse/Turnstile controls remain enabled. |
| Workforce | Assessor identities provisioned via existing `workforce:user:create` operator CLI against `boba-staging` + closed-catalog role grants via Administration use-cases. MFA enrolled. Credentials OOB only (`.env.staging/assessment-oob-credentials.txt`, gitignored). |
| Roles / scopes | Closed permission catalogue (ADR-005): ops=`outlet_manager`, admin=`brand_admin`, refund=`support_refund_operator`. See BOLA/BFLA map. Do not invent roles. |
| Readiness evidence | Non-secret matrix: [`assessor-identity-readiness.md`](./assessor-identity-readiness.md) |

## 5. Explicit out of scope / constraints

- Inventing legal applicability (DPDP / CERT-In / PCI) findings as compliance claims
- Production cloud mutation (IMP-039 not activated)
- Raw PAN/CVV (platform must not store/process)
- Destructive tests against production customer data
- Labeling any Cursor/self review as “independent assessment”
- Silently broadening CSP / wildcards
- Closing `GAP-IMP037-001` or accepting IMP-038/039

### External reachability (assessment window)

```text
FOUNDER_EXTERNAL_ASSESSMENT_STAGING_AUTHORIZATION: YES
EXTERNAL_EXPOSURE_MECHANISM: TEMPORARY_NGROK_TUNNEL
IMP039_ACTIVATED: NO
PRODUCTION_MUTATION_AUTHORIZED: NO
```

Founder authorized a temporary, assessment-only externally reachable Founder-staging endpoint.
Cursor selected the existing Founder-staging **ngrok** reverse-tunnel path (already used for
IMP-026 provider-originated webhook proof) rather than inventing a new provider/edge architecture.
No Cloudflare/DO production firewall/AOP/DNS migration is performed. Tunnel teardown after the
assessment window restores localhost-only operator access.

## 6. Threat-model / control pointers

| Topic | Path |
|---|---|
| Pack index | `docs/platform/security/acceptance-pack/INDEX.md` |
| Threat model T-01…T-25 | `docs/platform/security/acceptance-pack/threat-model.md` |
| Asset inventory | `docs/platform/security/acceptance-pack/asset-inventory.md` |
| Data-flow map | `docs/platform/security/acceptance-pack/data-flow-map.md` |
| BOLA/BFLA targets | `docs/platform/security/acceptance-pack/bola-bfla-evidence.md` |
| Auth abuse / Turnstile / step-up classes | `docs/platform/security/acceptance-pack/auth-abuse-step-up-evidence.md` |
| Payment / webhook boundaries | `docs/platform/security/acceptance-pack/payment-webhook-security-evidence.md` |
| CSP evidence (Enforce; D-376 Maps Fonts) | `docs/platform/security/acceptance-pack/csp-header-evidence.md` |
| Secure SDLC | `docs/platform/security/acceptance-pack/secure-sdlc-evidence.md` |
| Gap register | `docs/platform/security/acceptance-pack/gap-register.md` |
| Origin-trust | `docs/platform/security/origin-trust/README.md` |
| Role/permission catalogue | `tests/access-control/catalog.test.ts` (7 roles / closed permissions) |

### Known intentional exclusions

| Item | Status |
|---|---|
| Bot Fight Mode as acceptance-critical | N/A_WITH_REASON |
| Paid Cloudflare plan for V1 | N/A_WITH_REASON |
| BOBA raw PAN/CVV storage | Forbidden by design |
| Live Cloudflare/DO/AOP production chain | `GAP-ORIGIN-LIVE-001` / IMP-039 |
| IMP-037 external recovery provider proof | `GAP-IMP037-001` OPEN; does not block IMP-038 PROVE work |

### Known open gaps (non-exhaustive)

| ID | Status |
|---|---|
| GAP-CSP-ENFORCE-001 | CLOSED — D-376 Maps Fonts hosts; Enforce active; see CSP evidence |
| GAP-EXT-ASSESS-001 | OPEN — awaiting independent assessor |
| GAP-FOUNDER-UAT-001 | OPEN |
| GAP-ORIGIN-LIVE-001 | OPEN |
| GAP-IMP037-001 | OPEN |
| LEGAL-* (nine topics) | LEGAL_REVIEW_REQUIRED — legal-owned |

## 7. Required assessor outputs (for gap closure)

1. Assessor identity / organization
2. Explicit statement of independence (≠ implementation agent)
3. Assessed URL + assessed `HEAD` + working-tree fingerprint
4. Assessment date + scope
5. Findings with severity + reproduction evidence
6. Critical/High remediation + Critical/High retest evidence
7. Final disposition

Until those exist:

```text
INDEPENDENT_EXTERNAL_ASSESSMENT: NOT_PERFORMED
GAP-EXT-ASSESS-001: OPEN
```

### Reporting / retest format

Prefer a written report (PDF or markdown) keyed to candidate identity above.
Critical findings are fail-closed for IMP-038 acceptance. High findings require
remediation + retest before acceptance. GREEN/AMBER remediation is owned by Cursor
under normal gates after assessment returns.
