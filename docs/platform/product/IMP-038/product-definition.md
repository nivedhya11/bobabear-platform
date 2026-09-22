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
  "productDecisions": 9,
  "unresolvedProductDecisions": 9,
  "acceptanceBlockedByImp037": "YES",
  "continuationException": "IMP037_PROVIDER_BLOCKED_TO_IMP038"
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

UNRESOLVED_PRODUCT_DECISIONS: 9
LEGAL_REVIEW_REQUIRED: YES (topics listed; no compliance claims asserted)

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
implementation start, Founder UAT, or IMP acceptance. It does **not** claim DPDP, PCI DSS, GST, or
any other regulatory compliance.

```text
PRE-GATE DRAFT
  !=
Product Definition Gate PASS
```

---

## 1. Identity / version / status

| Field | Definition |
|---|---|
| Capability / title | IMP-038 — Security & Privacy Hardening |
| Product Definition version / document status | `PD-IMP-038-DRAFT-1`; **DRAFT**; **PRE-GATE DRAFT: YES** |
| Product owner / approval evidence | Founder/human controlled-continuation activation via PR#179 comment `5771367844` + instruction “proceed with next IMP”; Product Definition Gate **not** performed |
| Process / verification policy | PD-1 / TEST-1 |
| Canonical anchors | VISION-1; ROADMAP GTM-R138; STATE STATE-R136; ARCH-R20; DR-16; PD-1; TEST-1 |
| Repository candidate | Canonical path `/home/ajoshi/repos/boba-bear-platform`; branch `governance/imp038-activation-product-definition` (pre-merge); HEAD/tree/fingerprint recorded at PR publication |
| Capability lifecycle / authorization | ROADMAP/STATE: `IMP038_ACTIVATED: YES`; formal lifecycle **PLANNED**; PD = DRAFT; Gate = NOT_PERFORMED; Architecture Fit = NOT_PERFORMED; Architecture Locked = NO; Implementation = NOT_AUTHORIZED / NOT_STARTED; `IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES`; `acceptedThrough` remains IMP-036G |
| Relevant capability architecture / ADRs | No IMP-038 capability architecture yet (forbidden until Gate PASS + Architecture Fit). Binding baselines: ARCH §§6–7,12; ADR-004; ADR-005; ADR-015 (amended by D-374 for host-local pilot secrets → IMP-039 boundary); IMP-036B §6.1 Maps supersession record; IMP-037 FD-037-03 retention distinction |
| Founder UAT applicability | `FOUNDER_UAT_REQUIRED = YES` — materially changes customer-visible location/auth gating (if V1 includes Maps supersession), security headers affecting storefront/admin, and operator-visible security/privacy outcomes |

---

## 2. Business outcome

Make BOBA Bear’s launch-critical **application security and privacy posture** coherent and
provable: existing dual-realm authentication, scoped authorization, transport origin controls,
and domain audits remain authoritative; known hardening gaps deferred into IMP-038 (CSP/headers
on the static-export path, Maps anonymous-I/O supersession, retention/erasure policy boundaries,
secret/dependency scanning disposition, and operator security/privacy visibility) are defined as
observable product outcomes without inventing legal compliance or absorbing IMP-039 infrastructure
/ IMP-040 cutover work.

Observable success (acceptance boundary after later gates — not claimed now):

- Launch-blocking security controls selected for V1 are configured and negatively proven.
- Privacy/retention behaviours that are in V1 are explicit; unresolved legal topics remain
  `UNRESOLVED_DECISION_REQUIRED` / `LEGAL_REVIEW_REQUIRED` rather than silent assumptions.
- IMP-040 may rely on IMP-038 outcomes without disabling them at cutover.

---

## 3. Problem statement

**Verified current state (ANCHOR):** BOBA already has substantial security foundations (customer
phone OTP; workforce password + TOTP MFA; distinct realms/sessions; scoped RBAC; Origin checks;
auth/location rate limits; config boundary audits; domain mutation audits; financial-document
immutability; baseline Next/nginx headers). Public GTM still requires security hardening as part of
VISION production operability.

**Verified gaps / deferred ownership into IMP-038 (repo evidence):**

| Gap | Evidence |
|---|---|
| CSP not set; static `output: "export"` makes Next `headers()` a no-op for the public site | `next.config.ts`; `docker/nginx/nginx.conf`; Razorpay CSP origin tests record future need |
| Anonymous Google Maps / Places / reverse-geocode I/O still historically allowed; Founder-approved future supersession owned by IMP-038 | IMP-036B §6.1; IMP-036C §9 |
| Profile delete ≠ legal account erasure; retention schedules unlocked | OQ-005; IMP-036B deferrals; IMP-037 FD-037-03 (backup retention ≠ statutory/customer/audit) |
| No CI secret-scan / CVE / SBOM job as CURRENT policy | `.github/workflows/ci.yml` inventory |
| Secrets console / broader secret UX deferred from IMP-035 toward IMP-038 adjacency | IMP-035 capability deferrals |
| Breach / personal-data incident operator pack referenced by IMP-040 as IMP-038-owned | IMP-040 PD security/privacy + FD-040-05 |

