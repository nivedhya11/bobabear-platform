---
Status: SUPPORTING — DPDP review matrix (no compliance claim)
Authority: US-IMP-038-020; PD-IMP-038 legal topics; capability §14
Compliance claim: NONE
---

# DPDP review matrix

```text
COMPLIANCE_CLAIMS: NONE
DPDP_COMPLIANT_CLAIM: FORBIDDEN
PROFILE_DELETE_EQUALS_LEGAL_ERASURE: NO
RAW_LOCATION_TELEMETRY_RETENTION_BY_DEFAULT: NO
PRIVACY_REQUEST_MODEL_V1: OPERATOR_MEDIATED
FULL_SELF_SERVICE_PRIVACY_PORTAL_V1: NO
```

Do **not** invent applicability findings. Rows may be `LEGAL_REVIEW_REQUIRED`.

| Topic | Product / technical control | Evidence pointer | Status | Owner |
|---|---|---|---|---|
| DPDP applicability to BOBA V1 | Inventory + matrix obligation (FD-038-10) | This matrix; [`legal-review-topics.md`](./legal-review-topics.md) topic 1 | LEGAL_REVIEW_REQUIRED | Legal |
| Lawful processing / notices | Existing privacy UX + operator processes | Storefront privacy surfaces; product definition US-004 | LEGAL_REVIEW_REQUIRED | Legal + product |
| Rights-handling beyond operator-mediated | Operator-mediated V1; portal deferred | US-004/011; gap LEGAL-RIGHTS-001 | LEGAL_REVIEW_REQUIRED | Legal + product |
| Profile delete semantics | Explicit non-equivalence to legal erasure | Product locks; customer profile flows | PASS (product lock) — not a legal finding | Product |
| Location data minimization | Auth-gated Maps; no default raw telemetry retention | `tests/imp-036b/maps-security.test.ts`; retention matrix | PASS (product lock) | Location |
| Child data / age gate | Applicability unknown | [`legal-review-topics.md`](./legal-review-topics.md) topic 4 | LEGAL_REVIEW_REQUIRED | Legal |
| Cross-border / vendor processing | Vendor register (Cloudflare, Razorpay, Maps, hosting) | [`vendor-processor-client-script-register.md`](./vendor-processor-client-script-register.md) | LEGAL_REVIEW_REQUIRED | Legal |
| Retention / deletion | Matrix structure locked; numeric windows open | [`privacy-retention-matrix.md`](./privacy-retention-matrix.md) | LEGAL_REVIEW_REQUIRED | Legal |
| Security safeguards (technical) | Authz, abuse, SDLC, encryption-in-transit design | control-evidence-map | PASS (technical controls mapped) — not DPDP compliance | Security |

## Explicit non-claims

Completing this matrix does **not** mean BOBA is DPDP-compliant. Legal applicability and
any launch-blocking rights controls remain human legal decisions.
