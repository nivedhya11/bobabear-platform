---
Status: SUPPORTING — Legal review open topics (exactly 9 from PD-IMP-038)
Authority: PD-IMP-038-DRAFT-2; capability §19.2
Compliance claim: NONE
---

# Legal review topics

```text
LEGAL_REVIEW_OPEN_TOPICS: 9
COMPLIANCE_CLAIMS: NONE
```

Retain **exactly** these nine topics from Product Definition. Do **not** invent DPDP /
CERT-In / PCI applicability findings in engineering.

| # | Topic | Pack cross-link | Status |
|---|---|---|---|
| 1 | DPDP applicability | [`dpdp-review-matrix.md`](./dpdp-review-matrix.md) | LEGAL_REVIEW_REQUIRED |
| 2 | Rights-handling controls required for launch (beyond operator-mediated model) | DPDP matrix; gap LEGAL-RIGHTS-001 | LEGAL_REVIEW_REQUIRED |
| 3 | Retention windows (statutory / operational / security-log) | [`privacy-retention-matrix.md`](./privacy-retention-matrix.md) | LEGAL_REVIEW_REQUIRED |
| 4 | Child data / age gating / parental consent | DPDP matrix; gap LEGAL-CHILD-001 | LEGAL_REVIEW_REQUIRED |
| 5 | CERT-In applicability | [`cert-in-readiness-matrix.md`](./cert-in-readiness-matrix.md) | LEGAL_REVIEW_REQUIRED |
| 6 | Reporting / breach-notification triggers | [`incident-response.md`](./incident-response.md) | LEGAL_REVIEW_REQUIRED |
| 7 | Security-log retention legal requirements | Privacy retention + CERT-In matrices | LEGAL_REVIEW_REQUIRED |
| 8 | PCI merchant validation scope / path | [`pci-shared-responsibility-matrix.md`](./pci-shared-responsibility-matrix.md) | LEGAL_REVIEW_REQUIRED |
| 9 | Customer/regulator breach notification trigger interpretation | IR pack; CERT-In matrix | LEGAL_REVIEW_REQUIRED |

## Locked product facts (not legal findings)

```text
PROFILE_DELETE_EQUALS_LEGAL_ERASURE: NO
RAW_LOCATION_TELEMETRY_RETENTION_BY_DEFAULT: NO
BOBA_RAW_PAN_STORAGE: NO
BOBA_RAW_CVV_STORAGE: NO
V1_PRIVACY_REQUEST_MODEL: OPERATOR_MEDIATED
ACTUAL_EXTERNAL_NOTIFICATION: LEGAL_TRIGGER_DEPENDENT
```
