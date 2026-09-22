<!-- governance-meta
{
  "status": "DRAFT",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-038",
  "productDefinitionVersion": "PD-IMP-038-DRAFT-1",
  "process": "PD-1",
  "verificationPolicy": "TEST-1",
  "lastReviewed": "2026-09-22",
  "productDefinitionGateExecution": "NOT_PERFORMED",
  "productDefinitionGateResult": "NOT_PERFORMED",
  "architectureFitExecution": "NOT_PERFORMED",
  "architectureFit": "NOT_PERFORMED",
  "architectureLocked": "NO",
  "implementationAuthorized": "NO",
  "implementationStarted": "NO",
  "impAccepted": "NO",
  "imp038Activated": "YES",
  "preGateDraft": "YES",
  "founderUatRequired": "YES",
  "founderUatStatus": "NOT_PERFORMED",
  "productDecisions": 21,
  "unresolvedProductDecisions": 21,
  "v1AcceptanceStories": 20,
  "totalStories": 24,
  "acceptanceBlockedByImp037": "YES",
  "continuationException": "IMP037_PROVIDER_BLOCKED_TO_IMP038",
  "legalReviewRequired": "YES",
  "complianceClaims": "NONE"
}
-->

# IMP-038 — Security & Privacy Hardening

## Product Definition (PRE-GATE DRAFT — Product Definition Gate NOT_PERFORMED)

```text
Document status: DRAFT
PRODUCT_DEFINITION_VERSION: PD-IMP-038-DRAFT-1
PRE-GATE DRAFT: YES
CAPABILITY: IMP-038
TITLE: Security & Privacy Hardening
AUTHORITY: PRODUCT_DEFINITION
PROCESS: PD-1
VERIFICATION_POLICY: TEST-1

PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
ARCHITECTURE_FIT_EXECUTION: NOT_PERFORMED
ARCHITECTURE_FIT: NOT_PERFORMED
ARCHITECTURE_LOCKED: NO
IMP038_ACTIVATED: YES
IMPLEMENTATION_AUTHORIZED: NO
IMPLEMENTATION_STARTED: NO
IMP038_IMPLEMENTATION_AUTHORIZED: NO
IMP038_STARTED: NO
IMP038_IMPLEMENTATION_COMPLETE: NO
IMP038_ACCEPTED: NO
IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES
IMP038_PRODUCT_DEFINITION: DRAFT
IMP038_PRODUCT_DEFINITION_GATE: NOT_PERFORMED
IMP038_ARCHITECTURE_FIT: NOT_PERFORMED
IMP038_ARCHITECTURE_LOCKED: NO
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_STATUS: NOT_PERFORMED

CONTINUATION_EXCEPTION: IMP037_PROVIDER_BLOCKED_TO_IMP038
CONTINUATION_EXCEPTION_AUTHORITY: PR#179/5771367844
HISTORICAL_IMP026_TO_IMP028_CONTINUATION: CLOSED
IMP037_ACCEPTED: NO
IMP037_IMPLEMENTATION_COMPLETE: NO
IMP037_EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED
PHASE1_BLOCK_STATUS: BLOCKED_PROVIDER_ACCESS

UNRESOLVED_PRODUCT_DECISIONS: 21
LEGAL_REVIEW_REQUIRED: YES
COMPLIANCE_CLAIMS: NONE
  — does NOT claim DPDP Act compliance
  — does NOT claim CERT-In compliance
  — does NOT claim PCI DSS compliance
  — does NOT claim OWASP Top 10 / ASVS “certified” compliance

stories: 24
v1_acceptance_stories: 20
follow_up_or_deferred_stories: 4
acceptance_scenarios: see §10 (FD-dependent final mandatory set)

Canonical anchors (verify against CURRENT ROADMAP/STATE):
  ROADMAP: GTM-R138
  STATE: STATE-R136
  ARCHITECTURE: ARCH-R20
  decision-register: DR-16
  PRODUCT-DELIVERY: PD-1
  TESTING: TEST-1
  VISION: VISION-1
  acceptedThrough: IMP-036G
  currentProductSlice: IMP-038
  nextProductSlice: IMP-039
  pendingAcceptance: NONE
```

This artifact is a **pre-gate Product Definition draft** for IMP-038. It does **not** execute the
Product Definition Gate, Architecture Fit, architecture lock, implementation authorization,
implementation start, Founder UAT, or IMP acceptance. It incorporates Founder security/privacy
discovery requirements as first-class Product Definition scope (stories, ACs, business/security
rules, evidence requirements, deferrals, and unresolved decisions). It does **not** claim DPDP,
CERT-In, PCI DSS, GST, OWASP Top 10, or ASVS certification/compliance.

```text
PRE-GATE DRAFT
  !=
Product Definition Gate PASS

NO CONTROL WITHOUT EVIDENCE
NO GAP WITHOUT OWNER
NO EXCEPTION WITHOUT AUTHORITY
NO COMPLIANCE CLAIM WITHOUT APPLICABILITY / LEGAL REVIEW
```

Cloudflare (including Cloudflare Free / Turnstile-class challenges) is recorded only as a
**preferred low-TCO Architecture Fit candidate** for layered edge WAF/bot/challenge controls.
This Product Definition does **not** lock Cloudflare, any CDN, any WAF vendor, or any origin-bypass
mechanism. Mechanism selection belongs to Architecture Fit (and IMP-039 where infrastructure
mutation is required). Application-side authorization, validation, and throttling remain
authoritative even if edge controls are absent or bypassed.

---

## 1. Identity / version / status

| Field | Definition |
|---|---|
| Capability / title | IMP-038 — Security & Privacy Hardening |
| Product Definition version / document status | `PD-IMP-038-DRAFT-1`; **DRAFT**; **PRE-GATE DRAFT: YES** |
| Product owner / approval evidence | Founder/human controlled-continuation activation via PR#179 comment `5771367844` + instruction “proceed with next IMP”; Founder security/privacy requirements incorporated as binding discovery inputs (independent review `5274597723` on PR #180); Product Definition Gate **not** performed |
| Process / verification policy | PD-1 / TEST-1 |
| Canonical anchors | VISION-1; ROADMAP GTM-R138; STATE STATE-R136; ARCH-R20; DR-16; PD-1; TEST-1 |
| Repository candidate | Canonical path `/home/ajoshi/repos/boba-bear-platform`; branch `governance/imp038-activation-product-definition` (pre-merge); HEAD/tree/fingerprint recorded at PR publication |
| Capability lifecycle / authorization | ROADMAP/STATE: `IMP038_ACTIVATED: YES`; formal lifecycle **PLANNED**; PD = DRAFT; Gate = NOT_PERFORMED; Architecture Fit = NOT_PERFORMED; Architecture Locked = NO; Implementation = NOT_AUTHORIZED / NOT_STARTED; `IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES`; `acceptedThrough` remains IMP-036G |
| Relevant capability architecture / ADRs | No IMP-038 capability architecture yet (forbidden until Gate PASS + Architecture Fit). Binding baselines: ARCH §§6–7,12; ADR-004; ADR-005; ADR-015 (amended by D-374 for host-local pilot secrets → IMP-039 boundary); IMP-036B §6.1 Maps supersession record; IMP-037 FD-037-03 retention distinction |
| Founder UAT applicability | `FOUNDER_UAT_REQUIRED = YES` — customer-visible location/auth gating, security headers, auth-abuse/bot challenges affecting storefront, and operator-visible security/privacy/acceptance-pack outcomes |

---

## 2. Business outcome

Make BOBA Bear’s launch-critical **application security and privacy posture** coherent, threat-modeled,
and **evidence-backed**: dual-realm authentication, scoped authorization, transport origin controls,
and domain audits remain authoritative; Founder-required hardening (browser headers/CSP; Maps
anonymous-I/O supersession; DPDP applicability/control/evidence; CERT-In readiness; payment/PCI
scope assessment; customer and workforce auth abuse resistance; platform bot/API and business-logic
abuse controls; OWASP ASVS v5.0.0 verification; BOLA/BFLA negatives; layered edge+origin defense
properties; secure SDLC/supply-chain; vendor/client-side dependency register; security logging;
incident readiness; and a Security & Privacy Acceptance Pack consumable by IMP-040) are defined as
observable product outcomes **without inventing legal compliance claims**, without locking a WAF/CDN
vendor in Product Definition, and without absorbing IMP-039 infrastructure or IMP-040 cutover work.

Observable success (acceptance boundary after later gates — not claimed now):

- Launch-blocking security controls selected for V1 are configured and negatively proven.
- Regulatory topics are covered by **applicability/control/evidence matrices** with
  `LEGAL_REVIEW_REQUIRED` markers — not silence and not compliance claims.
- Every V1 control has evidence; every gap has an owner; every exception has authority and expiry.
- IMP-040 may consume the Security & Privacy Acceptance Pack without disabling IMP-038 controls
  at cutover.

---

## 3. Problem statement

**Verified current state (ANCHOR):** BOBA already has substantial security foundations (customer
phone OTP; workforce password + TOTP MFA; distinct realms/sessions; scoped RBAC; Origin checks;
auth/location rate limits; config boundary audits; domain mutation audits; financial-document
immutability; baseline Next/nginx headers; Razorpay-hosted payment flows). Public GTM still
requires security & privacy hardening as part of VISION production operability.

**Verified gaps / deferred ownership into IMP-038 (repo evidence + Founder discovery):**

| Gap | Evidence |
|---|---|
| CSP not set; static `output: "export"` makes Next `headers()` a no-op for the public site | `next.config.ts`; `docker/nginx/nginx.conf`; Razorpay CSP origin tests record future need |
| Anonymous Google Maps / Places / reverse-geocode I/O still historically allowed; Founder-approved future supersession owned by IMP-038 | IMP-036B §6.1; IMP-036C §9 |
| Profile delete ≠ legal account erasure; retention schedules unlocked | OQ-005; IMP-036B deferrals; IMP-037 FD-037-03 |
| No CI SAST / SCA / secret / container / SBOM policy as CURRENT authority | `.github/workflows/ci.yml` inventory |
| Secrets console / broader secret UX deferred from IMP-035 toward IMP-038 adjacency | IMP-035 capability deferrals |
| Breach / personal-data incident operator pack referenced by IMP-040 as IMP-038-owned | IMP-040 PD + FD-040-05 |
| DPDP treated historically as “defer portal / no claim” rather than V1 applicability/control/evidence | Founder security requirements; independent review 5274597723 |
| CERT-In applicability / incident / PoC / time-sync / log-retention readiness absent from prior draft | Founder requirements; review 5274597723 |
| Payment/PCI scope only a non-claim; shared-responsibility assessment missing | Razorpay integration present; review 5274597723 |
| Auth abuse coverage too generic (location/auth rate limits only) | US-003 prior draft; review 5274597723 |
| No platform-wide bot/API abuse, edge WAF/challenge, or edge-to-origin bypass property | Prior draft listed WAF as non-goal; Founder requires layered defense |
| No OWASP ASVS v5.0.0 verification matrix; BOLA/BFLA not first-class | review 5274597723 |
| No business-logic abuse/fraud threat model | review 5274597723 |
| No vendor/processor/client-side dependency register | review 5274597723 |
| Incident pack ≠ slice-wide Security & Privacy Acceptance Pack for IMP-040 | review 5274597723 |

**Who is harmed if unresolved:** Customers (PII/ATO/bot abuse, unclear privacy rights handling);
workforce/platform operators (inconsistent incident/regulatory readiness); Founder launch
(IMP-040 hard-depends on IMP-038 evidence).

---

## 4. Primary personas

| Persona ID | Responsibility / goal in this slice | Context / evidence |
|---|---|---|
| `PERSONA-CUSTOMER` | Use account/session and location flows with clear privacy boundaries; resist account takeover / OTP abuse without being permanently locked out by attackers | personas.md; IMP-036B/C |
| `PERSONA-WORKFORCE-OPERATOR` | Administer within scoped permissions; rely on MFA and abuse-resistant login; trust audit/authorization negatives | personas.md; IMP-035/036D/036G |
| `PERSONA-PLATFORM-OPERATOR` | Operate security/privacy posture: matrices, scans, headers, edge/origin properties, incident/CERT-In readiness, Acceptance Pack | personas.md; IMP-036; VISION §3 |

