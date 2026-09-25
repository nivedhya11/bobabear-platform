<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "PRODUCT_ARTIFACT_INDEX",
  "lastReviewed": "2026-09-24"
}
-->

# Product artifacts

This directory indexes the canonical product-management artifacts: who a capability serves, which
journeys it changes, and the stories and observable acceptance scenarios defining its outcome.
The method and gates are owned by [PRODUCT-DELIVERY.md](../PRODUCT-DELIVERY.md); evidence policy is
owned by [TESTING.md](../TESTING.md).

| Artifact | Owns |
|---|---|
| [Persona registry](./personas.md) | Human responsibilities, goals, jobs, and context; no authorization authority |
| [Golden Journey registry](./golden-journeys.md) | Cross-capability business continuity references and their bounded status |
| [Product Definition template](./templates/product-definition-template.md) | Required structure for a capability's product definition |
| [IMP-036F Product Definition](./IMP-036F/product-definition.md) | First PD-1 per-IMP Product Definition (`PD-IMP-036F-DRAFT-1`); Product Definition Gate = PASS; Architecture Fit = PASS; Capability architecture = LOCKED; lifecycle = COMPLETE_AND_ACCEPTED / accepted (ROADMAP/STATE remain lifecycle authority) |
| [IMP-036G Product Definition](./IMP-036G/product-definition.md) | Product Definition = APPROVED (`PD-IMP-036G-DRAFT-2`); Product Definition Gate = PASS; Architecture Fit = PASS; Capability architecture = LOCKED ([`../capabilities/IMP-036G-administration-console-v2.md`](../capabilities/IMP-036G-administration-console-v2.md)); lifecycle = COMPLETE_AND_ACCEPTED / accepted (ROADMAP/STATE remain lifecycle authority; Founder UAT PASS) |
| [IMP-036H Product Definition](./IMP-036H/product-definition.md) | `PD-IMP-036H-DRAFT-1`; **APPROVED**; Product Definition Gate = **PASS**; Architecture Fit = **PASS**; Architecture = **LOCKED** ([`../capabilities/IMP-036H-customer-pickup-takeaway.md`](../capabilities/IMP-036H-customer-pickup-takeaway.md); D-378 / ADR-018 **CURRENT**; ARCH-R22 / ARCH-G28); Implementation = **AUTHORIZED** / **STARTED** / **COMPLETE**; formal lifecycle = `COMPLETE_AND_ACCEPTED`; **IMP036H_ACTIVATED: YES**; `acceptedThrough` = IMP-036H; `pendingAcceptance` = NONE; under `PROGRAM_PAUSE: PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED` (**D-377**) (ROADMAP/STATE remain lifecycle authority; `IMP036H_IMPLEMENTATION_COMPLETE: YES`; `IMP036H_ACCEPTED: YES`; `IMP036H_FOUNDER_UAT: PASS`; acceptance provenance GTM-R147 / STATE-R145; CURRENT tip GTM-R158 / STATE-R156 with `currentProductSlice` = IMP-036I — IMP-036H is **not** CURRENT slice; evidence [`./IMP-036H/evidence-candidate.md`](./IMP-036H/evidence-candidate.md)) |
| [IMP-036I Product Definition](./IMP-036I/product-definition.md) | `PD-IMP-036I-DRAFT-4`; **APPROVED**; Product Definition Gate = **PASS** (review `5307761142`); **IMP036I_ACTIVATED: YES**; formal lifecycle = `IMPLEMENTATION_IN_PROGRESS`; `currentProductSlice` = IMP-036I; Architecture Fit = **PASS** (independent review `5312653831`; D-379 / ADR-019 **CURRENT** / **Accepted**; D-380 / ADR-020 **CURRENT** / **Accepted**; ARCH-R23 / ARCH-G29 / ARCH-G30 **CURRENT**); Architecture = **LOCKED**; Implementation = **AUTHORIZED** / **STARTED**; under `PROGRAM_PAUSE` / **D-377** (ROADMAP/STATE remain lifecycle authority; tip GTM-R158 / STATE-R156; prior tip GTM-R154 / STATE-R152 architecture lock; prior tip GTM-R153 / STATE-R151 Product Definition Gate PASS; `acceptedThrough` = IMP-036H; `nextProductSlice` = IMP-037) |
| [IMP-037 Product Definition](./IMP-037/product-definition.md) | `PD-IMP-037-DRAFT-1`; **APPROVED**; Product Definition Gate = **PASS**; Architecture Fit = **PASS**; Architecture = **LOCKED**; **IMP037_ACTIVATED: YES**; formal lifecycle = IMPLEMENTATION_IN_PROGRESS; **IMP037_HOLD: YES** under `PROGRAM_PAUSE` / **D-377** (unresolved held predecessor; `PHASE1_BLOCK_STATUS: BLOCKED_PROVIDER_ACCESS`; `IMP037_IMPLEMENTATION_COMPLETE: NO`); Implementation = AUTHORIZED / STARTED; independent Architecture Fit review PASS (ROADMAP/STATE remain lifecycle authority; `acceptedThrough` = IMP-036H; `nextProductSlice` = IMP-037; `IMP037_ACCEPTED: NO`) |
| [IMP-038 Product Definition](./IMP-038/product-definition.md) | `PD-IMP-038-DRAFT-2`; **APPROVED**; Product Definition Gate = **PASS**; Architecture Fit = **PASS**; Architecture = **LOCKED**; **IMP038_ACTIVATED: YES**; **IMP038_HOLD: YES** under `PROGRAM_PAUSE: PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED` (**D-377**); historical `CONTINUATION_EXCEPTION: IMP037_PROVIDER_BLOCKED_TO_IMP038` preserved; Implementation = **COMPLETE** / **NOT_ACCEPTED**; `IMP038_EXTERNAL_ASSESSMENT: DEFERRED_UNTIL_PRE_GTM_APPLICATION_SCOPE_STABILIZES`; `IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES`; capability [`../capabilities/IMP-038-security-privacy-hardening.md`](../capabilities/IMP-038-security-privacy-hardening.md) (ROADMAP/STATE remain lifecycle authority; CURRENT tip `currentProductSlice` = IMP-036I — **not** IMP-038; `nextProductSlice` = IMP-037; acceptedThrough = IMP-036H; tip GTM-R158 / STATE-R156) |
| [IMP-040 Product Definition](./IMP-040/product-definition.md) | `PD-IMP-040-DRAFT-1`; **PRE-GATE DRAFT**; Founder product decisions resolved; Product Definition Gate = **NOT_PERFORMED**; Architecture Fit = **NOT_PERFORMED**; Architecture = **NOT_LOCKED**; **IMP040_ACTIVATED: NO**; Implementation = NOT_AUTHORIZED / NOT_STARTED; Journey Gap Audit = **NOT_PERFORMED**; GO = **NO**; public launch = **NO** (ROADMAP/STATE remain lifecycle authority; intervening pre-GTM IMP-036H/036I and held IMP-037/038/039 remain hard dependencies; `acceptedThrough` = IMP-036H; CURRENT tip `currentProductSlice` = IMP-036I under `PROGRAM_PAUSE` / **D-377**; tip GTM-R158 / STATE-R156) |
| Per-IMP Product Definition | Business outcome, journeys, acceptance slice, stories, scenarios, business rules, and explicit deferrals within existing authority |