**Who is harmed if unresolved:** Customers (location/PII exposure, unclear erasure); workforce/
platform operators (inconsistent incident posture); Founder launch (IMP-040 hard-depends on IMP-038).

---

## 4. Primary personas

| Persona ID | Responsibility / goal in this slice | Context / evidence |
|---|---|---|
| `PERSONA-CUSTOMER` | Use account/session and location flows with clear privacy boundaries; understand what delete/profile actions do and do not mean | personas.md; IMP-036B/C |
| `PERSONA-WORKFORCE-OPERATOR` | Administer within scoped permissions; rely on audit visibility for sensitive mutations | personas.md; IMP-035/036D/036G |
| `PERSONA-PLATFORM-OPERATOR` | Operate security/privacy posture: scans, headers, incident evidence, secret-safe operations within existing observability bounds | personas.md; IMP-036; VISION §3 |

`PERSONA != ROLE != PERMISSION != AUTHORIZATION`.

---

## 5. Current-state journeys

| Journey ID / evidence | Entry / preconditions | Activities today | Existing outcome / gap |
|---|---|---|---|
| `JOURNEY-CUSTOMER-AUTH-SESSION` / ADR-004, customer-auth | Guest or returning customer | Phone OTP sign-in; secure cookies in staging/prod; sign-out | Works; no customer MFA; session revocation UX limited |
| `JOURNEY-WORKFORCE-AUTH-MFA` / ADR-004, workforce-auth | Workforce identity | Email/password + TOTP MFA; session policy | Works; step-up beyond MFA not productized |
| `JOURNEY-LOCATION-MAPS` / IMP-036B | Delivery context | Anonymous Maps/Places still possible per accepted 036B history | Founder future supersession recorded for IMP-038; not implemented |
| `JOURNEY-CUSTOMER-PROFILE-DELETE` / profiles + OQ-005 | Authenticated customer | `deleteOwnCustomerProfile` | Domain delete exists; **not** legal erasure policy |
| `JOURNEY-ADMIN-AUDIT` / IMP-035/036G | Authorized admin | View access/mutation audits | Domain audits exist; no security-incident pack |
| `JOURNEY-PLATFORM-HARDENING` / next.config + CI | Deploy/build | Baseline headers; no CSP; no CVE/secret-scan CI | Partial |
| `JOURNEY-BACKUP-RETENTION` / IMP-037 | Recovery operators | 35-day backup retention product rule | Explicitly ≠ privacy/statutory retention (IMP-038) |

---

## 6. Desired-state journeys

| Journey ID | Entry / context | Ordered activities | Success / downstream | Alternate / recovery |
|---|---|---|---|---|
| `JOURNEY-SECURE-CUSTOMER-SESSION` | Customer uses Direct | Authenticate when required; session cookies secure; sign-out clears browser authority | Account usable without cross-realm leakage | Auth failures rate-limited; safe errors |
| `JOURNEY-AUTH-GATED-LOCATION` | Customer sets delivery location | Unsigned-in: Dehradun default only; signed-in: Maps/Places/geocode/saved address | Anonymous Google location I/O denied | Abuse/rate/quota paths per FD decisions |
| `JOURNEY-PRIVACY-REQUEST` | Customer or operator handles personal-data request | Follow Founder-decided V1 model (self-service vs operator-mediated) | Request disposition recorded without claiming legal compliance | Legal-hold / statutory conflict stops destructive path |
| `JOURNEY-RETENTION-DISPOSITION` | Operator/platform reviews data classes | Apply decided retention windows; backup vs statutory vs operational distinguished | Coherent disposition; no silent overwrite of FD immutability | Conflicts → HUMAN / LEGAL_REVIEW |
| `JOURNEY-SECURITY-HEADERS` | Any public/admin browser hit | CSP + security headers enforced on actual serving path (nginx/static) | Headers present; payment/maps embeds not broken beyond decided policy | Misconfig fails closed or documented exception |
| `JOURNEY-SUPPLY-CHAIN-SCAN` | Platform operator / CI | Secret + dependency scan; findings dispositioned | Clean or accepted findings with owner | Critical unresolved findings block IMP-040 handoff per FD |
| `JOURNEY-SECURITY-INCIDENT-VISIBILITY` | Suspected incident | Operator uses bounded evidence pack (logs/audits/correlation) | Actionable visibility without SIEM invention | Breach customer communication per FD (may be FOLLOW_UP) |
| `JOURNEY-PRIVILEGED-ADMIN` | High-consequence admin action | Existing RBAC + audits; optional step-up if Founder selects | Unauthorized denied; authorized audited | Cross-scope denial preserved |

