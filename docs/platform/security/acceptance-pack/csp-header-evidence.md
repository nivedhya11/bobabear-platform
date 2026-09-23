---
Status: SUPPORTING — CSP / security-header evidence
Authority: US-IMP-038-001; FD-038-05; ADR-017; D-376; Tranche A
Compliance claim: NONE
---

# CSP / header evidence

```text
CSP_PHASE: ENFORCE
CSP_ENFORCEMENT: ACTIVE
CSP_ENFORCEMENT_FLIP: PERFORMED
NEXT_HEADERS_AS_SERVING_AUTHORITY: FORBIDDEN
SCRIPT_SRC_WILDCARDS: FORBIDDEN
D-376_MAPS_FONTS: APPLIED
GAP-CSP-ENFORCE-001: CLOSED
```

## Serving-path authority

| Item | Path |
|---|---|
| Nginx config (includes headers on static + proxy locations) | `docker/nginx/nginx.conf` |
| Generated header fragment | `docker/nginx/security-headers.conf` |
| Generator | `scripts/generate-nginx-security-headers.mjs` (`--enforce` / `BOBA_CSP_ENFORCE=1`) |
| Unit allowlist tests | `scripts/generate-nginx-security-headers.test.mjs` |
| Live Nginx container header assertion (Enforce) | `scripts/nginx-origin-redirect.test.mjs` — enforcing CSP on static path |

## Headers present (Enforce CSP)

- `Content-Security-Policy` with explicit Razorpay / Turnstile / Maps / **D-376 Maps Fonts** hosts
- `Strict-Transport-Security`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy`
- `Permissions-Policy`
- `X-Frame-Options: SAMEORIGIN`

Locked host inventory = capability §8.2 as amended by **D-376** (no wildcards; GA hosts only when GA enabled).

### D-376 inventory addition (exact)

```text
style-src: + https://fonts.googleapis.com
font-src:  + https://fonts.gstatic.com
```

No `*.googleapis.com` / `*.gstatic.com` / other Google wildcards.

## Founder-staging journey proof — 2026-09-23

```text
BASE_CANDIDATE_HEAD: 663b355cea7aab2571c43ed4c1f3e50c39012af8
STAGING_URL: http://localhost:8080
PROOF_RUNTIME: Playwright Chromium + SecurityPolicyViolationEvent
CSP_HEADER_APPLICATION: bind-mount updated security-headers.conf onto running
  boba-staging app (exact app image unchanged; CSP fragment only) for interim proof;
  formal exact-main redeploy follows merge of this change set
```

### Report-Only re-proof (post D-376 fonts) — PASS

Maps/address confirmation loaded Maps JS + Maps-injected Google Fonts CDN hosts with
**zero unauthorized Report-Only violations**. Negative `evil.example` script reported only.

### Enforce proof — PASS (required Maps + negative)

| Journey | Result | CSP notes |
|---|---|---|
| Menu / discovery | PASS | Self-only; no unauthorized violations |
| Google Maps / address | PASS | Map confirm `.gm-style`; loads `maps.googleapis.com`, `maps.gstatic.com`, `fonts.googleapis.com`, `fonts.gstatic.com` under **Enforce** with zero unauthorized violations |
| Customer OTP | PARTIAL | `/login/` Sign-in UI reachable; full OTP not completed (staging SMS / Founder phone gate) |
| Turnstile challenged flow | NOT_TRIGGERED | Escalated challenge not forced; `challenges.cloudflare.com` present in enforcing CSP |
| Cart / checkout / Razorpay | PARTIAL | Add/cart attempted; full Razorpay Checkout not completed in this window; Razorpay hosts remain inventoried |
| Workforce login UI | PASS | Form first-paint at `/workforce/login/` |
| Workforce MFA | BLOCKED | Requires authenticated workforce session (not provisioned in this CSP window) |
| Step-up | BLOCKED | Requires authenticated workforce + high-consequence mutation |
| Operations / admin | BLOCKED | Requires authenticated workforce session |
| Refund | BLOCKED | Requires payment/order + workforce privileges |

Blocked/partial rows are **staging provider / session configuration** limits, not CSP inventory gaps.
No additional non-inventoried hosts were observed on exercised journeys.

### Enforce negative (AC-001-03)

| Probe | Result |
|---|---|
| `https://evil.example/blocked.js` script-src | **BLOCKED** — `SecurityPolicyViolationEvent` disposition=`enforce` |

## Decision record

Founder approved option A (2026-09-23): add exact Maps Fonts hosts. Persisted as **D-376** /
DR-18 amending IMP-038 §8.2 under ARCH-R21 / D-375 / ADR-017. No ARCH-R22.

## Still pending (non-CSP-inventory)

| Pending proof | Owner | Gap ID |
|---|---|---|
| Independent external assessment | Founder-commissioned assessor | GAP-EXT-ASSESS-001 (OPEN; localhost not remote-reachable) |
| Founder UAT on exact candidate fingerprint | Founder | GAP-FOUNDER-UAT-001 |
| Live Cloudflare/DO/AOP production chain | IMP-039 | GAP-ORIGIN-LIVE-001 |