`PERSONA != ROLE != PERMISSION != AUTHORIZATION`.

---

## 5. Current-state journeys

| Journey ID / evidence | Entry / preconditions | Activities today | Existing outcome / gap |
|---|---|---|---|
| `JOURNEY-CUSTOMER-AUTH-SESSION` / ADR-004 | Guest or returning customer | Phone OTP sign-in; secure cookies in staging/prod; sign-out | Works; limited ATO/OTP-bomb/enumeration productization |
| `JOURNEY-WORKFORCE-AUTH-MFA` / ADR-004 | Workforce identity | Email/password + TOTP MFA; session policy | Works; credential-stuffing / MFA-abuse product bar incomplete |
| `JOURNEY-LOCATION-MAPS` / IMP-036B | Delivery context | Anonymous Maps/Places still possible per accepted 036B history | Founder supersession for IMP-038; not implemented |
| `JOURNEY-CUSTOMER-PROFILE-DELETE` / OQ-005 | Authenticated customer | `deleteOwnCustomerProfile` | Domain delete ≠ legal erasure policy |
| `JOURNEY-ADMIN-AUDIT` / IMP-035/036G | Authorized admin | View access/mutation audits | Domain audits exist; no CERT-In / Acceptance Pack |
| `JOURNEY-PLATFORM-HARDENING` / next.config + CI | Deploy/build | Baseline headers; no CSP; partial CI security jobs | Partial |
| `JOURNEY-BACKUP-RETENTION` / IMP-037 | Recovery operators | 35-day backup retention product rule | Explicitly ≠ privacy/statutory retention (IMP-038) |
| `JOURNEY-PAYMENT-CHECKOUT` / Razorpay | Checkout | Provider-hosted payment; webhook reconciliation | PCI scope/shared responsibility not productized as matrix |
| `JOURNEY-EDGE-ORIGIN` / hosting | Public Internet → origin | Direct origin exposure posture incomplete as product property | Edge/WAF/bypass property undefined in prior PD |

---

## 6. Desired-state journeys

| Journey ID | Entry / context | Ordered activities | Success / downstream | Alternate / recovery |
|---|---|---|---|---|
| `JOURNEY-SECURE-CUSTOMER-SESSION` | Customer uses Direct | Authenticate when required; abuse-resistant OTP; secure cookies; sign-out | Account usable without cross-realm leakage | Throttle/challenge; no permanent attacker-driven lockout |
| `JOURNEY-AUTH-GATED-LOCATION` | Customer sets delivery location | Unsigned-in: Dehradun default only; signed-in: Maps/Places/geocode/saved address | Anonymous Google location I/O denied | Abuse/rate/quota paths per FD |
| `JOURNEY-CUSTOMER-AUTH-ABUSE` | Attacker or abusive client hits signup/login/OTP | Server-side throttle + optional edge challenge; safe non-enumerating responses | Legitimate users recover; SMS-cost abuse limited | Multi-IP / principal-level controls |
| `JOURNEY-WORKFORCE-AUTH-ABUSE` | Attacker hits workforce login/MFA | Credential-stuffing / brute-force / MFA abuse resisted | Workforce can still authenticate after cooldown/challenge | No permanent DoS lockout design |
| `JOURNEY-PLATFORM-BOT-API-ABUSE` | Automated abuse of APIs | Layered edge + application controls on auth, checkout, location, expensive, admin APIs | Abuse degraded; app controls remain if edge bypassed | Fit selects edge candidate (Cloudflare Free preferred) |
| `JOURNEY-BUSINESS-LOGIC-ABUSE` | Fraud/abuse of promos, checkout, webhooks, refunds, scraping | Threat-model matrix → controls → detection → response | Residual risk explicit with owner | FD for residual acceptance |
| `JOURNEY-PRIVACY-REQUEST` | Customer or operator handles personal-data request | Follow Founder-decided V1 model | Disposition recorded; DPDP matrix evidence retained | Legal-hold stops destructive path |
| `JOURNEY-DPDP-APPLICABILITY` | Platform operator / legal | Inventory data flows; map requirements → controls → evidence | Matrix complete; **no compliance claim** | LEGAL_REVIEW_REQUIRED markers |
| `JOURNEY-CERTIN-READINESS` | Suspected cyber incident / regulatory obligation assessment | Applicability matrix; PoC; time-sync; log retention; reporting readiness | Controls/evidence mapped; **no compliance claim** | LEGAL_REVIEW_REQUIRED |
| `JOURNEY-PAYMENT-PCI-SCOPE` | Payment flows | Assess PAN/CVV touch; Razorpay integration type; shared responsibility | Scope matrix + evidence; prefer no raw card credentials | LEGAL_REVIEW / FD-038-12 |
| `JOURNEY-ASVS-VERIFICATION` | Security verification | Trace ASVS v5.0.0 requirements → BOBA control → proof → PASS/GAP/N/A | Baseline measurable | FD-038-16 target level |
| `JOURNEY-AUTHORIZATION-NEGATIVE` | Cross-scope / BOLA / BFLA attempts | Customer/workforce/outlet/territory/org negatives | Unauthorized denied; evidence retained | Existing ADR-005 catalogue |
| `JOURNEY-EDGE-ORIGIN-DEFENSE` | Internet client | Intended edge security layer cannot be trivially bypassed to origin | Property proven or residual risk owned | Mechanism = Fit / IMP-039 |
| `JOURNEY-SECURE-SDLC` | CI / PR / release | SAST, SCA, secret, container, SBOM/provenance feasibility, pinning | Findings dispositioned; exception register expiring | FD-038-09/17 thresholds |
| `JOURNEY-VENDOR-REGISTER` | Material third parties + browser scripts | Register data/purpose/access/retention/incident/shared-responsibility/exit | Register complete for V1 providers | Update when Fit adds edge vendor |
| `JOURNEY-SECURITY-LOGGING` | Security-relevant events | Log with PII/secret minimization; retention per FD | Usable for incident/CERT-In readiness without secret leakage | Conflicts → HUMAN |
| `JOURNEY-RETENTION-DISPOSITION` | Operator/platform reviews data classes | Apply decided retention windows | Backup vs statutory vs operational distinguished | Conflicts → LEGAL_REVIEW |
| `JOURNEY-SECURITY-HEADERS` | Any public/admin browser hit | CSP + security headers on actual serving path | Headers present; embeds per FD | Misconfig fails closed / documented exception |
| `JOURNEY-SECURITY-INCIDENT-VISIBILITY` | Suspected incident | Bounded investigation pack | Actionable visibility without inventing SIEM | Customer breach comms per FD-038-03 |
| `JOURNEY-SECURITY-PRIVACY-ACCEPTANCE-PACK` | IMP-038 acceptance → IMP-040 handoff | Assemble durable Acceptance Pack index | IMP-040 can consume without re-deriving | Residual risk + Founder UAT evidence |
| `JOURNEY-PRIVILEGED-ADMIN` | High-consequence admin action | RBAC + audits; optional step-up if Founder selects | Unauthorized denied; authorized audited | Cross-scope denial preserved |

---

## 7. Story map

| Business outcome | Persona | Journey | Activity | Story IDs | Slice classification |
|---|---|---|---|---|---|
| Launch-safe browser posture | PLATFORM / CUSTOMER | `JOURNEY-SECURITY-HEADERS` | Enforce CSP/headers on serving path | US-IMP-038-001 | V1_ACCEPTANCE_SLICE |
| Auth-gated location I/O | CUSTOMER | `JOURNEY-AUTH-GATED-LOCATION` | Supersede anonymous Google location I/O | US-IMP-038-002 | V1_ACCEPTANCE_SLICE |
| Customer auth/OTP abuse resistance | CUSTOMER / PLATFORM | `JOURNEY-CUSTOMER-AUTH-ABUSE` | Signup/login/OTP bot, brute-force, bombing, enumeration controls | US-IMP-038-003 | V1_ACCEPTANCE_SLICE |
| Honest profile vs erasure | CUSTOMER | `JOURNEY-PRIVACY-REQUEST` | Clarify/label profile delete vs erasure | US-IMP-038-004 | V1_ACCEPTANCE_SLICE (labeling); erasure mechanics depend on FD-038-01 |
| Retention class policy | PLATFORM / WORKFORCE | `JOURNEY-RETENTION-DISPOSITION` | Publish V1 retention matrix | US-IMP-038-005 | V1_ACCEPTANCE_SLICE (policy); automation may FOLLOW_UP |
| Secure SDLC / supply chain | PLATFORM | `JOURNEY-SECURE-SDLC` | SAST, SCA, secret, container, SBOM/provenance, pinning | US-IMP-038-006 | V1_ACCEPTANCE_SLICE |
| BOLA/BFLA + cross-scope negatives | PLATFORM / WORKFORCE / CUSTOMER | `JOURNEY-AUTHORIZATION-NEGATIVE` | Authorization-negative proof across boundaries | US-IMP-038-007 | V1_ACCEPTANCE_SLICE |
| Incident investigation pack | PLATFORM | `JOURNEY-SECURITY-INCIDENT-VISIBILITY` | Bounded security investigation evidence pack | US-IMP-038-008 | V1_ACCEPTANCE_SLICE (internal); customer breach comms FD-038-03 |
| Secure session posture review | CUSTOMER / WORKFORCE | `JOURNEY-SECURE-CUSTOMER-SESSION` | Confirm/extend session revocation & flags | US-IMP-038-009 | FOLLOW_UP unless FD-038-06 elevates |
| Secrets console UX | PLATFORM | secrets adjacency | Operator secrets console | US-IMP-038-010 | DEFERRED (IMP-039 host-local secrets boundary) |
| Full automated DPDP portal | CUSTOMER | privacy portal | Automated rights portal | US-IMP-038-011 | DEFERRED (LEGAL_REVIEW); does **not** replace US-020 matrix |
| Marketing consent center | CUSTOMER | preferences | Marketing preference center | US-IMP-038-012 | DEFERRED / NOT_SUPPORTED if no marketing system in V1 |
| Workforce auth/MFA abuse resistance | WORKFORCE / PLATFORM | `JOURNEY-WORKFORCE-AUTH-ABUSE` | Login/MFA brute-force, stuffing, MFA abuse/bypass | US-IMP-038-013 | V1_ACCEPTANCE_SLICE |
| Platform-wide layered bot/API abuse | PLATFORM | `JOURNEY-PLATFORM-BOT-API-ABUSE` | Edge WAF/bot/challenge candidate + app controls | US-IMP-038-014 | V1_ACCEPTANCE_SLICE |
| Business-logic abuse/fraud threat model | PLATFORM | `JOURNEY-BUSINESS-LOGIC-ABUSE` | Abuse-case matrix with controls/detection/response | US-IMP-038-015 | V1_ACCEPTANCE_SLICE |
| Vulnerability mgmt + exception register | PLATFORM | `JOURNEY-SECURE-SDLC` | Ownership, severity, remediation/exception expiry, retest | US-IMP-038-016 | V1_ACCEPTANCE_SLICE |
| OWASP ASVS v5.0.0 verification matrix | PLATFORM | `JOURNEY-ASVS-VERIFICATION` | Requirement → control → proof → PASS/GAP/N/A | US-IMP-038-017 | V1_ACCEPTANCE_SLICE |
| CERT-In applicability/control/evidence | PLATFORM | `JOURNEY-CERTIN-READINESS` | Incident-reporting/PoC/time-sync/log-retention mapping | US-IMP-038-018 | V1_ACCEPTANCE_SLICE |
| Security logging / privacy-retention design | PLATFORM | `JOURNEY-SECURITY-LOGGING` | Minimize secrets/PII; retain security utility | US-IMP-038-019 | V1_ACCEPTANCE_SLICE |
| DPDP applicability/control/evidence matrix | PLATFORM / CUSTOMER | `JOURNEY-DPDP-APPLICABILITY` | Data inventory/flows + requirement→control→evidence | US-IMP-038-020 | V1_ACCEPTANCE_SLICE |
| Payment/PCI scope + shared responsibility | PLATFORM / CUSTOMER | `JOURNEY-PAYMENT-PCI-SCOPE` | PAN/CVV touch assessment; Razorpay type; merchant vs provider | US-IMP-038-021 | V1_ACCEPTANCE_SLICE |
| Vendor/processor/client-side register | PLATFORM | `JOURNEY-VENDOR-REGISTER` | Material providers + browser scripts/tags | US-IMP-038-022 | V1_ACCEPTANCE_SLICE |
| Edge-to-origin bypass protection property | PLATFORM | `JOURNEY-EDGE-ORIGIN-DEFENSE` | Direct Internet must not trivially bypass intended edge layer | US-IMP-038-023 | V1_ACCEPTANCE_SLICE |
| Security & Privacy Acceptance Pack | PLATFORM | `JOURNEY-SECURITY-PRIVACY-ACCEPTANCE-PACK` | Durable pack consumable by IMP-040 | US-IMP-038-024 | V1_ACCEPTANCE_SLICE |