---

## 7. Story map

| Business outcome | Persona | Journey | Activity | Story IDs | Slice classification |
|---|---|---|---|---|---|
| Launch-safe browser posture | PLATFORM-OPERATOR / CUSTOMER | `JOURNEY-SECURITY-HEADERS` | Enforce CSP/headers on serving path | US-IMP-038-001 | V1_ACCEPTANCE_SLICE |
| Auth-gated location I/O | CUSTOMER | `JOURNEY-AUTH-GATED-LOCATION` | Supersede anonymous Google location I/O | US-IMP-038-002 | V1_ACCEPTANCE_SLICE |
| Abuse-resistant location/auth | CUSTOMER / PLATFORM | `JOURNEY-AUTH-GATED-LOCATION` | Rate/quota/abuse assessment outcomes | US-IMP-038-003 | V1_ACCEPTANCE_SLICE |
| Honest profile vs erasure | CUSTOMER | `JOURNEY-PRIVACY-REQUEST` | Clarify/label profile delete vs erasure | US-IMP-038-004 | V1_ACCEPTANCE_SLICE (labeling); erasure mechanics depend on FD-038-01 |
| Retention class policy | PLATFORM / WORKFORCE | `JOURNEY-RETENTION-DISPOSITION` | Publish V1 retention matrix | US-IMP-038-005 | V1_ACCEPTANCE_SLICE (policy); automation may FOLLOW_UP |
| Secret & dependency scan | PLATFORM-OPERATOR | `JOURNEY-SUPPLY-CHAIN-SCAN` | Run + disposition scans | US-IMP-038-006 | V1_ACCEPTANCE_SLICE |
| Permission / bypass review | PLATFORM / WORKFORCE | `JOURNEY-PRIVILEGED-ADMIN` | Negative proof of production bypasses + permission review | US-IMP-038-007 | V1_ACCEPTANCE_SLICE |
| Incident evidence pack | PLATFORM-OPERATOR | `JOURNEY-SECURITY-INCIDENT-VISIBILITY` | Bounded security evidence pack | US-IMP-038-008 | V1_ACCEPTANCE_SLICE (internal); customer breach comms FD-038-03 |
| Secure session posture review | CUSTOMER / WORKFORCE | `JOURNEY-SECURE-CUSTOMER-SESSION` / MFA | Confirm/extend session revocation & flags | US-IMP-038-009 | FOLLOW_UP unless FD elevates |
| Secrets console UX | PLATFORM-OPERATOR | secrets adjacency | Operator secrets console | US-IMP-038-010 | DEFERRED / FOLLOW_UP (IMP-039 host-local secrets boundary) |
| Full DPDP self-service portal | CUSTOMER | privacy portal | Automated rights portal | US-IMP-038-011 | DEFERRED (LEGAL_REVIEW) |
| Marketing consent center | CUSTOMER | preferences | Marketing preference center | US-IMP-038-012 | DEFERRED / NOT_SUPPORTED if no marketing system in V1 |

---

## 8. Acceptance slice

