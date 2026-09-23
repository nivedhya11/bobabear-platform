<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "CAPABILITY_ARCHITECTURE",
  "capability": "IMP-038",
  "title": "Security & Privacy Hardening",
  "architectureLock": "ARCHITECTURE_LOCKED",
  "architectureFit": "PASS",
  "architectureFitResult": "PASS",
  "implementationAuthorized": true,
  "implementationStarted": true,
  "implementation": "AUTHORIZED / STARTED",
  "impAccepted": false,
  "founderUatRequired": true,
  "schemaChangeRequired": true,
  "lastReviewed": "2026-09-22",
  "productDefinition": "PD-IMP-038-DRAFT-2",
  "bindingDecisions": ["D-376", "D-375", "ADR-017", "D-374", "ADR-016", "ADR-004", "ADR-005", "ADR-009", "D-361", "D-362", "D-363"],
  "dependsOn": ["IMP-008", "IMP-009", "IMP-010", "IMP-011", "IMP-024", "IMP-026", "IMP-035", "IMP-036B", "IMP-036G", "IMP-037"],
  "architectureBase": "ARCH-R21"
}
-->

# IMP-038 — Security & Privacy Hardening

## Capability Architecture — ARCHITECTURE_LOCKED

This document is the **locked capability architecture** for IMP-038. It records Architecture Fit
performed against **ARCH-R21 / D-375 / ADR-017** (Cloudflare Free edge layer + origin trust chain +
application-authoritative abuse/step-up/privacy hardening), within the pilot infrastructure base
**ARCH-R20 / D-374 / ADR-016** (single DigitalOcean Basic Droplet + Docker Engine/Compose +
self-hosted PostgreSQL 18).

Independent (ChatGPT) Architecture Fit review is **PASS** (reviewed technical candidate head
`3b03164d6581c5a98a893c24e92eaddece004e90` / tree `5bb499fa84a5bf02682b30518f2bf898ddb23540`; review
`5279884548`). The later review-status reconciliation commit is **not** the independently
reviewed technical candidate and is **not** the Fit-evaluated artifact. Implementation is
**AUTHORIZED** and **STARTED** under Founder delivery authorization
(`FOUNDER_IMP038_IMPLEMENTATION_AUTHORIZATION: CURSOR_SESSION_MANDATE`). This does **not** accept
IMP-038, activate IMP-039, or claim DPDP / CERT-In / PCI / OWASP certification compliance.

```text
ARCHITECTURE_FIT: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT_RESULT: PASS
IMP038_ARCHITECTURE_LOCKED: YES
ARCHITECTURE_LOCKED = YES
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD = 3b03164d6581c5a98a893c24e92eaddece004e90
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE = 5bb499fa84a5bf02682b30518f2bf898ddb23540
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID = 5279884548
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: YES
IMP038_IMPLEMENTATION_AUTHORIZED: YES
IMP038_STARTED: YES
FOUNDER_IMP038_IMPLEMENTATION_AUTHORIZATION: CURSOR_SESSION_MANDATE
IMP038_IMPLEMENTATION_COMPLETE: YES
IMP038_HOLD: YES
IMP038_ACCEPTED: NO
IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES
IMP039_ACTIVATED: NO
CONTINUATION_EXCEPTION: IMP037_PROVIDER_BLOCKED_TO_IMP038
PROGRAM_PAUSE: PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED
PROGRAM_PAUSE_AUTHORITY: D-377
D-375_CREATED: YES
D375_REQUIRED_FOR_LOCK: YES
ARCH_R21_REQUIRED: YES
ARCH_R21_CREATED: YES
FITS_WITHIN_ARCH_R20_PLUS_ARCH_G27: YES
NEW_DEPLOYABLE_SERVICE: NO
APPLICATION_SCHEMA_CHANGE_REQUIRED: YES
STEP_UP_PROOF_SCHEMA_CHANGE: YES
AUTH_ABUSE_EXTENDS_EXISTING_TABLES: YES
NEW_APPLICATION_PERMISSION: NO
NEW_APPLICATION_ROLE: NO
CLOUDFLARE_FREE_SELECTED: YES
CLOUDFLARE_ARCHITECTURE_LOCKED: YES
APPLICATION_SECURITY_REMAINS_AUTHORITATIVE: YES
PERMANENT_ATTACKER_TRIGGERED_LOCKOUT: FORBIDDEN
BOBA_RAW_PAN_STORAGE: NO
BOBA_RAW_CVV_STORAGE: NO
LEGAL_REVIEW_OPEN_TOPICS: 9
COMPLIANCE_CLAIMS: NONE
CANONICAL_ROADMAP_STATE = GTM-R141 / STATE-R139
```

`CANONICAL_ROADMAP_STATE = GTM-R141 / STATE-R139` is the **CURRENT tip** (IMP-036H Product
Definition activation under `PROGRAM_PAUSE` D-377; IMP-038 held with
`IMP038_IMPLEMENTATION_COMPLETE: YES` / `IMP038_ACCEPTED: NO`). Prior tip
`GTM-R140 / STATE-R138` remains the **combined implementation AUTHORIZE + START** provenance tip.
Prior tip `GTM-R139 / STATE-R137` remains the **Architecture Fit PASS /
architecture LOCK** provenance tip. Fit evaluation was
against the exact `main` candidate in §1.1. ROADMAP and STATE remain the sole lifecycle authority;
this capability document never overrides them.

| Field | Value |
|---|---|
| Capability / title | `IMP-038 — Security & Privacy Hardening` |
| Authority | `CAPABILITY_ARCHITECTURE` (`CURRENT`) |
| Architecture base | `ARCH-R21` / `D-375` / `ADR-017` (`ARCH-G27`); inherits `ARCH-R20` / `D-374` / `ADR-016` (`ARCH-G26`) |
| Architecture lock | `ARCHITECTURE_LOCKED` (independent Architecture Fit review **PASS**) |
| Architecture Fit | **PASS** (performed against Fit-evaluated candidate §1.1) |
| Product Definition | `PD-IMP-038-DRAFT-2` **APPROVED**; Product Definition Gate **PASS** |
| Formal ROADMAP lifecycle | Controlled continuation under `IMP037_PROVIDER_BLOCKED_TO_IMP038`; Fit/lock recorded; implementation **AUTHORIZED** / **STARTED** / **COMPLETE** / **HELD** (`IMPLEMENTATION_IN_PROGRESS` under `PROGRAM_PAUSE` D-377; `IMP038_HOLD: YES`) |
| Implementation | **AUTHORIZED** / **STARTED** / **COMPLETE** / **NOT ACCEPTED** (`FOUNDER_IMP038_IMPLEMENTATION_AUTHORIZATION: CURSOR_SESSION_MANDATE`; `IMP038_IMPLEMENTATION_COMPLETE: YES`) |
| Accepted | **NO** (`IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES`) |
| Founder UAT required | **YES** (`FOUNDER_UAT_STATUS = NOT_PERFORMED`) |
| Application schema change required | **YES** for step-up proofs (`STEP_UP_PROOF_SCHEMA_CHANGE = YES`); abuse extends existing tables (`AUTH_ABUSE_EXTENDS_EXISTING_TABLES = YES`) |
| New deployable / always-on service | **NO** |
| New application role / permission | **NO** |
| New D-number required for lock | **YES** (`D375_REQUIRED_FOR_LOCK: YES`; `D-375_CREATED: YES`) |
| Global ARCH bump required | **YES** (`ARCH_R21_REQUIRED: YES`; `ARCH_R21_CREATED: YES`) |
| Binding decisions | `D-375`, `ADR-017`, `D-374`, `ADR-016`, `ADR-004`, `ADR-005`, `ADR-009`, `D-361`, `D-362`, `D-363` |
| Depends on | `IMP-008`, `IMP-009`, `IMP-010`, `IMP-011`, `IMP-024`, `IMP-026`, `IMP-035`, `IMP-036B`, `IMP-036G`, `IMP-037` |
| Open mutually exclusive architecture alternatives | **NONE** (Cloudflare Free locked; application remains authoritative) |

