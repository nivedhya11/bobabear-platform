---
Status: SUPPORTING — Nginx origin-trust contract
Authority: ADR-017; capability §7–§8; docker/nginx
PRODUCTION_REALIZATION_PENDING: YES (live edge/TLS termination topology via IMP-039)
---

# Nginx contract

## Repository authority (implemented today)

| Requirement | Expected evidence in repo |
|---|---|
| Include Cloudflare `real_ip` fragment | `include /etc/nginx/boba/cloudflare-real-ip.conf;` in `docker/nginx/nginx.conf` |
| Security headers on static + proxy locations | `include /etc/nginx/boba/security-headers.conf;` |
| X-Forwarded-For **replace** (not append) | `proxy_set_header X-Forwarded-For $remote_addr;` |
| No `proxy_add_x_forwarded_for` | Absent from `nginx.conf` |
| Webhook exact location + 64k body | `location = /api/integrations/payments/razorpay/webhook` with `client_max_body_size 64k` |
| Narrow API prefixes only | `/api/customer-auth/`, `/api/workforce-auth/`, `/api/v1/`, `/api/operations/v1/`, `/api/admin/v1/`, webhook |

## Lab / production notes

- Local Compose may expose `:8080` without Cloudflare — safe for development; **not** the
  production trust chain.
- Production must place TLS client-cert verification (AOP) and/or upstream TLS termination
  **in front of or on** the public listener per [`aop-contract.md`](./aop-contract.md).
  The committed `nginx.conf` is the app reverse-proxy contract; AOP TLS snippets live in
  fixtures until IMP-039 installs live certs.

## Verification

`scripts/origin-trust/verify-contracts.mjs` asserts the repository requirements above.
