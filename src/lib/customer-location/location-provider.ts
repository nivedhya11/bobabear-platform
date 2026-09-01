/**
 * Location provider abstraction — Google Maps Platform V1 (IMP-036B amendment)
 * with mandatory saved-address and manual PIN fallbacks.
 */
import type { CommerceAddress } from "@/lib/customer-commerce";

export type LocationSearchResult = Readonly<{
  id: string;
  label: string;
  postalCode: string;
  displayLabel: string;
  savedAddressId?: string;
}>;

export interface ManualPinLocationProvider {
  search(query: string, savedAddresses: readonly CommerceAddress[]): readonly LocationSearchResult[];
}

function addressDisplayLabel(address: CommerceAddress): string {
  const parts = [address.label, address.addressLine1, address.locality, address.city].filter(
    (part): part is string => typeof part === "string" && part.trim().length > 0,
  );
  const base = parts.length > 0 ? parts.join(", ") : address.addressLine1;
  return `${base} · ${address.postalCode}`;
}

function addressMatchesQuery(address: CommerceAddress, query: string): boolean {
  const haystack = [
    address.recipientName,
    address.recipientPhone,
    address.addressLine1,
    address.addressLine2,
    address.landmark,
    address.locality,
    address.city,
    address.postalCode,
    address.label,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function savedAddressResults(addresses: readonly CommerceAddress[]): readonly LocationSearchResult[] {
  return addresses.map((address) =>
    Object.freeze({
      id: `saved:${address.id}`,
      label: addressDisplayLabel(address),
      postalCode: address.postalCode,
      displayLabel: addressDisplayLabel(address),
      savedAddressId: address.id,
    }),
  );
}

export const manualOnlyProvider: ManualPinLocationProvider = {
  search(query, savedAddresses) {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length === 0) return savedAddressResults(savedAddresses);
    return savedAddressResults(savedAddresses.filter((address) => addressMatchesQuery(address, trimmed)));
  },
};