---

## 8. Acceptance slice

| Slice | Mandatory story IDs | Mandatory AC IDs | Required Golden Journeys | Observable acceptance boundary |
|---|---|---|---|---|
| `V1_ACCEPTANCE_SLICE` | US-IMP-038-001…008, 013…024 | AC-IMP-038-001-01…024-xx (see §10; final set after Founder FDs) | `GJ-FIRST-ORDER`, `GJ-ADDRESS-SERVICEABILITY`, `GJ-PERMITTED-OUTLET-ACCESS`, `GJ-PAYMENT-RECOVERY` (regression) | Hardening outcomes enforced and proven; regulatory matrices complete without compliance claims; Acceptance Pack ready for IMP-040 |
| `FOLLOW_UP` | US-IMP-038-009; parts of US-005 automation; US-008 customer breach playbooks if deferred | TBD | — | After V1 or legal review |
| `DEFERRED` | US-IMP-038-010…012 | — | — | IMP-039/040/legal |

Every possibility also classified in §§22–25.

---

## 9. User stories

```text
Story ID: US-IMP-038-001
As a PERSONA-PLATFORM-OPERATOR
I want CSP and security headers enforced on the actual public/static serving path
so that launch browser posture matches ARCH security principles without breaking decided embeds.
Journey / activity: JOURNEY-SECURITY-HEADERS
Preconditions: Static export + nginx (or CURRENT serving path) is the authority path.
Acceptance scenarios: AC-IMP-038-001-01…03
Business rules: BR-IMP-038-001
Permission / resource context: N/A (platform config); must not invent new roles
Error / recovery: Misconfiguration fails closed or documented accepted exception per FD-038-05
Dependencies: FD-038-05; must not disable for IMP-040 cutover
Explicit non-goals: Locking a CDN/WAF vendor; reinventing CDN product; IMP-039 provisioning
Data implications: None beyond config
Security implications: Primary
Architecture fit / applicable invariants: ARCH §12; static frontend rule
Open material decisions: FD-038-05
Readiness: NOT_READY_FOR_IMPLEMENTATION (Gate + Fit + FDs pending)
```

```text
Story ID: US-IMP-038-002
As a PERSONA-CUSTOMER
I want Google Maps/Places/reverse-geocode and delivery-location change gated behind authentication
so that anonymous Google location I/O stops per Founder-approved IMP-036B §6.1 direction.
Journey / activity: JOURNEY-AUTH-GATED-LOCATION
Preconditions: IMP-036B/C accepted history remains; this story supersedes behaviour prospectively
Acceptance scenarios: AC-IMP-038-002-01…04
Business rules: BR-IMP-038-002
Permission / resource context: Customer session realm only
Dependencies: Founder §6.1 markers already approved as future direction; confirm V1 inclusion
Explicit non-goals: Rewriting accepted IMP-036B history; new maps provider
Open material decisions: confirm V1 include (strongly evidenced YES); FD-038-08 location retention
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-003
As a PERSONA-PLATFORM-OPERATOR / PERSONA-CUSTOMER
I want customer signup, login, OTP request, and OTP verify protected against bots, brute force,
OTP bombing/SMS-cost abuse, credential stuffing, distributed multi-IP attempts, and account
enumeration
so that authentication alone is not treated as complete abuse protection.
Journey: JOURNEY-CUSTOMER-AUTH-ABUSE
Acceptance scenarios: AC-IMP-038-003-01…05
Business rules: BR-IMP-038-011, BR-IMP-038-012, BR-IMP-038-013
Open material decisions: FD-038-15 (throttle/challenge/lockout policy); FD-038-21 (challenge surfaces)
Requirements:
  - principal/phone/account-level throttles in addition to IP controls
  - safe/non-enumerating responses
  - server-side throttling remains authoritative; edge/bot challenge is defense-in-depth only
  - no permanent lockout design that lets attackers DoS legitimate accounts
  - password/reset/recovery abuse covered if/when those surfaces exist; else N/A with rationale
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-004
As a PERSONA-CUSTOMER
I want profile delete and any privacy erasure action labeled and behaved according to Founder policy
so that I am not misled that domain profile delete equals legal erasure (OQ-005).
Journey: JOURNEY-PRIVACY-REQUEST
Acceptance scenarios: AC-IMP-038-004-01…03
Open material decisions: FD-038-01, FD-038-04, FD-038-10
LEGAL_REVIEW_REQUIRED: YES
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-005
As a PERSONA-PLATFORM-OPERATOR
I want an explicit V1 retention matrix by data class
so that backup retention (IMP-037) is not confused with statutory/customer/audit retention.
Journey: JOURNEY-RETENTION-DISPOSITION
Acceptance scenarios: AC-IMP-038-005-01…02
Open material decisions: FD-038-02, FD-038-08, FD-038-19
LEGAL_REVIEW_REQUIRED: YES
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-006
As a PERSONA-PLATFORM-OPERATOR
I want secure-SDLC evaluation and evidence covering SAST, SCA/dependency vulnerability scanning,
secret scanning, container/base-image scanning, SBOM/provenance feasibility, and CI action /
dependency pinning
so that supply-chain launch risk is visible before IMP-040.
Journey: JOURNEY-SECURE-SDLC
Acceptance scenarios: AC-IMP-038-006-01…04
Open material decisions: FD-038-09 (launch thresholds); FD-038-17 (remediation/exception policy)
Explicit non-goals: Inventing arbitrary remediation SLA numbers without Founder decision
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-007
As a PERSONA-PLATFORM-OPERATOR
I want production-bypass rejection plus BOLA/BFLA and cross-scope authorization-negative proof
across customer, workforce, outlet, territory, and org boundaries
so that deny-by-default authorization remains proven for launch.
Journey: JOURNEY-AUTHORIZATION-NEGATIVE / JOURNEY-PRIVILEGED-ADMIN
Acceptance scenarios: AC-IMP-038-007-01…04
Open material decisions: NONE for existing ADR-005 catalogue review scope (new permissions only if an FD requires)
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-008
As a PERSONA-PLATFORM-OPERATOR
I want a bounded security/privacy incident investigation evidence pack
so that operators can investigate without inventing SIEM or claiming breach-law compliance.
Journey: JOURNEY-SECURITY-INCIDENT-VISIBILITY
Acceptance scenarios: AC-IMP-038-008-01…02
Open material decisions: FD-038-03
LEGAL_REVIEW_REQUIRED: YES for customer-facing breach communication
Note: This is NOT the Security & Privacy Acceptance Pack (see US-IMP-038-024).
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-009
As a PERSONA-WORKFORCE-OPERATOR / CUSTOMER
I want clearer session revocation / privileged-session policy if Founder elevates it
so that high-consequence sessions match agreed policy.
Slice: FOLLOW_UP unless FD-038-06 elevates to V1
Open material decisions: FD-038-06
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-010
Secrets console UX — DEFERRED (host-local pilot secrets / IMP-039 adjacency; ADR-015→D-374).
```

```text
Story ID: US-IMP-038-011
Full automated privacy-rights portal — DEFERRED; LEGAL_REVIEW_REQUIRED.
Does NOT remove the V1 mandatory DPDP applicability/control/evidence matrix (US-IMP-038-020).
```

```text
Story ID: US-IMP-038-012
Marketing consent center — DEFERRED / possibly NOT_SUPPORTED_BY_DESIGN if no V1 marketing system.
```

