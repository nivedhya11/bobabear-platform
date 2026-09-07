<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "PRODUCT_ARTIFACT_INDEX",
  "lastReviewed": "2026-09-07"
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
| Per-IMP Product Definition | Business outcome, journeys, acceptance slice, stories, scenarios, business rules, and explicit deferrals within existing authority |

A per-IMP Product Definition is mandatory from **IMP-036F onward** for new substantial product
work. Use `docs/platform/product/<IMP>/product-definition.md`, with its own identity, version,
and gate record. This convention creates no IMP-036F Product Definition or activation in Session 1.
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
IMP036F_ACTIVATED = NO
```

A Journey Gap Audit of previously implemented product journeys is required before public GTM
cutover / IMP-040 acceptance. Session 1 establishes the process and initial registry; it does not
perform that audit or revise prior acceptance.
