---
Status: SUPPORTING — IMP-038 gap register
Authority: capability §16.1
Compliance claim: NONE
Principle: NO GAP WITHOUT OWNER
Vocabulary: PASS | GAP | N/A_WITH_REASON | LEGAL_REVIEW_REQUIRED
---

# Gap register

Every `GAP` / `LEGAL_REVIEW_REQUIRED` row has a named owner. Closing a gap requires
evidence pointer update in [`control-evidence-map.md`](./control-evidence-map.md) and
this register.

| ID | Status | Gap | Owner | Blocking? | Notes / evidence owed |
|---|---|---|---|---|---|
| GAP-CSP-ENFORCE-001 | GAP | CSP still Report-Only; enforcement + disallowed-host journey proof pending | Platform ops | YES for final V1 CSP AC | Tranche A deferral; see [`csp-header-evidence.md`](./csp-header-evidence.md) |
| GAP-ORIGIN-LIVE-001 | GAP | Live Cloudflare DNS proxy + DO firewall + AOP cert on pilot Droplet | IMP-039 (provision); Platform ops (accept evidence) | YES for public GTM/IMP-040; **not** for IMP-038 design+lab acceptance | `PRODUCTION_REALIZATION_PENDING`; see origin-trust handoff |
| GAP-EXT-ASSESS-001 | GAP | Independent external web/API security assessment + Critical/High retest | Founder-commissioned assessor | YES before IMP-038 acceptance | FD-038-18 |
| GAP-FOUNDER-UAT-001 | GAP | Founder UAT interactive verdict on exact candidate fingerprint | Founder | YES before COMPLETE_AND_ACCEPTED | Agents must not self-declare PASS |
| GAP-TABLETOP-001 | GAP | Incident / CERT-In readiness tabletop exercise record | Ops lead | Soft for pack completeness | Templates exist in IR pack |
| GAP-ASSET-INV-001 | GAP | Full asset inventory beyond data-class retention rows | Platform security | Soft | Retention matrix covers data classes only |
| GAP-DATAFLOW-001 | GAP | Explicit data-flow map artifact | Platform security + privacy | Soft | Do not invent flows; derive from architecture when authored |
| GAP-SECRETS-REVIEW-001 | GAP | Client-bundle secret allowlist review evidence snapshot | Platform security | Soft | gitleaks gate PASS; allowlist review still owed |
| LEGAL-DPDP-001 | LEGAL_REVIEW_REQUIRED | DPDP applicability interpretation | Legal | YES for compliance statements; product locks stand | Topic 1 |
| LEGAL-RIGHTS-001 | LEGAL_REVIEW_REQUIRED | Launch-blocking rights-handling controls beyond operator-mediated model | Legal + product | Conditional launch block | Topic 2 |
| LEGAL-RETENTION-001 | LEGAL_REVIEW_REQUIRED | Numeric statutory / operational / security-log retention windows | Legal | YES for numeric claims | Topics 3, 7 |
| LEGAL-CHILD-001 | LEGAL_REVIEW_REQUIRED | Child data / age gating / parental consent applicability | Legal | Conditional launch block if required | Topic 4 |
| LEGAL-CERTIN-001 | LEGAL_REVIEW_REQUIRED | CERT-In applicability | Legal | YES for compliance statements | Topic 5 |
| LEGAL-BREACH-001 | LEGAL_REVIEW_REQUIRED | Reporting / breach-notification triggers | Legal | External notify = LEGAL_TRIGGER_DEPENDENT | Topic 6 |
| LEGAL-SECLOG-001 | LEGAL_REVIEW_REQUIRED | Security-log retention legal requirements | Legal | Tied to LEGAL-RETENTION-001 | Topic 7 |
| LEGAL-PCI-001 | LEGAL_REVIEW_REQUIRED | PCI merchant validation scope / path | Legal + payments | YES for PCI claims; raw card ban already locked | Topic 8 |
| LEGAL-NOTIFY-001 | LEGAL_REVIEW_REQUIRED | Customer/regulator breach notification trigger interpretation | Legal | External notify path | Topic 9 |
| GAP-IMP037-001 | GAP | IMP-037 predecessor acceptance (contiguity) | Founder / recovery owners | YES — `IMP038_ACCEPTANCE_BLOCKED_BY_IMP037` | Outside this pack's engineering close |

## Closed / N/A (selected)

| ID | Status | Item | Reason |
|---|---|---|---|
| N/A-BOT-FIGHT-001 | N/A_WITH_REASON | Bot Fight Mode enablement as acceptance-critical control | Capability: supplemental only; default OFF; not acceptance-critical |
| N/A-PAID-CF-001 | N/A_WITH_REASON | Paid Cloudflare plan for V1 | Locked: Free sufficient as supplemental edge |
| N/A-PAN-STORE-001 | N/A_WITH_REASON | BOBA raw PAN/CVV storage control gap | By design `BOBA_RAW_PAN/CVV = NO`; provider-controlled capture |
