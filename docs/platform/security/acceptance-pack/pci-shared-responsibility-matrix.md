---
Status: SUPPORTING — PCI shared-responsibility matrix (no compliance claim)
Authority: US-IMP-038-021; FD-038-12; ADR-009 / D-361
Compliance claim: NONE
---

# PCI shared-responsibility matrix

```text
COMPLIANCE_CLAIMS: NONE
PCI_DSS_COMPLIANT_CLAIM: FORBIDDEN
BOBA_RAW_PAN_STORAGE: NO
BOBA_RAW_CVV_STORAGE: NO
BOBA_RAW_CARD_PROCESSING: NO_BY_DESIGN
CARD_CAPTURE: RAZORPAY_OR_PROVIDER_CONTROLLED
```

| Responsibility area | BOBA | Razorpay / provider | Evidence | Status |
|---|---|---|---|---|
| Raw PAN collection / storage | **NO** — must not store | Provider checkout / vault | Payment types; no PAN fields in BOBA schemas | PASS (product lock) |
| Raw CVV collection / storage | **NO** — must not store | Provider | Same | PASS (product lock) |
| Checkout.js / hosted fields | CSP allowlist + client load | Provider script | `docker/nginx/security-headers.conf`; Razorpay types | PASS (allowlist) |
| Payment order / capture APIs | Server-side provider adapter only | Provider API | `tests/customer-commerce/`; payment-security | PASS |
| Webhook authenticity | Signature verify + durable inbox | Provider signing | `tests/customer-commerce/razorpay.http.integration.test.ts` | PASS |
| Refund initiation | Authz + step-up class | Provider refund APIs | Ops refunds HTTP + step-up | PASS |
| Merchant PCI validation path | Scope assessment obligation | Provider SAQ guidance as applicable | [`legal-review-topics.md`](./legal-review-topics.md) topic 8 | LEGAL_REVIEW_REQUIRED |
| Network segmentation / CDE | No BOBA CDE for raw card by design | Provider CDE | Architecture + this matrix | PASS (no raw card CDE in BOBA) |

## Explicit non-claims

`BOBA_RAW_PAN/CVV = NO` is a product/architecture lock, **not** a PCI DSS compliance
attestation. Merchant validation scope remains `LEGAL_REVIEW_REQUIRED`.
