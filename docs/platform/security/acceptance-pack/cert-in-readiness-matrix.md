---
Status: SUPPORTING — CERT-In readiness matrix (no compliance claim)
Authority: US-IMP-038-018; FD-038-11; capability §16.1
Compliance claim: NONE
---

# CERT-In readiness matrix

```text
COMPLIANCE_CLAIMS: NONE
CERT_IN_COMPLIANT_CLAIM: FORBIDDEN
ACTUAL_EXTERNAL_NOTIFICATION: LEGAL_TRIGGER_DEPENDENT
```

| Control theme | Locked product / technical posture | Evidence pointer | Status | Owner |
|---|---|---|---|---|
| CERT-In applicability | Matrix required; finding not invented | [`legal-review-topics.md`](./legal-review-topics.md) topic 5 | LEGAL_REVIEW_REQUIRED | Legal |
| Reporting / breach triggers | Templates prepared; send = legal trigger | [`incident-response.md`](./incident-response.md); topics 6/9 | LEGAL_REVIEW_REQUIRED | Legal |
| Time sync readiness | Host/container time sync expected in ops baseline | Pilot infra ADR-016 ops notes; staging runbooks | GAP | Ops (attach durable time-sync evidence) |
| Security logging | PII/secret minimization required | Capability §14.3; auth HMAC keys; payment secret absence tests | PASS (design + selective tests) | Security |
| Evidence preservation | IR pack preserve checklist | [`incident-response.md`](./incident-response.md) | PASS (template) | Ops |
| Incident owner / contact | Named in IR pack | [`incident-response.md`](./incident-response.md) | PASS (template fields) | Ops |
| PoC / tabletop | Required for readiness evidence | gap `GAP-TABLETOP-001` | GAP | Ops lead |
| Log retention legal window | Numeric window open | LEGAL-SECLOG-001 | LEGAL_REVIEW_REQUIRED | Legal |

## Explicit non-claims

This is a **readiness** matrix. It does not assert CERT-In compliance or that any
regulator notification is authorized.
