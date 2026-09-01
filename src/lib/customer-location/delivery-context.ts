/**
 * Unified delivery location context — sessionStorage (IMP-036B).
 *
 * Extends the delivery-pin presentation pattern with display label, source,
 * and optional saved-address reference. PIN remains the serviceability key.
 */
import { BUSINESS } from "@/lib/site";

const STORAGE_KEY = "boba.delivery-context.v1";
const LEGACY_PIN_KEY = "boba.delivery-pin.v1";
const CONTEXT_EVENT = "boba-bear:delivery-context";

export type DeliveryContextSource =
  | "manual_pin"
  | "saved_address"
  | "device_location"
  | "location_search";

export type DeliveryContext = Readonly<{
  postalCode: string;
  displayLabel: string;
  source: DeliveryContextSource;
  savedAddressId?: string;
}>;

const EMPTY_CONTEXT: DeliveryContext = Object.freeze({
  postalCode: "",
  displayLabel: "",
  source: "manual_pin",
});

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isValidPin(value: string): boolean {
  return /^\d{6}$/.test(value);
}

function normalizeContext(raw: unknown): DeliveryContext {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return EMPTY_CONTEXT;
  const obj = raw as Record<string, unknown>;
  const postalCode = typeof obj.postalCode === "string" && isValidPin(obj.postalCode) ? obj.postalCode : "";
  const displayLabel = typeof obj.displayLabel === "string" ? obj.displayLabel : "";
  const source =
    obj.source === "saved_address" ||
    obj.source === "device_location" ||
    obj.source === "manual_pin" ||
    obj.source === "location_search"
      ? obj.source
      : "manual_pin";
  const savedAddressId =
    typeof obj.savedAddressId === "string" && obj.savedAddressId.length > 0
      ? obj.savedAddressId
      : undefined;
  return Object.freeze({ postalCode, displayLabel, source, savedAddressId });
}

function readStoredContext(): DeliveryContext {
  if (!canUseSessionStorage()) return EMPTY_CONTEXT;
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (raw) return normalizeContext(JSON.parse(raw));
    const legacyPin = window.sessionStorage.getItem(LEGACY_PIN_KEY);
    if (legacyPin && isValidPin(legacyPin)) {
      return Object.freeze({
        postalCode: legacyPin,
        displayLabel: legacyPin,
        source: "manual_pin",
      });
    }
  } catch {
    /* sessionStorage blocked or corrupt */
  }
  return EMPTY_CONTEXT;
}

function persistContext(context: DeliveryContext): void {
  if (!canUseSessionStorage()) return;
  try {
    if (context.postalCode.length === 0 && context.displayLabel.length === 0) {
      window.sessionStorage.removeItem(STORAGE_KEY);
      window.sessionStorage.removeItem(LEGACY_PIN_KEY);
    } else {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(context));
      if (isValidPin(context.postalCode)) {
        window.sessionStorage.setItem(LEGACY_PIN_KEY, context.postalCode);
      } else {
        window.sessionStorage.removeItem(LEGACY_PIN_KEY);
      }
    }
  } catch {
    /* sessionStorage may be blocked */
  }
}

export function publishDeliveryContext(context: DeliveryContext): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<DeliveryContext>(CONTEXT_EVENT, { detail: context }));
}

export function subscribeToDeliveryContext(onChange: (context: DeliveryContext) => void): () => void {
  const listener = (event: Event) => onChange((event as CustomEvent<DeliveryContext>).detail);
  window.addEventListener(CONTEXT_EVENT, listener);
  return () => window.removeEventListener(CONTEXT_EVENT, listener);
}

export function readDeliveryContext(): DeliveryContext {
  return readStoredContext();
}

export function writeDeliveryContext(
  patch: Readonly<{
    postalCode: string;
    displayLabel?: string;
    source?: DeliveryContextSource;
    savedAddressId?: string;
  }>,
): DeliveryContext {
  const current = readStoredContext();
  const postalCode = isValidPin(patch.postalCode) ? patch.postalCode : "";
  const displayLabel =
    patch.displayLabel !== undefined
      ? patch.displayLabel
      : postalCode.length === 6
        ? postalCode
        : current.displayLabel;
  const source = patch.source ?? current.source;
  const savedAddressId = patch.savedAddressId ?? current.savedAddressId;
  const next = Object.freeze({ postalCode, displayLabel, source, savedAddressId });
  persistContext(next);
  publishDeliveryContext(next);
  return next;
}

/** PIN-only accessor for legacy consumers. */
export function readDeliveryContextPin(): string {
  return readStoredContext().postalCode;
}

export function writeDeliveryContextPin(postalCode: string): DeliveryContext {
  return writeDeliveryContext({
    postalCode,
    displayLabel: isValidPin(postalCode) ? postalCode : "",
    source: "manual_pin",
    savedAddressId: undefined,
  });
}

export function deliveryContextTriggerLabel(context: DeliveryContext): string {
  if (context.displayLabel.trim().length > 0) return context.displayLabel.trim();
  if (context.postalCode.length === 6) return context.postalCode;
  return BUSINESS.locality;
}
