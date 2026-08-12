/**
 * Domain types for Saved Customer Addresses (IMP-018).
 */

import type { IndiaSubdivisionCode } from "./india-states";

/** Fixed-scale decimal coordinate pair (domain strings, not JS number). */
export type CustomerAddressCoordinates = Readonly<{
  latitude: string;
  longitude: string;
}>;

export type CustomerAddress = Readonly<{
  id: string;
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  locality: string | null;
  city: string;
  stateCode: IndiaSubdivisionCode;
  postalCode: string;
  coordinates: CustomerAddressCoordinates | null;
  label: string | null;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}>;

export type CustomerAddressCreateInput = Readonly<{
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  locality?: string | null;
  city: string;
  stateCode: string;
  postalCode: string;
  coordinates?: CustomerAddressCoordinates | null;
  label?: string | null;
  makeDefault?: boolean;
}>;

export type CustomerAddressUpdateInput = Readonly<{
  recipientName?: string;
  recipientPhone?: string;
  addressLine1?: string;
  addressLine2?: string | null;
  landmark?: string | null;
  locality?: string | null;
  city?: string;
  stateCode?: string;
  postalCode?: string;
  coordinates?: CustomerAddressCoordinates | null;
  label?: string | null;
}>;

/** Canonical persisted content fields (excluding id/ownership/default/timestamps). */
export type CanonicalCustomerAddressFields = Readonly<{
  recipientName: string;
  recipientPhone: string;
  addressLine1: string;
  addressLine2: string | null;
  landmark: string | null;
  locality: string | null;
  city: string;
  stateCode: IndiaSubdivisionCode;
  postalCode: string;
  coordinates: CustomerAddressCoordinates | null;
  label: string | null;
}>;
