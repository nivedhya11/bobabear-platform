---
Status: SUPPORTING — Client-bundle secret review evidence (IMP-038 PROVE)
Authority: US-IMP-038-024; capability secret minimization; Dockerfile public build-args
Compliance claim: NONE
---

# Client-bundle secret review

```text
GAP-SECRETS-REVIEW-001: CLOSED_AS_OF_THIS_ARTIFACT
COMPLIANCE_CLAIMS: NONE
REVIEW_METHOD: static allowlist + repository gates (not a penetration test)
```

## 1. Allowed public client values

Only these classes may appear in the browser bundle / static export:

| Token / pattern | Purpose | Source |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Absolute URLs | Dockerfile builder ARG |
| `NEXT_PUBLIC_BOBA_BEAR_GOOGLE_MAPS_BROWSER_KEY` | Maps browser key | Dockerfile builder ARG |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional GA | Dockerfile builder ARG (empty default) |

Dockerfile audit lock: **only** these `NEXT_PUBLIC_*` build-args are declared
(`npm run audit:docker`).

## 2. Forbidden in client bundle

| Class | Control |
|---|---|
| Database URLs / PG passwords | Not accepted as build-args; runtime env only |
| Customer/workforce auth secrets | Runtime env; separate realms |
| Razorpay webhook / server secrets | Server-only |
| Cloudflare / Turnstile **secret** keys | Server-only (site keys may be public) |
| OTPs, MFA secrets, session signing secrets | Server-only |
| Raw PAN/CVV | Never processed |

## 3. Gate evidence

| Gate | Entrypoint | Result at remediation |
|---|---|---|
| gitleaks | `npm run audit:secrets` | CI `security-sdlc` |
| Docker secret hygiene | `npm run audit:docker` | PASS (no credential literals; NEXT_PUBLIC allowlist) |
| Image layers | Runtime images omit `.env*`; `.dockerignore` excludes secrets | See Dockerfile / `.dockerignore` |
| SCA | `npm run audit:npm-sca` | High/Critical advisory-level fail-closed |

## 4. Review procedure (repeatable)

1. Confirm Dockerfile ARG list matches the table in §1 (`audit:docker`).
2. Confirm `.dockerignore` excludes `.env*` secret files.
3. Confirm gitleaks gate green on the candidate SHA.
4. Spot-check `out/` / static export for unexpected `sk_`, `whsec_`, `postgres://`, or private key PEM material after production builds when regenerating evidence.
5. Record candidate `HEAD` + working-tree fingerprint when attaching to Founder UAT.

## 5. Residual

- Browser Maps/GA keys are **public by design**; abuse is mitigated by HTTP
  referrer restrictions / provider consoles (operator-owned) and CSP allowlists.
- This review does **not** replace `GAP-EXT-ASSESS-001`.

## Closure

```text
GAP-SECRETS-REVIEW-001: CLOSED
OWNER: platform-security
METHOD: allowlist review + audit:docker + gitleaks mapping
```
