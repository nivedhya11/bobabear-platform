---
Status: SUPPORTING — IMP-039 handoff checklist (not an activation)
Authority: capability §16.2
IMP039_ACTIVATED: NO
---

# IMP-039 handoff checklist

This checklist is the IMP-038 → IMP-039 interface. Completing design/lab rows does **not**
activate IMP-039. Live cloud mutation requires a separate human gate.

## IMP-038 deliverables (design + lab) — expected before handoff

- [x] Version-controlled Nginx contract (`nginx-contract.md` + `docker/nginx/*`)
- [x] AOP contract + lab fixtures (`aop-contract.md` + fixtures)
- [x] Firewall contract + example allowlist fixture
- [x] real_ip contract + `cloudflare-real-ip.conf` + refresh script
- [x] Reproducible `npm run origin-trust:verify` / script tests
- [x] Acceptance Pack index row + threat model T-08/T-09 Founder notes
- [ ] Design+lab evidence reviewed in Acceptance Pack (human)

## IMP-039 owns (production realization)

- [ ] Cloudflare orange-cloud / proxied DNS for public hostnames
- [ ] Enable Cloudflare Authenticated Origin Pulls (zone-level preferred)
- [ ] Install AOP / origin TLS material on pilot Droplet
- [ ] Full (strict) origin certificate lifecycle
- [ ] DigitalOcean Cloud Firewall: Cloudflare CIDR allowlist on public app ports
- [ ] Emergency jump/SSH path distinct from public app ports
- [ ] Negative probe from non-CF source to Droplet app port → denied
- [ ] Negative probe TLS without client cert → denied
- [ ] Record production evidence URLs / change tickets for Acceptance Pack
- [ ] Clear or re-date `PRODUCTION_REALIZATION_PENDING` with Founder-visible pack update

## Explicit non-goals for this checklist

- Do not mark IMP-039 activated from IMP-038 work.
- Do not treat design+lab PASS as public GTM / IMP-040 ready.
- Do not mutate live Cloudflare/DO from IMP-038 scripts.
