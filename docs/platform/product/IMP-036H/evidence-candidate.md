<!-- governance-meta
{
  "status": "CANDIDATE",
  "authority": "IMPLEMENTATION_EVIDENCE_CANDIDATE",
  "slice": "IMP-036H",
  "tranche": "IMP-036H-F",
  "claim": "IMPLEMENTATION_COMPLETE_CANDIDATE",
  "accepted": false,
  "implementationCompleteAsCurrentTruth": false,
  "founderUatPass": false,
  "lastReviewed": "2026-09-24"
}
-->

# IMP-036H-F — Implementation evidence candidate

```text
CLAIM: IMPLEMENTATION_COMPLETE_CANDIDATE
NOT: COMPLETE_AND_ACCEPTED
NOT: FOUNDER_UAT = PASS
NOT: IMP036H_IMPLEMENTATION_COMPLETE = YES (ROADMAP/STATE CURRENT truth unchanged)
NOT: IMP-036I activated
```

This artifact records **candidate** automated proof for AC-036H-001…042. Independent
technical review and Founder UAT remain required before acceptance reconciliation.

## AC coverage matrix (candidate)

| AC | Summary | Evidence owner | Status |
|---|---|---|---|
| 001 | Delivery golden journey | `tests/e2e/customer-ordering.spec.ts` (select Delivery first) | CANDIDATE_PASS |
| 002 | Pickup golden journey ASAP | same + Pickup path; seed `OutletPickupProfile` | CANDIDATE_PASS |
| 003 | Single outlet AUTO_SELECT | domain + `CheckoutPickupOutletStep.test.tsx` + E2E | CANDIDATE_PASS |
| 004 | Multi outlet CUSTOMER_SELECT | domain + outlet step component | CANDIDATE_PASS |
| 005 | Pickup-disabled excluded | `checkout.pickup.domain.test.ts` | CANDIDATE_PASS (prior B) |
| 006 | Inactive outlet excluded | same | CANDIDATE_PASS (prior B) |
| 007 | Cart not fulfilable → recoverable | domain AC-007 (assortment exclude) | CANDIDATE_PASS |
| 008 | No delivery fee | domain / Postgres | CANDIDATE_PASS (prior B) |
| 009 | Packaging still applies | domain | CANDIDATE_PASS (prior B) |
| 010 | Taxes correct | domain AC-010 | CANDIDATE_PASS |
| 011 | Coupons/promos | payment.pickup / prior B | CANDIDATE_PASS (prior) |
| 012 | Online payment succeeds | payment.pickup + E2E Pickup | CANDIDATE_PASS |
| 013 | Zero-payable Pickup | payment.pickup | CANDIDATE_PASS (prior C) |
| 014 | Order materializes once | payment.pickup | CANDIDATE_PASS (prior C) |
| 015 | No Delivery aggregate | delivery.pickup-fail-closed + notify gate | CANDIDATE_PASS |
| 016 | Delivery create rejected | delivery.pickup-fail-closed | CANDIDATE_PASS (prior C) |
| 017 | Ops list badge | OperationsOrderListClient (prior E) | CANDIDATE_PASS |
| 018 | Ops accept Pickup | prior E / order harness | CANDIDATE_PASS |
| 019 | Handover fulfil | prior E + notify accept/fulfil | CANDIDATE_PASS |
| 020 | Unauthorized fulfil denied | prior E / order-security | CANDIDATE_PASS |
| 021 | Pre-pay confirmation Pickup facts | E2E review + CustomerOrderFulfilmentPanel | CANDIDATE_PASS |
| 022 | Customer history/detail Pickup | E2E + projections | CANDIDATE_PASS |
| 023 | No Delivery tracking Pickup | panel + projections | CANDIDATE_PASS |
| 024 | Delivery→Pickup recalculates | domain | CANDIDATE_PASS (prior B) |
| 025 | Pickup→Delivery needs destination | domain AC-025 | CANDIDATE_PASS |
| 026 | Mutation after payment-pending fails | domain AC-026 | CANDIDATE_PASS |
| 027 | Cancel/refund; no no-show penalty | `order.pickup-cancel-refund.test.ts` | CANDIDATE_PASS |
| 028 | Financial documents | financial-document-pickup IT (prior C) | CANDIDATE_PASS |
| 029 | Notifications Pickup-aware gating | `order.pickup-notifications.test.ts` | CANDIDATE_PASS |
| 030 | No Maps on Pickup | E2E request spy + component | CANDIDATE_PASS |
| 031 | Delivery E2E green | customer-ordering Delivery path | CANDIDATE_PASS |
| 032 | Zero eligible → unavailable UX | domain + outlet step | CANDIDATE_PASS |
| 033 | Eligible = accepting + cart | domain | CANDIDATE_PASS (prior B) |
| 034–036 | Operating-state exclusions | domain | CANDIDATE_PASS (prior B) |
| 037 | Leaves accepting before pay | domain prepare pause | CANDIDATE_PASS (prior B) |
| 038 | Merchandise unavailable before pay | domain AC-038 | CANDIDATE_PASS |
| 039 | V1 handover = confirmation match | OperationsOrderDetailClient (prior E) | CANDIDATE_PASS |
| 040 | Handover mismatch safety | `order.pickup-handover-mismatch.test.ts` | CANDIDATE_PASS |
| 041 | Customer fulfilment a11y | choice/outlet components + E2E focus | CANDIDATE_PASS |
| 042 | Workforce handover a11y | OperationsOrderDetailClient + ops E2E confirm focus | CANDIDATE_PASS |

```text
total_ac: 42
candidate_automated: 42
failed: 0
uncovered: 0
founder_uat_supplement: YES (required before COMPLETE_AND_ACCEPTED)
```

## Notes

- Notification templates remain empty-variable foundation (AF-036H-11). AC-029 is proved by
  **gating**: Pickup accept/fulfil never enqueue `out_for_delivery` / `delivered`; zero Delivery rows.
- Founder UAT must exercise the exact merged candidate (HEAD + fingerprint) before acceptance.
