/**
 * Cart presentation helpers — menu/catalog estimates only, not payable authority.
 */

import type { CommerceCart } from "@/lib/customer-commerce";
import type { OrderingCatalogItem } from "@/shared/ordering-catalog";

export function cartUnitCount(cart: CommerceCart | null | undefined): number {
  if (!cart) return 0;
  return cart.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function estimateCartPresentationPaise(
  cart: CommerceCart | null | undefined,
  itemsByVariant: ReadonlyMap<string, OrderingCatalogItem>,
): bigint {
  if (!cart) return BigInt(0);
  let total = BigInt(0);
  for (const line of cart.lines) {
    const item = itemsByVariant.get(line.variantId);
    if (!item) continue;
    const unitPaise = BigInt(Math.round(item.presentationPriceRupees * 100));
    total += unitPaise * BigInt(line.quantity);
  }
  return total;
}

export function formatPresentationEstimateLabel(paise: bigint): string {
  if (paise <= BigInt(0)) return "Menu prices";
  const hundred = BigInt(100);
  const rupees = paise / hundred;
  const fraction = paise % hundred;
  return `₹${rupees.toString()}.${fraction.toString().padStart(2, "0")} (menu prices)`;
}