### Required document separation (A–H)

| Block | Content | Sections |
|---|---|---|
| **A** | Binding product requirements | §3 |
| **B** | Existing global architecture constraints | §4 |
| **C** | Architecture Fit decisions | §5 – §16 |
| **D** | Implementation-deferred details | §17 |
| **E** | Explicit prohibitions / safety invariants | §18 |
| **F** | Validation / evidence obligations | §19 |
| **G** | Residual risks | §20 |
| **H** | Lifecycle / gate status | §21 |

---

## 1. Authority / status / provenance

This artifact is CURRENT `CAPABILITY_ARCHITECTURE` for IMP-038. It is the sole CURRENT
capability-architecture authority for this slice and supersedes every earlier IMP-038 Architecture
Fit candidate posture (including Product Definition text that left Cloudflare unlocked).

### 1.1 Fit-evaluated candidate (exact)

```text
Repository: /home/ajoshi/repos/boba-bear-platform
ARCHITECTURE_FIT_EVALUATED_BRANCH = main
ARCHITECTURE_FIT_EVALUATED_HEAD = 43007808849f093d84cbe710f32a728b41a9e5a2
ARCHITECTURE_FIT_EVALUATED_TREE = 581fb23631df40044ec7b9c449545959a90b9998
ARCHITECTURE_FIT_EVALUATED_WORKING_TREE_FINGERPRINT = ab00d1ab23f3c7d8b140feefcd1a0787f1fedf90ab08a9934c9a892a77c8184d
ARCHITECTURE_FIT_DATE = 2026-09-22
ARCHITECTURE_FIT_RESULT = PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEW = PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD = 3b03164d6581c5a98a893c24e92eaddece004e90
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE = 5bb499fa84a5bf02682b30518f2bf898ddb23540
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID = 5279884548
```

The persistence commit that records this lock is a **subsequent governance commit** and is **NOT**
the Fit-evaluated candidate above (`lock-persistence commit != Fit-evaluated candidate`). The later
independent-review evidence commit / review-status reconciliation commit is likewise **NOT** the
Fit-evaluated candidate and is **NOT** the independently reviewed technical candidate
(`fit-evaluated artifact != independently reviewed technical candidate != review-status
reconciliation commit`). Do not treat lock-persistence or review-reconciliation HEAD / tree /
fingerprint as the Fit-evaluated artifact.

### 1.2 Product Definition does not lock Cloudflare

```text
PD_IMP038_CLOUDFLARE_LOCK: NO (preferred candidate only at PD time)
THIS_CAPABILITY_CLOUDFLARE_LOCK: YES (Architecture Fit selection)
```

`PD-IMP-038-DRAFT-2` correctly left Cloudflare as a preferred low-TCO candidate
(`CLOUDFLARE_ARCHITECTURE_LOCKED = NO` at Product Definition). **This Fit locks Cloudflare Free**
(`CLOUDFLARE_FREE_SELECTED: YES`; `CLOUDFLARE_ARCHITECTURE_LOCKED: YES`) while preserving
`APPLICATION_SECURITY_REMAINS_AUTHORITATIVE: YES`. Product Definition stories/ACs remain product
authority; this document supplies mechanisms only.

### 1.3 Canonical anchors

```text
VISION = VISION-1
ROADMAP = GTM-R141 (CURRENT tip — IMP-036H Product Definition activation under PROGRAM_PAUSE D-377; verify CURRENT at read time)
STATE = STATE-R139 (CURRENT tip — program pause; verify CURRENT at read time)
PRIOR_AUTHORIZE_START_TIP = GTM-R140 / STATE-R138
PRIOR_LOCK_TIP = GTM-R139 / STATE-R137
ARCHITECTURE = ARCH-R21 (ARCH-G27; inherits ARCH-R20 / ARCH-G26)
DECISION REGISTER = DR-19 (D-377 program pause; D-376 CSP Maps Fonts amendment; D-375; ADR-017; prior DR-16 / D-374 remain CURRENT for pilot infra)
PRODUCT DELIVERY = PD-1
TESTING = TEST-1
PERSONA = PERSONA-1
GOLDEN JOURNEYS = GJ-1
Product Definition = docs/platform/product/IMP-038/product-definition.md (APPROVED; PD-IMP-038-DRAFT-2)
Binding decisions = D-377, D-376, D-375, ADR-017, D-374, ADR-016, ADR-004, ADR-005, ADR-009, D-361, D-362, D-363
Depends on = IMP-008, IMP-009, IMP-010, IMP-011, IMP-024, IMP-026, IMP-035, IMP-036B, IMP-036G, IMP-037
IMP038_IMPLEMENTATION_COMPLETE = YES
IMP038_HOLD = YES
IMP038_ACCEPTED = NO
PROGRAM_PAUSE = PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED
PROGRAM_PAUSE_AUTHORITY = D-377
GAP-EXT-ASSESS-001 = NOT_CLOSED
```

---

## 2. Purpose and Product Definition reference

Support the approved IMP-038 business outcome without inventing product behaviour:

> Make BOBA Bear’s launch-critical application security and privacy posture coherent, threat-modeled,
> evidence-backed, and fail-closed where required — with layered edge defense that does not replace
> application authorization, and with regulatory topics covered by applicability/control/evidence
> matrices under `LEGAL_REVIEW_REQUIRED` markers — not silence and not compliance claims.

Canonical product behaviour authority:

- [`docs/platform/product/IMP-038/product-definition.md`](../product/IMP-038/product-definition.md)
  — `PD-IMP-038-DRAFT-2` **APPROVED** (Product Definition Gate **PASS**)

This capability architecture selects **mechanisms only**. It does not restate, narrow, or widen the
approved product requirements, and it does not change any Founder decision `FD-038-01` … `FD-038-21`.

```text
product_semantics_changed = NO
PRODUCT_DEFINITION_GATE = PASS
ARCHITECTURE_FIT: PASS
ARCHITECTURE_LOCKED = YES
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO
COMPLIANCE_CLAIMS: NONE
```

---

# A. Binding product requirements

## 3. Product requirements this Fit must satisfy

Derived from `PD-IMP-038-DRAFT-2` (24 stories; 20 V1 acceptance; `FD-038-01` … `FD-038-21`).
These are **obligations**, not proven results.

| Requirement | Product authority | Mechanism section |
|---|---|---|
| CSP + security headers on real serving path; cutover must not disable | `US-001`; `FD-038-05`; `BR-001` | §8 |
| Anonymous Google Maps/Places/geocode I/O = NO | `US-002`; IMP-036B §6.1 | §14 (Maps gate; inherits existing auth) |
| Customer OTP/auth abuse: progressive throttle + cooldown + risk-based challenge; no permanent attacker lockout | `US-003`; `FD-038-15` | §9 |
| Profile delete ≠ legal erasure; operator-mediated V1 privacy | `US-004`; `FD-038-01/04/10` | §14 |
| Data-class retention matrix structure (numeric windows = legal) | `US-005`; `FD-038-02` | §14 |
| Secure SDLC: SAST/SCA/secret/container + exception register | `US-006`/`US-016`; `FD-038-09/17/18` | §15 |
| BOLA/BFLA negatives; deny-by-default; ADR-005 preserved | `US-007`; `BR-004` | §11 |
| Incident investigation pack + templates | `US-008`; `FD-038-03` | §16, §19 |
| Workforce auth/MFA abuse + high-consequence step-up | `US-013`; `FD-038-06/15/21` | §10, §11 |
| Layered edge + application bot/API abuse defense | `US-014`; `FD-038-13/21` | §5, §6, §9 |
| Business-logic abuse threat model | `US-015` | §13 |
| ASVS v5.0.0 L2 applicable-controls matrix (not certification) | `US-017`; `FD-038-16` | §19 |
| CERT-In / DPDP / PCI matrices with LEGAL_REVIEW markers; no claims | `US-018`/`020`/`021` | §14, §19 |
| Security-log PII/secret minimization | `US-019`; `FD-038-19` | §14 |
| Vendor + client-script register | `US-022` | §16 |
| Edge-to-origin bypass resistance | `US-023`; `FD-038-14` | §6 |
| Security & Privacy Acceptance Pack | `US-024` | §16 |
| `BOBA_RAW_PAN_STORAGE = NO`; `BOBA_RAW_CVV_STORAGE = NO` | `FD-038-12`; `BR-020` | §12 |
| Payment webhook signature / durable inbox preserved | `D-361`/`362`/`363` | §12 |
| Acceptance blocked by IMP-037 contiguity | `BR-009`; continuation exception | §21 |

