/**
 * Unified delivery location context — sessionStorage (IMP-036B).
 *
 * Coordinates are the Serviceability authority; postalCode is optional address metadata.
 */
import { useSyncExternalStore } from "react";

import { BUSINESS } from "@/lib/site";

import { compactDeliveryDisplayLabel } from "./display-label";

const STORAGE_KEY = "boba.delivery-context.v1";
const LEGACY_PIN_KEY = "boba.delivery-pin.v1";
const CONTEXT_EVENT = "boba-bear:delivery-context";

export type DeliveryContextSource =
  | "manual_pin"
  | "saved_address"
  | "device_location"
  | "location_search";

export type DeliveryCoordinates = Readonly<{
  latitude: string;
  longitude: string;
}>;

export type DeliveryContext = Readonly<{
  postalCode: string;
  displayLabel: string;
  source: DeliveryContextSource;
  savedAddressId?: string;
  coordinates?: DeliveryCoordinates | null;
}>;

export const DEFAULT_DELIVERY_CONTEXT: DeliveryContext = Object.freeze({
  postalCode: "",
  displayLabel: "",
  source: "location_search",
  coordinates: null,
});

const EMPTY_CONTEXT = DEFAULT_DELIVERY_CONTEXT;

let cachedSnapshot: DeliveryContext = DEFAULT_DELIVERY_CONTEXT;
let cachedSnapshotKey = "";

function invalidateDeliveryContextSnapshot(): void {
  cachedSnapshotKey = "";
}

function deliveryContextSnapshot(): DeliveryContext {
  const next = readStoredContext();
  const nextKey = JSON.stringify(next);
  if (nextKey === cachedSnapshotKey) return cachedSnapshot;
  cachedSnapshotKey = nextKey;
  cachedSnapshot = next;
  return cachedSnapshot;
}

function canUseSessionStorage(): boolean {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function isValidPin(value: string): boolean {
  return /^\d{6}$/.test(value);
}

function parseCoordinates(raw: unknown): DeliveryCoordinates | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.latitude !== "string" || typeof obj.longitude !== "string") return null;
  const lat = Number.parseFloat(obj.latitude);
  const lng = Number.parseFloat(obj.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return Object.freeze({ latitude: obj.latitude, longitude: obj.longitude });
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
      : "location_search";
  const savedAddressId =
    typeof obj.savedAddressId === "string" && obj.savedAddressId.length > 0
      ? obj.savedAddressId
      : undefined;
  const coordinates = parseCoordinates(obj.coordinates);
  return Object.freeze({ postalCode, displayLabel, source, savedAddressId, coordinates });
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
    if (
      context.postalCode.length === 0 &&
      context.displayLabel.length === 0 &&
      !context.coordinates
    ) {
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

/** Hydration-safe delivery context for client components. */
export function useDeliveryContext(): DeliveryContext {
  return useSyncExternalStore(
    subscribeToDeliveryContext,
    deliveryContextSnapshot,
    () => DEFAULT_DELIVERY_CONTEXT,
  );
}

export function writeDeliveryContext(
  patch: Readonly<{
    postalCode?: string;
    displayLabel?: string;
    source?: DeliveryContextSource;
    savedAddressId?: string;
    coordinates?: DeliveryCoordinates | null;
  }>,
): DeliveryContext {
  const current = readStoredContext();
  const postalCode =
    patch.postalCode !== undefined
      ? isValidPin(patch.postalCode) ? patch.postalCode : ""
      : current.postalCode;
  const displayLabel =
    patch.displayLabel !== undefined
      ? patch.displayLabel
      : postalCode.length === 6
        ? postalCode
        : current.displayLabel;
  const source = patch.source ?? current.source;
  const savedAddressId = patch.savedAddressId ?? current.savedAddressId;
  const coordinates =
    patch.coordinates !== undefined ? patch.coordinates : current.coordinates ?? null;
  const next = Object.freeze({ postalCode, displayLabel, source, savedAddressId, coordinates });
  invalidateDeliveryContextSnapshot();
  persistContext(next);
  publishDeliveryContext(next);
  return next;
}

export function readDeliveryContextCoordinates(): DeliveryCoordinates | null {
  return readStoredContext().coordinates ?? null;
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
  if (context.displayLabel.trim().length > 0) {
    return compactDeliveryDisplayLabel(context.displayLabel);
  }
  if (context.postalCode.length === 6) return context.postalCode;
  return BUSINESS.locality;
}

/** Full geographic label for selector/detail surfaces (not header chrome). */
export function deliveryContextDetailLabel(context: DeliveryContext): string {
  if (context.displayLabel.trim().length > 0) return context.displayLabel.trim();
  if (context.postalCode.length === 6) return context.postalCode;
  return BUSINESS.locality;
}

export function resetDeliveryContextSnapshotForTests(): void {
  cachedSnapshot = DEFAULT_DELIVERY_CONTEXT;
  cachedSnapshotKey = "";
}