| Slice | Mandatory story IDs | Mandatory AC IDs | Required Golden Journeys | Observable acceptance boundary |
|---|---|---|---|---|
| `V1_ACCEPTANCE_SLICE` | US-IMP-038-001…008 | AC-IMP-038-001-01…008-xx (see §10; final set after Founder FDs) | `GJ-FIRST-ORDER`, `GJ-ADDRESS-SERVICEABILITY`, `GJ-PERMITTED-OUTLET-ACCESS` (regression; none claim new commerce features) | Hardening outcomes enforced and proven; Maps anonymous I/O superseded if FD confirms V1; scans dispositioned; retention/erasure **policy** explicit |
| `FOLLOW_UP` | US-IMP-038-009, parts of 005 automation, 008 customer breach playbooks | TBD | — | After V1 or legal review |
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
UX states: N/A for pure header enforcement except failure visibility to operators
Permission / resource context: N/A (platform config); must not invent new roles
Error / recovery: Misconfiguration fails closed or documented accepted exception per FD-038-05
Dependencies: FD-038-05; must not disable for IMP-040 cutover
Explicit non-goals: WAF product; reinventing CDN; IMP-039 provisioning
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
As a PERSONA-PLATFORM-OPERATOR
I want auth/location abuse controls reviewed and gaps closed for launch
so that authentication alone is not treated as complete abuse protection (IMP-036B §6.1).
Journey: JOURNEY-AUTH-GATED-LOCATION
Acceptance scenarios: AC-IMP-038-003-01…02
Open material decisions: threshold specifics may be Fit-time once product bar set
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-004
As a PERSONA-CUSTOMER
I want profile delete and any privacy erasure action labeled and behaved according to Founder policy
so that I am not misled that domain profile delete equals legal erasure (OQ-005).
Journey: JOURNEY-PRIVACY-REQUEST
Acceptance scenarios: AC-IMP-038-004-01…03
Open material decisions: FD-038-01, FD-038-04
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
Open material decisions: FD-038-02
LEGAL_REVIEW_REQUIRED: YES
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-006
As a PERSONA-PLATFORM-OPERATOR
I want secret-scan and dependency-scan evidence with disposition
so that supply-chain launch risk is visible before IMP-040.
Journey: JOURNEY-SUPPLY-CHAIN-SCAN
Acceptance scenarios: AC-IMP-038-006-01…02
Open material decisions: FD-038-09 (launch thresholds)
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-007
As a PERSONA-PLATFORM-OPERATOR
I want production-bypass rejection and permission-review evidence refreshed for launch
so that deny-by-default authorization and fail-closed production safeguards remain proven.
Journey: JOURNEY-PRIVILEGED-ADMIN
Acceptance scenarios: AC-IMP-038-007-01…02
Open material decisions: NONE for existing ADR-005 catalogue review scope
Readiness: NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-008
As a PERSONA-PLATFORM-OPERATOR
I want a bounded security/privacy incident evidence pack
so that operators can investigate without inventing SIEM or claiming breach-law compliance.
Journey: JOURNEY-SECURITY-INCIDENT-VISIBILITY
Acceptance scenarios: AC-IMP-038-008-01…02
Open material decisions: FD-038-03
LEGAL_REVIEW_REQUIRED: YES for customer-facing breach communication
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
Full automated privacy-rights portal — DEFERRED; LEGAL_REVIEW_REQUIRED; do not invent DPDP obligations.
```

```text
Story ID: US-IMP-038-012
Marketing consent center — DEFERRED / possibly NOT_SUPPORTED_BY_DESIGN if no V1 marketing system.
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
AC-IMP-038-003-01 — Location/auth rate limits still deny abuse bursts
Story: US-IMP-038-003
Given repeated location or auth attempts exceeding limits
When threshold crossed
Then requests fail closed with safe errors
Mandatory: YES
```

```text
AC-IMP-038-003-02 — Review record lists residual abuse gaps disposition
Story: US-IMP-038-003
Given V1 abuse assessment
When IMP-038 acceptance evidence assembled
Then residual gaps are EXPLICITLY_DEFERRED or remediated (no silent blanks)
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
When scan completes
Then findings are remediated or explicitly accepted with owner
Mandatory: YES
```

```text
AC-IMP-038-006-02 — Dependency vulnerability scan executed with disposition
Story: US-IMP-038-006
Given dependency scan
When high/critical findings exist
Then disposition meets FD-038-09 launch threshold
Mandatory: YES (after FD-038-09)
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
AC-IMP-038-007-02 — Cross-scope admin action denied
Story: US-IMP-038-007
Given workforce principal without scope
When privileged admin action attempted cross-scope
Then denied; audit retained where applicable
Mandatory: YES
```

```text
AC-IMP-038-008-01 — Operator can assemble bounded incident evidence pack
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

| Story / AC ID | Required behaviour / risk | Applicable test layers | Planned proof | Actual evidence |
|---|---|---|---|---|
| US-IMP-038-001 / AC-001-* | Headers/CSP | HTTP integration + config | nginx/static header assertions | Planned only |
| US-IMP-038-002 / AC-002-* | Maps auth gate | Unit + HTTP + browser | Deny anonymous I/O; allow authed | Planned only |
| US-IMP-038-003 / AC-003-* | Abuse limits | Unit + HTTP | Rate-limit negatives | Planned only |
| US-IMP-038-004 / AC-004-* | Privacy labeling/erasure | Unit + HTTP + UX | FD-dependent | Planned only |
| US-IMP-038-005 / AC-005-* | Retention matrix | Doc + selective tests | Policy artifact + FD immutability | Planned only |
| US-IMP-038-006 / AC-006-* | Scans | CI/scripts | Scan outputs + disposition | Planned only |
| US-IMP-038-007 / AC-007-* | Bypass/RBAC | Existing security smoke + access tests | Extend as needed | Planned only |
| US-IMP-038-008 / AC-008-* | Incident pack | Runbook + redaction tests | Pack procedure | Planned only |

---

## 11. Business rules