```text
NO CONTROL WITHOUT EVIDENCE
NO GAP WITHOUT OWNER
NO EXCEPTION WITHOUT AUTHORITY
NO COMPLIANCE CLAIM WITHOUT APPLICABILITY / LEGAL REVIEW
PERMANENT_ATTACKER_TRIGGERED_LOCKOUT: FORBIDDEN
APPLICATION_SECURITY_REMAINS_AUTHORITATIVE: YES
```

---

# B. Existing global architecture constraints

## 4. Constraints inherited from ARCH-R20 / ARCH-R21 / binding ADRs

This Fit operates **inside** the CURRENT pilot topology and existing auth/commerce/payment
authorities. It neither amends nor reopens commercial domain semantics.

```text
PILOT_CLOUD_PROVIDER: DigitalOcean
PILOT_COMPUTE_MODEL: single Basic Droplet + Docker Engine + Compose
SELF_HOSTED_POSTGRESQL: YES (PostgreSQL 18)
OFF_HOST_BACKUP_DESTINATION: DigitalOcean Spaces (IMP-037)
PUBLIC_SITE: static export (ARCH-G01)
CUSTOMER_AUTH: standalone Node HTTP behind Nginx (/api/customer-auth/)
WORKFORCE_AUTH: standalone Node HTTP behind Nginx (/api/workforce-auth/)
CUSTOMER_COMMERCE: dedicated Node HTTP behind Nginx (/api/v1/*) — D-359/D-360
PAYMENT_PROVIDER: Razorpay behind PaymentProvider — D-361
WEBHOOK_ACK: durable inbox then async process — D-363
AUTHORIZATION: ADR-005 deny-by-default; server-derived scope
IDENTITY: ADR-004 customer ≠ workforce; step-up model
NEW_DEPLOYABLE_SERVICE: NO (ARCH-G02 / ARCH-G14)
ARCH_G27: Cloudflare Free supplemental edge + origin trust chain; application security authoritative
```

| Inherited constraint | Implication for IMP-038 |
|---|---|
| ARCH-G01 static public site | Next.js `headers()` is a no-op on real serving path; Nginx is CSP/header authority |
| ARCH-G02 / ARCH-G14 | No new deployable WAF/auth microservice; edge is Cloudflare SaaS; proofs in PostgreSQL |
| ARCH-G03 / ARCH-G04 / ARCH-G08 | No caller-manufactured authority; realms remain distinct; BOLA/BFLA negatives required |
| ARCH-G13 | Abuse counters, step-up proofs, and durable security state live in PostgreSQL |
| ARCH-G26 / D-374 | Single Droplet; DO Cloud Firewall + Nginx remain on-host; no paid LB required for V1 |
| ADR-004 / ADR-005 | Extend abuse + step-up; do not invent second identity or permission catalogue |
| ADR-009 / D-361–D-363 | Preserve payment/webhook contracts; no PAN/CVV; no naive webhook IP rate limit |
| IMP-037 FD-037-03 | Backup retention ≠ statutory/privacy retention |
| CONTINUATION_EXCEPTION | IMP-038 acceptance blocked until IMP-037 accepted/reconciled |

---

# C. Architecture Fit decisions

## 5. Edge plane — Cloudflare Free (locked)

```text
CLOUDFLARE_FREE_SELECTED: YES
CLOUDFLARE_ARCHITECTURE_LOCKED: YES
EDGE_ROLE: SUPPLEMENTAL
APPLICATION_SECURITY_REMAINS_AUTHORITATIVE: YES
```

### 5.1 Selected Free-tier controls

| Control | V1 posture | Notes |
|---|---|---|
| Free Managed Ruleset | **YES** — enabled | Official WAF managed rules on Free plan |
| DDoS (L3/L4 / automatic) | **YES** — automatic | Cloudflare automatic DDoS; not acceptance-critical alone |
| Bot Fight Mode | **SUPPLEMENTAL ONLY**; default **OFF** for API-heavy production until compatibility evidence | Domain-wide caution; **NOT** acceptance-critical; may break legitimate API clients |
| Turnstile Free | **Preferred** risk-based challenge | Customer signup/login/OTP and workforce auth when abuse thresholds escalate (`FD-038-21`) |
| Edge rate limiting | Free = **1 rule**, IP-based, **10s** period/mitigation | **SUPPLEMENTAL only** on `/api/customer-auth/` + `/api/workforce-auth/` paths; authoritative limits remain in auth services |
| SSL / TLS mode | Full (strict) to origin | See §6 |
| Authenticated Origin Pulls | Zone-level preferred | See §6; provisioning = IMP-039 |

Ordinary checkout challenge default remains **NO** (`FD-038-21`). Edge absence or bypass must not
disable application throttling, CSRF/origin checks, authorization, or Turnstile siteverify.

### 5.2 Free-tier limitations (explicit)

- One custom rate-limit rule; coarse IP+path mitigation only — insufficient as sole auth abuse control.
- Bot Fight Mode is blunt; keep OFF until proven compatible with customer-commerce and auth clients.
- Managed ruleset is shared/Free feature set — not a substitute for ADR-005 authorization tests.
- Turnstile Free is challenge UX + siteverify; server must fail closed on abuse routes when required.

### 5.3 Official vendor documentation cited

| Topic | Citation |
|---|---|
| Managed rules / Free WAF | https://developers.cloudflare.com/waf/managed-rules/ |
| Bot Fight Mode (Free) | https://developers.cloudflare.com/bots/plans/free/ |
| Turnstile | https://developers.cloudflare.com/turnstile/ |
| Rate limiting rules | https://developers.cloudflare.com/waf/rate-limiting-rules/ |
| Authenticated Origin Pulls / origin TLS | https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/ |

---

## 6. Origin trust chain (production target)

Provisioning of Cloudflare DNS proxy, DO firewall CIDRs, AOP certificates, and origin TLS material
is an **IMP-039 interface contract** (§16). IMP-038 locks the **design**; IMP-039 is **not**
activated by this document (`IMP039_ACTIVATED: NO`).

### 6.1 Locked production ingress path

```text
Internet
  → Cloudflare proxied DNS
  → CF WAF / challenge (supplemental)
  → authenticated TLS Full (strict)
  → DigitalOcean Cloud Firewall (Cloudflare IP allowlist only on app ports)
  → BOBA Nginx
  → Compose services (customer-auth / workforce-auth / customer-commerce / static)
```

| Element | Locked decision |
|---|---|
| Authenticated Origin Pulls | **YES** — zone-level client cert preferred over global shared Cloudflare cert |
| Origin certificate | Full (strict) — valid origin cert trusted by Cloudflare |
| DO Cloud Firewall | Allowlist Cloudflare published IPv4+IPv6 CIDRs on application HTTPS/HTTP ports only |
| Nginx Host validation | Reject unexpected `Host` values for public vhosts |
| Emergency operator access | Separate jump/SSH path; **not** unrestricted public app-port exposure |
| Compose `:8080` exposure | **DEV only** — not production ingress design |

