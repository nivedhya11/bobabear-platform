<!-- governance-meta
{
  "status": "CANDIDATE",
  "authority": "IMPLEMENTATION_EVIDENCE_CANDIDATE",
  "slice": "IMP-036H",
  "tranche": "IMP-036H-F",
  "claim": "IMPLEMENTATION_COMPLETE_CANDIDATE_PENDING_VERIFICATION",
  "accepted": false,
  "implementationCompleteAsCurrentTruth": false,
  "founderUatPass": false,
  "lastReviewed": "2026-09-24"
}
-->

# IMP-036H-F — Implementation evidence candidate

```text
CLAIM: IMPLEMENTATION_COMPLETE_CANDIDATE — PENDING VERIFICATION
NOT: IMPLEMENTATION_COMPLETE
NOT: COMPLETE_AND_ACCEPTED
NOT: FOUNDER_UAT = PASS
NOT: IMP036H_IMPLEMENTATION_COMPLETE = YES (ROADMAP/STATE CURRENT truth unchanged)
NOT: IMP-036I activated
```

This artifact records **candidate** automated proof for AC-036H-001…042 after remediation of
workforce customer verification, FD recipient exemption, notification wording, golden journeys,
E2E geolocation/keyboard, and mobile projects. Independent technical review and Founder UAT remain
required before acceptance reconciliation.

## Provenance (exact remediation candidate)

```text
CANONICAL_REPOSITORY_PATH = /home/ajoshi/repos/boba-bear-platform
BRANCH = imp036h-f-evidence-candidate
HEAD = caf58fb204174f8526659194d7572adb2d12473f
TREE = 3a75a78ed9079484c1feb25ef0fc87a1db20da26
WORKING_TREE_FINGERPRINT = ac1f7c2938a23f120cac87f8848c4db62c54fab0593d8119508349814803f8b0
PR = https://github.com/nivedhya11/bobabear-platform/pull/246
PRIOR_REVIEWED_HEAD = 7cb910b0a3cc36cab05e4e7d0ee0fd59ddf8c607
PRIOR_INDEPENDENT_REVIEW = 5300490595
BASE_MAIN = 9df6b7ae
```

## AC coverage matrix (honest candidate status)

| AC | Summary | Evidence owner | Status |
|---|---|---|---|
| 001 | Delivery golden journey | `order.delivery-golden-journey.integration.test.ts` + E2E Delivery | CANDIDATE (IT added; E2E prior) |
| 002 | Pickup golden journey ASAP | `order.pickup-golden-journey.integration.test.ts` + E2E Pickup | CANDIDATE (IT added; E2E prior) |
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
| 015 | No Delivery aggregate | delivery.pickup-fail-closed + golden Pickup | CANDIDATE (strengthened) |
| 016 | Delivery create rejected | delivery.pickup-fail-closed + golden Pickup | CANDIDATE (strengthened) |
| 017 | Ops list badge | OperationsOrderListClient (prior E) | CANDIDATE_PASS (prior E) |
| 018 | Ops accept Pickup | Pickup golden + prior E | CANDIDATE (strengthened) |
| 019 | Handover fulfil | Pickup golden + Ops UI | CANDIDATE (strengthened) |
| 020 | Unauthorized fulfil denied | prior E / order-security | CANDIDATE_PASS (prior) |
| 021 | Pre-pay confirmation Pickup facts | E2E review + CustomerOrderFulfilmentPanel | CANDIDATE_PASS (prior) |
| 022 | Customer history/detail Pickup | E2E + projections | CANDIDATE_PASS (prior) |
| 023 | No Delivery tracking Pickup | panel + projections + golden | CANDIDATE (strengthened) |
| 024 | Delivery→Pickup recalculates | domain | CANDIDATE_PASS (prior B) |
| 025 | Pickup→Delivery needs destination | domain AC-025 | CANDIDATE_PASS (prior) |
| 026 | Mutation after payment-pending fails | domain AC-026 | CANDIDATE_PASS (prior) |
| 027 | Cancel/refund; no no-show penalty | `order.pickup-cancel-refund.test.ts` | CANDIDATE_PASS (prior) |
| 028 | Financial documents | financial-document-pickup IT (+ DELIVERY absent-recipients negative) | CANDIDATE (strengthened) |
| 029 | Notifications Pickup-aware wording | `customer-visible-content` + `order.pickup-notifications.test.ts` + prepare-send wiring | CANDIDATE (remediated; run pending) |
| 030 | No Maps / geolocation on Pickup | E2E `addInitScript` geo counters + Maps spy | CANDIDATE (remediated; E2E run pending) |
| 031 | Delivery E2E green | customer-ordering Delivery path | CANDIDATE_PASS (prior; re-run pending) |
| 032 | Zero eligible → unavailable UX | domain + outlet step | CANDIDATE_PASS (prior) |
| 033 | Eligible = accepting + cart | domain | CANDIDATE_PASS (prior B) |
| 034–036 | Operating-state exclusions | domain | CANDIDATE_PASS (prior B) |
| 037 | Leaves accepting before pay | domain prepare pause | CANDIDATE_PASS (prior B) |
| 038 | Merchandise unavailable before pay | domain AC-038 | CANDIDATE_PASS (prior) |
| 039 | V1 handover = confirmation + customer identity | Ops detail customer verification + dialog copy | CANDIDATE (remediated; unit/IT pending) |
| 040 | Handover mismatch safety | `order.pickup-handover-mismatch.test.ts` cross-order | CANDIDATE (strengthened; run pending) |
| 041 | Customer fulfilment a11y | E2E Tab/Enter/Space + component tests | CANDIDATE (remediated; E2E run pending) |
| 042 | Workforce handover a11y | Ops detail keyboard + ops-lifecycle mobile Pickup seed | CANDIDATE (seed+spec added; E2E run pending) |

```text
total_ac: 42
candidate_automated_claimed: 42
verification_pending: PARTIAL
  - unit/IT green (this remediation): customer-visible-content, OperationsOrderDetailClient,
    orders.parse customer, pickup projections, handover mismatch (+cross-order), notifications
    wording, Pickup/Delivery golden journeys, financial-document-pickup (+DELIVERY absent)
  - E2E not re-executed here (customer-ordering geo/keyboard/mobile; operations-lifecycle Pickup seed)
failed: 0 (among executed targeted suites)
uncovered: 0 (owners assigned)
founder_uat_supplement: YES (required before COMPLETE_AND_ACCEPTED)
IMPLEMENTATION_COMPLETE_CANDIDATE: PENDING until E2E verification + provenance filled after final commit
```

## Notes

- Notification Meta/WhatsApp templates remain empty-variable foundation. AC-029 now also asserts
  platform `renderCustomerVisibleNotificationContent` Pickup ORDER_ACCEPTED wording and
  `customerVisibleContent` on prepare-send when `orderId` resolves Snapshot fulfilmentMode.
- FD Option A: absent recipients allowed only when sealed Snapshot.fulfilmentMode = PICKUP;
  DELIVERY + null recipients → `RECIPIENT_PARTICULARS_REQUIRED`.
- Founder UAT must exercise the exact merged candidate (HEAD + fingerprint) before acceptance.
- Do **not** treat this file as ROADMAP/STATE truth for IMP-036H complete.