| Rule ID | User/business rule | Authority / rationale | Story / AC IDs |
|---|---|---|---|
| BR-IMP-038-001 | Security headers/CSP on the real serving path; cutover must not disable | ARCH §12; IMP-040 dependency | US-001 |
| BR-IMP-038-002 | Anonymous Google location I/O = NO; Dehradun default when signed out | IMP-036B §6.1 Founder future requirement | US-002 |
| BR-IMP-038-003 | Customer realm ≠ workforce realm; no caller-manufactured authority | ADR-004; ARCH §§6–7 | US-007/009 |
| BR-IMP-038-004 | Deny by default; scope server-derived | ADR-005 | US-007 |
| BR-IMP-038-005 | Backup retention ≠ statutory/customer/audit retention | IMP-037 FD-037-03 | US-005 |
| BR-IMP-038-006 | Issued Financial Documents remain immutable statutory authority | D-365–D-367 | US-005 |
| BR-IMP-038-007 | No secrets in client bundles without allowlist + review; no secret logging | ARCH §12; ADR-015 | US-006 |
| BR-IMP-038-008 | Profile delete meaning must match Founder privacy decision; no silent legal claim | OQ-005; FD-038-01 | US-004 |
| BR-IMP-038-009 | IMP-038 acceptance blocked until IMP-037 formally accepted/reconciled | CONTINUATION_EXCEPTION + contiguity | lifecycle |
| BR-IMP-038-010 | This PD asserts **no** DPDP/PCI/GST compliance | Legal safety | all |

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

### JOURNEY-SECURITY-HEADERS

| Journey dimension | Behaviour / N/A | Refs |
|---|---|---|
| ENTRY | Any document load | US-001 |
| DISCOVERY | N/A — not a user-discovered feature | — |
| CONTEXT | Public vs admin paths | AC-001-01/02 |
| EMPTY / FIRST USE | N/A | — |
| HAPPY PATH | Headers present | AC-001-01 |
| ALTERNATE VALID PATHS | Accepted embed exceptions only if FD lists them | FD-038-05 |
| VALIDATION FAILURE | N/A browser-side | — |
| AUTHORIZATION | N/A | — |
| NOT FOUND / STALE | N/A | — |
| SERVER / NETWORK ERROR | N/A | — |
| RECOVERY | Config rollback | US-001 |
| CONCURRENCY | N/A | — |
| DESTRUCTIVE ACTION | N/A | — |
| SUCCESS FEEDBACK | Operator verification evidence | US-001 |
| DOWNSTREAM EFFECT | Payment/maps embeds must still work per FD | US-001 |
| REVISIT / RELOAD | Headers stable | US-001 |
| RESPONSIVE / MOBILE | Same headers | US-001 |
| ACCESSIBILITY | Must not break a11y via CSP blocking needed assets without alternative | US-001 |

### JOURNEY-PRIVACY-REQUEST

| Journey dimension | Behaviour / N/A | Refs |
|---|---|---|
| ENTRY | Customer or operator enters privacy request path (FD defines channel) | US-004 |
| DISCOVERY | If self-service exists, discoverable; else operator-mediated only | FD-038-04 |
| CONTEXT | Subject identity server-derived | US-004 |
| EMPTY / FIRST USE | First request state | US-004 |
| HAPPY PATH | Request accepted/dispositioned per FD | AC-004-01 |
| ALTERNATE VALID PATHS | Operator-mediated vs self-service | FD-038-01/04 |
| VALIDATION FAILURE | Malformed request rejected safely | US-004 |
| AUTHORIZATION | Cross-subject denied | AC-004-02 |
| NOT FOUND / STALE | Unknown subject → non-enumerating response | US-004 |
| SERVER / NETWORK ERROR | Safe retry | US-004 |
| RECOVERY | Resume pending request | US-004 |
| CONCURRENCY | No double-delete corruption; statutory hold wins when required | AC-004-03 |
| DESTRUCTIVE ACTION | Explicit confirmation; hold checks | AC-004-03 |
| SUCCESS FEEDBACK | Accurate labeling (not false “erased from law”) | AC-004-01 |
| DOWNSTREAM EFFECT | Audits/FDs preserved | US-005 |
| REVISIT / RELOAD | Status visible if productized | US-004 |
| RESPONSIVE / MOBILE | If UI exists | US-004 |
| ACCESSIBILITY | If UI exists | US-004 |

### JOURNEY-SUPPLY-CHAIN-SCAN / INCIDENT / RETENTION

Remaining dimensions: operator-runbook journeys — ENTRY through SUCCESS FEEDBACK covered by US-005/006/008; DISCOVERY/UX/mobile/a11y = N/A unless UI added; CONCURRENCY/DESTRUCTIVE as applicable to deletion only (US-004/005).

---

## 13. UX state matrix

