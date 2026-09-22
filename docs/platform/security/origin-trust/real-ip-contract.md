---
Status: SUPPORTING — Trusted client IP / real_ip contract
Authority: capability §7; ADR-017
PRODUCTION_REALIZATION_PENDING: partial — Nginx fragment present; live CF path PENDING
---

# real_ip contract

## Locked policy

```text
real_ip_header: CF-Connecting-IP
real_ip_recursive: on
set_real_ip_from: Cloudflare published CIDRs only
X-Forwarded-For: REPLACE with $remote_addr after real_ip (never append)
TRUST_PROXY_HOPS_PRODUCTION: 1
RAW_IP_AS_RATE_LIMIT_KEY: FORBIDDEN
```

## Repository authority

| File | Role |
|---|---|
| `docker/nginx/cloudflare-real-ip.conf` | Generated/maintained CIDR list + header/recursive directives |
| `scripts/refresh-cloudflare-real-ip.mjs` | Refresh from Cloudflare published lists |
| `docker/nginx/nginx.conf` | Includes real_ip fragment; sets `X-Forwarded-For $remote_addr` |

## Application alignment

Production env for customer-auth, workforce-auth, and customer-commerce:

`TRUST_PROXY_HOPS=1` (see `.env.example`).

Local e2e harnesses may use hops `0` when Nginx is not in path — that does not redefine
production.

## Spoof resistance

When direct-origin access is blocked (firewall + AOP), forged `CF-Connecting-IP` /
`X-Forwarded-For` from the public Internet cannot reach Nginx as a trusted peer.
Config-level probes assert CF-only `set_real_ip_from` and XFF replace; live spoof
ineffectiveness requires IMP-039 realization.
