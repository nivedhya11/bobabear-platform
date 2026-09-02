"use client";

import { formatPaise } from "@/components/ordering/format-money";
import type { CommerceCheckoutSnapshot } from "@/lib/customer-commerce";
import { snapshotPayableRows } from "@/components/ordering/checkout-snapshot-presentation";

export type OrderMoneySummaryWire = Readonly<{
  prePromotionSubtotalMinor: string;
  promotionDiscountMinor: string;
  charges: readonly Readonly<{
    chargeCode: string;
    name: string;
    amountMinor: string;
  }>[];
  taxMinor: string;
  grandTotalMinor: string;
  currency: "INR";
}>;

export function OrderMoneySummaryPanel(props: {
  snapshot?: CommerceCheckoutSnapshot | null;
  moneySummary?: OrderMoneySummaryWire | null;
  title?: string;
}) {
  const rows = props.snapshot
    ? snapshotPayableRows(props.snapshot).filter((row) => row.key !== "total")
    : props.moneySummary
      ? buildRowsFromWire(props.moneySummary)
      : [];

  const total =
    props.snapshot?.grandTotalPaise ??
    props.moneySummary?.grandTotalMinor ??
    "0";

  if (rows.length === 0) return null;

  return (
    <section
      className="rounded-xl border border-[var(--border-strong)] bg-[var(--bg-section)] p-4"
      data-testid="order-money-summary"
      aria-label={props.title ?? "Order total"}
    >
      {props.title ? (
        <h2 className="mb-3 font-body text-[15px] font-semibold text-[var(--text-primary)]">
          {props.title}
        </h2>
      ) : null}
      <dl className="flex flex-col gap-2 font-body text-[14px]">
        {rows.map((row) => (
          <div key={row.key} className="flex justify-between gap-4">
            <dt className="text-[var(--text-secondary)]">{row.label}</dt>
            <dd className="font-semibold text-[var(--text-primary)] tabular-nums">
              {formatPaise(row.amountPaise)}
            </dd>
          </div>
        ))}
        <div className="mt-2 flex justify-between gap-4 border-t border-[var(--border-default)] pt-2">
          <dt className="font-semibold text-[var(--text-primary)]">Total payable</dt>
          <dd className="font-bold text-[var(--text-primary)] tabular-nums">
            {formatPaise(total)}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function buildRowsFromWire(summary: OrderMoneySummaryWire): ReadonlyArray<
  Readonly<{ key: string; label: string; amountPaise: string }>
> {
  const rows: Array<{ key: string; label: string; amountPaise: string }> = [
    {
      key: "subtotal",
      label: "Subtotal",
      amountPaise: summary.prePromotionSubtotalMinor,
    },
  ];
  const discount = BigInt(summary.promotionDiscountMinor || "0");
  if (discount > BigInt(0)) {
    rows.push({
      key: "discount",
      label: "Discount",
      amountPaise: summary.promotionDiscountMinor,
    });
  }
  for (const charge of summary.charges) {
    rows.push({
      key: `charge-${charge.chargeCode}`,
      label: charge.name,
      amountPaise: charge.amountMinor,
    });
  }
  if (BigInt(summary.taxMinor || "0") > BigInt(0)) {
    rows.push({
      key: "tax",
      label: "Tax",
      amountPaise: summary.taxMinor,
    });
  }
  return rows;
}