| Surface / state | Entry condition | Visible feedback / actions | Focus / keyboard | Next / recovery | AC / N/A |
|---|---|---|---|---|---|
| Location tools signed-out | Guest | Default Dehradun; CTA to sign in to change location | Focus on sign-in CTA | Auth then location | AC-002-* |
| Location tools signed-in | Authed | Maps/Places available per policy | Existing patterns | Serviceability | AC-002-03 |
| Profile delete | Authed | Copy matches FD-038-01 (not overclaiming erasure) | Confirm control | Success/error | AC-004-01 |
| Privacy request (if V1 UI) | Per FD-038-04 | Status / denied / hold | Confirm destructive | Recovery | FD-dependent |
| Headers | N/A user UI | Operator evidence only | N/A | N/A | US-001 |
| Incident pack | Operator | Runbook checklist; redacted exports | N/A | Escalate | US-008 |

---

## 14. Permissions / resource context

| Action | Existing identity / permission authority | Resource context | Allowed / denied / cross-scope | AC IDs |
|---|---|---|---|---|
| Admin audit view | Existing admin audit permissions (IMP-035/036G) | Server membership scope | Cross-scope denied | AC-007-02 |
| Customer profile delete | Customer session subject | Own profile only | Other subject denied | AC-004-02 |
| Location Google I/O | Customer session | Authed customer | Anonymous denied | AC-002-* |
| Privacy erasure (if any) | FD-038-01 may require new permission — **must not invent** until decided | TBD | STOP if undefined | FD-038-01 |
| Scan execution | Platform operator process / CI | Repo/CI | N/A RBAC UI | US-006 |

Do not invent roles. If FD-038-01 requires new permission keys, Architecture Fit must follow Gate PASS.

---

## 15. Data implications

PII/classes present today (inventory, not legal classification): customer phone/profile/addresses;
workforce credentials/MFA; session IP/UA; orders/payments/refunds; financial documents / GSTIN /
signed artifacts; audits; backups (IMP-037); logs/observability.

IMP-038 may define retention/erasure **product policy** and labels. It must not:

- rewrite Financial Document immutability;
- redefine IMP-037 backup retention as privacy compliance;
- claim card PAN storage (not present);
- invent DPDP lawful bases.

Persistence mechanism selection = Architecture Fit (not this draft).

---

## 16. Security/privacy

Trust boundaries: customer-auth / workforce-auth / customer-commerce / operations façade remain
separate. Positive ACs: headers, auth-gated Maps, deny anonymous I/O, fail-closed bypasses,
scan dispositions. Negative ACs: cross-realm authority manufacture; secret leakage in logs/UI;
disabling hardening at cutover.

`LEGAL_REVIEW_REQUIRED` topics: erasure/retention; breach customer communication; any claim of
regulatory compliance (forbidden unless later canonicalized).

Claims made: **NONE** regarding DPDP/PCI/GST compliance.

---

## 17. Concurrency/recovery

Reuse existing address/profile/revision concurrency. Privacy destructive actions must not
last-write-win against statutory holds (AC-004-03). Scan/header work is config/CI — crash/recovery
N/A beyond fail-closed config. No new payment idempotency invented.

---

## 18. Accessibility/responsive expectations

Customer location gating and any privacy UI must work on mobile/desktop ordering surfaces with
accessible denial/success messaging. Header-only changes: verify CSP does not break required
accessible assets. Operator runbooks: N/A a11y beyond existing admin console patterns.

---

## 19. Observability/supportability

Reuse IMP-036 observability + domain audits. Incident pack defines which fields are exportable and
redaction rules. Do not invent SIEM. Privacy boundaries on logs remain ARCH §12.

---

## 20. Golden Journeys affected

| GJ ID / registry status | Affected steps | Mandatory for this acceptance? | Related story / AC | Required proof |
|---|---|---|---|---|
| `GJ-FIRST-ORDER` / CURRENT | Auth + address steps must still complete under gating | YES (regression) | US-002 | Browser path still completes for authed customer |
| `GJ-ADDRESS-SERVICEABILITY` / CURRENT | Location change gating | YES (regression) | US-002 | Serviceability truth unchanged |
| `GJ-PERMITTED-OUTLET-ACCESS` / CURRENT | Admin authz unchanged | YES (negative regression) | US-007 | Cross-scope still denied |
| `GJ-PAYMENT-RECOVERY` / CURRENT | Must not break Razorpay embeds via CSP | YES if CSP touches checkout | US-001 | Payment path still works |
| Others | No intentional change | NO | — | — |

Journey Gap Audit remains IMP-040 requirement — not performed here.

---

## 21. Dependencies

