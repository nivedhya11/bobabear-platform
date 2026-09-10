<!-- governance-meta
{
  "status": "CURRENT",
  "authority": "GOLDEN_JOURNEY_REGISTRY",
  "version": "GJ-1",
  "lastReviewed": "2026-09-10"
}
-->

# Golden Journeys

Golden Journeys protect **cross-capability end-to-end business continuity**: a meaningful outcome
still works when its component capabilities change. They connect personas, journey context,
observable outcomes, and regression evidence. Relevant Product Definitions decide which journeys
and scenarios are mandatory for their acceptance; [TESTING](../TESTING.md) governs their proof,
including real-browser coverage and Founder UAT where required.

These are an initial evidence-grounded registry, not a completed Journey Gap Audit or a claim of
current test execution. A `CURRENT` registry document may contain planned journeys. Journey status
is descriptive coverage, not a ROADMAP lifecycle, formal acceptance, or a public product promise.

| Status | Meaning |
|---|---|
| `CURRENT` | The bounded journey uses supported, accepted capabilities cited below; full gap-audit and future candidate evidence are not implied. |
| `PARTIAL` | Some of the described continuity is supported; the row identifies a planned, unaccepted, or unverified portion. |
| `PLANNED` | Existing planning material describes the outcome; product definition, authorization, and implementation gates remain required. |
| `GAP_AUDIT_REQUIRED` | Evidence is insufficient to characterize support safely; audit must resolve the gap before it can become an acceptance commitment. |

Reuse the detailed [Food customer journey](../experience/customer-journey.md) for stage vocabulary
and context; do not duplicate it here. Its 2026-08-18 audit and missing-feature observations are
historical supporting evidence, not current-state authority. Newer accepted IMP-036B/C artifacts
govern account, address, coordinate serviceability, and commerce behavior. [ROADMAP](../ROADMAP.md),
[STATE](../STATE.md), and relevant capability artifacts always govern per-slice lifecycle.