```text
EDGE_TO_ORIGIN_BYPASS_RESISTANCE_REQUIRED: YES
DIRECT_ORIGIN_FROM_INTERNET_ON_APP_PORTS: FORBIDDEN (production)
```

---

## 7. Trusted client IP (locked)

Nginx is the sole hop that normalizes client IP before application services.

| Setting | Locked value |
|---|---|
| Module | Nginx `real_ip` |
| Trust sources | Cloudflare published CIDRs via `set_real_ip_from` |
| Header | `real_ip_header CF-Connecting-IP` |
| Recursion | `real_ip_recursive on` |
| X-Forwarded-For policy | Nginx **MUST replace** (not append) so upstream `X-Forwarded-For` = verified client IP **only** |
| Application trust | Production `TRUST_PROXY_HOPS = 1` for customer-auth, workforce-auth, and customer-commerce (single Nginx hop after `real_ip` normalization) |
| Rate-limit keys | Preserve HMAC-SHA256 pseudonymous IP/phone keys; **never** store raw IP as rate-limit key material |
| Spoof resistance | Direct-origin blocked (§6) so Internet-spoofed `CF-Connecting-IP` cannot reach Nginx |

```text
RAW_IP_AS_RATE_LIMIT_KEY: FORBIDDEN
TRUST_PROXY_HOPS_PRODUCTION: 1
```

---

## 8. CSP and security headers (locked)

```text
HEADER_AUTHORITY: Nginx (sole authority on real serving path)
NEXT_HEADERS_FUNCTION: NO-OP for static export (ARCH-G01)
CSP_PHASE: report-only → enforce (FD-038-05)
FINAL_V1_CSP_ENFORCEMENT: REQUIRED
CSP_NONCES: NO (static export — use strict allowlists)
SCRIPT_SRC_WILDCARDS: FORBIDDEN
```

### 8.1 Required headers

| Header | Locked posture |
|---|---|
| Content-Security-Policy | Report-only then enforce; `frame-ancestors 'self'` (or XFO SAMEORIGIN equivalent via CSP) |
| Strict-Transport-Security | HSTS on HTTPS production responses |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | Restrictive explicit value (implementation picks among safe options; no silent omit) |
| Permissions-Policy | Deny unused powerful features by default |
| Cache-Control | APIs already `no-store`; sensitive façades `no-store` |

### 8.2 CSP allowlist (minimal explicit approved integrations)

Directive-specific origins (no wildcards). Implementation must map each host to the correct CSP
directive (`script-src`, `frame-src`, `connect-src`, `img-src`, `style-src`, `worker-src` as
applicable) during report-only tuning; the table is the locked host inventory, not a single-bucket
dump.

| Source class | Allow (hosts) | Typical directives |
|---|---|---|
| Self | `'self'`; `/_next/static` | default-src / script-src / style-src / img-src / font-src / connect-src |
| Razorpay Checkout | `checkout.razorpay.com`; `api.razorpay.com`; `lumberjack.razorpay.com` | script-src / frame-src / connect-src |
| Cloudflare Turnstile | `challenges.cloudflare.com` | script-src / frame-src / connect-src |
| Google Maps JS | `maps.googleapis.com`; `maps.gstatic.com` | script-src / img-src / connect-src / style-src as required by Maps assets |
| Google Maps Fonts CDN (D-376) | `fonts.googleapis.com` (**style-src only**); `fonts.gstatic.com` (**font-src only**) | Maps JS UI chrome typography; no wildcard Google hosts |
| Analytics | optional `www.googletagmanager.com` / `www.google-analytics.com` **only when GA enabled** | script-src / connect-src / img-src |
| Fonts (app) | self-hosted via `next/font` for first-party UI | font-src `'self'` (+ D-376 Maps Fonts hosts above) |

```text
CSP_TURNSTILE_HOST: challenges.cloudflare.com
CSP_MAPS_HOSTS: maps.googleapis.com + maps.gstatic.com
CSP_MAPS_FONTS_STYLE_SRC: fonts.googleapis.com
CSP_MAPS_FONTS_FONT_SRC: fonts.gstatic.com
CSP_WILDCARD_SCRIPT_SRC: FORBIDDEN
CSP_WILDCARD_GOOGLE_HOSTS: FORBIDDEN
```

No wildcard `script-src`. Payment, Maps, and Turnstile embeds must continue to function under the
allowlist (`FD-038-05`). Disallowed hosts must fail closed under enforcement (`AC-001-03`).
Report-only tuning must prove auth-challenge and address/Maps journeys before final enforcement.
**D-376** (2026-09-23) narrowly amends this inventory for Maps-required Google Fonts CDN hosts only;
subsequent non-inventoried hosts remain RED decisions.

---

## 9. Customer auth abuse controls (locked)

Extend existing PostgreSQL-backed OTP rate limits; do **not** discard them.

### 9.1 Existing authoritative limits (preserved)

| Rule id | Window / max |
|---|---|
| `otp_send_phone_60s` | 1 / 60s |
| `otp_send_phone_1h` | 5 / 1h |
| `otp_send_ip_10m` | 10 / 10m |
| `otp_verify_ip_10m` | 20 / 10m |

`AUTH_ABUSE_EXTENDS_EXISTING_TABLES = YES` — extend `customer_otp_rate_limits` (and related abuse
state) rather than introducing a new deployable store.

### 9.2 Extensions (locked behaviour)

| Control | Mechanism |
|---|---|
| Progressive cooldown | Escalating temporary cooldown after repeated limit hits; never permanent lockout |
| Combined scopes | Principal (phone-hash) **+** IP-hash combined scopes in addition to existing separate scopes |
| Turnstile challenge | After threshold: require Turnstile token; **server-side siteverify**; **fail-closed** on auth abuse routes; token **single-use** + short TTL |
| Test harness | Turnstile **test keys only** in non-production |
| Distributed abuse | IP limits + phone limits + challenge; if insufficient → temporary broader cooldown by phone-hash and IP-hash — still temporary |
| Enumeration | Non-enumerating failure responses (`FD-038-15`) |

```text
PERMANENT_ATTACKER_TRIGGERED_LOCKOUT: FORBIDDEN
AUTH_ABUSE_RESPONSE: PROGRESSIVE_THROTTLE + TEMPORARY_COOLDOWN + RISK_BASED_CHALLENGE
EDGE_RATE_LIMIT: SUPPLEMENTAL_ONLY
```

---

## 10. Workforce auth abuse controls (locked)

Extend existing PostgreSQL-backed workforce rate limits.

### 10.1 Existing authoritative limits (preserved)

| Rule id | Window / max |
|---|---|
| `workforce_sign_in_email_15m` | 5 / 15m |
| `workforce_sign_in_ip_10m` | 20 / 10m |
| `workforce_mfa_ip_10m` | 30 / 10m |
| `workforce_security_change_ip_10m` | 10 / 10m |

Existing MFA temporary lockout **5 failures / 15 minutes** is classified as **temporary cooldown**,
not permanent lockout (`PERMANENT_ATTACKER_TRIGGERED_LOCKOUT: FORBIDDEN`).

### 10.2 Extensions (locked behaviour)

| Control | Mechanism |
|---|---|
| Turnstile on login | When risk escalates (threshold/cooldown escalation); server siteverify; fail-closed on abuse path |
| Enumeration | `AUTHENTICATION_FAILED` (or equivalent) — enumeration-safe |
| Edge rate limit | Supplemental on `/api/workforce-auth/` only |

---

## 11. Step-up authentication and authorization (locked)

### 11.1 Step-up mechanism

