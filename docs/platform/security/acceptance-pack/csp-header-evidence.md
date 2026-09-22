---
Status: SUPPORTING — CSP / security-header evidence
Authority: US-IMP-038-001; FD-038-05; ADR-017; Tranche A
Compliance claim: NONE
---

# CSP / header evidence

```text
CSP_PHASE: REPORT_ONLY
CSP_ENFORCEMENT: PENDING_JOURNEY_PROOF
NEXT_HEADERS_AS_SERVING_AUTHORITY: FORBIDDEN
SCRIPT_SRC_WILDCARDS: FORBIDDEN
```

## Serving-path authority

| Item | Path |
|---|---|
| Nginx config (includes headers on static + proxy locations) | `docker/nginx/nginx.conf` |
| Generated header fragment | `docker/nginx/security-headers.conf` |
| Generator | `scripts/generate-nginx-security-headers.mjs` |
| Unit allowlist tests | `scripts/generate-nginx-security-headers.test.mjs` |
| Live Nginx container header assertion (Report-Only) | `scripts/nginx-origin-redirect.test.mjs` — “serves IMP-038 security headers and CSP Report-Only” |

## Headers present (Report-Only CSP)

- `Content-Security-Policy-Report-Only` with explicit Razorpay / Turnstile / Maps hosts
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`
- `X-Frame-Options: SAMEORIGIN`

## Still pending (live / journey)

| Pending proof | Owner | Gap ID |
|---|---|---|
| Flip to enforcing `Content-Security-Policy` after auth-challenge + Maps/address journey compatibility | Platform ops | GAP-CSP-ENFORCE-001 |
| Browser negative: disallowed script origin blocked under **enforced** CSP (AC-001-03) | Platform ops | GAP-CSP-ENFORCE-001 |
| Founder UAT on customer-visible header/challenge behaviour | Founder | GAP-FOUNDER-UAT-001 |

Report-Only status is intentional (Tranche A complete with deferral). Do not claim XSS
fully mitigated until enforcement evidence exists.
