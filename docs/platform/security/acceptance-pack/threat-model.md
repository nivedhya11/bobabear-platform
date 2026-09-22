---
Status: SUPPORTING — IMP-038 threat model T-01…T-25 (Acceptance Pack)
Authority: capability §13; US-015; §16.1
Compliance claim: NONE
Residual CRITICAL: ZERO
---

# Threat model (T-01 through T-25)

```text
RESIDUAL_CRITICAL: ZERO
RESIDUAL_HIGH_REQUIRES_FOUNDER_AUTHORITY_NOTE: YES
COMPLIANCE_CLAIMS: NONE
```

Evidence pointers prefer **existing** repository tests and configs. Status of a row is
control residual risk after preventive + detection + response — not a compliance verdict.

| ID | Attacker goal | Entry surface | Preventive control | Detection | Response | Test / evidence pointer | Residual risk | Owner |
|---|---|---|---|---|---|---|---|---|
| T-01 | OTP flood / phone enumeration | `/api/customer-auth/` OTP send | Phone+IP limits + progressive cooldown + Turnstile | Rate-limit / challenge audits | Temporary cooldown; fail closed | `tests/customer-auth/http.integration.test.ts` (send-otp 429); Turnstile harness | MEDIUM | Customer-auth |
| T-02 | OTP brute-force | OTP verify | `otp_verify_ip_10m` + attempt limits + challenge | Verify failure spikes | Cooldown; non-enumerating errors | Customer-auth HTTP + domain OTP attempt limits | MEDIUM | Customer-auth |
| T-03 | Credential stuffing (workforce) | Workforce sign-in | Email+IP limits + Turnstile + MFA | Auth failure metrics | Temporary cooldown; MFA | `tests/workforce-auth/http.integration.test.ts` (email RL) | MEDIUM | Workforce-auth |
| T-04 | MFA fatigue / MFA brute | MFA endpoints | `workforce_mfa_ip_10m` + 5/15m temporary lockout | MFA failure audits | Temporary cooldown (not permanent) | `tests/workforce-auth/http.integration.test.ts` (MFA lockout suite) | LOW | Workforce-auth |
| T-05 | ATO via session theft | Stolen cookie/token | Session/CSRF/origin; step-up for high-consequence | Anomalous privileged action | Step-up fail closed; broader revoke FOLLOW_UP | Admin step-up HTTP negatives; CSRF/origin suites | MEDIUM — session revoke UX FOLLOW_UP | Auth owners |
| T-06 | BOLA (cross-customer object) | Customer APIs | ADR-005 / subject binding | Authz deny logs | Deny | `tests/payment-security/`; `tests/order-security/`; `tests/cart-security/`; `tests/checkout-security/`; profile/address security | LOW | Authz |
| T-07 | BFLA / cross-outlet privilege | Admin/ops APIs | ADR-005 scope + step-up classes | Authz deny + step-up audit | Deny; fail closed | `tests/access-control/scope.test.ts`; `tests/administration/*`; `tests/operations/*-http.integration.test.ts`; order-security SEC-W11 | LOW | Authz / admin |
| T-08 | Edge bypass to origin | Direct Droplet IP / open port | DO firewall CF allowlist + AOP + Full strict | Firewall / TLS client-auth failures | Block; IMP-039 provision | [`../origin-trust/`](../origin-trust/); lab contract probes | HIGH — **Founder note:** live realization owned by IMP-039; IMP-038 accepts design+lab; IMP-040 fails closed without production realization (§16.2) | IMP-039 live; IMP-038 design |
| T-09 | Client-IP spoof for limits | Forged XFF / CF headers | `real_ip` replace + hops=1 + no direct origin | Limit-key anomalies | Ignore spoofed headers | `docker/nginx/nginx.conf` XFF replace; `scripts/nginx-origin-redirect.test.mjs`; origin-trust real_ip contract | MEDIUM until live origin block | Platform ops |
| T-10 | XSS / script injection | Public static + admin | CSP allowlist (Report-Only → enforce) + nosniff | CSP reports | Enforce; fix allowlist | `docker/nginx/security-headers.conf`; nginx header test | HIGH — **Founder note:** FD-038-05 Report-Only until challenge/Maps journey proof; enforcement required before final V1 CSP AC | Platform ops |
| T-11 | Clickjacking | Framed storefront/admin | `frame-ancestors 'self'` + XFO SAMEORIGIN | CSP reports | Enforce | Same CSP/header evidence | LOW (headers present; enforce still Report-Only for CSP) | Platform ops |
| T-12 | Bot scraping / inventory scrape | Public menu/APIs | App throttles + optional edge; Bot Fight OFF by default | Volume anomalies | Temporary throttle; review Bot Fight | App commerce limits; Bot Fight N/A_WITH_REASON for acceptance | MEDIUM | Platform / commerce |
| T-13 | Checkout / payment-init flood | Commerce payment init | customer-commerce application limits | Init rate metrics | Throttle; no webhook IP limit | Commerce HTTP + payment suites | MEDIUM | Commerce |
| T-14 | Webhook spoof / replay | Razorpay webhook | Signature verify + durable inbox + idempotency | Signature failures / replay | Reject; no naive IP RL | `tests/customer-commerce/razorpay.http.integration.test.ts`; payment-security unverified webhook | LOW | Payments |
| T-15 | Refund abuse | Refund create | ADR-009 + `CLASS_FINANCIAL_REVERSAL` step-up + authz | Refund audits | Deny without step-up | `tests/operations/refunds-http.integration.test.ts`; admin step-up classes | LOW | Ops / payments |
| T-16 | Promo / coupon farming | Promo apply surfaces | Commercial rules + abuse matrix | Promo anomaly | Temporary block / review | `tests/promotions/*`; admin promotions HTTP | MEDIUM | Commercial |
| T-17 | Mass account creation | Customer signup/OTP | Phone+IP+challenge layered | Signup velocity | Challenge + cooldown | Customer-auth rate limits | MEDIUM | Customer-auth |
| T-18 | Order/resource enumeration | IDOR on orders/etc. | BOLA negatives; opaque IDs where used | Authz denies | Deny | `tests/order-security/` SEC-C04 conceal; payment IDOR | LOW | Authz |
| T-19 | Maps/Places cost abuse | Anonymous geocode | Auth-gated Maps (`US-002`) | Provider call metrics | Deny anonymous | `tests/imp-036b/maps-security.test.ts` | LOW | Location |
| T-20 | Secret leakage (logs/CI) | Logs, bundles, CI | Secret minimization + gitleaks + no client secrets | Scan hits | Fail CI; redact | `npm run audit:secrets`; CodeQL; payment-security secret absence | LOW | Platform security |
| T-21 | Dependency / container vuln | Supply chain | npm audit High+ + Trivy + exception register | CI failures | Patch or expiring exception | `npm run audit:npm-sca`; CI `security-sdlc`; exception register | LOW | Platform security |
| T-22 | Privacy over-retention / false erasure | Profile delete / logs | Retention matrix; profile delete ≠ erasure; operator-mediated | Process audits | Legal hold wins | [`privacy-retention-matrix.md`](./privacy-retention-matrix.md); DPDP matrix | MEDIUM — statutory windows LEGAL_REVIEW | Privacy |
| T-23 | PAN/CVV exposure | Payment UI/API | Razorpay-controlled capture; no BOBA raw storage | Scope assessment | Fail closed if raw card appears | [`pci-shared-responsibility-matrix.md`](./pci-shared-responsibility-matrix.md) | LOW | Payments |
| T-24 | Admin destructive privacy action without re-auth | Erasure execution | `CLASS_PRIVACY_DESTRUCTIVE` step-up | Step-up audit | Fail closed | Step-up class allowlist + admin step-up HTTP | LOW | Admin |
| T-25 | Business-logic fraud (composite) | Multi-API chains | US-015 matrix + selective tests | Fraud signals | Documented IR playbook | [`business-abuse-evidence.md`](./business-abuse-evidence.md); IR pack | MEDIUM | Security + ops |

## Residual summary

| Residual class | Count | Disposition |
|---|---|---|
| CRITICAL | **0** | Required ZERO |
| HIGH | 2 (T-08 origin live; T-10 CSP enforce) | Founder-visible notes above; owned gaps in [`gap-register.md`](./gap-register.md) |
| MEDIUM / LOW | remainder | Tracked; no silent Critical acceptance |

## Explicit non-claims

This matrix is a threat-input / control-traceability artifact. It is **not** an OWASP,
ISO, or regulatory certification.