```text
STEP_UP_IDENTITY_SYSTEM: REUSE_WORKFORCE_AUTH_SESSION
SECOND_IDENTITY_SYSTEM: FORBIDDEN
STEP_UP_PROOF_SCHEMA_CHANGE: YES
STEP_UP_PROOF_STORE: PostgreSQL (short-lived durable table)
STEP_UP_TTL: ~5–15 minutes
STEP_UP_BINDING: workforce session id + recent MFA/password re-auth
STEP_UP_USE: single-use OR action-bound
STEP_UP_ENFORCEMENT: operations/admin application layer before mutation
STEP_UP_FAIL_CLOSED: YES
STEP_UP_REPLAY: REJECTED
STEP_UP_AUDIT: REQUIRED event on grant/consume/deny
```

### 11.2 Step-up classes (server allowlist)

Derived from existing admin/ops surfaces — **not** new product invention:

| Class | Examples |
|---|---|
| `CLASS_ACCESS_MUTATION` | Membership create / lifecycle elevate; role grant/revoke |
| `CLASS_CREDENTIAL_SECURITY` | Password change; MFA enroll/reset/disable (self or admin-initiated) |
| `CLASS_PRIVACY_DESTRUCTIVE` | Operator-mediated erasure/disposition execution |
| `CLASS_FINANCIAL_REVERSAL` | Refund create/initiate |

Broader session-revocation UX beyond step-up remains **FOLLOW_UP** (`US-009`).

### 11.3 Authorization verification strategy (ADR-005 preserved)

| Obligation | Locked approach |
|---|---|
| Authority | ADR-005 deny-by-default; server-derived org/outlet/territory scope |
| New roles/permissions | **NO** (`NEW_APPLICATION_ROLE: NO`; `NEW_APPLICATION_PERMISSION: NO`) |
| BOLA/BFLA negatives | Tests on **real app paths** across customer / outlet / territory / org |
| Edge rules | Do **not** replace authorization |
| Cross-realm | Customer tokens never authorize workforce mutations and vice versa |

---

## 12. Payment and webhook security (locked)

Preserve `D-361` / `D-362` / `D-363` / `ADR-009`:

| Control | Locked posture |
|---|---|
| Signature verification | Required before durable accept |
| Durable webhook inbox | Required; ack after durable write (D-363) |
| Naive IP rate limit on webhook | **FORBIDDEN** (provider IP ranges / retries would break payments) |
| Body size | **64 KiB** max (existing contract preserved) |
| Payment-initiation abuse | Application limits in customer-commerce — not edge-only |
| PAN / CVV | `BOBA_RAW_PAN_STORAGE: NO`; `BOBA_RAW_CVV_STORAGE: NO`; card capture Razorpay/provider-controlled |
| PCI claims | **NONE**; shared-responsibility matrix mandatory (`US-021`); validation path = LEGAL_REVIEW |

---

## 13. Threat model (locked artifact obligation)

IMP-038 must publish a threat-model matrix covering attacker goal → entry → control → detection →
response → evidence. Residual Critical at acceptance = **ZERO**; exploitable High requires Founder
R3 + compensating controls + expiry (`FD-038-09`).

| ID | Threat | Entry | Primary control | Detection | Response |
|---|---|---|---|---|---|
| T-01 | OTP flood / phone enumeration | `/api/customer-auth/` OTP send | Existing phone/IP limits + progressive cooldown + Turnstile | Rate-limit / challenge audits | Temporary cooldown; fail closed |
| T-02 | OTP brute-force | OTP verify | `otp_verify_ip_10m` + attempt limits + challenge | Verify failure spikes | Cooldown; non-enumerating errors |
| T-03 | Credential stuffing (workforce) | Workforce sign-in | Email+IP limits + Turnstile + MFA | Auth failure metrics | Temporary cooldown; MFA |
| T-04 | MFA fatigue / MFA brute | MFA endpoints | `workforce_mfa_ip_10m` + 5/15m temporary lockout | MFA failure audits | Temporary cooldown |
| T-05 | ATO via session theft | Stolen cookie/token | Existing session/CSRF/origin; step-up for high-consequence | Anomalous privileged action | Step-up fail closed; revoke path FOLLOW_UP |
| T-06 | BOLA (cross-customer object) | Customer APIs | ADR-005 / subject binding | Authz deny logs | Deny; security tests |
| T-07 | BFLA / cross-outlet privilege | Admin/ops APIs | ADR-005 scope + step-up classes | Authz deny + step-up audit | Deny; fail closed |
| T-08 | Edge bypass to origin | Direct Droplet IP / open port | DO firewall CF allowlist + AOP + Full strict | Firewall / TLS client-auth failures | Block; IMP-039 provision |
| T-09 | Client-IP spoof for limits | Forged XFF / CF headers | `real_ip` replace + hops=1 + no direct origin | Limit-key anomalies | Ignore spoofed headers |
| T-10 | XSS / script injection | Public static + admin | CSP enforce + nosniff | CSP reports | Enforce; fix allowlist |
| T-11 | Clickjacking | Framed storefront/admin | `frame-ancestors 'self'` | CSP reports | Enforce |
| T-12 | Bot scraping / inventory scrape | Public menu/APIs | App throttles + optional edge; Bot Fight OFF by default | Volume anomalies | Temporary throttle; review Bot Fight |
| T-13 | Checkout / payment-init flood | Commerce payment init | customer-commerce application limits | Init rate metrics | Throttle; no webhook IP limit |
| T-14 | Webhook spoof / replay | Razorpay webhook | Signature verify + durable inbox + idempotency | Signature failures / replay | Reject; no naive IP RL |
| T-15 | Refund abuse | Refund create | ADR-009 + `CLASS_FINANCIAL_REVERSAL` step-up + authz | Refund audits | Deny without step-up |
| T-16 | Promo / coupon farming | Promo apply surfaces | Existing commercial rules + abuse matrix controls | Promo anomaly | Temporary block / review |
| T-17 | Mass account creation | Customer signup/OTP | Phone+IP+challenge layered | Signup velocity | Challenge + cooldown |
| T-18 | Order/resource enumeration | IDOR on orders/etc. | BOLA negatives; opaque IDs where already used | Authz denies | Deny |
| T-19 | Maps/Places cost abuse | Anonymous geocode | Auth-gated Maps (`US-002`) | Provider call metrics | Deny anonymous |
| T-20 | Secret leakage (logs/CI) | Logs, bundles, CI | Secret minimization + gitleaks + no client secrets | Scan hits | Fail CI; redact |
| T-21 | Dependency / container vuln | Supply chain | npm audit gate + Trivy/Grype + exception register | CI failures | Patch or expiring exception |
| T-22 | Privacy over-retention / false erasure | Profile delete / logs | Retention matrix; profile delete ≠ erasure; operator-mediated | Process audits | Legal hold wins |
| T-23 | PAN/CVV exposure | Payment UI/API | Razorpay-controlled capture; no BOBA raw storage | Scope assessment | Fail closed if raw card appears |
| T-24 | Admin destructive privacy action without re-auth | Erasure execution | `CLASS_PRIVACY_DESTRUCTIVE` step-up | Step-up audit | Fail closed |
| T-25 | Business-logic fraud (composite) | Multi-API chains | US-015 matrix + selective tests | Fraud signals | Documented response playbook |

OWASP Top 10 / API Security risks are **threat inputs only** — not certification claims
(`FD-038-16`; `US-017`).

---

## 14. Privacy, retention, and security logging (locked structure)

```text
PRIVACY_REQUEST_MODEL_V1: OPERATOR_MEDIATED
FULL_SELF_SERVICE_PRIVACY_PORTAL_V1: NO
PROFILE_DELETE_EQUALS_LEGAL_ERASURE: NO
LOCATION_DATA_MINIMIZATION_REQUIRED: YES
RAW_LOCATION_TELEMETRY_RETENTION_BY_DEFAULT: NO
SECURITY_LOG_SECRET_MINIMIZATION: REQUIRED
SECURITY_LOG_PII_MINIMIZATION: REQUIRED
DATA_CLASS_RETENTION_MATRIX_REQUIRED: YES
BACKUP_RETENTION_IS_NOT_STATUTORY_RETENTION: YES (IMP-037 FD-037-03)
COMPLIANCE_CLAIMS: NONE
```

