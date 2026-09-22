---
Status: SUPPORTING — DigitalOcean Cloud Firewall Cloudflare-allowlist contract
Authority: ADR-017; capability §16.2
PRODUCTION_REALIZATION_PENDING: YES — owner IMP-039
IMP039_ACTIVATED: NO
---

# Firewall contract

## Locked intent

```text
PUBLIC_APP_PORTS: Cloudflare IP allowlist ONLY
DIRECT_ORIGIN_PUBLIC_APP_PORTS_PRODUCTION: FORBIDDEN
EMERGENCY_SSH: distinct from public app ports (jump path)
```

Public application ports on the pilot Droplet must accept traffic only from Cloudflare
published IP ranges (IPv4 + IPv6). Non-Cloudflare sources must be denied at the cloud
firewall before reaching Nginx.

## Lab fixture

| Artifact | Role |
|---|---|
| [`fixtures/do-firewall-cloudflare-allowlist.example.json`](./fixtures/do-firewall-cloudflare-allowlist.example.json) | Example allowlist structure; CIDRs sourced from Cloudflare public lists / `cloudflare-real-ip.conf` |

## Verification rules (lab)

1. Allowlist entries must be CIDR strings.
2. Fixture must declare `default_inbound: deny` (or equivalent deny-by-default).
3. Probe: a synthetic non-Cloudflare test IP must **not** appear in the allowlist.
4. Refresh alignment: Cloudflare CIDRs in Nginx `set_real_ip_from` should be the same
   family of published ranges used for firewall allowlisting (refresh via
   `scripts/refresh-cloudflare-real-ip.mjs` when updating).

## Live provision (IMP-039 only)

Apply DigitalOcean Cloud Firewall rules on the pilot Droplet. IMP-038 verification scripts
never call DO APIs.
