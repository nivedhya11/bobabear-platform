---
Status: SUPPORTING — Privacy / retention matrix (structure locked; statutory windows legal)
Authority: capability §14.1; US-IMP-038-005; FD-038-02/08/19
Compliance claim: NONE
---

# Privacy / retention matrix

```text
PROFILE_DELETE_EQUALS_LEGAL_ERASURE: NO
RAW_LOCATION_TELEMETRY_RETENTION_BY_DEFAULT: NO
BACKUP_RETENTION_IS_NOT_STATUTORY_RETENTION: YES
COMPLIANCE_CLAIMS: NONE
```

Numeric **statutory** windows are `LEGAL_REVIEW_REQUIRED` — do not invent days.

| Data class | Purpose | System of record | Operational window | Statutory window | Disposition | Owner | Evidence pointer |
|---|---|---|---|---|---|---|---|
| Customer profile | Account / ordering identity | PostgreSQL customer profile tables | Active account + product rules | LEGAL_REVIEW_REQUIRED | Operator-mediated delete/anonymize; **≠ legal erasure** by default | Privacy + customer domain | Profile security tests; DPDP matrix |
| Customer addresses | Delivery | PostgreSQL addresses | While needed for serviceability/orders | LEGAL_REVIEW_REQUIRED | Delete/anonymize per operator process | Customer addresses | `tests/customer-address-security/` |
| OTP artifacts | Auth | Customer-auth OTP / rate-limit tables | Short-lived (product OTP TTL) | LEGAL_REVIEW_REQUIRED | Expire/delete automatically | Customer-auth | Customer-auth HTTP |
| Customer sessions | AuthN | Session store (Better Auth / PG) | Session TTL | LEGAL_REVIEW_REQUIRED | Invalidate on logout/expiry | Customer-auth | Auth foundation tests |
| Workforce identity / MFA | Workforce AuthN | Workforce-auth tables | Employment + MFA lifecycle | LEGAL_REVIEW_REQUIRED | Disable/reset per ops runbooks | Workforce-auth | Workforce-auth HTTP |
| Step-up proofs | High-consequence re-auth | Step-up proof table | TTL 5–15m (product) | LEGAL_REVIEW_REQUIRED | Expire; single-use | Workforce-auth / admin | Step-up DB + HTTP tests |
| Carts / checkout | Commerce | Commerce PG | Cart TTL / checkout lifecycle | LEGAL_REVIEW_REQUIRED | Expire/delete | Commerce | Cart/checkout security |
| Orders | Fulfillment / history | Order PG | Business ops window | LEGAL_REVIEW_REQUIRED | Retain per legal; conceal cross-customer | Order domain | Order security |
| Payments / provider refs | Money movement | Payment PG + provider | Reconciliation window | LEGAL_REVIEW_REQUIRED | No PAN/CVV; retain refs | Payments | Payment security; PCI matrix |
| Refunds / statutory FD decisions | Financial reversal / FD | Refund + FD tables | Business + statutory docs | LEGAL_REVIEW_REQUIRED | FD immutability preserved | Ops / FD | Refund HTTP; FD decisions |
| Financial Documents | Statutory invoices/receipts | FD storage + signatures | Statutory retention (legal) | LEGAL_REVIEW_REQUIRED | Immutable issued docs | FD owners | FD integration tests |
| Access / mutation audits | Accountability | Audit tables | Ops investigative window | LEGAL_REVIEW_REQUIRED | Minimize PII; retain for IR | Authz / admin | Admin audit journeys |
| Security / abuse rate-limit keys | Abuse prevention | HMAC pseudonymous keys in PG | Limit windows | LEGAL_REVIEW_REQUIRED | No raw IP as key material | Auth owners | Capability §7; rate-limit code |
| Security logs | Detection / IR | App logs / platform logs | Ops window | LEGAL_REVIEW_REQUIRED | Secret/PII minimization | Ops + security | IR pack; CERT-In matrix |
| Location (Maps/Places) | Serviceability UX | Provider + minimal app state | Auth-gated; no default raw telemetry retention | LEGAL_REVIEW_REQUIRED | Deny anonymous; minimize | Location | Maps security tests |
| Backups (IMP-037) | Recovery | Spaces / backup layers | Backup retention schedule | N/A_WITH_REASON as statutory substitute — **backup ≠ statutory** | Restore/destroy per IMP-037 | Recovery | IMP-037 docs; FD-037-03 |
| Vendor processor data | Payment/edge processing | Razorpay / Cloudflare | Per vendor DPA | LEGAL_REVIEW_REQUIRED | Shared responsibility | Legal + vendor owners | Vendor register |

## Disposition vocabulary

`anonymize` | `delete` | `hold` | `archive` | `expire` | `immutable_retain`
