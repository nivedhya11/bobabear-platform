---
Status: SUPPORTING — Auth abuse + step-up evidence
Authority: US-IMP-038-003/013; capability §9–§11; Tranche B/C
Compliance claim: NONE
---

# Auth abuse + step-up evidence

```text
PERMANENT_ATTACKER_TRIGGERED_LOCKOUT: FORBIDDEN
SECOND_IDENTITY_SYSTEM_FOR_STEP_UP: FORBIDDEN
CHALLENGE: Cloudflare Turnstile on escalated auth paths
```

## Customer auth abuse

| Control | Evidence |
|---|---|
| OTP send rate limit (429) | `tests/customer-auth/http.integration.test.ts` |
| Turnstile config load in test harness | `tests/customer-auth/support/service-harness.ts` → `src/server/security/turnstile` |
| Trusted proxy hops | `CUSTOMER_AUTH_TRUST_PROXY_HOPS` in `.env.example` / `.env.test` |

## Workforce auth / MFA abuse

| Control | Evidence |
|---|---|
| MFA consecutive failure lockout (temporary) | `tests/workforce-auth/http.integration.test.ts` — “MFA lockout and rate limits” |
| Email sign-in rate limit | Same suite |
| Backup code replay rejection | Workforce MFA HTTP flows in same file |
| Turnstile harness | `tests/workforce-auth/support/service-harness.ts` |

## Step-up (high-consequence)

| Control | Evidence |
|---|---|
| Missing / expired / replayed / class-mismatch proofs fail closed | `tests/administration/admin-step-up-http.integration.test.ts` |
| Proof persistence / TTL behaviour | `tests/database/workforce-step-up.integration.test.ts` |
| Shared test helper (allowlisted path) | `tests/administration/support/workforce-step-up.ts` |
| Admin mutations requiring step-up | `tests/administration/admin-http.integration.test.ts`; commercial/catalog suites importing helper |

## Residual / follow-ups

| Item | Status | Owner |
|---|---|---|
| Broader session-revocation UX beyond step-up | FOLLOW_UP (capability) | Auth owners |
| Progressive cooldown numeric ladder documentation in pack | Selective — product tables authoritative | Customer-auth |
| Live Turnstile production keys / UX journey | Journey + Founder UAT pending | Auth + Founder |