```text
Story ID: US-IMP-038-013
As a PERSONA-PLATFORM-OPERATOR / PERSONA-WORKFORCE-OPERATOR
I want workforce login and MFA protected against brute force, credential stuffing, MFA abuse/bypass,
distributed attempts, and account enumeration
so that workforce ATO risk is explicitly threat-modeled and accepted separately from customer auth.
Journey: JOURNEY-WORKFORCE-AUTH-ABUSE
Acceptance scenarios: AC-IMP-038-013-01…04
Business rules: BR-IMP-038-011, BR-IMP-038-012, BR-IMP-038-013
Open material decisions: FD-038-15; FD-038-06 (if step-up elevated)
Requirements: server-side authoritative; edge challenge defense-in-depth only; no permanent
attacker-driven lockout DoS; safe/non-enumerating responses; principal/account + IP throttles.
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-014
As a PERSONA-PLATFORM-OPERATOR
I want layered platform-wide bot and API abuse defense (edge WAF/bot/challenge/rate-limit controls
PLUS application-side controls) covering login/signup/OTP, checkout/payment-sensitive endpoints,
address/location, expensive/search/discovery endpoints, and workforce/admin high-consequence APIs
so that bot/API abuse is a first-class launch property.
Journey: JOURNEY-PLATFORM-BOT-API-ABUSE
Acceptance scenarios: AC-IMP-038-014-01…04
Business rules: BR-IMP-038-014, BR-IMP-038-015
Open material decisions: FD-038-13 (edge vendor posture); FD-038-21 (challenge surfaces)
Architecture note: Cloudflare Free is the preferred low-TCO Architecture Fit candidate; Product
Definition does NOT lock Cloudflare. Free-tier limitations must be recorded; server-side defense
must remain if edge controls are bypassed or unavailable.
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-015
As a PERSONA-PLATFORM-OPERATOR
I want a V1 business-logic abuse/fraud threat model covering promo/coupon farming, mass account
creation, checkout flooding, order/resource enumeration, payment-initiation abuse, webhook
spoofing/replay, refund abuse, scraping, and resource exhaustion
so that each abuse case has attacker goal → entry point → control → detection → response → evidence.
Journey: JOURNEY-BUSINESS-LOGIC-ABUSE
Acceptance scenarios: AC-IMP-038-015-01…02
Open material decisions: residual-risk acceptance via FD-038-09 where needed
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-016
As a PERSONA-PLATFORM-OPERATOR
I want vulnerability management with ownership, severity, remediation/exception handling, retest,
and an expiring security exception register (owner, rationale, expiry, authority)
so that gaps cannot silently persist past launch handoff.
Journey: JOURNEY-SECURE-SDLC
Acceptance scenarios: AC-IMP-038-016-01…03
Open material decisions: FD-038-09; FD-038-17; FD-038-18 (pen-test/assessment scope)
Do not invent arbitrary remediation SLA numbers without Founder/security-policy decision.
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-017
As a PERSONA-PLATFORM-OPERATOR
I want OWASP ASVS v5.0.0 as the primary traceable technical-control baseline
(requirement → BOBA control → proof → PASS/GAP/N/A), using relevant OWASP Top 10 / API Security
risks as threat inputs only
so that application security verification is measurable without claiming “Top 10 compliance.”
Journey: JOURNEY-ASVS-VERIFICATION
Acceptance scenarios: AC-IMP-038-017-01…02
Open material decisions: FD-038-16 (target ASVS level / selected controls)
COMPLIANCE_CLAIMS: NONE (matrix ≠ certification)
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-018
As a PERSONA-PLATFORM-OPERATOR
I want a CERT-In applicability/control/evidence matrix mapping applicable incident-reporting,
Point-of-Contact, time-sync, and log-retention obligations to product/process/technical controls
and evidence
so that India cybersecurity regulatory readiness is explicit without claiming CERT-In compliance.
Journey: JOURNEY-CERTIN-READINESS
Acceptance scenarios: AC-IMP-038-018-01…03
Open material decisions: FD-038-11
LEGAL_REVIEW_REQUIRED: YES
COMPLIANCE_CLAIMS: NONE
Security-log design must minimize secrets/PII even when security retention is required (US-019).
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-019
As a PERSONA-PLATFORM-OPERATOR
I want security logging and privacy-retention design that preserves investigative/CERT-In utility
while minimizing secrets and unnecessary PII
so that retention requirements do not become a second privacy failure mode.
Journey: JOURNEY-SECURITY-LOGGING
Acceptance scenarios: AC-IMP-038-019-01…02
Open material decisions: FD-038-19; FD-038-02
LEGAL_REVIEW_REQUIRED: YES where retention intersects personal data
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-020
As a PERSONA-PLATFORM-OPERATOR
I want a DPDP applicability/control/evidence matrix with data inventory and data-flow mapping
across customer/workforce/auth/location/orders/payment/refunds/financial docs/logs/backups/vendors,
including staged current-vs-future-effective requirement mapping, rights/notice/consent/withdrawal/
retention/erasure/grievance/breach control coverage, child-data applicability assessment, and
control-owner/evidence/legal-review traceability
so that BOBA understands what applies, implements applicable controls, and retains evidence —
without claiming DPDP compliance and without requiring a full automated privacy portal in V1.
Journey: JOURNEY-DPDP-APPLICABILITY
Acceptance scenarios: AC-IMP-038-020-01…04
Open material decisions: FD-038-01, FD-038-04, FD-038-10, FD-038-20
LEGAL_REVIEW_REQUIRED: YES
COMPLIANCE_CLAIMS: NONE
Matrix row shape (mandatory): requirement → current/future applicability → rationale →
product/process/technical control → evidence → owner → LEGAL_REVIEW marker
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-021
As a PERSONA-PLATFORM-OPERATOR
I want a payment-security / PCI applicability assessment proving whether BOBA systems store,
process, or transmit raw PAN/CVV; identifying Razorpay integration type; producing a merchant vs
provider responsibility/evidence matrix; and identifying validation path / ASV implications where
applicable
so that payment scope is understood without claiming PCI compliance, while preserving the
architectural preference that BOBA does not handle raw card credentials.
Journey: JOURNEY-PAYMENT-PCI-SCOPE
Acceptance scenarios: AC-IMP-038-021-01…03
Open material decisions: FD-038-12
LEGAL_REVIEW_REQUIRED: YES for any compliance-adjacent interpretation
COMPLIANCE_CLAIMS: NONE
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-022
As a PERSONA-PLATFORM-OPERATOR
I want a vendor/processor/client-side dependency register for material providers (payments,
messaging, maps/location, hosting/storage/CDN/bot controls as actually used) and third-party
browser scripts/tags, with data/purpose/access/credential/retention/incident/
shared-responsibility/exit fields
so that third-party and client-side compromise risk is explicit.
Journey: JOURNEY-VENDOR-REGISTER
Acceptance scenarios: AC-IMP-038-022-01…02
Open material decisions: FD-038-13 may add/remove edge vendor rows after Fit
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-023
As a PERSONA-PLATFORM-OPERATOR
I want the product property that arbitrary direct Internet access must not be able to bypass the
intended edge security layer to reach origin unprotected
so that edge controls are defense-in-depth rather than theater.
Journey: JOURNEY-EDGE-ORIGIN-DEFENSE
Acceptance scenarios: AC-IMP-038-023-01…02
Business rules: BR-IMP-038-015
Open material decisions: FD-038-14 (mechanism class)
Architecture note: Mechanism selection (origin firewall allowlist, authenticated origin, tunnel,
etc.) belongs to Architecture Fit / IMP-039 where infrastructure mutation is involved.
Application authorization/validation/throttling remains authoritative regardless.
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-024
As a PERSONA-PLATFORM-OPERATOR
I want a slice-wide Security & Privacy Acceptance Pack consumable by IMP-040
so that launch validation can rely on durable evidence rather than re-deriving IMP-038 posture.
Journey: JOURNEY-SECURITY-PRIVACY-ACCEPTANCE-PACK
Acceptance scenarios: AC-IMP-038-024-01…02
Pack index (minimum):
  - asset/data inventory + flows
  - threat model (incl. US-015 abuse matrix)
  - DPDP applicability/control matrix (US-020)
  - CERT-In applicability/control matrix (US-018)
  - PCI/payment-scope assessment (US-021)
  - ASVS control matrix (US-017)
  - auth/ATO/bot/abuse proof (US-003/013/014)
  - authorization/BOLA/BFLA proof (US-007)
  - edge/origin-control proof (US-014/023)
  - secrets/crypto proof
  - supply-chain scan/provenance evidence (US-006)
  - vendor register (US-022)
  - retention/deletion matrix (US-005)
  - security logging/privacy matrix (US-019)
  - incident-response runbook/tabletop evidence (US-008 + US-018)
  - vulnerability/exception register (US-016)
  - penetration/security-assessment findings and closure (FD-038-18)
  - residual risk and Founder UAT evidence where applicable
Binding principles: NO CONTROL WITHOUT EVIDENCE; NO GAP WITHOUT OWNER;
NO EXCEPTION WITHOUT AUTHORITY; NO COMPLIANCE CLAIM WITHOUT APPLICABILITY / LEGAL REVIEW
Open material decisions: FD-038-09 residual risk thresholds
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

---

## 10. Acceptance scenarios

```text
AC-IMP-038-001-01 — Security headers present on public order surface
Story: US-IMP-038-001
Given the CURRENT static public site serving path
When a browser requests a customer ordering document
Then decided security headers (incl. CSP per FD-038-05) are present
And IMP-040 cutover planning must not disable them
Mandatory in acceptance slice: YES (pending FD-038-05)
```

```text
AC-IMP-038-001-02 — Headers present on workforce admin document path
Story: US-IMP-038-001
Given workforce admin static/document path
When loaded
Then decided headers apply without inventing a second auth system
Mandatory: YES (pending FD-038-05)
```

```text
AC-IMP-038-001-03 — Negative: disallowed embed/host blocked by CSP
Story: US-IMP-038-001
Given CSP policy
When a disallowed script origin is attempted
Then it is blocked (or explicitly accepted exception documented)
Mandatory: YES (pending FD-038-05)
```

```text
AC-IMP-038-002-01 — Anonymous Maps JS denied
Story: US-IMP-038-002
Given signed-out customer
When Maps JavaScript would load for location change
Then it does not perform anonymous Google location I/O
And default location remains Dehradun per §6.1
Mandatory: YES
```

```text
AC-IMP-038-002-02 — Anonymous Places autocomplete denied
Story: US-IMP-038-002
Given signed-out customer
When Places autocomplete is invoked
Then request is denied / unavailable
Mandatory: YES
```

```text
AC-IMP-038-002-03 — Authenticated location change permitted under existing rules
Story: US-IMP-038-002
Given authenticated customer
When changing delivery location via Maps/Places/geocode
Then allowed under existing serviceability rules
Mandatory: YES
```

```text
AC-IMP-038-002-04 — Saved address add requires auth
Story: US-IMP-038-002
Given signed-out customer
When adding saved address
Then denied
Mandatory: YES
```

```text
AC-IMP-038-003-01 — Customer OTP request/verify throttled (IP + principal/phone)
Story: US-IMP-038-003
Given repeated OTP request or verify attempts exceeding limits
When threshold crossed
Then requests fail closed with safe non-enumerating errors
And SMS-cost / OTP-bombing abuse is degraded
Mandatory: YES
```

```text
AC-IMP-038-003-02 — Customer login/signup abuse resisted (bot/brute/stuffing/multi-IP)
Story: US-IMP-038-003
Given automated or distributed login/signup abuse
When application and (if Fit-selected) edge controls apply
Then abuse is throttled/challenged; legitimate recovery path remains without permanent lockout DoS
Mandatory: YES (pending FD-038-15)
```

```text
AC-IMP-038-003-03 — Account enumeration minimized on customer auth surfaces
Story: US-IMP-038-003
Given auth probes against existing vs non-existing accounts/phones
When responses are observed
Then responses do not enable reliable account enumeration beyond existing explicit product needs
Mandatory: YES
```

```text
AC-IMP-038-003-04 — Server-side throttling remains authoritative if edge bypassed
Story: US-IMP-038-003
Given edge bot/challenge controls unavailable or bypassed
When abuse continues
Then application-side controls still enforce fail-closed limits
Mandatory: YES
```

```text
AC-IMP-038-003-05 — Residual customer-auth abuse gaps dispositioned
Story: US-IMP-038-003
Given V1 customer-auth abuse assessment
When Acceptance Pack assembled
Then residual gaps are EXPLICITLY_DEFERRED or remediated with owner (no silent blanks)
Mandatory: YES
```

```text
AC-IMP-038-004-01 — Profile delete copy does not claim legal erasure unless FD says so
Story: US-IMP-038-004
Given customer profile delete UI/API
When delete succeeds
Then user-visible meaning matches FD-038-01
And audit/history immutability rules are preserved where already authoritative
Mandatory: YES (after FD-038-01)
```

```text
AC-IMP-038-004-02 — Unauthorized privacy destructive action denied
Story: US-IMP-038-004
Given actor without authority
When erasure/delete attempted on another subject
Then denied; no enumeration beyond existing IDOR rules
Mandatory: YES
```

```text
AC-IMP-038-004-03 — Statutory/financial hold blocks destructive privacy action when FD requires
Story: US-IMP-038-004
Given conflicting statutory retention
When privacy deletion requested
Then destructive path stops with explicit outcome (no silent partial delete)
Mandatory: YES (after FD-038-01/02)
```

```text
AC-IMP-038-005-01 — Retention matrix distinguishes backup vs statutory vs customer vs audit
Story: US-IMP-038-005
Given published V1 matrix
When compared to IMP-037 35-day backup retention
Then backup retention is not redefined as privacy law compliance
Mandatory: YES (after FD-038-02)
```

```text
AC-IMP-038-005-02 — Financial Document immutability preserved
Story: US-IMP-038-005
Given issued Financial Document authority (D-365+)
When retention/privacy actions run
Then immutable statutory records are not silently rewritten
Mandatory: YES
```

```text
AC-IMP-038-006-01 — Secret scan executed with disposition
Story: US-IMP-038-006
Given repository + CI evidence
When secret scan completes
Then findings are remediated or explicitly accepted with owner/expiry authority
Mandatory: YES
```

```text
AC-IMP-038-006-02 — SCA / dependency vulnerability scan executed with disposition
Story: US-IMP-038-006
Given dependency scan
When high/critical findings exist
Then disposition meets FD-038-09 / FD-038-17 policy
Mandatory: YES (after FD-038-09/17)
```

```text
AC-IMP-038-006-03 — SAST and container/base-image scan evidence present or N/A with rationale
Story: US-IMP-038-006
Given secure-SDLC evaluation
When IMP-038 acceptance evidence assembled
Then SAST and container/base-image scan results exist, or N/A is explicit with owner and Founder-visible rationale
Mandatory: YES
```

```text
AC-IMP-038-006-04 — SBOM/provenance feasibility and CI pinning posture recorded
Story: US-IMP-038-006
Given supply-chain hardening assessment
When Acceptance Pack assembled
Then SBOM/provenance feasibility and CI action/dependency pinning posture are recorded with gaps owned
Mandatory: YES
```

```text
AC-IMP-038-007-01 — Known production-bypass configuration rejected
Story: US-IMP-038-007
Given unsafe adapter / placeholder secret / production-bypass config
When startup/config validation runs in staging/prod posture
Then rejected fail-closed
Mandatory: YES
```

```text
AC-IMP-038-007-02 — Cross-scope admin action denied (BFLA / privileged function)
Story: US-IMP-038-007
Given workforce principal without scope/permission
When privileged admin action attempted cross-scope
Then denied; audit retained where applicable
Mandatory: YES
```

```text
AC-IMP-038-007-03 — BOLA / object-level authorization negatives across customer boundaries
Story: US-IMP-038-007
Given customer A authenticated
When accessing customer B order/profile/address/payment objects by id
Then denied under existing IDOR/object-authz rules; evidence retained
Mandatory: YES
```

```text
AC-IMP-038-007-04 — Outlet / territory / org boundary authorization negatives
Story: US-IMP-038-007
Given workforce principal scoped to outlet/territory/org A
When acting on resources in B
Then denied; no caller-manufactured authority
Mandatory: YES
```

```text
AC-IMP-038-008-01 — Operator can assemble bounded incident investigation evidence pack
Story: US-IMP-038-008
Given correlation ids / audits / logs within existing observability
When incident investigation starts
Then pack contents and privacy redaction rules are defined
Mandatory: YES (internal pack)
```

```text
AC-IMP-038-008-02 — Customer breach communication path explicit or deferred
Story: US-IMP-038-008
Given FD-038-03
When personal-data incident requires customer notice
Then either V1 procedure exists or EXPLICITLY_DEFERRED with owner (no invented legal duty claim)
Mandatory: YES
```

```text
AC-IMP-038-013-01 — Workforce login brute-force / stuffing throttled (IP + principal)
Story: US-IMP-038-013
Given repeated workforce login failures / stuffing patterns
When threshold crossed
Then fail-closed with safe errors; no permanent attacker-driven lockout DoS
Mandatory: YES (pending FD-038-15)
```

```text
AC-IMP-038-013-02 — MFA abuse/bypass attempts resisted
Story: US-IMP-038-013
Given repeated MFA verify failures or bypass probes
When threshold crossed
Then denied/throttled; MFA remains required per ADR-004
Mandatory: YES
```

```text
AC-IMP-038-013-03 — Workforce auth enumeration minimized
Story: US-IMP-038-013
Given probes of valid vs invalid workforce identifiers
When responses observed
Then reliable account enumeration is not enabled beyond explicit product needs
Mandatory: YES
```

```text
AC-IMP-038-013-04 — Server-side workforce controls remain if edge bypassed
Story: US-IMP-038-013
Given edge controls unavailable/bypassed
When abuse continues
Then application-side workforce auth controls still enforce
Mandatory: YES
```

```text
AC-IMP-038-014-01 — Layered bot/API abuse controls defined for critical surfaces
Story: US-IMP-038-014
Given login/signup/OTP, checkout/payment-sensitive, address/location, expensive/discovery, and
workforce/admin high-consequence APIs
When V1 controls are specified
Then each surface has application-side control and edge-control applicability (or explicit N/A)
Mandatory: YES
```

```text
AC-IMP-038-014-02 — Preferred edge candidate recorded without architecture lock
Story: US-IMP-038-014
Given Architecture Fit inputs
When edge WAF/bot/challenge options are evaluated
Then Cloudflare Free is recorded as preferred low-TCO candidate
And no Product Definition text locks Cloudflare or any vendor as architecture
And Free-tier limitations are recorded
Mandatory: YES
```

```text
AC-IMP-038-014-03 — Application controls survive edge bypass
Story: US-IMP-038-014
Given intended edge layer bypassed
When abuse traffic reaches origin
Then application authorization/validation/throttling still degrade abuse
Mandatory: YES
```

```text
AC-IMP-038-014-04 — Bot/human challenge escalation path explicit or deferred with owner
Story: US-IMP-038-014
Given FD-038-21
When challenge is required on selected surfaces
Then challenge provider/mechanism is Fit-selected (Turnstile-class allowed as candidate)
Or EXPLICITLY_DEFERRED with owner and residual risk
Mandatory: YES
```

```text
AC-IMP-038-015-01 — Business-logic abuse-case matrix complete for V1 list
Story: US-IMP-038-015
Given promo farming, mass account creation, checkout flooding, enumeration, payment-initiation
abuse, webhook spoofing/replay, refund abuse, scraping, resource exhaustion
When threat model published
Then each row has attacker goal → entry point → control → detection → response → evidence
Mandatory: YES
```

```text
AC-IMP-038-015-02 — Residual business-logic abuse risk owned
Story: US-IMP-038-015
Given matrix gaps
When Acceptance Pack assembled
Then each residual risk has owner and disposition (remediate / accept-with-expiry / defer)
Mandatory: YES
```

```text
AC-IMP-038-016-01 — Security exception register has owner, rationale, expiry, authority
Story: US-IMP-038-016
Given any accepted vulnerability exception
When register inspected
Then owner, rationale, expiry, and authorizing authority are present; expired exceptions are invalid
Mandatory: YES
```

```text
AC-IMP-038-016-02 — Vulnerability ownership and retest evidence
Story: US-IMP-038-016
Given open findings from SAST/SCA/secret/container/assessment
When dispositioned
Then owner and retest/closure evidence exist per FD-038-17
Mandatory: YES (after FD-038-17)
```

```text
AC-IMP-038-016-03 — Security-sensitive PR expectations documented
Story: US-IMP-038-016
Given secure-SDLC policy
When security-sensitive changes are proposed
Then PR expectations (review/checks) are explicit without inventing undefined process theater
Mandatory: YES
```

```text
AC-IMP-038-017-01 — ASVS v5.0.0 matrix exists with PASS/GAP/N/A
Story: US-IMP-038-017
Given FD-038-16 target level / selected controls
When verification matrix published
Then each in-scope requirement maps to BOBA control → proof → PASS/GAP/N/A
And no “OWASP Top 10 compliant” claim is made
Mandatory: YES (after FD-038-16)
```

```text
AC-IMP-038-017-02 — Relevant OWASP Top 10 / API risks used as threat inputs only
Story: US-IMP-038-017
Given threat model
When Top 10 / API Security risks are referenced
Then they inform threats/controls; they are not treated as a certification claim
Mandatory: YES
```

```text
AC-IMP-038-018-01 — CERT-In applicability/control/evidence matrix published
Story: US-IMP-038-018
Given FD-038-11 / LEGAL_REVIEW_REQUIRED
When matrix assembled
Then incident-reporting, Point-of-Contact, time-sync, and log-retention obligations are mapped to
controls/evidence or marked N/A with rationale
And no CERT-In compliance claim is asserted
Mandatory: YES
```

```text
AC-IMP-038-018-02 — Mandatory legal interpretation distinguished from engineering assumptions
Story: US-IMP-038-018
Given matrix rows
When legal interpretation is required
Then row is marked LEGAL_REVIEW_REQUIRED rather than silent engineering assumption
Mandatory: YES
```

```text
AC-IMP-038-018-03 — Incident readiness tabletop or runbook exercise evidence
Story: US-IMP-038-018
Given CERT-In / incident readiness controls
When Acceptance Pack assembled
Then runbook/tabletop evidence exists or is EXPLICITLY_DEFERRED with owner and residual risk
Mandatory: YES
```

```text
AC-IMP-038-019-01 — Security logs minimize secrets and unnecessary PII
Story: US-IMP-038-019
Given security-relevant logging design
When sample events inspected
Then secrets are absent; PII minimized to what FD-038-19 allows
Mandatory: YES (after FD-038-19)
```

```text
AC-IMP-038-019-02 — Security-log retention coherent with privacy retention matrix
Story: US-IMP-038-019
Given FD-038-02 and FD-038-19
When retention compared
Then conflicts are resolved by Founder/legal decision, not silent overwrite
Mandatory: YES
```

```text
AC-IMP-038-020-01 — Data inventory and data-flow map exist
Story: US-IMP-038-020
Given customer/workforce/auth/location/orders/payment/refunds/financial docs/logs/backups/vendors
When DPDP matrix prepared
Then inventory + flow/purpose/processor mapping exists
Mandatory: YES
```

```text
AC-IMP-038-020-02 — Requirement→control→evidence→owner→legal-review rows complete
Story: US-IMP-038-020
Given applicable and assessed-N/A requirements (incl. rights/notice/consent/withdrawal/retention/
erasure/grievance/breach; staged current vs future-effective)
When matrix inspected
Then each row has applicability, rationale, control, evidence, owner, LEGAL_REVIEW marker
Mandatory: YES
```

```text
AC-IMP-038-020-03 — Child-data applicability assessed
Story: US-IMP-038-020
Given FD-038-20
When matrix inspected
Then child-data / age-gate applicability is assessed with control or explicit N/A + legal marker
Mandatory: YES
```

```text
AC-IMP-038-020-04 — No DPDP compliance claim; portal may remain deferred
Story: US-IMP-038-020
Given matrix complete
When Acceptance Pack / public statements reviewed
Then no DPDP compliance claim is made
And US-011 full automated portal may remain DEFERRED if rights-handling model (FD-038-01/10) does not require it
Mandatory: YES
```

```text
AC-IMP-038-021-01 — PAN/CVV touch assessment recorded
Story: US-IMP-038-021
Given Razorpay payment flows
When assessment completes
Then evidence states whether BOBA stores/processes/transmits raw PAN/CVV (expected: no)
And architectural preference to avoid raw card credentials is preserved
Mandatory: YES
```

```text
AC-IMP-038-021-02 — Razorpay integration type and shared-responsibility matrix
Story: US-IMP-038-021
Given payment integration
When matrix published
Then integration type is identified; merchant vs provider responsibilities and evidence are listed
Mandatory: YES (pending FD-038-12)
```

```text
AC-IMP-038-021-03 — Validation path / ASV implications identified or N/A
Story: US-IMP-038-021
Given FD-038-12 scope
When applicable
Then validation path / ASV implications are identified, or N/A with rationale
And no PCI DSS compliance claim is made
Mandatory: YES
```

```text
AC-IMP-038-022-01 — Material vendor/processor register complete for V1
Story: US-IMP-038-022
Given payments, messaging, maps/location, hosting/storage, and CDN/bot controls as used
When register inspected
Then data/purpose/access/credential/retention/incident/shared-responsibility/exit fields exist
Mandatory: YES
```

```text
AC-IMP-038-022-02 — Third-party browser scripts/tags inventoried
Story: US-IMP-038-022
Given client-side storefront/admin pages
When inventory completed
Then third-party scripts/tags are listed with purpose and risk notes (privacy/payment integrity)
Mandatory: YES
```

```text
AC-IMP-038-023-01 — Edge-to-origin bypass property stated as V1 requirement
Story: US-IMP-038-023
Given intended edge security layer (Fit-selected)
When product requirements reviewed
Then arbitrary direct Internet access must not trivially bypass that layer to unprotected origin
Mandatory: YES
```

```text
AC-IMP-038-023-02 — Mechanism non-binding; application controls remain authoritative
Story: US-IMP-038-023
Given FD-038-14 / Architecture Fit / IMP-039
When mechanism chosen (allowlist / authenticated origin / tunnel / etc.)
Then Product Definition remains mechanism-neutral
And application authorization/validation/throttling remains authoritative
Mandatory: YES
```

```text
AC-IMP-038-024-01 — Security & Privacy Acceptance Pack index complete
Story: US-IMP-038-024
Given V1 stories US-001…008 and US-013…023 evidence
When pack assembled
Then minimum index in US-024 is present and consumable by IMP-040
Mandatory: YES
```

```text
AC-IMP-038-024-02 — Acceptance principles enforced in pack
Story: US-IMP-038-024
Given pack contents
When reviewed
Then every control has evidence; every gap has owner; every exception has authority+expiry;
And no compliance claim appears without applicability + LEGAL_REVIEW support
Mandatory: YES
```

| Story / AC ID | Required behaviour / risk | Applicable test layers | Planned proof | Actual evidence |
|---|---|---|---|---|
| US-001 / AC-001-* | Headers/CSP | HTTP integration + config | nginx/static header assertions | Planned only |
| US-002 / AC-002-* | Maps auth gate | Unit + HTTP + browser | Deny anonymous I/O; allow authed | Planned only |
| US-003 / AC-003-* | Customer auth/OTP abuse | Unit + HTTP + abuse tests | Throttle/challenge/enumeration negatives | Planned only |
| US-004 / AC-004-* | Privacy labeling/erasure | Unit + HTTP + UX | FD-dependent | Planned only |
| US-005 / AC-005-* | Retention matrix | Doc + selective tests | Policy artifact + FD immutability | Planned only |
| US-006 / AC-006-* | Secure SDLC scans | CI/scripts | SAST/SCA/secret/container/SBOM posture | Planned only |
| US-007 / AC-007-* | Bypass + BOLA/BFLA | Security smoke + access tests | Cross-scope/object/function negatives | Planned only |
| US-008 / AC-008-* | Incident investigation pack | Runbook + redaction tests | Pack procedure | Planned only |
| US-013 / AC-013-* | Workforce auth/MFA abuse | Unit + HTTP | Stuffing/MFA/enumeration negatives | Planned only |
| US-014 / AC-014-* | Platform bot/API abuse | HTTP + Fit edge proof | Layered controls + bypass survival | Planned only |
| US-015 / AC-015-* | Business-logic abuse | Threat model + selective tests | Abuse-case matrix | Planned only |
| US-016 / AC-016-* | Vuln/exception register | Process + CI evidence | Expiring exceptions + retest | Planned only |
| US-017 / AC-017-* | ASVS v5.0.0 matrix | Doc + mapped proofs | PASS/GAP/N/A matrix | Planned only |
| US-018 / AC-018-* | CERT-In matrix | Doc + runbook/tabletop | Applicability/control/evidence | Planned only |
| US-019 / AC-019-* | Security logging design | Config + sample log review | Minimization + retention coherence | Planned only |
| US-020 / AC-020-* | DPDP matrix | Doc + control evidence | Inventory/flows/matrix | Planned only |
| US-021 / AC-021-* | PCI/payment scope | Architecture + payment path proof | PAN/CVV + shared responsibility | Planned only |
| US-022 / AC-022-* | Vendor/client-side register | Inventory | Register + script inventory | Planned only |
| US-023 / AC-023-* | Edge-to-origin bypass property | Infra Fit + negative probe | Bypass resistance property | Planned only |
| US-024 / AC-024-* | Acceptance Pack | Evidence index | IMP-040-consumable pack | Planned only |

---

## 11. Business rules

| Rule ID | User/business rule | Authority / rationale | Story / AC IDs |
|---|---|---|---|
| BR-IMP-038-001 | Security headers/CSP on the real serving path; cutover must not disable | ARCH §12; IMP-040 dependency | US-001 |
| BR-IMP-038-002 | Anonymous Google location I/O = NO; Dehradun default when signed out | IMP-036B §6.1 Founder future requirement | US-002 |
| BR-IMP-038-003 | Customer realm ≠ workforce realm; no caller-manufactured authority | ADR-004; ARCH §§6–7 | US-007/009/013 |
| BR-IMP-038-004 | Deny by default; scope server-derived; BOLA/BFLA negatives required | ADR-005 | US-007 |
| BR-IMP-038-005 | Backup retention ≠ statutory/customer/audit retention | IMP-037 FD-037-03 | US-005 |
| BR-IMP-038-006 | Issued Financial Documents remain immutable statutory authority | D-365–D-367 | US-005 |
| BR-IMP-038-007 | No secrets in client bundles without allowlist + review; no secret logging | ARCH §12; ADR-015 | US-006/019 |
| BR-IMP-038-008 | Profile delete meaning must match Founder privacy decision; no silent legal claim | OQ-005; FD-038-01 | US-004 |
| BR-IMP-038-009 | IMP-038 acceptance blocked until IMP-037 formally accepted/reconciled | CONTINUATION_EXCEPTION + contiguity | lifecycle |
| BR-IMP-038-010 | This PD asserts **no** DPDP / CERT-In / PCI / OWASP-certification compliance claim | Legal safety | all |
| BR-IMP-038-011 | Server-side throttling/authorization/validation remain authoritative; edge/bot challenge is defense-in-depth only | Founder layered-defense requirement | US-003/013/014/023 |
| BR-IMP-038-012 | No permanent lockout design that enables attacker DoS of legitimate accounts | Founder auth-abuse requirement | US-003/013 |
| BR-IMP-038-013 | Auth responses must be safe/non-enumerating except where an explicit product need is recorded | Founder auth-abuse requirement | US-003/013 |
| BR-IMP-038-014 | Platform bot/API abuse defense is layered (edge candidate + application controls) on critical surfaces | Founder bot-protection requirement | US-014 |
| BR-IMP-038-015 | Arbitrary direct Internet access must not trivially bypass the intended edge security layer; mechanism is Fit/IMP-039 | Founder edge-to-origin requirement | US-023/014 |
| BR-IMP-038-016 | DPDP/CERT-In/PCI topics require applicability/control/evidence matrices; portal automation is separate and may defer | Founder regulatory-readiness requirement | US-018/020/021 |
| BR-IMP-038-017 | OWASP ASVS v5.0.0 is the primary traceable technical-control baseline; Top 10/API lists are threat inputs only | Founder verification baseline | US-017 |
| BR-IMP-038-018 | Every V1 control needs evidence; every gap needs owner; every exception needs authority + expiry | Acceptance principles | US-016/024 |
| BR-IMP-038-019 | Cloudflare Free may be preferred low-TCO Fit candidate; Product Definition must not lock Cloudflare | Founder TCO + Fit boundary | US-014/023 |
| BR-IMP-038-020 | Architectural preference: BOBA does not handle raw card PAN/CVV credentials | Payment architecture + FD-038-12 | US-021 |

Unresolved material rules → §25.

---

## 12. Journey Completeness Matrix

### JOURNEY-AUTH-GATED-LOCATION

| Journey dimension | Behaviour / applicability or N/A reason | Story / AC references |
|---|---|---|
| ENTRY | Signed-out sees default Dehradun; signed-in may open location tools | US-002 |
| DISCOVERY | Location controls discoverable only when permitted | US-002 |
| CONTEXT | Outlet/serviceability context unchanged | US-002 |
| EMPTY / FIRST USE | First location set after auth | US-002 |
| HAPPY PATH | Authed Maps/Places/geocode/save address | AC-002-03 |
| ALTERNATE VALID PATHS | Manual address entry if still supported under existing rules | US-002 |
| VALIDATION FAILURE | Invalid place/geocode → safe error | US-002/003 |
| AUTHORIZATION | Signed-out Google I/O denied | AC-002-01/02/04 |
| NOT FOUND / STALE REFERENCE | Stale place ids fail safely under existing patterns | US-002 |
| SERVER / NETWORK ERROR | Provider failure safe; no anonymous fallback I/O | US-002 |
| RECOVERY | Re-auth then retry | US-002 |
| CONCURRENCY | Existing address revision rules; no new LWW | N/A new — reuse 036B |
| DESTRUCTIVE ACTION | Address delete remains existing audited path | US-004 adjacency |
| SUCCESS FEEDBACK | Location updated / denied message | US-002 |
| DOWNSTREAM EFFECT | Serviceability/checkout re-eval unchanged authority | GJ-ADDRESS-SERVICEABILITY |
| REVISIT / RELOAD | Session still gates I/O | US-002 |
| RESPONSIVE / MOBILE | Same gating on mobile/desktop | US-002 |
| ACCESSIBILITY | Denial messaging accessible | US-002 |

### JOURNEY-CUSTOMER-AUTH-ABUSE / JOURNEY-WORKFORCE-AUTH-ABUSE

| Journey dimension | Behaviour / N/A | Refs |
|---|---|---|
| ENTRY | Auth/OTP/MFA surfaces | US-003/013 |
| HAPPY PATH | Legitimate auth succeeds within policy | US-003/013 |
| VALIDATION FAILURE | Bad OTP/password/MFA → safe error | US-003/013 |
| AUTHORIZATION | Cross-realm manufacture denied | BR-003 |
| RECOVERY | Cooldown/challenge; no permanent attacker lockout DoS | AC-003-02; AC-013-01 |
| SUCCESS FEEDBACK | Auth success without leaking enumeration | AC-003-03; AC-013-03 |
| DOWNSTREAM EFFECT | Session issuance only after successful auth | ADR-004 |
| Other dimensions | DISCOVERY/UX as existing auth UX; CONCURRENCY N/A new; DESTRUCTIVE N/A | — |

### JOURNEY-SECURITY-HEADERS

| Journey dimension | Behaviour / N/A | Refs |
|---|---|---|
| ENTRY | Any document load | US-001 |
| DISCOVERY | N/A — not a user-discovered feature | — |
| CONTEXT | Public vs admin paths | AC-001-01/02 |
| HAPPY PATH | Headers present | AC-001-01 |
| ALTERNATE VALID PATHS | Accepted embed exceptions only if FD lists them | FD-038-05 |
| RECOVERY | Config rollback | US-001 |
| SUCCESS FEEDBACK | Operator verification evidence | US-001 |
| DOWNSTREAM EFFECT | Payment/maps embeds must still work per FD | US-001 |
| ACCESSIBILITY | Must not break a11y via CSP blocking needed assets without alternative | US-001 |
| Other | EMPTY/FIRST USE/AUTHZ/NOT FOUND/CONCURRENCY/DESTRUCTIVE = N/A | — |

### JOURNEY-PRIVACY-REQUEST / JOURNEY-DPDP-APPLICABILITY

| Journey dimension | Behaviour / N/A | Refs |
|---|---|---|
| ENTRY | Customer or operator enters privacy request path (FD defines channel) | US-004 |
| DISCOVERY | If self-service exists, discoverable; else operator-mediated only | FD-038-04 |
| CONTEXT | Subject identity server-derived | US-004 |
| HAPPY PATH | Request accepted/dispositioned per FD; matrix evidence retained | AC-004-01; US-020 |
| ALTERNATE VALID PATHS | Operator-mediated vs self-service | FD-038-01/04/10 |
| AUTHORIZATION | Cross-subject denied | AC-004-02 |
| NOT FOUND / STALE | Unknown subject → non-enumerating response | US-004 |
| CONCURRENCY | No double-delete corruption; statutory hold wins when required | AC-004-03 |
| DESTRUCTIVE ACTION | Explicit confirmation; hold checks | AC-004-03 |
| SUCCESS FEEDBACK | Accurate labeling (not false “erased from law” / not false “DPDP compliant”) | AC-004-01; AC-020-04 |
| DOWNSTREAM EFFECT | Audits/FDs preserved; Acceptance Pack updated | US-005/024 |

### JOURNEY-PLATFORM-BOT-API-ABUSE / JOURNEY-EDGE-ORIGIN-DEFENSE / JOURNEY-BUSINESS-LOGIC-ABUSE

Operator/security journeys: ENTRY = exposed API/edge; HAPPY PATH = legitimate traffic succeeds;
VALIDATION/AUTHORIZATION = abuse degraded; RECOVERY = challenge/cooldown; SUCCESS = degradation
proven; DOWNSTREAM = Acceptance Pack rows. Mechanism selection N/A at Product Definition
(Cloudflare Free preferred Fit candidate only).

### JOURNEY-SECURE-SDLC / CERTIN / PCI / ASVS / VENDOR / LOGGING / ACCEPTANCE PACK / RETENTION / INCIDENT

Remaining operator-runbook journeys — ENTRY through SUCCESS FEEDBACK covered by
US-005/006/008/016–024; DISCOVERY/UX/mobile/a11y = N/A unless UI added; CONCURRENCY/DESTRUCTIVE
as applicable to deletion only (US-004/005).

---

## 13. UX state matrix

| Surface / state | Entry condition | Visible feedback / actions | Focus / keyboard | Next / recovery | AC / N/A |
|---|---|---|---|---|---|
| Location tools signed-out | Guest | Default Dehradun; CTA to sign in to change location | Focus on sign-in CTA | Auth then location | AC-002-* |
| Location tools signed-in | Authed | Maps/Places available per policy | Existing patterns | Serviceability | AC-002-03 |
| Customer OTP / login abused | Threshold crossed | Safe error / retry-later / challenge if FD-selected | Focus on recovery CTA | Cooldown then retry | AC-003-* |
| Workforce login / MFA abused | Threshold crossed | Safe error / cooldown / challenge | Focus on recovery | Cooldown then retry | AC-013-* |
| Profile delete | Authed | Copy matches FD-038-01 (not overclaiming erasure) | Confirm control | Success/error | AC-004-01 |
| Privacy request (if V1 UI) | Per FD-038-04 | Status / denied / hold | Confirm destructive | Recovery | FD-dependent |
| Bot challenge (if Fit/FD selects) | Abuse threshold | Challenge UI (Turnstile-class candidate) | Focus challenge control | Complete then retry | AC-014-04 |
| Headers | N/A user UI | Operator evidence only | N/A | N/A | US-001 |
| Incident pack / Acceptance Pack | Operator | Runbook checklist; redacted exports; pack index | N/A | Escalate | US-008/024 |

---

## 14. Permissions / resource context

| Action | Existing identity / permission authority | Resource context | Allowed / denied / cross-scope | AC IDs |
|---|---|---|---|---|
| Admin audit view | Existing admin audit permissions (IMP-035/036G) | Server membership scope | Cross-scope denied | AC-007-02/04 |
| Customer profile delete | Customer session subject | Own profile only | Other subject denied | AC-004-02 |
| Customer object access | Customer session subject | Own orders/addresses/etc. | BOLA denied cross-subject | AC-007-03 |
| Location Google I/O | Customer session | Authed customer | Anonymous denied | AC-002-* |
| Workforce privileged function | ADR-005 catalogue | Scoped outlet/territory/org | BFLA / cross-scope denied | AC-007-02/04 |
| Privacy erasure (if any) | FD-038-01 may require new permission — **must not invent** until decided | TBD | STOP if undefined | FD-038-01 |
| Scan / pack execution | Platform operator process / CI | Repo/CI/ops | N/A RBAC UI | US-006/024 |

Do not invent roles. If FD-038-01 requires new permission keys, Architecture Fit must follow Gate PASS.

---

## 15. Data implications

PII/classes present today (inventory baseline for US-020, not legal classification): customer
phone/profile/addresses; workforce credentials/MFA; session IP/UA; orders/payments/refunds;
financial documents / GSTIN / signed artifacts; audits; backups (IMP-037); logs/observability;
vendor/processor data shares; client-side third-party script exposures.

IMP-038 must produce:

- DPDP applicability/control/evidence matrix + data-flow map (US-020);
- retention/deletion matrix (US-005);
- security logging/privacy matrix (US-019);
- payment/PCI scope assessment (US-021);
- vendor/client-side register (US-022).

IMP-038 must not:

- rewrite Financial Document immutability;
- redefine IMP-037 backup retention as privacy compliance;
- claim card PAN/CVV storage if assessment shows none;
- invent DPDP lawful bases or claim DPDP/CERT-In/PCI compliance.

Persistence mechanism selection = Architecture Fit (not this draft).

---

## 16. Security/privacy

Trust boundaries: customer-auth / workforce-auth / customer-commerce / operations façade /
edge→origin remain separate. Positive ACs: headers; auth-gated Maps; customer & workforce abuse
resistance; layered bot/API controls; ASVS matrix; BOLA/BFLA negatives; edge-to-origin property;
secure SDLC; vendor register; regulatory matrices; Acceptance Pack. Negative ACs: cross-realm
authority manufacture; secret leakage in logs/UI; trivial edge bypass; disabling hardening at
cutover; silent compliance claims.

`LEGAL_REVIEW_REQUIRED` topics: DPDP applicability interpretation; CERT-In obligations;
erasure/retention; breach customer communication; PCI scope interpretation; child-data posture;
any claim of regulatory compliance (forbidden unless later canonicalized after legal review).

Claims made: **NONE** regarding DPDP / CERT-In / PCI / OWASP certification compliance.

Threat inputs (not compliance claims): relevant OWASP Top 10 and API Security risks; business-logic
abuse cases in US-015.

---

## 17. Concurrency/recovery

Reuse existing address/profile/revision concurrency. Privacy destructive actions must not
last-write-win against statutory holds (AC-004-03). Auth abuse controls must not create
permanent lockout DoS races against legitimate users (BR-IMP-038-012). Scan/header/edge work is
config/CI/infra — crash/recovery N/A beyond fail-closed config. No new payment idempotency invented;
webhook replay remains in US-015 threat model.

---

## 18. Accessibility/responsive expectations

Customer location gating, auth challenge (if any), and any privacy UI must work on mobile/desktop
ordering surfaces with accessible denial/success messaging. Header-only changes: verify CSP does
not break required accessible assets. Operator runbooks/matrices: N/A a11y beyond existing admin
console patterns.

---

## 19. Observability/supportability

Reuse IMP-036 observability + domain audits. Incident investigation pack (US-008) defines
exportable fields and redaction. Security logging design (US-019) minimizes secrets/PII while
preserving CERT-In/incident utility. Acceptance Pack (US-024) is the durable handoff artifact.
Do not invent SIEM. Privacy boundaries on logs remain ARCH §12.

---

## 20. Golden Journeys affected

| GJ ID / registry status | Affected steps | Mandatory for this acceptance? | Related story / AC | Required proof |
|---|---|---|---|---|
| `GJ-FIRST-ORDER` / CURRENT | Auth + address steps must still complete under gating/abuse controls | YES (regression) | US-002/003 | Browser path still completes for authed customer |
| `GJ-ADDRESS-SERVICEABILITY` / CURRENT | Location change gating | YES (regression) | US-002 | Serviceability truth unchanged |
| `GJ-PERMITTED-OUTLET-ACCESS` / CURRENT | Admin authz unchanged | YES (negative regression) | US-007 | Cross-scope / BFLA still denied |
| `GJ-PAYMENT-RECOVERY` / CURRENT | Must not break Razorpay embeds via CSP; payment scope assessment | YES | US-001/021 | Payment path still works; scope matrix present |
| Others | No intentional change | NO | — | — |

Journey Gap Audit remains IMP-040 requirement — not performed here.

---

## 21. Dependencies

| Dependency | Authority / verified state | Required before | Unresolved impact |
|---|---|---|---|
| IMP-037 formal acceptance + reconciliation | IMPLEMENTATION_IN_PROGRESS; provider-blocked | **IMP-038 COMPLETE_AND_ACCEPTED** | `IMP038_ACCEPTANCE_BLOCKED_BY_IMP037` |
| Controlled continuation activation | PR#179/5771367844; GTM-R138/STATE-R136 | This draft exists | NONE for drafting |
| Founder FDs FD-038-01…21 | Unresolved | Product Definition Gate PASS | STOP Gate if material unresolved |
| Legal review (DPDP/CERT-In/PCI/erasure/retention/breach/child-data) | Not performed | US-004/005/008/018/019/020/021 | LEGAL_REVIEW_REQUIRED |
| Architecture Fit / lock | NOT_PERFORMED | Implementation authorization | STOP; Cloudflare Free is preferred candidate only |
| IMP-039 infra | PLANNED not activated | Edge-to-origin mechanism if infra mutation required | Boundary only |
| IMP-040 cutover | PRE-GATE draft | Requires IMP-038 accepted later + Acceptance Pack | Soft planning dependency |

---

## 22. Supported now

| Behaviour | Existing verified or V1 commitment? | Refs |
|---|---|---|
| Dual-realm auth, MFA (workforce), OTP (customer) | Existing verified | ADR-004 |
| Scoped RBAC deny-by-default | Existing verified | ADR-005 |
| Origin checks + auth/location rate limits | Existing verified (insufficient alone for Founder abuse bar) | auth HTTP origin/rate-limit |
| Domain mutation audits + FD immutability | Existing verified | schemas + D-365+ |
| Config boundary / placeholder secret rejection | Existing verified | ADR-015; audits |
| Baseline nosniff/Referrer-Policy/XFO/HSTS/Permissions-Policy | Existing partial | next.config.ts |
| Razorpay-hosted payment (no intentional PAN/CVV handling) | Existing verified pattern; scope matrix still required | payment flows; US-021 |
| Maps auth-gate + CSP + abuse/bot/ASVS/DPDP/CERT-In/PCI matrices + SDLC + Acceptance Pack | V1 commitment **proposed** (not accepted) | this PD |

---

## 23. Explicitly deferred

| Behaviour | FOLLOW_UP or DEFERRED | Reason | Revisit |
|---|---|---|---|
| Full DPDP automated portal | DEFERRED | Legal + product undecided; matrix remains V1 mandatory (US-020) | Legal review + Founder |
| Secrets console UX | DEFERRED | IMP-039 host-local secrets adjacency | IMP-039 / later |
| Marketing consent center | DEFERRED | No V1 marketing system evidenced | Product |
| Customer MFA / WebAuthn | DEFERRED | Not in CURRENT deferral-to-038 evidence as mandatory | Future |
| SIEM / WORM log product | DEFERRED | Out of V1 pack | Future |
| Customer breach SMS/email factory | FOLLOW_UP or DEFERRED | FD-038-03 | Legal + Founder |
| Automated retention job engine | FOLLOW_UP | Policy first | After FD-038-02 |
| Locking Cloudflare (or any WAF/CDN) as architecture | NOT in PD | Fit decides; Free preferred candidate only | Architecture Fit |
| Invented remediation SLA hours/days without Founder policy | NOT supported | FD-038-17 must decide | Founder |

---

## 24. Not supported by design

| Behaviour | Reason / authority | Boundary |
|---|---|---|
| Claiming DPDP / CERT-In / PCI / OWASP certification compliance in this IMP | Legal safety; no canonical claim | BR-IMP-038-010 |
| Absorbing Droplet/provisioning/release pipeline | IMP-039 | Scope boundary |
| Public launch GO / DNS / Journey Gap Audit execution | IMP-040 | Scope boundary |
| Redefining IMP-037 backup retention as privacy law | FD-037-03 | BR-IMP-038-005 |
| Inventing new roles to “solve” privacy | ADR-005 / D-358/372/373 | Authz section |
| Reopening IMP-026→IMP-028 continuation as authority | ROADMAP CLOSED | Continuation markers |
| Treating edge/WAF vendor selection as Product Definition lock | Fit / IMP-039 | BR-IMP-038-019 |
| Permanent auth lockout that enables attacker DoS of victims | Founder auth-abuse requirement | BR-IMP-038-012 |

---

## 25. Unresolved / decision required

| DECISION_ID | QUESTION | WHY IT MATTERS | AFFECTED | OPTIONS SUPPORTED BY CURRENT ARCHITECTURE | RECOMMENDED DEFAULT (evidence-backed only) | WHAT REMAINS HUMAN AUTHORITY |
|---|---|---|---|---|---|---|
| FD-038-01 | What is V1 customer privacy request / erasure model? | OQ-005; profile delete ≠ erasure | US-004; JOURNEY-PRIVACY-REQUEST | (A) Label-only clarify profile delete; (B) operator-mediated erasure runbook; (C) limited self-service erasure with statutory holds | **None strong enough** without legal review | Founder + LEGAL_REVIEW |
| FD-038-02 | Retention windows by data class (customer PII, workforce, logs/audits, location, financial/statutory)? | Conflicts with backup vs statutory | US-005/019 | Matrix with “retain / delete / anonymize / legal-hold” per class; must preserve FD immutability | Backup 35-day already decided for **backups only** (IMP-037) — do not extend by assumption | Founder + LEGAL_REVIEW |
| FD-038-03 | Breach/security incident customer & operator communication for V1? | IMP-040 references IMP-038 pack | US-008/018/024 | (A) Internal pack only; (B) internal + Founder-approved customer template; (C) defer customer notice procedure | Internal pack in V1 is evidenced need; customer notice **not** assumed | Founder + LEGAL_REVIEW |
| FD-038-04 | Any customer privacy self-service in V1? | Scope of UX | US-004/011/020 | Yes limited / No operator-only | Prefer operator-only until FD-038-01 | Founder |
| FD-038-05 | CSP/security-header policy (strictness; Razorpay/Maps/admin exceptions)? | Static export path; payment embeds | US-001 | Enforce via nginx/static; exception allowlist for known payment/maps origins | Enforce CSP with explicit payment/maps allowlist (tests already mention Razorpay CSP origins) | Founder confirms strictness |
| FD-038-06 | Privileged-session / step-up beyond existing workforce MFA for V1? | Admin high-consequence | US-009/013 | Keep MFA-only / add step-up for selected actions | Keep MFA-only for V1 unless Founder elevates | Founder |
| FD-038-07 | Marketing/communication consent preferences in V1? | Privacy UX sprawl | US-012 | Defer / out of design if no marketing system | **DEFER** (no marketing system evidenced) | Founder confirm defer |
| FD-038-08 | Location-data retention after Maps gating? | Location PII | US-002/005 | Reuse address retention; shorter ephemeral telemetry; etc. | No default without FD-038-02 | Founder |
| FD-038-09 | Security launch thresholds (scan severities; residual risk acceptance) for IMP-040 handoff? | Blocks GO inputs | US-006/015/016/024 | Document severity gates | Require disposition of critical secrets; dependency criticals dispositioned before claiming IMP-038 complete | Founder |
| FD-038-10 | DPDP V1 rights-handling model relative to applicability matrix (matrix always mandatory; portal optional)? | Separates matrix from portal deferral | US-020/011 | Matrix-only + operator-mediated rights / limited self-service / defer portal | Matrix mandatory; portal deferred unless FD-038-01 requires self-service | Founder + LEGAL_REVIEW |
| FD-038-11 | CERT-In applicable obligations interpretation (reporting, PoC, time-sync, log retention) for V1? | Engineering must not invent legal duties | US-018/019 | Map applicable / N/A with legal markers; implement engineering-ready controls only where decided | No compliance claim; LEGAL_REVIEW before asserting obligations | Founder + LEGAL_REVIEW |
| FD-038-12 | Payment/PCI merchant scope classification and Razorpay integration-type acceptance? | Shared responsibility + ASV path | US-021 | Confirm no PAN/CVV touch; document integration type; merchant vs provider matrix | Prefer architecture that never handles raw card credentials | Founder + LEGAL_REVIEW |
| FD-038-13 | Edge/WAF/bot vendor posture for V1 (Cloudflare Free preferred candidate vs alternatives vs defer edge)? | Layered defense without PD lock | US-014/022/023 | Evaluate Cloudflare Free first; alternatives allowed; defer edge only with residual risk owner | Prefer Cloudflare Free as Fit candidate; do not lock in PD | Founder (policy) + Fit (mechanism) |
| FD-038-14 | Edge-to-origin bypass protection mechanism class? | Defense-in-depth property | US-023 | Origin allowlist / authenticated origin / tunnel / equivalent; or staged with IMP-039 | Mechanism not chosen in PD; property mandatory | Founder + Architecture Fit / IMP-039 |
| FD-038-15 | Auth abuse response policy (throttle / temporary cool-down / challenge; permanent lockout forbidden)? | Customer + workforce ATO vs DoS | US-003/013 | Throttle + cool-down ± challenge; no permanent attacker-driven lockout | Prefer throttle/cool-down/challenge over permanent lockout | Founder |
| FD-038-16 | OWASP ASVS v5.0.0 target level / selected control set for V1? | Verification scope | US-017 | Level 1 baseline / selected Level 2 controls / custom in-scope set | Prefer Level 1 + explicitly selected higher controls tied to BOBA risks | Founder / security policy |
| FD-038-17 | Vulnerability remediation / exception expiry policy (without inventing SLAs)? | Exception register validity | US-016 | Severity classes + max exception duration + retest rules | Require owner+expiry+authority; no silent perpetual exceptions | Founder |
| FD-038-18 | Penetration / security-assessment scope required before IMP-038 acceptance? | Acceptance Pack completeness | US-016/024 | Internal assessment only / external pen-test / defer with residual risk | No default invented; Founder chooses scope | Founder |
| FD-038-19 | Security-log retention windows vs privacy minimization tradeoff? | CERT-In utility vs PII | US-019/005/018 | Distinct security-log class in retention matrix | Minimize PII/secrets; retain security utility per legal guidance | Founder + LEGAL_REVIEW |
| FD-038-20 | Child-data / age-gate applicability posture for V1 ordering? | DPDP matrix completeness | US-020 | N/A with rationale / soft notice / hard age-gate | No default without legal review | Founder + LEGAL_REVIEW |
| FD-038-21 | Bot/human challenge surfaces for V1 (which endpoints; Turnstile-class candidate)? | Abuse UX + Fit | US-003/013/014 | Challenge on auth only / auth+checkout / broader; or defer with residual risk | Prefer auth (+ OTP) first if challenge adopted | Founder + Fit |

`PRODUCT_DEFINITION_GATE` must **STOP** while these material decisions remain unresolved (or Founder
explicitly defers each with coherent V1 boundary).

---

## 26. Definition of Ready

| Story ID | Fields complete? | Open material decisions | Readiness |
|---|---|---|---|
| US-IMP-038-001 | Draft complete | FD-038-05 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-002 | Draft complete | Confirm V1 (evidenced); FD-038-08 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-003 | Draft complete | FD-038-15; FD-038-21 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-004 | Draft complete | FD-038-01, FD-038-04, FD-038-10 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-005 | Draft complete | FD-038-02, FD-038-08, FD-038-19 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-006 | Draft complete | FD-038-09, FD-038-17 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-007 | Draft complete | NONE material | NOT_READY_FOR_IMPLEMENTATION (Gate/Fit still required) |
| US-IMP-038-008 | Draft complete | FD-038-03 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-009 | Follow-up | FD-038-06 | NOT_READY / FOLLOW_UP |
| US-IMP-038-010…012 | Deferred | as listed | DEFERRED |
| US-IMP-038-013 | Draft complete | FD-038-15; FD-038-06 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-014 | Draft complete | FD-038-13; FD-038-21 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-015 | Draft complete | FD-038-09 residual | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-016 | Draft complete | FD-038-09/17/18 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-017 | Draft complete | FD-038-16 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-018 | Draft complete | FD-038-11 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-019 | Draft complete | FD-038-19; FD-038-02 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-020 | Draft complete | FD-038-01/04/10/20 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-021 | Draft complete | FD-038-12 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-022 | Draft complete | FD-038-13 (vendor row updates) | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-023 | Draft complete | FD-038-14 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-024 | Draft complete | FD-038-09 | NOT_READY_FOR_IMPLEMENTATION |

`STORY_COMPLETE != IMP_ACCEPTED`. `IMP038_ACCEPTED` remains blocked by IMP-037 contiguity even after later implementation.

---

## 27. Product Definition Gate

```text
PRE-GATE DRAFT:
PRODUCT_DEFINITION_GATE_EXECUTION = NOT_PERFORMED
Gate Result: NOT_PERFORMED