| Dependency | Authority / verified state | Required before | Unresolved impact |
|---|---|---|---|
| IMP-037 formal acceptance + reconciliation | IMPLEMENTATION_IN_PROGRESS; provider-blocked | **IMP-038 COMPLETE_AND_ACCEPTED** | `IMP038_ACCEPTANCE_BLOCKED_BY_IMP037` |
| Controlled continuation activation | PR#179/5771367844; GTM-R138/STATE-R136 | This draft exists | NONE for drafting |
| Founder FDs FD-038-01…09 | Unresolved | Product Definition Gate PASS | STOP Gate if material unresolved |
| Legal review (erasure/retention/breach) | Not performed | Stories US-004/005/008 | LEGAL_REVIEW_REQUIRED |
| Architecture Fit / lock | NOT_PERFORMED | Implementation authorization | STOP |
| IMP-039 infra | PLANNED not activated | Not required for IMP-038 V1 app hardening | Boundary only |
| IMP-040 cutover | PRE-GATE draft | Requires IMP-038 accepted later | Soft planning dependency |

---

## 22. Supported now

| Behaviour | Existing verified or V1 commitment? | Refs |
|---|---|---|
| Dual-realm auth, MFA (workforce), OTP (customer) | Existing verified | ADR-004 |
| Scoped RBAC deny-by-default | Existing verified | ADR-005 |
| Origin checks + auth/location rate limits | Existing verified | auth HTTP origin/rate-limit |
| Domain mutation audits + FD immutability | Existing verified | schemas + D-365+ |
| Config boundary / placeholder secret rejection | Existing verified | ADR-015; audits |
| Baseline nosniff/Referrer-Policy/XFO/HSTS/Permissions-Policy | Existing partial | next.config.ts |
| Maps auth-gate + CSP + scan dispositions + retention matrix + incident pack | V1 commitment **proposed** (not accepted) | this PD |

---

## 23. Explicitly deferred

| Behaviour | FOLLOW_UP or DEFERRED | Reason | Revisit |
|---|---|---|---|
| Full DPDP automated portal | DEFERRED | Legal + product undecided | Legal review + Founder |
| Secrets console UX | DEFERRED | IMP-039 host-local secrets adjacency | IMP-039 / later |
| Marketing consent center | DEFERRED | No V1 marketing system evidenced | Product |
| Customer MFA / WebAuthn | DEFERRED | Not in CURRENT deferral-to-038 evidence as mandatory | Future |
| SIEM / WORM log product | DEFERRED | Out of V1 pack | Future |
| Customer breach SMS/email factory | FOLLOW_UP or DEFERRED | FD-038-03 | Legal + Founder |
| Automated retention job engine | FOLLOW_UP | Policy first | After FD-038-02 |

---

## 24. Not supported by design

| Behaviour | Reason / authority | Boundary |
|---|---|---|
| Claiming DPDP/PCI/GST compliance in this IMP | Legal safety; no canonical claim | BR-IMP-038-010 |
| Absorbing Droplet/provisioning/release pipeline | IMP-039 | Scope boundary |
| Public launch GO / DNS / Journey Gap Audit execution | IMP-040 | Scope boundary |
| Redefining IMP-037 backup retention as privacy law | FD-037-03 | BR-IMP-038-005 |
| Inventing new roles to “solve” privacy | ADR-005 / D-358/372/373 | Authz section |
| Reopening IMP-026→IMP-028 continuation as authority | ROADMAP CLOSED | Continuation markers |

---

## 25. Unresolved / decision required

| DECISION_ID | QUESTION | WHY IT MATTERS | AFFECTED | OPTIONS SUPPORTED BY CURRENT ARCHITECTURE | RECOMMENDED DEFAULT (evidence-backed only) | WHAT REMAINS HUMAN AUTHORITY |
|---|---|---|---|---|---|---|
| FD-038-01 | What is V1 customer privacy request / erasure model? | OQ-005; profile delete ≠ erasure | US-004; JOURNEY-PRIVACY-REQUEST | (A) Label-only clarify profile delete; (B) operator-mediated erasure runbook; (C) limited self-service erasure with statutory holds | **None strong enough** without legal review | Founder + LEGAL_REVIEW |
| FD-038-02 | Retention windows by data class (customer PII, workforce, logs/audits, location, financial/statutory)? | Conflicts with backup vs statutory | US-005 | Matrix with “retain / delete / anonymize / legal-hold” per class; must preserve FD immutability | Backup 35-day already decided for **backups only** (IMP-037) — do not extend by assumption | Founder + LEGAL_REVIEW |
| FD-038-03 | Breach/security incident customer & operator communication for V1? | IMP-040 references IMP-038 pack | US-008 | (A) Internal pack only; (B) internal + Founder-approved customer template; (C) defer customer notice procedure | Internal pack in V1 is evidenced need; customer notice **not** assumed | Founder + LEGAL_REVIEW |
| FD-038-04 | Any customer privacy self-service in V1? | Scope of UX | US-004/011 | Yes limited / No operator-only | Prefer operator-only until FD-038-01 | Founder |
| FD-038-05 | CSP/security-header policy (strictness; Razorpay/Maps/admin exceptions)? | Static export path; payment embeds | US-001 | Enforce via nginx/static; exception allowlist for known payment/maps origins | Enforce CSP with explicit payment/maps allowlist (tests already mention Razorpay CSP origins) | Founder confirms strictness |
| FD-038-06 | Privileged-session / step-up beyond existing workforce MFA for V1? | Admin high-consequence | US-009 | Keep MFA-only / add step-up for selected actions | Keep MFA-only for V1 unless Founder elevates | Founder |
| FD-038-07 | Marketing/communication consent preferences in V1? | Privacy UX sprawl | US-012 | Defer / out of design if no marketing system | **DEFER** (no marketing system evidenced) | Founder confirm defer |
| FD-038-08 | Location-data retention after Maps gating? | Location PII | US-002/005 | Reuse address retention; shorter ephemeral telemetry; etc. | No default without FD-038-02 | Founder |
| FD-038-09 | Security launch thresholds (scan severities; residual risk acceptance) for IMP-040 handoff? | Blocks GO inputs | US-006 | Document severity gates | Require disposition of critical secrets; dependency criticals dispositioned before claiming IMP-038 complete | Founder |

