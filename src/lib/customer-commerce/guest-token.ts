/**
 * Guest Cart credential helper (IMP-025).
 *
 * sessionStorage only. Token is Cart authority, not authentication.
 * Format/TTL are backend-owned; this module only persists what transport returns.
 */

const STORAGE_KEY = "boba.guest-cart.v1";

export type GuestCartCredential = Readonly<{
  token: string;
  brandId: string;
  cartId: string;
  revision: string;
}>;

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isCredential(value: unknown): value is GuestCartCredential {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj.token === "string" &&
    obj.token.length > 0 &&
    typeof obj.brandId === "string" &&
    obj.brandId.length > 0 &&
    typeof obj.cartId === "string" &&
    obj.cartId.length > 0 &&
    typeof obj.revision === "string" &&
    obj.revision.length > 0
  );
}

export function readGuestCartCredential(): GuestCartCredential | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isCredential(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeGuestCartCredential(credential: GuestCartCredential): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(credential));
  } catch {
    /* sessionStorage may be blocked */
  }
}

export function rememberGuestCartFromMutation(args: {
  brandId: string;
  cart: Readonly<{ id: string; revision: string; ownerMode?: string }>;
  guestToken?: string;
}): void {
  const existing = readGuestCartCredential();
  const token = args.guestToken ?? existing?.token;
  if (!token) return;
  if (args.cart.ownerMode === "customer") {
    clearGuestCartCredential();
    return;
  }
  writeGuestCartCredential({
    token,
    brandId: args.brandId,
    cartId: args.cart.id,
    revision: args.cart.revision,
  });
}

export function updateGuestCartRevision(revision: string, cartId?: string): void {
  const existing = readGuestCartCredential();
  if (!existing) return;
  writeGuestCartCredential({
    ...existing,
    revision,
    ...(cartId ? { cartId } : {}),
  });
}

export function clearGuestCartCredential(): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function guestCartTokenHeader(
  credential: GuestCartCredential | null = readGuestCartCredential(),
): Readonly<Record<string, string>> {
  if (!credential) return {};
  return { "X-Boba-Guest-Cart-Token": credential.token };
}
