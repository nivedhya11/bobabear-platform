/**
 * Short-lived address-editor prefill from selected location evidence.
 * Not a Saved Address until the customer explicitly saves.
 */
const PREFILL_KEY = "boba.address-prefill.v1";

export type AddressPrefillDraft = Readonly<{
  addressLine1: string;
  locality: string;
  city: string;
  stateCode: string;
  postalCode: string;
}>;

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

export function writeAddressPrefillDraft(draft: AddressPrefillDraft): void {
  if (!canUseSessionStorage()) return;
  try {
    window.sessionStorage.setItem(PREFILL_KEY, JSON.stringify(draft));
  } catch {
    /* blocked */
  }
}

export function consumeAddressPrefillDraft(): AddressPrefillDraft | null {
  if (!canUseSessionStorage()) return null;
  try {
    const raw = window.sessionStorage.getItem(PREFILL_KEY);
    if (!raw) return null;
    window.sessionStorage.removeItem(PREFILL_KEY);
    const parsed = JSON.parse(raw) as Partial<AddressPrefillDraft>;
    if (typeof parsed.addressLine1 !== "string") return null;
    return Object.freeze({
      addressLine1: parsed.addressLine1,
      locality: typeof parsed.locality === "string" ? parsed.locality : "",
      city: typeof parsed.city === "string" ? parsed.city : "",
      stateCode: typeof parsed.stateCode === "string" ? parsed.stateCode : "",
      postalCode: typeof parsed.postalCode === "string" ? parsed.postalCode : "",
    });
  } catch {
    return null;
  }
}
