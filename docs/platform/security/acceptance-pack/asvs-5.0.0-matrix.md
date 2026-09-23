---
Status: SUPPORTING — OWASP ASVS 5.0.0 applicable-control matrix (not certification)
Authority: capability §19; US-IMP-038-017; FD-038-16
Compliance claim: NONE
Vocabulary: PASS | GAP | N/A_WITH_REASON only
ASVS version: 5.0.0
Target: LEVEL_2 applicable subset (traceability baseline)
---

# ASVS 5.0.0 applicable-control matrix

```text
OWASP_ASVS_CERTIFIED_CLAIM: FORBIDDEN
MATRIX_ROLE: TRACEABILITY_BASELINE
COMPLIANCE_CLAIMS: NONE
```

Rows cover **applicable** L2-oriented controls for BOBA's V1 surfaces. Status uses only
`PASS` / `GAP` / `N/A_WITH_REASON`. Evidence is repository-relative.

| ASVS ref (approx) | Control theme | Applicability | Status | Evidence / reason |
|---|---|---|---|---|
| V1.x | Architecture / threat modeling | YES | PASS | [`threat-model.md`](./threat-model.md); ADR-017 |
| V2.1.x | Password security (workforce) | YES | PASS | Workforce-auth MFA + password change flows; `tests/workforce-auth/` |
| V2.2.x | General authenticator (OTP customer) | YES | PASS | Customer phone OTP; rate limits in `tests/customer-auth/` |
| V2.5.x | Credential recovery | YES | GAP | Workforce reset paths exist; formal ASVS recovery checklist not closed (owner: workforce-auth) |
| V2.7 / V2.8 | MFA / out-of-band | YES (workforce) | PASS | MFA enroll/verify/lockout tests |
| V2.9 | Step-up / re-auth | YES | PASS | Admin step-up HTTP + DB integration tests |
| V3.x | Session management | YES | PASS | ADR-004 sessions; CSRF/origin checks in auth/admin HTTP suites |
| V4.1 | General access control | YES | PASS | ADR-005; `tests/access-control/` |
| V4.2 | Operation-level access control (BFLA) | YES | PASS | Admin/ops HTTP + order-security workforce negatives |
| V4.3 | Other access control (BOLA/IDOR) | YES | PASS | `tests/*-security/` cross-customer suites |
| V5.1 | Input validation | YES | PASS | Domain validators + HTTP contract tests across commerce/admin |
| V5.2 | Sanitization / encoding | YES | PASS | CSP Enforce on Nginx serving path (D-376 Maps Fonts; Maps + negative proven) |
| V5.3 | Output encoding / XSS | YES | GAP | Same as V5.2 until CSP enforce (owner: platform ops) |
| V6.x | Stored cryptography | YES (limited) | PASS | Provider/webhook HMAC; no BOBA raw card crypto surface |
| V7.x | Error handling / logging | YES | PASS | Safe errors in access-control; secret absence in payment-security |
| V8.x | Data protection | YES | GAP | Retention matrix structure present; numeric statutory windows unresolved — LEGAL-RETENTION-001 (owner: privacy+legal) |
| V9.1 | App / internal service communications | YES | PASS | Compose service mesh + trusted-origin HTTP contracts |
| V9.2 | Production edge→origin TLS trust chain | YES | GAP | Live Full-strict + AOP realization owned by IMP-039 (`PRODUCTION_REALIZATION_PENDING`) |
| V10.x | Malicious software / unwanted | LIMITED | N/A_WITH_REASON | No end-user binary distribution; supply-chain covered under V14 |
| V11.x | Business logic | YES | PASS | [`business-abuse-evidence.md`](./business-abuse-evidence.md) mapped tests |
| V12.x | Files / resources | LIMITED | N/A_WITH_REASON | No general user file upload in V1 customer path; FD signing is workforce-controlled |
| V13.x | API / web service | YES | PASS | ADR-014 HTTP contracts; webhook separate namespace; origin checks |
| V14.1 | Build / CI security | YES | PASS | [`secure-sdlc-evidence.md`](./secure-sdlc-evidence.md) |
| V14.2 | Dependency management | YES | PASS | npm SCA gate + Dependabot + exception register |
| V14.5 | Secret management | YES | PASS | gitleaks CI; `.env` boundary audits |

### Status hygiene note

Where a row would need `LEGAL_REVIEW_REQUIRED`, ASVS vocabulary here collapses to **GAP**
with owner pointing at the legal gap register (ASVS matrix forbids that fourth token).

### Non-claim

Completing this matrix does **not** make BOBA “ASVS certified” or “ASVS L2 compliant.”
