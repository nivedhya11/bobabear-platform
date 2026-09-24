<!-- governance-meta
{
  "status": "APPROVED",
  "authority": "PRODUCT_DEFINITION",
  "capability": "IMP-038",
  "productDefinitionVersion": "PD-IMP-038-DRAFT-2",
  "process": "PD-1",
  "verificationPolicy": "TEST-1",
  "lastReviewed": "2026-09-22",
  "productDefinitionGateExecution": "PERFORMED",
  "productDefinitionGateResult": "PASS",
  "productDefinitionApprovalEvidence": "PR#180/5773885848",
  "architectureFitExecution": "PERFORMED",
  "architectureFit": "PASS",
  "architectureLocked": "YES",
  "implementationAuthorized": "YES",
  "implementationStarted": "YES",
  "impAccepted": "NO",
  "imp038Activated": "YES",
  "preGateDraft": "NO",
  "founderUatRequired": "YES",
  "founderUatStatus": "NOT_PERFORMED",
  "productDecisions": 21,
  "unresolvedProductDecisions": 0,
  "productDecisionsResolved": 21,
  "founderDecisionAuthority": "PR#180/5773472988",
  "founderDecisionPackage": "APPROVED",
  "legalReviewOpenTopics": 9,
  "v1AcceptanceStories": 20,
  "totalStories": 24,
  "acceptanceBlockedByImp037": "YES",
  "continuationException": "IMP037_PROVIDER_BLOCKED_TO_IMP038",
  "legalReviewRequired": "YES",
  "complianceClaims": "NONE"
}
-->

# IMP-038 — Security & Privacy Hardening

## Product Definition (APPROVED — Product Definition Gate PASS)

```text
Document status: APPROVED
PRODUCT_DEFINITION_VERSION: PD-IMP-038-DRAFT-2
PRE-GATE DRAFT: NO
CAPABILITY: IMP-038
TITLE: Security & Privacy Hardening
AUTHORITY: PRODUCT_DEFINITION
PROCESS: PD-1
VERIFICATION_POLICY: TEST-1

PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
PRODUCT_DEFINITION_APPROVAL_EVIDENCE: PR#180/5773885848
ARCHITECTURE_FIT_EXECUTION: PERFORMED
ARCHITECTURE_FIT: PASS
ARCHITECTURE_LOCKED: YES
IMP038_ACTIVATED: YES
IMPLEMENTATION_AUTHORIZED: YES
IMPLEMENTATION_STARTED: YES
IMP038_IMPLEMENTATION_AUTHORIZED: YES
IMP038_STARTED: YES
FOUNDER_IMP038_IMPLEMENTATION_AUTHORIZATION: CURSOR_SESSION_MANDATE
IMP038_IMPLEMENTATION_COMPLETE: YES
IMP038_ACCEPTED: NO
IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES
IMP038_HOLD: YES
IMP038_PRODUCT_DEFINITION: APPROVED
IMP038_PRODUCT_DEFINITION_VERSION: PD-IMP-038-DRAFT-2
IMP038_PRODUCT_DEFINITION_GATE: PASS
IMP038_ARCHITECTURE_FIT: PASS
IMP038_ARCHITECTURE_LOCKED: YES
INDEPENDENT_ARCHITECTURE_FIT_REVIEW: PASS
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_HEAD: 3b03164d6581c5a98a893c24e92eaddece004e90
INDEPENDENT_ARCHITECTURE_FIT_REVIEWED_TREE: 5bb499fa84a5bf02682b30518f2bf898ddb23540
INDEPENDENT_ARCHITECTURE_FIT_REVIEW_ID: 5279884548
CLOUDFLARE_ARCHITECTURE_LOCKED: YES
BINDING_DECISIONS: D-375 / ADR-017 / ARCH-R21 (Fit lock); D-374 / ADR-016 / ARCH-R20 (pilot base)
FOUNDER_UAT_REQUIRED: YES
FOUNDER_UAT_STATUS: NOT_PERFORMED

CONTINUATION_EXCEPTION: IMP037_PROVIDER_BLOCKED_TO_IMP038
CONTINUATION_EXCEPTION_AUTHORITY: PR#179/5771367844
HISTORICAL_IMP026_TO_IMP028_CONTINUATION: CLOSED
PROGRAM_PAUSE: PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED
PROGRAM_PAUSE_AUTHORITY: D-377
IMP037_ACCEPTED: NO
IMP037_IMPLEMENTATION_COMPLETE: NO
IMP037_EXTERNAL_RECOVERY_PROOF: NOT_PERFORMED
IMP037_HOLD: YES
PHASE1_BLOCK_STATUS: BLOCKED_PROVIDER_ACCESS

PRODUCT_DECISIONS: RESOLVED
PRODUCT_DECISION_COUNT: 21
UNRESOLVED_PRODUCT_DECISIONS: 0
FOUNDER_DECISION_PACKAGE: APPROVED
FOUNDER_DECISION_AUTHORITY: PR#180/5773472988
HISTORICAL_PROVENANCE: PD-IMP-038-DRAFT-1 (pre-decision candidate)
LEGAL_REVIEW_REQUIRED: YES
LEGAL_REVIEW_OPEN_TOPICS: 9
COMPLIANCE_CLAIMS: NONE
  — does NOT claim DPDP Act compliance
  — does NOT claim CERT-In compliance
  — does NOT claim PCI DSS compliance
  — does NOT claim OWASP ASVS certification
  — does NOT claim OWASP Top 10 / ASVS “certified” compliance

stories: 24
v1_acceptance_stories: 20
follow_up_or_deferred_stories: 4
acceptance_scenarios: see §10 (Founder decisions reconciled; final acceptance scenarios subject only to legal-review / Architecture-Fit dependencies where explicitly recorded)

Canonical anchors (verify against CURRENT ROADMAP/STATE):
  ROADMAP: GTM-R144
  STATE: STATE-R142
  ARCHITECTURE: ARCH-R21
  decision-register: DR-19
  PRODUCT-DELIVERY: PD-1
  TESTING: TEST-1
  VISION: VISION-1
  acceptedThrough: IMP-036G
  currentProductSlice: IMP-036H
  nextProductSlice: IMP-036I
  pendingAcceptance: NONE
  priorAuthorizeStartTip: GTM-R140 / STATE-R138
  PROGRAM_PAUSE: PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED (D-377)
```

