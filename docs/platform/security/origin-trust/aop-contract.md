---
Status: SUPPORTING — Authenticated Origin Pulls (AOP) contract
Authority: ADR-017; capability §16.2; Cloudflare AOP docs
PRODUCTION_REALIZATION_PENDING: YES — owner IMP-039
IMP039_ACTIVATED: NO
---

# Authenticated Origin Pulls (AOP) contract

## Locked intent

```text
AOP_SCOPE: zone-level preferred
TLS_MODE: Full (strict) to origin
DIRECT_ORIGIN_WITHOUT_CLIENT_CERT: REJECT
```

Production origin TLS must require Cloudflare's client certificate (Authenticated Origin
Pulls) so arbitrary Internet clients cannot complete TLS to the Droplet app port even if
they learn the IP — layered with the DO firewall allowlist.

## Lab fixture (version-controlled)

| Artifact | Role |
|---|---|
| [`fixtures/aop-ssl-client-verify.conf.snippet`](./fixtures/aop-ssl-client-verify.conf.snippet) | Required directives: `ssl_verify_client on;` + `ssl_client_certificate` path placeholder |
| [`fixtures/nginx-aop-lab.conf`](./fixtures/nginx-aop-lab.conf) | Minimal lab server block demonstrating reject-without-client-cert posture |

## Live provision (IMP-039 only)

1. Install Cloudflare Authenticated Origin Pull CA / cert on pilot Droplet.
2. Enable zone-level AOP.
3. Configure origin certificate for Full (strict).
4. Prove direct TLS without client cert fails.
5. Record evidence; do **not** claim IMP-038 live realization.

## Non-actions for IMP-038 agents

- Do not call Cloudflare APIs to enable AOP.
- Do not install certificates on production Droplets.
- Do not open or close live firewall rules.
