<!-- governance-meta
{
  "status": "CANDIDATE",
  "authority": "IMPLEMENTATION_EVIDENCE_CANDIDATE",
  "slice": "IMP-036H",
  "tranche": "IMP-036H-F",
  "claim": "IMPLEMENTATION_COMPLETE_CANDIDATE_INDEPENDENT_REVIEW_PASS",
  "accepted": false,
  "implementationCompleteAsCurrentTruth": false,
  "note": "ROADMAP/STATE tip will record IMP036H_IMPLEMENTATION_COMPLETE=YES / ACCEPTED=NO after governance persistence; this file remains evidence artifact not acceptance authority. Independently tested candidate remains 649b7848… (not the governance persistence commit).",
  "founderUatPass": false,
  "lastReviewed": "2026-09-24"
}
-->

# IMP-036H-F — Implementation evidence candidate

```text
CLAIM: IMPLEMENTATION_COMPLETE_CANDIDATE — INDEPENDENT REVIEW PASS
NOT: COMPLETE_AND_ACCEPTED
NOT: FOUNDER_UAT = PASS
NOT: IMP036H_ACCEPTED = YES
NOTE: ROADMAP/STATE tip records IMP036H_IMPLEMENTATION_COMPLETE = YES with ACCEPTED = NO
      after GTM-R146 / STATE-R144 governance persistence; this file is evidence, not acceptance authority.
INDEPENDENTLY_TESTED_CANDIDATE_HEAD = 649b7848f99918f927da4a77e98cd81cdc146e6b
INDEPENDENTLY_TESTED_CANDIDATE_TREE = b272adf40f89b0011fff07bf4d6b6d0d735df68a
INDEPENDENTLY_TESTED_CANDIDATE_FINGERPRINT = c2bc6a91ce536329bec0ad4af4d3264a5a39904d035af28442071b4e96e2f56a
IMP036H_INDEPENDENT_IMPLEMENTATION_REVIEW = PASS
IMP036H_INDEPENDENT_IMPLEMENTATION_REVIEW_ID = 5302239433
IMP036H_IMPLEMENTATION_EVIDENCE = PR#246 comment 5810833593
IMP036H_AUTOMATED_ACCEPTANCE = 42/42 PASS
FOUNDER_UAT = NOT_PERFORMED
FORMAL_ACCEPTANCE = NOT_PERFORMED
NOT: IMP-036I activated
```

This artifact records **implementation-complete candidate** automated proof for AC-036H-001…042
after remediation (workforce customer verification, FD recipient exemption, notification wording,
golden journeys, E2E geolocation/keyboard, Operations E2E identity isolation, Delivery golden
canonical lifecycle, and mobile projects). Independent implementation review = **PASS**
(`5302239433`). Founder UAT remains `NOT_PERFORMED`. Formal acceptance remains `NOT_PERFORMED`.
The independently tested candidate is HEAD `649b7848…` — not any later governance-persistence commit.

## Provenance (exact remediation candidate)

```text
CANONICAL_REPOSITORY_PATH = /home/ajoshi/repos/boba-bear-platform
BRANCH = imp036h-f-evidence-candidate
PR = https://github.com/nivedhya11/bobabear-platform/pull/246
PRIOR_REVIEWED_HEAD = 1e89635dc729f588e2ae6f0f4a18949a7dbd6c85
INDEPENDENT_REVIEWS = 5300490595, 5301178549
BASE_MAIN = 9df6b7ae

FINAL_CANDIDATE_SHA: 649b7848f99918f927da4a77e98cd81cdc146e6b
FINAL_CANDIDATE_TREE: b272adf40f89b0011fff07bf4d6b6d0d735df68a
FINAL_CANDIDATE_FINGERPRINT: c2bc6a91ce536329bec0ad4af4d3264a5a39904d035af28442071b4e96e2f56a
PROVENANCE_COMMENT: 5810833593
INDEPENDENT_IMPLEMENTATION_REVIEW_ID: 5302239433
AUTOMATED_ACCEPTANCE: 42/42 PASS
```

Do not treat HEAD/TREE/fingerprint literals in this file as authoritative after further commits.
The PR top-level `IMP036H_EXACT_IMPLEMENTATION_CANDIDATE_EVIDENCE` comment is the exact-candidate
provenance anchor.

## Closure work reflected here

- Operations lifecycle E2E: separate authorized workforce identities
  (`workforce.lifecycle`, `workforce.pickupDesktop`, `workforce.pickupMobile`) so each Playwright
  path can independently complete first-login password change + TOTP enrollment without relying on
  test order.
- Delivery golden IT: canonical path
  `accept → createDelivery → beginBooking → BOOKED → confirmPickup →
  confirmDeliveryWithFulfilCoordination → Order FULFILLED` (no direct `fulfilOrder` from the golden
  test).
- Pickup golden IT: preserved
  (`accept → handover fulfil → FULFILLED`; Delivery rows = 0; createDelivery rejected; provider I/O = 0).

## AC coverage matrix (honest candidate status)

