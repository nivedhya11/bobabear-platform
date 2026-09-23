---
Status: Accepted
Decision date: 2026-09-22
Last updated: 2026-09-23
Decision ID: D-375
Amends: none (layers on ADR-016 / D-374 pilot infrastructure; ADR-004; ADR-005; ADR-009)
Amended by: D-376 (CSP Maps Fonts inventory hosts only; no topology change)
---

# ADR-017: Edge, Origin Trust, and Application-Authoritative Security Hardening

## Status

**Accepted** (2026-09-22). Binding CURRENT decision **[D-375](../decision-register.md)**.

This ADR owns the CURRENT V1 edge / origin-trust / client-IP / CSP-authority / challenge /
abuse-layering / step-up mechanism selection for IMP-038 Security & Privacy Hardening. It does
**not** amend business-domain, payment-state-machine, RBAC catalogue, or static-frontend transport
decisions. Pilot Droplet topology remains **[D-374](../decision-register.md)** / ADR-016.

```text
LAYERS_ON:
  ADR-016 / D-374 — pilot Droplet + Compose + self-hosted PostgreSQL + Spaces
  ADR-004 — customer / workforce identity and sessions
  ADR-005 — organization / outlet authorization
  ADR-009 — payments / webhooks / refunds / reconciliation (with D-361…D-363)

DOES_NOT_AMEND:
  business domain authority
  static Next.js export + external dynamic transport (D-356 / D-359)
  PaymentProvider / Razorpay selection (D-361)
  webhook inbox acknowledgement (D-362 / D-363)
  Access Control permission catalogue / role inventory
  IMP-037 backup / recovery architecture
```

Capability architecture lock:

[`../capabilities/IMP-038-security-privacy-hardening.md`](../capabilities/IMP-038-security-privacy-hardening.md)

Register identity: **D-375**. Global architecture: **ARCH-R21** (**ARCH-G27**).

## Context

`PD-IMP-038-DRAFT-2` requires layered edge + application security, CSP on the real Nginx serving
path, origin-bypass resistance, risk-based challenges, progressive auth abuse controls without
permanent attacker-triggered lockout, high-consequence workforce step-up, and evidence-backed
privacy matrices — without locking vendors in Product Definition and without inventing legal
applicability claims.

Verified baseline at Fit evaluation (`main` /
`43007808849f093d84cbe710f32a728b41a9e5a2`):

- Static Next export served by Nginx; Next `headers()` is a no-op for the public path
- No CSP on the real serving path
- Durable PostgreSQL-backed rate limits already exist in customer-auth and workforce-auth
- Razorpay webhook signature + durable inbox already exist under D-361…D-363
- Compose host `:8080` exposure is development topology, not production ingress

Cloudflare Free was the Product Definition preferred low-TCO candidate. Official documentation
(2026) confirms Free Managed Ruleset, DDoS protection, Bot Fight Mode (domain-wide), Turnstile,
Authenticated Origin Pulls, and limited edge rate limiting (1 rule; IP; 10s period/mitigation).

## Decision Summary

