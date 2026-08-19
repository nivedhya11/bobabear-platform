/**
 * Provider-neutral clientAction interpretation (IMP-025 / IMP-026B).
 * Uses only the accepted `{ kind, payload }` shape.
 */
import type { CommerceClientAction } from "@/lib/customer-commerce";
import { RAZORPAY_STANDARD_CHECKOUT_KIND } from "@/lib/razorpay";

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

export type InterpretedClientAction =
  | Readonly<{ kind: "redirect"; url: string }>
  | Readonly<{ kind: typeof RAZORPAY_STANDARD_CHECKOUT_KIND; payload: Readonly<Record<string, string>> }>
  | null;

export function interpretClientAction(
  action: CommerceClientAction | undefined,
): InterpretedClientAction {
  if (!action || typeof action.kind !== "string") return null;
  const kind = action.kind.trim().toLowerCase();
  if (kind === "redirect") {
    const url = redirectUrlFromClientAction(action);
    return url ? Object.freeze({ kind: "redirect", url }) : null;
  }
  if (kind === RAZORPAY_STANDARD_CHECKOUT_KIND) {
    return Object.freeze({
      kind: RAZORPAY_STANDARD_CHECKOUT_KIND,
      payload: action.payload ?? Object.freeze({}),
    });
  }
  return null;
}

export function isZeroPayableTotal(grandTotalPaise: string | undefined): boolean {
  if (grandTotalPaise === undefined) return false;
  try {
    return BigInt(grandTotalPaise) === BigInt(0);
  } catch {
    return grandTotalPaise === "0";
  }
}
