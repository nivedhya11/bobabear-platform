/**
 * Safe narrowing for Checkout Snapshot charge/tax rows (CLIENT_STATE_MAPPING).
 */

import type { CommerceCheckoutSnapshot } from "@/lib/customer-commerce";

export type SnapshotChargeRow = Readonly<{
  chargeCode: "packaging" | "delivery";
  amountPaise: string;
  name: string;
}>;

export type SnapshotTaxComponentRow = Readonly<{
  taxType: string;
  taxAmountPaise: string;
}>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function chargeCode(value: unknown): "packaging" | "delivery" | null {
  return value === "packaging" || value === "delivery" ? value : null;
}

export function narrowSnapshotCharges(charges: readonly unknown[]): SnapshotChargeRow[] {
  const rows: SnapshotChargeRow[] = [];
  for (const raw of charges) {
    if (!isRecord(raw)) continue;
    const code = chargeCode(raw.chargeCode);
    const amount = raw.amountPaise;
    if (!code || typeof amount !== "string" || amount.length === 0) continue;
    const name = typeof raw.name === "string" && raw.name.length > 0 ? raw.name : chargeLabel(code);
    rows.push({ chargeCode: code, amountPaise: amount, name });
  }
  return rows;
}

export function narrowSnapshotTaxComponents(
  taxComponents: readonly unknown[],
): SnapshotTaxComponentRow[] {
  const rows: SnapshotTaxComponentRow[] = [];
  for (const raw of taxComponents) {
    if (!isRecord(raw)) continue;
    const taxType = typeof raw.taxType === "string" ? raw.taxType : null;
    const taxAmountPaise =
      typeof raw.taxAmountPaise === "string"
        ? raw.taxAmountPaise
        : typeof raw.amountPaise === "string"
          ? raw.amountPaise
          : null;
    if (!taxType || !taxAmountPaise) continue;
    rows.push({ taxType, taxAmountPaise });
  }
  return rows;
}

export function chargeLabel(code: "packaging" | "delivery"): string {
  return code === "packaging" ? "Packaging" : "Delivery";
}

/**
 * Merchandise-only subtotal for customer display.
 *
 * Authoritative `prePromotionSubtotalPaise` already includes charges. Showing that
 * field as "Subtotal" while also itemizing Packaging/Delivery double-counts fees.
 * Display subtotal = prePromotion − chargesPaise (= base + modifiers + bundles).
 */
export function snapshotMerchandiseSubtotalPaise(
  snapshot: Pick<CommerceCheckoutSnapshot, "prePromotionSubtotalPaise" | "chargesPaise">,
): string {
  const pre = BigInt(snapshot.prePromotionSubtotalPaise || "0");
  const charges = BigInt(snapshot.chargesPaise || "0");
  const merchandise = pre - charges;
  return (merchandise < BigInt(0) ? BigInt(0) : merchandise).toString();
}

export function snapshotPayableRows(snapshot: CommerceCheckoutSnapshot): ReadonlyArray<
  Readonly<{ key: string; label: string; amountPaise: string }>
> {
  const rows: Array<{ key: string; label: string; amountPaise: string }> = [
    {
      key: "subtotal",
      label: "Subtotal",
      amountPaise: snapshotMerchandiseSubtotalPaise(snapshot),
    },
  ];

  const discount = BigInt(snapshot.promotionDiscountPaise || "0");
  if (discount > BigInt(0)) {
    rows.push({
      key: "discount",
      label: "Discount",
      amountPaise: snapshot.promotionDiscountPaise,
    });
  }

  for (const charge of narrowSnapshotCharges(snapshot.charges)) {
    rows.push({
      key: `charge-${charge.chargeCode}`,
      label: charge.name,
      amountPaise: charge.amountPaise,
    });
  }

  const taxComponents = narrowSnapshotTaxComponents(snapshot.taxComponents);
  if (taxComponents.length > 0) {
    for (const component of taxComponents) {
      rows.push({
        key: `tax-${component.taxType}`,
        label: component.taxType,
        amountPaise: component.taxAmountPaise,
      });
    }
  } else if (BigInt(snapshot.taxPaise || "0") > BigInt(0)) {
    rows.push({
      key: "tax",
      label: "Tax",
      amountPaise: snapshot.taxPaise,
    });
  }

  rows.push({
    key: "total",
    label: "Total payable",
    amountPaise: snapshot.grandTotalPaise,
  });

  return rows;
}
