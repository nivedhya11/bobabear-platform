import type { AddressFormValues } from "@/components/account/AddressForm";
import { EMPTY_ADDRESS_FORM } from "@/components/account/AddressForm";
import type { CommerceAddress } from "@/lib/customer-commerce";
import type { NormalizedCommerceLocation } from "@/lib/customer-commerce/location";

export function hasMapCoordinates(location: NormalizedCommerceLocation): boolean {
  if (!location.latitude || !location.longitude) return false;
  const lat = Number.parseFloat(location.latitude);
  const lng = Number.parseFloat(location.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng);
}

export function locationCoordinates(
  location: NormalizedCommerceLocation,
): Readonly<{ latitude: string; longitude: string }> | null {
  if (!hasMapCoordinates(location)) return null;
  return Object.freeze({
    latitude: location.latitude!,
    longitude: location.longitude!,
  });
}

export function locationToAddressForm(location: NormalizedCommerceLocation): AddressFormValues {
  return {
    ...EMPTY_ADDRESS_FORM,
    addressLine1: location.displayAddress.split(",")[0]?.trim() ?? location.displayAddress,
    locality: location.locality ?? "",
    city: location.locality ?? "",
    stateCode: location.stateCode ?? "",
    postalCode: location.postalCode ?? "",
  };
}

export function savedAddressCardCopy(
  address: CommerceAddress,
): Readonly<{ title: string; line: string; pinLine: string }> {
  const label = address.label?.trim() || "Address";
  const line = [address.addressLine1, address.addressLine2, address.locality]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(", ");
  const pinLine = [address.city, address.postalCode].filter(Boolean).join(" · ");
  return Object.freeze({ title: label, line, pinLine });
}

export function commerceAddressToNormalizedLocation(address: CommerceAddress): NormalizedCommerceLocation {
  return Object.freeze({
    displayAddress: [address.addressLine1, address.locality, address.city, address.postalCode]
      .filter(Boolean)
      .join(", "),
    postalCode: address.postalCode,
    pinConfirmed: Boolean(address.postalCode),
    locality: address.locality ?? address.city,
    administrativeArea: null,
    stateCode: address.stateCode,
    country: "India",
    countryCode: "IN",
    latitude: address.coordinates?.latitude ?? null,
    longitude: address.coordinates?.longitude ?? null,
  });
}
