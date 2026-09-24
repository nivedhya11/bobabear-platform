/**
 * Customer-facing pickup location formatting (IMP-036H-D).
 */

export type PickupLocationFields = Readonly<{
  displayName: string;
  addressLine1: string;
  addressLine2?: string | null;
  locality?: string | null;
  city: string;
  stateCode: string;
  postalCode: string;
  instructions?: string | null;
}>;

export function pickupAddressLines(location: PickupLocationFields): string[] {
  const lines: string[] = [location.addressLine1];
  if (location.addressLine2) lines.push(location.addressLine2);
  if (location.locality) lines.push(location.locality);
  lines.push(
    [location.city, location.stateCode, location.postalCode].filter(Boolean).join(" "),
  );
  return lines;
}

export function fulfilmentModeLabel(mode: "DELIVERY" | "PICKUP"): string {
  return mode === "PICKUP" ? "Pickup" : "Delivery";
}