PRODUCT_DEFINITION_GATE

Capability: IMP-038 — Security & Privacy Hardening
Product Definition Version: PD-IMP-038-DRAFT-1
Business Outcome: defined (draft; Founder security/privacy requirements incorporated)
Primary Personas: PERSONA-CUSTOMER, PERSONA-WORKFORCE-OPERATOR, PERSONA-PLATFORM-OPERATOR
Journeys Defined: YES (draft; expanded)
Story Map Complete: YES (draft; 24 stories / 20 V1)
Acceptance Slice Defined: YES (draft; FD-dependent)
Happy Paths Defined: YES (draft)
Alternate Paths Defined: YES (draft)
Empty / First-Use States Defined: YES where applicable
Error / Recovery Paths Defined: YES (draft)
Authorization Variants Defined: YES (draft; BOLA/BFLA; no invented roles)
Cross-Scope Scenarios Defined: YES
Concurrency Considered: YES
Destructive Actions Defined: YES (privacy)
UX State Matrix Complete: YES (draft)
Accessibility Considered: YES (draft)
Golden Journeys Identified: YES
Explicit Deferrals Recorded: YES
Regulatory matrices required: DPDP (US-020), CERT-In (US-018), PCI/payment (US-021)
Verification baseline: OWASP ASVS v5.0.0 (US-017)
Acceptance Pack required: YES (US-024) — consumable by IMP-040
Unresolved Product Decisions: 21 (FD-038-01…21) — material
LEGAL_REVIEW_REQUIRED: YES
COMPLIANCE_CLAIMS: NONE
Cloudflare locked as architecture: NO (preferred low-TCO Fit candidate only)
Architecture Conflicts: NONE identified vs ARCH-R20 (Fit NOT_PERFORMED)
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
```

---

## Architecture-fit inputs (non-binding; Fit NOT_PERFORMED)

- Serving-path header/CSP enforcement under static export + nginx (and any workforce document path).
- Customer-commerce / location provider call gating for anonymous vs authenticated.
- Customer and workforce auth-abuse controls (IP + principal throttles; optional challenge).
- Layered edge WAF/bot/challenge/rate-limit controls: **Cloudflare Free is the preferred low-TCO
  candidate**; alternatives allowed; Free-tier limitations must be recorded; **not locked here**.
- Edge-to-origin bypass protection mechanism class (allowlist / authenticated origin / tunnel /
  equivalent) — may involve IMP-039 infrastructure mutation.
- Secure-SDLC tooling choices in CI (SAST/SCA/secret/container/SBOM/pinning) — requirement is
  dispositioned evidence, not a named tool lock.
- No new deployable service assumed by default; no IMP-039 host provisioning claimed done; no
  D-375/ARCH-R21 assumed.
- Permission changes only if FD-038-01 requires — otherwise reuse catalogue.

---

## Test / evidence expectations (TEST-1)

Map each mandatory AC to meaningful layers after Gate PASS. Prefer negative security evidence
(deny anonymous Maps; deny BOLA/BFLA/cross-scope; reject bypass; CSP blocks; auth abuse throttles;
edge-bypass survival of app controls). No silent-retry proof. Regulatory matrices are evidence
artifacts, not compliance certificates. Founder UAT recommended on exact candidate for
customer-visible gating, auth-abuse/challenge UX, and any privacy UX.

---

## Founder UAT applicability recommendation

```text
FOUNDER_UAT_REQUIRED = YES
Reason: customer-visible location/auth gating, auth-abuse/bot-challenge UX if selected,
        security/privacy launch posture, and operator-visible Acceptance Pack / incident outcomes.
