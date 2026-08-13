/**
 * Provider-neutral clientAction interpretation (IMP-025).
 * Uses only the accepted `{ kind, payload }` shape.
 */
import type { CommerceClientAction } from "@/lib/customer-commerce";

export function redirectUrlFromClientAction(
  action: CommerceClientAction | undefined,
): string | null {
  if (!action || typeof action.kind !== "string") return null;
  if (action.kind.toLowerCase() !== "redirect") return null;
  const url = action.payload?.url;
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function isZeroPayableTotal(grandTotalPaise: string | undefined): boolean {
  if (grandTotalPaise === undefined) return false;
  try {
    return BigInt(grandTotalPaise) === BigInt(0);
  } catch {
    return grandTotalPaise === "0";
  }
}
