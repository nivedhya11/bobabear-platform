---
Status: SUPPORTING — IMP-038 origin-trust contracts overview (design + lab only)
Authority: capability §16.2; ADR-017 / D-375; ARCH-G27; US-IMP-038-023
Compliance claim: NONE
---

# Origin trust — contracts overview

```text
IMP038_OWNS: design + version-controlled contracts + CI/lab negative probes
IMP039_OWNS: live Cloudflare / DO firewall / AOP production cloud mutation
IMP039_ACTIVATED: NO
PRODUCTION_REALIZATION_PENDING: YES
PUBLIC_GTM_IMP040: FAIL_CLOSED without production realization
```

## Locked trust chain (production target)

```text
Internet
  → Cloudflare proxied DNS / edge
  → WAF / challenge (supplemental)
  → TLS Full (strict) + Authenticated Origin Pulls (zone-level preferred)
  → DigitalOcean Cloud Firewall (Cloudflare IP allowlist on public app ports)
  → BOBA Nginx (CSP + real_ip + XFF replace)
  → Compose services (TRUST_PROXY_HOPS=1)
```

## Contract documents

| Contract | Path |
|---|---|
| Nginx serving + header/IP behaviour | [`nginx-contract.md`](./nginx-contract.md) |
| Authenticated Origin Pulls (AOP) | [`aop-contract.md`](./aop-contract.md) |
| DigitalOcean Cloud Firewall allowlist | [`firewall-contract.md`](./firewall-contract.md) |
| Trusted client IP / `real_ip` | [`real-ip-contract.md`](./real-ip-contract.md) |
| IMP-039 handoff checklist | [`imp039-handoff-checklist.md`](./imp039-handoff-checklist.md) |
| Lab fixtures | [`fixtures/`](./fixtures/) |

## Verification (lab / config — not live production)

```bash
npm run origin-trust:verify
# or
node scripts/origin-trust/verify-contracts.mjs
node --test scripts/origin-trust/verify-contracts.test.mjs
```

Scripts validate repository Nginx configs and fixture contracts, and run **fixture-level**
negative probes. They must **not** mutate Cloudflare, DigitalOcean, or production hosts.

## Acceptance Pack row

See [`../acceptance-pack/INDEX.md`](../acceptance-pack/INDEX.md) origin-trust entry and
threat model T-08 / T-09.
