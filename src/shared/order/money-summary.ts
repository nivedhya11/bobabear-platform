/**
 * Customer order monetary summary from immutable checkout snapshot (IMP-036C).
 */

import type { CheckoutSnapshot } from "../../shared/checkout";
import { serializeMoneyMinor } from "./canonicalize";

export type OrderMoneySummaryCharge = Readonly<{
  chargeCode: string;
  name: string;
  amountMinor: string;
}>;

export type OrderMoneySummary = Readonly<{
  prePromotionSubtotalMinor: string;
  promotionDiscountMinor: string;
  charges: readonly OrderMoneySummaryCharge[];
  taxMinor: string;
  grandTotalMinor: string;
  currency: "INR";
}>;

export function moneySummaryFromSnapshot(snapshot: CheckoutSnapshot): OrderMoneySummary {
  return Object.freeze({
    prePromotionSubtotalMinor: serializeMoneyMinor(snapshot.prePromotionSubtotalPaise),
    promotionDiscountMinor: serializeMoneyMinor(snapshot.promotionDiscountPaise),
    charges: Object.freeze(
      snapshot.charges.map((charge) =>
        Object.freeze({
          chargeCode: charge.chargeCode,
          name: charge.name,
          amountMinor: serializeMoneyMinor(charge.amountPaise),
        }),
      ),
    ),
    taxMinor: serializeMoneyMinor(snapshot.taxPaise),
    grandTotalMinor: serializeMoneyMinor(snapshot.grandTotalPaise),
    currency: "INR",
  });
}