### 14.1 Retention matrix structure (not legal durations)

Architecture locks the **matrix schema**, not numeric statutory windows:

| Column | Purpose |
|---|---|
| Data class | e.g. customer profile, OTP artifacts, sessions, orders, payments, FDs, audits, security logs, backups, location |
| Purpose | Why retained |
| System of record | PostgreSQL table / Spaces / vendor |
| Operational window | Product/ops (may be set) |
| Statutory window | **LEGAL_REVIEW_REQUIRED** — do not invent |
| Disposition | anonymize / delete / hold / archive |
| Owner | Named owner |
| Evidence pointer | Acceptance Pack row |

### 14.2 Maps / location

Anonymous Google location I/O remains **forbidden** (IMP-036B §6.1 / `US-002`). Auth-gated
Maps/Places/geocode only. No default raw telemetry retention.

### 14.3 Security logging

Prefer HMAC digests for IP/phone where suitable (consistent with existing auth PII hashing). Never
log OTPs, passwords, MFA secrets, raw PAN/CVV, or provider secrets. Preserve investigative utility
for incident / CERT-In **readiness** without claiming CERT-In compliance.

---

## 15. Secure SDLC (locked CI minimum)

Prefer free/OSS and extend existing domain audit scripts.

| Control | Locked minimum |
|---|---|
| SAST | CodeQL **or** Semgrep in CI |
| SCA | `npm audit` gate (fail on policy threshold) |
| Secrets | gitleaks (or equivalent) on PRs |
| Containers | Trivy **or** Grype image scan |
| SBOM | Optional provenance artifact; not a substitute for gates |
| Actions hardening | Pin GitHub Actions by **commit SHA** |
| Dependency updates | Dependabot or equivalent |
| Exceptions | Vuln exception register: owner, rationale, authority, compensating controls, retest, expiry (High default ≤30 days unless Founder overrides) |
| Domain audits | Extend existing mutation/config/authz audit scripts — do not invent SIEM |

```text
UNRESOLVED_CRITICAL_AT_ACCEPTANCE: ZERO
KNOWN_EXPLOITABLE_HIGH: NO_SILENT_ACCEPTANCE
INDEPENDENT_EXTERNAL_WEB_API_SECURITY_ASSESSMENT_BEFORE_IMP038_ACCEPTANCE: REQUIRED
```

---

## 16. Acceptance Pack and IMP-039 interface (locked)

### 16.1 Acceptance Pack artifact structure

| Artifact | Owner | Fail-closed gate |
|---|---|---|
| Pack index (US-024 minimum) | Platform security owner | Missing index → pack incomplete |
| Control → evidence map | Story owners | `NO CONTROL WITHOUT EVIDENCE` |
| Gap register | Named owners | `NO GAP WITHOUT OWNER` |
| Exception register | Founder/authority | `NO EXCEPTION WITHOUT AUTHORITY` (+ expiry) |
| Threat model (§13) | Security | Critical residual = ZERO |
| ASVS L2 applicable matrix | Security | PASS/GAP/N/A_WITH_REASON only |
| DPDP / CERT-In / PCI matrices | Security + legal | Rows may be `LEGAL_REVIEW_REQUIRED`; **no compliance claim** |
| Vendor + script register | Security | Must include Cloudflare + Razorpay + Maps + hosting |
| CSP/header evidence | Platform ops | Real serving-path proof |
| Auth abuse + step-up evidence | Auth owners | Fail-closed proofs |
| BOLA/BFLA negatives | Authz owners | Real paths |
| External assessment report | Founder-commissioned | Required before acceptance |
| Incident pack / templates | Ops | Internal IR required; external notify = legal trigger |

### 16.2 IMP-039 provisioning interface (contract only — no deadlock)

IMP-039 (not activated by this Fit) owns **production cloud mutation** for:

1. Cloudflare zone DNS proxy enablement for public hostnames  
2. DO Cloud Firewall Cloudflare CIDR allowlists on app ports  
3. Authenticated Origin Pull certificate install (zone-level preferred)  
4. Origin TLS Full (strict) certificate lifecycle  
5. Emergency jump/SSH path distinct from public app ports  

```text
IMP039_ACTIVATED: NO
IMP038_LOCKS_DESIGN: YES
IMP039_OWNS_PRODUCTION_CLOUD_MUTATION: YES

ORIGIN_BYPASS_EVIDENCE_SPLIT:
  IMP038_OWNS:
    - version-controlled Nginx / AOP / firewall / real_ip contracts
    - CI/lab/staging negative probes proving the locked trust-chain config rejects direct-origin
      when applied in an authorized non-production or Founder-staging representation
    - Acceptance Pack design+lab rows for US-023
  IMP039_OWNS:
    - live Cloudflare orange-cloud DNS, live DO firewall apply, live AOP cert install on pilot Droplet
  IMP038_ACCEPTANCE:
    - REQUIRES design+lab evidence for the locked trust chain
    - DOES NOT require IMP-039 activation as a prerequisite
    - MAY record residual PRODUCTION_REALIZATION_PENDING owned by IMP-039 with Founder-visible
      Acceptance Pack row + expiry
  PUBLIC_GTM_IMP040:
    - FAIL_CLOSED without production realization of the origin-trust chain
    - prevents launch-with-bypass-theater even if IMP-038 accepted on design+lab evidence
```

This split removes the false sequence “IMP-038 acceptance requires live IMP-039 output → IMP-039
activates only after IMP-038 acceptance.” IMP-038 Fit/lock does **not** activate IMP-039; later
human gates may authorize IMP-039 when needed for production realization without reopening this Fit.
---

# D. Implementation-deferred details

## 17. Implementation-deferred (inside this lock, not reopened by it)

| Deferred detail | Bound by |
|---|---|
| Exact progressive-cooldown numeric ladders | Must remain temporary; no permanent lockout |
| Exact Turnstile site keys / widget placement UX | Fail-closed siteverify; test keys non-prod only |
| Exact CSP report-uri / report-to endpoint | Report-only then enforce; allowlist §8.2 |
| Exact Referrer-Policy / Permissions-Policy token lists | Must be explicit and restrictive |
| Exact step-up proof table DDL / indexes | `STEP_UP_PROOF_SCHEMA_CHANGE = YES`; TTL 5–15m; session-bound |
| Exact combined principal+IP rule ids | Extend existing rate-limit tables |
| Bot Fight Mode enablement decision evidence | Default OFF; not acceptance-critical |
| Exact ASVS applicable-control selection set | Matrix with PASS/GAP/N/A; no certification claim |
| Numeric statutory / security-log retention days | LEGAL_REVIEW_REQUIRED |
| External assessor commercial selection | CERT-In empanelled preferred where practical — not a claim |
| Cloudflare dashboard IaC vs manual runbook | IMP-039 may choose; design §5–§6 fixed |
| Tranche scheduling / staffing | §21.5 A–F not executed |

---

# E. Explicit prohibitions / safety invariants

## 18. Prohibitions (binding under this lock)

