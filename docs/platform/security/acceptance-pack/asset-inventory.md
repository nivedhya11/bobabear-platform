---
Status: SUPPORTING — Explicit asset inventory (IMP-038 PROVE)
Authority: US-IMP-038-024; capability §16.1; ARCHITECTURE.md deployment model
Compliance claim: NONE
Derived from: verified architecture + repository deployables (not invented surfaces)
---

# Asset inventory

```text
GAP-ASSET-INV-001: CLOSED_AS_OF_THIS_ARTIFACT
COMPLIANCE_CLAIMS: NONE
INVENTORY_BASIS: ARCHITECTURE + Dockerfile/compose + capability lock
PRODUCTION_REALIZATION_PENDING: YES (live CF/DO/AOP = IMP-039)
```

This inventory lists **platform assets in scope for IMP-038 security/privacy**
evidence. It does not claim completeness of every transient CI runner or
developer workstation.

## 1. Deployable runtimes (V1)

| Asset ID | Artifact / image | Role | Trust boundary | Evidence |
|---|---|---|---|---|
| A-WEB | `boba-bear-app` / `web-runtime` | Static Next export behind Nginx; CSP/headers/`real_ip` | Public edge → origin Nginx | `Dockerfile` target `web-runtime`; `docker/nginx/*` |
| A-CA | `boba-bear-customer-auth` | Customer AuthN HTTP (8081 internal) | Origin internal only | `customer-auth-runtime` |
| A-WA | `boba-bear-workforce-auth` | Workforce AuthN HTTP (8082 internal) | Origin internal only | `workforce-auth-runtime` |
| A-CC | `boba-bear-customer-commerce` | Customer commerce façade (8083) | Origin internal; Razorpay webhook path | `customer-commerce-runtime` |
| A-OPS | `boba-bear-operations` | Operations Console API (8084) | Origin internal; workforce session | `operations-runtime` |
| A-PG | `boba-bear-postgres` | PostgreSQL 18 + pgBackRest tooling | Not public; Compose/DO private | `docker/postgres/Dockerfile` |
| A-TOOL | `boba-bear-tooling` | One-shot migrate/db-check/import jobs | Operator profile only | `tooling` target |

## 2. Edge / origin trust-chain assets (design locked; live IMP-039)

| Asset ID | Component | Owner slice | Status |
|---|---|---|---|
| A-CF-ZONE | Cloudflare Free zone (DNS proxy, WAF managed ruleset, optional Turnstile) | IMP-039 live; IMP-038 design | `PRODUCTION_REALIZATION_PENDING` |
| A-DO-FW | DigitalOcean Cloud Firewall (Cloudflare IP allowlist on app ports) | IMP-039 | Pending live |
| A-AOP | Authenticated Origin Pull cert (zone-level preferred) | IMP-039 | Pending live |
| A-ORIGIN-TLS | Origin TLS Full (strict) certificate | IMP-039 | Pending live |
| A-NGINX-CONF | Version-controlled Nginx CSP/`real_ip`/proxy contracts | IMP-038 | Present in repo |

## 3. Data stores / persistence

| Asset ID | Store | Contents (classes) | Notes |
|---|---|---|---|
| A-PG-DATA | PostgreSQL volumes | Profiles, sessions, carts, orders, payments refs, audits, step-up proofs | See [`privacy-retention-matrix.md`](./privacy-retention-matrix.md) |
| A-BACKUP | IMP-037 backup targets (e.g. Spaces) | Encrypted backups | Backup ≠ statutory retention |

## 4. Secrets / key material (classes — not values)

| Asset ID | Class | Storage model | Gate |
|---|---|---|---|
| A-SEC-RUNTIME | DB URLs, auth secrets, webhook secrets | Host-local / Compose env (ADR-015 / D-374 principles) | Never in images; `.dockerignore` + gitleaks |
| A-SEC-PUBLIC | `NEXT_PUBLIC_*` browser keys (Maps, GA, site URL) | Build-args / public bundle | Client-bundle review |
| A-SEC-PROVIDER | Razorpay / Cloudflare / Turnstile server secrets | Runtime env only | Vendor register |

## 5. Client / browser surfaces

| Asset ID | Surface | Notes |
|---|---|---|
| A-UI-STATIC | Static export under Nginx | CSP Enforce (`GAP-CSP-ENFORCE-001` CLOSED; D-376) |
| A-SCRIPT-RP | Razorpay Checkout scripts | Allowlisted hosts |
| A-SCRIPT-MAPS | Google Maps / Places | Auth-gated; allowlisted |
| A-SCRIPT-TS | Cloudflare Turnstile | Challenge paths |
| A-SCRIPT-GA | Google Analytics (optional) | GA CSP variant only when enabled |

## 6. Explicit non-assets / out of scope

- Petpooja / aggregator platforms (external channel)
- Developer laptops beyond gitleaks/CI gates
- Third-party SaaS control planes beyond shared-responsibility rows

## Closure

```text
GAP-ASSET-INV-001: CLOSED
OWNER: platform-security
METHOD: derived from ARCHITECTURE.md + Dockerfile/compose + IMP-038 capability
```
