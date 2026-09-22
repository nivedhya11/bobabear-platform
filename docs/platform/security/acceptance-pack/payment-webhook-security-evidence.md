---
Status: SUPPORTING — Payment / webhook security evidence
Authority: ADR-009; D-361–D-363; US-IMP-038-021; capability §12
Compliance claim: NONE
---

# Payment / webhook security evidence

```text
BOBA_RAW_PAN_STORAGE: NO
BOBA_RAW_CVV_STORAGE: NO
NAIVE_WEBHOOK_IP_RATE_LIMIT: FORBIDDEN
WEBHOOK_BODY_LIMIT: 64k (Nginx location)
```

| Control | Evidence |
|---|---|
| Webhook signature verify + reject bad signatures | `tests/customer-commerce/razorpay.http.integration.test.ts` |
| Durable inbox / idempotent replay behaviour | Same razorpay HTTP suite; payment idempotency tests |
| Unverified webhook has zero effect; secrets absent from errors | `tests/payment-security/payment.security.test.ts` |
| Payment IDOR / actor forgery / monetary forgery | `tests/payment-security/payment.security.test.ts` |
| Client evidence cannot mint sealed provider success | Same payment-security suite |
| Refund webhook / refund path | `tests/refund-webhook/refund.webhook.test.ts`; ops refunds HTTP |
| Nginx exact webhook path + 64k body | `docker/nginx/nginx.conf` location `= /api/integrations/payments/razorpay/webhook` |
| Shared responsibility / no raw card | [`pci-shared-responsibility-matrix.md`](./pci-shared-responsibility-matrix.md) |

## Explicit non-claims

No PCI DSS compliance claim. Merchant validation path remains `LEGAL_REVIEW_REQUIRED`.