| Golden Journey / journey reference | Personas | Status | Business continuity and explicit boundary | Evidence |
|---|---|---|---|---|
| `GJ-FIRST-ORDER` / `JOURNEY-FIRST-ORDER` — First successful customer order | `PERSONA-CUSTOMER` | `CURRENT` | Discover and configure items → Cart → authentication/address/serviceability → review/pay → a real Order confirmation and history. Browser payment feedback alone cannot establish success. This covers the accepted customer path, not public-GTM readiness. | [IMP-036C §§1–4](../capabilities/IMP-036C-customer-commerce-experience-v2.md); [IMP-036B](../capabilities/IMP-036B-customer-account-onboarding-address-location.md); detailed [Food journey](../experience/customer-journey.md). |
| `GJ-RETURNING-ORDER` / `JOURNEY-RETURNING-ORDER` — Returning customer order / Order Again | `PERSONA-CUSTOMER` | `PARTIAL` | A returning customer can use account/history/saved addresses and make a new order through current commerce. The separate Order Again operation is a later planning concept, not an accepted shortcut; any future operation must create current purchase intent and revalidate, never replay an old Checkout Snapshot as payable truth. | Accepted [IMP-036B §1](../capabilities/IMP-036B-customer-account-onboarding-address-location.md) and [IMP-036C](../capabilities/IMP-036C-customer-commerce-experience-v2.md); supporting [Food planning lock, family G](../experience/food-direct-product-architecture-lock.md). |
| `GJ-AVAILABILITY` / `JOURNEY-AVAILABILITY` — Availability change reaches the customer | `PERSONA-WORKFORCE-OPERATOR`, `PERSONA-CUSTOMER` | `CURRENT` | Permitted Variant/Modifier availability change → customer sees authoritative availability and orderability on a fresh read/evaluation. IMP-036C customer presentation is accepted; IMP-036E Store Operations is COMPLETE_AND_ACCEPTED, so availability change → customer fresh-read/evaluation continuity is accepted through those authorities. This row promises no push update, stock reservation, or new propagation timing guarantee. | [IMP-036E §5](../capabilities/IMP-036E-store-operations-management.md); [IMP-036C §§2, 4](../capabilities/IMP-036C-customer-commerce-experience-v2.md). |
| `GJ-PRODUCT-MENU-LAUNCH` / `JOURNEY-PRODUCT-MENU-LAUNCH` — Product/menu launch | `PERSONA-WORKFORCE-OPERATOR`, `PERSONA-CUSTOMER` | `PLANNED` | Intended continuity: authorized commercial configuration → appropriate Menu organization and outlet context → customer discovery/orderability. IMP-036F is the CURRENT activated product slice, but formal lifecycle remains PLANNED; Product Definition is NOT_CREATED; architecture is NOT_LOCKED; implementation is NOT_AUTHORIZED / NOT_STARTED. The actual IMP-036F acceptance slice remains to be defined through PD-1; no new publish lifecycle, media-upload support, monetary policy, or bulk semantics is inferred. | [Planned IMP-036F contract](../experience/enterprise-experience/IMP-036F-catalog-menu-pricing-promotions.md); [ROADMAP](../ROADMAP.md) / [STATE](../STATE.md) (activation authority). |
| `GJ-STORE-PAUSE-RESUME` / `JOURNEY-STORE-PAUSE-RESUME` — Store pause/resume | `PERSONA-WORKFORCE-OPERATOR`, `PERSONA-CUSTOMER` | `CURRENT` | Permitted operator pauses/resumes an Outlet → operational eligibility is reflected in subsequent serviceability/order evaluation. Resume does not override schedule or suspension rules. IMP-036E Store Operations (including the Store workspace) is COMPLETE_AND_ACCEPTED. | [IMP-036E §6](../capabilities/IMP-036E-store-operations-management.md); [IMP-036B §4.1](../capabilities/IMP-036B-customer-account-onboarding-address-location.md). |
| `GJ-PERMITTED-OUTLET-ACCESS` / `JOURNEY-PERMITTED-OUTLET-ACCESS` — Workforce member gets permitted outlet access | `PERSONA-WORKFORCE-OPERATOR` | `CURRENT` | An authorized administrator manages an existing workforce identity's membership and role assignment within the delegation ceiling → the member reaches permitted applications/resources; other scopes and unauthorized actions remain denied. This covers accepted Administration and portal navigation, without promising invitation delivery or a new provisioning flow. | [IMP-035 §§5, 7](../capabilities/IMP-035-initial-administration-capabilities.md); [IMP-036A §§5, 9](../capabilities/IMP-036A-multi-portal-experience-foundation.md); [D-373](../decision-register.md). |
| `GJ-PAYMENT-RECOVERY` / `JOURNEY-PAYMENT-RECOVERY` — Payment failure/retry | `PERSONA-CUSTOMER` | `CURRENT` | Authoritative FAILED Attempt + OPEN Payment permits retry against the same immutable Checkout or an explicit Start a new order. Unresolved payment blocks retry/new payment/new order; eventual success must follow authoritative Payment and Order truth. Failed-payment customer history remains deferred. | [IMP-036C §8](../capabilities/IMP-036C-customer-commerce-experience-v2.md); [D-361–D-363](../decision-register.md). |
| `GJ-CANCELLATION-REFUND` / `JOURNEY-CANCELLATION-REFUND` — Workforce cancellation/refund handling | `PERSONA-WORKFORCE-OPERATOR`, `PERSONA-CUSTOMER` | `CURRENT` | Authorized workforce handles the permitted Order cancellation and, independently where appropriate, Refund action/status. Separate permissions, amount limits and recovery apply; cancellation never silently triggers Refund, and Refund never rewrites Payment success. Customer self-service cancellation/refund is outside this bounded journey. | [IMP-036D §§5–7, 9](../capabilities/IMP-036D-workforce-franchise-operations-v2.md); [D-357, D-364](../decision-register.md); cancellation deferral in [VISION §8](../VISION.md). |
| `GJ-TRADING-HOURS` / `JOURNEY-TRADING-HOURS` — Trading-hours change | `PERSONA-WORKFORCE-OPERATOR`, `PERSONA-CUSTOMER` | `CURRENT` | Authorized valid schedule replacement → effective operating state → subsequent customer eligibility evaluation. Include closed-day/overnight context using existing schedule semantics; no new schedule state is implied. IMP-036E Store Operations is COMPLETE_AND_ACCEPTED. | [IMP-036E §§6–7](../capabilities/IMP-036E-store-operations-management.md); [IMP-036B §4.1](../capabilities/IMP-036B-customer-account-onboarding-address-location.md). |
| `GJ-ADDRESS-SERVICEABILITY` / `JOURNEY-ADDRESS-SERVICEABILITY` — Address/serviceability change | `PERSONA-CUSTOMER`, `PERSONA-WORKFORCE-OPERATOR` | `CURRENT` | Customer address/location change → coordinate-based serviceability → Checkout re-evaluation is accepted in IMP-036B/C. Store distance-policy editing extends this continuity through accepted IMP-036E Store Operations. Postal/PIN metadata, a map, and provider cost never determine geographic eligibility or payable truth. | [IMP-036B §§1, 4.1–5](../capabilities/IMP-036B-customer-account-onboarding-address-location.md); [IMP-036C §§2–4](../capabilities/IMP-036C-customer-commerce-experience-v2.md); [IMP-036E §8](../capabilities/IMP-036E-store-operations-management.md). |

At the Product Definition Gate, record the selected `GJ-...` identifiers, covered story/AC IDs,
entry/preconditions, observable end outcome, material alternate/failure paths, and required evidence.
An unsupported part must be explicitly deferred, excluded by design, or stopped for a material
product decision; a planned row cannot silently become mandatory implemented scope.

The Journey Gap Audit of previously implemented journeys is required before **public GTM cutover /
IMP-040 acceptance**. It must reconcile evidence, gaps, owners and dispositions; Session 1 does not
perform it. Existing acceptance is not rewritten by registry statuses or future audit findings.

```text
PRODUCT_DELIVERY_PROCESS_EFFECTIVE_FROM = IMP-036F
HISTORICAL_ACCEPTED_IMPS_REWRITTEN = NO
IMP036E_LIFECYCLE_CHANGED = NO
IMP036F_ACTIVATED = YES
```

Activation truth is owned only by [`ROADMAP.md`](../ROADMAP.md) / [`STATE.md`](../STATE.md)
(`IMP036F_ACTIVATED`). This supporting registry must not contradict that truth and does not
independently activate a product slice.
