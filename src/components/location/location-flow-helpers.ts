import type { AddressFormValues } from "@/components/account/AddressForm";
import { EMPTY_ADDRESS_FORM } from "@/components/account/AddressForm";
import type { CommerceAddress } from "@/lib/customer-commerce";
import type { NormalizedCommerceLocation } from "@/lib/customer-commerce/location";
import { getIndiaSubdivisionName } from "@/shared/customer-addresses";

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
  const cityName = location.administrativeArea ?? location.locality ?? "";
  return {
    ...EMPTY_ADDRESS_FORM,
    addressLine1: "",
    locality: location.locality ?? "",
    city: cityName,
    stateCode: location.stateCode ?? "",
    postalCode: location.postalCode ?? "",
  };
}

export function savedAddressCardCopy(
  address: CommerceAddress,
): Readonly<{ title: string; line1: string; line2: string; locationLine: string }> {
  const label = (address.label?.trim() || "Address").toUpperCase();
  const line1 = [address.addressLine1, address.addressLine2].filter(Boolean).join(", ");
  const line2 = [address.landmark, address.locality]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .join(", ");
  const stateName = getIndiaSubdivisionName(address.stateCode) ?? address.stateCode;
  const locationLine = [address.city, stateName, address.postalCode].filter(Boolean).join(", ");
  return Object.freeze({ title: label, line1, line2, locationLine });
}

export function commerceAddressToNormalizedLocation(address: CommerceAddress): NormalizedCommerceLocation {
  return Object.freeze({
    displayAddress: [address.addressLine1, address.locality, address.city, address.postalCode]
      .filter(Boolean)
      .join(", "),
    postalCode: address.postalCode,
    pinConfirmed: Boolean(address.postalCode),
    locality: address.locality ?? address.city,
    administrativeArea: address.city,
    stateCode: address.stateCode,
    country: "India",
    countryCode: "IN",
    latitude: address.coordinates?.latitude ?? null,
    longitude: address.coordinates?.longitude ?? null,
  });
}