```text
EDGE_VENDOR: Cloudflare
EDGE_PLAN: Free
EDGE_ROLE: SUPPLEMENTAL_DEFENSE
APPLICATION_ROLE: AUTHORITATIVE_SECURITY_CONTROL

WAF: Cloudflare Free Managed Ruleset
DDOS: Cloudflare automatic L7/network protection (as provided on Free)
BOT_FIGHT_MODE: SUPPLEMENTAL_ONLY; default OFF for API-heavy production until compatibility evidence; NOT acceptance-critical
CHALLENGE: Cloudflare Turnstile (Free) for escalated customer auth + workforce auth abuse paths
EDGE_RATE_LIMIT: SUPPLEMENTAL (max 1 Free rule) on auth prefixes only; NOT authoritative

ORIGIN_TRUST_CHAIN (production target; provisioning owned by IMP-039 interface):
  Internet
    → Cloudflare proxied DNS / edge
    → Cloudflare WAF / challenge layer
    → TLS Full (strict) to origin + Authenticated Origin Pulls (zone-level preferred)
    → DigitalOcean Cloud Firewall (Cloudflare IP allowlist only on public app ports)
    → BOBA Nginx
    → internal Compose services

TRUSTED_CLIENT_IP:
  Nginx real_ip from Cloudflare CIDRs; real_ip_header CF-Connecting-IP;
  Nginx replaces X-Forwarded-For with verified client IP;
  production TRUST_PROXY_HOPS = 1 for customer-auth / workforce-auth / customer-commerce;
  rate-limit keys remain HMAC-pseudonymous (no raw IP storage for abuse keys)

CSP_AND_SECURITY_HEADERS_AUTHORITY: Nginx on the real static+proxy serving path
CSP_MODEL: report-only tuning → enforced allowlist (no nonces; static export)
CHALLENGE_PRIORITY: customer signup/login/OTP + workforce auth; ordinary checkout challenge default = NO
AUTH_ABUSE: extend existing PostgreSQL rate-limit tables + progressive cooldown + Turnstile; permanent attacker-triggered lockout FORBIDDEN
STEP_UP: reuse workforce-auth session; short-lived PostgreSQL step-up proofs; server enforcement on classified high-consequence mutations
AUTHORIZATION: existing ADR-005 / domain authorize remains authoritative; BOLA/BFLA negatives on real app paths
PAYMENT: no raw PAN/CVV; preserve D-361…D-363 webhook/inbox authority; no naive customer-IP webhook throttling
```

## Consequences

### Positive

- Low-TCO edge defense without paid Cloudflare requirement for V1 Fit
- Origin bypass resistance is an explicit production trust-chain property
- Application controls remain correct if edge is misconfigured, bypassed, or unavailable
- Existing mature auth rate limits are extended rather than replaced

### Negative / accepted residual

- Free edge rate limiting is coarse (1 rule / 10s) — application limits carry authority
- Bot Fight Mode cannot be customized per-path — therefore not acceptance-critical
- Production firewall / AOP / DNS proxy provisioning is an IMP-039 interface dependency
- Step-up proof table requires a schema change at implementation

### Explicit non-claims

```text
COMPLIANCE_CLAIMS: NONE
DPDP / CERT-In / PCI applicability: LEGAL_REVIEW_REQUIRED (not decided here)
OWASP ASVS certification: NOT CLAIMED (ASVS 5.0.0 L2 applicable-control matrix is evidence target)
```

## Implementation authorization

This decision **locks architecture only**. It does **not** authorize IMP-038 implementation,
start implementation, provision Cloudflare/DigitalOcean resources, or activate IMP-039.

## Amendments

### D-376 — CSP Maps Fonts inventory (2026-09-23)

Narrow locked-security-inventory amendment under ARCH-R21 / D-375 / this ADR / IMP-038 §8.2:

```text
style-src: + https://fonts.googleapis.com
font-src:  + https://fonts.gstatic.com
NEW_GLOBAL_ARCHITECTURE_MODEL: NO
ARCH_R22_REQUIRED: NO
```

Does **not** authorize Google host wildcards or any other directive expansions. Subsequent
non-inventoried hosts remain RED decisions.

## References

- [`../capabilities/IMP-038-security-privacy-hardening.md`](../capabilities/IMP-038-security-privacy-hardening.md)
- [`../product/IMP-038/product-definition.md`](../product/IMP-038/product-definition.md) (`PD-IMP-038-DRAFT-2`)
- https://developers.cloudflare.com/waf/managed-rules/
- https://developers.cloudflare.com/bots/plans/free/
- https://developers.cloudflare.com/turnstile/
- https://developers.cloudflare.com/waf/rate-limiting-rules/
- https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/