`PRODUCT_DEFINITION_GATE` must **STOP** while these material decisions remain unresolved (or Founder explicitly defers each with coherent V1 boundary).

---

## 26. Definition of Ready

| Story ID | Fields complete? | Open material decisions | Readiness |
|---|---|---|---|
| US-IMP-038-001 | Draft complete | FD-038-05 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-002 | Draft complete | Confirm V1 (evidenced); FD-038-08 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-003 | Draft complete | Threshold detail at Fit | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-004 | Draft complete | FD-038-01, FD-038-04 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-005 | Draft complete | FD-038-02 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-006 | Draft complete | FD-038-09 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-007 | Draft complete | NONE material | NOT_READY_FOR_IMPLEMENTATION (Gate/Fit still required) |
| US-IMP-038-008 | Draft complete | FD-038-03 | NOT_READY_FOR_IMPLEMENTATION |
| US-IMP-038-009…012 | Deferred/follow-up | as listed | NOT_READY / DEFERRED |

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
Business Outcome: defined (draft)
Primary Personas: PERSONA-CUSTOMER, PERSONA-WORKFORCE-OPERATOR, PERSONA-PLATFORM-OPERATOR
Journeys Defined: YES (draft)
Story Map Complete: YES (draft)
Acceptance Slice Defined: YES (draft; FD-dependent)
Happy Paths Defined: YES (draft)
Alternate Paths Defined: YES (draft)
Empty / First-Use States Defined: YES where applicable
Error / Recovery Paths Defined: YES (draft)
Authorization Variants Defined: YES (draft; no invented roles)
Cross-Scope Scenarios Defined: YES
Concurrency Considered: YES
Destructive Actions Defined: YES (privacy)
UX State Matrix Complete: YES (draft)
Accessibility Considered: YES (draft)
Golden Journeys Identified: YES
Explicit Deferrals Recorded: YES
Unresolved Product Decisions: 9 (FD-038-01…09) — material
Architecture Conflicts: NONE identified vs ARCH-R20 (Fit NOT_PERFORMED)
PRODUCT_DEFINITION_GATE_EXECUTION: NOT_PERFORMED
Gate Result: NOT_PERFORMED
```

---

## Architecture-fit inputs (non-binding; Fit NOT_PERFORMED)

- Serving-path header/CSP enforcement under static export + nginx (and any workforce document path).
- Customer-commerce / location provider call gating for anonymous vs authenticated.
- Scan tooling choice in CI (mechanism TBD at Fit; requirement is dispositioned evidence).
- No new deployable service assumed; no IMP-039 host provisioning; no D-375/ARCH-R21 assumed.
- Permission changes only if FD-038-01 requires — otherwise reuse catalogue.

---

## Test / evidence expectations (TEST-1)

Map each mandatory AC to meaningful layers after Gate PASS. Prefer negative security evidence
(deny anonymous Maps; deny cross-scope; reject bypass; CSP blocks). No silent-retry proof.
Founder UAT recommended on exact candidate for customer-visible gating + any privacy UX.

---

## Founder UAT applicability recommendation

```text
FOUNDER_UAT_REQUIRED = YES
Reason: customer-visible location/auth gating and security/privacy launch posture;
        operator-visible incident/retention outcomes may need interactive validation.
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
- Activate IMP-039
- Accept IMP-037 or advance `acceptedThrough`
- Invent legal compliance claims
