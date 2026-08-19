/**
 * Optional menu/cart PIN context — presentation helper only, not Cart/Checkout persistence.
 */

const STORAGE_KEY = "boba.delivery-pin.v1";

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function readDeliveryPinContext(): string {
  if (!canUseSessionStorage()) return "";
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    return raw && /^\d{6}$/.test(raw) ? raw : "";
  } catch {
    return "";
  }
}

export function writeDeliveryPinContext(postalCode: string): void {
  if (!canUseSessionStorage()) return;
  try {
    if (/^\d{6}$/.test(postalCode)) {
      window.sessionStorage.setItem(STORAGE_KEY, postalCode);
    } else if (postalCode.length === 0) {
      window.sessionStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    /* sessionStorage may be blocked */
  }
}