This artifact is the **approved Product Definition** for IMP-038 after Product Definition Gate PASS
(`PD-IMP-038-DRAFT-2`; approval evidence PR#180/5773885848) and Architecture Fit PASS / architecture
LOCKED (D-375 / ADR-017 / ARCH-R21; independent Architecture Fit review PASS). It does **not**
authorize implementation, start implementation, perform Founder UAT, or accept the IMP. It incorporates Founder security/privacy discovery requirements as first-class Product
Definition scope (stories, ACs, business/security rules, evidence requirements, and deferrals).
Founder product decisions FD-038-01…21 are reconciled (authority PR#180/5773472988). It does **not**
claim DPDP, CERT-In, PCI DSS, GST, OWASP Top 10, or ASVS certification/compliance.

```text
PRODUCT_DEFINITION_GATE PASS
  !=
Architecture Fit PASS
  !=
implementation authorization / start / acceptance

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
| Product Definition version / document status | `PD-IMP-038-DRAFT-2` (advances `PD-IMP-038-DRAFT-1`); **Document status: APPROVED**; **PRE-GATE DRAFT: NO**; Founder decisions FD-038-01…21 reconciled per PR#180/5773472988; Product Definition Gate PASS (approval PR#180/5773885848) |
| Product owner / approval evidence | Founder/human controlled-continuation activation via PR#179 comment `5771367844` + instruction “proceed with next IMP”; Founder security/privacy requirements incorporated as binding discovery inputs; Founder decisions PR#180/5773472988; independent Product Definition Gate readiness review `5276033742` PASS; Product Definition Gate PASS authorized PR#180/5773885848 |
| Process / verification policy | PD-1 / TEST-1 |
| Canonical anchors | VISION-1; ROADMAP GTM-R151 (CURRENT tip; IMP-036I Product Definition DRAFT_READY_FOR_GATE under PROGRAM_PAUSE D-377); STATE STATE-R148; prior tip GTM-R149 / STATE-R147 IMP-036I Product Definition DRAFT_READY; prior tip GTM-R148 / STATE-R146 IMP-036I Product Definition activation; prior tip GTM-R147 / STATE-R145 IMP-036H COMPLETE_AND_ACCEPTED; prior tip GTM-R146 / STATE-R144 Implementation COMPLETE pending acceptance; prior tip GTM-R144 / STATE-R142 AUTHORIZED / NOT_STARTED; ARCH-R22; DR-20 (D-378; prior DR-19/18/17/16 retained); PD-1; TEST-1. Prior tip GTM-R143 / STATE-R141 IMP-036H Architecture Fit PASS + architecture lock; prior tip GTM-R142 / STATE-R140 IMP-036H Product Definition Gate PASS; prior tip GTM-R141 / STATE-R139 IMP-036H Product Definition activation; prior tip GTM-R140 / STATE-R138 IMP-038 AUTHORIZE + START. |
| Repository candidate | Gate-evaluated candidate lineage: canonical path `/home/ajoshi/repos/boba-bear-platform`; branch `governance/imp038-activation-product-definition`; **GATE_EVALUATED_HEAD** `2ade7b305d7a1c552b56a709dbf8723d356979bf`; **GATE_EVALUATED_TREE** `b8565bba474627ddf3974b329c7d6038ee1bf97c`; exact-head CI `35706440171` SUCCESS; gate-persistence commits after this Gate PASS are not the evaluated artifact |
| Capability lifecycle / authorization | ROADMAP/STATE: `IMP038_ACTIVATED: YES`; `IMP038_HOLD: YES`; formal lifecycle **IMPLEMENTATION_IN_PROGRESS (HOLD — IMPLEMENTATION_COMPLETE / NOT_ACCEPTED)**; PD = APPROVED (`PD-IMP-038-DRAFT-2`); Gate = PASS; Architecture Fit = PASS; Architecture Locked = YES; Independent Architecture Fit review = PASS; Implementation = AUTHORIZED / STARTED / COMPLETE (`GTM-R140` / `STATE-R138` authorize+start provenance; `FOUNDER_IMP038_IMPLEMENTATION_AUTHORIZATION: CURSOR_SESSION_MANDATE`; `IMP038_IMPLEMENTATION_COMPLETE: YES`); `IMP038_ACCEPTED: NO`; `IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES`; CURRENT tip `GTM-R150` / `STATE-R148` program pause (`currentProductSlice = IMP-036I`; `IMP036I_ACTIVATED: YES`); `acceptedThrough` = IMP-036H; `nextProductSlice` = IMP-037 |
| Relevant capability architecture / ADRs | Locked capability: [`../../capabilities/IMP-038-security-privacy-hardening.md`](../../capabilities/IMP-038-security-privacy-hardening.md) (D-375 / ADR-017 / ARCH-R21). Binding baselines: ARCH §§6–7,12; ADR-004; ADR-005; ADR-015 (amended by D-374 for host-local pilot secrets → IMP-039 boundary); IMP-036B §6.1 Maps supersession record; IMP-037 FD-037-03 retention distinction |
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
| `JOURNEY-PAYMENT-PCI-SCOPE` | Payment flows | Assess PAN/CVV touch; Razorpay integration type; shared responsibility | Scope matrix + evidence; BOBA_RAW_PAN/CVV_STORAGE = NO | LEGAL_REVIEW for PCI validation path; product lock RESOLVED |
| `JOURNEY-ASVS-VERIFICATION` | Security verification | Trace ASVS v5.0.0 Level 2 applicable controls → BOBA control → proof → PASS/GAP/N/A | Baseline measurable | OWASP_ASVS_TARGET = LEVEL_2_APPLICABLE_CONTROLS |
| `JOURNEY-AUTHORIZATION-NEGATIVE` | Cross-scope / BOLA / BFLA attempts | Customer/workforce/outlet/territory/org negatives | Unauthorized denied; evidence retained | Existing ADR-005 catalogue |
| `JOURNEY-EDGE-ORIGIN-DEFENSE` | Internet client | Intended edge security layer cannot be trivially bypassed to origin | Property proven or residual risk owned | Mechanism = Fit / IMP-039 |
| `JOURNEY-SECURE-SDLC` | CI / PR / release | SAST, SCA, secret, container, SBOM/provenance feasibility, pinning | Critical = ZERO unresolved; High exceptions time-bounded | UNRESOLVED_CRITICAL_AT_ACCEPTANCE = ZERO; High default ≤30d |
| `JOURNEY-VENDOR-REGISTER` | Material third parties + browser scripts | Register data/purpose/access/retention/incident/shared-responsibility/exit | Register complete for V1 providers | Update when Fit adds edge vendor |
| `JOURNEY-SECURITY-LOGGING` | Security-relevant events | Log with PII/secret minimization; retention per FD | Usable for incident/CERT-In readiness without secret leakage | Conflicts → HUMAN |
| `JOURNEY-RETENTION-DISPOSITION` | Operator/platform reviews data classes | Apply decided retention windows | Backup vs statutory vs operational distinguished | Conflicts → LEGAL_REVIEW |
| `JOURNEY-SECURITY-HEADERS` | Any public/admin browser hit | CSP + security headers on actual serving path | Headers present; embeds per FD | Misconfig fails closed / documented exception |
| `JOURNEY-SECURITY-INCIDENT-VISIBILITY` | Suspected incident | Bounded investigation pack + templates | Actionable visibility without inventing SIEM | EXTERNAL notice = LEGAL_TRIGGER_DEPENDENT |
| `JOURNEY-SECURITY-PRIVACY-ACCEPTANCE-PACK` | IMP-038 acceptance → IMP-040 handoff | Assemble durable Acceptance Pack index | IMP-040 can consume without re-deriving | Residual risk + Founder UAT evidence |
| `JOURNEY-PRIVILEGED-ADMIN` | High-consequence admin action | RBAC + audits + HIGH_CONSEQUENCE_ADMIN_STEP_UP = REQUIRED | Unauthorized denied; authorized audited | Cross-scope denial preserved |

---

## 7. Story map

| Business outcome | Persona | Journey | Activity | Story IDs | Slice classification |
|---|---|---|---|---|---|
| Launch-safe browser posture | PLATFORM / CUSTOMER | `JOURNEY-SECURITY-HEADERS` | Enforce CSP/headers on serving path | US-IMP-038-001 | V1_ACCEPTANCE_SLICE |
| Auth-gated location I/O | CUSTOMER | `JOURNEY-AUTH-GATED-LOCATION` | Supersede anonymous Google location I/O | US-IMP-038-002 | V1_ACCEPTANCE_SLICE |
| Customer auth/OTP abuse resistance | CUSTOMER / PLATFORM | `JOURNEY-CUSTOMER-AUTH-ABUSE` | Signup/login/OTP bot, brute-force, bombing, enumeration controls | US-IMP-038-003 | V1_ACCEPTANCE_SLICE |
| Honest profile vs erasure | CUSTOMER | `JOURNEY-PRIVACY-REQUEST` | Operator-mediated privacy requests; profile delete ≠ legal erasure | US-IMP-038-004 | V1_ACCEPTANCE_SLICE (OPERATOR_MEDIATED; FULL_SELF_SERVICE_PRIVACY_PORTAL_V1 = NO) |
| Retention class policy | PLATFORM / WORKFORCE | `JOURNEY-RETENTION-DISPOSITION` | Publish V1 retention matrix | US-IMP-038-005 | V1_ACCEPTANCE_SLICE (policy); automation may FOLLOW_UP |
| Secure SDLC / supply chain | PLATFORM | `JOURNEY-SECURE-SDLC` | SAST, SCA, secret, container, SBOM/provenance, pinning | US-IMP-038-006 | V1_ACCEPTANCE_SLICE |
| BOLA/BFLA + cross-scope negatives | PLATFORM / WORKFORCE / CUSTOMER | `JOURNEY-AUTHORIZATION-NEGATIVE` | Authorization-negative proof across boundaries | US-IMP-038-007 | V1_ACCEPTANCE_SLICE |
| Incident investigation pack | PLATFORM | `JOURNEY-SECURITY-INCIDENT-VISIBILITY` | Internal IR + prepared notification templates; external notice legal-trigger-dependent | US-IMP-038-008 | V1_ACCEPTANCE_SLICE (INTERNAL_INCIDENT_RESPONSE_V1 = REQUIRED) |
| Secure session posture review | CUSTOMER / WORKFORCE | `JOURNEY-SECURE-CUSTOMER-SESSION` | Broader session-revocation UX beyond step-up | US-IMP-038-009 | FOLLOW_UP (step-up locked into US-013 via FD-038-06 = REQUIRED) |
| Secrets console UX | PLATFORM | secrets adjacency | Operator secrets console | US-IMP-038-010 | DEFERRED (IMP-039 host-local secrets boundary) |
| Full automated DPDP portal | CUSTOMER | privacy portal | Automated rights portal | US-IMP-038-011 | DEFERRED_BY_FOUNDER (FULL_SELF_SERVICE_PRIVACY_PORTAL_V1 = NO); does **not** replace US-020 matrix |
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
| `V1_ACCEPTANCE_SLICE` | US-IMP-038-001…008, 013…024 | AC-IMP-038-001-01…024-xx (see §10; Founder FDs reconciled in DRAFT-2) | `GJ-FIRST-ORDER`, `GJ-ADDRESS-SERVICEABILITY`, `GJ-PERMITTED-OUTLET-ACCESS`, `GJ-PAYMENT-RECOVERY` (regression) | Hardening outcomes enforced and proven; regulatory matrices complete without compliance claims; Acceptance Pack ready for IMP-040 |
| `FOLLOW_UP` | US-IMP-038-009 (session UX beyond step-up); parts of US-005 automation; external breach notice execution (templates are V1) | TBD | — | After V1 or legal trigger |
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
Error / recovery: Misconfiguration fails closed or documented accepted exception (report-only tuning may precede final enforcement)
Dependencies: CSP_ENFORCED_ON_REAL_SERVING_PATH = YES; must not disable for IMP-040 cutover
Explicit non-goals: Locking a CDN/WAF vendor; reinventing CDN product; IMP-039 provisioning
Data implications: None beyond config
Security implications: Primary
Architecture fit / applicable invariants: ARCH §12; static frontend rule; exact header/CSP mechanism is Architecture Fit
Founder decision status: FD-038-05 = RESOLVED_WITH_ARCHITECTURE_FIT_MECHANISM
Open material decisions: NONE (product property locked; Fit selects mechanism)
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; Fit PASS/LOCKED; independent Architecture Fit review PASS)
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
Founder decision status: FD-038-08 = RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY (LOCATION_DATA_MINIMIZATION_REQUIRED = YES; RAW_LOCATION_TELEMETRY_RETENTION_BY_DEFAULT = NO)
Open material decisions: NONE for product policy; numeric retention windows = LEGAL_REVIEW_REQUIRED
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; legal retention windows remain acceptance dependency)
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
Founder decision status: FD-038-15 = RESOLVED; FD-038-21 = RESOLVED_WITH_ARCHITECTURE_FIT_MECHANISM
Locked policy:
  AUTH_ABUSE_RESPONSE = PROGRESSIVE_THROTTLE + TEMPORARY_COOLDOWN + RISK_BASED_CHALLENGE
  PERMANENT_ATTACKER_TRIGGERED_LOCKOUT = FORBIDDEN
  LAYERED_ABUSE_SIGNALS = IP + ACCOUNT_PRINCIPAL + PHONE_OTP_TARGET + SESSION_DEVICE_RISK_WHERE_JUSTIFIED
  NON_ENUMERATING_FAILURES = REQUIRED
  BOT_CHALLENGE_PRIORITY = CUSTOMER_SIGNUP_LOGIN_OTP_AND_WORKFORCE_AUTH
  ORDINARY_CHECKOUT_CHALLENGE_DEFAULT = NO
Requirements:
  - principal/phone/account-level throttles in addition to IP controls
  - safe/non-enumerating responses
  - server-side throttling remains authoritative; edge/bot challenge is defense-in-depth only
  - no permanent lockout design that lets attackers DoS legitimate accounts
  - password/reset/recovery abuse covered if/when those surfaces exist; else N/A with rationale
Open material decisions: NONE (challenge provider/mechanism remains Architecture Fit)
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; Fit PASS/LOCKED; independent Architecture Fit review PASS)
```

```text
Story ID: US-IMP-038-004
As a PERSONA-CUSTOMER
I want profile delete and any privacy erasure action labeled and behaved according to Founder policy
so that I am not misled that domain profile delete equals legal erasure (OQ-005).
Journey: JOURNEY-PRIVACY-REQUEST
Acceptance scenarios: AC-IMP-038-004-01…03
Founder decision status: FD-038-01/04/10 = RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY
Locked policy:
  V1_PRIVACY_REQUEST_MODEL = OPERATOR_MEDIATED
  FULL_SELF_SERVICE_PRIVACY_PORTAL_V1 = NO
  PROFILE_DELETE_EQUALS_LEGAL_ERASURE = NO
  DPDP_APPLICABILITY_CONTROL_MATRIX = MANDATORY
LEGAL_REVIEW_REQUIRED: YES (applicability + any launch-blocking user-facing rights controls)
Open material decisions: NONE for product model; legal applicability may still block launch semantics
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; legal applicability/rights controls remain acceptance dependency)
```

```text
Story ID: US-IMP-038-005
As a PERSONA-PLATFORM-OPERATOR
I want an explicit V1 retention matrix by data class
so that backup retention (IMP-037) is not confused with statutory/customer/audit retention.
Journey: JOURNEY-RETENTION-DISPOSITION
Acceptance scenarios: AC-IMP-038-005-01…02
Founder decision status: FD-038-02/08/19 = RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY
Locked policy:
  DATA_CLASS_RETENTION_MATRIX_REQUIRED = YES
  LOCATION_DATA_MINIMIZATION_REQUIRED = YES
  RAW_LOCATION_TELEMETRY_RETENTION_BY_DEFAULT = NO
  SECURITY_LOG_SECRET_MINIMIZATION = REQUIRED
  SECURITY_LOG_PII_MINIMIZATION = REQUIRED
LEGAL_REVIEW_REQUIRED: YES (numeric statutory windows)
Open material decisions: NONE for product policy; statutory periods = LEGAL_REVIEW_REQUIRED
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; legal retention windows remain acceptance dependency)
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
Founder decision status: FD-038-09/17 = RESOLVED
Locked policy:
  UNRESOLVED_CRITICAL_AT_ACCEPTANCE = ZERO
  KNOWN_EXPLOITABLE_HIGH = NO_SILENT_ACCEPTANCE (Founder R3 + compensating controls + expiry)
  HIGH_RISK_EXCEPTION_DEFAULT_MAX_DAYS = 30 (unless Founder overrides)
Explicit non-goals: Inventing arbitrary remediation SLA numbers beyond the locked exception policy
Open material decisions: NONE
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; Fit PASS/LOCKED; independent Architecture Fit review PASS)
```

```text
Story ID: US-IMP-038-007
As a PERSONA-PLATFORM-OPERATOR
I want production-bypass rejection plus BOLA/BFLA and cross-scope authorization-negative proof
across customer, workforce, outlet, territory, and org boundaries
so that deny-by-default authorization remains proven for launch.
Journey: JOURNEY-AUTHORIZATION-NEGATIVE / JOURNEY-PRIVILEGED-ADMIN
Acceptance scenarios: AC-IMP-038-007-01…04
Open material decisions: NONE for existing ADR-005 catalogue review scope (privacy remains operator-mediated; no new self-service permission invented)
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; Fit PASS/LOCKED; independent Architecture Fit review PASS)
```

```text
Story ID: US-IMP-038-008
As a PERSONA-PLATFORM-OPERATOR
I want a bounded security/privacy incident investigation evidence pack
so that operators can investigate without inventing SIEM or claiming breach-law compliance.
Journey: JOURNEY-SECURITY-INCIDENT-VISIBILITY
Acceptance scenarios: AC-IMP-038-008-01…02
Founder decision status: FD-038-03 = RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY
Locked policy:
  INTERNAL_INCIDENT_RESPONSE_V1 = REQUIRED
  REGULATOR_CUSTOMER_NOTIFICATION_TEMPLATES = PREPARED
  ACTUAL_EXTERNAL_NOTIFICATION = LEGAL_TRIGGER_DEPENDENT
  TIME_SYNC_READINESS = REQUIRED
  EVIDENCE_PRESERVATION = REQUIRED
  SECURITY_LOGGING = REQUIRED
  INCIDENT_OWNER_CONTACT = REQUIRED
LEGAL_REVIEW_REQUIRED: YES for external notification triggers/applicability (does not reopen product locks)
Note: This is NOT the Security & Privacy Acceptance Pack (see US-IMP-038-024). No CERT-In compliance claim.
Open material decisions: NONE for product readiness model
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; legal trigger review remains acceptance dependency)
```

```text
Story ID: US-IMP-038-009
As a PERSONA-WORKFORCE-OPERATOR / CUSTOMER
I want clearer session revocation / privileged-session UX beyond the locked step-up requirement
so that high-consequence sessions match agreed policy.
Slice: FOLLOW_UP (FD-038-06 step-up is REQUIRED and owned by US-013; broader session-revocation UX remains FOLLOW_UP)
Founder decision status: FD-038-06 = RESOLVED (HIGH_CONSEQUENCE_ADMIN_STEP_UP = REQUIRED → US-013)
Open material decisions: NONE for V1 step-up; broader session UX deferred
Readiness: FOLLOW_UP / NOT_READY_FOR_IMPLEMENTATION
```

```text
Story ID: US-IMP-038-010
Secrets console UX — DEFERRED (host-local pilot secrets / IMP-039 adjacency; ADR-015→D-374).
```

```text
Story ID: US-IMP-038-011
Full automated privacy-rights portal — DEFERRED_BY_FOUNDER (FULL_SELF_SERVICE_PRIVACY_PORTAL_V1 = NO).
Does NOT remove the V1 mandatory DPDP applicability/control/evidence matrix (US-IMP-038-020).
If legal review requires a specific user-facing rights control for launch, that control is V1 launch-blocking without converting this portal deferral into a full self-service portal by assumption.
```

```text
Story ID: US-IMP-038-012
Marketing consent center — DEFERRED_BY_FOUNDER (MARKETING_CONSENT_CENTER_V1 = DEFERRED).
Reopen when first-party marketing automation/profiling is introduced.
Deferral does not waive legally required consent/notice for existing processing.
```

```text
Story ID: US-IMP-038-013
As a PERSONA-PLATFORM-OPERATOR / PERSONA-WORKFORCE-OPERATOR
I want workforce login and MFA protected against brute force, credential stuffing, MFA abuse/bypass,
distributed attempts, and account enumeration
so that workforce ATO risk is explicitly threat-modeled and accepted separately from customer auth.
Journey: JOURNEY-WORKFORCE-AUTH-ABUSE
Acceptance scenarios: AC-IMP-038-013-01…05
Business rules: BR-IMP-038-011, BR-IMP-038-012, BR-IMP-038-013
Founder decision status: FD-038-06 = RESOLVED; FD-038-15 = RESOLVED; FD-038-21 = RESOLVED_WITH_ARCHITECTURE_FIT_MECHANISM
Locked policy:
  HIGH_CONSEQUENCE_ADMIN_STEP_UP = REQUIRED
  AUTH_ABUSE_RESPONSE = PROGRESSIVE_THROTTLE + TEMPORARY_COOLDOWN + RISK_BASED_CHALLENGE
  PERMANENT_ATTACKER_TRIGGERED_LOCKOUT = FORBIDDEN
  NON_ENUMERATING_FAILURES = REQUIRED
  BOT_CHALLENGE_PRIORITY includes WORKFORCE_AUTH
Requirements: server-side authoritative; edge challenge defense-in-depth only; no permanent
attacker-driven lockout DoS; safe/non-enumerating responses; principal/account + IP throttles;
step-up/re-auth for selected high-consequence workforce/admin actions.
Open material decisions: NONE (challenge/step-up mechanism details = Architecture Fit)
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; Fit PASS/LOCKED; independent Architecture Fit review PASS)
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
Founder decision status: FD-038-13/21 = RESOLVED_WITH_ARCHITECTURE_FIT_MECHANISM
Locked product properties:
  LAYERED_EDGE_SECURITY_REQUIRED = YES
  APPLICATION_SECURITY_REMAINS_AUTHORITATIVE = YES
  CLOUDFLARE_FREE = PREFERRED_LOW_TCO_ARCHITECTURE_FIT_CANDIDATE
  CLOUDFLARE_ARCHITECTURE_LOCKED = YES
  BOT_CHALLENGE_PRIORITY = CUSTOMER_SIGNUP_LOGIN_OTP_AND_WORKFORCE_AUTH
  ORDINARY_CHECKOUT_CHALLENGE_DEFAULT = NO
Architecture note: Cloudflare Free is the preferred low-TCO Architecture Fit candidate; Product
Definition does NOT lock Cloudflare. Free-tier limitations must be recorded; server-side defense
must remain if edge controls are bypassed or unavailable. Fit / IMP-039 selects mechanism.
Open material decisions: NONE for product properties; edge/challenge mechanism = Architecture Fit
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; Cloudflare Free locked; IMP-039 may still provision production edge)
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
Founder decision status: FD-038-09 = RESOLVED (residual High requires Founder R3 + expiry; Critical = ZERO)
Open material decisions: NONE
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; Fit PASS/LOCKED; independent Architecture Fit review PASS)
```

```text
Story ID: US-IMP-038-016
As a PERSONA-PLATFORM-OPERATOR
I want vulnerability management with ownership, severity, remediation/exception handling, retest,
and an expiring security exception register (owner, rationale, expiry, authority)
so that gaps cannot silently persist past launch handoff.
Journey: JOURNEY-SECURE-SDLC
Acceptance scenarios: AC-IMP-038-016-01…03
Founder decision status: FD-038-09/17/18 = RESOLVED
Locked policy:
  UNRESOLVED_CRITICAL_AT_ACCEPTANCE = ZERO
  KNOWN_EXPLOITABLE_HIGH = NO_SILENT_ACCEPTANCE
  High-risk exception requires Founder R3 risk acceptance, owner, rationale, compensating controls,
  retest requirement, and expiry (default maximum 30 days unless Founder overrides)
  INDEPENDENT_EXTERNAL_WEB_API_SECURITY_ASSESSMENT_BEFORE_IMP038_ACCEPTANCE = REQUIRED
  CRITICAL_HIGH_RETEST_AND_CLOSURE = REQUIRED
  CERT_IN_EMPANELLED_ASSESSOR = PREFERRED_WHERE_COMMERCIALLY_PRACTICAL (not a certification claim)
Open material decisions: NONE
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; external assessment remains acceptance evidence)
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
Founder decision status: FD-038-16 = RESOLVED
Locked policy:
  OWASP_ASVS_VERSION = 5.0.0
  OWASP_ASVS_TARGET = LEVEL_2_APPLICABLE_CONTROLS
  Evidence per applicable selected requirement: PASS | GAP | N/A_WITH_REASON
COMPLIANCE_CLAIMS: NONE (matrix ≠ ASVS certification)
Open material decisions: NONE (exact applicable-control selection is Fit/implementation evidence work)
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; Fit PASS/LOCKED; independent Architecture Fit review PASS)
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
Founder decision status: FD-038-11 = RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY
Locked engineering readiness:
  INTERNAL_INCIDENT_RESPONSE_V1 = REQUIRED
  TIME_SYNC_READINESS = REQUIRED
  EVIDENCE_PRESERVATION = REQUIRED
  SECURITY_LOGGING = REQUIRED
  INCIDENT_OWNER_CONTACT = REQUIRED
  REGULATOR_CUSTOMER_NOTIFICATION_TEMPLATES = PREPARED
  ACTUAL_EXTERNAL_NOTIFICATION = LEGAL_TRIGGER_DEPENDENT
LEGAL_REVIEW_REQUIRED: YES (CERT-In applicability / reporting triggers — does not reopen product locks)
COMPLIANCE_CLAIMS: NONE (does NOT claim CERT-In compliance)
Security-log design must minimize secrets/PII even when security retention is required (US-019).
Open material decisions: NONE for product readiness model
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; legal applicability remains acceptance dependency)
```

```text
Story ID: US-IMP-038-019
As a PERSONA-PLATFORM-OPERATOR
I want security logging and privacy-retention design that preserves investigative/CERT-In utility
while minimizing secrets and unnecessary PII
so that retention requirements do not become a second privacy failure mode.
Journey: JOURNEY-SECURITY-LOGGING
Acceptance scenarios: AC-IMP-038-019-01…02
Founder decision status: FD-038-19/02 = RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY
Locked policy:
  SECURITY_LOG_SECRET_MINIMIZATION = REQUIRED
  SECURITY_LOG_PII_MINIMIZATION = REQUIRED
  DATA_CLASS_RETENTION_MATRIX_REQUIRED = YES
LEGAL_REVIEW_REQUIRED: YES (numeric statutory/security-log retention windows)
Open material decisions: NONE for minimization policy; windows = LEGAL_REVIEW_REQUIRED
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; legal windows remain acceptance dependency)
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
Founder decision status: FD-038-01/04/10 = RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY; FD-038-20 = RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY
Locked policy:
  DPDP_APPLICABILITY_CONTROL_MATRIX = MANDATORY
  V1_PRIVACY_REQUEST_MODEL = OPERATOR_MEDIATED
  FULL_SELF_SERVICE_PRIVACY_PORTAL_V1 = NO
  PROFILE_DELETE_EQUALS_LEGAL_ERASURE = NO
  Child-data / age-gate / parental-consent applicability = LEGAL_REVIEW_REQUIRED;
  if legally required for BOBA V1 then AGE_OR_PARENTAL_CONTROL = LAUNCH_BLOCKING
LEGAL_REVIEW_REQUIRED: YES
COMPLIANCE_CLAIMS: NONE (does NOT claim DPDP compliance)
Matrix row shape (mandatory): requirement → current/future applicability → rationale →
product/process/technical control → evidence → owner → LEGAL_REVIEW marker
Open material decisions: NONE for product model; applicability interpretation = legal review
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; DPDP/child-data legal applicability remains acceptance dependency)
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
Founder decision status: FD-038-12 = RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY
Locked policy:
  BOBA_RAW_PAN_STORAGE = NO
  BOBA_RAW_CVV_STORAGE = NO
  BOBA_RAW_CARD_PROCESSING = NO_BY_DESIGN
  CARD_CAPTURE = RAZORPAY_OR_PROVIDER_CONTROLLED
  PAYMENT_SHARED_RESPONSIBILITY_MATRIX = MANDATORY
  PCI_VALIDATION_PATH = LEGAL_COMPLIANCE_REVIEW_REQUIRED
LEGAL_REVIEW_REQUIRED: YES for PCI merchant validation scope (does not reopen raw-card ban)
COMPLIANCE_CLAIMS: NONE (does NOT claim PCI DSS compliance)
Open material decisions: NONE for product card-handling model
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; PCI validation-path legal review remains acceptance dependency)
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
Founder decision status: FD-038-13 = RESOLVED_WITH_ARCHITECTURE_FIT_MECHANISM (Fit locked Cloudflare Free; CLOUDFLARE_ARCHITECTURE_LOCKED = YES)
Open material decisions: NONE for product policy; Fit may add/remove edge vendor rows after mechanism selection
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; Fit PASS/LOCKED; independent Architecture Fit review PASS)
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
Founder decision status: FD-038-14 = RESOLVED_WITH_ARCHITECTURE_FIT_MECHANISM
Locked product property: EDGE_TO_ORIGIN_BYPASS_RESISTANCE_REQUIRED = YES
Architecture note: Mechanism selection (origin firewall allowlist, authenticated origin, tunnel,
etc.) belongs to Architecture Fit / IMP-039 where infrastructure mutation is involved.
Application authorization/validation/throttling remains authoritative regardless.
Open material decisions: NONE for product property; mechanism = Architecture Fit / IMP-039
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; IMP-039 may still provision production realization)
```

```text
Story ID: US-IMP-038-024
As a PERSONA-PLATFORM-OPERATOR
I want a slice-wide Security & Privacy Acceptance Pack consumable by IMP-040
so that launch validation can rely on durable evidence rather than re-deriving IMP-038 posture.
Journey: JOURNEY-SECURITY-PRIVACY-ACCEPTANCE-PACK
Acceptance scenarios: AC-IMP-038-024-01…02
Pack index (minimum / mandatory):
  - asset/data inventory
  - data-flow map
  - threat model (incl. US-015 abuse matrix)
  - DPDP applicability/control matrix (US-020)
  - CERT-In applicability/control matrix (US-018)
  - PCI/payment-scope assessment (US-021)
  - ASVS L2 applicable-control matrix (US-017)
  - auth abuse evidence (US-003/013)
  - BOLA/BFLA evidence (US-007)
  - bot/API/business-abuse evidence (US-014/015)
  - edge/origin evidence (US-014/023)
  - CSP/header evidence (US-001)
  - secrets/crypto evidence
  - secure-SDLC evidence (US-006)
  - vendor/processor/script register (US-022)
  - retention/deletion matrix (US-005)
  - security logging/privacy matrix (US-019)
  - incident response + tabletop evidence (US-008 + US-018)
  - vulnerability/exception register (US-016)
  - independent security-assessment findings (FD-038-18)
  - Critical/High retest/closure
  - residual risks
  - Founder UAT evidence where applicable
Binding principles: NO CONTROL WITHOUT EVIDENCE; NO GAP WITHOUT OWNER;
NO EXCEPTION WITHOUT AUTHORITY; NO COMPLIANCE CLAIM WITHOUT APPLICABILITY / LEGAL REVIEW
Founder decision status: FD-038-09/17/18 = RESOLVED (Critical ZERO; High no silent acceptance; external assessment REQUIRED)
Open material decisions: NONE
IMP040_CONSUMABLE: YES (required)
Readiness: READY_FOR_IMPLEMENTATION (AUTHORIZED/STARTED; Acceptance Pack assembled from implementation evidence)
```

---

## 10. Acceptance scenarios

```text
AC-IMP-038-001-01 — Security headers present on public order surface
Story: US-IMP-038-001
Given the CURRENT static public site serving path
When a browser requests a customer ordering document
Then enforced security headers (incl. CSP with minimal explicit approved-integration allowlist) are present
And IMP-040 cutover planning must not disable them
Mandatory in acceptance slice: YES
```

```text
AC-IMP-038-001-02 — Headers present on workforce admin document path
Story: US-IMP-038-001
Given workforce admin static/document path
When loaded
Then decided headers apply without inventing a second auth system
Mandatory: YES
```

```text
AC-IMP-038-001-03 — Negative: disallowed embed/host blocked by CSP
Story: US-IMP-038-001
Given CSP policy
When a disallowed script origin is attempted
Then it is blocked (or explicitly accepted exception documented)
Mandatory: YES (FINAL_V1_CSP_ENFORCEMENT = REQUIRED; report-only tuning may precede enforcement)
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
Then abuse is progressively throttled / temporarily cooled down / risk-challenged; legitimate recovery path remains without permanent attacker-triggered lockout
Mandatory: YES
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
AC-IMP-038-004-01 — Profile delete copy does not claim legal erasure
Story: US-IMP-038-004
Given customer profile delete UI/API
When delete succeeds
Then user-visible meaning states PROFILE_DELETE_EQUALS_LEGAL_ERASURE = NO
And privacy rights requests use OPERATOR_MEDIATED process (no full self-service portal in V1)
And audit/history immutability rules are preserved where already authoritative
Mandatory: YES
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
Mandatory: YES (statutory holds per legal review; destructive path never silent)
```

```text
AC-IMP-038-005-01 — Retention matrix distinguishes backup vs statutory vs customer vs audit
Story: US-IMP-038-005
Given published V1 matrix
When compared to IMP-037 35-day backup retention
Then backup retention is not redefined as privacy law compliance
Mandatory: YES (DATA_CLASS_RETENTION_MATRIX_REQUIRED = YES)
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
Then disposition meets locked Critical=ZERO / High no-silent-acceptance / exception-with-expiry policy
Mandatory: YES
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
AC-IMP-038-008-02 — Notification templates prepared; external notice legal-trigger-dependent
Story: US-IMP-038-008
Given INTERNAL_INCIDENT_RESPONSE_V1 = REQUIRED and REGULATOR_CUSTOMER_NOTIFICATION_TEMPLATES = PREPARED
When a personal-data / security incident occurs
Then templates and escalation paths exist in V1
And ACTUAL_EXTERNAL_NOTIFICATION occurs only when LEGAL_TRIGGER_DEPENDENT review requires it
And no CERT-In / breach-law compliance claim is asserted from templates alone
Mandatory: YES
```

```text
AC-IMP-038-013-01 — Workforce login brute-force / stuffing throttled (IP + principal)
Story: US-IMP-038-013
Given repeated workforce login failures / stuffing patterns
When threshold crossed
Then fail-closed with safe errors; no permanent attacker-driven lockout DoS
Mandatory: YES
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
AC-IMP-038-013-05 — High-consequence admin step-up required
Story: US-IMP-038-013
Given HIGH_CONSEQUENCE_ADMIN_STEP_UP = REQUIRED
When a selected high-consequence workforce/admin action is attempted
Then step-up / re-authentication is required before the action succeeds
And ordinary MFA login alone is not treated as sufficient for those selected actions
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
AC-IMP-038-014-04 — Bot/human challenge prioritizes auth surfaces; checkout not default
Story: US-IMP-038-014
Given BOT_CHALLENGE_PRIORITY = CUSTOMER_SIGNUP_LOGIN_OTP_AND_WORKFORCE_AUTH
And ORDINARY_CHECKOUT_CHALLENGE_DEFAULT = NO
When challenge is applied
Then challenge provider/mechanism is Architecture Fit-selected (Turnstile-class allowed as candidate)
And ordinary checkout is not challenged by default unless risk signals or measured abuse justify it
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
Then owner, Founder R3 authority (for High), compensating controls, retest requirement, and expiry (default ≤30 days) exist
Mandatory: YES
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
AC-IMP-038-017-01 — ASVS v5.0.0 Level 2 applicable-control matrix exists with PASS/GAP/N/A
Story: US-IMP-038-017
Given OWASP_ASVS_VERSION = 5.0.0 and OWASP_ASVS_TARGET = LEVEL_2_APPLICABLE_CONTROLS
When verification matrix published
Then each applicable selected requirement maps to BOBA control → proof → PASS/GAP/N/A_WITH_REASON
And no ASVS certification or “OWASP Top 10 compliant” claim is made
Mandatory: YES
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
Given CERT-In readiness locks (IR/templates/time-sync/logging/PoC) / LEGAL_REVIEW_REQUIRED for applicability
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
Then secrets are absent; PII minimized per SECURITY_LOG_SECRET_MINIMIZATION and SECURITY_LOG_PII_MINIMIZATION
Mandatory: YES
```

```text
AC-IMP-038-019-02 — Security-log retention coherent with privacy retention matrix
Story: US-IMP-038-019
Given DATA_CLASS_RETENTION_MATRIX_REQUIRED = YES and security-log minimization locks
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
Given FD-038-20 child-data / age-gate posture (LEGAL_REVIEW_REQUIRED; launch-blocking if legally required)
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
And US-011 full automated portal remains DEFERRED_BY_FOUNDER (FULL_SELF_SERVICE_PRIVACY_PORTAL_V1 = NO); legal review may still require specific launch-blocking rights controls without converting to a full portal by assumption
Mandatory: YES
```

```text
AC-IMP-038-021-01 — PAN/CVV touch assessment recorded
Story: US-IMP-038-021
Given Razorpay payment flows
When assessment completes
Then evidence states BOBA_RAW_PAN_STORAGE = NO and BOBA_RAW_CVV_STORAGE = NO (NO_BY_DESIGN)
And CARD_CAPTURE remains RAZORPAY_OR_PROVIDER_CONTROLLED
Mandatory: YES

```

```text
AC-IMP-038-021-02 — Razorpay integration type and shared-responsibility matrix
Story: US-IMP-038-021
Given payment integration
When matrix published
Then integration type is identified; merchant vs provider responsibilities and evidence are listed
And PAYMENT_SHARED_RESPONSIBILITY_MATRIX = MANDATORY is satisfied
Mandatory: YES
```

```text
AC-IMP-038-021-03 — Validation path / ASV implications identified or N/A
Story: US-IMP-038-021
Given locked NO raw PAN/CVV handling and PAYMENT_SHARED_RESPONSIBILITY_MATRIX = MANDATORY
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
Given EDGE_TO_ORIGIN_BYPASS_RESISTANCE_REQUIRED = YES / Architecture Fit / IMP-039
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
| US-004 / AC-004-* | Privacy labeling/erasure | Unit + HTTP + UX | Founder product policy resolved; legal applicability evidence remains required | Planned only |
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
| BR-IMP-038-008 | PROFILE_DELETE_EQUALS_LEGAL_ERASURE = NO; V1 privacy requests are OPERATOR_MEDIATED; no silent legal claim | OQ-005; FD-038-01/04/10 RESOLVED | US-004 |
| BR-IMP-038-009 | IMP-038 acceptance blocked until IMP-037 formally accepted/reconciled | CONTINUATION_EXCEPTION + contiguity | lifecycle |
| BR-IMP-038-010 | This PD asserts **no** DPDP / CERT-In / PCI / OWASP-certification compliance claim | Legal safety | all |
| BR-IMP-038-011 | Server-side throttling/authorization/validation remain authoritative; edge/bot challenge is defense-in-depth only | Founder layered-defense requirement | US-003/013/014/023 |
| BR-IMP-038-012 | No permanent lockout design that enables attacker DoS of legitimate accounts | Founder auth-abuse requirement | US-003/013 |
| BR-IMP-038-013 | Auth responses must be safe/non-enumerating except where an explicit product need is recorded | Founder auth-abuse requirement | US-003/013 |
| BR-IMP-038-014 | Platform bot/API abuse defense is layered (edge candidate + application controls) on critical surfaces | Founder bot-protection requirement | US-014 |
| BR-IMP-038-015 | Arbitrary direct Internet access must not trivially bypass the intended edge security layer; mechanism is Fit/IMP-039 | Founder edge-to-origin requirement | US-023/014 |
| BR-IMP-038-016 | DPDP/CERT-In/PCI topics require applicability/control/evidence matrices; portal automation is separate and may defer | Founder regulatory-readiness requirement | US-018/020/021 |
| BR-IMP-038-017 | OWASP ASVS v5.0.0 LEVEL_2_APPLICABLE_CONTROLS is the primary traceable baseline; Top 10/API lists are threat inputs only; not certification | FD-038-16 RESOLVED | US-017 |
| BR-IMP-038-018 | Every V1 control needs evidence; every gap needs owner; every exception needs authority + expiry | Acceptance principles | US-016/024 |
| BR-IMP-038-019 | Cloudflare Free may be preferred low-TCO Fit candidate; Product Definition must not lock Cloudflare | Founder TCO + Fit boundary | US-014/023 |
| BR-IMP-038-020 | BOBA_RAW_PAN_STORAGE = NO; BOBA_RAW_CVV_STORAGE = NO; CARD_CAPTURE = RAZORPAY_OR_PROVIDER_CONTROLLED | FD-038-12 RESOLVED | US-021 |

Founder product-policy rules for FD-038-01…21 are reconciled in §25; remaining open items are legal-review topics and Architecture Fit mechanisms.

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
| ALTERNATE VALID PATHS | Accepted embed exceptions only for MINIMAL_EXPLICIT_APPROVED_INTEGRATIONS | FD-038-05 RESOLVED |
| RECOVERY | Config rollback | US-001 |
| SUCCESS FEEDBACK | Operator verification evidence | US-001 |
| DOWNSTREAM EFFECT | Payment/maps embeds must still work per FD | US-001 |
| ACCESSIBILITY | Must not break a11y via CSP blocking needed assets without alternative | US-001 |
| Other | EMPTY/FIRST USE/AUTHZ/NOT FOUND/CONCURRENCY/DESTRUCTIVE = N/A | — |

### JOURNEY-PRIVACY-REQUEST / JOURNEY-DPDP-APPLICABILITY

| Journey dimension | Behaviour / N/A | Refs |
|---|---|---|
| ENTRY | Customer or operator enters OPERATOR_MEDIATED privacy request path | US-004 |
| DISCOVERY | Operator-mediated channel only in V1 (FULL_SELF_SERVICE_PRIVACY_PORTAL_V1 = NO) | FD-038-04 RESOLVED |
| CONTEXT | Subject identity server-derived | US-004 |
| HAPPY PATH | Request accepted/dispositioned via operator process; matrix evidence retained | AC-004-01; US-020 |
| ALTERNATE VALID PATHS | Operator-mediated only in V1; full self-service portal deferred | FD-038-01/04/10 RESOLVED |
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
| Customer OTP / login abused | Threshold crossed | Safe error / retry-later / risk-based challenge (policy resolved; provider/mechanism Architecture Fit dependent) | Focus on recovery CTA | Cooldown then retry | AC-003-* |
| Workforce login / MFA abused | Threshold crossed | Safe error / cooldown / challenge | Focus on recovery | Cooldown then retry | AC-013-* |
| Profile delete | Authed | Copy states PROFILE_DELETE_EQUALS_LEGAL_ERASURE = NO | Confirm control | Success/error | AC-004-01 |
| Privacy request | OPERATOR_MEDIATED channel | Status / denied / hold | Confirm destructive | Recovery | FD-038-01/04 RESOLVED |
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
| Privacy erasure (operator-mediated) | Reuse existing operator/admin catalogue; **must not invent** self-service portal roles | Operator process | Legal holds stop destructive path | FD-038-01 RESOLVED |
| Scan / pack execution | Platform operator process / CI | Repo/CI/ops | N/A RBAC UI | US-006/024 |

Do not invent roles. Operator-mediated privacy does not invent a self-service portal permission set; any new permission keys require Architecture Fit after Gate PASS.

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
| Controlled continuation activation | PR#179/5771367844; GTM-R138/STATE-R136 (prior tip); prior tip GTM-R139/STATE-R137; CURRENT GTM-R140/STATE-R138 | This draft exists | NONE for drafting |
| Founder FDs FD-038-01…21 | RESOLVED (PR#180/5773472988); UNRESOLVED_PRODUCT_DECISIONS = 0 | Product Definition Gate review | Product decisions no longer block Gate for unresolved-FD reasons |
| Legal review (DPDP/CERT-In/PCI/erasure/retention/breach/child-data) | Not performed | US-004/005/008/018/019/020/021 acceptance semantics | LEGAL_REVIEW_REQUIRED (does not reopen product locks) |
| Architecture Fit / lock | PASS / LOCKED (independent Architecture Fit review PASS) | Implementation authorization | STOP until explicit implementation authorization after architecture-lock merge; Cloudflare Free locked via D-375 |
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
| Maps auth-gate + CSP + abuse/bot/ASVS L2 + DPDP/CERT-In/PCI matrices + SDLC + Acceptance Pack | V1 commitment **Founder-locked in DRAFT-2** (Gate PASS; Fit NOT_PERFORMED; not accepted) | this PD; PR#180/5773472988; Gate approval PR#180/5773885848 |

---

## 23. Explicitly deferred

| Behaviour | FOLLOW_UP or DEFERRED | Reason | Revisit |
|---|---|---|---|
| Full DPDP automated portal | DEFERRED_BY_FOUNDER | FULL_SELF_SERVICE_PRIVACY_PORTAL_V1 = NO; matrix remains V1 mandatory (US-020) | Legal review may add launch-blocking rights controls without inventing a full portal |
| Secrets console UX | DEFERRED | IMP-039 host-local secrets adjacency | IMP-039 / later |
| Marketing consent center | DEFERRED_BY_FOUNDER | MARKETING_CONSENT_CENTER_V1 = DEFERRED (FD-038-07) | First-party marketing automation/profiling introduction |
| Customer MFA / WebAuthn | DEFERRED | Not in CURRENT deferral-to-038 evidence as mandatory | Future |
| SIEM / WORM log product | DEFERRED | Out of V1 pack | Future |
| Actual external customer/regulator notification execution | LEGAL_TRIGGER_DEPENDENT | Templates prepared in V1; actual send depends on legal trigger | Legal review |
| Automated retention job engine | FOLLOW_UP | Matrix required in V1; automation engine may follow | After matrix + legal windows |
| Locking Cloudflare (or any WAF/CDN) as architecture | LOCKED via Fit / D-375 | Architecture Fit selected Cloudflare Free; PD Gate did not lock | Architecture Fit (done; independent Architecture Fit review PASS) |
| Invented remediation SLA hours/days beyond locked exception policy | NOT supported | High-risk exception default max = 30 days unless Founder overrides | Founder override only |

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

## 25. Founder decision reconciliation (FD-038-01…21)

Authority: PR #180 comment 5773472988 — `FOUNDER_DECISION_PACKAGE: APPROVED`.

`PRODUCT_DECISIONS = RESOLVED`. `PRODUCT_DECISION_COUNT = 21`. `UNRESOLVED_PRODUCT_DECISIONS = 0`.

Legal applicability findings remain `LEGAL_REVIEW_REQUIRED` and must not be converted into
self-certified compliance claims. Architecture Fit / IMP-039 still selects technical mechanisms
where classified below.

| DECISION_ID | CLASSIFICATION | LOCKED PRODUCT OUTCOME | REMAINING OPEN (non-product) |
|---|---|---|---|
| FD-038-01 | RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY | V1_PRIVACY_REQUEST_MODEL = OPERATOR_MEDIATED; PROFILE_DELETE_EQUALS_LEGAL_ERASURE = NO | Rights-control applicability if legal review requires additional user-facing controls → launch-blocking |
| FD-038-02 | RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY | DATA_CLASS_RETENTION_MATRIX_REQUIRED = YES | Numeric statutory retention windows |
| FD-038-03 | RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY | INTERNAL_INCIDENT_RESPONSE_V1 = REQUIRED; REGULATOR_CUSTOMER_NOTIFICATION_TEMPLATES = PREPARED; ACTUAL_EXTERNAL_NOTIFICATION = LEGAL_TRIGGER_DEPENDENT | External notification triggers / applicability |
| FD-038-04 | RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY | FULL_SELF_SERVICE_PRIVACY_PORTAL_V1 = NO (operator-mediated only) | Same legal rights-control dependency as FD-038-01 |
| FD-038-05 | RESOLVED_WITH_ARCHITECTURE_FIT_MECHANISM | CSP_ENFORCED_ON_REAL_SERVING_PATH = YES; CSP_ALLOWLIST = MINIMAL_EXPLICIT_APPROVED_INTEGRATIONS; REPORT_ONLY_TUNING_ALLOWED_BEFORE_ENFORCEMENT = YES; FINAL_V1_CSP_ENFORCEMENT = REQUIRED | Exact header/CSP serving-path mechanism |
| FD-038-06 | RESOLVED | HIGH_CONSEQUENCE_ADMIN_STEP_UP = REQUIRED | Step-up UX/mechanism details at Fit |
| FD-038-07 | DEFERRED_BY_FOUNDER | MARKETING_CONSENT_CENTER_V1 = DEFERRED; reopen when first-party marketing automation/profiling introduced; does not waive legally required consent/notice for existing processing | — |
| FD-038-08 | RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY | LOCATION_DATA_MINIMIZATION_REQUIRED = YES; RAW_LOCATION_TELEMETRY_RETENTION_BY_DEFAULT = NO | Numeric location retention windows |
| FD-038-09 | RESOLVED | UNRESOLVED_CRITICAL_AT_ACCEPTANCE = ZERO; KNOWN_EXPLOITABLE_HIGH = NO_SILENT_ACCEPTANCE (Founder R3 + compensating controls + expiry) | Per-finding exceptions under policy |
| FD-038-10 | RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY | DPDP_APPLICABILITY_CONTROL_MATRIX = MANDATORY; portal not required for V1 | DPDP applicability interpretation |
| FD-038-11 | RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY | TIME_SYNC_READINESS / EVIDENCE_PRESERVATION / SECURITY_LOGGING / INCIDENT_OWNER_CONTACT = REQUIRED; templates prepared; no CERT-In compliance claim | CERT-In applicability / reporting triggers / log-retention legal windows |
| FD-038-12 | RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY | BOBA_RAW_PAN_STORAGE = NO; BOBA_RAW_CVV_STORAGE = NO; BOBA_RAW_CARD_PROCESSING = NO_BY_DESIGN; CARD_CAPTURE = RAZORPAY_OR_PROVIDER_CONTROLLED; PAYMENT_SHARED_RESPONSIBILITY_MATRIX = MANDATORY | PCI_VALIDATION_PATH legal/compliance review |
| FD-038-13 | RESOLVED_WITH_ARCHITECTURE_FIT_MECHANISM | LAYERED_EDGE_SECURITY_REQUIRED = YES; CLOUDFLARE_FREE = SELECTED / LOCKED (Architecture Fit / D-375); CLOUDFLARE_ARCHITECTURE_LOCKED = YES; APPLICATION_SECURITY_REMAINS_AUTHORITATIVE = YES | Edge vendor/mechanism selection (Fit locked Cloudflare Free) |
| FD-038-14 | RESOLVED_WITH_ARCHITECTURE_FIT_MECHANISM | EDGE_TO_ORIGIN_BYPASS_RESISTANCE_REQUIRED = YES | Mechanism class (allowlist / authenticated origin / tunnel / equivalent) via Fit / IMP-039 |
| FD-038-15 | RESOLVED | AUTH_ABUSE_RESPONSE = PROGRESSIVE_THROTTLE + TEMPORARY_COOLDOWN + RISK_BASED_CHALLENGE; PERMANENT_ATTACKER_TRIGGERED_LOCKOUT = FORBIDDEN; LAYERED_ABUSE_SIGNALS = IP + ACCOUNT_PRINCIPAL + PHONE_OTP_TARGET + SESSION_DEVICE_RISK_WHERE_JUSTIFIED; NON_ENUMERATING_FAILURES = REQUIRED | Threshold tuning at Fit/implementation |
| FD-038-16 | RESOLVED | OWASP_ASVS_VERSION = 5.0.0; OWASP_ASVS_TARGET = LEVEL_2_APPLICABLE_CONTROLS; evidence PASS/GAP/N/A_WITH_REASON; no ASVS certification claim | Exact applicable-control selection evidence |
| FD-038-17 | RESOLVED | Exception register requires owner, rationale, approval authority, compensating controls, retest, expiry; High-risk default max = 30 days unless Founder overrides | Per-exception Founder overrides |
| FD-038-18 | RESOLVED | INDEPENDENT_EXTERNAL_WEB_API_SECURITY_ASSESSMENT_BEFORE_IMP038_ACCEPTANCE = REQUIRED; CRITICAL_HIGH_RETEST_AND_CLOSURE = REQUIRED; CERT_IN_EMPANELLED_ASSESSOR preferred where commercially practical (not certification) | Assessor commercial selection |
| FD-038-19 | RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY | SECURITY_LOG_SECRET_MINIMIZATION = REQUIRED; SECURITY_LOG_PII_MINIMIZATION = REQUIRED | Legally required security-log retention windows |
| FD-038-20 | RESOLVED_WITH_LEGAL_REVIEW_DEPENDENCY | Child-data / age-gate / parental-consent applicability = LEGAL_REVIEW_REQUIRED; if legally required for BOBA V1 → AGE_OR_PARENTAL_CONTROL = LAUNCH_BLOCKING | Legal applicability finding |
| FD-038-21 | RESOLVED_WITH_ARCHITECTURE_FIT_MECHANISM | BOT_CHALLENGE_PRIORITY = CUSTOMER_SIGNUP_LOGIN_OTP_AND_WORKFORCE_AUTH; ORDINARY_CHECKOUT_CHALLENGE_DEFAULT = NO | Challenge provider/mechanism at Fit |

### Legal review open topics (not unresolved product decisions)

`LEGAL_REVIEW_REQUIRED = YES`. `LEGAL_REVIEW_OPEN_TOPICS = 9` (minimum):

1. DPDP applicability
2. Rights-handling controls required for launch (beyond operator-mediated model)
3. Retention windows (statutory / operational / security-log)
4. Child data / age gating / parental consent
5. CERT-In applicability
6. Reporting / breach-notification triggers
7. Security-log retention legal requirements
8. PCI merchant validation scope / path
9. Customer/regulator breach notification trigger interpretation

Do **not** claim: DPDP_COMPLIANT, CERT_IN_COMPLIANT, PCI_DSS_COMPLIANT, OWASP_CERTIFIED.

### Architecture Fit open mechanisms (not unresolved product decisions)

- CSP/header enforcement mechanism on the real serving path (FD-038-05)
- Edge WAF/bot vendor and Free-tier limitation recording (FD-038-13)
- Edge-to-origin bypass resistance mechanism (FD-038-14)
- Bot/human challenge provider/mechanism (FD-038-21)
- Step-up / abuse-control implementation details within locked policy (FD-038-06/15)

`PRODUCT_DEFINITION_GATE` is **PERFORMED** with **Gate Result: PASS** (approval evidence
PR#180/5773885848). Product decisions are not an unresolved-FD stop set. Legal-review topics remain
external acceptance / implementation dependencies where already defined — they are **not** converted
into product-decision blockers. Architecture Fit is **PASS** / architecture **LOCKED**;
independent Architecture Fit review is **PASS**; implementation is **AUTHORIZED / STARTED** (`GTM-R140` / `STATE-R138`).

---

## 26. Definition of Ready

Founder product-policy decisions FD-038-01…21 are reconciled. Stories are **not** kept
`NOT_READY_FOR_IMPLEMENTATION` merely because an FD is unresolved.

V1 acceptance stories are `READY_FOR_IMPLEMENTATION` after GTM-R140 / STATE-R138 authorize+start.
Remaining open dependencies are acceptance / legal / IMP-039 production-realization items — not
authorization blockers.

| Story ID | Fields complete? | Open dependencies (precise) | Readiness |
|---|---|---|---|
| US-IMP-038-001 | Complete in §9 | CSP/header mechanism locked; implement on Nginx serving path | READY_FOR_IMPLEMENTATION |
| US-IMP-038-002 | Complete in §9 | Legal retention windows for location class (acceptance) | READY_FOR_IMPLEMENTATION |
| US-IMP-038-003 | Complete in §9 | Challenge mechanism locked (Turnstile) | READY_FOR_IMPLEMENTATION |
| US-IMP-038-004 | Complete in §9 | Legal rights-control applicability (acceptance) | READY_FOR_IMPLEMENTATION |
| US-IMP-038-005 | Complete in §9 | Legal numeric retention windows (acceptance) | READY_FOR_IMPLEMENTATION |
| US-IMP-038-006 | Complete in §9 | Auth abuse extensions + progressive cooldown | READY_FOR_IMPLEMENTATION |
| US-IMP-038-007 | Complete in §9 | BOLA/BFLA negative proof packaging | READY_FOR_IMPLEMENTATION |
| US-IMP-038-008 | Complete in §9 | Legal external-notification triggers (acceptance) | READY_FOR_IMPLEMENTATION |
| US-IMP-038-009 | Follow-up (step-up owned by US-013) | Broader session UX deferred | FOLLOW_UP |
| US-IMP-038-010 | Deferred | IMP-039 adjacency | DEFERRED |
| US-IMP-038-011 | Deferred by Founder | Portal = NO; matrix remains US-020 | DEFERRED_BY_FOUNDER |
| US-IMP-038-012 | Deferred by Founder | Marketing consent center | DEFERRED_BY_FOUNDER |
| US-IMP-038-013 | Complete in §9 | Step-up/challenge locked | READY_FOR_IMPLEMENTATION |
| US-IMP-038-014 | Complete in §9 | Edge locked Cloudflare Free; IMP-039 may provision | READY_FOR_IMPLEMENTATION |
| US-IMP-038-015 | Complete in §9 | Business-logic abuse threat model evidence | READY_FOR_IMPLEMENTATION |
| US-IMP-038-016 | Complete in §9 | External assessment remains acceptance evidence | READY_FOR_IMPLEMENTATION |
| US-IMP-038-017 | Complete in §9 | ASVS applicable-control evidence | READY_FOR_IMPLEMENTATION |
| US-IMP-038-018 | Complete in §9 | CERT-In legal applicability (acceptance) | READY_FOR_IMPLEMENTATION |
| US-IMP-038-019 | Complete in §9 | Legal security-log retention windows (acceptance) | READY_FOR_IMPLEMENTATION |
| US-IMP-038-020 | Complete in §9 | DPDP/child-data legal applicability (acceptance) | READY_FOR_IMPLEMENTATION |
| US-IMP-038-021 | Complete in §9 | PCI validation-path legal review (acceptance) | READY_FOR_IMPLEMENTATION |
| US-IMP-038-022 | Complete in §9 | Vendor rows; edge selected | READY_FOR_IMPLEMENTATION |
| US-IMP-038-023 | Complete in §9 | Bypass-resistance locked; IMP-039 may provision production | READY_FOR_IMPLEMENTATION |
| US-IMP-038-024 | Complete in §9 | Pack assembled from implementation evidence | READY_FOR_IMPLEMENTATION |

`STORY_COMPLETE != IMP_ACCEPTED`. `IMP038_ACCEPTED` remains blocked by IMP-037 contiguity even after later implementation.

---

## 27. Product Definition Gate

```text
PRODUCT_DEFINITION_GATE

Capability: IMP-038 — Security & Privacy Hardening
Product Definition Version: PD-IMP-038-DRAFT-2
Business Outcome: DEFINED
Primary Personas: DEFINED
Journeys Defined: YES
Story Map Complete: YES
Acceptance Slice Defined: YES
Happy Paths Defined: YES
Alternate Paths Defined: YES
Empty / First-Use States Defined: YES where applicable
Error / Recovery Paths Defined: YES
Authorization Variants Defined: YES
Cross-Scope Scenarios Defined: YES
Concurrency Considered: YES
Destructive Actions Defined: YES
UX State Matrix Complete: YES
Accessibility Considered: YES
Golden Journeys Identified: YES
Explicit Deferrals Recorded: YES
Unresolved Product Decisions: 0
Architecture Conflicts: NONE IDENTIFIED
PRODUCT_DEFINITION_GATE_EXECUTION: PERFORMED
Gate Result: PASS
```

Product Definition Gate execution was performed against exact independently reviewed candidate
`PD-IMP-038-DRAFT-2`. Human Founder / product governance authority authorized Gate Result = PASS
(PR#180/5773885848) after independent readiness review PASS (`5276033742`). Founder decisions
FD-038-01…21 remain reconciled (PR#180/5773472988). Legal-review dependencies are **not** converted
into product-decision blockers. The later gate-persistence commit is **not** the evaluated artifact
(`gate-persistence commit != gate-evaluated candidate`).

```text
GATE_EVALUATED_HEAD = 2ade7b305d7a1c552b56a709dbf8723d356979bf
GATE_EVALUATED_TREE = b8565bba474627ddf3974b329c7d6038ee1bf97c
EXACT_HEAD_CI = 35706440171 SUCCESS
INDEPENDENT_PRODUCT_DEFINITION_GATE_READINESS_REVIEW = 5276033742 PASS — READY_FOR_PRODUCT_DEFINITION_GATE_PASS
GATE_APPROVAL_AUTHORITY = PR#180/5773885848
FOUNDER_DECISION_AUTHORITY = PR#180/5773472988
GATE_DATE = 2026-09-22
Historical provenance: PD-IMP-038-DRAFT-1
PRODUCT_DECISIONS: RESOLVED
PRODUCT_DECISION_COUNT: 21
UNRESOLVED_PRODUCT_DECISIONS: 0
LEGAL_REVIEW_REQUIRED: YES
LEGAL_REVIEW_OPEN_TOPICS: 9
COMPLIANCE_CLAIMS: NONE
Cloudflare locked as architecture: NO (preferred low-TCO Fit candidate only)
IMP038_ARCHITECTURE_FIT: NOT_PERFORMED
IMP038_ARCHITECTURE_LOCKED: NO
IMP038_IMPLEMENTATION_AUTHORIZED: NO
IMP038_STARTED: NO
IMP038_ACCEPTED: NO
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
- Permission changes: operator-mediated privacy reuses catalogue; do not invent self-service portal roles.

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

IMP-038 Product Definition Gate = PASS; Architecture Fit = PASS; architecture = LOCKED;
independent Architecture Fit review = PASS; implementation AUTHORIZED / STARTED (GTM-R140 / STATE-R138).
Implementation proceeds under locked Product Definition + architecture. IMP-038 MUST NOT become
COMPLETE_AND_ACCEPTED before IMP-037 is formally accepted and reconciled.
```

---

## Explicit non-goals (this approved Product Definition)

- Accept IMP-038 or claim PROVE / independent technical acceptance / Founder UAT complete (program tip may record `IMP038_IMPLEMENTATION_COMPLETE: YES` while `IMP038_ACCEPTED: NO`; this Product Definition does not accept)
- Activate IMP-039
- Accept IMP-037 or advance `acceptedThrough`
- Invent or claim DPDP / CERT-In / PCI / OWASP certification compliance
- Change locked Cloudflare Free / application-authoritative security invariants without RED escalation