```text
PERMANENT_ATTACKER_TRIGGERED_LOCKOUT: FORBIDDEN
APPLICATION_SECURITY_REPLACED_BY_EDGE: FORBIDDEN
CLOUDFLARE_PAID_PLAN_REQUIRED_FOR_V1: NO
BOT_FIGHT_MODE_ACCEPTANCE_CRITICAL: NO
SCRIPT_SRC_WILDCARDS: FORBIDDEN
CSP_NONCES_ON_STATIC_EXPORT: FORBIDDEN
NEXT_HEADERS_AS_SERVING_AUTHORITY: FORBIDDEN
RAW_IP_AS_RATE_LIMIT_KEY: FORBIDDEN
DIRECT_ORIGIN_PUBLIC_APP_PORTS_PRODUCTION: FORBIDDEN
NAIVE_WEBHOOK_IP_RATE_LIMIT: FORBIDDEN
BOBA_RAW_PAN_STORAGE: NO
BOBA_RAW_CVV_STORAGE: NO
SECOND_IDENTITY_SYSTEM_FOR_STEP_UP: FORBIDDEN
NEW_DEPLOYABLE_SERVICE: NO
NEW_APPLICATION_ROLE: NO
NEW_APPLICATION_PERMISSION: NO
DPDP_COMPLIANT_CLAIM: FORBIDDEN
CERT_IN_COMPLIANT_CLAIM: FORBIDDEN
PCI_DSS_COMPLIANT_CLAIM: FORBIDDEN
OWASP_ASVS_CERTIFIED_CLAIM: FORBIDDEN
PROFILE_DELETE_EQUALS_LEGAL_ERASURE: NO
RAW_LOCATION_TELEMETRY_RETENTION_BY_DEFAULT: NO
IMP039_ACTIVATED_BY_THIS_LOCK: NO
IMPLEMENTATION_AUTHORIZED_BY_THIS_LOCK: NO
```

| Prohibition | Reason |
|---|---|
| Permanent attacker-triggered account lockout | Enables DoS of legitimate users (`FD-038-15`) |
| Treating Cloudflare as authoritative authz/throttle | Bypass / Free-tier gaps; application must survive |
| Wildcard CSP script-src / nonce reliance on static export | Breaks or falsely secures static `output: "export"` |
| Storing raw IP/phone as rate-limit keys | PII minimization; existing HMAC key model |
| Opening Droplet app ports to Internet in production | Defeats edge-to-origin property (`US-023`) |
| IP rate-limiting Razorpay webhooks | Breaks provider delivery; D-361–D-363 |
| Inventing roles for privacy portal | Portal deferred; operator-mediated reuses catalogue |
| Compliance claims without legal review | `COMPLIANCE_CLAIMS: NONE`; 9 open legal topics |
| Activating IMP-039 or authorizing IMP-038 implementation via this document | Separate lifecycle gates |

---

# F. Validation / evidence obligations

## 19. Evidence required before IMP-038 can be accepted

Nothing below has been executed. These are obligations for a future authorized IMPLEMENT / PROVE
phase under [TEST-1](../TESTING.md). Acceptance remains blocked by IMP-037 contiguity even after
technical evidence exists.

| Obligation | Required evidence |
|---|---|
| CSP/headers on real path | Nginx response assertions; report-only→enforce; negative host blocked |
| Customer auth abuse | Limit hits; progressive cooldown; Turnstile siteverify fail-closed; no permanent lockout |
| Workforce auth abuse | Existing limits + challenge; enumeration-safe failures; MFA cooldown classified temporary |
| Step-up | Proof table behaviour; TTL; single-use/action-bound; replay rejected; audits; class allowlist |
| Trusted client IP | `real_ip` config; hops=1; spoofed CF header ineffective when direct-origin blocked |
| Origin trust chain | Design+lab proofs of locked Nginx/AOP/firewall/real_ip contracts (§16.2). Live production mutation evidence is IMP-039-owned; IMP-038 acceptance does **not** require IMP-039 activation; public GTM/IMP-040 fails closed without production realization |
| BOLA/BFLA | Real-path negatives customer/outlet/territory/org |
| Payment/webhook | Signature + inbox + 64k + no webhook IP RL; PAN/CVV absence evidence |
| Secure SDLC | CI green for SAST/SCA/secret/container; SHA-pinned Actions; exception register |
| Threat model | §13 matrix completed with residual Critical = ZERO |
| ASVS matrix | v5.0.0 L2 applicable PASS/GAP/N/A |
| Legal matrices | DPDP/CERT-In/PCI rows with LEGAL_REVIEW markers — **no claims** |
| Retention matrix | Structure complete; numeric statutory windows legal-gated |
| Acceptance Pack | Index + principles enforced |
| External assessment | Independent web/API assessment; Critical/High retest/closure |
| Founder UAT | Exact candidate fingerprint; interactive verdict (human only) |
| IMP-037 predecessor | `IMP037_ACCEPTED` before `IMP038_ACCEPTED` |

### 19.1 Golden Journey protection

Hardening must not disable customer order, payment, webhook, workforce admin, or refund Golden
Journeys. CSP allowlist and Turnstile placement must be proven compatible before enforcement gates
fail closed in production.

### 19.2 Legal review open topics (retain exactly 9)

```text
LEGAL_REVIEW_OPEN_TOPICS: 9
COMPLIANCE_CLAIMS: NONE
```

1. DPDP applicability  
2. Rights-handling controls required for launch (beyond operator-mediated model)  
3. Retention windows (statutory / operational / security-log)  
4. Child data / age gating / parental consent  
5. CERT-In applicability  
6. Reporting / breach-notification triggers  
7. Security-log retention legal requirements  
8. PCI merchant validation scope / path  
9. Customer/regulator breach notification trigger interpretation  

Do **not** invent DPDP / CERT-In / PCI applicability findings in implementation.

---

# G. Residual risks

## 20. Residual risks accepted or carried by this lock

| Risk | Disposition |
|---|---|
| Cloudflare Free feature limits (1 RL rule; Bot Fight bluntness) | Accepted with application-authoritative controls; limitations recorded §5.2 |
| Bot Fight Mode OFF by default | Residual bot risk on non-auth surfaces; mitigated by app limits + managed ruleset |
| Single-Droplet blast radius (ARCH-G26) | Inherited; not solved by IMP-038 |
| IMP-037 external recovery unfinished | `IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES` |
| Legal windows unknown | Matrices with LEGAL_REVIEW markers; no silent numeric invention |
| Turnstile UX friction | Limited to escalated auth abuse (`FD-038-21`); checkout default NO |
| Independent Architecture Fit review PASS recorded | Reviewed technical candidate reconciled; human R3 merge decision remains separate |
| AOP/firewall not yet live-provisioned | Design+lab evidence path unlocked for IMP-038 (§16.2); production realization owned by IMP-039; IMP-040 fail-closed |

---

# H. Lifecycle / gate status

## 21. Lifecycle, gates, and next steps

```text
PRODUCT_DEFINITION_GATE: PASS (PD-IMP-038-DRAFT-2; PR#180/5773885848)
ARCHITECTURE_FIT: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT_RESULT: PASS
ARCHITECTURE_LOCKED: YES
INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD: 3b03164d6581c5a98a893c24e92eaddece004e90
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE: 5bb499fa84a5bf02682b30518f2bf898ddb23540
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID: 5279884548
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: YES
IMP038_IMPLEMENTATION_AUTHORIZED: YES
IMP038_STARTED: YES
FOUNDER_IMP038_IMPLEMENTATION_AUTHORIZATION: CURSOR_SESSION_MANDATE
IMP038_IMPLEMENTATION_COMPLETE: NO
IMP038_ACCEPTED: NO
IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES
IMP039_ACTIVATED: NO
CONTINUATION_EXCEPTION: IMP037_PROVIDER_BLOCKED_TO_IMP038
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_STATUS: NOT_PERFORMED
```

### 21.1 Decision-surface test (D-375 / ARCH-R21 required)

| Question | Answer |
|---|---|
| Does lock require a new global decision? | **YES** — Cloudflare Free + origin trust chain + application-authoritative supplemental edge (`D-375` / `ADR-017`) |
| Does lock require ARCH bump? | **YES** — `ARCH-R21` / `ARCH-G27` |
| Fits within ARCH-R20 + ARCH-G27? | **YES** |
| New deployable service? | **NO** |
| New application role/permission? | **NO** |
| Schema? | `STEP_UP_PROOF_SCHEMA_CHANGE = YES`; `AUTH_ABUSE_EXTENDS_EXISTING_TABLES = YES` |

### 21.2 What has **not** happened

