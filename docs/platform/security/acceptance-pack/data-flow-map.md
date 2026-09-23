---
Status: SUPPORTING — Explicit data-flow map (IMP-038 PROVE)
Authority: US-IMP-038-024; ARCHITECTURE.md; capability §13/§16; ADR-017 / D-375
Compliance claim: NONE
Derived from: verified architecture + code paths (not invented flows)
---

# Data-flow map

```text
GAP-DATAFLOW-001: CLOSED_AS_OF_THIS_ARTIFACT
COMPLIANCE_CLAIMS: NONE
PRODUCTION_REALIZATION_PENDING: YES (live edge path = IMP-039)
```

Flows below are **logical** V1 paths. Live Cloudflare orange-cloud / DO firewall /
AOP are design-locked and lab-proven under IMP-038; production realization is
IMP-039.

## 1. Public customer browse / order (happy path)

```text
Browser
  → [PENDING live] Cloudflare Free edge (WAF/DDoS supplemental)
  → DO firewall allowlist (Cloudflare IPs) [PENDING live]
  → Nginx (CSP Enforce, security headers, real_ip from CF-Connecting-IP)
       ├─ static assets / Next export (A-WEB)
       ├─ /api/customer-auth/* → customer-auth:8081 (OTP/session)
       ├─ /api/v1/* → customer-commerce:8083 (menu/cart/checkout/order)
       └─ Razorpay webhook path → customer-commerce:8083
  → PostgreSQL (A-PG) via service network only
```

**PII / secrets moving:** phone (hashed where required), session cookies, address
payloads, cart/order IDs, Razorpay payment refs (no PAN/CVV).

## 2. Customer authentication

```text
Browser → Nginx → customer-auth
  → OTP issue/verify (short-lived artifacts)
  → Session create (Better Auth / PG)
  → Rate-limit / abuse keys (HMAC digests; no raw IP as key material)
```

## 3. Payment

```text
Browser → Razorpay Checkout (client script; public key only)
Razorpay → webhook → Nginx → customer-commerce
  → signature verify → durable inbox → Payment/Order effects
```

**Forbidden:** raw PAN/CVV storage or processing (ARCH-G27 / PCI matrix).

## 4. Workforce / operations

```text
Browser → Nginx → workforce-auth (login/MFA/session)
Browser → Nginx → /api/operations/v1/* → operations:8084
  → in-process WorkforceAuthRuntime verification
  → step-up proof consume on high-consequence mutations
  → PostgreSQL + audit tables
```

## 5. Maps / location

```text
Authenticated browser → Google Maps/Places (browser key)
  → minimal app state for serviceability
  → NO default raw location telemetry retention
```

## 6. Backups (IMP-037)

```text
PostgreSQL → pgBackRest (in A-PG image) → backup target (e.g. Spaces)
Restore → disposable/lab or authorized recovery path only
```

Backup retention is **not** statutory retention.

## 7. Observability / IR

```text
App/runtime logs → operator-accessible log sinks
  → redaction: no OTPs, passwords, MFA secrets, PAN/CVV, provider secrets
Security/abuse tables → investigative retention (LEGAL_REVIEW_REQUIRED windows)
```

## 8. Trust-boundary notes

| Boundary | Control |
|---|---|
| Internet → origin | CF + DO FW + AOP (live IMP-039); Nginx contracts in-repo now |
| Nginx → Node services | Compose internal network; no published service ports |
| Node → Postgres | Private network credentials via env files (not image layers) |
| Browser → third parties | CSP allowlist + vendor register |

## Closure

```text
GAP-DATAFLOW-001: CLOSED
OWNER: platform-security + privacy
METHOD: derived from ARCHITECTURE.md §§ deployment/ARCH-G27 + Dockerfile/nginx/compose
```