Do NOT run UAT in this task.
FOUNDER_UAT = NOT_PERFORMED
```

---

## Continuation / acceptance dependency on IMP-037

```text
IMP038_ACCEPTANCE_BLOCKED_BY_IMP037 = YES
IMP-037 status: IMPLEMENTATION_IN_PROGRESS
IMP037_ACCEPTED: NO
IMP037_EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED
PHASE1_BLOCK_STATUS: BLOCKED_PROVIDER_ACCESS
acceptedThrough: IMP-036G (unchanged)
pendingAcceptance: NONE (IMP-037 not yet IMPLEMENTATION_COMPLETE_PENDING_ACCEPTANCE)

IMP-038 may later progress through Gate → Fit → implementation/proof when separately authorized,
but MUST NOT become COMPLETE_AND_ACCEPTED before IMP-037 is formally accepted and reconciled.
```

---

## Explicit non-goals (this draft)

- Implement IMP-038 behaviour
- Pass Product Definition Gate
- Lock capability architecture / create `docs/platform/capabilities/IMP-038-*.md`
- Lock Cloudflare or any WAF/CDN/bot vendor as architecture
- Activate IMP-039
- Accept IMP-037 or advance `acceptedThrough`
- Invent or claim DPDP / CERT-In / PCI / OWASP certification compliance
