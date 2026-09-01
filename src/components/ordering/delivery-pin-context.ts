/**
 * Optional menu/cart PIN context — presentation helper only, not Cart/Checkout persistence.
 *
 * Delegates to unified delivery context (IMP-036B).
 */
import {
  readDeliveryContextPin,
  subscribeToDeliveryContext,
  writeDeliveryContextPin,
} from "@/lib/customer-location/delivery-context";

const PIN_EVENT = "boba-bear:delivery-pin";

export function publishDeliveryPinContext(postalCode: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<string>(PIN_EVENT, { detail: postalCode }));
}

export function subscribeToDeliveryPinContext(onChange: (postalCode: string) => void): () => void {
  const pinListener = (event: Event) => onChange((event as CustomEvent<string>).detail);
  window.addEventListener(PIN_EVENT, pinListener);
  const contextUnsub = subscribeToDeliveryContext((context) => {
    onChange(context.postalCode);
  });
  return () => {
    window.removeEventListener(PIN_EVENT, pinListener);
    contextUnsub();
  };
}

export function readDeliveryPinContext(): string {
  return readDeliveryContextPin();
}

export function writeDeliveryPinContext(postalCode: string): void {
  const context = writeDeliveryContextPin(postalCode);
  publishDeliveryPinContext(context.postalCode);
}
