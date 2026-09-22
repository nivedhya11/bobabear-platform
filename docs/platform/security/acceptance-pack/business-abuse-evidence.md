---
Status: SUPPORTING — Business / bot / API abuse evidence (US-014/015)
Authority: capability §13 T-01…T-25; US-IMP-038-014/015
Compliance claim: NONE
---

# Business-abuse evidence

Maps locked abuse threats to existing tests. Selective new tests only if a clear quick gap
exists — Tranche E adds **none** beyond origin-trust lab scripts.

| Threat | Locked control theme | Evidence pointer | Status |
|---|---|---|---|
| OTP flood | Phone+IP limits + cooldown + Turnstile | `tests/customer-auth/http.integration.test.ts` | Mapped |
| Credential stuffing | Workforce email+IP limits + MFA | `tests/workforce-auth/http.integration.test.ts` | Mapped |
| MFA abuse | Temporary MFA lockout / RL | Same workforce MFA suite | Mapped |
| Enumeration | Non-leaking authz/order conceal | Order/payment/checkout security suites | Mapped |
| Checkout / payment-init flood | Application commerce limits | Commerce/payment HTTP + security suites | Mapped (app authoritative) |
| Refund abuse | Authz + financial step-up | `tests/operations/refunds-http.integration.test.ts`; step-up HTTP | Mapped |
| Promo farming | Commercial engine rules | `tests/promotions/*`; admin promotions HTTP | Mapped |
| Maps cost abuse | Anonymous deny | `tests/imp-036b/maps-security.test.ts` | Mapped |
| Webhook spoof / replay | Signature + inbox idempotency | `tests/customer-commerce/razorpay.http.integration.test.ts`; payment-security unverified webhook | Mapped |
| Composite business-logic fraud | Multi-API chains | Threat model T-25 + IR playbook; selective domain tests above | Documented; no single composite suite |
| Edge bot / Free RL | Supplemental only | N/A_WITH_REASON for acceptance-critical Bot Fight; live edge PENDING IMP-039 | Documented |

## Explicit application authority

```text
APPLICATION_SECURITY_REPLACED_BY_EDGE: FORBIDDEN
BOT_FIGHT_MODE_ACCEPTANCE_CRITICAL: NO
NAIVE_WEBHOOK_IP_RATE_LIMIT: FORBIDDEN
```
