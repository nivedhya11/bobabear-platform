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
HEAD: 663b355cea7aab2571c43ed4c1f3e50c39012af8
TREE: 19dfeac3ab47d2ddc4bc1b0750e039fe8332237f
WORKING_TREE_FINGERPRINT_AT_DEPLOY: 6cf0b074ec468b530ce0687ec53cc6d2c8c9534b05fef2b62aeb6031d0b0a802
CI_RUN: 35799714546 SUCCESS
CODEQL_RUN: 35799714560 SUCCESS
DEPLOYED_ENVIRONMENT: Founder staging (boba-staging / PODMAN_WSL)
STAGING_ARTIFACT_SOURCE: EXACT_MERGED_GIT_TREE (git archive HEAD)
STAGING_CANDIDATE_MATCH: YES
DEPLOYMENT_IDENTIFIER: boba-staging @ HEAD 663b355cea7aab2571c43ed4c1f3e50c39012af8
ASSESSMENT_URL: http://localhost:8080
ASSESSMENT_URL_CUSTOMER: http://localhost:8080/order/
ASSESSMENT_URL_WORKFORCE: http://localhost:8080/workforce/login/
DEPLOYMENT_TIMESTAMP_UTC: 2026-09-23T01:07:03Z (status/health verified after deploy)
```

Pinned assessment runtime identity is **HEAD + TREE + deploy-time fingerprint** above.
Later local Acceptance Pack doc edits change the live worktree fingerprint but do **not**
alter the Podman images (exact `git archive` artifact). Do **not** redeploy mid-window.

Do **not** allow candidate drift during an active assessment window. Redeploy only
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
| Customer | Founder-provisioned staging phone OTP path only. Do not use production phones. OTP delivery depends on staging provider config; abuse/Turnstile controls remain enabled. |
| Workforce | Create via `npm run env:staging:workforce:user:create` against running `boba-staging` only (stdin password; exact-main operator image). Do not share production workforce credentials. |
| Roles / scopes | Closed permission catalogue (ADR-005); see BOLA/BFLA map. Assessor may request outlet/brand scoped accounts — Founder provisions; do not invent roles. |

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