A per-IMP Product Definition is mandatory from **IMP-036F onward** for new substantial product
work. Use `docs/platform/product/<IMP>/product-definition.md`, with its own identity, version,
and gate record. IMP-036F has a gate-passed Product Definition at
[`./IMP-036F/product-definition.md`](./IMP-036F/product-definition.md) (Product Definition Gate PASS /
Architecture Fit PASS / architecture LOCKED / COMPLETE_AND_ACCEPTED). IMP-036G has an **APPROVED** Product Definition at [`./IMP-036G/product-definition.md`](./IMP-036G/product-definition.md)
(`PD-IMP-036G-DRAFT-2`; Product Definition Gate = PASS; Architecture Fit = PASS; Capability
architecture = LOCKED at [`../capabilities/IMP-036G-administration-console-v2.md`](../capabilities/IMP-036G-administration-console-v2.md);
lifecycle = COMPLETE_AND_ACCEPTED; Founder UAT PASS). IMP-036H has an **APPROVED** Product
Definition at [`./IMP-036H/product-definition.md`](./IMP-036H/product-definition.md)
(`PD-IMP-036H-DRAFT-1`; Product Definition Gate = PASS;
Architecture Fit = PASS; Architecture = LOCKED at
[`../capabilities/IMP-036H-customer-pickup-takeaway.md`](../capabilities/IMP-036H-customer-pickup-takeaway.md)
(D-378 / ADR-018 CURRENT; ARCH-R22 / ARCH-G28); Implementation = AUTHORIZED / STARTED /
COMPLETE; **IMP036H_ACTIVATED: YES**; formal lifecycle = `COMPLETE_AND_ACCEPTED`;
`IMP036H_ACCEPTED: YES`; under
`PROGRAM_PAUSE: PRE_GTM_PRODUCT_INSERTION_PROVIDER_BLOCKED` (**D-377**); CURRENT tip
`currentProductSlice` = IMP-036I — IMP-036H is **not** CURRENT slice). IMP-036I has an
**APPROVED** Product Definition at
[`./IMP-036I/product-definition.md`](./IMP-036I/product-definition.md)
(`PD-IMP-036I-DRAFT-4`; Product Definition Gate = **PASS**; independent review `5307761142`;
**IMP036I_ACTIVATED: YES**; formal lifecycle = `IMPLEMENTATION_IN_PROGRESS`; Architecture Fit = **PASS**
(review `5312653831`; D-379 CURRENT; D-380 CURRENT; ADR-019 Accepted; ADR-020 Accepted; ARCH-R23);
Architecture = **LOCKED**; Implementation = **AUTHORIZED** / **STARTED**; CURRENT
`currentProductSlice` under D-377 program pause; tip GTM-R158 / STATE-R156).
IMP-037 has an **APPROVED** Product Definition at
[`./IMP-037/product-definition.md`](./IMP-037/product-definition.md) (`PD-IMP-037-DRAFT-1`; Product
Definition Gate = PASS; Architecture Fit = PASS; Architecture = LOCKED;
**IMP037_ACTIVATED: YES**; formal lifecycle = IMPLEMENTATION_IN_PROGRESS; **IMP037_HOLD: YES**
under D-377 program pause; unresolved held predecessor; Implementation = AUTHORIZED / STARTED;
`IMP037_ACCEPTED: NO`).
IMP-038 has an **APPROVED** Product Definition at
[`./IMP-038/product-definition.md`](./IMP-038/product-definition.md) (`PD-IMP-038-DRAFT-2`; Product
Definition Gate = PASS; Architecture Fit = PASS; Architecture = LOCKED;
**IMP038_ACTIVATED: YES**; **IMP038_HOLD: YES** under D-377 program pause; historical
`CONTINUATION_EXCEPTION: IMP037_PROVIDER_BLOCKED_TO_IMP038` preserved;
Implementation = COMPLETE / NOT_ACCEPTED; external assessment deferred;
`IMP038_ACCEPTANCE_BLOCKED_BY_IMP037: YES`;
approval evidence PR#180/5773885848).
IMP-040 has a **PRE-GATE DRAFT** Product Definition at
[`./IMP-040/product-definition.md`](./IMP-040/product-definition.md) (`PD-IMP-040-DRAFT-1`; Founder
product decisions resolved; Product Definition Gate = NOT_PERFORMED; Architecture Fit =
NOT_PERFORMED; Architecture = NOT_LOCKED; **IMP040_ACTIVATED: NO**; Implementation =
NOT_AUTHORIZED / NOT_STARTED; Journey Gap Audit = NOT_PERFORMED; GO = NO; public launch = NO).
Canonical Product Definition for IMP-039 is not present on CURRENT main. Activation and formal
lifecycle remain owned only by CURRENT ROADMAP/STATE, not by this index.
Engineering-only changes without a product surface may remain specification-driven under the
[change workflow](../engineering/change-workflow.md).

[VISION](../VISION.md) owns why and Non-Goals; [ROADMAP](../ROADMAP.md) owns sequence and lifecycle;
[STATE](../STATE.md) owns accepted/current reality. [ARCHITECTURE](../ARCHITECTURE.md), the
[decision register](../decision-register.md), and relevant [capability artifacts](../capabilities/)
remain authoritative for technical, security, financial, persistence, and concurrency boundaries.
Product Definitions cannot override them. Undefined material user/business behavior is
`PRODUCT_DECISION_REQUIRED`; architecture must not invent the missing behavior.

| Identifier | Use | Example |
|---|---|---|
| `PERSONA-...` | Reusable product persona | `PERSONA-CUSTOMER` |
| `JOURNEY-...` | User journey, referenced by stories and Golden Journeys | `JOURNEY-FIRST-ORDER` |
| `GJ-...` | Cross-capability Golden Journey | `GJ-FIRST-ORDER` |
| `US-<IMP>-NNN` | User story within an IMP | `US-IMP-036F-001` |
| `AC-<IMP>-NNN-NN` | Observable scenario for the corresponding story | `AC-IMP-036F-001-01` |
| `BR-<IMP>-NNN` | Product business rule within an IMP | `BR-IMP-036F-001` |

Examples establish identifier syntax only; they do not define or authorize those stories. Keep
identifiers stable. Link each story to its persona, outcome, journey, rules, acceptance scenarios,
and evidence. A Golden Journey can span several stories or IMPs; relevant Product Definitions
select which journeys are mandatory for acceptance.

```text
PRODUCT_DELIVERY_PROCESS_EFFECTIVE_FROM = IMP-036F
HISTORICAL_ACCEPTED_IMPS_REWRITTEN = NO
IMP036E_LIFECYCLE_CHANGED = NO
PD1_DID_NOT_ACTIVATE_IMP036F_AT_ADOPTION = YES
```

PD-1 Session 1 did not itself activate IMP-036F. Current IMP-036F activation truth is owned only by
[`ROADMAP.md`](../ROADMAP.md) / [`STATE.md`](../STATE.md). A Journey Gap Audit of previously
implemented product journeys is required before public GTM cutover / IMP-040 acceptance. Session 1
establishes the process and initial registry; it does not perform that audit or revise prior
acceptance.