- IMP-038 implementation complete / PROVE complete / independent technical acceptance  
- Cloudflare / DO firewall / AOP production provisioning (IMP-039)  
- Founder UAT  
- IMP-038 formal acceptance  
- IMP-039 activation  
- Any DPDP / CERT-In / PCI / ASVS compliance claim  
- Independent external web/API security assessment (`GAP-EXT-ASSESS-001`)  

```text
A–F_IMPLEMENTATION_EVIDENCE: COMPLETE
IMP038_IMPLEMENTATION_COMPLETE: NO
PROVE_COMPLETE: NO
INDEPENDENT_TECHNICAL_ACCEPTANCE: NO
FOUNDER_UAT: NOT_PERFORMED
IMP038_ACCEPTED: NO
```

### 21.3 Gate sequence from here

```text
  → PROVE / Acceptance Pack completion + external assessment
  → Independent technical acceptance
  → Founder UAT (exact candidate)
  → IMP-037 acceptance/reconciliation (blocking predecessor)
  → IMP-038 acceptance reconciliation (design+lab origin-trust evidence sufficient per §16.2;
      production realization may remain PENDING for IMP-039 / fail-closed at IMP-040)
  → IMP-039 activation (separate human gate) when production cloud mutation is authorized
```

### 21.4 Founder UAT applicability

```text
FOUNDER_UAT_REQUIRED: YES
```

Customer-visible CSP/challenge behaviour, workforce step-up on high-consequence actions, and
operator-mediated privacy labeling are interactive. UAT must use exact
`CANONICAL_REPOSITORY_PATH` / branch / `HEAD` / `WORKING_TREE_FINGERPRINT`. Agents must never
self-declare `FOUNDER_UAT = PASS`.

### 21.5 Implementation tranches A–F

| Tranche | Scope | Status |
|---|---|---|
| **A** | Nginx headers/CSP; trusted `real_ip`; TRUST_PROXY_HOPS=1 alignment | COMPLETE (CSP Report-Only; enforce deferred until challenge/Maps journey proof) |
| **B** | Customer + workforce abuse extensions + Turnstile siteverify | COMPLETE (merged; Administration/Ops HTTP proofs updated for enforcement) |
| **C** | Step-up proof schema + class enforcement + audits | COMPLETE (merged; missing/expired/replay/class-mismatch HTTP negatives retained) |
| **D** | Secure SDLC CI gates + exception register + domain audit extensions | COMPLETE (CodeQL/SCA/gitleaks/Trivy-binary **image** scan/Dependabot + SHA-pinned Actions; image-scan + SCA advisory-level matching remediated post bulk review) |
| **E** | Threat model / ASVS / privacy-retention / vendor / legal matrices + Acceptance Pack scaffolding | COMPLETE (Acceptance Pack candidate under `docs/platform/security/acceptance-pack/`) |
| **F** | Origin-trust design verification hooks + IMP-039 interface checklist (no IMP-039 activation) | COMPLETE (design/lab; `PRODUCTION_REALIZATION_PENDING` owner IMP-039) |

```text
TRANCHES_A_F_IMPLEMENTATION_EVIDENCE: COMPLETE
TRANCHES_ACCEPTANCE_CLAIMED: NO
IMP038_IMPLEMENTATION_COMPLETE: NO
PROVE_COMPLETE: NO
```

---

## 22. Vendor research citations

| Vendor / topic | Why cited | URL |
|---|---|---|
| Cloudflare WAF Managed Rules | Free Managed Ruleset selection | https://developers.cloudflare.com/waf/managed-rules/ |
| Cloudflare Bot Fight Mode (Free) | Supplemental-only; default OFF caution | https://developers.cloudflare.com/bots/plans/free/ |
| Cloudflare Turnstile | Preferred risk-based challenge | https://developers.cloudflare.com/turnstile/ |
| Cloudflare Rate limiting rules | Free 1-rule supplemental RL | https://developers.cloudflare.com/waf/rate-limiting-rules/ |
| Cloudflare Authenticated Origin Pull | Origin trust chain | https://developers.cloudflare.com/ssl/origin-configuration/authenticated-origin-pull/ |
| Cloudflare IP ranges | DO firewall allowlist input | https://www.cloudflare.com/ips/ |
| OWASP ASVS 5.0.0 | Traceable baseline (not certification) | https://owasp.org/www-project-application-security-verification-standard/ |
| Razorpay Checkout / API hosts | CSP allowlist | Razorpay public checkout/API documentation (checkout.razorpay.com, api.razorpay.com) |

Research conclusion locked by this Fit: **Cloudflare Free is sufficient as supplemental edge** for
V1 when paired with authoritative application controls and the origin trust chain; paid Cloudflare
is **not** required to lock IMP-038.

---

## End matter

```text
IMP-038: IMPLEMENTATION_IN_PROGRESS / AUTHORIZED / STARTED / NOT_ACCEPTED
IMP038_ARCHITECTURE_LOCKED: YES
ARCHITECTURE_FIT: PASS
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT_RESULT: PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD: 3b03164d6581c5a98a893c24e92eaddece004e90
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE: 5bb499fa84a5bf02682b30518f2bf898ddb23540
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID: 5279884548
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: YES
IMP038_IMPLEMENTATION_AUTHORIZED: YES
IMP038_STARTED: YES
FOUNDER_IMP038_IMPLEMENTATION_AUTHORIZATION: CURSOR_SESSION_MANDATE
IMP038_IMPLEMENTATION_COMPLETE: NO
IMP038_ACCEPTED: NO
IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES
IMP039_ACTIVATED: NO
CONTINUATION_EXCEPTION: IMP037_PROVIDER_BLOCKED_TO_IMP038
D-375_CREATED: YES
D-376_CREATED: YES
D375_REQUIRED_FOR_LOCK: YES
ARCH_R21_REQUIRED: YES
ARCH_R21_CREATED: YES
ARCH_R22_REQUIRED: NO
FITS_WITHIN_ARCH_R20_PLUS_ARCH_G27: YES
CLOUDFLARE_FREE_SELECTED: YES
CLOUDFLARE_ARCHITECTURE_LOCKED: YES
APPLICATION_SECURITY_REMAINS_AUTHORITATIVE: YES
PERMANENT_ATTACKER_TRIGGERED_LOCKOUT: FORBIDDEN
STEP_UP_PROOF_SCHEMA_CHANGE: YES
AUTH_ABUSE_EXTENDS_EXISTING_TABLES: YES
NEW_DEPLOYABLE_SERVICE: NO
NEW_APPLICATION_PERMISSION: NO
NEW_GLOBAL_ARCHITECTURE_MODEL: NO
CSP_MAPS_FONTS_INVENTORY_AMENDMENT: D-376
NEW_APPLICATION_ROLE: NO
BOBA_RAW_PAN_STORAGE: NO
BOBA_RAW_CVV_STORAGE: NO
LEGAL_REVIEW_OPEN_TOPICS: 9
COMPLIANCE_CLAIMS: NONE
CANONICAL_TIP: GTM-R141 / STATE-R139 / ARCH-R21 / DR-19
PRIOR_AUTHORIZE_START_TIP: GTM-R140 / STATE-R138
PRIOR_LOCK_TIP: GTM-R139 / STATE-R137
IMP038_IMPLEMENTATION_COMPLETE: YES
IMP038_HOLD: YES
IMP038_ACCEPTED: NO
PROGRAM_PAUSE: PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED
PROGRAM_PAUSE_AUTHORITY: D-377
PRODUCT_DEFINITION: PD-IMP-038-DRAFT-2 APPROVED
BINDING: D-377 / D-376 / D-375 / ADR-017; ADR-004; ADR-005; ADR-009; D-361..D-363; D-374 / ADR-016
```

IMP-039 activation, Founder UAT, and IMP acceptance remain **outside** this artifact’s authority.
Tranche implementation is held under program pause; GAP-EXT-ASSESS-001 remains NOT_CLOSED.
