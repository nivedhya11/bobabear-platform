---
Status: SUPPORTING — IMP-038 control → evidence map
Authority: capability §16.1; US-IMP-038-024
Compliance claim: NONE
Principle: NO CONTROL WITHOUT EVIDENCE
---

# Control → evidence map

Vocabulary for `status`: `PASS` | `GAP` | `N/A_WITH_REASON` | `LEGAL_REVIEW_REQUIRED` |
`PRODUCTION_REALIZATION_PENDING` | `PARTIAL`.

| Control ID | Control | Evidence pointer | Status | Owner |
|---|---|---|---|---|
| C-CSP-01 | Nginx CSP + browser security headers on real serving path | `docker/nginx/security-headers.conf`; `scripts/nginx-origin-redirect.test.mjs` (Report-Only assertion); `scripts/generate-nginx-security-headers.mjs` | PARTIAL — Report-Only; enforce journey proof pending | Platform ops |
| C-IP-01 | Trusted client IP via Cloudflare `real_ip` + XFF replace | `docker/nginx/cloudflare-real-ip.conf`; `docker/nginx/nginx.conf`; `scripts/refresh-cloudflare-real-ip.mjs`; origin-trust contracts | PARTIAL — config locked; live edge PENDING | Platform ops |
| C-HOPS-01 | Production `TRUST_PROXY_HOPS=1` after Nginx normalization | `.env.example`; compose staging env proofs in `scripts/environment/staging.test.mjs` | PASS (config contract) | Auth / commerce owners |
| C-AUTH-CUST-01 | Customer OTP / phone abuse limits + progressive cooldown + Turnstile | `tests/customer-auth/http.integration.test.ts`; Turnstile loader `src/server/security/turnstile`; harnesses under `tests/customer-auth/support/` | PARTIAL — existing limits proven; full progressive ladder evidence selective | Customer-auth |
| C-AUTH-WF-01 | Workforce sign-in / MFA abuse limits (temporary cooldown) | `tests/workforce-auth/http.integration.test.ts` (MFA lockout + email RL) | PARTIAL | Workforce-auth |
| C-STEPUP-01 | High-consequence step-up proofs (missing/expired/replay/class-mismatch) | `tests/administration/admin-step-up-http.integration.test.ts`; `tests/database/workforce-step-up.integration.test.ts`; `tests/administration/support/workforce-step-up.ts` | PASS (HTTP negatives retained) | Admin / workforce-auth |
| C-AUTHZ-01 | ADR-005 deny-by-default; BOLA/BFLA on real paths | [`bola-bfla-evidence.md`](./bola-bfla-evidence.md); `tests/access-control/*`; `tests/*-security/*`; admin/ops HTTP suites | PASS (mapped suite) | Authz |
| C-MAPS-01 | Anonymous Maps/Places denied; auth-gated only | `tests/imp-036b/maps-security.test.ts`; related location gating | PASS (key boundary + deny path) | Location / IMP-036B |
| C-PAY-01 | Razorpay webhook signature + durable inbox; no naive webhook IP RL | `tests/customer-commerce/razorpay.http.integration.test.ts`; `tests/payment-security/payment.security.test.ts`; `tests/refund-webhook/*` | PASS (signature/inbox/negatives) | Payments |
| C-PAY-02 | No BOBA raw PAN/CVV storage | [`pci-shared-responsibility-matrix.md`](./pci-shared-responsibility-matrix.md); payment adapters | PASS (by design; no raw card fields) | Payments |
| C-SDLC-01 | SAST / SCA / secrets / container / Actions pin / Dependabot | [`secure-sdlc-evidence.md`](./secure-sdlc-evidence.md); [`../README.md`](../README.md) | PASS (CI gates present) | Platform security |
| C-EXC-01 | Vulnerability exceptions with authority + expiry | [`../vulnerability-exception-register.md`](../vulnerability-exception-register.md); `.trivyignore` | PASS (npm empty; VEX-TRIVY-001 DS-0002 ≤30d) | Founder / security |
| C-ORIGIN-01 | Origin trust chain design + lab probes | [`../origin-trust/README.md`](../origin-trust/README.md); `scripts/origin-trust/` | PRODUCTION_REALIZATION_PENDING (live = IMP-039) | IMP-038 design; IMP-039 live |
| C-EDGE-01 | Cloudflare Free supplemental edge (WAF/DDoS/Turnstile) | ADR-017; capability §5; vendor register | PRODUCTION_REALIZATION_PENDING | IMP-039 |
| C-IR-01 | Internal incident response templates | [`incident-response.md`](./incident-response.md) | PARTIAL — templates; tabletop pending | Ops |
| C-PRIV-01 | Operator-mediated privacy; profile delete ≠ erasure | [`dpdp-review-matrix.md`](./dpdp-review-matrix.md); [`privacy-retention-matrix.md`](./privacy-retention-matrix.md) | LEGAL_REVIEW_REQUIRED (applicability) | Privacy + legal |
| C-RET-01 | Data-class retention matrix structure | [`privacy-retention-matrix.md`](./privacy-retention-matrix.md) | LEGAL_REVIEW_REQUIRED (statutory windows) | Privacy + legal |
| C-REG-DPDP | DPDP applicability / rights controls | [`dpdp-review-matrix.md`](./dpdp-review-matrix.md) | LEGAL_REVIEW_REQUIRED | Legal |
| C-REG-CERTIN | CERT-In applicability / reporting | [`cert-in-readiness-matrix.md`](./cert-in-readiness-matrix.md) | LEGAL_REVIEW_REQUIRED | Legal |
| C-REG-PCI | PCI merchant validation path | [`pci-shared-responsibility-matrix.md`](./pci-shared-responsibility-matrix.md) | LEGAL_REVIEW_REQUIRED (validation path); PAN/CVV ban PASS | Legal + payments |
| C-ASVS-01 | ASVS 5.0.0 L2 applicable-control matrix | [`asvs-5.0.0-matrix.md`](./asvs-5.0.0-matrix.md) | PARTIAL — matrix scaffolded; not certification | Security |
| C-TM-01 | Threat model T-01…T-25 | [`threat-model.md`](./threat-model.md) | PASS (scaffold complete; Critical residual ZERO) | Security |
| C-VENDOR-01 | Vendor / processor / client-script register | [`vendor-processor-client-script-register.md`](./vendor-processor-client-script-register.md) | PASS | Security |
| C-EXT-01 | Independent external web/API assessment | — | GAP | Founder-commissioned |
| C-UAT-01 | Founder UAT exact-candidate verdict | — | GAP | Founder (human only) |