| AC | Summary | Evidence owner | Status |
|---|---|---|---|
| 001 | Delivery golden journey | `order.delivery-golden-journey.integration.test.ts` (canonical Delivery lifecycle) | CANDIDATE |
| 002 | Pickup golden journey ASAP | `order.pickup-golden-journey.integration.test.ts` + E2E Pickup | CANDIDATE |
| 003 | Single outlet AUTO_SELECT | domain + `CheckoutPickupOutletStep.test.tsx` + E2E | CANDIDATE_PASS (prior) |
| 004 | Multi outlet CUSTOMER_SELECT | domain + outlet step component | CANDIDATE_PASS (prior) |
| 005 | Pickup-disabled excluded | `checkout.pickup.domain.test.ts` | CANDIDATE_PASS (prior B) |
| 006 | Inactive outlet excluded | same | CANDIDATE_PASS (prior B) |
| 007 | Cart not fulfilable → recoverable | domain AC-007 | CANDIDATE_PASS (prior) |
| 008 | No delivery fee | domain / Postgres | CANDIDATE_PASS (prior B) |
| 009 | Packaging still applies | domain | CANDIDATE_PASS (prior B) |
| 010 | Taxes correct | domain AC-010 | CANDIDATE_PASS (prior) |
| 011 | Coupons/promos | payment.pickup / prior B | CANDIDATE_PASS (prior) |
| 012 | Online payment succeeds | payment.pickup + E2E Pickup | CANDIDATE_PASS (prior) |
| 013 | Zero-payable Pickup | payment.pickup | CANDIDATE_PASS (prior C) |
| 014 | Order materializes once | payment.pickup | CANDIDATE_PASS (prior C) |
| 015 | No Delivery aggregate | delivery.pickup-fail-closed + golden Pickup | CANDIDATE |
| 016 | Delivery create rejected | delivery.pickup-fail-closed + golden Pickup | CANDIDATE |
| 017 | Ops list badge | OperationsOrderListClient (prior E) | CANDIDATE_PASS (prior E) |
| 018 | Ops accept Pickup | Pickup golden + prior E | CANDIDATE |
| 019 | Handover fulfil | Pickup golden + Ops UI | CANDIDATE |
| 020 | Unauthorized fulfil denied | prior E / order-security | CANDIDATE_PASS (prior) |
| 021 | Pre-pay confirmation Pickup facts | E2E review + CustomerOrderFulfilmentPanel | CANDIDATE_PASS (prior) |
| 022 | Customer history/detail Pickup | E2E + projections | CANDIDATE_PASS (prior) |
| 023 | No Delivery tracking Pickup | panel + projections + golden | CANDIDATE |
| 024 | Delivery→Pickup recalculates | domain | CANDIDATE_PASS (prior B) |
| 025 | Pickup→Delivery needs destination | domain AC-025 | CANDIDATE_PASS (prior) |
| 026 | Mutation after payment-pending fails | domain AC-026 | CANDIDATE_PASS (prior) |
| 027 | Cancel/refund; no no-show penalty | `order.pickup-cancel-refund.test.ts` | CANDIDATE_PASS (prior) |
| 028 | Financial documents | financial-document-pickup IT (+ DELIVERY absent-recipients negative) | CANDIDATE |
| 029 | Notifications Pickup-aware wording | `customer-visible-content` + `order.pickup-notifications.test.ts` | CANDIDATE |
| 030 | No Maps / geolocation on Pickup | E2E `addInitScript` geo counters + Maps spy | CANDIDATE |
| 031 | Delivery E2E green | customer-ordering Delivery path | CANDIDATE |
| 032 | Zero eligible → unavailable UX | domain + outlet step | CANDIDATE_PASS (prior) |
| 033 | Eligible = accepting + cart | domain | CANDIDATE_PASS (prior B) |
| 034–036 | Operating-state exclusions | domain | CANDIDATE_PASS (prior B) |
| 037 | Leaves accepting before pay | domain prepare pause | CANDIDATE_PASS (prior B) |
| 038 | Merchandise unavailable before pay | domain AC-038 | CANDIDATE_PASS (prior) |
| 039 | V1 handover = confirmation + customer identity | Ops detail customer verification + dialog copy | CANDIDATE |
| 040 | Handover mismatch safety | `order.pickup-handover-mismatch.test.ts` cross-order | CANDIDATE |
| 041 | Customer fulfilment a11y | E2E Tab/Enter/Space + component tests | CANDIDATE |
| 042 | Workforce handover a11y | Ops lifecycle desktop+mobile Pickup + isolated identities | CANDIDATE |

```text
total_ac: 42
candidate_automated_claimed: 42
automated_acceptance: 42/42 PASS (independent review 5302239433)
failed: 0
uncovered: 0 (owners assigned)
founder_uat_supplement: YES (required before COMPLETE_AND_ACCEPTED)
IMPLEMENTATION_COMPLETE_CANDIDATE: INDEPENDENT REVIEW PASS
IMP036H_IMPLEMENTATION_COMPLETE: YES (ROADMAP/STATE tip; this file is evidence only)
IMP036H_ACCEPTED: NO
FOUNDER_UAT: NOT_PERFORMED
FORMAL_ACCEPTANCE: NOT_PERFORMED
INDEPENDENTLY_TESTED_CANDIDATE: 649b7848… (not governance-persistence commit)
```

## Notes

- Notification Meta/WhatsApp templates remain empty-variable foundation. AC-029 asserts platform
  `renderCustomerVisibleNotificationContent` Pickup ORDER_ACCEPTED wording and
  `customerVisibleContent` on prepare-send when `orderId` resolves Snapshot fulfilmentMode.
- FD Option A: absent recipients allowed only when sealed Snapshot.fulfilmentMode = PICKUP;
  DELIVERY + null recipients → `RECIPIENT_PARTICULARS_REQUIRED`.
- Founder UAT must exercise the exact merged candidate (HEAD + fingerprint) before acceptance.
- Do **not** treat this file as ROADMAP/STATE truth for IMP-036H complete.
