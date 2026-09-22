---
Status: SUPPORTING — External assessment briefing (IMP-038 PROVE prep)
Authority: FD-038-18; gap GAP-EXT-ASSESS-001; capability §15/§16
Compliance claim: NONE
Assessor independence: REQUIRED (this artifact is NOT the assessment)
---

# External web/API security assessment — assessor briefing

```text
GAP-EXT-ASSESS-001: OPEN
INDEPENDENT_EXTERNAL_ASSESSMENT: REQUIRED
SELF_ASSESSMENT_IS_NOT_INDEPENDENT: YES
COMPLIANCE_CLAIMS: NONE
```

## 1. Purpose

Enable a **Founder-commissioned independent** web/API security assessment of the
BOBA Bear V1 ordering platform before IMP-038 acceptance. This briefing prepares
scope and evidence pointers; it does **not** close `GAP-EXT-ASSESS-001`.

## 2. Candidate identity (fill at assessment kickoff)

```text
CANONICAL_REPOSITORY_PATH: /home/ajoshi/repos/boba-bear-platform
BRANCH:
HEAD:
WORKING_TREE_FINGERPRINT:
DEPLOYED_ENVIRONMENT: (Founder staging preferred — exact merged-main candidate)
UAT_URL:
```

## 3. In-scope surfaces

| Surface | Notes |
|---|---|
| Public static site + CSP headers | Nginx serving path; CSP may still be Report-Only |
| `/api/customer-auth/*` | OTP / session / abuse controls |
| `/api/v1/*` | Customer commerce (menu, cart, checkout, order) |
| Razorpay webhook path | Signature + durable inbox |
| `/api/workforce-auth/*` | Workforce AuthN / MFA |
| `/api/operations/v1/*` | Operations Console API + step-up |
| Origin-trust design | Lab/config evidence; live CF/DO/AOP may be PENDING (IMP-039) |

## 4. Explicit out of scope / constraints

- Inventing legal applicability (DPDP / CERT-In / PCI) findings as compliance claims
- Production cloud mutation (IMP-039 not activated)
- Raw PAN/CVV (platform must not store/process)
- Destructive tests against production customer data without Founder authorization
- Labeling any Cursor/self review as “independent assessment”

## 5. Environment dependency

If the assessor requires an **externally reachable** staging/production-like
environment and current authority does not permit exposure:

```text
DECISION_REQUIRED
question: Authorize externally reachable Founder-staging (or equivalent) for independent assessment?
why_current_authority_is_insufficient: GAP-EXT-ASSESS-001 needs real attack surface; IMP-039 live edge may still be PENDING
option_a: Founder staging URL + exact candidate deploy for assessor window
option_b: Defer assessment until IMP-039 origin realization
cursor_recommendation: option_a when Founder staging is healthy on exact main
decision_owner: Founder
blocked_scope: GAP-EXT-ASSESS-001 closure; IMP-038 acceptance
work_continuing_elsewhere: pack scaffolding; Secure SDLC gates; design+lab origin-trust
```

## 6. Pack / evidence index for assessors

| Artifact | Path |
|---|---|
| Pack index | `docs/platform/security/acceptance-pack/INDEX.md` |
| Threat model | `docs/platform/security/acceptance-pack/threat-model.md` |
| Asset inventory | `docs/platform/security/acceptance-pack/asset-inventory.md` |
| Data-flow map | `docs/platform/security/acceptance-pack/data-flow-map.md` |
| BOLA/BFLA map | `docs/platform/security/acceptance-pack/bola-bfla-evidence.md` |
| Auth abuse / step-up | `docs/platform/security/acceptance-pack/auth-abuse-step-up-evidence.md` |
| CSP evidence | `docs/platform/security/acceptance-pack/csp-header-evidence.md` |
| Secure SDLC | `docs/platform/security/acceptance-pack/secure-sdlc-evidence.md` |
| Gap register | `docs/platform/security/acceptance-pack/gap-register.md` |
| Origin-trust | `docs/platform/security/origin-trust/README.md` |

## 7. Required assessor outputs (for gap closure)

1. Written report identifying Critical/High findings with reproduction notes
2. Retest evidence after remediation of Critical/High
3. Explicit statement of independence (firm/individual ≠ implementation agent)
4. Candidate identity (`HEAD` / fingerprint / URL) assessed

Until those exist, `GAP-EXT-ASSESS-001` remains **OPEN**.
